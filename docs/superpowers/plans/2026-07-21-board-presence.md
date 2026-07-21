# Board Presence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show who else is on a board live — avatars in the board header, and a per-card cue (colored ring + avatar + "is here" line) for the card each teammate has open.

**Architecture:** One Supabase Realtime **Presence** channel per board (`presence-board-{boardId}`). Each client `track()`s `{ user_id, name, color, icon, card_id }`; the channel's sync/join/leave events feed a pure `derivePresence()` reducer that a focused `presenceStore` (Zustand) exposes as `members` + `byCard`. Ephemeral — no DB, no persistence. Additive to existing realtime; never touches card data.

**Tech Stack:** React 19, Zustand, Supabase Realtime Presence, Vitest.

## Global Constraints

- Presence is **ephemeral**: no database table, no persistence, no heartbeat/cleanup.
- Presence must **not** write or read card-data state — it is a separate channel and cannot affect the realtime overwrite-guard work.
- Reuse existing tokens + `resolveProfileColor` + `DynamicIcon`; no new color/spacing vocabulary.
- The current user is **always excluded** from "someone else is here" cues (card ring, corner avatar, "is here" line).
- Dedup by `user_id` (multiple tabs from one person = one entry).
- Identity comes from `authStore.profile` = `{ id, display_name, color, icon }`.
- Only join presence for a real board — never for `activeBoardId === '__all__'` or `null`.

## File Structure

- Create `src/store/presence.js` — pure `derivePresence(presenceState)` + selector helpers `othersOf(members, selfId)`, `othersOnCard(byCard, cardId, selfId)`.
- Create `src/store/presenceStore.js` — Zustand store owning the channel lifecycle (`joinBoard`, `setViewingCard`, `leaveBoard`) + `members`/`byCard` state.
- Create `src/components/board/PresenceBar.jsx` — header avatar stack.
- Create `src/__tests__/presence.derive.test.js` — unit tests for the reducer + helpers.
- Modify `src/pages/BoardsPage.jsx` — mount `PresenceBar`; join/leave lifecycle.
- Modify `src/components/board/CardDetailPanel.jsx` — `setViewingCard` on open/close; "is here" line.
- Modify `src/components/board/InlineCardEditor.jsx` — `setViewingCard` on open/close.
- Modify `src/components/board/Card.jsx` — per-card ring + corner avatar cue.

---

### Task 1: Presence reducer + store

**Files:**
- Create: `src/store/presence.js`
- Create: `src/store/presenceStore.js`
- Test: `src/__tests__/presence.derive.test.js`

**Interfaces:**
- Produces: `derivePresence(presenceState) -> { members: Member[], byCard: Record<cardId, Member[]> }`, `othersOf(members, selfId) -> Member[]`, `othersOnCard(byCard, cardId, selfId) -> Member[]` where `Member = { user_id, name, color, icon, card_id: string|null }`.
- Produces: `usePresenceStore` with state `{ members, byCard, boardId }` and actions `joinBoard(boardId, self)`, `setViewingCard(cardId|null)`, `leaveBoard()` where `self = { user_id, name, color, icon }`.

- [ ] **Step 1: Write the failing test** — `src/__tests__/presence.derive.test.js`

```js
import { describe, test, expect } from 'vitest'
import { derivePresence, othersOf, othersOnCard } from '../store/presence'

const m = (user_id, card_id = null) => ({ user_id, name: user_id, color: 'bg-[#C2D64A]', icon: null, card_id })

describe('derivePresence', () => {
  test('flattens presence state into members + byCard', () => {
    const state = { u1: [m('u1', 'c1')], u2: [m('u2', null)] }
    const { members, byCard } = derivePresence(state)
    expect(members.map((x) => x.user_id).sort()).toEqual(['u1', 'u2'])
    expect(byCard.c1.map((x) => x.user_id)).toEqual(['u1'])
    expect(byCard.c2).toBeUndefined()
  })

  test('dedups multiple tabs by user_id, preferring an entry with a card', () => {
    const state = { u1: [m('u1', null), m('u1', 'c9')] }
    const { members, byCard } = derivePresence(state)
    expect(members).toHaveLength(1)
    expect(byCard.c9.map((x) => x.user_id)).toEqual(['u1'])
  })

  test('othersOf / othersOnCard exclude self', () => {
    const { members, byCard } = derivePresence({ me: [m('me', 'c1')], u2: [m('u2', 'c1')] })
    expect(othersOf(members, 'me').map((x) => x.user_id)).toEqual(['u2'])
    expect(othersOnCard(byCard, 'c1', 'me').map((x) => x.user_id)).toEqual(['u2'])
    expect(othersOnCard(byCard, 'c1', 'me').length).toBe(1)
  })

  test('empty state is safe', () => {
    expect(derivePresence({})).toEqual({ members: [], byCard: {} })
    expect(othersOnCard({}, 'nope', 'me')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/presence.derive.test.js`
