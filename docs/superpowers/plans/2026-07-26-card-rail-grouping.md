# Card Rail Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-conversation group-by menu (Mentioned / Board / Column / Due date) to the chat page's card rail.

**Architecture:** A pure grouping helper (`src/lib/cardRailGroups.js`) turns the rail's already-derived newest-first card list into labeled sections. `chatStore` persists the chosen mode per conversation (`railGroupBy`). `CardRail` gains a header menu trigger and renders sections; `ChatPage` wires the conversation's mode + setter down as props.

**Tech Stack:** React 19, Zustand (persist middleware), existing `Menu`/`Popover` primitives, `@phosphor-icons/react`, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-26-card-rail-grouping-design.md`

## Global Constraints

- Mode values are exactly `'mentioned' | 'board' | 'column' | 'due'`; absent = `'mentioned'`.
- Menu entries and trigger labels are exactly: Mentioned, Board, Column, Due date.
- Section label format: `{name} · {count}` (interpunct `·`), 12px `var(--text-muted)`. `mentioned` mode renders NO section header (single group with `label: null`).
- `VISIBLE_CAP = 6` applies to the flat mention list BEFORE grouping; `Show all N` stays at the panel bottom.
- Due-date bucket order is fixed: Overdue / Today / This week / Later / No date / Completed. Completed cards ALWAYS land in Completed regardless of date. Empty buckets are omitted. "This week" = due after today and within the next 7 days.
- Date parsing uses the existing `parseDueDate` from `src/utils/dateUtils.js`.
- Column grouping keys on column TITLE (exact match) so same-named columns from different boards merge.
- Missing board → trailing "Unknown board" section; missing column → trailing "No column" section.
- Persistence is per conversation in `chatStore` (already localStorage-persisted via `partialize`); no server-side storage.
- Icons: Phosphor only (`CaretDown`). Colors: CSS-variable tokens only — no new hex codes.
- Card order inside every group = mention order (newest mention first, as the input list already is). Board/Column sections are ordered by first appearance in that list; the fallback section is always last.
- Commits use the `feat(chat)` scope.

---

### Task 1: Grouping helper `cardRailGroups.js`

**Files:**
- Create: `src/lib/cardRailGroups.js`
- Test: `src/__tests__/cardRailGroups.test.js`

**Interfaces:**
- Consumes: `parseDueDate(value) -> Date|null` from `src/utils/dateUtils.js`.
- Produces: `groupCards(mentionedCards, mode, { boards, columns }) -> [{ key: string, label: string|null, cards: Card[] }]` — Task 3's `CardRail` calls this with `mode` = `'mentioned' | 'board' | 'column' | 'due'`, `boards`/`columns` = the boardStore id-keyed maps.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/cardRailGroups.test.js`:

