// How the sidebar's board list is ordered and filtered.
//
// Both inputs are local view preferences from settingsStore, not data — the
// same tier as pins and collapse state, so neither needs a schema change.
//
// Extracted rather than left inline in Sidebar so the rules can be tested
// against the real implementation. A test that re-implements a comparator
// passes happily while the component does something else.
//
// The menu that drives this deliberately offers only what the data backs.
// "Last activity" is absent because board activity is fetched per board on
// demand, not for the list; archiving is absent because boards have no
// archived state at all. Both are decoration until that changes.

export function arrangeBoards(boards, { sort = 'name', show = 'all', pinned = [] } = {}) {
  const isPinned = (b) => pinned.includes(b.id)
  const list = show === 'pinned' ? boards.filter(isPinned) : [...boards]

  // Pinned floats to the top of whichever order is selected: pinning is a
  // statement about importance, not about alphabet or age.
  const byPin = (a, b) => (isPinned(a) === isPinned(b) ? 0 : isPinned(a) ? -1 : 1)

  return list.sort((a, b) => {
    const pin = byPin(a, b)
    if (pin !== 0) return pin
    if (sort === 'created') {
      // Missing created_at falls back to epoch, so a board without one sorts
      // last predictably instead of wherever the comparator happens to leave it.
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    }
    return a.name.localeCompare(b.name)
  })
}
