import { describe, it, expect, vi, beforeEach } from 'vitest'
import { selectCardLabels, selectBoardLabels, selectBoardLabelByText } from '../store/selectors'
import { useBoardStore } from '../store/boardStore'

const state = {
  labels: {
    L1: { id: 'L1', board_id: 'B1', text: 'Bug',      color: 'red',   archived_at: null },
    L2: { id: 'L2', board_id: 'B1', text: 'Frontend', color: 'blue',  archived_at: null },
    L3: { id: 'L3', board_id: 'B1', text: 'Legacy',   color: 'gray',  archived_at: '2026-01-01T00:00:00Z' },
    L4: { id: 'L4', board_id: 'B2', text: 'Other',    color: 'green', archived_at: null },
  },
  cardLabels: {
    C1: new Set(['L1', 'L2']),
    C2: new Set(['L3']),
  },
}

describe('selectCardLabels', () => {
  it('returns active label objects for a card', () => {
    const labels = selectCardLabels('C1')(state)
    expect(labels.map((l) => l.id).sort()).toEqual(['L1', 'L2'])
  })

  it('filters out archived labels', () => {
    const labels = selectCardLabels('C2')(state)
    expect(labels).toEqual([])
  })

  it('returns stable identity for empty result', () => {
    const a = selectCardLabels('NONE')(state)
    const b = selectCardLabels('NONE')(state)
    expect(a).toBe(b)
  })
})

describe('selectBoardLabels', () => {
  it('returns active labels on the board sorted by lower(text)', () => {
    const labels = selectBoardLabels('B1')(state)
    expect(labels.map((l) => l.text)).toEqual(['Bug', 'Frontend'])
  })

  it('excludes labels from other boards', () => {
    const labels = selectBoardLabels('B1')(state)
    expect(labels.find((l) => l.id === 'L4')).toBeUndefined()
  })
})

describe('selectBoardLabelByText', () => {
  it('matches case-insensitively', () => {
    expect(selectBoardLabelByText('B1', 'BUG')(state)?.id).toBe('L1')
    expect(selectBoardLabelByText('B1', 'bug')(state)?.id).toBe('L1')
  })

  it('does not match archived labels', () => {
    expect(selectBoardLabelByText('B1', 'legacy')(state)).toBeUndefined()
  })
})

vi.mock('../lib/supabase', () => {
  const rpc = vi.fn()
  const from = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) })),
  }))
  return { supabase: { rpc, from, channel: () => ({ on: () => ({ subscribe: () => ({}) }) }) } }
})

vi.mock('../utils/toast', () => ({
  showToast: {
    success: vi.fn(), error: vi.fn(), warn: vi.fn(),
    delete: vi.fn(), archive: vi.fn(), restore: vi.fn(),
    info: vi.fn(), overdue: vi.fn(),
  },
}))

describe('boardStore label actions', () => {
  beforeEach(() => {
    useBoardStore.setState({
      cards: {},
      labels: {},
      cardLabels: {},
    })
    vi.clearAllMocks()
  })

  it('addLabelToCard optimistically updates cardLabels then calls attach_label_by_text', async () => {
    const { supabase } = await import('../lib/supabase')
    supabase.rpc.mockResolvedValueOnce({ data: 'L1', error: null })

    useBoardStore.setState({
      cards: { C1: { id: 'C1', board_id: 'B1' } },
      labels: {},
      cardLabels: {},
    })

    await useBoardStore.getState().addLabelToCard('C1', 'Bug')

    expect(supabase.rpc).toHaveBeenCalledWith('attach_label_by_text', {
      p_card_id: 'C1', p_text: 'Bug', p_color: null,
    })
    expect(useBoardStore.getState().cardLabels.C1.has('L1')).toBe(true)
  })

  it('removeLabelFromCard removes from state and calls delete', async () => {
    useBoardStore.setState({
      cardLabels: { C1: new Set(['L1', 'L2']) },
    })
    await useBoardStore.getState().removeLabelFromCard('C1', 'L1')
    expect(useBoardStore.getState().cardLabels.C1.has('L1')).toBe(false)
    expect(useBoardStore.getState().cardLabels.C1.has('L2')).toBe(true)
  })

  it('renameLabel updates local state on success', async () => {
    useBoardStore.setState({
      labels: { L1: { id: 'L1', board_id: 'B1', text: 'Old', color: 'red', archived_at: null } },
    })
    await useBoardStore.getState().renameLabel('L1', 'New')
    expect(useBoardStore.getState().labels.L1.text).toBe('New')
  })

  it('updateLabelColor updates local state on success', async () => {
    useBoardStore.setState({
      labels: { L1: { id: 'L1', board_id: 'B1', text: 'Bug', color: 'red', archived_at: null } },
    })
    await useBoardStore.getState().updateLabelColor('L1', 'blue')
    expect(useBoardStore.getState().labels.L1.color).toBe('blue')
  })

  it('mergeLabels removes from-label and reassigns join rows locally', async () => {
    const { supabase } = await import('../lib/supabase')
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null })

    useBoardStore.setState({
      labels: {
        L1: { id: 'L1', board_id: 'B1', text: 'A', color: 'red',  archived_at: null },
        L2: { id: 'L2', board_id: 'B1', text: 'B', color: 'blue', archived_at: null },
      },
      cardLabels: {
        C1: new Set(['L1']),
        C2: new Set(['L1', 'L2']),
      },
    })

    await useBoardStore.getState().mergeLabels('L1', 'L2')
    const s = useBoardStore.getState()
    expect(s.labels.L1).toBeUndefined()
    expect(s.cardLabels.C1.has('L1')).toBe(false)
    expect(s.cardLabels.C1.has('L2')).toBe(true)
    expect(s.cardLabels.C2.has('L1')).toBe(false)
    expect(s.cardLabels.C2.has('L2')).toBe(true)
  })

  it('archiveLabel sets archived_at timestamp on success', async () => {
    useBoardStore.setState({
      labels: { L1: { id: 'L1', board_id: 'B1', text: 'A', color: 'red', archived_at: null } },
    })
    await useBoardStore.getState().archiveLabel('L1')
    expect(useBoardStore.getState().labels.L1.archived_at).toBeTruthy()
  })

  it('unarchiveLabel clears archived_at on success', async () => {
    useBoardStore.setState({
      labels: { L1: { id: 'L1', board_id: 'B1', text: 'A', color: 'red', archived_at: '2026-01-01' } },
    })
    await useBoardStore.getState().unarchiveLabel('L1')
    expect(useBoardStore.getState().labels.L1.archived_at).toBeNull()
  })
})
