# Workspace color picker (WorkspaceHeader)

**Date:** 2026-05-19
**Branch:** development
**Scope:** `WorkspacePage` only — the sidebar workspace sub-sections are intentionally not in scope.

## Problem

The 64×64 identity tile in `src/components/workspace/WorkspaceHeader.jsx` opens an `IconPicker` that lets the user pick a Phosphor icon name and stores it in `workspaces.icon`. That column has since been overloaded: `resolveWorkspaceColor` in `src/constants/colors.js` reads `workspaces.icon` and returns a hex color when the value matches a known `WORKSPACE_COLORS` entry, otherwise falls back to a deterministic hash of the workspace id.

The picker UI never caught up. A workspace whose `icon` is now `"copper"` is passed straight to `<DynamicIcon name="copper" />`, which is not a valid Phosphor icon — the tile renders the picker's fallback glyph instead of expressing the chosen color.

The fix is to align the picker UI with the data model: replace the icon picker with a color picker, and render the tile as the established workspace glyph (filled `Cube`) tinted with the resolved color.

## Goals

- Click on the 64×64 tile opens a color picker (not an icon picker).
- The tile always renders the filled `Cube` glyph in the workspace's resolved color, including for legacy rows that still hold a Phosphor icon name in `workspace.icon`.
- No schema change, no store change, no migration.
- Match the workspace icon vocabulary documented in `CLAUDE.md` — filled `Cube` is the canonical "a specific real workspace" glyph.

## Non-goals

- Sidebar `SectionHeader` for workspace sub-sections (`Sidebar.jsx` ~line 281) stays text-only. Adding a colored glyph there is a separate change.
- `CreateBoardModal`'s `IconPicker` is untouched. Boards continue to use real Phosphor icons.
- `SettingsPage` profile icon picker is untouched.
- No rename of the overloaded `workspaces.icon` column. The rename would cascade into the store, schema, every RPC, and every legacy row, which is disproportionate to a UI fix. A short comment at each call site pins the overload.
- No migration of legacy rows. They keep their hashed fallback color until the owner picks; the first pick overwrites the legacy value.

## Design

### Tile rendering

In `WorkspaceHeader.jsx`, replace the `workspace.icon ? <DynamicIcon …/> : <Users …/>` ternary with a single `Cube` glyph:

```jsx
import { Cube, Pencil } from '@phosphor-icons/react'
import { resolveWorkspaceColor } from '../../constants/colors'

// inside the 64×64 button:
<Cube
  weight="fill"
  className="w-7 h-7"
  style={{ color: resolveWorkspaceColor(workspace) }}
/>
```

Background (`bg-[var(--surface-raised)]`), border (0.5px default), rounded corners (`rounded-2xl`), owner-only hover (`hover:border-[var(--color-mist)]`), and disabled state for non-owners are unchanged. The `Users` import and the `DynamicIcon` import are no longer needed in this file.

### New picker component

Create `src/components/workspace/WorkspaceColorPicker.jsx`. Shape and prop names mirror `IconPicker` so the call-site swap in `WorkspaceHeader` is a one-line change:

```jsx
<WorkspaceColorPicker
  value={workspace.icon}
  onChange={handleIcon}
  onClose={() => setShowIconPicker(false)}
/>
```

**Props**

- `value: string | null | undefined` — current `workspace.icon` value. Used to mark the selected swatch.
- `onChange(name: string)` — called with the swatch's `name` (e.g. `"copper"`).
- `onClose()` — called on outside click, Escape, or after a swatch is chosen.

**Layout**

- Anchored popover positioned the same way `IconPicker` is (the parent provides the relative wrapper).
- Card surface: `bg-[var(--surface-raised)]`, `border-0.5 border-[var(--border-default)]`, `rounded-xl`, `shadow-md`, padding `p-3`.
- Grid: `grid grid-cols-7 gap-2` rendering all 14 entries from `WORKSPACE_COLORS` in their existing order (saturated row first, wash row second — that order exists precisely for this 7×2 picker layout).
- Each swatch: 24×24 circular button, `style={{ backgroundColor: color.hex }}`, `aria-label={color.name}`, with `title={color.name}` for hover.
- Selected swatch: 1px ink ring via `ring-1 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--surface-raised)]`. "Selected" is `color.name === value`.
- Outside-click and Escape close the popover (use `useClickOutside` hook to match `IconPicker`'s pattern).

**Behavior**

- Clicking a swatch calls `onChange(color.name)` and `onClose()` in that order.
- No search, no recents, no separate confirm button — the swatch grid is small enough that direct selection is fine.

### Call-site change in `WorkspaceHeader.jsx`

Three small edits:

1. Drop the `IconPicker` import and `DynamicIcon` import; add `Cube` to the `@phosphor-icons/react` import; add `resolveWorkspaceColor` import from `../../constants/colors`.
2. Replace the conditional glyph inside the 64×64 button with the colored `Cube`.
3. Replace `<IconPicker … />` with `<WorkspaceColorPicker … />`.

Update `aria-label` on the button to `Change workspace color` (was `Change workspace icon`).

### Backwards compatibility

- Workspaces whose `icon` is a Phosphor name (legacy rows): the tile renders correctly because `resolveWorkspaceColor` falls back to a hashed `WORKSPACE_COLORS` entry. The picker's "selected" indicator is absent in this case (no swatch matches), which is the right signal — the user hasn't explicitly chosen yet.
- Workspaces whose `icon` is `null`: same as above, hashed fallback.
- First explicit pick overwrites whatever legacy string was there.

### Files touched

| File | Change |
|------|--------|
| `src/components/workspace/WorkspaceColorPicker.jsx` | New file (~60 lines). |
| `src/components/workspace/WorkspaceHeader.jsx` | Swap glyph + picker; update aria-label; clean imports. |

### What is NOT touched

- `src/components/board/IconPicker.jsx` — still used by `CreateBoardModal` and `SettingsPage`.
- `src/store/workspacesStore.js` — no changes; the existing `updateWorkspace`/`onIconChange` path is reused.
- `supabase/schema.sql`, migrations, RLS — no changes.
- Tests in `src/__tests__/` — none currently mock `IconPicker` for the workspace page, so nothing to update. If a new test covers the swap, it would live alongside other `workspace/*` specs.

## Open questions

None. The data model already supports colors; this spec is purely UI.

## Verification plan

1. `npm run lint` and `npm run build` clean.
2. Manually: visit `/workspace`, confirm the 64×64 tile shows a filled `Cube` in the workspace's color for (a) a workspace with an explicit color name in `icon`, (b) a workspace with a legacy Phosphor name in `icon`, (c) a workspace with `icon = null`.
3. Click the tile as the owner — color picker popover appears with the current color highlighted (or none, for legacy rows).
4. Pick a different swatch — the tile recolors, the popover closes, refreshing the page persists the new color.
5. Sign in as a non-owner — the tile is non-interactive (existing `disabled` state).
6. Escape and outside-click both close the popover.
