import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useBoardStore } from '../store/boardStore'
import LabelManagerModal from '../components/board/LabelManagerModal'

// The label manager is the board's label ADMIN surface — applying a label to a
// card is LabelAutocomplete's job, from the card. These tests cover what the
// rework changed:
//
// - a row shows the label itself, and its count is a way into the board rather
//   than a dead end
// - labels on no cards are called out, because those are the ones worth
//   deleting
// - delete exists at all, and says what it will cost before doing it
// - archived labels stop taking up room when there are none

const deleteLabel = vi.fn()
const createLabel = vi.fn()

function seed() {
  useBoardStore.setState({
    cards: {},
    labels: {
      L1: { id: 'L1', board_id: 'B1', text: 'frontend', color: 'blue', archived_at: null },
      L2: { id: 'L2', board_id: 'B1', text: 'backend', color: 'red', archived_at: null },
      L3: { id: 'L3', board_id: 'B1', text: 'stale', color: 'gray', archived_at: null },
      LA: { id: 'LA', board_id: 'B1', text: 'old-thing', color: 'gray', archived_at: '2026-01-01T00:00:00Z' },
    },
    cardLabels: {
      c1: new Set(['L1', 'L2']),
      c2: new Set(['L1']),
    },
    _tempIdMap: {},
    deleteLabel,
    createLabel,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  seed()
})

const open = (props = {}) =>
  render(<LabelManagerModal open onClose={props.onClose || vi.fn()} boardId="B1" {...props} />)

describe('LabelManagerModal', () => {
  test('a row shows the label itself, not a description of it', () => {
    open()
    // The pill carries the text. It used to render as "/frontend" beside a
    // dot, which is not how a label looks anywhere else in the app.
    expect(screen.getByText('frontend')).toBeInTheDocument()
    expect(screen.queryByText('/frontend')).toBeNull()
  })

  test('the count is a link into the filtered board, not a bare number', async () => {
    const user = userEvent.setup()
    const onFilterByLabel = vi.fn()
    const onClose = vi.fn()
    open({ onFilterByLabel, onClose })

    await user.click(screen.getByRole('button', { name: '2 cards' }))
    expect(onFilterByLabel).toHaveBeenCalledWith('frontend')
    // Filtering is pointless behind a modal, so it closes on the way through.
    expect(onClose).toHaveBeenCalled()
  })

  test('counts are singular when there is one card', () => {
    open()
    expect(screen.getByRole('button', { name: '1 card' })).toBeInTheDocument()
  })

  test('a label on no cards is called out rather than shown as 0', () => {
    open()
    expect(screen.getByText('Unused')).toBeInTheDocument()
    // "Unused" is not a button — there is nothing to filter to.
    expect(screen.queryByRole('button', { name: /unused/i })).toBeNull()
  })

  test('delete asks first, and says what it will cost', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: /Options for frontend/ }))
    // Menu.Item renders a plain button — the Menu primitive sets no
    // role="menu"/"menuitem", so these are queried as buttons.
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.getByText(/removes the label from 2 cards/i)).toBeInTheDocument()
    expect(screen.getByText(/cards themselves are not deleted/i)).toBeInTheDocument()
    expect(deleteLabel).not.toHaveBeenCalled()

    // Scoped to the dialog: the menu's own Delete item is still mounted, so an
    // unscoped query matches two buttons.
    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(deleteLabel).toHaveBeenCalledWith('L1')
  })

  test('deleting an unused label says so instead of naming a card count', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: /Options for stale/ }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText(/not on any card/i)).toBeInTheDocument()
  })

  test('a duplicate name is refused before it reaches the database', async () => {
    const user = userEvent.setup()
    open()
    await user.type(screen.getByLabelText('Add a label'), 'Frontend')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText(/already exists on this board/i)).toBeInTheDocument()
    // The unique constraint would otherwise surface as a raw Postgres error.
    expect(createLabel).not.toHaveBeenCalled()
  })

  test('a new label is created with the chosen name', async () => {
    const user = userEvent.setup()
    open()
    await user.type(screen.getByLabelText('Add a label'), 'infra')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(createLabel).toHaveBeenCalledWith('B1', 'infra', expect.any(String))
  })

  test('archived labels are collapsed behind a count, not shown by default', async () => {
    const user = userEvent.setup()
    open()
    expect(screen.queryByText('old-thing')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Archived \(1\)/ }))
    expect(screen.getByText('old-thing')).toBeInTheDocument()
  })

  test('the archived section takes no room when nothing is archived', () => {
    useBoardStore.setState({
      labels: {
        L1: { id: 'L1', board_id: 'B1', text: 'frontend', color: 'blue', archived_at: null },
      },
    })
    open()
    // It used to be a permanent checkbox for a rare case.
    expect(screen.queryByText(/Archived/)).toBeNull()
    expect(screen.queryByLabelText(/show archived/i)).toBeNull()
  })

  test('every label action lives in one menu', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: /Options for frontend/ }))
    for (const action of ['Rename', 'Merge into…', 'Archive', 'Delete']) {
      expect(screen.getByRole('button', { name: action })).toBeInTheDocument()
    }
  })
})
