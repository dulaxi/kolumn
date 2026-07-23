import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))
vi.mock('../lib/analytics', () => ({ capture: vi.fn() }))

import { useBoardStore } from '../store/boardStore'

const BOARD = { id: 'b1', name: 'Board', next_task_number: 1 }
const CARD = {
  id: 'c1', board_id: 'b1', column_id: 'col1', position: 0,
  title: 'Source', description: '', assignees: [], assignee_name: '',
  priority: 'medium', due_date: null, icon: null, completed: false, checklist: [],
}

// Zustand actions overridden via setState persist across tests — capture the
// real addCard once and restore it before every test.
const realAddCard = useBoardStore.getState().addCard

describe('duplicating a card copies its labels', () => {
  beforeEach(() => {
    useBoardStore.setState({
      boards: { b1: BOARD },
      cards: { c1: CARD },
      cardLabels: { c1: new Set(['l1', 'l2']) },
      _tempIdMap: {},
      addCard: realAddCard,
    })
  })

  test('duplicateCard forwards the source card label ids to addCard', async () => {
    const addCard = vi.fn().mockResolvedValue('temp-x')
    useBoardStore.setState({ addCard })
    await useBoardStore.getState().duplicateCard('c1')
    expect(addCard).toHaveBeenCalledWith('b1', 'col1', expect.objectContaining({
      labelIds: expect.arrayContaining(['l1', 'l2']),
    }))
    expect(addCard.mock.calls[0][2].labelIds).toHaveLength(2)
  })

  test('addCard seeds cardLabels for the optimistic temp card', async () => {
    const tempId = await useBoardStore.getState().addCard('b1', 'col1', {
      title: 'Copy', labelIds: ['l1', 'l2'],
    })
    expect(tempId).toMatch(/^temp-/)
    const labels = useBoardStore.getState().cardLabels[tempId]
    expect(labels).toBeInstanceOf(Set)
    expect([...labels].sort()).toEqual(['l1', 'l2'])
  })

  test('addCard without labelIds leaves cardLabels untouched', async () => {
    const tempId = await useBoardStore.getState().addCard('b1', 'col1', { title: 'Plain' })
    expect(useBoardStore.getState().cardLabels[tempId]).toBeUndefined()
  })
})
