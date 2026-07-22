import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// The ghost renders the REAL Card as an exact ditto; mock it so this unit test
// stays focused on GhostCard's own job (drain + dashed wrapper + attribution).
vi.mock('../components/board/Card', () => ({
  default: ({ card }) => <div data-testid="ditto-card">{card.title}</div>,
}))

import GhostCard from '../components/board/GhostCard'

describe('GhostCard', () => {
  const card = { id: 'c1', title: 'Fix login bug', column_id: 'col-a' }
  const movedAt = '2024-01-01T10:00:00.000Z'

  test('renders an exact ditto of the card via the real Card component', () => {
    render(<GhostCard card={card} moverName="Maya" moverColor="copper" movedAt={movedAt} age={1} approximate={false} />)
    expect(screen.getByTestId('ditto-card')).toHaveTextContent('Fix login bug')
  })

  test('is inert (aria-hidden, pointer-events none)', () => {
    const { container } = render(<GhostCard card={card} moverName="Sam" movedAt={movedAt} age={1} />)
    const root = container.firstChild
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root.style.pointerEvents).toBe('none')
  })

  test('weaves the mover badge and when-moved text into the bottom line', () => {
    render(<GhostCard card={card} moverName="Maya" moverColor="copper" movedAt={movedAt} age={1} />)
    expect(screen.getByTitle('Maya moved this')).toBeInTheDocument()
    expect(screen.getByText(/^moved /)).toBeInTheDocument()
  })

  test('renders nothing without a card', () => {
    const { container } = render(<GhostCard card={null} moverName="Maya" />)
    expect(container.firstChild).toBeNull()
  })
})
