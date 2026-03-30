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

  test('renders task number', () => {
    render(<Card card={baseCard} onClick={vi.fn()} />)
    expect(screen.getByText('Task #3')).toBeInTheDocument()
  })

  test('renders labels', () => {
    const card = { ...baseCard, labels: [{ text: 'bug', color: 'red' }, { text: 'urgent', color: 'yellow' }] }
    render(<Card card={card} onClick={vi.fn()} />)
    expect(screen.getByText('bug')).toBeInTheDocument()
    expect(screen.getByText('urgent')).toBeInTheDocument()
  })

  test('renders assignee initials', () => {
    const card = { ...baseCard, assignee_name: 'Bob Smith' }
    render(<Card card={card} onClick={vi.fn()} />)
    expect(screen.getByText('BS')).toBeInTheDocument()
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

// ─── DynamicIcon ──────────────────────────────────────────────
// DynamicIcon is mocked above for Card tests, so we test getAllIconNames
// from the real module in a separate import

describe('getAllIconNames', () => {
  test('returns lucide icons only when library is lucide', async () => {
    // Dynamic import to get real module (not the mock)
    const mod = await vi.importActual('../components/board/DynamicIcon')
    const names = mod.getAllIconNames('lucide')
    expect(names.length).toBeGreaterThan(100)
    expect(names).toContain('FileText')
  })
})

// ─── Column ───────────────────────────────────────────────────

// Column tests are in a separate file to avoid mock conflicts
