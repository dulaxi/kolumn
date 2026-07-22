// Real-Card render of the `ghost` mode: dotted border + one appended
// attribution line. Mirrors the store setup used in labels.renderloop.test.jsx.
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useBoardStore } from '../store/boardStore'

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({ profile: { display_name: 'Alice', icon: null, color: 'bg-blue-200' } })),
}))
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({
    font: 'default', labelStyle: 'default', toggleLabelStyle: vi.fn(),
    iconStyle: 'plain', toggleIconStyle: vi.fn(),
  })),
}))
vi.mock('../components/board/DynamicIcon', () => ({ default: ({ name }) => <span>{name}</span> }))

const { default: Card } = await import('../components/board/Card')

const card = {
  id: 'c1', board_id: 'b1', title: 'Fix login', task_number: 3,
  priority: 'medium', completed: false, icon: null, checklist: [], assignee_name: '',
}

describe('Card ghost mode', () => {
  beforeEach(() => {
    useBoardStore.setState({ cards: {}, labels: {}, cardLabels: {}, _tempIdMap: {} })
  })

  test('dotted border + appended mover attribution line', () => {
    const { container } = render(
      <Card card={card} onClick={vi.fn()} ghost={{ moverName: 'Maya', moverColor: 'bg-blue-200', when: '3 hours ago' }} />,
    )
    expect(container.querySelector('button').className).toContain('border-dotted')
    expect(container.textContent).toContain('Maya moved 3 hours ago')
  })

  test('without the ghost prop: solid border, no attribution line', () => {
    const { container } = render(<Card card={card} onClick={vi.fn()} />)
    expect(container.querySelector('button').className).not.toContain('border-dotted')
    expect(container.textContent).not.toContain('moved')
  })
})