```js
import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'
import { groupCards } from '../lib/cardRailGroups'

const boards = {
  b1: { id: 'b1', name: 'Launch' },
  b2: { id: 'b2', name: 'Backlog' },
}
const columns = {
  col1: { id: 'col1', board_id: 'b1', title: 'In progress' },
  col2: { id: 'col2', board_id: 'b2', title: 'In progress' },
  col3: { id: 'col3', board_id: 'b1', title: 'Done' },
}
const ctx = { boards, columns }

const card = (id, extra = {}) => ({ id, title: id, board_id: 'b1', column_id: 'col1', ...extra })

describe('groupCards — mentioned', () => {
  test('returns a single null-label group with cards in input order', () => {
    const cards = [card('a'), card('b')]
    expect(groupCards(cards, 'mentioned', ctx)).toEqual([
      { key: 'mentioned', label: null, cards },
    ])
  })

  test('unknown mode falls back to mentioned', () => {
    const cards = [card('a')]
    expect(groupCards(cards, 'bogus', ctx)[0].label).toBeNull()
  })
})

describe('groupCards — board', () => {
  test('sections by board, ordered by first appearance, cards keep input order', () => {
    const cards = [
      card('a', { board_id: 'b2' }),
      card('b', { board_id: 'b1' }),
      card('c', { board_id: 'b2' }),
    ]
    const groups = groupCards(cards, 'board', ctx)
    expect(groups.map((g) => g.label)).toEqual(['Backlog', 'Launch'])
    expect(groups[0].cards.map((c) => c.id)).toEqual(['a', 'c'])
    expect(groups[1].cards.map((c) => c.id)).toEqual(['b'])
  })

  test('cards with a missing board fall into a trailing Unknown board section', () => {
    const cards = [card('a', { board_id: 'gone' }), card('b', { board_id: 'b1' })]
    const groups = groupCards(cards, 'board', ctx)
    expect(groups.map((g) => g.label)).toEqual(['Launch', 'Unknown board'])
    expect(groups[1].cards.map((c) => c.id)).toEqual(['a'])
  })
})

describe('groupCards — column', () => {
  test('merges same-titled columns across boards into one section', () => {
    const cards = [
      card('a', { column_id: 'col1' }),
      card('b', { column_id: 'col2', board_id: 'b2' }),
      card('c', { column_id: 'col3' }),
    ]
    const groups = groupCards(cards, 'column', ctx)
    expect(groups.map((g) => g.label)).toEqual(['In progress', 'Done'])
    expect(groups[0].cards.map((c) => c.id)).toEqual(['a', 'b'])
  })

  test('cards with a missing column fall into a trailing No column section', () => {
    const cards = [card('a', { column_id: 'gone' }), card('b')]
    const groups = groupCards(cards, 'column', ctx)
    expect(groups.map((g) => g.label)).toEqual(['In progress', 'No column'])
  })
})

describe('groupCards — due', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    // Local noon, July 15 2026 — buckets are computed against local midnight.
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0))
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  test('buckets in fixed order regardless of mention order', () => {
    const cards = [
      card('later', { due_date: '2026-07-23' }),
      card('none', {}),
      card('doneOld', { due_date: '2026-07-01', completed: true }),
      card('today', { due_date: '2026-07-15' }),
      card('week', { due_date: '2026-07-22' }), // today + 7 → still This week
      card('overdue', { due_date: '2026-07-14' }),
    ]
    const groups = groupCards(cards, 'due', ctx)
    expect(groups.map((g) => g.label)).toEqual([
      'Overdue', 'Today', 'This week', 'Later', 'No date', 'Completed',
    ])
    expect(groups.map((g) => g.cards.map((c) => c.id))).toEqual([
      ['overdue'], ['today'], ['week'], ['later'], ['none'], ['doneOld'],
    ])
  })

  test('completed always wins over date, and empty buckets are omitted', () => {
    const cards = [card('a', { due_date: '2026-07-10', completed: true })]
    const groups = groupCards(cards, 'due', ctx)
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Completed')
  })

  test('cards in the same bucket keep mention order', () => {
    const cards = [
      card('x', { due_date: '2026-07-16' }),
      card('y', { due_date: '2026-07-20' }),
    ]
    const groups = groupCards(cards, 'due', ctx)
    expect(groups[0].label).toBe('This week')
    expect(groups[0].cards.map((c) => c.id)).toEqual(['x', 'y'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- cardRailGroups`
Expected: FAIL — cannot resolve `../lib/cardRailGroups`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/cardRailGroups.js`:

```js
import { parseDueDate } from '../utils/dateUtils'

// Groups the card rail's mentioned-card list for display. The input arrives
// newest-mention-first (CardRail derives it that way); every mode preserves
// that order within a group, and board/column sections are ordered by their
// most recently mentioned card (first appearance in the input).
//
// Returns [{ key, label, cards }]. `label: null` means "render no header"
// (the flat `mentioned` mode).
export function groupCards(mentionedCards, mode, { boards = {}, columns = {} } = {}) {
  if (mode === 'board') {
    return groupBy(
      mentionedCards,
      (card) => {
        const board = boards[card.board_id]
        return board ? { key: `board-${board.id}`, label: board.name } : null
      },
      { fallbackKey: 'board-unknown', fallbackLabel: 'Unknown board' },
    )
  }
  if (mode === 'column') {
    return groupBy(
      mentionedCards,
      (card) => {
        const column = columns[card.column_id]
        // Keyed by title so same-named columns from different boards merge.
        return column ? { key: `col-${column.title}`, label: column.title } : null
      },
      { fallbackKey: 'col-none', fallbackLabel: 'No column' },
    )
  }
  if (mode === 'due') return groupByDue(mentionedCards)
  return [{ key: 'mentioned', label: null, cards: mentionedCards }]
}

function groupBy(cards, resolve, { fallbackKey, fallbackLabel }) {
  const groups = new Map()
  const fallback = { key: fallbackKey, label: fallbackLabel, cards: [] }
  for (const card of cards) {
    const g = resolve(card)
    if (!g) {
      fallback.cards.push(card)
      continue
    }
    if (!groups.has(g.key)) groups.set(g.key, { key: g.key, label: g.label, cards: [] })
    groups.get(g.key).cards.push(card)
  }
  const out = [...groups.values()]
  if (fallback.cards.length) out.push(fallback)
  return out
}

