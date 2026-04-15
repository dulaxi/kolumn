# Card-Editing Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate duplicate card-editing logic between `CardDetailPanel.jsx` (695 LOC) and `InlineCardEditor.jsx` (559 LOC) by extracting shared hooks; delete orphan `CardDetailFields.jsx` (478 LOC).

**Architecture:** Two shared hooks — `useCardEditState(card)` holds edit-form state + initial-value derivation; `useBoardMemberNames(card)` encapsulates the workspace/board member fetch. The component files then consume these hooks and keep only the JSX + component-specific behavior (autosave in Panel, save-on-close in Inline).

**Tech Stack:** React 19, Zustand (boardStore + workspacesStore), Supabase, Vitest for hook tests.

---

## Baseline (before refactor)

- `src/components/board/CardDetailPanel.jsx` — 695 LOC. Owns card state, autosave, board-members fetch, JSX for right-side drawer.
- `src/components/board/InlineCardEditor.jsx` — 559 LOC. Mirrors same state/fetch logic, saves only on Enter/Escape/outside.
- `src/components/board/CardDetailFields.jsx` — 478 LOC. **Unreferenced dead file** (confirmed via `grep -r "CardDetailFields" src/`).

**Test baseline:** `npm test` must end with `222 passed`. `npm run build` must succeed. Both were green on commit `0776aad`.

**Duplicated logic to extract (file:line refs in CardDetailPanel / InlineCardEditor):**

| Logic | Panel | Inline |
|---|---|---|
| Initial assignees (array fallback to `assignee_name`) | 93-96 | 34-37 |
| `useMenuState` usage | 83 | 50-58 |
| Workspace vs. board_member fetch (two-step) | 109-141 | 67-98 |
| Mirror workspacesStore.members into names | 144-148 | 101-105 |

---

## File Structure

**Create:**
- `src/hooks/useCardEditState.js` — state + initial-value derivation for card-edit forms.
- `src/hooks/useBoardMemberNames.js` — resolves assignee picker name list (workspace > board_members > profiles).
- `src/__tests__/hooks.useCardEditState.test.js` — unit tests for hook.
- `src/__tests__/hooks.useBoardMemberNames.test.js` — unit tests for hook (with supabase mock).

**Delete:**
- `src/components/board/CardDetailFields.jsx` (orphan).

**Modify:**
- `src/components/board/CardDetailPanel.jsx` — replace lines 75-148 with hook calls.
- `src/components/board/InlineCardEditor.jsx` — replace lines 33-105 with hook calls.

---

## Task 1: Delete orphan CardDetailFields.jsx

**Files:**
- Delete: `src/components/board/CardDetailFields.jsx`

- [ ] **Step 1: Verify no references**

Run: `grep -r "CardDetailFields" src/`
Expected: only `src/components/board/CardDetailFields.jsx:14:export default function CardDetailFields({` (the file itself).

- [ ] **Step 2: Delete the file**

Run: `rm src/components/board/CardDetailFields.jsx`

- [ ] **Step 3: Run build and tests**

Run: `npm run build && npm test`
Expected: build succeeds; `222 passed`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove orphan CardDetailFields.jsx (478 LOC dead code)"
```

---

## Task 2: Write tests for useCardEditState

**Files:**
- Test: `src/__tests__/hooks.useCardEditState.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, test, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCardEditState } from '../hooks/useCardEditState'

