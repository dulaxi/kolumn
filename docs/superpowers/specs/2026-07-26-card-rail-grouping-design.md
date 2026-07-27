# Card Rail Grouping — per-conversation group-by menu

**Date:** 2026-07-26
**Status:** Approved
**Origin:** User request — "improve the card view, how can we more organize
those cards?" The chat page's right rail is a flat newest-first stack of
full-size board cards; this adds a group-by control so the same cards can be
sectioned by board, column, or due date.

## Control

The rail header row becomes: `Cards` heading (left) + a ghost text trigger
(right) showing the active mode with a Phosphor `CaretDown`, e.g.
`Mentioned ▾`. Muted 12px text so it stays quiet. Clicking opens the existing
`Menu` primitive with four `Menu.Item selected` entries:

- **Mentioned** (default)
- **Board**
- **Column**
- **Due date**

## Persistence — per conversation

The conversation object in `chatStore` gains
`railGroupBy: 'mentioned' | 'board' | 'column' | 'due'` (absent =
`'mentioned'`), set via a new `setRailGroupBy(conversationId, mode)` action.
chatStore already persists to localStorage, so the choice survives reloads.
ChatPage reads the active conversation's value and passes `groupBy` + the
setter down to `CardRail` as props.

## Grouping logic — `src/lib/cardRailGroups.js`

A new pure helper so grouping is unit-testable without rendering:

```
groupCards(mentionedCards, mode, { boards, columns }) -> [{ key, label, cards }]
```

- **mentioned** — one group with `label: null`, current newest-first order.
  Rendering is unchanged from today (no section header).
- **board** — one section per board, labeled with the board's name, count
  appended. Sections ordered by their most recently mentioned card (i.e.
  first appearance in the already-newest-first input); cards inside keep
  mention order. Cards whose board is missing from the store fall into a
  trailing "Unknown board" section.
- **column** — sections keyed by column *title* (exact match), so
  "In progress" from two boards merges into one section. Same section- and
  card-ordering rule as board. Cards whose column is missing fall into a
  trailing "No column" section.
- **due** — fixed bucket order: **Overdue / Today / This week / Later /
  No date / Completed**. Completed cards always land in the trailing
  Completed bucket regardless of date (matches the read-tools rule that a
  completed card is never overdue). Everything else buckets by `due_date`
  using the existing `parseDueDate` (`src/utils/dateUtils.js`): past local midnight boundary = Overdue,
  today = Today, within the next 7 days = This week, beyond = Later, no/
  unparseable date = No date. Empty buckets are omitted. Cards inside a
  bucket keep mention order.

## Rendering

Section headers render as a small muted label row — 12px,
`var(--text-muted)`, count after the name (`Launch · 3`) — above each card
cluster. No boxes or dividers; whitespace only, keeping the rail calm. The
`mentioned` mode renders no headers at all (today's exact output).

## Show-all cap interplay

`VISIBLE_CAP = 6` still applies to the flat mention list **before**
grouping; the `Show all N` button stays at the panel bottom. Grouping never
changes how many cards are visible, only how they're arranged.

## Out of scope

- Sorting options within groups (mention order is the only order).
- Persisting the preference server-side (chatStore localStorage only, like
  the rest of conversation state).
- Grouping anywhere other than the chat card rail.

## Testing

- Vitest `cardRailGroups.test.js`: all four modes; section ordering by most
  recent mention; column-title merging across boards; due-date bucketing
  incl. completed-always-Completed, overdue boundary, empty-bucket
  omission; missing board/column fallbacks; mentioned mode returns a single
  null-label group.
- `CardRail.test.jsx` extended: trigger + menu render; switching mode
  re-sections the list; `mentioned` mode output has no section headers;
  cap + Show all unchanged under grouping.
- chatStore test: `setRailGroupBy` sets the field and it round-trips
  through the persisted state; absent field reads as `'mentioned'`.
