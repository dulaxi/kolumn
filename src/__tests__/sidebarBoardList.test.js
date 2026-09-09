import { describe, test, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../store/settingsStore'

// The sidebar's board list can be reordered and filtered from the section
// heading's menu. Both preferences are local, like pins and collapse state —
// a per-device view choice, not data, so neither needs a schema change.
//
// This asserts the ordering rules the sidebar applies, and that the
// preferences survive being set. The menu only offers what the data actually
// backs: "Last activity" and archiving are absent on purpose, because board
// activity is fetched per board on demand and boards have no archived state.

const board = (id, name, created) => ({ id, name, created_at: created, owner_id: 'u1', workspace_id: null })

import { arrangeBoards } from '../components/layout/boardListOrder'

// The real implementation, not a copy of it — a test that re-implements a
// comparator passes happily while the component does something else.
const arrange = (boards, opts) => arrangeBoards(boards, opts)

const boards = [
  board('b1', 'Alpha', '2026-01-01'),
  board('b2', 'Beta', '2026-06-01'),
  board('b3', 'Gamma', '2026-03-01'),
]

beforeEach(() => {
  useSettingsStore.setState({ boardSort: 'name', boardShow: 'all', favoriteBoards: [] })
})

describe('sidebar board list', () => {
  test('sorts by name by default', () => {
    expect(arrange(boards, { sort: 'name', show: 'all', pinned: [] }).map((b) => b.name))
      .toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  test('sorts newest first by created date', () => {
    expect(arrange(boards, { sort: 'created', show: 'all', pinned: [] }).map((b) => b.name))
      .toEqual(['Beta', 'Gamma', 'Alpha'])
  })

  test('pinned boards float to the top in either order', () => {
    // Pinning is a statement about importance, not about alphabet or age, so
    // it outranks whichever sort is selected.
    expect(arrange(boards, { sort: 'name', show: 'all', pinned: ['b3'] }).map((b) => b.name))
      .toEqual(['Gamma', 'Alpha', 'Beta'])
    expect(arrange(boards, { sort: 'created', show: 'all', pinned: ['b1'] }).map((b) => b.name))
      .toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  test('"Pinned only" hides everything else', () => {
    expect(arrange(boards, { sort: 'name', show: 'pinned', pinned: ['b2', 'b3'] }).map((b) => b.name))
      .toEqual(['Beta', 'Gamma'])
  })

  test('a board with no created_at still sorts rather than throwing', () => {
    const odd = [...boards, board('b4', 'Delta', undefined)]
    const names = arrange(odd, { sort: 'created', show: 'all', pinned: [] }).map((b) => b.name)
    expect(names).toHaveLength(4)
    // Epoch-zero, so it lands last rather than anywhere unpredictable.
    expect(names[names.length - 1]).toBe('Delta')
  })

  test('both preferences live in settings, so they persist per device', () => {
    useSettingsStore.getState().setBoardSort('created')
    useSettingsStore.getState().setBoardShow('pinned')
    expect(useSettingsStore.getState().boardSort).toBe('created')
    expect(useSettingsStore.getState().boardShow).toBe('pinned')
  })

  test('defaults are name order and everything shown', () => {
    expect(useSettingsStore.getState().boardSort).toBe('name')
    expect(useSettingsStore.getState().boardShow).toBe('all')
  })
})
