import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { interleaveGhosts } from '../lib/moveGhosts'
import GhostCard from '../components/board/GhostCard'

// The Column interleave is `interleaveGhosts` + a GhostCard per ghost slot.
// This test locks that contract without standing up the full DnD tree.
function ColumnGhosts({ cardIds, ghosts, info }) {
  const seq = interleaveGhosts(cardIds, ghosts)
  return (
    <div>
      {seq.map((n, i) => n.type === 'ghost'
        ? <GhostCard key={`g${i}`} title={info.title} moverName={info.moverName} moverColor={info.moverColor} movedAt={info.movedAt} age={n.ghost.age} approximate={n.ghost.approximate} />
        : <div key={n.id} data-card={n.id}>{n.id}</div>)}
    </div>
  )
}

describe('column ghost interleave', () => {
  const info = { title: 'Fix login bug', moverName: 'Maya', moverColor: 'copper', movedAt: '2026-07-21T10:00:00.000Z' }

  test('a ghost slot renders a GhostCard at its position', () => {
    render(<ColumnGhosts cardIds={['a', 'b']} ghosts={[{ position: 1, age: 1, approximate: false }]} info={info} />)
    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    expect(screen.getByText(/Maya moved this/)).toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  test('no ghosts -> no GhostCard', () => {
    render(<ColumnGhosts cardIds={['a']} ghosts={[]} info={info} />)
    expect(screen.queryByText(/moved this/)).toBeNull()
  })
})
