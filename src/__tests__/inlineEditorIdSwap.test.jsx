import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing stores (shared chainable builder pattern).
vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn(), logInfo: vi.fn() }))
vi.mock('../utils/toast', () => ({
  showToast: { error: vi.fn(), warn: vi.fn(), success: vi.fn(), info: vi.fn(), delete: vi.fn() },
}))
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({ setNodeRef: vi.fn() }),
}))
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: null, isDragging: false }),
}))
vi.mock('@dnd-kit/utilities', () => ({ CSS: { Transform: { toString: () => '' } } }))

import { render, screen, fireEvent, act } from '@testing-library/react'
import Column from '../components/board/Column'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'

const column = { id: 'col1', board_id: 'b1', title: 'Todo', position: 0 }
const tempCard = {
  id: 'temp-1', board_id: 'b1', column_id: 'col1', position: 0,
  title: '', completed: false, archived: false,
  priority: 'medium', assignee_name: '', due_date: null,
}

describe('InlineCardEditor across temp→real id resolution', () => {
  beforeEach(() => {
    useBoardStore.setState({
      boards: { b1: { id: 'b1', name: 'Board', next_task_number: 1 } },
      columns: { col1: column },
      cards: { 'temp-1': tempCard },
      cardLabels: {},
      labels: {},
      _tempIdMap: {},
      activeBoardId: 'b1',
      loading: false,
    })
    useAuthStore.setState({ user: { id: 'u1' }, session: null, profile: { display_name: 'Alice' } })
  })

  // Regression: the backend-confirm id swap (temp → real) used to change the
  // editor's React key, remounting it — which replayed the mount animation
  // (visible blink) and silently discarded draft state like pendingLabels.
  // The editor resolves temp ids internally (resolvedId), so the instance
  // must survive the swap.
  test('editor instance and draft state persist across the id swap', () => {
    render(
      <Column
        column={column}
        boardId="b1"
        inlineCardId="temp-1"
        onInlineDone={vi.fn()}
        onCardClick={vi.fn()}
      />,
    )
    const input = screen.getByPlaceholderText('Task name...')
    fireEvent.change(input, { target: { value: 'Draft title' } })
    expect(input.value).toBe('Draft title')

    // Backend confirms: card re-keyed to its real id, temp id mapped.
    act(() => {
      useBoardStore.setState((s) => ({
        cards: { 'real-1': { ...s.cards['temp-1'], id: 'real-1' } },
        _tempIdMap: { ...s._tempIdMap, 'temp-1': 'real-1' },
      }))
    })

    // Same instance → the typed draft survives (a remount would reset it
    // to the store card's empty title).
    expect(screen.getByPlaceholderText('Task name...').value).toBe('Draft title')
  })
})
