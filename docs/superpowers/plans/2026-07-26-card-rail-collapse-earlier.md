# Card Rail Collapse-Earlier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The card rail renders the latest exchange's cards up front and collapses older mentions behind an `Earlier · N` divider.

**Architecture:** A pure helper in `src/lib/chatExchanges.js` splits raw message-stamped card ids at the last user message. `CardRail` resolves each side through its existing dedupe pipeline (current side first, so a card mentioned in both renders once as current), runs the untouched `groupCards` once per side, and renders the earlier side behind a caret toggle.

**Tech Stack:** React 19, existing `groupCards` helper, `@phosphor-icons/react` (CaretRight/CaretDown), Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-26-card-rail-collapse-earlier-design.md`

## Global Constraints

- "Current" = the last `role === 'user'` message and every message after it. No user message → everything is current.
- A card mentioned both now and earlier renders once, as **current**.
- Divider label is exactly `Earlier · {N}` (interpunct `·`), 12px `var(--text-muted)`, hover `var(--text-secondary)`; Phosphor `CaretRight` size 12 collapsed / `CaretDown` size 12 expanded, weight="bold".
- Collapsed by default; starts expanded ONLY when current is empty and earlier is not (decided from mount-time values, not re-decided later). Expansion is local state, not persisted.
- `VISIBLE_CAP = 6` and `Show all N` now scope to the **current** set only. The expanded earlier list has no cap.
- No divider when earlier is empty; existing empty state unchanged when there are no mentions at all.
- Grouping (`railGroupBy`) applies to each side as its own separate `groupCards` run. `groupCards` itself is not modified.
- Rendered group keys must be prefixed per side (`cur-` / `earl-`) — both sides can produce the same group key (e.g. `mentioned`, `board-b1`) and they render as siblings.
- Icons: Phosphor only. Colors: CSS-variable tokens only — no new hex codes.
- Commits use the `feat(chat)` scope.

---

### Task 1: `splitMentionedIds` helper

**Files:**
- Modify: `src/lib/chatExchanges.js` (append one function)
- Test: `src/__tests__/chatExchanges.test.js` (append one describe block; do not touch the existing `groupExchanges` tests)

**Interfaces:**
- Consumes: nothing new.
- Produces: `splitMentionedIds(messages) -> { currentRaw: string[], earlierRaw: string[] }` — raw message-stamped ids (`mentionedCardIds` then legacy `cardIds` per message), newest message first within each side, duplicates preserved. Task 2's CardRail dedupes and resolves them.

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/chatExchanges.test.js` (add `splitMentionedIds` to the existing import from `../lib/chatExchanges`):

```js
describe('splitMentionedIds', () => {
  const mm = (id, role, mentionedCardIds, cardIds) => ({ id, role, text: id, mentionedCardIds, cardIds })

  test('splits at the last user message; both sides newest message first', () => {
    const { currentRaw, earlierRaw } = splitMentionedIds([
      mm('u1', 'user', ['a']),
      mm('a1', 'assistant', ['b']),
      mm('u2', 'user', ['c']),
      mm('a2', 'assistant', ['d']),
    ])
    expect(currentRaw).toEqual(['d', 'c'])
    expect(earlierRaw).toEqual(['b', 'a'])
  })

  test('no user message means everything is current', () => {
    const { currentRaw, earlierRaw } = splitMentionedIds([
      mm('a1', 'assistant', ['x']),
      mm('a2', 'assistant', ['y']),
    ])
    expect(currentRaw).toEqual(['y', 'x'])
    expect(earlierRaw).toEqual([])
  })

  test('merges mentionedCardIds then legacy cardIds per message, keeping duplicates', () => {
    const { currentRaw, earlierRaw } = splitMentionedIds([
      mm('u1', 'user', ['a'], ['b']),
      mm('a1', 'assistant', ['a'], ['c']),
    ])
    expect(currentRaw).toEqual(['a', 'c', 'a', 'b'])
    expect(earlierRaw).toEqual([])
  })

  test('messages without mention fields contribute nothing', () => {
    const { currentRaw, earlierRaw } = splitMentionedIds([
      mm('u1', 'user'),
      mm('a1', 'assistant'),
    ])
    expect(currentRaw).toEqual([])
    expect(earlierRaw).toEqual([])
  })

  test('empty message list', () => {
    expect(splitMentionedIds([])).toEqual({ currentRaw: [], earlierRaw: [] })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- chatExchanges`
