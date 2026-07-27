# Card Rail Focus — collapse earlier mentions

**Date:** 2026-07-26
**Status:** Approved
**Origin:** User observation — after asking about board 1 then board 2, board
1's cards still sit in the rail at full weight below board 2's. The rail is a
deliberate conversation-level index (nothing should be lost), but it has no
notion of "current topic" vs "earlier in this chat." This adds that split.

## Behavior

**Exchange boundary.** The "current" set is every card mentioned in the
latest exchange — the last **user** message and all messages after it. If the
conversation has no user message, everything is current. Cards mentioned only
in older messages are "earlier." A card mentioned both now and before counts
as **current only** (no duplicates across the divider).

**Current cards** render exactly as today: full size, the active `railGroupBy`
mode applies, `VISIBLE_CAP` (6) + `Show all N` — both now scoped to the
current set only.

**Earlier cards** sit behind a divider row below the current block: a
full-width button, 12px `var(--text-muted)`, Phosphor caret then the label
`Earlier · N` (`CaretRight` size 12 collapsed, `CaretDown` expanded), hover
color `var(--text-secondary)`. Collapsed by default. Expanding reveals the
earlier cards at full size, grouped by the same active mode as their own
separate section run (current groups on top, divider, then earlier groups).
No cap on the expanded earlier list — the user explicitly opened it.

**Expansion state** is local component state; it resets when the page
unmounts and is not persisted.

**Edge cases.**
- Latest exchange mentions nothing but earlier ones did → the earlier block
  starts expanded (initial state computed on mount; later messages don't
  force it closed/open again).
- No mentions anywhere → the existing empty state, unchanged.
- All mentions are current → no divider renders (today's exact output).

## Implementation shape

New pure helper in `src/lib/chatExchanges.js` (next to `groupExchanges`):

```
splitMentionedIds(messages) -> { currentRaw: string[], earlierRaw: string[] }
```

Raw message-stamped ids (`mentionedCardIds` ∪ legacy `cardIds`), newest
message first within each side, duplicates preserved (CardRail dedupes).
The boundary is the index of the last `role === 'user'` message.

`CardRail` resolves each raw list through the existing pipeline (tempIdMap →
store lookup → dedupe, with the earlier pass also excluding anything already
current), then runs `groupCards` (untouched, from the grouping feature) once
per side. Collapse decides **which** cards are in front; grouping decides
**how** each set is arranged.

## Out of scope

- Persisting the expanded state (per conversation or otherwise).
- Any cap on the expanded earlier list.
- Changing mention detection, grouping logic, or the cap semantics beyond
  scoping them to the current set.

## Testing

- Vitest `chatExchanges.test.js` extended: boundary at last user message;
  replies after it are current; no-user-message → all current; earlier side
  ordered newest-first; empty inputs.
- `CardRail.test.jsx` extended: divider shows `Earlier · N` and is collapsed
  by default; expanding reveals earlier cards; current-only cap (`Show all`
  counts current set); card in both sets renders once, as current; no
  divider when everything is current; auto-expanded when current is empty
  but earlier is not; board grouping composes (current section headers, then
  divider, then earlier section headers).
