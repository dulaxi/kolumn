// Real-Card render of ghost mode + the ghost-armed surface swap. Mirrors the
// store setup used in labels.renderloop.test.jsx, with a mutable settings ref
// so ghostBoards can vary per test.
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useBoardStore } from '../store/boardStore'

const { settings } = vi.hoisted(() => ({ settings: { current: {} } }))

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({ profile: { display_name: 'Alice', icon: null, color: 'bg-blue-200' } })),
}))
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel(settings.current)),
}))
vi.mock('../components/board/DynamicIcon', () => ({ default: ({ name }) => <span>{name}</span> }))

const { default: Card } = await import('../components/board/Card')

const card = {
  id: 'c1', board_id: 'b1', title: 'Fix login', task_number: 3,
  priority: 'medium', completed: false, icon: null, checklist: [], assignee_name: '',
}

describe('Card ghost mode', () => {
  beforeEach(() => {
    settings.current = {
      font: 'default', labelStyle: 'default', toggleLabelStyle: vi.fn(),
      iconStyle: 'plain', toggleIconStyle: vi.fn(), ghostBoards: {},
    }
    useBoardStore.setState({ cards: {}, labels: {}, cardLabels: {}, _tempIdMap: {} })
  })

  test('ghost placeholder: dashed border + 50% opacity content + attribution line', () => {
    const { container } = render(
      <Card card={card} onClick={vi.fn()} ghost={{ moverName: 'Maya', moverColor: 'bg-blue-200', when: '3 hours ago' }} />,
    )
    expect(container.querySelector('button').className).toContain('border-dashed')
    const contentLayer = container.querySelector('button > div')
    expect(contentLayer.style.opacity).toBe('0.5')
    expect(contentLayer.style.filter).toBe('')
    expect(container.textContent).toContain('Maya moved 3 hours ago')
  })

  test('without the ghost prop: solid border, no attribution line', () => {
    const { container } = render(<Card card={card} onClick={vi.fn()} />)
    expect(container.querySelector('button').className).not.toContain('border-dashed')
    expect(container.textContent).not.toContain('moved')
  })

  test('ghost mode disarmed: normal surfaces (card bg, hover page)', () => {
    const { container } = render(<Card card={card} onClick={vi.fn()} />)
    const cls = container.querySelector('button').className
    expect(cls).toContain('bg-[var(--surface-card)]')
    expect(cls).toContain('hover:bg-[var(--surface-page)]')
  })

  test('ghost mode armed: surfaces swap (page bg, hover card)', () => {
    settings.current.ghostBoards = { b1: true }
    const { container } = render(<Card card={card} onClick={vi.fn()} />)
    const cls = container.querySelector('button').className
    expect(cls).toContain('bg-[var(--surface-page)]')
    expect(cls).toContain('hover:bg-[var(--surface-card)]')
  })

  test('ghost placeholder stays on the card surface even when armed', () => {
    settings.current.ghostBoards = { b1: true }
    const { container } = render(
      <Card card={card} onClick={vi.fn()} ghost={{ moverName: 'Maya', moverColor: 'bg-blue-200', when: '3 hours ago' }} />,
    )
    const cls = container.querySelector('button').className
    expect(cls).toContain('bg-[var(--surface-card)]')
    expect(cls).not.toContain('bg-[var(--surface-page)]')
  })
})
