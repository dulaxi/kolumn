import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock stores
vi.mock('../store/boardStore', () => ({
  useBoardStore: vi.fn((sel) => sel({ updateCard: vi.fn() })),
}))
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({ profile: { display_name: 'Test' } })),
}))
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({ font: 'mona-sans' })),
}))

import Card from '../components/board/Card'

const MOCK_CARD = {
  id: 'card-1',
  title: 'Test Task',
  description: '',
  labels: [],
  priority: 'medium',
  due_date: null,
  checklist: [],
  assignee_name: '',
  task_number: 1,
  completed: false,
  icon: null,
}

describe('Card a11y', () => {
  test('renders as a semantic button element', () => {
    const onClick = vi.fn()
    render(<Card card={MOCK_CARD} onClick={onClick} onComplete={vi.fn()} isSelected={false} />)

    const button = screen.getByRole('button', { name: /task: test task/i })
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  test('is keyboard-activatable with Enter', async () => {
    const onClick = vi.fn()
    render(<Card card={MOCK_CARD} onClick={onClick} onComplete={vi.fn()} isSelected={false} />)

    const button = screen.getByRole('button', { name: /task: test task/i })
    button.focus()
    await userEvent.keyboard('{Enter}')

    expect(onClick).toHaveBeenCalledWith('card-1')
  })

  test('has visible focus indicator (not just outline-none)', () => {
    render(<Card card={MOCK_CARD} onClick={vi.fn()} onComplete={vi.fn()} isSelected={false} />)

    const button = screen.getByRole('button', { name: /task: test task/i })
    const className = button.className

    // If focus:outline-none is present, a focus ring must also be present
    // (either focus:ring or focus-visible:ring)
    if (className.includes('focus:outline-none')) {
      expect(className).toMatch(/focus(-visible)?:ring/)
    }
  })
})
