import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// GhostCard renders the REAL Card in ghost mode; mock Card so this unit test
// stays focused on GhostCard's own job (inert wrapper + ghost-prop passthrough).
vi.mock('../components/board/Card', () => ({
  default: ({ card, ghost }) => (
    <div data-testid="ditto-card">
      {card.title}
      <span data-testid="attr">{ghost?.moverName} moved {ghost?.when}</span>
    </div>
  ),
}))

import GhostCard from '../components/board/GhostCard'

describe('GhostCard', () => {
  const card = { id: 'c1', title: 'Fix login bug', column_id: 'col-a' }
  const movedAt = '2024-01-01T10:00:00.000Z'

  test('renders the real Card (exact ditto) with the card', () => {
    render(<GhostCard card={card} moverName="Maya" moverColor="copper" movedAt={movedAt} />)
    expect(screen.getByTestId('ditto-card')).toHaveTextContent('Fix login bug')
  })

  test('passes the mover + relative when-moved into Card as the ghost prop', () => {
    render(<GhostCard card={card} moverName="Maya" moverColor="copper" movedAt={movedAt} />)
    expect(screen.getByTestId('attr')).toHaveTextContent(/Maya moved .+ago/)
  })

  test('is inert (aria-hidden, pointer-events none)', () => {
    const { container } = render(<GhostCard card={card} moverName="Sam" movedAt={movedAt} />)
    const root = container.firstChild
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root.style.pointerEvents).toBe('none')
  })

  test('renders nothing without a card', () => {
    const { container } = render(<GhostCard card={null} moverName="Maya" />)
    expect(container.firstChild).toBeNull()
  })
})