Expected: FAIL — cannot import from `../store/presence` (module not found).

- [ ] **Step 3: Implement the pure reducer** — `src/store/presence.js`

```js
// Pure presence derivation — no Supabase, no React, fully unit-testable.
// Supabase presenceState() shape: { [presenceKey]: Member[] }.
// Member = { user_id, name, color, icon, card_id: string | null }

export function derivePresence(presenceState) {
  const byUser = new Map()
  for (const entries of Object.values(presenceState || {})) {
    for (const e of entries) {
      const prev = byUser.get(e.user_id)
      // Keep one entry per user; prefer the one that has a card open.
      if (!prev || (!prev.card_id && e.card_id)) byUser.set(e.user_id, e)
    }
  }
  const members = [...byUser.values()]
  const byCard = {}
  for (const mem of members) {
    if (mem.card_id) (byCard[mem.card_id] ||= []).push(mem)
  }
  return { members, byCard }
}

export const othersOf = (members, selfId) =>
  (members || []).filter((mem) => mem.user_id !== selfId)

export const othersOnCard = (byCard, cardId, selfId) =>
  ((byCard && byCard[cardId]) || []).filter((mem) => mem.user_id !== selfId)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/presence.derive.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement the store** — `src/store/presenceStore.js`

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'
import { derivePresence } from './presence'

// Ephemeral per-board presence via Supabase Realtime Presence. Owns the channel
// lifecycle; never persists. `self` = { user_id, name, color, icon }.
export const usePresenceStore = create((set, get) => ({
  members: [],
  byCard: {},
  boardId: null,
  _channel: null,
  _self: null,

  joinBoard: (boardId, self) => {
    if (get().boardId === boardId) return
    get().leaveBoard()
    if (!boardId || boardId === '__all__' || !self?.user_id) return

    const channel = supabase.channel(`presence-board-${boardId}`, {
      config: { presence: { key: self.user_id } },
    })
    const sync = () => set(derivePresence(channel.presenceState()))
    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ ...self, card_id: null }).catch(() => {})
      })

    set({ boardId, _channel: channel, _self: self, members: [], byCard: {} })
  },

  setViewingCard: (cardId) => {
    const { _channel, _self } = get()
    if (_channel && _self) _channel.track({ ..._self, card_id: cardId || null }).catch(() => {})
  },

  leaveBoard: () => {
    const { _channel } = get()
    if (_channel) {
      try { _channel.untrack() } catch (err) { logError('presence untrack failed:', err) }
      supabase.removeChannel(_channel)
    }
    set({ boardId: null, _channel: null, _self: null, members: [], byCard: {} })
  },
}))
```

- [ ] **Step 6: Run the full suite + lint**

Run: `npm run test 2>&1 | grep -E "Tests |Test Files" && npm run lint 2>&1 | tail -1`
Expected: all tests pass (594 total), lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/store/presence.js src/store/presenceStore.js src/__tests__/presence.derive.test.js
git commit -m "feat(presence): presence reducer + ephemeral presenceStore"
```

---

### Task 2: Presence bar in the board header + join/leave lifecycle

**Files:**
- Create: `src/components/board/PresenceBar.jsx`
- Modify: `src/pages/BoardsPage.jsx` (header block ~line 96 + a lifecycle effect)

**Interfaces:**
- Consumes: `usePresenceStore` (`members`, `joinBoard`, `leaveBoard`), `othersOf` from `store/presence`, `useAuthStore` profile.
- Produces: `<PresenceBar />` (no props — reads the store + auth internally).

- [ ] **Step 1: Implement `PresenceBar`** — `src/components/board/PresenceBar.jsx`

```jsx
import { usePresenceStore } from '../../store/presenceStore'
import { othersOf } from '../../store/presence'
import { useAuthStore } from '../../store/authStore'
import { resolveProfileColor } from '../../constants/colors'
import DynamicIcon from './DynamicIcon'
import Tooltip from '../ui/Tooltip'
import { getInitials } from '../../utils/formatting'

