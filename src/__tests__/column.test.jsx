import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockAddCard = vi.fn().mockResolvedValue('new-card')

vi.mock('../store/boardStore', () => ({
  useBoardStore: vi.fn((sel) => sel({
    cards: {
      c1: { id: 'c1', column_id: 'col1', position: 0, priority: 'high', assignee_name: '', labels: [], due_date: null },
      c2: { id: 'c2', column_id: 'col1', position: 1, priority: 'low', assignee_name: '', labels: [], due_date: null },
      c3: { id: 'c3', column_id: 'col2', position: 0, priority: 'medium', assignee_name: '', labels: [], due_date: null },
    },
    addCard: mockAddCard,
    renameColumn: vi.fn(),
    deleteColumn: vi.fn(),
  })),
}))
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    profile: { display_name: 'Alice' },
  })),
}))
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({ font: 'default' })),
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
vi.mock('../components/board/DynamicIcon', () => ({
  default: ({ name }) => <span data-testid="icon">{name}</span>,
}))
vi.mock('../components/board/IconPicker', () => ({ default: () => null }))

import Column from '../components/board/Column'

describe('Column', () => {
  const column = { id: 'col1', title: 'In Progress', position: 0 }

  test('renders column title', () => {
    render(<Column column={column} boardId="b1" onCardClick={vi.fn()} />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  test('renders card count for this column only', () => {
    render(<Column column={column} boardId="b1" onCardClick={vi.fn()} />)
    // col1 has 2 cards (c1, c2), col2 has 1 (c3)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  test('renders Add task button', () => {
    render(<Column column={column} boardId="b1" onCardClick={vi.fn()} />)
    expect(screen.getByText('Add task')).toBeInTheDocument()
  })

  test('clicking Add task calls addCard', async () => {
    render(<Column column={column} boardId="b1" onCardClick={vi.fn()} />)
    screen.getByText('Add task').click()
    expect(mockAddCard).toHaveBeenCalled()
  })
})
