// Content for /changelog. Plain JS data, no markdown loader.
//
// Every entry below was checked against `git log --oneline` before it
// shipped here (dates are the commit dates, kind picked to match the
// change's real effect on a user):
//   - 2026-08-04 "Create a board from anywhere" → 0b94e4c
//     feat(board): host the create-board modal globally in AppLayout
//   - 2026-07-30 "A new mark" → 2e65984 / b51ff51 / cc38a69
//     feat(brand): Klay's sprout becomes the Kolumn logo
//   - 2026-07-28 "Motion preference in Settings" → 9019788, f09b4ce
//     feat(settings): accessibility section with motion preference control
//     feat(settings): motion preference (system/full/reduced) with data-motion wiring
//   - 2026-07-28 "Modals and the card editor animate in and out" → 2d4b439,
//     8ee067f, 8c4daa7, 810876f (motion tokens, modal/tooltip/card-editor
//     enter-exit animation)
//   - 2026-07-28 "Drag-and-drop flicker on cross-column moves" → cc380ca
//     fix(board): eliminate drag-and-drop flicker on cross-column moves
//     (plus e391781 perf(board): scope Column card subscription to cut
//     drag-time re-renders)
//   - 2026-07-27 "Boards load faster" → 3f57db9 perf(board): load archived
//     cards on demand, off the hot path; dc10eb7 perf: trim critical-path
//     load; plus the two lime/Archived contrast fixes: 46965f0, 6caa281
//
// `links.tutorial` values must point at real slugs in src/content/tutorials.js.

export const CHANGELOG_TAGS = [
  { id: 'new', label: 'New' },
  { id: 'improved', label: 'Improved' },
  { id: 'fixed', label: 'Fixed' },
]

export const CHANGELOG_ENTRIES = [
  {
    date: '2026-08-04',
    tag: 'new',
    title: 'Create a board from anywhere',
    body: 'The "New board" dialog now opens from any page — the dashboard, a workspace, or the middle of another board — instead of only from the boards list. Press the same button you always did; it just works in more places.',
    links: { tutorial: 'start-from-a-template' },
  },
  {
    date: '2026-07-30',
    tag: 'improved',
    title: 'A new mark',
    body: "Kolumn's logo is now the sprout. It's the same one Klay carries around the app, and it replaces the old wordmark-only lockup in the sidebar, the sign-in screen, and the browser tab.",
  },
  {
    date: '2026-07-28',
    tag: 'new',
    title: 'Motion preference in Settings',
    body: 'Settings → General has a new Accessibility section with a Motion control: System follows your OS reduce-motion setting, Full keeps every animation, Reduced turns them down regardless of the OS. Modals, the card editor, tooltips, and Klay all respect it.',
    links: { tutorial: 'export-theme-and-motion' },
  },
  {
    date: '2026-07-28',
    tag: 'improved',
    title: 'Modals and the card editor animate in and out',
    body: 'Opening a card, a dialog, or a tooltip now has a short enter/exit transition instead of a hard cut, and dropping a card after a drag no longer flashes. Everything runs on transform and opacity, and all of it honours the Motion preference above.',
  },
  {
    date: '2026-07-28',
    tag: 'fixed',
    title: 'Drag-and-drop flicker on cross-column moves',
    body: 'Dragging a card into a different column could briefly show it in both places while the move was saved. It now lands once, where you dropped it. Dragging inside a busy board is also smoother, because columns re-render less while you drag.',
  },
  {
    date: '2026-07-27',
    tag: 'improved',
    title: 'Boards load faster',
    body: 'Archived cards are no longer fetched when a board opens — they load the first time you toggle Archived. Combined with a lighter first-load bundle, boards with a lot of history open noticeably quicker. Also fixed on the way: unreadable text on some lime-tinted pills and on the active Archived toggle in dark mode.',
  },
]

export function changelogMonthGroups() {
  const groups = new Map()
  for (const entry of CHANGELOG_ENTRIES) {
    const key = entry.date.slice(0, 7) // YYYY-MM
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entry)
  }
  return [...groups.entries()].map(([key, entries]) => ({
    key,
    label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    entries,
  }))
}

export function changelogEntryId(entry) {
  const slug = entry.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${entry.date}-${slug}`
}