const DUE_BUCKETS = ['overdue', 'today', 'week', 'later', 'none', 'completed']
const DUE_LABELS = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'This week',
  later: 'Later',
  none: 'No date',
  completed: 'Completed',
}

// Completed always wins — mirrors the read-tools rule that a completed card
// is never "overdue". Boundaries are local midnights; "This week" is due
// after today and within the next 7 days.
function dueBucket(card) {
  if (card.completed) return 'completed'
  if (!card.due_date) return 'none'
  const due = parseDueDate(card.due_date)
  if (!due || Number.isNaN(due.getTime())) return 'none'
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8)
  if (due < todayStart) return 'overdue'
  if (due < tomorrowStart) return 'today'
  if (due < weekEnd) return 'week'
  return 'later'
}

function groupByDue(cards) {
  const buckets = Object.fromEntries(DUE_BUCKETS.map((k) => [k, []]))
  for (const card of cards) buckets[dueBucket(card)].push(card)
  return DUE_BUCKETS.filter((k) => buckets[k].length).map((k) => ({
    key: `due-${k}`,
    label: DUE_LABELS[k],
    cards: buckets[k],
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- cardRailGroups`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cardRailGroups.js src/__tests__/cardRailGroups.test.js
git commit -m "feat(chat): pure grouping helper for the card rail"
```

---

### Task 2: chatStore `setRailGroupBy`

**Files:**
- Modify: `src/store/chatStore.js` (add one action; nothing else changes)
- Test: `src/__tests__/chatStoreRailGroupBy.test.js` (new file — do NOT edit the existing chatStore test files)

**Interfaces:**
- Consumes: nothing new.
- Produces: `setRailGroupBy(conversationId: string, mode: string) -> void` on `useChatStore`; conversation objects gain an optional `railGroupBy` field. Task 3's ChatPage reads `conversation?.railGroupBy || 'mentioned'` and calls this action.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStoreRailGroupBy.test.js`:

```js
import { describe, test, expect } from 'vitest'
import { useChatStore } from '../store/chatStore'

describe('setRailGroupBy', () => {
  test('stamps the conversation and survives partialize (persistence)', () => {
    const id = useChatStore.getState().createConversation()
    expect(useChatStore.getState().conversations[id].railGroupBy).toBeUndefined()

    useChatStore.getState().setRailGroupBy(id, 'board')
    expect(useChatStore.getState().conversations[id].railGroupBy).toBe('board')

    // conversations are inside the persisted slice, so the mode round-trips.
    const persisted = useChatStore.persist.getOptions().partialize(useChatStore.getState())
    expect(persisted.conversations[id].railGroupBy).toBe('board')
  })

  test('ignores unknown conversation ids', () => {
    useChatStore.getState().setRailGroupBy('nope', 'due')
    expect(useChatStore.getState().conversations.nope).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- chatStoreRailGroupBy`
Expected: FAIL — `setRailGroupBy is not a function`.

- [ ] **Step 3: Add the action**

In `src/store/chatStore.js`, directly after the `toggleStarred` action (it ends with `}),` around line 197), add:

```js
  // Per-conversation card-rail grouping ('mentioned' | 'board' | 'column' |
  // 'due'). Absent = 'mentioned'. Lives on the conversation so it persists
  // with the rest of the chat state.
  setRailGroupBy: (id, mode) => set((s) => {
    if (!s.conversations[id]) return s
    return {
      conversations: {
        ...s.conversations,
        [id]: { ...s.conversations[id], railGroupBy: mode },
      },
    }
  }),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- chatStoreRailGroupBy`
Expected: PASS (2 tests). Also run `npm run test -- chatStore` to confirm the existing chatStore suites still pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/chatStore.js src/__tests__/chatStoreRailGroupBy.test.js
git commit -m "feat(chat): per-conversation railGroupBy in chatStore"
```

---

### Task 3: CardRail menu + sectioned rendering, ChatPage wiring

**Files:**
- Modify: `src/components/chat/CardRail.jsx` (full rewrite below)
- Modify: `src/pages/ChatPage.jsx` (two small edits)
- Test: `src/__tests__/CardRail.test.jsx` (full replacement below — keeps the three existing tests verbatim and adds five)

**Interfaces:**
- Consumes: `groupCards(cards, mode, { boards, columns })` from Task 1; `setRailGroupBy(id, mode)` from Task 2; existing `Menu` primitive (`open`, `onOpenChange`, `placement`, `panel` props; trigger is its child) and `Menu.Item` (`selected`, `onSelect`).
- Produces: `CardRail` props widen to `{ messages, groupBy = 'mentioned', onGroupByChange }`.

- [ ] **Step 1: Write the failing tests**

Replace `src/__tests__/CardRail.test.jsx` with:

```jsx
import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CardRail from '../components/chat/CardRail'
import { useBoardStore } from '../store/boardStore'

vi.mock('../components/board/Card', () => ({
  default: ({ card, onClick }) => (
    <button data-testid={`rail-card-${card.id}`} onClick={() => onClick(card.id)}>{card.title}</button>
  ),
}))

const renderRail = (messages, props = {}) =>
  render(<MemoryRouter><CardRail messages={messages} {...props} /></MemoryRouter>)

const setCards = (cards, boards = {}, columns = {}) =>
  useBoardStore.setState({ cards, boards, columns, _tempIdMap: {} })

describe('CardRail', () => {
  test('shows the empty state when nothing is mentioned', () => {
    setCards({})
    renderRail([{ id: 'm1', role: 'user', text: 'hi' }])
    expect(screen.getByText('Cards Claude mentions will show up here.')).toBeInTheDocument()
  })

  test('renders mentioned cards newest-first and deduped, skipping deleted ids', () => {
    setCards({
      c1: { id: 'c1', title: 'Alpha', board_id: 'b1' },
      c2: { id: 'c2', title: 'Beta', board_id: 'b1' },
    })
    renderRail([
      { id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] },
      { id: 'm2', role: 'assistant', text: '', mentionedCardIds: ['c2', 'c1', 'gone'] },
    ])
    const buttons = screen.getAllByTestId(/rail-card-/)
    expect(buttons.map((b) => b.textContent)).toEqual(['Beta', 'Alpha'])
  })

  test('caps at 6 with a Show all button that expands', () => {
    const cards = {}
    const ids = []
    for (let i = 1; i <= 8; i++) {
      cards[`c${i}`] = { id: `c${i}`, title: `Card ${i}`, board_id: 'b1' }
      ids.push(`c${i}`)
    }
    setCards(cards)
    renderRail([{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ids }])
    expect(screen.getAllByTestId(/rail-card-/)).toHaveLength(6)
    fireEvent.click(screen.getByText('Show all 8'))
    expect(screen.getAllByTestId(/rail-card-/)).toHaveLength(8)
  })

  test('mentioned mode shows the trigger and no section headers', () => {
    setCards({ c1: { id: 'c1', title: 'Alpha', board_id: 'b1' } })
    renderRail([{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] }])
    expect(screen.getByText('Mentioned')).toBeInTheDocument()
    expect(screen.queryByText(/· \d/)).not.toBeInTheDocument()
  })

  test('board mode sections cards under board-name headers with counts', () => {
    setCards(
      {
        c1: { id: 'c1', title: 'Alpha', board_id: 'b1' },
        c2: { id: 'c2', title: 'Beta', board_id: 'b2' },
        c3: { id: 'c3', title: 'Gamma', board_id: 'b1' },
      },
      { b1: { id: 'b1', name: 'Launch' }, b2: { id: 'b2', name: 'Backlog' } },
    )
    renderRail(
      [{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1', 'c2', 'c3'] }],
      { groupBy: 'board' },
    )
    expect(screen.getByText('Launch · 2')).toBeInTheDocument()
    expect(screen.getByText('Backlog · 1')).toBeInTheDocument()
  })

  test('due mode buckets No date before Completed', () => {
    setCards({
      c1: { id: 'c1', title: 'Open thing', board_id: 'b1' },
      c2: { id: 'c2', title: 'Done thing', board_id: 'b1', completed: true },
    })
    renderRail(
      [{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c2', 'c1'] }],
      { groupBy: 'due' },
    )
    const labels = screen.getAllByText(/· \d/).map((el) => el.textContent)
    expect(labels).toEqual(['No date · 1', 'Completed · 1'])
  })

  test('selecting a menu entry calls onGroupByChange', () => {
    setCards({ c1: { id: 'c1', title: 'Alpha', board_id: 'b1' } })
    const onGroupByChange = vi.fn()
    renderRail(
      [{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ['c1'] }],
      { onGroupByChange },
    )
    fireEvent.click(screen.getByText('Mentioned'))
    fireEvent.click(screen.getByText('Board'))
    expect(onGroupByChange).toHaveBeenCalledWith('board')
  })

  test('the cap applies before grouping', () => {
    const cards = {}
    const ids = []
    for (let i = 1; i <= 8; i++) {
      cards[`c${i}`] = { id: `c${i}`, title: `Card ${i}`, board_id: 'b1' }
      ids.push(`c${i}`)
    }
    setCards(cards, { b1: { id: 'b1', name: 'Launch' } })
    renderRail(
      [{ id: 'm1', role: 'assistant', text: '', mentionedCardIds: ids }],
      { groupBy: 'board' },
    )
    expect(screen.getAllByTestId(/rail-card-/)).toHaveLength(6)
    expect(screen.getByText('Launch · 6')).toBeInTheDocument()
    expect(screen.getByText('Show all 8')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test -- CardRail`
Expected: the three legacy tests PASS, the five new ones FAIL (no trigger, no sections, unknown props ignored).

- [ ] **Step 3: Rewrite `CardRail.jsx`**

Replace `src/components/chat/CardRail.jsx` with:

```jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretDown } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { groupCards } from '../../lib/cardRailGroups'
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
// `groupBy` rearranges the visible cards into labeled sections; the cap and
// mention order are unaffected.
export default function CardRail({ messages, groupBy = 'mentioned', onGroupByChange }) {
  const navigate = useNavigate()
  const cards = useBoardStore((s) => s.cards)
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const tempIdMap = useBoardStore((s) => s._tempIdMap)
  const [showAll, setShowAll] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const mentioned = useMemo(() => {
    const seen = new Set()
    const out = []
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      for (const raw of [...(msg.mentionedCardIds || []), ...(msg.cardIds || [])]) {
        const cardId = (tempIdMap && tempIdMap[raw]) || raw
        if (seen.has(cardId)) continue
        seen.add(cardId)
        if (cards[cardId]) out.push(cards[cardId])
      }
    }
    return out
  }, [messages, cards, tempIdMap])

  // Cap first, then group: grouping only rearranges what's already visible.
  const visible = showAll ? mentioned : mentioned.slice(0, VISIBLE_CAP)
  const groups = useMemo(
    () => groupCards(visible, groupBy, { boards, columns }),
    [visible, groupBy, boards, columns],
  )

  const activeMode = GROUP_MODES.find((m) => m.value === groupBy) || GROUP_MODES[0]

  const openCard = (card) => {
    setActiveBoard(card.board_id)
    navigate('/boards')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: card.id } }))
    }, 50)
  }

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
        {mentioned.length === 0 ? (
          <div className="h-40 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
            Cards Claude mentions will show up here.
          </div>
        ) : (
          // Cards render at the board column's true width (290px desktop,
          // Column.jsx), not stretched to the panel width.
          <div className="mx-auto flex w-full max-w-[290px] flex-col gap-3">
            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-3">
                {group.label && (
                  <div className="pt-1 text-xs text-[var(--text-muted)]">
                    {group.label} · {group.cards.length}
                  </div>
                )}
                {group.cards.map((card) => (
                  <Card key={card.id} card={card} onClick={() => openCard(card)} />
                ))}
              </div>
            ))}
            {mentioned.length > VISIBLE_CAP && !showAll && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                Show all {mentioned.length}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire ChatPage**

In `src/pages/ChatPage.jsx`, two edits:

1. After the line `const deleteConversation = useChatStore((s) => s.deleteConversation)` (line 26), add:

```js
  const setRailGroupBy = useChatStore((s) => s.setRailGroupBy)
```

2. Replace `<CardRail messages={messages} />` (line 205) with:

```jsx
        <CardRail
          messages={messages}
          groupBy={conversation?.railGroupBy || 'mentioned'}
          onGroupByChange={(mode) => setRailGroupBy(id, mode)}
        />
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- CardRail`
Expected: PASS (8 tests).

- [ ] **Step 6: Full verification**

Run: `npm run test`
Expected: full suite green.
Run: `npm run lint`
Expected: no new warnings in the touched files.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/CardRail.jsx src/pages/ChatPage.jsx src/__tests__/CardRail.test.jsx
git commit -m "feat(chat): group-by menu on the card rail"
```
