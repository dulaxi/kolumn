import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing stores (shared chainable builder pattern).
vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn(), logInfo: vi.fn() }))
vi.mock('../utils/toast', () => ({
  showToast: { error: vi.fn(), warn: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

const col = (id, position) => ({ id, board_id: 'b1', title: id, position })
const card = (id, column_id, position, updated_at) => ({
  id, board_id: 'b1', column_id, position, updated_at,
  completed: false, archived: false, title: id,
})

describe('drag persist reconcile race (rapid successive drags)', () => {
  beforeEach(() => {
    useBoardStore.setState({
      boards: { b1: { id: 'b1', name: 'B', next_task_number: 1 } },
      columns: { 'c-A': col('c-A', 0), 'c-B': col('c-B', 1), 'c-C': col('c-C', 2) },
      cards: { X: card('X', 'c-A', 0, '2020-01-01T00:00:00Z') },
      activeBoardId: 'b1',
      loading: false,
      _isDragging: false,
      comments: {},
      subscriptions: [],
    })
    useAuthStore.setState({ user: { id: 'u1' }, session: null, profile: null })
    vi.clearAllMocks()
  })

  // The reconcile refetch fired by drag #1 must NOT clobber the optimistic
  // position that drag #2 wrote while #1's refetch was still in flight.
  test('a slow refetch from an earlier drag does not revert a later optimistic move', async () => {
    // Gate the reconcile SELECT so it resolves only after drag #2 has moved X.
    let releaseRefetch
    const refetchGate = new Promise((r) => { releaseRefetch = r })
    // Drag #1 committed X into c-B on the server — that's what the stale
    // refetch returns, ignorant of drag #2 (which moved X on to c-C locally).
    const staleData = [card('X', 'c-B', 0, '2020-01-01T00:00:01Z')]

    supabase.from.mockImplementation(() => {
      let mode = null
      const b = {
        update() { mode = 'update'; return b },
        select() { mode = 'select'; return b },
        eq() { return b },
        then(resolve) {
          return mode === 'select'
            ? refetchGate.then(() => resolve({ data: staleData, error: null }))
            : Promise.resolve({ error: null }).then(resolve)
        },
      }
      return b
    })

    const store = useBoardStore.getState()

    // Drag #1: A → B (optimistic), then persist (its refetch will hang).
    store.moveCardLocal('b1', 'c-A', 'c-B', 0, 0)
    expect(useBoardStore.getState().cards.X.column_id).toBe('c-B')
    const persist1 = store.persistCardPositions(['X'], { movedCrossColumn: true })

    // Let the writes settle so persist1 is parked awaiting the gated refetch.
    await new Promise((r) => setTimeout(r, 0))

    // Drag #2 (started before #1's refetch returned): B → C (optimistic).
    store.moveCardLocal('b1', 'c-B', 'c-C', 0, 0)
    expect(useBoardStore.getState().cards.X.column_id).toBe('c-C')

    // Now #1's refetch resolves with the stale (pre-drag-#2) board state.
    releaseRefetch()
    await persist1

    // The card must still be where drag #2 put it — not reverted to c-B.
    expect(useBoardStore.getState().cards.X.column_id).toBe('c-C')
  })

  // The fix must not neuter the reconcile: cards NOT in flight still get
  // refreshed from the refetch (recovering echoes dropped during the drag).
  test('reconcile still applies refetched state to cards with no write in flight', async () => {
    useBoardStore.setState({
      cards: {
        X: card('X', 'c-A', 0, '2020-01-01T00:00:00Z'),
        // Y was moved by another client during the drag; its echo was dropped.
        Y: card('Y', 'c-A', 1, '2020-01-01T00:00:00Z'),
      },
    })

    const refreshed = [
      card('X', 'c-B', 0, '2020-01-01T00:00:01Z'),
      card('Y', 'c-C', 0, '2020-01-01T00:00:05Z'), // Y's recovered server state
    ]
    supabase.from.mockImplementation(() => {
      let mode = null
      const b = {
        update() { mode = 'update'; return b },
        select() { mode = 'select'; return b },
        eq() { return b },
        then(resolve) {
          return mode === 'select'
            ? Promise.resolve({ data: refreshed, error: null }).then(resolve)
            : Promise.resolve({ error: null }).then(resolve)
        },
      }
      return b
    })

    const store = useBoardStore.getState()
    store.moveCardLocal('b1', 'c-A', 'c-B', 0, 0) // only X is dragged
    await store.persistCardPositions(['X'], { movedCrossColumn: true })

    // X (was in flight) keeps its optimistic move; Y (not in flight) is
    // recovered from the refetch.
    expect(useBoardStore.getState().cards.X.column_id).toBe('c-B')
    expect(useBoardStore.getState().cards.Y.column_id).toBe('c-C')
  })

  // The reconcile must not churn object identity for unchanged cards — doing so
  // re-renders the whole board on every cross-column drop (the "reload" flicker).
  test('unchanged cards keep their object reference through a reconcile', async () => {
    const stationary = card('Z', 'c-C', 0, '2020-01-01T00:00:00Z')
    useBoardStore.setState({
      cards: { X: card('X', 'c-A', 0, '2020-01-01T00:00:00Z'), Z: stationary },
    })
    const zRefBefore = useBoardStore.getState().cards.Z

    // Refetch returns Z byte-for-byte unchanged (same updated_at) and X moved.
    const refreshed = [
      card('X', 'c-B', 0, '2020-01-01T00:00:01Z'),
      { ...stationary }, // a NEW object with identical fields, as the server would send
    ]
    supabase.from.mockImplementation(() => {
      let mode = null
      const b = {
        update() { mode = 'update'; return b },
        select() { mode = 'select'; return b },
        eq() { return b },
        then(resolve) {
          return mode === 'select'
            ? Promise.resolve({ data: refreshed, error: null }).then(resolve)
            : Promise.resolve({ error: null }).then(resolve)
        },
      }
      return b
    })

    const store = useBoardStore.getState()
    store.moveCardLocal('b1', 'c-A', 'c-B', 0, 0)
    await store.persistCardPositions(['X'], { movedCrossColumn: true })

    // Z's reference is preserved (not replaced by the equal-but-new server row),
    // so components subscribed to Z don't re-render.
    expect(useBoardStore.getState().cards.Z).toBe(zRefBefore)
  })

  // A cross-column move must persist last_move in the SAME write as the new
  // position. A separate last_move-only write echoes the stale (pre-move)
  // position and makes cards jump on drop.
  test('last_move is folded into the position write, not a separate one', async () => {
    const updatePayloads = []
    supabase.from.mockImplementation(() => {
      let mode = null
      const b = {
        update(p) { mode = 'update'; updatePayloads.push(p); return b },
        insert() { mode = 'insert'; return b },
        select() { mode = 'select'; return b },
        eq() { return b },
        then(resolve) {
          return mode === 'select'
            ? Promise.resolve({ data: [], error: null }).then(resolve)
            : Promise.resolve({ error: null }).then(resolve)
        },
      }
      return b
    })

    useBoardStore.setState({
      cards: { X: { ...card('X', 'c-B', 0, '2020-01-01T00:00:00Z'), last_move: { to_column_id: 'c-B' } } },
    })

    await useBoardStore.getState().persistCardPositions(['X'], { movedCrossColumn: true })

    // Exactly one write carrying position — and it includes last_move.
    const positionWrites = updatePayloads.filter((p) => p && 'column_id' in p)
    expect(positionWrites).toHaveLength(1)
    expect(positionWrites[0]).toMatchObject({
      column_id: 'c-B', position: 0, last_move: { to_column_id: 'c-B' },
    })
    // No position-less last_move-only write.
    expect(updatePayloads.some((p) => p && 'last_move' in p && !('column_id' in p))).toBe(false)
  })

  test('logCardMove no longer issues its own card write', () => {
    const cardUpdate = vi.fn()
    supabase.from.mockImplementation((table) => {
      const b = {
        update(...a) { if (table === 'cards') cardUpdate(...a); return b },
        insert() { return b },
        select() { return b },
        eq() { return b },
        then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve) },
      }
      return b
    })

    useBoardStore.setState({
      cards: { X: card('X', 'c-B', 0, '2020-01-01T00:00:00Z') },
      columns: { 'c-A': col('c-A', 0), 'c-B': col('c-B', 1) },
    })

    useBoardStore.getState().logCardMove('X', 'c-A', 'c-B', 0, 0)

    // Optimistic local last_move is set…
    expect(useBoardStore.getState().cards.X.last_move).toBeTruthy()
    // …but NOT via a racing write to the cards table.
    expect(cardUpdate).not.toHaveBeenCalled()
  })
})
