# boardStore → Zustand slices

> Refactor executed 2026-07-20. Pure relocation — no behavior change; the
> public API (`useBoardStore` from `../store/boardStore`) is unchanged.

## Why

`boardStore.js` had grown to ~1,780 lines owning boards, columns, cards,
labels, comments, activity, attachments, recurring-task spawning, and all the
realtime channel wiring in a single closure — hard to test, reason about, or
change safely (flagged in the 2026-07-20 architecture audit).

## Pattern

The canonical Zustand **slices pattern**: one store instance composed from
domain slice-creators, each `(set, get) => ({ ...state, ...actions })`,
combined in a single `create()` call. Every slice receives the *same*
`set`/`get`, so cross-slice access (e.g. the cards slice reading
`get().labels` or `get().activeBoardId`) keeps working exactly as before. The
directory `boardStore/` with an `index.js` means `../store/boardStore` still
resolves — **zero consumer changes**.

## Structure

```
src/store/boardStore/
  index.js            create() composing the 7 slices + resetStore
  helpers.js          shared: ACTIVE_BOARD_KEY, _inFlightCards, mergeCardEcho,
                      pruneTempIdMap, undoableDelete, logActivity
  slices/
    boardsSlice.js      boards/activeBoard/loading/error + fetch/scope loaders + board CRUD + getters
    columnsSlice.js     columns + column CRUD + getColumnCards
    cardsSlice.js       cards CRUD + move/drag + complete/archive + duplicate + recurring + getters
    labelsSlice.js      labels + card_labels + label CRUD/merge/archive
    commentsSlice.js    comments + activity
    attachmentsSlice.js attachments
    realtimeSlice.js    subscriptions + subscribeToBoards/unsubscribeAll + reconnect
```

## Load-bearing details

- **`_inFlightCards`** is a single shared Set in `helpers.js` — the cards slice
  adds/removes during a write, the realtime slice reads it via `mergeCardEcho`
  to skip echoes of in-flight edits. Must not be duplicated per slice.
- **`scheduleReconnect`** moved into `realtimeSlice`, closing over `get()`
  instead of reaching for `useBoardStore.getState()`.
- **`fetchBoards`** stays in `boardsSlice` as the bootstrap loader; it writes
  columns/cards/labels state too (fine — `set` is global).
- **Rate limiters** are colocated in their owning slice's module scope.
- **`resetStore`** lives in `index.js` since it resets every slice's state.

## Invariant checks (post-refactor)

- `npm run build` / `npm run lint` / `npm run test` (593) all green.
- No consumer file changed; `useBoardStore.getState().*` API identical.
