import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { executeTool } from '../lib/toolExecutor'
import { useBoardStore } from '../store/boardStore'

const seed = () => {
  useBoardStore.setState({
    boards: { b1: { id: 'b1', name: 'Launch' }, b2: { id: 'b2', name: 'Backlog' } },
    columns: { col1: { id: 'col1', board_id: 'b1', title: 'To do', position: 0 } },
    cards: {
      c1: {
        id: 'c1', board_id: 'b1', column_id: 'col1', title: 'Fix header',
        description: 'A long untruncated description of the header fix work.',
        checklist: [{ text: 'step one', done: true }, { text: 'step two', done: false }],
        due_date: '2026-07-10', updated_at: '2026-07-20',
      },
      // due_date deliberately in the "later" bucket (past the week-8 cutoff from
      // the July 15 fake-timer anchor) — c2 is reused cross-board for the offset
      // test below and must not leak into any of the due-bucket assertions.
      c2: { id: 'c2', board_id: 'b2', column_id: 'col1', title: 'Fix header', due_date: '2026-08-01', updated_at: '2026-07-19' },
      c3: { id: 'c3', board_id: 'b1', column_id: 'col1', title: 'Ship page', due_date: '2026-07-15', updated_at: '2026-07-18' },
      c4: { id: 'c4', board_id: 'b1', column_id: 'col1', title: 'Later thing', due_date: '2026-07-22', updated_at: '2026-07-17' },
      c5: { id: 'c5', board_id: 'b1', column_id: 'col1', title: 'No due', updated_at: '2026-07-16' },
      c6: { id: 'c6', board_id: 'b1', column_id: 'col1', title: 'Done old', due_date: '2026-07-01', completed: true, updated_at: '2026-07-15' },
    },
    labels: {},
    cardLabels: {},
    _tempIdMap: {},
  })
}

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0)) // July 15 2026, local noon
})
afterAll(() => vi.useRealTimers())
beforeEach(seed)

describe('get_card', () => {
  test('ambiguous titles return candidates, never a guess', async () => {
    const res = await executeTool('get_card', { card_title: 'Fix header' })
    expect(res.ok).toBe(true)
    expect(res.ambiguous).toBe(true)
    expect(res.candidates).toHaveLength(2)
    expect(res.candidates[0]).toEqual({ title: 'Fix header', board: 'Launch', column: 'To do' })
  })

  test('board scoping disambiguates and returns full detail', async () => {
    const res = await executeTool('get_card', { card_title: 'Fix header', board: 'Launch' })
    expect(res.ok).toBe(true)
    expect(res.found).toBe(true)
    expect(res.card.description).toBe('A long untruncated description of the header fix work.')
    expect(res.card.checklist).toEqual([
      { text: 'step one', done: true },
      { text: 'step two', done: false },
    ])
    expect(res.card.board).toBe('Launch')
  })

  test('no match reports found:false', async () => {
    const res = await executeTool('get_card', { card_title: 'Nonexistent' })
    expect(res).toEqual({ ok: true, found: false })
  })

  test('exact title match beats substring matches', async () => {
    useBoardStore.setState((s) => ({
      cards: { ...s.cards, c7: { id: 'c7', board_id: 'b1', column_id: 'col1', title: 'Ship', updated_at: '2026-07-14' } },
    }))
    const res = await executeTool('get_card', { card_title: 'Ship' })
    expect(res.found).toBe(true)
    expect(res.card.id).toBe('c7')
  })
})

describe('search_cards due/offset', () => {
  test('due-only queries work without text', async () => {
    const res = await executeTool('search_cards', { due: 'overdue' })
    expect(res.ok).toBe(true)
    expect(res.cards.map((c) => c.id)).toEqual(['c1'])
  })

  test('completed cards never match overdue even when included', async () => {
    const res = await executeTool('search_cards', { due: 'overdue', include_completed: true })
    expect(res.cards.map((c) => c.id)).toEqual(['c1'])
  })

  test('today / week / none buckets', async () => {
    expect((await executeTool('search_cards', { due: 'today' })).cards.map((c) => c.id)).toEqual(['c3'])
    expect((await executeTool('search_cards', { due: 'week' })).cards.map((c) => c.id)).toEqual(['c4'])
    expect((await executeTool('search_cards', { due: 'none' })).cards.map((c) => c.id)).toEqual(['c5'])
  })

  test('offset pages past ranked results and is echoed', async () => {
    const res = await executeTool('search_cards', { query: 'fix header', offset: 1 })
    expect(res.total).toBe(2)
    expect(res.offset).toBe(1)
    expect(res.count).toBe(1)
    expect(res.cards[0].id).toBe('c2')
  })

  test('neither query nor due is an error', async () => {
    const res = await executeTool('search_cards', {})
    expect(res.ok).toBe(false)
  })
})
