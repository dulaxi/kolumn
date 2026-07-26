# Chat Data Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the six audited AI-visibility gaps: archived-card leakage everywhere, label search/results, assignees in results, checklist progress, description snippets, and per-card label/assignee markers in the prompt snapshot.

**Architecture:** Client: `toolExecutor.js`'s two read tools filter `card.archived`, match/return label texts (from `store.cardLabels` Sets + `store.labels`, skipping archived labels), and return assignees/checklist-counts/description-snippet with only-when-present semantics. Server: `context.ts` filters archived cards before every consumer, fetches `card_labels`, and appends compact `/label @Assignee` markers to snapshot card lines (shared with the pill deliberately); `tools.ts` descriptions updated. Redeploy as v49.

**Tech Stack:** React/Zustand/Vitest client; Deno/TS edge function.

**Spec:** `docs/superpowers/specs/2026-07-26-chat-data-completeness-design.md`

## Global Constraints

- Archived cards excluded unconditionally from ALL AI read paths — no `include_archived` param.
- Label match ranks tier-1 (with title matches); description/assignee stay tier-2; `updated_at` desc tiebreak unchanged.
- Only-when-present result semantics: `checklist: { done, total }` key ONLY when the card has checklist items; `description` key ONLY when non-empty (trimmed, first 160 chars). `labels`/`assignees` always present as arrays (possibly empty).
- `store.cardLabels[cardId]` is a **Set** of label ids; `store.labels[id]` has `{ text, color, archived_at }` — skip labels with `archived_at`.
- Marker format in snapshot lines, exactly: `${due}` then ` /text` per label then ` @Name` per assignee (only when present). Example: `"Fix header" due 2026-07-30 /atoms @Sam`.
- No new tools, no cap changes (search 20 / summarize 15), no pill-file changes (`pillAgentLoop.js`, `QuickAddBar.jsx` byte-identical — the shared `context.ts` snapshot change is the one intentional cross-surface effect).
- Do NOT deploy until Task 3 (expect v49).
- Commits: `feat(chat):` client, `feat(ai):` server. End messages with the repo's Claude co-author line.
- Verification: `npm run test`, `npm run lint`, `npm run build`, `~/.deno/bin/deno check supabase/functions/chat/index.ts` (restore `deno.lock` if touched).

---

### Task 1: Executor — archived filter, labels, richer results

**Files:**
- Modify: `src/lib/toolExecutor.js` (the `search_cards` and `summarize_board` branches; one new module-level helper)
- Test: `src/__tests__/chatReadTools.test.js` (extend)

**Interfaces:**
- Consumes: existing `store` binding (`useBoardStore.getState()`), `findBoardByName`, `parseDueDate`.
- Produces: search result cards `{ id, title, board, column, priority, due_date, completed, task_number, labels: string[], assignees: string[], checklist?: {done,total}, description?: string }`; summarize per-card `{ id, title, priority, due_date, completed, labels, assignees, checklist? }`. New helper `getCardLabelTexts(store, cardId) -> string[]`.

- [ ] **Step 1: Extend the tests**

In `src/__tests__/chatReadTools.test.js`, update the seed: give `c1` a checklist and description, add labels/cardLabels and an archived card. Replace the `beforeEach` seed block's `cards` and add `labels`/`cardLabels`:

```js
    cards: {
      c1: card('c1', 'b1', 'col1', { title: 'Landing page redesign', priority: 'high', due_date: '2020-01-01', description: 'Rework the hero section and pricing table for the launch.', checklist: [{ id: 'i1', text: 'a', done: true }, { id: 'i2', text: 'b', done: false }] }),
      c2: card('c2', 'b1', 'col1', { title: 'Write launch tweet', description: 'mention the landing page', updated_at: '2026-07-24T00:00:00Z' }),
      c3: card('c3', 'b1', 'col2', { title: 'Old landing copy', completed: true }),
      c4: card('c4', 'b2', 'col3', { title: 'Landing A/B test', assignees: ['Sam'], updated_at: '2026-07-23T00:00:00Z' }),
      c5: card('c5', 'b1', 'col1', { title: 'Design atom grid', updated_at: '2026-07-22T00:00:00Z' }),
      c6: card('c6', 'b1', 'col1', { title: 'Archived landing card', archived: true }),
    },
    labels: {
      l1: { id: 'l1', board_id: 'b1', text: 'atoms', color: 'blue', archived_at: null },
      l2: { id: 'l2', board_id: 'b1', text: 'ghost', color: 'red', archived_at: '2026-07-01T00:00:00Z' },
    },
    cardLabels: {
      c5: new Set(['l1']),
      c2: new Set(['l2']),
    },
```

