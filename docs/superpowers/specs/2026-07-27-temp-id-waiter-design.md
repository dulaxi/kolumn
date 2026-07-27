# Temp-ID Waiter — event-driven card-id resolution

**Date:** 2026-07-27
**Status:** Approved (autonomous run; user delegated design decisions)
**Origin:** Backlog T1-#5. `toolExecutor` busy-polls `_tempIdMap` (200ms × 20 =
4s cap) in two places (create_card, duplicate_card) waiting for the optimistic
temp card id to resolve to the real DB id. The store already announces that
moment — `addCard`'s background insert writes `_tempIdMap[tempId] = realId`
in a `set()` — so a zustand subscription is the event source (it also covers
any future realtime-driven swap for free).

## New unit — `src/store/boardStore/waitForRealCardId.js`

```
waitForRealCardId(tempId, { timeoutMs = 4000 } = {}) -> Promise<string|null>
```

- Immediate paths (no subscription): map already has the id → resolve it;
  temp card absent AND unmapped → resolve `null` (the insert already failed —
  `addCard`'s failure path removes the temp card without ever mapping it).
- Otherwise subscribe to `useBoardStore`; on every state change:
  - `_tempIdMap[tempId]` present → unsubscribe, clear timer, resolve realId.
    (The swap writes the mapping and removes the temp card in one atomic
    `set`, so the map check runs first.)
  - temp card gone AND still unmapped → resolve `null` early (failed insert —
    the old polling waited the full 4s here).
- Timeout (default 4000ms — same worst-case as today; best case drops from
  ~200ms quantized to ~0) → unsubscribe, resolve `null`.
- Always unsubscribes and clears the timer on every exit path. Never rejects.

## Call-site changes — `src/lib/toolExecutor.js`

Both polling loops are replaced; surrounding semantics unchanged (label-sync
warnings still fire when resolution fails, `aiBuildingCards` bookkeeping
identical):

- **create_card**: `const realId = await waitForRealCardId(tempId)`; on
  truthy → `aiBuildingCards.add(realId); saveAICard(realId); cardId = realId`.
- **duplicate_card**: `const realDupId = await waitForRealCardId(newTempId)`;
  on truthy → `newId = realDupId`.

## Out of scope

Changing `addCard`'s optimistic contract; touching realtime subscriptions;
the write-resolver archived filtering (T3-#14 owns it).

## Testing

- `waitForRealCardId.test.js`: immediate hit; late hit via `setState` (real
  timers, ~10ms); timeout → null (fake timers); early-failure detection
  (remove temp card without mapping → null before timeout); atomic-swap case
  (one `setState` that maps AND removes the temp card resolves the real id,
  not null).
- Full suite green — existing create/duplicate tool tests exercise the call
  sites end-to-end.