describe('useCardEditState', () => {
  test('returns empty defaults when card is null', () => {
    const { result } = renderHook(() => useCardEditState(null))
    expect(result.current.title).toBe('')
    expect(result.current.description).toBe('')
    expect(result.current.priority).toBe('medium')
    expect(result.current.dueDate).toBe('')
    expect(result.current.labels).toEqual([])
    expect(result.current.assignees).toEqual([])
    expect(result.current.checklist).toEqual([])
  })

  test('hydrates from card fields', () => {
    const card = {
      title: 'Hello',
      description: 'desc',
      priority: 'high',
      due_date: '2026-04-20',
      labels: [{ text: 'bug', color: 'red' }],
      assignees: ['Alice'],
      checklist: [{ text: 'todo', done: false }],
    }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.title).toBe('Hello')
    expect(result.current.description).toBe('desc')
    expect(result.current.priority).toBe('high')
    expect(result.current.dueDate).toBe('2026-04-20')
    expect(result.current.labels).toEqual([{ text: 'bug', color: 'red' }])
    expect(result.current.assignees).toEqual(['Alice'])
    expect(result.current.checklist).toEqual([{ text: 'todo', done: false }])
  })

  test('falls back to assignee_name when assignees array missing', () => {
    const card = { assignee_name: 'Bob' }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.assignees).toEqual(['Bob'])
  })

  test('returns empty assignees when neither field is set', () => {
    const card = {}
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.assignees).toEqual([])
  })

  test('clones labels and checklist arrays (no shared refs)', () => {
    const labels = [{ text: 'l', color: 'blue' }]
    const checklist = [{ text: 'c', done: false }]
    const card = { labels, checklist }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.labels).not.toBe(labels)
    expect(result.current.checklist).not.toBe(checklist)
  })

  test('setters update state', () => {
    const { result } = renderHook(() => useCardEditState({ title: 'a' }))
    act(() => result.current.setTitle('b'))
    expect(result.current.title).toBe('b')
    act(() => result.current.setPriority('low'))
    expect(result.current.priority).toBe('low')
  })

  test('"Untitled task" starts with empty title (new-card placeholder)', () => {
    const card = { title: 'Untitled task' }
    const { result } = renderHook(() => useCardEditState(card, { treatUntitledAsEmpty: true }))
    expect(result.current.title).toBe('')
  })

  test('without treatUntitledAsEmpty, "Untitled task" is preserved', () => {
    const card = { title: 'Untitled task' }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.title).toBe('Untitled task')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- hooks.useCardEditState`
Expected: FAIL — `useCardEditState` doesn't exist.

---

## Task 3: Implement useCardEditState

**Files:**
- Create: `src/hooks/useCardEditState.js`

- [ ] **Step 1: Write the hook**

```javascript
import { useState } from 'react'

export function useCardEditState(card, { treatUntitledAsEmpty = false } = {}) {
  const initialTitle = (() => {
    const t = card?.title || ''
    return treatUntitledAsEmpty && t === 'Untitled task' ? '' : t
  })()

  const initialAssignees = card?.assignees?.length
    ? [...card.assignees]
    : (card?.assignee_name ? [card.assignee_name] : [])

  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(card?.description || '')
  const [priority, setPriority] = useState(card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(card?.due_date || '')
  const [labels, setLabels] = useState(card?.labels ? card.labels.map((l) => ({ ...l })) : [])
  const [assignees, setAssignees] = useState(initialAssignees)
  const [checklist, setChecklist] = useState(
    card?.checklist ? card.checklist.map((item) => ({ ...item })) : []
  )

  return {
    title, setTitle,
    description, setDescription,
    priority, setPriority,
    dueDate, setDueDate,
    labels, setLabels,
    assignees, setAssignees,
    checklist, setChecklist,
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- hooks.useCardEditState`
Expected: 8 passed.

- [ ] **Step 3: Run full suite + build**

Run: `npm run build && npm test`
Expected: build succeeds; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCardEditState.js src/__tests__/hooks.useCardEditState.test.js
git commit -m "refactor(hooks): add useCardEditState for shared card-edit state"
```

---

## Task 4: Wire useCardEditState into CardDetailPanel

**Files:**
- Modify: `src/components/board/CardDetailPanel.jsx:75-96`

- [ ] **Step 1: Add import**

At top of file, add:
```javascript
import { useCardEditState } from '../../hooks/useCardEditState'
```

- [ ] **Step 2: Replace useState block with hook call**

Find lines that currently look like (approx 75-96):
```javascript
  const [title, setTitle] = useState(card?.title || '')
  const [description, setDescription] = useState(card?.description || '')
  const [editingDescription, setEditingDescription] = useState(false)
  const [checklist, setChecklist] = useState(card?.checklist ? card.checklist.map((item) => ({ ...item })) : [])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [priority, setPriority] = useState(card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(card?.due_date || '')
  // Single openMenu value: 'menu' | 'priority' | 'due' | 'assignee' | 'icon' | null
  const [openMenu, setOpenMenu, toggleMenu] = useMenuState()
  const titleRef = useRef(null)
  const [labels, setLabels] = useState(card?.labels ? [...card.labels] : [])
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [editingLabelIdx, setEditingLabelIdx] = useState(null)
  const [editingLabelText, setEditingLabelText] = useState('')
  // Multi-assignee: array of display names. Falls back to legacy single
  // assignee_name for cards not yet migrated / re-saved.
  const initialAssignees = card?.assignees?.length
    ? card.assignees
    : (card?.assignee_name ? [card.assignee_name] : [])
  const [assignees, setAssignees] = useState(initialAssignees)
```

Replace with:
```javascript
  const {
    title, setTitle,
    description, setDescription,
    checklist, setChecklist,
    priority, setPriority,
    dueDate, setDueDate,
    labels, setLabels,
    assignees, setAssignees,
  } = useCardEditState(card)
  const [editingDescription, setEditingDescription] = useState(false)
  const [newCheckItem, setNewCheckItem] = useState('')
  const [openMenu, setOpenMenu, toggleMenu] = useMenuState()
  const titleRef = useRef(null)
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [editingLabelIdx, setEditingLabelIdx] = useState(null)
  const [editingLabelText, setEditingLabelText] = useState('')
  const initialAssignees = card?.assignees?.length
    ? card.assignees
    : (card?.assignee_name ? [card.assignee_name] : [])
```

Note: keep `initialAssignees` definition — it's referenced by `formDataRef` initialization below.

- [ ] **Step 3: Run build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; `222 passed`.

- [ ] **Step 4: Manual smoke test**

Start dev server: `npm run dev`
Click a card → detail panel opens.
- Verify title, description, priority, due date, labels, assignees, checklist all appear.
- Edit title → typing works.
- Toggle priority → color changes on check circle.
- Add/remove a label → renders.
- Close panel.

- [ ] **Step 5: Commit**

```bash
git add src/components/board/CardDetailPanel.jsx
git commit -m "refactor(card): use useCardEditState in CardDetailPanel"
```

---

## Task 5: Wire useCardEditState into InlineCardEditor

**Files:**
- Modify: `src/components/board/InlineCardEditor.jsx:33-42`

- [ ] **Step 1: Add import**

At top of file, add:
```javascript
import { useCardEditState } from '../../hooks/useCardEditState'
```

- [ ] **Step 2: Replace useState block**

Find (approx lines 33-42):
```javascript
  const [title, setTitle] = useState(() => card?.title === 'Untitled task' ? '' : (card?.title || ''))
  const [assignees, setAssignees] = useState(() => {
    if (card?.assignees?.length) return card.assignees
    return card?.assignee_name ? [card.assignee_name] : []
  })
  const [priority, setPriority] = useState(() => card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(() => card?.due_date || '')
  const [labels, setLabels] = useState(() => card?.labels ? [...card.labels] : [])
  const [description, setDescription] = useState(() => card?.description || '')
  const [checklist, setChecklist] = useState(() => card?.checklist ? [...card.checklist] : [])
```

Replace with:
```javascript
  const {
    title, setTitle,
    assignees, setAssignees,
    priority, setPriority,
    dueDate, setDueDate,
    labels, setLabels,
    description, setDescription,
    checklist, setChecklist,
  } = useCardEditState(card, { treatUntitledAsEmpty: true })
```

- [ ] **Step 3: Run build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; `222 passed`.

- [ ] **Step 4: Manual smoke test**

In dev server: create a new card → InlineCardEditor appears with empty title.
- Type a title → save (Enter).
- Click the card again (now existing) → should open CardDetailPanel, not InlineCardEditor.

- [ ] **Step 5: Commit**

```bash
git add src/components/board/InlineCardEditor.jsx
git commit -m "refactor(card): use useCardEditState in InlineCardEditor"
```

---

## Task 6: Write tests for useBoardMemberNames

**Files:**
- Test: `src/__tests__/hooks.useBoardMemberNames.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock stores + supabase before importing the hook
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))
vi.mock('../store/boardStore', () => ({
  useBoardStore: (selector) => selector({
    boards: {
      'board-1': { id: 'board-1', workspace_id: null },
      'board-2': { id: 'board-2', workspace_id: 'ws-1' },
    },
  }),
}))
vi.mock('../store/workspacesStore', () => {
  const state = { members: { 'ws-1': [{ display_name: 'Alice' }, { display_name: 'Bob' }] } }
  return {
    useWorkspacesStore: Object.assign(
      (selector) => selector(state),
      { getState: () => ({ fetchMembers: vi.fn() }) },
    ),
  }
})

import { supabase } from '../lib/supabase'
import { useBoardMemberNames } from '../hooks/useBoardMemberNames'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useBoardMemberNames', () => {
  test('returns empty array when card is null', () => {
    const { result } = renderHook(() => useBoardMemberNames(null))
    expect(result.current).toEqual([])
  })

  test('returns workspace member names for workspace boards', async () => {
    const card = { board_id: 'board-2' }
    const { result } = renderHook(() => useBoardMemberNames(card))
    await waitFor(() => {
      expect(result.current).toEqual(['Alice', 'Bob'])
    })
  })

  test('fetches board_members then profiles for personal boards', async () => {
    const card = { board_id: 'board-1' }
    const membersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ user_id: 'u1' }, { user_id: 'u2' }], error: null }),
    }
    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [{ display_name: 'Carol' }, { display_name: 'Dan' }], error: null }),
    }
    supabase.from.mockImplementation((table) => {
      if (table === 'board_members') return membersChain
      if (table === 'profiles') return profilesChain
    })

    const { result } = renderHook(() => useBoardMemberNames(card))
    await waitFor(() => {
      expect(result.current).toEqual(['Carol', 'Dan'])
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- hooks.useBoardMemberNames`
Expected: FAIL — `useBoardMemberNames` doesn't exist.

---

## Task 7: Implement useBoardMemberNames

**Files:**
- Create: `src/hooks/useBoardMemberNames.js`

- [ ] **Step 1: Write the hook**

```javascript
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBoardStore } from '../store/boardStore'
import { useWorkspacesStore } from '../store/workspacesStore'

export function useBoardMemberNames(card) {
  const [names, setNames] = useState([])
  const board = useBoardStore((s) => (card ? s.boards[card.board_id] : null))
  const workspaceId = board?.workspace_id || null
  const workspaceMembers = useWorkspacesStore((s) => (workspaceId ? s.members[workspaceId] : null))

  useEffect(() => {
    if (!card) return
    let cancelled = false

    if (workspaceId) {
      useWorkspacesStore.getState().fetchMembers(workspaceId)
      return () => { cancelled = true }
    }

    // Personal board: two-step fetch (board_members → profiles)
    ;(async () => {
      const { data: rows, error } = await supabase
        .from('board_members')
        .select('user_id')
        .eq('board_id', card.board_id)
      if (cancelled || error || !rows?.length) {
        if (!cancelled && !error) setNames([])
        return
      }
      const userIds = rows.map((r) => r.user_id)
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)
      if (cancelled || pErr) return
      setNames((profiles || []).map((p) => p.display_name).filter(Boolean))
    })()

    return () => { cancelled = true }
  }, [card?.board_id, workspaceId])

  // Mirror workspacesStore.members into local names array
  useEffect(() => {
    if (!workspaceId) return
    setNames((workspaceMembers || []).map((m) => m.display_name).filter(Boolean))
  }, [workspaceId, workspaceMembers])

  return names
}
```

- [ ] **Step 2: Run hook tests**

Run: `npm test -- hooks.useBoardMemberNames`
Expected: 3 passed.

- [ ] **Step 3: Run full suite + build**

Run: `npm run build && npm test`
Expected: build succeeds; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useBoardMemberNames.js src/__tests__/hooks.useBoardMemberNames.test.js
git commit -m "refactor(hooks): add useBoardMemberNames for assignee picker list"
```

---

## Task 8: Wire useBoardMemberNames into CardDetailPanel

**Files:**
- Modify: `src/components/board/CardDetailPanel.jsx:98-148` (approx)

- [ ] **Step 1: Add import**

```javascript
import { useBoardMemberNames } from '../../hooks/useBoardMemberNames'
```

- [ ] **Step 2: Remove inline board-member effects**

Delete these blocks:
```javascript
  const [boardMemberNames, setBoardMemberNames] = useState([])
  ...
  // Resolve which board this card belongs to, and whether it's scoped to a workspace
  const board = useBoardStore((s) => (card && s.boards ? s.boards[card.board_id] : null))
  const workspaceId = board?.workspace_id || null
  const workspaceMembers = useWorkspacesStore((s) => (workspaceId ? s.members[workspaceId] : null))

  useEffect(() => {
    if (!card) return
    let cancelled = false

    if (workspaceId) {
      useWorkspacesStore.getState().fetchMembers(workspaceId)
    } else {
      ;(async () => {
        const { data: rows, error } = await supabase
          .from('board_members')
          .select('user_id')
          .eq('board_id', card.board_id)
        // ... (full block)
      })()
    }
    fetchAttachments(cardId)
    return () => { cancelled = true }
  }, [cardId, workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    const names = (workspaceMembers || []).map((m) => m.display_name).filter(Boolean)
    setBoardMemberNames(names)
  }, [workspaceId, workspaceMembers])
```

Replace with:
```javascript
  const boardMemberNames = useBoardMemberNames(card)

  useEffect(() => {
    if (card) fetchAttachments(cardId)
  }, [cardId])
```

Note: the `fetchAttachments(cardId)` call was piggy-backed on the member-fetch effect; extract it into its own effect here.

- [ ] **Step 3: Remove now-unused supabase import if no other uses**

Run: `grep -n "supabase" src/components/board/CardDetailPanel.jsx`
If only the top-of-file import remains, remove the line `import { supabase } from '../../lib/supabase'`.

- [ ] **Step 4: Run build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; `222 passed`.

- [ ] **Step 5: Manual smoke test**

In dev: open card on a personal board → assignee picker shows board members.
Open card on a workspace board → assignee picker shows workspace members.

- [ ] **Step 6: Commit**

```bash
git add src/components/board/CardDetailPanel.jsx
git commit -m "refactor(card): use useBoardMemberNames in CardDetailPanel"
```

---

## Task 9: Wire useBoardMemberNames into InlineCardEditor

**Files:**
- Modify: `src/components/board/InlineCardEditor.jsx:46,60-105` (approx)

- [ ] **Step 1: Add import**

```javascript
import { useBoardMemberNames } from '../../hooks/useBoardMemberNames'
```

- [ ] **Step 2: Remove inline board-member effects**

Delete:
- `const [boardMemberNames, setBoardMemberNames] = useState([])`
- The `board`/`workspaceId`/`workspaceMembers` derivations used only for the member list
- Both `useEffect` blocks for board_members fetch + workspace member mirror

Replace with single line:
```javascript
  const boardMemberNames = useBoardMemberNames(card)
```

- [ ] **Step 3: Remove now-unused imports**

Run: `grep -nE "supabase|useWorkspacesStore|useBoardStore" src/components/board/InlineCardEditor.jsx`
Remove any imports that no longer have usages.

- [ ] **Step 4: Run build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; `222 passed`.

- [ ] **Step 5: Manual smoke test**

In dev: create a new card inline.
- Open assignee picker → list appears (matches surrounding board's membership).
- Close inline editor.

- [ ] **Step 6: Commit**

```bash
git add src/components/board/InlineCardEditor.jsx
git commit -m "refactor(card): use useBoardMemberNames in InlineCardEditor"
```

---

## Task 10: Verify and measure

- [ ] **Step 1: Run full verification**

Run: `npm run build && npm test`
Expected: build succeeds; `222 passed`.

- [ ] **Step 2: Line-count delta**

Run:
```bash
wc -l src/components/board/CardDetailPanel.jsx src/components/board/InlineCardEditor.jsx src/hooks/useCardEditState.js src/hooks/useBoardMemberNames.js
```
Expected: `CardDetailPanel.jsx` and `InlineCardEditor.jsx` should each be smaller than baseline (695 / 559); combined decrease ≥ 100 LOC. New hooks combined < 80 LOC.

- [ ] **Step 3: Manual end-to-end smoke test**

Start `npm run dev` and verify:
1. Click existing card → detail panel renders all fields.
2. Edit title, priority, due date, labels, assignees, checklist in panel → autosave persists after 1s.
3. Create new card → inline editor opens, focuses title.
4. Type title + press Enter → card saves, inline editor closes.
5. Assignee picker on personal board shows board members; on workspace board shows workspace members.
6. Menu close-on-outside-click still works; label auto-save in InlineCardEditor still works.

---

## Self-Review (performed before handoff)

**Spec coverage:**
- Dead code removal → Task 1 ✓
- `useCardEditState` hook → Tasks 2, 3 ✓
- `useBoardMemberNames` hook → Tasks 6, 7 ✓
- CardDetailPanel consumes hooks → Tasks 4, 8 ✓
- InlineCardEditor consumes hooks → Tasks 5, 9 ✓
- Verification → Task 10 ✓

**Placeholder scan:** No TBDs, no "add validation", every code step shows the code.

**Type consistency:** Hook return shapes consistent (object destructure with setters). `treatUntitledAsEmpty` option defined in Task 3, used in Task 5. `useBoardMemberNames(card)` signature consistent across Tasks 7, 8, 9.

**Risk acknowledgments:**
- Task 4 keeps `initialAssignees` declaration despite hook returning assignees — needed because `formDataRef` initialization later in the file references it as a local const. Not removing it avoids a ripple-edit that this plan doesn't scope.
- Task 8 extracts `fetchAttachments` into its own effect — this is a minor semantics change (attachments now fetch on `cardId` change only, not on `workspaceId` change). Functionally equivalent since attachments aren't workspace-scoped.