Append these tests inside the existing describes (and update any existing assertion counts the new seed breaks — the 'landing' searches must now also NOT include c6):

```js
  test('matches label text at tier 1', async () => {
    const r = await executeTool('search_cards', { query: 'atoms' })
    expect(r.cards.map((c) => c.id)).toEqual(['c5'])
    expect(r.cards[0].labels).toEqual(['atoms'])
  })

  test('label match ranks tier-1, above a description-only match', async () => {
    useBoardStore.setState({
      cards: {
        ...useBoardStore.getState().cards,
        c8: card('c8', 'b1', 'col1', { title: 'Unrelated title', description: 'atoms mentioned here', updated_at: '2026-07-25T00:00:00Z' }),
      },
    })
    const r = await executeTool('search_cards', { query: 'atoms' })
    // c5 carries the /atoms LABEL (tier 1) and must outrank c8's newer
    // description-only hit (tier 2).
    expect(r.cards.map((c) => c.id)).toEqual(['c5', 'c8'])
  })

  test('archived labels never match', async () => {
    const r = await executeTool('search_cards', { query: 'ghost' })
    expect(r.cards).toEqual([])
  })

  test('archived cards excluded from search', async () => {
    const r = await executeTool('search_cards', { query: 'archived landing' })
    expect(r.cards).toEqual([])
    const broad = await executeTool('search_cards', { query: 'landing' })
    expect(broad.cards.map((c) => c.id)).not.toContain('c6')
  })

  test('result fields: assignees always, checklist/description only when present', async () => {
    const r = await executeTool('search_cards', { query: 'landing page redesign' })
    const hit = r.cards[0]
    expect(hit.assignees).toEqual([])
    expect(hit.checklist).toEqual({ done: 1, total: 2 })
    expect(hit.description).toBe('Rework the hero section and pricing table for the launch.')
    const tweet = (await executeTool('search_cards', { query: 'launch tweet' })).cards[0]
    expect(tweet.checklist).toBeUndefined()
    const sam = (await executeTool('search_cards', { query: 'sam' })).cards[0]
    expect(sam.assignees).toEqual(['Sam'])
    expect(sam.description).toBeUndefined()
  })

  test('description snippet truncates at 160 chars', async () => {
    useBoardStore.setState({
      cards: { ...useBoardStore.getState().cards, c7: card('c7', 'b1', 'col1', { title: 'Long desc card', description: 'x'.repeat(300) }) },
    })
    const r = await executeTool('search_cards', { query: 'long desc' })
    expect(r.cards[0].description).toHaveLength(160)
  })
```

And in the `summarize_board` describe:

```js
  test('excludes archived cards from columns and totals', async () => {
    const r = await executeTool('summarize_board', { board: 'Launch' })
    const allIds = r.columns.flatMap((c) => c.cards.map((x) => x.id))
    expect(allIds).not.toContain('c6')
    expect(r.totals.cards).toBe(allIds.length)
  })

  test('per-card labels/assignees/checklist in summaries', async () => {
    const r = await executeTool('summarize_board', { board: 'Launch' })
    const c5row = r.columns.flatMap((c) => c.cards).find((x) => x.id === 'c5')
    expect(c5row.labels).toEqual(['atoms'])
    const c1row = r.columns.flatMap((c) => c.cards).find((x) => x.id === 'c1')
    expect(c1row.checklist).toEqual({ done: 1, total: 2 })
    expect(c1row.assignees).toEqual([])
  })
```

