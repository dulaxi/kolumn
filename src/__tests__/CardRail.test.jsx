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

  test('earlier mentions collapse behind an Earlier divider by default', () => {
    setCards({
      c1: { id: 'c1', title: 'Old topic', board_id: 'b1' },
      c2: { id: 'c2', title: 'New topic', board_id: 'b1' },
    })
    renderRail([
      { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
      { id: 'm2', role: 'user', text: 'next question', mentionedCardIds: [] },
      { id: 'm3', role: 'assistant', text: '', mentionedCardIds: ['c2'] },
    ])
    expect(screen.getByTestId('rail-card-c2')).toBeInTheDocument()
    expect(screen.queryByTestId('rail-card-c1')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Earlier · 1'))
    expect(screen.getByTestId('rail-card-c1')).toBeInTheDocument()
  })

  test('a card mentioned now and earlier renders once, as current — no divider', () => {
    setCards({ c1: { id: 'c1', title: 'Repeat', board_id: 'b1' } })
    renderRail([
      { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
      { id: 'm2', role: 'user', text: 'again', mentionedCardIds: [] },
      { id: 'm3', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
    ])
    expect(screen.getAllByTestId('rail-card-c1')).toHaveLength(1)
    expect(screen.queryByText(/Earlier ·/)).not.toBeInTheDocument()
  })

  test('cap and Show all scope to the current set only', () => {
    const cards = {}
    const ids = []
    for (let i = 1; i <= 8; i++) {
      cards[`c${i}`] = { id: `c${i}`, title: `Card ${i}`, board_id: 'b1' }
      ids.push(`c${i}`)
    }
    cards.old1 = { id: 'old1', title: 'Old one', board_id: 'b1' }
    cards.old2 = { id: 'old2', title: 'Old two', board_id: 'b1' }
    setCards(cards)
    renderRail([
      { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['old1', 'old2'] },
      { id: 'm2', role: 'user', text: 'now these', mentionedCardIds: [] },
      { id: 'm3', role: 'assistant', text: '', mentionedCardIds: ids },
    ])
    expect(screen.getAllByTestId(/rail-card-/)).toHaveLength(6)
    expect(screen.getByText('Earlier · 2')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Show all 8'))
    expect(screen.getAllByTestId(/rail-card-/)).toHaveLength(8)
  })

  test('earlier starts expanded when the latest exchange mentions nothing', () => {
    setCards({ c1: { id: 'c1', title: 'Only old', board_id: 'b1' } })
    renderRail([
      { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
      { id: 'm2', role: 'user', text: 'unrelated question', mentionedCardIds: [] },
      { id: 'm3', role: 'assistant', text: '', mentionedCardIds: [] },
    ])
    expect(screen.getByText('Earlier · 1')).toBeInTheDocument()
    expect(screen.getByTestId('rail-card-c1')).toBeInTheDocument()
  })

  test('grouping applies to each side separately', () => {
    setCards(
      {
        c1: { id: 'c1', title: 'Old board card', board_id: 'b2' },
        c2: { id: 'c2', title: 'New board card', board_id: 'b1' },
      },
      { b1: { id: 'b1', name: 'Launch' }, b2: { id: 'b2', name: 'Backlog' } },
    )
    renderRail(
      [
        { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
        { id: 'm2', role: 'user', text: 'board 1 now', mentionedCardIds: [] },
        { id: 'm3', role: 'assistant', text: '', mentionedCardIds: ['c2'] },
      ],
      { groupBy: 'board' },
    )
    expect(screen.getByText('Launch · 1')).toBeInTheDocument()
    expect(screen.queryByText('Backlog · 1')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Earlier · 1'))
    expect(screen.getByText('Backlog · 1')).toBeInTheDocument()
  })
})
