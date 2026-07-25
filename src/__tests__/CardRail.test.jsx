import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CardRail from '../components/chat/CardRail'
import { useBoardStore } from '../store/boardStore'

vi.mock('../components/board/Card', () => ({
  default: ({ card, onClick }) => (
    <button data-testid={`rail-card-${card.id}`} onClick={() => onClick(card.id)}>{card.title}</button>
  ),
}))

const renderRail = (messages) =>
  render(<MemoryRouter><CardRail messages={messages} /></MemoryRouter>)

const setCards = (cards) => useBoardStore.setState({ cards, _tempIdMap: {} })

describe('CardRail', () => {
  test('shows the empty state when nothing is mentioned', () => {
    setCards({})
    renderRail([{ id: 'm1', role: 'user', text: 'hi' }])
    expect(screen.getByText('Cards Claude mentions will show up here.')).toBeInTheDocument()
  })

  test('renders mentioned cards newest-first and deduped, skipping deleted ids', () => {
    setCards({
      c1: { id: 'c1', title: 'Alpha', board_id: 'b1' },
      c2: { id: 'c2', title: 'Beta', board_id: 'b1' },
    })
    renderRail([
      { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
      { id: 'm2', role: 'assistant', text: '', mentionedCardIds: ['c2', 'c1', 'gone'] },
    ])
    const buttons = screen.getAllByTestId(/rail-card-/)
    expect(buttons.map((b) => b.textContent)).toEqual(['Beta', 'Alpha'])
  })

  test('caps at 6 with a Show all button that expands', () => {
    const cards = {}
    const ids = []
    for (let i = 1; i <= 8; i++) {
      cards[`c${i}`] = { id: `c${i}`, title: `Card ${i}`, board_id: 'b1' }
      ids.push(`c${i}`)
    }
    setCards(cards)
    renderRail([{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ids }])
    expect(screen.getAllByTestId(/rail-card-/)).toHaveLength(6)
    fireEvent.click(screen.getByText('Show all 8'))
    expect(screen.getAllByTestId(/rail-card-/)).toHaveLength(8)
  })
})
