# Workspace Color Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the icon picker on `WorkspacePage`'s 64×64 identity tile with a small color picker; render the tile as a filled Cube tinted by the workspace's resolved color.

**Architecture:** New presentational `WorkspaceColorPicker` panel (14-swatch grid, 7×2) mounted inside the existing `Popover` UI primitive. `WorkspaceHeader` swaps the `IconPicker` modal for the popover and swaps the tile glyph from `DynamicIcon`/`Users` to `Cube weight="fill"` tinted by `resolveWorkspaceColor`. No schema or store changes — `workspace.icon` is already the color field; the `onIconChange` callback is reused as-is.

**Tech Stack:** React 19, Vite, Tailwind v4, `@phosphor-icons/react`, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-19-workspace-color-picker-design.md`

---

## File structure

| File | Role |
|------|------|
| `src/components/workspace/WorkspaceColorPicker.jsx` | **New.** Presentational panel — 7×2 grid of swatches, click → onChange(name) + onClose. Mounted as the `panel` of a `Popover`. |
| `src/components/workspace/WorkspaceHeader.jsx` | **Modify.** Swap `DynamicIcon`/`Users` → `Cube`. Swap `IconPicker` (Modal) → `Popover` + `WorkspaceColorPicker`. Update aria-label. Trim unused imports. |
| `src/__tests__/WorkspaceColorPicker.test.jsx` | **New.** Confirms the grid renders 14 swatches, marks the current value as selected, and fires `onChange(name) + onClose()` on click. |

No other files change. `IconPicker.jsx` stays (still used by `CreateBoardModal` and `SettingsPage`).

---

## Task 1: Test for `WorkspaceColorPicker`

**Files:**
- Create: `src/__tests__/WorkspaceColorPicker.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/WorkspaceColorPicker.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WorkspaceColorPicker from '../components/workspace/WorkspaceColorPicker'
import { WORKSPACE_COLORS } from '../constants/colors'

