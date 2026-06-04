# "Personal" Default Workspace — Design Spec

**Date:** 2026-05-18
**Branch:** `development`
**Status:** approved (design); pending implementation plan

## Problem

The workspace dropdown's top entry is currently labeled **"All workspaces"** and maps to `activeWorkspaceId === null`. It mixes three classes of boards into one list:

1. The user's own personal boards (`workspace_id IS NULL`, `owner_id = me`)
2. Boards shared with the user via `board_members` (already pre-filtered to `!workspace_id` in `boardSharingStore`)
3. Every board in every workspace the user belongs to

The third bucket pollutes what should be a private view, and there is no "your own zone" surface for users who haven't joined a real workspace. New users in particular land in a view that looks like a kitchen sink instead of a personal home.

## Goal

Replace the `"All workspaces"` sentinel with a **virtual "Personal" workspace** that contains only the user's own personal boards plus boards shared with them. This is the new default selection.

Non-goals: any database schema change, any migration of existing rows, any new Supabase RLS work, any AI-surface change.

## Concept

"Personal" is a **client-side virtual workspace**. It is not a row in `public.workspaces`. It is rendered as the top entry in `WorkspaceDropdown` and corresponds to the existing sentinel `activeWorkspaceId === null` in `workspacesStore`.

The semantic of `activeWorkspaceId === null` changes:

| Before                                 | After                                            |
| -------------------------------------- | ------------------------------------------------ |
| "All workspaces" — show every board    | "Personal" — show only personal + shared-with-me |

The value (`null`) stays the same; the filter rule narrows. This means zero migration for existing users — their next sign-in just tightens what their sidebar shows.

## Filter rule for Personal

The Sidebar already renders three independent sections (`src/components/layout/Sidebar.jsx:149-159`):

1. **Personal boards section** — `Object.values(allBoards).filter(b => b.owner_id === user.id && !b.workspace_id)`, gated by `showPersonalBoards = activeWorkspaceId === null`. ✅ Already correct.
2. **Shared boards section** — `boardSharingStore.sharedBoards` (already pre-filtered to `!workspace_id` at the store level, `src/store/boardSharingStore.js:184`), gated by `showSharedBoards = activeWorkspaceId === null`. ✅ Already correct.
3. **Workspaces (Spaces) section** — `workspaceList = Object.values(workspaces).filter(ws => activeWorkspaceId === null || ws.id === activeWorkspaceId)`. ❌ This is the only line that has to change.

**The only behavioral change:** when `activeWorkspaceId === null`, the workspaces section must render as **empty** (no Spaces at all), not as "every workspace." Change line 155-157 to:

```js
const workspaceList = activeWorkspaceId === null
  ? []
  : Object.values(workspaces).filter((ws) => ws.id === activeWorkspaceId)
```

That's the entire filter delta. Sections 1 and 2 already do the right thing today — they were just being displayed *alongside* every workspace, which made the "All" view feel like a kitchen sink.

Workspace-scoped boards (any `workspace_id != null`) do not appear in Personal regardless of whether the user is in that workspace, because the Spaces section is now hidden when Personal is active.

## Rules

1. **A user always has exactly one selection.** Either Personal (null) or a real workspace UUID. There is no "all" state anymore.
2. **You cannot leave Personal.** It is the fallback when:
   - The user signs in fresh
   - The user deletes the workspace they were on
   - The user is removed from the workspace they were on
   - The user clicks "Personal" in the dropdown
3. **Personal is not manageable.** No invitations, no members, no rename, no delete. The "Manage workspaces" footer link in the dropdown operates only on real workspaces.
4. **Boards created while Personal is active** get `workspace_id = null` (already the default behavior in `boardStore.createBoard` — no change needed).
5. **AI surfaces are unaffected.** The QuickAddBar pill and the chat route operate on a board, not a workspace.

## Visual identity

