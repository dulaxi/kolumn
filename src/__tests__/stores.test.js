import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => {
  const chain = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (r) => Promise.resolve({ data: null, error: null }).then(r),
    catch: (r) => Promise.resolve({ data: null, error: null }).catch(r),
  })
  return {
    supabase: {
      from: vi.fn(chain),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn() })),
      removeChannel: vi.fn(),
    },
  }
})

import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import { useNoteStore } from '../store/noteStore'

describe('boardStore', () => {
  beforeEach(() => {
    useBoardStore.setState({
      boards: {},
      columns: {},
      cards: {},
      activeBoardId: null,
      loading: false,
      _isDragging: false,
      comments: {},
      subscriptions: [],
    })
    localStorage.clear()
  })

  test('setActiveBoard updates state and localStorage', () => {
    useBoardStore.getState().setActiveBoard('b1')
    expect(useBoardStore.getState().activeBoardId).toBe('b1')
    expect(localStorage.getItem('gambit_active_board')).toBe('b1')
  })

  test('deleteBoard removes board, its columns, and cards', async () => {
    useBoardStore.setState({
      boards: { b1: { id: 'b1' }, b2: { id: 'b2' } },
      columns: { col1: { id: 'col1', board_id: 'b1' }, col2: { id: 'col2', board_id: 'b2' } },
      cards: { c1: { id: 'c1', board_id: 'b1', column_id: 'col1' }, c2: { id: 'c2', board_id: 'b2', column_id: 'col2' } },
      activeBoardId: 'b1',
    })
    await useBoardStore.getState().deleteBoard('b1')
    const state = useBoardStore.getState()
    expect(state.boards).not.toHaveProperty('b1')
    expect(state.columns).not.toHaveProperty('col1')
    expect(state.cards).not.toHaveProperty('c1')
    expect(state.boards).toHaveProperty('b2')
    expect(state.activeBoardId).toBe('b2')
  })

  test('completeCard toggles completed', async () => {
    useBoardStore.setState({
      cards: { c1: { id: 'c1', completed: false } },
    })
    await useBoardStore.getState().completeCard('c1')
    expect(useBoardStore.getState().cards.c1.completed).toBe(true)
    await useBoardStore.getState().completeCard('c1')
    expect(useBoardStore.getState().cards.c1.completed).toBe(false)
  })

  test('deleteCard removes card from state', async () => {
    useBoardStore.setState({
      cards: { c1: { id: 'c1' }, c2: { id: 'c2' } },
    })
    await useBoardStore.getState().deleteCard('c1')
    expect(useBoardStore.getState().cards).not.toHaveProperty('c1')
    expect(useBoardStore.getState().cards).toHaveProperty('c2')
  })

  test('moveCardLocal reorders within same column', () => {
    useBoardStore.setState({
      cards: {
        a: { id: 'a', column_id: 'col1', position: 0 },
        b: { id: 'b', column_id: 'col1', position: 1 },
        c: { id: 'c', column_id: 'col1', position: 2 },
      },
    })
    useBoardStore.getState().moveCardLocal('b1', 'col1', 'col1', 0, 2)
    const cards = useBoardStore.getState().cards
    expect(cards.a.position).toBe(2)
    expect(cards.b.position).toBe(0)
    expect(cards.c.position).toBe(1)
  })

  test('moveCardLocal cross-column resets completed', () => {
    useBoardStore.setState({
      cards: {
        a: { id: 'a', column_id: 'col1', position: 0, completed: true },
        b: { id: 'b', column_id: 'col2', position: 0 },
      },
    })
    useBoardStore.getState().moveCardLocal('b1', 'col1', 'col2', 0, 0)
    const cards = useBoardStore.getState().cards
    expect(cards.a.column_id).toBe('col2')
    expect(cards.a.completed).toBe(false)
  })

  test('getActiveBoard returns null when no board set', () => {
    expect(useBoardStore.getState().getActiveBoard()).toBeNull()
  })

  test('getActiveBoard returns board when set', () => {
    useBoardStore.setState({
      boards: { b1: { id: 'b1', name: 'Test' } },
      activeBoardId: 'b1',
    })
    expect(useBoardStore.getState().getActiveBoard()).toEqual({ id: 'b1', name: 'Test' })
  })

  test('getBoardColumns returns sorted columns for a board', () => {
    useBoardStore.setState({
      columns: {
        col2: { id: 'col2', board_id: 'b1', position: 1 },
        col1: { id: 'col1', board_id: 'b1', position: 0 },
        col3: { id: 'col3', board_id: 'b2', position: 0 },
      },
    })
    const cols = useBoardStore.getState().getBoardColumns('b1')
    expect(cols).toHaveLength(2)
    expect(cols[0].id).toBe('col1')
    expect(cols[1].id).toBe('col2')
  })

  test('getColumnCards returns sorted cards for a column', () => {
    useBoardStore.setState({
      cards: {
        c2: { id: 'c2', column_id: 'col1', position: 1 },
        c1: { id: 'c1', column_id: 'col1', position: 0 },
        c3: { id: 'c3', column_id: 'col2', position: 0 },
      },
    })
    const cards = useBoardStore.getState().getColumnCards('col1')
    expect(cards).toHaveLength(2)
    expect(cards[0].id).toBe('c1')
    expect(cards[1].id).toBe('c2')
  })
})

// ─── authStore ────────────────────────────────────────────────

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, session: null, profile: null, loading: false })
  })

  test('signOut clears user, session, and profile', async () => {
    useAuthStore.setState({ user: { id: 'u1' }, session: { token: 'x' }, profile: { display_name: 'Alice' } })
    await useAuthStore.getState().signOut()
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
    expect(state.profile).toBeNull()
  })

  test('signIn calls signInWithPassword', async () => {
    const { supabase } = await import('../lib/supabase')
    await useAuthStore.getState().signIn('test@example.com', 'pass123')
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'pass123',
    })
  })

  test('signUp passes display_name in options', async () => {
    const { supabase } = await import('../lib/supabase')
    await useAuthStore.getState().signUp('test@example.com', 'pass123', 'Alice')
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'pass123',
      options: { data: { display_name: 'Alice' } },
    })
  })
})

// ─── noteStore ────────────────────────────────────────────────

describe('noteStore', () => {
  beforeEach(() => {
    useNoteStore.setState({ notes: {}, loading: false })
  })

  test('updateNote optimistically updates state', async () => {
    useNoteStore.setState({
      notes: { n1: { id: 'n1', title: 'Old', content: '', updated_at: '2026-03-20' } },
    })
    await useNoteStore.getState().updateNote('n1', { title: 'New Title' })
    expect(useNoteStore.getState().notes.n1.title).toBe('New Title')
  })

  test('deleteNote removes note from state', async () => {
    useNoteStore.setState({
      notes: { n1: { id: 'n1' }, n2: { id: 'n2' } },
    })
    await useNoteStore.getState().deleteNote('n1')
    expect(useNoteStore.getState().notes).not.toHaveProperty('n1')
    expect(useNoteStore.getState().notes).toHaveProperty('n2')
  })
})
