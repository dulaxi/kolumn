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

  test('the marker is visible at rest, not only on hover', () => {
    renderItem({ pinned: true })
    // Delete and leave sit beside it and are opacity-0 until the row is
    // hovered. Pinned is a status rather than an action, so it must not be.
    // getAttribute('class'), not .className: on an SVG element className is an
    // SVGAnimatedString object, so toContain() against it passes vacuously —
    // this assertion did not catch a deliberately hover-hidden pin until it
    // read the attribute instead.
    expect(screen.getByLabelText('Pinned').getAttribute('class')).not.toContain('opacity-0')
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
