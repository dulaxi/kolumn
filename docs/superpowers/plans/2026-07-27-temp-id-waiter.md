# Temp-ID Waiter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace toolExecutor's two 200ms×20 polling loops with an event-driven `waitForRealCardId` built on a zustand subscription.

**Architecture:** A standalone helper next to the boardStore subscribes to store changes and resolves the moment `_tempIdMap[tempId]` appears (or `null` on timeout / early-detected insert failure). The two toolExecutor call sites swap their loops for one `await` each; all surrounding semantics stay identical.

**Tech Stack:** Zustand `subscribe`, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-27-temp-id-waiter-design.md`

## Global Constraints

- `waitForRealCardId(tempId, { timeoutMs = 4000 } = {}) -> Promise<string|null>`; never rejects; always unsubscribes and clears its timer on every exit path.
- Early-failure rule: temp card absent from `s.cards` AND unmapped → resolve `null` immediately (addCard's failure path removes the temp card without mapping). Map check runs FIRST (the success swap maps + removes atomically in one `set`).
- Call-site semantics unchanged: create_card still does `aiBuildingCards.add(realId); saveAICard(realId)` only on success; label-sync warnings fire exactly as before when resolution fails; duplicate_card's `newId` fallback to the temp id preserved.
- No changes to boardStore slices or addCard's contract.
- Commit scope `fix(ai)`.

---

### Task 1: `waitForRealCardId` helper

**Files:**
- Create: `src/store/boardStore/waitForRealCardId.js`
- Test: `src/__tests__/waitForRealCardId.test.js`

**Interfaces:**
- Consumes: `useBoardStore` from `src/store/boardStore/index.js` (no cycle — index never imports this helper).
- Produces: `waitForRealCardId(tempId, { timeoutMs } = {})` for Task 2.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/waitForRealCardId.test.js`:

```js
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBoardStore } from '../store/boardStore'
import { waitForRealCardId } from '../store/boardStore/waitForRealCardId'

describe('waitForRealCardId', () => {
  beforeEach(() => {
    useBoardStore.setState({ cards: {}, _tempIdMap: {} })
  })

  test('resolves immediately when the map already has the id', async () => {
    useBoardStore.setState({ _tempIdMap: { 'temp-1': 'real-1' } })
    await expect(waitForRealCardId('temp-1')).resolves.toBe('real-1')
  })

  test('resolves null immediately when the temp card is already gone unmapped', async () => {
    // addCard's failure path removed the optimistic card without mapping it.
    await expect(waitForRealCardId('temp-gone')).resolves.toBeNull()
  })

  test('resolves when the mapping lands later', async () => {
    useBoardStore.setState({ cards: { 'temp-2': { id: 'temp-2' } } })
    const p = waitForRealCardId('temp-2')
    setTimeout(() => {
      useBoardStore.setState({ _tempIdMap: { 'temp-2': 'real-2' } })
    }, 10)
    await expect(p).resolves.toBe('real-2')
  })

  test('the atomic success swap (map + remove in one set) resolves the real id', async () => {
    useBoardStore.setState({ cards: { 'temp-3': { id: 'temp-3' } } })
    const p = waitForRealCardId('temp-3')
    setTimeout(() => {
      useBoardStore.setState({
        cards: { 'real-3': { id: 'real-3' } },
        _tempIdMap: { 'temp-3': 'real-3' },
      })
    }, 10)
    await expect(p).resolves.toBe('real-3')
  })

  test('a failed insert (card removed, never mapped) resolves null before the timeout', async () => {
    useBoardStore.setState({ cards: { 'temp-4': { id: 'temp-4' } } })
    const p = waitForRealCardId('temp-4', { timeoutMs: 60000 })
    const started = Date.now()
    setTimeout(() => {
      useBoardStore.setState({ cards: {} })
    }, 10)
    await expect(p).resolves.toBeNull()
    expect(Date.now() - started).toBeLessThan(5000)
  })

  test('times out to null', async () => {
    vi.useFakeTimers()
    try {
      useBoardStore.setState({ cards: { 'temp-5': { id: 'temp-5' } } })
      const p = waitForRealCardId('temp-5', { timeoutMs: 4000 })
      await vi.advanceTimersByTimeAsync(4000)
      await expect(p).resolves.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- waitForRealCardId`
