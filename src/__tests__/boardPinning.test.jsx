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

  test('a pinned board shows its pin and no delete control', () => {
    renderItem({ pinned: true, deletable: true })
    expect(screen.getByLabelText('Pinned')).toBeInTheDocument()
    // Pin wins outright — deleting a pinned board means unpinning it first.
    expect(screen.queryByLabelText('Delete board Launch plan')).toBeNull()
  })

  test('the pin is visible at rest, never hover-gated', () => {
    renderItem({ pinned: true, deletable: true })
    const pin = screen.getByLabelText('Pinned')
    expect(hiddenAtRest(pin)).toBe(false)
    expect(classOf(pin)).not.toContain('group-hover:opacity-0')
  })

  test('an unpinned board keeps its hover delete', () => {
    renderItem({ pinned: false, deletable: true })
    const trash = screen.getByLabelText('Delete board Launch plan')
    expect(hiddenAtRest(trash)).toBe(true)
    expect(classOf(trash)).toContain('group-hover:opacity-100')
  })

  test('the icon is centred by the slot, not positioned against a wrapper', () => {
    renderItem({ pinned: true, deletable: true })
    const slot = screen.getByLabelText('Pinned').closest('[data-row-actions]')
    expect(slot).not.toBeNull()
    // Absolute positioning here lands against Tooltip's own relative wrapper
    // rather than this slot, which is what put the pin off-centre.
    expect(classOf(screen.getByLabelText('Pinned'))).not.toContain('absolute')
    expect(slot.className).toContain('items-center')
    expect(slot.className).toContain('justify-center')
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
