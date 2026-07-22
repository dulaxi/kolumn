import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GhostCard from '../components/board/GhostCard'

describe('GhostCard', () => {
  test('renders the card title and who moved it', () => {
    render(<GhostCard title="Fix login bug" moverName="Maya" moverColor="copper" movedAt="2026-07-21T10:00:00.000Z" age={1} approximate={false} />)
    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    expect(screen.getByText(/Maya moved this/)).toBeInTheDocument()
  })

  test('is inert (aria-hidden, pointer-events none)', () => {
    const { container } = render(<GhostCard title="X" moverName="Sam" movedAt="2026-07-21T10:00:00.000Z" age={1} approximate={false} />)
    const root = container.firstChild
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root.style.pointerEvents).toBe('none')
  })
})