Expected: FAIL (module doesn't exist).

- [ ] **Step 3: Implement `src/store/boardStore/waitForRealCardId.js`**

```js
import { useBoardStore } from './index'

// Event-driven replacement for the old 200ms polling loop (backlog T1-#5).
// addCard/duplicateCard return an optimistic temp id; the background insert
// later writes _tempIdMap[tempId] = realId in a single set() (which also
// removes the temp card). Failure removes the temp card WITHOUT mapping it —
// so "card gone and unmapped" means the insert failed and waiting is
// pointless. Resolves the real id, or null on failure/timeout. Never rejects.
export function waitForRealCardId(tempId, { timeoutMs = 4000 } = {}) {
  const s = useBoardStore.getState()
  const mapped = s._tempIdMap?.[tempId]
  if (mapped) return Promise.resolve(mapped)
  if (!s.cards?.[tempId]) return Promise.resolve(null)

  return new Promise((resolve) => {
    let timer = null
    const finish = (value, unsub) => {
      clearTimeout(timer)
      unsub()
      resolve(value)
    }
    const unsub = useBoardStore.subscribe((state) => {
      const realId = state._tempIdMap?.[tempId]
      // Map first: the success swap maps + removes the temp card atomically.
      if (realId) return finish(realId, unsub)
      if (!state.cards?.[tempId]) return finish(null, unsub)
    })
    timer = setTimeout(() => finish(null, unsub), timeoutMs)
  })
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- waitForRealCardId`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/boardStore/waitForRealCardId.js src/__tests__/waitForRealCardId.test.js
git commit -m "fix(ai): event-driven waitForRealCardId helper"
```

---

### Task 2: Swap the polling loops in toolExecutor

**Files:**
- Modify: `src/lib/toolExecutor.js` (two sites: create_card ~lines 211-221, duplicate_card ~lines 946-952)
- Test: existing suites are the check — no new tests.

**Interfaces:**
- Consumes: `waitForRealCardId` (Task 1). Add the import near the existing boardStore import: `import { waitForRealCardId } from '../store/boardStore/waitForRealCardId'`.

- [ ] **Step 1: create_card site**

Replace:

```js
    let cardId = tempId
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200))
      const realId = useBoardStore.getState()._tempIdMap[tempId]
      if (realId) {
        aiBuildingCards.add(realId)
        saveAICard(realId)
        cardId = realId
        break
      }
    }
```

with:

```js
    let cardId = tempId
    const realId = await waitForRealCardId(tempId)
    if (realId) {
      aiBuildingCards.add(realId)
      saveAICard(realId)
      cardId = realId
    }
```

- [ ] **Step 2: duplicate_card site**

Replace:

```js
    // Resolve temp ID → real ID (mirrors the create_card pattern)
    let newId = newTempId
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200))
      const realId = useBoardStore.getState()._tempIdMap[newTempId]
      if (realId) { newId = realId; break }
    }
```

with:

```js
    // Resolve temp ID → real ID (mirrors the create_card pattern)
    let newId = newTempId
    const realDupId = await waitForRealCardId(newTempId)
    if (realDupId) newId = realDupId
```

- [ ] **Step 3: Verify no polling remains**

Run: `grep -n "setTimeout(r, 200)" src/lib/toolExecutor.js` — expect no matches.

- [ ] **Step 4: Full verification**

Run: `npm run test` (full suite green — tool-executor suites exercise both call sites; any test that relied on the 200ms polling cadence with fake timers must be examined: fix the interaction, never weaken the assertion), `npm run lint`, `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/toolExecutor.js
git commit -m "fix(ai): replace temp-id polling with event-driven waiter"
```