describe('WorkspaceColorPicker', () => {
  it('renders a swatch button for every WORKSPACE_COLORS entry', () => {
    render(<WorkspaceColorPicker value={null} onChange={() => {}} onClose={() => {}} />)
    for (const c of WORKSPACE_COLORS) {
      expect(screen.getByRole('button', { name: c.name })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button').length).toBe(WORKSPACE_COLORS.length)
  })

  it('marks the swatch matching `value` as selected via aria-pressed', () => {
    render(<WorkspaceColorPicker value="copper" onChange={() => {}} onClose={() => {}} />)
    const copper = screen.getByRole('button', { name: 'copper' })
    expect(copper).toHaveAttribute('aria-pressed', 'true')
    const lime = screen.getByRole('button', { name: 'lime' })
    expect(lime).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not mark any swatch selected for a legacy/non-matching value', () => {
    render(<WorkspaceColorPicker value="cube" onChange={() => {}} onClose={() => {}} />)
    for (const c of WORKSPACE_COLORS) {
      expect(screen.getByRole('button', { name: c.name })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('calls onChange with the swatch name then onClose when a swatch is clicked', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()
    render(<WorkspaceColorPicker value={null} onChange={onChange} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'honey' }))
    expect(onChange).toHaveBeenCalledWith('honey')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- WorkspaceColorPicker`

Expected: FAIL — `Failed to resolve import "../components/workspace/WorkspaceColorPicker"`.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/__tests__/WorkspaceColorPicker.test.jsx
git commit -m "test(workspace): add failing tests for WorkspaceColorPicker"
```

---

## Task 2: Implement `WorkspaceColorPicker`

**Files:**
- Create: `src/components/workspace/WorkspaceColorPicker.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/workspace/WorkspaceColorPicker.jsx
import { WORKSPACE_COLORS } from '../../constants/colors'

export default function WorkspaceColorPicker({ value, onChange, onClose }) {
  const handlePick = (name) => {
    onChange(name)
    onClose()
  }

  return (
    <div className="grid grid-cols-7 gap-2 p-1" data-workspace-color-picker>
      {WORKSPACE_COLORS.map((c) => {
        const selected = c.name === value
        return (
          <button
            key={c.name}
            type="button"
            onClick={() => handlePick(c.name)}
            aria-label={c.name}
            aria-pressed={selected}
            title={c.name}
            className={`h-6 w-6 rounded-full transition-shadow ${
              selected
                ? 'ring-1 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--surface-card)]'
                : 'hover:opacity-90'
            }`}
            style={{ backgroundColor: c.hex }}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test -- WorkspaceColorPicker`

Expected: PASS — all 4 tests green.

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/WorkspaceColorPicker.jsx
git commit -m "feat(workspace): add WorkspaceColorPicker swatch grid"
```

---

## Task 3: Wire `WorkspaceColorPicker` into `WorkspaceHeader`

**Files:**
- Modify: `src/components/workspace/WorkspaceHeader.jsx` (full rewrite of the tile + picker block; see code below)

- [ ] **Step 1: Replace `WorkspaceHeader.jsx` contents**

```jsx
// src/components/workspace/WorkspaceHeader.jsx
import { useEffect, useRef, useState } from 'react'
import { Cube, Pencil } from '@phosphor-icons/react'
import Popover from '../ui/Popover'
import WorkspaceColorPicker from './WorkspaceColorPicker'
import { resolveWorkspaceColor } from '../../constants/colors'

export default function WorkspaceHeader({
  workspace,
  isOwner,
  memberCount,
  ownerName,
  onRename,
  onIconChange,
}) {
  // `onIconChange` and `workspace.icon` are misnamed historically — the
  // column now stores a color name (see resolveWorkspaceColor). Kept as-is
  // to avoid a cross-cutting rename through the store + RPCs.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingName) setTimeout(() => inputRef.current?.focus(), 50)
  }, [editingName])

  const startRename = () => {
    setNameDraft(workspace.name)
    setEditingName(true)
  }

  const saveRename = async () => {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== workspace.name) await onRename(trimmed)
    setEditingName(false)
  }

  const handleColor = async (name) => {
    setPickerOpen(false)
    await onIconChange(name)
  }

  const color = resolveWorkspaceColor(workspace)

  return (
    <div className="flex items-start gap-4">
      <Popover
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        placement="bottom-start"
        className="shrink-0"
        panel={
          <WorkspaceColorPicker
            value={workspace.icon}
            onChange={handleColor}
            onClose={() => setPickerOpen(false)}
          />
        }
      >
        <button
          type="button"
          onClick={() => isOwner && setPickerOpen((o) => !o)}
          disabled={!isOwner}
          className={`h-16 w-16 rounded-2xl border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)] flex items-center justify-center transition-colors ${
            isOwner ? 'hover:border-[var(--color-mist)] cursor-pointer' : ''
          }`}
          aria-label={isOwner ? 'Change workspace color' : undefined}
        >
          <Cube weight="fill" className="w-7 h-7" style={{ color }} />
        </button>
      </Popover>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {editingName ? (
            <input
              ref={inputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename()
                if (e.key === 'Escape') setEditingName(false)
              }}
              maxLength={64}
              className="font-heading text-2xl text-[var(--text-primary)] bg-transparent border-b border-[var(--border-default)] focus:outline-none focus:border-[var(--text-muted)] min-w-0 flex-1"
            />
          ) : (
            <>
              <h1 className="font-heading text-2xl text-[var(--text-primary)] truncate">{workspace.name}</h1>
              {isOwner && (
                <button
                  type="button"
                  onClick={startRename}
                  aria-label="Rename workspace"
                  className="h-7 w-7 rounded-md inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {memberCount} member{memberCount !== 1 ? 's' : ''}
          {ownerName ? ` · owned by ${ownerName}` : ''}
        </p>
      </div>
    </div>
  )
}
```

Changes vs prior file:
- Removed: `Users` import, `DynamicIcon` import, `IconPicker` import.
- Added: `Cube` to phosphor imports, `Popover`, `WorkspaceColorPicker`, `resolveWorkspaceColor`.
- Glyph branch (`workspace.icon ? <DynamicIcon …/> : <Users …/>`) → single `<Cube weight="fill" style={{ color }} />`.
- Outer `<div className="relative shrink-0">` → `<Popover className="shrink-0" …>` (Popover already provides `position: relative`).
- `showIconPicker` state → `pickerOpen`; rename `handleIcon` → `handleColor`; aria-label `"Change workspace icon"` → `"Change workspace color"`.

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`

Expected: PASS — no existing test imports `WorkspaceHeader`, and the new `WorkspaceColorPicker` tests still pass.

- [ ] **Step 3: Type/syntax sanity**

Run: `npm run build`

Expected: build completes without errors. (If the build flags any other site that imports `IconPicker` from `WorkspaceHeader`, stop — there shouldn't be any, but investigate before continuing.)

- [ ] **Step 4: Lint**

Run: `npm run lint`

Expected: clean. Likely-flagged-but-shouldn't-be: unused `useRef` (still used for `inputRef`), unused `Pencil` (still used). If lint complains about an unused import that I missed, drop it.

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/WorkspaceHeader.jsx
git commit -m "feat(workspace): swap icon picker for color picker in header tile"
```

---

## Task 4: Manual UI verification

No code changes — verification only. Run through every case before marking the feature done.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Open `http://localhost:5173`, sign in, navigate to `/workspace` for a workspace where you are the owner.

- [ ] **Step 2: Verify the tile renders a colored Cube**

The 64×64 tile should show a **filled** Cube glyph in the workspace's color (not the `Users` fallback, not a misnamed `DynamicIcon` fallback).

If you have access to multiple workspaces, switch between them in the workspace dropdown and confirm each one's tile takes a distinct color (hashed for legacy rows; explicit color name for picked rows).

- [ ] **Step 3: Verify the popover opens**

Click the tile. A small popover with a 7×2 grid of color swatches should appear anchored to the bottom-left of the tile. The currently-resolved color, if it matches a known `WORKSPACE_COLORS` entry, has a 1px ink ring around it. Legacy/hashed workspaces show no selected swatch.

- [ ] **Step 4: Verify selection**

Click a different swatch:
- The popover closes.
- The Cube on the tile recolors immediately.
- Reload the page — the color persists (confirms the value was written to Supabase via `onIconChange`).

- [ ] **Step 5: Verify Escape and outside-click**

Open the picker. Press Escape — closes. Open again. Click anywhere outside the popover — closes.

- [ ] **Step 6: Verify non-owner state**

Sign in as a non-owner member of a shared workspace (or use the dev member-switcher if one exists). The tile should be visually unchanged but non-clickable (`disabled`), and the popover should never open.

- [ ] **Step 7: Sanity-check other surfaces are untouched**

Open `CreateBoardModal` (Plus → New board) and confirm its IconPicker (boards still use real Phosphor icons) still works.

Open `SettingsPage` → profile icon picker still works.

- [ ] **Step 8: Stop the dev server when done.**

---

## Self-review

**Spec coverage:**
- "Tile always renders the filled Cube glyph in the workspace's resolved color" → Task 3 step 1.
- "Click on the 64×64 tile opens a color picker (not an icon picker)" → Task 3 step 1 (Popover + WorkspaceColorPicker).
- "No schema change, no store change, no migration" → no migration/store edits in any task.
- "Match the workspace icon vocabulary" → `Cube weight="fill"` matches `CLAUDE.md`'s typology.
- Backwards-compat for legacy/null `icon` → covered by `resolveWorkspaceColor`'s existing hash fallback (no new code needed); verified manually in Task 4 Step 2.
- New component `src/components/workspace/WorkspaceColorPicker.jsx` → Task 2.
- 7-column × 2-row grid from `WORKSPACE_COLORS` ordering → Task 2 step 1 (`grid grid-cols-7`).
- Selected swatch ring `ring-1 ring-[var(--text-primary)] ring-offset-2 ring-offset-…` → Task 2 step 1 (matches spec; offset color is `--surface-card` because that's the Popover panel surface, not `--surface-raised`).
- Outside-click and Escape close → inherited from `Popover` primitive, called out in Task 4 step 5.
- `aria-label` rename to `"Change workspace color"` → Task 3 step 1.
- "Not touched: `IconPicker.jsx`, store, schema, RLS, other pickers" → verified in Task 4 step 7.

**Placeholder scan:** no TBD / TODO / "add appropriate error handling" / "similar to Task N" patterns.

**Type/name consistency:**
- `value`, `onChange`, `onClose` props are spelled identically in test, component, and consumer.
- Color values are referenced by `c.name` everywhere (`WORKSPACE_COLORS[i].name`, e.g. `'copper'`) — not `c.hex` or `c.value`.
- `onIconChange` callback prop name on `WorkspaceHeader` is unchanged (consumer in `WorkspaceDetailView` still wires it as before — confirmed not in our scope to touch).

One spec/plan delta worth noting: the spec mentioned anchoring the popover via `useClickOutside` directly. The plan instead uses the `Popover` primitive, which already wraps `useClickOutside` and adds Escape handling, focus-blur on close, and exit animation. Strictly better; no semantic change.

---

**Verification commands recap (in order):**

```bash
npm run test -- WorkspaceColorPicker   # Task 1 step 2 (fail), Task 2 step 2 (pass)
npm run test                           # Task 3 step 2
npm run build                          # Task 3 step 3
npm run lint                           # Task 3 step 4
npm run dev                            # Task 4
```
