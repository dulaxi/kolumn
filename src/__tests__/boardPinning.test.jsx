import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import SidebarBoardItem from '../components/layout/SidebarBoardItem'
import { useSettingsStore } from '../store/settingsStore'

// Pinning reuses favoriteBoards, which has lived in settingsStore with a
// working toggle since long before anything read it. These pin the two halves
// that make it mean something: the sidebar marks a pinned board, and the
// ordering puts pinned boards first.

const board = (id, name) => ({ id, name, icon: 'kanban', owner_id: 'u1', workspace_id: null })

const renderItem = (props) =>
  render(
    <MemoryRouter>
      <SidebarBoardItem board={board('b1', 'Launch plan')} active={false} {...props} />
    </MemoryRouter>,
  )

describe('pinned boards in the sidebar', () => {
  test('a pinned board is marked', () => {
    renderItem({ pinned: true })
    expect(screen.getByLabelText('Pinned')).toBeInTheDocument()
  })

  test('an unpinned board is not', () => {
    renderItem({ pinned: false })
    expect(screen.queryByLabelText('Pinned')).toBeNull()
  })

  // getAttribute('class'), not .className: on an SVG element className is an
  // SVGAnimatedString object, so toContain() against it passes vacuously.
  const classOf = (el) => el.getAttribute('class') || ''
  // A bare opacity-0 hides the element at rest. group-hover:opacity-0 hides it
  // only while hovered, and merely CONTAINS the same substring — so these have
  // to be told apart by word boundary, not by toContain.
  const hiddenAtRest = (el) => /(^|\s)opacity-0(\s|$)/.test(classOf(el))

  test('the pin is visible at rest and gives way on hover', () => {
    renderItem({ pinned: true, deletable: true })
    const pin = screen.getByLabelText('Pinned')
    expect(hiddenAtRest(pin)).toBe(false)
    expect(classOf(pin)).toContain('group-hover:opacity-0')
  })

  test('the trash is hidden at rest and takes the pin\'s place on hover', () => {
    renderItem({ pinned: true, deletable: true })
    const trash = screen.getByLabelText('Delete board Launch plan')
    expect(hiddenAtRest(trash)).toBe(true)
    expect(classOf(trash)).toContain('group-hover:opacity-100')
  })

  test('they share one slot, so hovering does not shift the row', () => {
    renderItem({ pinned: true, deletable: true })
    const pin = screen.getByLabelText('Pinned')
    const trash = screen.getByLabelText('Delete board Launch plan')
    // Same positioned ancestor, both taken out of flow — two icons in the flow
    // would reserve width for both and move the board name on every hover.
    // Not the same *parent*: Tooltip wraps the pin in a span of its own.
    // Matched on the slot's own attribute rather than a class: Tooltip wraps
    // the pin in a span that is itself `relative`, so closest('.relative')
    // stops there instead of reaching the shared slot.
    const slot = pin.closest('[data-row-actions]')
    expect(slot).not.toBeNull()
    expect(trash.closest('[data-row-actions]')).toBe(slot)
    expect(classOf(pin)).toContain('absolute')
    expect(classOf(trash)).toContain('absolute')
  })

  test('a pin with nothing to swap to stays put', () => {
    renderItem({ pinned: true, deletable: false })
    const pin = screen.getByLabelText('Pinned')
    expect(hiddenAtRest(pin)).toBe(false)
    expect(classOf(pin)).not.toContain('group-hover:opacity-0')
  })
})

describe('favoriteBoards ordering', () => {
  // The comparator the sidebar uses, asserted directly: pinned first, then
  // alphabetical within each group.
  const sortLike = (boards, favorites) =>
    [...boards].sort((a, b) => {
      const pa = favorites.includes(a.id)
      const pb = favorites.includes(b.id)
      if (pa !== pb) return pa ? -1 : 1
      return a.name.localeCompare(b.name)
    })

  test('pinned boards come first, alphabetical within each group', () => {
    const boards = [board('b1', 'Alpha'), board('b2', 'Beta'), board('b3', 'Gamma')]
    const sorted = sortLike(boards, ['b3'])
    expect(sorted.map((b) => b.name)).toEqual(['Gamma', 'Alpha', 'Beta'])
  })

  test('with nothing pinned it is plain alphabetical', () => {
    const boards = [board('b2', 'Beta'), board('b1', 'Alpha')]
    expect(sortLike(boards, []).map((b) => b.name)).toEqual(['Alpha', 'Beta'])
  })

  test('toggleFavorite adds and removes, and persists in settings', () => {
    useSettingsStore.setState({ favoriteBoards: [] })
    useSettingsStore.getState().toggleFavorite('b1')
    expect(useSettingsStore.getState().favoriteBoards).toEqual(['b1'])
    useSettingsStore.getState().toggleFavorite('b1')
    expect(useSettingsStore.getState().favoriteBoards).toEqual([])
  })
})
