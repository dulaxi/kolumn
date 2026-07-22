import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { interleaveGhosts } from '../lib/moveGhosts'

// Ghost renders the real Card in ghost mode; mock it to keep this test focused
// on the interleave→GhostCard contract without standing up the full DnD tree.
vi.mock('../components/board/Card', () => ({
  default: ({ card, ghost }) => <div data-testid="ditto">{card.title} · {ghost?.moverName}</div>,
}))

import GhostCard from '../components/board/GhostCard'

// The Column interleave is `interleaveGhosts` + a GhostCard per ghost slot.
function ColumnGhosts({ cardIds, ghosts, info }) {
  const seq = interleaveGhosts(cardIds, ghosts)
  return (
    <div>
      {seq.map((n, i) => n.type === 'ghost'
        ? <GhostCard key={`g${i}`} card={info.card} moverName={info.moverName} moverColor={info.moverColor} movedAt={info.movedAt} />
        : <div key={n.id} data-card={n.id}>{n.id}</div>)}
    </div>
  )
}

describe('column ghost interleave', () => {
  const info = { card: { id: 'fix', title: 'Fix login bug' }, moverName: 'Maya', moverColor: 'copper', movedAt: '2024-01-01T10:00:00.000Z' }

  test('a ghost slot renders a ditto GhostCard at its position', () => {
    render(<ColumnGhosts cardIds={['a', 'b']} ghosts={[{ position: 1, age: 1, approximate: false }]} info={info} />)
    const ditto = screen.getByTestId('ditto')
    expect(ditto).toHaveTextContent('Fix login bug')
    expect(ditto).toHaveTextContent('Maya')
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  test('no ghosts -> no GhostCard', () => {
    render(<ColumnGhosts cardIds={['a']} ghosts={[]} info={info} />)
    expect(screen.queryByTestId('ditto')).toBeNull()
  })
})