function PresenceAvatar({ member }) {
  const { style, fallbackClass } = resolveProfileColor(member.color)
  return (
    <span
      className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-medium -ml-2 first:ml-0 ring-2 ring-[var(--surface-page)] ${member.icon ? fallbackClass : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'}`}
      style={member.icon ? style : undefined}
    >
      {member.icon ? <DynamicIcon name={member.icon} className="w-3.5 h-3.5" /> : getInitials(member.name).toLowerCase()}
    </span>
  )
}

// Live "who's on this board" — the current user is excluded (you know you're here).
export default function PresenceBar() {
  const members = usePresenceStore((s) => s.members)
  const selfId = useAuthStore((s) => s.profile?.id)
  const others = othersOf(members, selfId)
  if (others.length === 0) return null

  const shown = others.slice(0, 4)
  const overflow = others.length - shown.length
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="flex">
        {shown.map((mem) => (
          <Tooltip key={mem.user_id} content={mem.name} placement="bottom">
            <PresenceAvatar member={mem} />
          </Tooltip>
        ))}
        {overflow > 0 && (
          <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-semibold -ml-2 ring-2 ring-[var(--surface-page)] bg-[var(--surface-hover)] text-[var(--text-secondary)]">
            +{overflow}
          </span>
        )}
      </span>
      <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{others.length} here</span>
    </div>
  )
}
```

- [ ] **Step 2: Add the join/leave lifecycle to `BoardsPage.jsx`**

Add imports near the other imports at the top:

```jsx
import PresenceBar from '../components/board/PresenceBar'
import { usePresenceStore } from '../store/presenceStore'
import { useAuthStore } from '../store/authStore'
```

Add this effect alongside the other `useEffect`s (after the existing `activeBoardId` effect, ~line 71). It joins the presence channel for a real active board and leaves on change/unmount:

```jsx
  const profile = useAuthStore((s) => s.profile)
  const joinBoard = usePresenceStore((s) => s.joinBoard)
  const leaveBoard = usePresenceStore((s) => s.leaveBoard)
  useEffect(() => {
    if (!profile?.id || !activeBoardId || activeBoardId === '__all__') { leaveBoard(); return }
    joinBoard(activeBoardId, {
      user_id: profile.id, name: profile.display_name || 'Someone',
      color: profile.color, icon: profile.icon,
    })
    return () => leaveBoard()
  }, [activeBoardId, profile?.id, profile?.display_name, profile?.color, profile?.icon, joinBoard, leaveBoard])
```

- [ ] **Step 3: Render `<PresenceBar />` in the header**

In `BoardsPage.jsx`, the title `<h1>` (~line 96) sits in a header row. Wrap so the bar sits to the right of the title. Change the title's container to a flex row that pushes `PresenceBar` to the end. Locate the block rendering the title (the `activeBoardName` h1) and add `<PresenceBar />` as a sibling after it inside a `flex items-center justify-between gap-3` container (keep the existing title element and classes; only add the flex wrapper + the bar). Example shape:

```jsx
<div className="flex items-center justify-between gap-3">
  <h1 /* ...existing title classes... */>
    {activeBoardId === '__all__' ? 'All tasks' : (activeBoardName || 'Boards')}
  </h1>
  <PresenceBar />
</div>
```

- [ ] **Step 4: Verify build + lint + tests**

Run: `npm run build 2>&1 | tail -1 && npm run lint 2>&1 | tail -1 && npm run test 2>&1 | grep -E "Tests |Test Files"`
Expected: build ✓, lint clean, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/board/PresenceBar.jsx src/pages/BoardsPage.jsx
git commit -m "feat(presence): board-header presence bar + join/leave lifecycle"
```

---

### Task 3: Per-card presence — viewing wiring + card cue

**Files:**
- Modify: `src/components/board/CardDetailPanel.jsx` (viewing effect + "is here" line)
- Modify: `src/components/board/InlineCardEditor.jsx` (viewing effect)
- Modify: `src/components/board/Card.jsx` (ring + corner avatar cue)

**Interfaces:**
- Consumes: `usePresenceStore` (`setViewingCard`, `byCard`), `othersOnCard` from `store/presence`, `useAuthStore` profile id, `resolveProfileColor`.

- [ ] **Step 1: Report which card you're viewing — `CardDetailPanel.jsx`**

Add imports:

```jsx
import { usePresenceStore } from '../../store/presenceStore'
import { othersOnCard } from '../../store/presence'
import { resolveProfileColor } from '../../constants/colors'
```

Inside the component, after the existing hooks, report presence for the open card and read who else is here:

```jsx
  const setViewingCard = usePresenceStore((s) => s.setViewingCard)
  const presenceByCard = usePresenceStore((s) => s.byCard)
  const selfId = useAuthStore((s) => s.profile?.id)
  useEffect(() => {
    setViewingCard(cardId)
    return () => setViewingCard(null)
  }, [cardId, setViewingCard])
  const alsoHere = othersOnCard(presenceByCard, cardId, selfId)
```

Render a quiet "is here" line at the top of the panel body (above the title row). Use the first other member's color:

```jsx
  {alsoHere.length > 0 && (() => {
    const lead = alsoHere[0]
    const { style } = resolveProfileColor(lead.color)
    return (
      <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--text-secondary)]">
        <span className="w-2 h-2 rounded-full" style={style} />
        <span><b className="font-medium text-[var(--text-primary)]">{lead.name}</b>
          {alsoHere.length > 1 ? ` +${alsoHere.length - 1}` : ''} {alsoHere.length > 1 ? 'are' : 'is'} here</span>
      </div>
    )
  })()}
```

Note: `CardDetailPanel` already imports `useAuthStore` and `useEffect`; do not re-import.

- [ ] **Step 2: Report viewing from the inline editor — `InlineCardEditor.jsx`**

Add import:

```jsx
import { usePresenceStore } from '../../store/presenceStore'
```

Inside the component (it already uses `resolvedId` for the real/temp card id and imports `useEffect`), add:

```jsx
  const setViewingCard = usePresenceStore((s) => s.setViewingCard)
  useEffect(() => {
    setViewingCard(resolvedId)
    return () => setViewingCard(null)
  }, [resolvedId, setViewingCard])
```

- [ ] **Step 3: Card cue — `Card.jsx`**

Add imports:

```jsx
import { usePresenceStore } from '../../store/presenceStore'
import { othersOnCard } from '../../store/presence'
import { resolveProfileColor } from '../../constants/colors'
```

`Card.jsx` already reads `profile` via `useAuthStore`. Inside the component compute who else is on this card:

```jsx
  const presenceByCard = usePresenceStore((s) => s.byCard)
  const watchers = othersOnCard(presenceByCard, card.id, profile?.id)
  const watcher = watchers[0]
  const watcherStyle = watcher ? resolveProfileColor(watcher.color).style : null
```

On the card's outermost element, add a colored ring + soft shadow when `watcher` exists. Find the root card `<div>` (the one with `rounded-2xl border`) and append to its `style`/`className`. Add inline style for the ring in the watcher's color:

```jsx
  style={watcher ? { boxShadow: `0 0 0 2px ${watcherStyle?.backgroundColor || 'var(--mist)'}, 0 6px 18px rgba(27,27,24,0.10)`, borderColor: 'transparent' } : undefined}
```

And render a corner avatar (place just inside the card root, before existing content):

```jsx
  {watcher && (
    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium ring-2 ring-[var(--surface-card)]"
      style={watcherStyle}>
      {watcher.name?.[0]?.toLowerCase() || '?'}
    </span>
  )}
```

Ensure the card root is `relative` (add `relative` to its className if not already present) so the corner avatar anchors correctly.

- [ ] **Step 4: Verify build + lint + tests**

Run: `npm run build 2>&1 | tail -1 && npm run lint 2>&1 | tail -1 && npm run test 2>&1 | grep -E "Tests |Test Files"`
Expected: build ✓, lint clean, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/board/CardDetailPanel.jsx src/components/board/InlineCardEditor.jsx src/components/board/Card.jsx
git commit -m "feat(presence): per-card 'who's here' cue + card-viewing wiring"
```

---

### Task 4: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full gate**

Run: `npm run build 2>&1 | tail -1 && npm run lint 2>&1 | tail -1 && npm run test 2>&1 | grep -E "Tests |Test Files"`
Expected: build ✓, lint clean, all tests pass.

- [ ] **Step 2: Manual two-session check**

Open the app in two browser sessions (one normal, one incognito) signed in as two different users, both on the same shared board:
- Each sees the other's avatar in the header within ~1s; the count reads "1 here".
- When user A opens a card, that card lights up in A's color for user B, with A's avatar in the corner and an "A is here" line in the panel.
- When A closes the card, the cue clears; when A closes the tab, the avatar disappears from B's header.
- On a personal/solo board, the bar is hidden and no cards light up.

- [ ] **Step 3: Confirm no card-data regression**

Move/edit/complete cards in both sessions — the existing realtime sync still behaves (presence is a separate channel and must not have affected it).

## Self-Review

**Spec coverage:** who's-on-board (Task 2 ✓), who's-on-card ring+avatar (Task 3 ✓), card-detail "is here" line (Task 3 ✓), ephemeral/no-DB (Task 1 store — no persistence ✓), self-exclusion (`othersOf`/`othersOnCard` ✓), dedup by user_id (Task 1 ✓), lifecycle join/update/leave (Tasks 2–3 ✓), no card-data impact (separate channel; Task 4 verifies ✓), fast-follows excluded (no drag/cursor/workspace code ✓).

**Placeholder scan:** none — every code step shows real code; the only prose-guided edit (Task 2 Step 3 / Task 3 Step 3) points at exact existing elements with example shapes.

**Type consistency:** `Member = { user_id, name, color, icon, card_id }` used consistently; `joinBoard(boardId, self)` with `self = { user_id, name, color, icon }` matches the BoardsPage call; `othersOf`/`othersOnCard`/`derivePresence` signatures identical across tasks.