Expected: the 3 existing `groupExchanges` tests PASS; the 5 new ones FAIL (`splitMentionedIds` is not exported).

- [ ] **Step 3: Write the implementation**

Append to `src/lib/chatExchanges.js`:

```js
// Splits raw card-id mentions into the latest exchange ("current": the last
// user message and everything after it) vs older messages ("earlier"). Raw =
// message-stamped ids (mentionedCardIds then legacy cardIds), newest message
// first within each side, duplicates preserved — the caller dedupes and
// resolves against the board store. No user message → everything is current.
export function splitMentionedIds(messages) {
  let boundary = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      boundary = i
      break
    }
  }
  const currentRaw = []
  const earlierRaw = []
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const ids = [...(msg.mentionedCardIds || []), ...(msg.cardIds || [])]
    if (i >= boundary) currentRaw.push(...ids)
    else earlierRaw.push(...ids)
  }
  return { currentRaw, earlierRaw }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- chatExchanges`
Expected: PASS (8 tests: 3 existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chatExchanges.js src/__tests__/chatExchanges.test.js
git commit -m "feat(chat): splitMentionedIds exchange-boundary helper"
```

---

### Task 2: CardRail collapse-earlier rendering

**Files:**
- Modify: `src/components/chat/CardRail.jsx` (full rewrite below)
- Test: `src/__tests__/CardRail.test.jsx` (append five tests; the existing eight tests stay untouched and must stay green — every prior test either has one message or no user message, so everything lands in "current" and behavior is unchanged)

**Interfaces:**
- Consumes: `splitMentionedIds(messages)` from Task 1; existing `groupCards(cards, mode, { boards, columns })`.
- Produces: no API change — `CardRail({ messages, groupBy, onGroupByChange })` as before.

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('CardRail', ...)` block in `src/__tests__/CardRail.test.jsx`:

```jsx
  test('earlier mentions collapse behind an Earlier divider by default', () => {
    setCards({
      c1: { id: 'c1', title: 'Old topic', board_id: 'b1' },
      c2: { id: 'c2', title: 'New topic', board_id: 'b1' },
    })
    renderRail([
      { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
      { id: 'm2', role: 'user', text: 'next question', mentionedCardIds: [] },
      { id: 'm3', role: 'assistant', text: '', mentionedCardIds: ['c2'] },
    ])
    expect(screen.getByTestId('rail-card-c2')).toBeInTheDocument()
    expect(screen.queryByTestId('rail-card-c1')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Earlier · 1'))
    expect(screen.getByTestId('rail-card-c1')).toBeInTheDocument()
  })

  test('a card mentioned now and earlier renders once, as current — no divider', () => {
    setCards({ c1: { id: 'c1', title: 'Repeat', board_id: 'b1' } })
    renderRail([
      { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
      { id: 'm2', role: 'user', text: 'again', mentionedCardIds: [] },
      { id: 'm3', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
    ])
    expect(screen.getAllByTestId('rail-card-c1')).toHaveLength(1)
    expect(screen.queryByText(/Earlier ·/)).not.toBeInTheDocument()
  })

  test('cap and Show all scope to the current set only', () => {
    const cards = {}
    const ids = []
    for (let i = 1; i <= 8; i++) {
      cards[`c${i}`] = { id: `c${i}`, title: `Card ${i}`, board_id: 'b1' }
      ids.push(`c${i}`)
    }
    cards.old1 = { id: 'old1', title: 'Old one', board_id: 'b1' }
    cards.old2 = { id: 'old2', title: 'Old two', board_id: 'b1' }
    setCards(cards)
    renderRail([
      { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['old1', 'old2'] },
      { id: 'm2', role: 'user', text: 'now these', mentionedCardIds: [] },
      { id: 'm3', role: 'assistant', text: '', mentionedCardIds: ids },
    ])
    expect(screen.getAllByTestId(/rail-card-/)).toHaveLength(6)
    expect(screen.getByText('Earlier · 2')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Show all 8'))
    expect(screen.getAllByTestId(/rail-card-/)).toHaveLength(8)
  })

  test('earlier starts expanded when the latest exchange mentions nothing', () => {
    setCards({ c1: { id: 'c1', title: 'Only old', board_id: 'b1' } })
    renderRail([
      { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
      { id: 'm2', role: 'user', text: 'unrelated question', mentionedCardIds: [] },
      { id: 'm3', role: 'assistant', text: '', mentionedCardIds: [] },
    ])
    expect(screen.getByText('Earlier · 1')).toBeInTheDocument()
    expect(screen.getByTestId('rail-card-c1')).toBeInTheDocument()
  })

  test('grouping applies to each side separately', () => {
    setCards(
      {
        c1: { id: 'c1', title: 'Old board card', board_id: 'b2' },
        c2: { id: 'c2', title: 'New board card', board_id: 'b1' },
      },
      { b1: { id: 'b1', name: 'Launch' }, b2: { id: 'b2', name: 'Backlog' } },
    )
    renderRail(
      [
        { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
        { id: 'm2', role: 'user', text: 'board 1 now', mentionedCardIds: [] },
        { id: 'm3', role: 'assistant', text: '', mentionedCardIds: ['c2'] },
      ],
      { groupBy: 'board' },
    )
    expect(screen.getByText('Launch · 1')).toBeInTheDocument()
    expect(screen.queryByText('Backlog · 1')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Earlier · 1'))
    expect(screen.getByText('Backlog · 1')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test -- CardRail`
Expected: the eight existing tests PASS; the five new ones FAIL (no divider exists, earlier cards render inline).

- [ ] **Step 3: Rewrite `CardRail.jsx`**

Replace `src/components/chat/CardRail.jsx` with:

```jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { groupCards } from '../../lib/cardRailGroups'
import { splitMentionedIds } from '../../lib/chatExchanges'
import Card from '../board/Card'
import Button from '../ui/Button'
import Menu from '../ui/Menu'

const VISIBLE_CAP = 6

const GROUP_MODES = [
  { value: 'mentioned', label: 'Mentioned' },
  { value: 'board', label: 'Board' },
  { value: 'column', label: 'Column' },
  { value: 'due', label: 'Due date' },
]

// Right-rail panel listing the exact board cards this conversation mentions.
// Derived from per-message `mentionedCardIds` (title-scan resolver) plus the
// legacy `cardIds` field; newest mention first, deduped, deleted cards skipped.
// The latest exchange's cards render up front; older mentions collapse behind
// an "Earlier · N" divider. `groupBy` rearranges each side into labeled
// sections; the cap applies to the current side only.
export default function CardRail({ messages, groupBy = 'mentioned', onGroupByChange }) {
  const navigate = useNavigate()
  const cards = useBoardStore((s) => s.cards)
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const tempIdMap = useBoardStore((s) => s._tempIdMap)
  const [showAll, setShowAll] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const { current, earlier } = useMemo(() => {
    const { currentRaw, earlierRaw } = splitMentionedIds(messages)
    const seen = new Set()
    const resolve = (raws) => {
      const out = []
      for (const raw of raws) {
        const cardId = (tempIdMap && tempIdMap[raw]) || raw
        if (seen.has(cardId)) continue
        seen.add(cardId)
        if (cards[cardId]) out.push(cards[cardId])
      }
      return out
    }
    // Current resolves first so a card mentioned now AND earlier renders
    // once, as current.
    return { current: resolve(currentRaw), earlier: resolve(earlierRaw) }
  }, [messages, cards, tempIdMap])

  // Starts expanded only when the latest exchange holds no cards — otherwise
  // the rail would look empty while holding cards. Mount-time decision;
  // later messages don't flip it (local state, not persisted).
  const [showEarlier, setShowEarlier] = useState(
    () => current.length === 0 && earlier.length > 0,
  )

  // Cap first, then group — and the cap scopes to the current side only.
  const visible = showAll ? current : current.slice(0, VISIBLE_CAP)
  const currentGroups = useMemo(
    () => groupCards(visible, groupBy, { boards, columns }),
    [visible, groupBy, boards, columns],
  )
  const earlierGroups = useMemo(
    () => groupCards(earlier, groupBy, { boards, columns }),
    [earlier, groupBy, boards, columns],
  )

  const activeMode = GROUP_MODES.find((m) => m.value === groupBy) || GROUP_MODES[0]

  const openCard = (card) => {
    setActiveBoard(card.board_id)
    navigate('/boards')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: card.id } }))
    }, 50)
  }

  // Both sides can produce the same group key (e.g. 'mentioned', 'board-b1')
  // and render as siblings — the prefix keeps React keys unique.
  const renderGroups = (groups, keyPrefix) =>
    groups.map((group) => (
      <div key={keyPrefix + group.key} className="flex flex-col gap-3">
        {group.label && (
          <div className="pt-1 text-xs text-[var(--text-muted)]">
            {group.label} · {group.cards.length}
          </div>
        )}
        {group.cards.map((card) => (
          <Card key={card.id} card={card} onClick={() => openCard(card)} />
        ))}
      </div>
    ))

  return (
    <div className="rounded-xl border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between px-[1.375rem] py-4">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Cards</h3>
        <Menu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          placement="bottom-end"
          panel={
            <>
              {GROUP_MODES.map((m) => (
                <Menu.Item
                  key={m.value}
                  selected={m.value === activeMode.value}
                  onSelect={() => {
                    onGroupByChange?.(m.value)
                    setMenuOpen(false)
                  }}
                >
                  {m.label}
                </Menu.Item>
              ))}
            </>
          }
        >
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex cursor-pointer items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            {activeMode.label}
            <CaretDown size={12} weight="bold" />
          </button>
        </Menu>
      </div>
      <div className="h-px w-full bg-[var(--border-subtle)]" />
      <div className="px-[1.375rem] py-4">
        {current.length === 0 && earlier.length === 0 ? (
          <div className="h-40 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
            Cards Claude mentions will show up here.
          </div>
        ) : (
          // Cards render at the board column's true width (290px desktop,
          // Column.jsx), not stretched to the panel width.
          <div className="mx-auto flex w-full max-w-[290px] flex-col gap-3">
            {renderGroups(currentGroups, 'cur-')}
            {current.length > VISIBLE_CAP && !showAll && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                Show all {current.length}
              </Button>
            )}
            {earlier.length > 0 && (
              <button
                type="button"
                onClick={() => setShowEarlier((o) => !o)}
                className="flex cursor-pointer items-center gap-1.5 pt-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                {showEarlier ? (
                  <CaretDown size={12} weight="bold" />
                ) : (
                  <CaretRight size={12} weight="bold" />
                )}
                Earlier · {earlier.length}
              </button>
            )}
            {showEarlier && renderGroups(earlierGroups, 'earl-')}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- CardRail`
Expected: PASS (13 tests: 8 existing + 5 new).

- [ ] **Step 5: Full verification**

Run: `npm run test`
Expected: full suite green.
Run: `npm run lint`
Expected: no new warnings in the touched files.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/CardRail.jsx src/__tests__/CardRail.test.jsx
git commit -m "feat(chat): collapse earlier mentions behind a rail divider"
```
