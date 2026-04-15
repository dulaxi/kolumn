import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../store/boardStore', () => ({
  useBoardStore: vi.fn((sel) => sel({
    cards: {},
    updateCard: vi.fn(),
  })),
}))
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    profile: { display_name: 'Alice', icon: null, color: 'bg-blue-200' },
  })),
}))
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({ font: 'default' })),
}))
vi.mock('../components/board/DynamicIcon', () => ({
  default: ({ name }) => <span data-testid="icon">{name}</span>,
}))

import Card from '../components/board/Card'

const baseCard = {
  id: 'c1',
  title: 'Fix login bug',
  description: '',
  labels: [],
  priority: 'medium',
  due_date: null,
  checklist: [],
  assignee_name: '',
  task_number: 3,
  completed: false,
  icon: null,
}

describe('Card', () => {
  test('renders card title', () => {
    render(<Card card={baseCard} onClick={vi.fn()} />)
    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
  })

  // Note: task number is not rendered on the card face by design — only in
  // CardDetailPanel header. Removed previous "renders task number" test.

  test('renders labels with slash prefix', () => {
    const card = { ...baseCard, labels: [{ text: 'bug', color: 'red' }, { text: 'urgent', color: 'yellow' }] }
    render(<Card card={card} onClick={vi.fn()} />)
    // Card renders labels as "/labelname" (lowercase, slash-prefixed)
    expect(screen.getByText('/bug')).toBeInTheDocument()
    expect(screen.getByText('/urgent')).toBeInTheDocument()
  })

  test('renders assignee initials (lowercase)', () => {
    const card = { ...baseCard, assignee_name: 'Bob Smith' }
    render(<Card card={card} onClick={vi.fn()} />)
    // Initials are rendered lowercase to match the Claude-style aesthetic
    expect(screen.getByText('bs')).toBeInTheDocument()
  })

  test('renders multiple assignees as stacked avatars', () => {
    const card = { ...baseCard, assignees: ['Bob Smith', 'Carol Jones'] }
    render(<Card card={card} onClick={vi.fn()} />)
    expect(screen.getByText('bs')).toBeInTheDocument()
    expect(screen.getByText('cj')).toBeInTheDocument()
  })

  test('shows +N overflow when more than 3 assignees', () => {
    const card = { ...baseCard, assignees: ['Alice A.', 'Bob B.', 'Carol C.', 'Dave D.', 'Eve E.'] }
    render(<Card card={card} onClick={vi.fn()} />)
    // 3 visible + "+2" overflow pill
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  test('renders checklist count', () => {
    const card = { ...baseCard, checklist: [{ text: 'A', done: true }, { text: 'B', done: false }, { text: 'C', done: false }] }
    render(<Card card={card} onClick={vi.fn()} />)
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  test('shows description preview when description exists', () => {
    const card = { ...baseCard, description: 'This is a detailed description' }
    render(<Card card={card} onClick={vi.fn()} />)
    expect(screen.getByText('This is a detailed description')).toBeInTheDocument()
  })

  test('completed cards have line-through text', () => {
    const card = { ...baseCard, completed: true }
    render(<Card card={card} onClick={vi.fn()} />)
    const title = screen.getByText('Fix login bug')
    expect(title.className).toContain('line-through')
  })

  test('calls onClick with card id', async () => {
    const onClick = vi.fn()
    render(<Card card={baseCard} onClick={onClick} />)
    screen.getByRole('button', { name: /fix login bug/i }).click()
    expect(onClick).toHaveBeenCalledWith('c1')
  })

  test('calls onComplete when checkmark clicked', () => {
    const onClick = vi.fn()
    const onComplete = vi.fn()
    render(<Card card={baseCard} onClick={onClick} onComplete={onComplete} />)
    // The check button is a nested button inside the card (role=button)
    const buttons = screen.getAllByRole('button')
    // buttons[0] is the outer card div, buttons[1] is the check circle
    buttons[1].click()
    expect(onComplete).toHaveBeenCalledWith('c1')
  })

  test('renders due date as "Today"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25, 12, 0, 0))
    const card = { ...baseCard, due_date: '2026-03-25' }
    render(<Card card={card} onClick={vi.fn()} />)
    expect(screen.getByText('Today')).toBeInTheDocument()
    vi.useRealTimers()
  })
})

// ─── Phosphor Icons data ─────────────────────────────────────

describe('phosphorIcons', () => {
  test('ALL_PHOSPHOR_ICONS contains curated icons', async () => {
    const { ALL_PHOSPHOR_ICONS } = await import('../data/phosphorIcons')
    expect(ALL_PHOSPHOR_ICONS.length).toBeGreaterThan(100)
    expect(ALL_PHOSPHOR_ICONS).toContain('rocket')
    expect(ALL_PHOSPHOR_ICONS).toContain('star')
  })
})

// ─── Column ───────────────────────────────────────────────────

// Column tests are in a separate file to avoid mock conflicts