Also update the pre-existing `summarize_board` totals test — the seed now has c5 (open, col1) and c6 (archived): `To do` count becomes 3 (c1, c2, c5), totals `{ cards: 4, completed: 1, overdue: 1 }`. Update the pre-existing `columns[0].count` expectations in the per-column-cap test accordingly (base cards in col1 are now c1, c2, c5 → 3 + 18 seeded = 21, capped at 15, truncated true). Update the ranking test's expected order if needed (c5 'Design atom grid' does not contain 'landing', so `['c4','c1','c2']` stands).

- [ ] **Step 2: Run to verify failures**

Run: `npx vitest run src/__tests__/chatReadTools.test.js`
Expected: new tests FAIL (no labels field, archived cards included); some pre-existing tests fail on the changed seed until Step 3 lands.

- [ ] **Step 3: Implement**

In `src/lib/toolExecutor.js`, add near `findBoardByName`:

```js
// Label texts for a card from the two label maps. `cardLabels` values are
// Sets of label ids; archived labels are invisible to the AI surface.
function getCardLabelTexts(store, cardId) {
  const ids = store.cardLabels?.[cardId]
  if (!ids || ids.size === 0) return []
  const out = []
  for (const id of ids) {
    const l = store.labels?.[id]
    if (l && !l.archived_at) out.push(l.text)
  }
  return out
}
```

Replace the `search_cards` match loop and result mapping with:

```js
    const matches = []
    for (const card of Object.values(store.cards)) {
      if (card.archived) continue
      if (boardFilter && card.board_id !== boardFilter.id) continue
      if (card.completed && !params.include_completed) continue
      const labels = getCardLabelTexts(store, card.id)
      // Tier 1: title or label (a label query is exact intent, not an
      // incidental text hit). Tier 2: description / assignee names.
      const primary = (card.title || '').toLowerCase().includes(query)
        || labels.some((t) => t.toLowerCase().includes(query))
      const secondary = (card.description || '').toLowerCase().includes(query)
        || (card.assignees || []).join(' ').toLowerCase().includes(query)
      if (!primary && !secondary) continue
      matches.push({ card, labels, primary })
    }
    matches.sort((a, b) =>
      (b.primary === true) - (a.primary === true)
      || String(b.card.updated_at || '').localeCompare(String(a.card.updated_at || ''))
    )
    const cards = matches.slice(0, 20).map(({ card, labels }) => ({
      id: card.id,
      title: card.title,
      board: store.boards[card.board_id]?.name || null,
      column: store.columns[card.column_id]?.title || null,
      priority: card.priority || null,
      due_date: card.due_date || null,
      completed: !!card.completed,
      task_number: card.task_number ?? null,
      labels,
      assignees: card.assignees || [],
      ...(Array.isArray(card.checklist) && card.checklist.length > 0
        ? { checklist: { done: card.checklist.filter((i) => i.done).length, total: card.checklist.length } }
        : {}),
      ...((card.description || '').trim()
        ? { description: card.description.trim().slice(0, 160) }
        : {}),
    }))
    return { ok: true, count: cards.length, total: matches.length, cards }
```

In `summarize_board`: change the boardCards filter to exclude archived —

```js
    const boardCards = Object.values(store.cards).filter((c) => c.board_id === board.id && !c.archived)
```

— and extend the per-card mapping:

```js
        cards: colCards.slice(0, PER_COLUMN_CAP).map((c) => ({
          id: c.id,
          title: c.title,
          priority: c.priority || null,
          due_date: c.due_date || null,
          completed: !!c.completed,
          labels: getCardLabelTexts(store, c.id),
          assignees: c.assignees || [],
          ...(Array.isArray(c.checklist) && c.checklist.length > 0
            ? { checklist: { done: c.checklist.filter((i) => i.done).length, total: c.checklist.length } }
            : {}),
        })),
```

- [ ] **Step 4: Run to verify green**

