import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SquaresFour } from '@phosphor-icons/react'
import EmptyState from '../components/ui/EmptyState'

afterEach(() => cleanup())

describe('EmptyState', () => {
  test('renders the title', () => {
    render(<EmptyState icon={SquaresFour} title="Create your first board" />)
    expect(screen.getByText('Create your first board')).toBeTruthy()
  })

  test('renders body text when provided', () => {
    render(
      <EmptyState
        icon={SquaresFour}
        title="Create your first board"
        body="Boards hold your columns and cards."
      />,
    )
    expect(screen.getByText('Boards hold your columns and cards.')).toBeTruthy()
  })

  test('omits body when not provided', () => {
    const { container } = render(<EmptyState icon={SquaresFour} title="No results" />)
    expect(container.querySelector('p')).toBe(null)
  })

  test('renders the icon', () => {
    const { container } = render(<EmptyState icon={SquaresFour} title="Empty" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  test('renders action node when provided', () => {
    render(
      <EmptyState
        icon={SquaresFour}
        title="Create your first board"
        action={<button type="button">New board</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'New board' })).toBeTruthy()
  })

  test('omits action when not provided', () => {
    const { container } = render(<EmptyState icon={SquaresFour} title="Empty" />)
    expect(container.querySelector('button')).toBe(null)
  })

  test('merges custom className onto the container', () => {
    const { container } = render(
      <EmptyState icon={SquaresFour} title="Empty" className="custom-class" />,
    )
    expect(container.firstChild.className).toMatch(/custom-class/)
  })
})
