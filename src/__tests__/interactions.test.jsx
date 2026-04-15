import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockUpdateCard = vi.fn()
const mockDeleteCard = vi.fn()

vi.mock('../store/boardStore', () => ({
  useBoardStore: vi.fn((sel) => sel({
    cards: {
      c1: {
        id: 'c1', title: 'Untitled task', description: '', assignee_name: '', assignees: [],
        priority: 'medium', due_date: '', labels: [], checklist: [], icon: null, task_number: 1,
        board_id: 'b1',
      },
    },
    boards: { b1: { id: 'b1', workspace_id: null } },
    _tempIdMap: {},
    updateCard: mockUpdateCard,
    deleteCard: mockDeleteCard,
  })),
}))
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    profile: { display_name: 'Alice', icon: null, color: 'bg-blue-200' },
  })),
}))
vi.mock('../store/workspacesStore', () => ({
  useWorkspacesStore: Object.assign(
    vi.fn((sel) => sel({ members: {}, fetchMembers: vi.fn() })),
    { getState: () => ({ fetchMembers: vi.fn() }) },
  ),
}))
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}))
vi.mock('../components/board/DynamicIcon', () => ({
  default: ({ name }) => <span data-testid="icon">{name}</span>,
}))
vi.mock('../components/board/IconPicker', () => ({ default: () => null }))

import InlineCardEditor from '../components/board/InlineCardEditor'

beforeEach(() => {
  mockUpdateCard.mockClear()
  mockDeleteCard.mockClear()
})

describe('InlineCardEditor', () => {
  test('Save button calls updateCard with entered title', async () => {
    const onDone = vi.fn()
    render(<InlineCardEditor cardId="c1" onDone={onDone} />)

    const titleInput = screen.getByPlaceholderText('Task name...')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'My new task')

    screen.getByText('Save').click()
    expect(mockUpdateCard).toHaveBeenCalledWith('c1', expect.objectContaining({
      title: 'My new task',
    }))
    expect(onDone).toHaveBeenCalled()
  })

  test('Save with empty title calls onDone without updateCard', async () => {
    const onDone = vi.fn()
    render(<InlineCardEditor cardId="c1" onDone={onDone} />)

    // Title defaults to empty (Untitled task is cleared to '')
    screen.getByText('Save').click()
    expect(mockUpdateCard).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalled()
  })

  test('Enter key saves', async () => {
    const onDone = vi.fn()
    render(<InlineCardEditor cardId="c1" onDone={onDone} />)

    const titleInput = screen.getByPlaceholderText('Task name...')
    await userEvent.type(titleInput, 'Enter task{Enter}')
    expect(mockUpdateCard).toHaveBeenCalledWith('c1', expect.objectContaining({
      title: 'Enter task',
    }))
  })

  test('Discard deletes card', () => {
    const onDone = vi.fn()
    render(<InlineCardEditor cardId="c1" onDone={onDone} />)
    screen.getByText('Discard').click()
    expect(mockDeleteCard).toHaveBeenCalledWith('c1')
    expect(onDone).toHaveBeenCalled()
  })

  test('Title input auto-focuses', () => {
    render(<InlineCardEditor cardId="c1" onDone={vi.fn()} />)
    expect(screen.getByPlaceholderText('Task name...')).toHaveFocus()
  })
})