- **Glyph:** Phosphor `User` icon, weight `fill`.
- **Color:** copper — use `var(--color-copper)`. Confirmed present in `src/constants/colors.js` (alongside `copper-wash`). Do not introduce a new token.
- **Rationale:** Real workspaces render with `Cube` (color-keyed by `resolveWorkspaceColor`). Using a different glyph (`User`) for Personal makes the dropdown read at a glance — "person glyph = you, cube glyph = team."
- **Collapsed sidebar:** the Personal `User` glyph displays alone, same chrome as collapsed workspace glyphs today.

## File-by-file changes

| File                                                | Change                                                                                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/layout/WorkspaceDropdown.jsx`       | Replace the `"All workspaces"` top button with a `"Personal"` button. Swap the `SquaresFour` icon for `User` (fill, copper). Update `triggerLabel`/`triggerGlyph` for the `!activeWorkspace` case. |
| `src/components/layout/Sidebar.jsx`                 | One line change at lines 155-157: when `activeWorkspaceId === null`, return an empty `workspaceList` instead of every workspace. Personal + Shared sections already gate correctly on this same condition.                                                                              |
| `src/components/layout/SidebarNav.jsx`              | If this file currently renders an "All workspaces" label or empty-state copy referencing it, update to "Personal".                                                                                |
| `src/store/workspacesStore.js`                      | Add a small selector helper, e.g. `isPersonalSelected = activeWorkspaceId === null`. No state-shape change.                                                                                       |
| `src/components/workspace/WorkspaceCreateModal.jsx` | If it currently navigates "back to all workspaces" or references that wording in copy, change to "back to Personal".                                                                              |
| Empty-state copy in `Sidebar.jsx` (Personal + Shared sections) | When Personal is active and both `personalBoards` and `sharedBoards` are empty, the existing "no boards yet" copy (if any — grep during implementation) should read *"No personal boards yet. Create one or accept an invitation."* If no such copy exists today, the spec does not require adding one — the empty sections collapse naturally. |

## Out of scope (deliberate)

- No DB migration. No new `workspaces.is_personal` column. No backfilled Personal row per user.
- No Personal settings page. Personal cannot be configured.
- No mass-move of existing workspace-scoped boards into Personal.
- No change to how invitations or `board_members` are created or queried.
- No change to AI surfaces (pill, chat) or any edge function.

## Verification checklist (for implementation)

- [ ] New user signs in → lands on Personal, sees only their personal + shared boards.
- [ ] User in 2 workspaces switches to Personal → sees only personal + shared, not workspace boards.
- [ ] User on workspace A deletes workspace A → falls back to Personal automatically.
- [ ] User creates a board while Personal is active → board has `workspace_id = null` and appears in the Personal list immediately.
- [ ] User accepts a share for a personal-realm board → appears in Personal (existing realtime path).
- [ ] Collapsed sidebar shows the Personal glyph (no label) when Personal is active.
- [ ] Dropdown search does not match "Personal" against the workspaces filter — Personal sits above the search filter, not inside it.
- [ ] `WorkspaceCreateModal` and any other affected copy uses "Personal" wording where it previously said "all workspaces."

## Risks and edge cases

- **Dedup with `board_members`-owner entries.** The schema's trigger auto-inserts the owner as a `board_members` row with role `owner`. If `boardSharingStore` ever stopped filtering those out, the Personal union could double-count. Implementation must verify the existing dedupe still holds after this change.
- **Future cross-workspace sharing.** If we ever allow sharing a workspace-scoped board with a non-member, the rule "Personal contains shared-with-me" would need a decision: surface those in Personal, or in a separate "Shared" section. Not a concern today — `boardSharingStore` filters to `!workspace_id`.
- **`activeWorkspaceId === null` ambiguity.** Anywhere in the codebase that currently reads `activeWorkspaceId === null` as "no filter" will need to be audited and updated. Implementation step: `grep -rn "activeWorkspaceId" src/`.