Run: `npx vitest run src/__tests__/chatReadTools.test.js src/__tests__/chatAgentLoop.test.js src/__tests__/CardRail.test.jsx`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/toolExecutor.js src/__tests__/chatReadTools.test.js
git commit -m "feat(chat): read tools see labels, assignees, checklists; archived cards excluded"
```

---

### Task 2: Server — snapshot markers, archived filter, tool descriptions

**Files:**
- Modify: `supabase/functions/chat/context.ts`
- Modify: `supabase/functions/chat/tools.ts` (two description strings only)

**Interfaces:**
- Consumes: existing parallel fetch (`cards` selected with `*`, so `archived`/`assignees` are present), `allLabels` (already fetched, already excludes archived labels via `.is("archived_at", null)`).
- Produces: prompt board-snapshot lines with `/label @Assignee` markers; archived cards absent from snapshot, alerts, and activity counts.

- [ ] **Step 1: context.ts — filter archived at the source**

Change the `allCards` derivation:

```ts
  // Archived cards are invisible to the AI surface — filtered here so every
  // consumer below (snapshot, alerts, activity counts) inherits it.
  const allCards = (cardsRes.data || []).filter((c: any) => !c.archived)
```

- [ ] **Step 2: context.ts — card_labels fetch + marker helper**

Immediately after the `allLabels` fetch block, add:

```ts
  // cardId → label texts, for the snapshot's inline /label markers.
  const cardLabelTexts = new Map<string, string[]>()
  if (allCards.length > 0 && allLabels.length > 0) {
    const { data: clRows } = await supabase
      .from("card_labels")
      .select("card_id, label_id")
      .in("card_id", allCards.map((c: any) => c.id))
    const labelById = new Map(allLabels.map((l) => [l.id, l.text]))
    for (const row of (clRows || [])) {
      const text = labelById.get((row as any).label_id)
      if (!text) continue
      const list = cardLabelTexts.get((row as any).card_id) || []
      list.push(text)
      cardLabelTexts.set((row as any).card_id, list)
    }
  }

  // Compact only-when-present markers: " /label" per label, " @Name" per
  // assignee. Most cards have neither, so the snapshot stays cheap.
  const cardMarkers = (c: any) => {
    const labels = (cardLabelTexts.get(c.id) || []).map((t) => ` /${t}`).join("")
    const assignees = (c.assignees || []).map((a: string) => ` @${a}`).join("")
    return `${labels}${assignees}`
  }
```

- [ ] **Step 3: context.ts — markers on the snapshot lines**

In `boardSummary`, change the two title-line builders:

```ts
      const openTitles = openCards.slice(0, 10).map((c: any) => {
        const due = c.due_date ? ` due ${String(c.due_date).slice(0, 10)}` : ""
        return `"${c.title}"${due}${cardMarkers(c)}`
      })
```

```ts
      const doneTitles = doneCards.slice(0, 5).map((c: any) => {
        const due = c.due_date ? ` due ${String(c.due_date).slice(0, 10)}` : ""
        return `"${c.title}"${due}${cardMarkers(c)} ✓done`
      })
```

- [ ] **Step 4: tools.ts — description updates**

`search_cards` description becomes:

```
Read-only: search the user's cards across all their boards by text. Matches card titles, descriptions, assignee names, and label text. Archived cards are never returned. Returns matching cards with their ids, board, column, priority, due date, labels, assignees, and checklist progress. Never modifies anything.
```

`summarize_board` description becomes:

```
Read-only: get a structured snapshot of one board — its columns in order, the cards in each (with labels, assignees, and checklist progress), and totals (cards, completed, overdue). Archived cards are excluded. Never modifies anything.
```

- [ ] **Step 5: Verify + commit (do NOT deploy)**

Run: `~/.deno/bin/deno check supabase/functions/chat/index.ts && (cd supabase/functions/chat && ~/.deno/bin/deno test tier.test.ts)`; restore `deno.lock` if touched.
Expected: clean; 5/5 tier tests.

```bash
git add supabase/functions/chat/context.ts supabase/functions/chat/tools.ts
git commit -m "feat(ai): snapshot label/assignee markers; archived cards invisible to the AI"
```

---

### Task 3: Deploy + live verify (controller)

- [ ] **Step 1:** `npm run test && npm run lint && npm run build` — all green.
- [ ] **Step 2:** Deploy via MCP (same five files; expect **v49**).
- [ ] **Step 3:** Live: ask "what tasks are labelled atoms?" — both /atoms cards found, named, in the rail. Archive a card, confirm it stops appearing in searches/summaries/snapshot answers. Check the pill still behaves (its prompt now carries markers).
