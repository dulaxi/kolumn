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

const renderRail = (messages, props = {}) =>
  render(<MemoryRouter><CardRail messages={messages} {...props} /></MemoryRouter>)

const setCards = (cards, boards = {}, columns = {}) =>
  useBoardStore.setState({ cards, boards, columns, _tempIdMap: {} })

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

  test('mentioned mode shows the trigger and no section headers', () => {
    setCards({ c1: { id: 'c1', title: 'Alpha', board_id: 'b1' } })
    renderRail([{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] }])
    expect(screen.getByText('Mentioned')).toBeInTheDocument()
    expect(screen.queryByText(/· \d/)).not.toBeInTheDocument()
  })

  test('board mode sections cards under board-name headers with counts', () => {
    setCards(
      {
        c1: { id: 'c1', title: 'Alpha', board_id: 'b1' },
        c2: { id: 'c2', title: 'Beta', board_id: 'b2' },
        c3: { id: 'c3', title: 'Gamma', board_id: 'b1' },
      },
      { b1: { id: 'b1', name: 'Launch' }, b2: { id: 'b2', name: 'Backlog' } },
    )
    renderRail(
      [{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1', 'c2', 'c3'] }],
      { groupBy: 'board' },
    )
    expect(screen.getByText('Launch · 2')).toBeInTheDocument()
    expect(screen.getByText('Backlog · 1')).toBeInTheDocument()
  })

  test('due mode buckets No date before Completed', () => {
    setCards({
      c1: { id: 'c1', title: 'Open thing', board_id: 'b1' },
      c2: { id: 'c2', title: 'Done thing', board_id: 'b1', completed: true },
    })
    renderRail(
      [{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c2', 'c1'] }],
      { groupBy: 'due' },
    )
    const labels = screen.getAllByText(/· \d/).map((el) => el.textContent)
    expect(labels).toEqual(['No date · 1', 'Completed · 1'])
  })

  test('selecting a menu entry calls onGroupByChange', () => {
    setCards({ c1: { id: 'c1', title: 'Alpha', board_id: 'b1' } })
    const onGroupByChange = vi.fn()
    renderRail(
      [{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] }],
      { onGroupByChange },
    )
    fireEvent.click(screen.getByText('Mentioned'))
    fireEvent.click(screen.getByText('Board'))
    expect(onGroupByChange).toHaveBeenCalledWith('board')
  })

  test('the cap applies before grouping', () => {
    const cards = {}
    const ids = []
    for (let i = 1; i <= 8; i++) {
      cards[`c${i}`] = { id: `c${i}`, title: `Card ${i}`, board_id: 'b1' }
      ids.push(`c${i}`)
    }
    setCards(cards, { b1: { id: 'b1', name: 'Launch' } })
    renderRail(
      [{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ids }],
      { groupBy: 'board' },
    )
    expect(screen.getAllByTestId(/rail-card-/)).toHaveLength(6)
    expect(screen.getByText('Launch · 6')).toBeInTheDocument()
    expect(screen.getByText('Show all 8')).toBeInTheDocument()
  })
})
