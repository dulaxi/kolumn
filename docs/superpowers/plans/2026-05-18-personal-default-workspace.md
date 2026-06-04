# "Personal" Default Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the workspace dropdown's "All workspaces" sentinel with a virtual "Personal" workspace that shows only the user's own personal boards plus boards shared with them.

**Architecture:** Client-side only. No DB or store-shape change. The existing sentinel `activeWorkspaceId === null` is reinterpreted from "show everything" to "show Personal only" — accomplished by changing one filter line in `Sidebar.jsx` (the Personal-boards and Shared-boards sections already gate correctly on `=== null`), then renaming the dropdown's top entry from "All workspaces" to "Personal" with a different glyph.

**Tech Stack:** React 19, Zustand (`workspacesStore`), Phosphor icons (`@phosphor-icons/react`), Tailwind v4 + CSS variables from `src/index.css` and `src/constants/colors.js`.

**Spec:** `docs/superpowers/specs/2026-05-18-personal-default-workspace-design.md`

**Pre-flight reading (engineer should skim these first):**
- `src/components/layout/Sidebar.jsx:120-160` — board/workspace filter logic
- `src/components/layout/WorkspaceDropdown.jsx` — entire file (~285 lines)
- `src/store/workspacesStore.js` — to understand `activeWorkspaceId` shape
- The spec linked above — for rules and verification scenarios

**Note on testing:** There are no existing Vitest specs for `Sidebar.jsx` or `WorkspaceDropdown.jsx`. The verification is browser-based — dev server is `npm run dev` on port 5173. Do not invent new test files for these components as part of this plan; the change is small enough and visual enough that manual verification per the spec's checklist is the right tool.

---

## Task 1: Hide the Spaces section when Personal is selected

This is the only behavioral change in the entire feature. Today, when `activeWorkspaceId === null`, Sidebar renders every workspace in the Spaces section alongside Personal boards and Shared boards. After this task, the Spaces section is empty (collapsed by render) when Personal is selected.

**Files:**
- Modify: `src/components/layout/Sidebar.jsx:149-159`

- [ ] **Step 1: Open the file and locate the filter block**

Open `src/components/layout/Sidebar.jsx` and find this block at lines 149-159 (line numbers may drift by a line or two):

```js
const personalBoards = Object.values(allBoards).filter(
  (b) => b.owner_id === user?.id && !b.workspace_id,
)
// When the dropdown selects a specific workspace, only that workspace's boards
// (and the "Shared with me" list, which is workspace-agnostic) are shown.
// When null ("All workspaces"), every section renders as before.
const workspaceList = Object.values(workspaces).filter(
  (ws) => activeWorkspaceId === null || ws.id === activeWorkspaceId,
)
const showPersonalBoards = activeWorkspaceId === null
const showSharedBoards = activeWorkspaceId === null
```

- [ ] **Step 2: Replace the `workspaceList` line and update the comment**

Replace the block above with:

```js
const personalBoards = Object.values(allBoards).filter(
  (b) => b.owner_id === user?.id && !b.workspace_id,
)
// When the dropdown selects a specific workspace, only that workspace's boards
// (and the "Shared with me" list, which is workspace-agnostic) are shown.
// When null ("Personal"), only Personal + Shared boards render — the Spaces
// section is hidden entirely so Personal feels like its own zone, not a kitchen sink.
const workspaceList =
  activeWorkspaceId === null
    ? []
    : Object.values(workspaces).filter((ws) => ws.id === activeWorkspaceId)
const showPersonalBoards = activeWorkspaceId === null
const showSharedBoards = activeWorkspaceId === null
```

- [ ] **Step 3: Build to catch typos**

Run: `npm run build`
Expected: build completes with no errors. (Lint warnings are fine; errors are not.)

- [ ] **Step 4: Manual verify in browser**

Dev server is at http://localhost:5173 (start with `npm run dev` if not running).

1. Sign in. Confirm the dropdown trigger reads "All workspaces" still (we haven't renamed yet — that's Task 2).
2. Open the dropdown, click the top entry ("All workspaces" — selects `null`).
3. **Verify:** The sidebar shows your Personal Boards section, your Shared section (if any), and **NO** Spaces section — even if you belong to workspaces.
4. Click a real workspace from the dropdown.
5. **Verify:** Personal Boards and Shared sections disappear; only that workspace's boards show. (This is unchanged behavior — sanity check.)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.jsx
git commit -m "$(cat <<'EOF'
feat(workspace): hide Spaces section when Personal is selected

Narrow the meaning of activeWorkspaceId === null from "show all
workspaces" to "show only personal + shared boards." The dropdown
label still reads 'All workspaces' — renamed in the next commit.
EOF
)"
```

---

## Task 2: Rename "All workspaces" → "Personal" with the User glyph

Three sites in `WorkspaceDropdown.jsx` reference the old label, plus the icon import.

**Files:**
- Modify: `src/components/layout/WorkspaceDropdown.jsx`

- [ ] **Step 1: Update the icon import**

Open `src/components/layout/WorkspaceDropdown.jsx`. The current import line 3 reads:

```js
import { CaretDown, Check, Cube, MagnifyingGlass, SquaresFour, UsersThree } from '@phosphor-icons/react'
```

Replace `SquaresFour` with `User`:

```js
import { CaretDown, Check, Cube, MagnifyingGlass, User, UsersThree } from '@phosphor-icons/react'
```

- [ ] **Step 2: Update the JSDoc comment**

Find this line (around line 30):

```js
 *   reflects the currently-active workspace, or "All workspaces" if null.
```

Change to:

```js
 *   reflects the currently-active workspace, or "Personal" if null.
```

- [ ] **Step 3: Update the trigger label and glyph**

Find this block (around lines 137-140):

```js
const triggerLabel = activeWorkspace?.name || 'All workspaces'
const triggerGlyph = activeWorkspace
  ? <WorkspaceGlyph workspace={activeWorkspace} />
  : <SquaresFour className="w-5 h-5" weight="light" />
```

Replace with:

```js
const triggerLabel = activeWorkspace?.name || 'Personal'
const triggerGlyph = activeWorkspace
  ? <WorkspaceGlyph workspace={activeWorkspace} />
  : <User className="w-5 h-5" weight="fill" style={{ color: 'var(--color-copper)' }} />
```

- [ ] **Step 4: Update the "All workspaces" panel row**

Find this block (around lines 160-178), specifically the comment, the icon, and the visible label:

```js
{/* "All workspaces" option always at the top */}
<button
  type="button"
  onClick={() => handlePick(null)}
  className={`${ROW_BASE} w-full px-2 gap-2 text-left ${
    activeWorkspaceId === null
      ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
      : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
  }`}
>
  <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
    <SquaresFour className="w-5 h-5" weight={activeWorkspaceId === null ? 'fill' : 'light'} />
  </span>
  <span className="truncate flex-1">All workspaces</span>
  {activeWorkspaceId === null && (
    <Check className="w-4 h-4 text-[var(--color-lime-dark)] shrink-0" weight="bold" />
  )}
</button>
```

Replace with:

```js
{/* "Personal" option always at the top — virtual workspace, not a DB row */}
<button
  type="button"
  onClick={() => handlePick(null)}
  className={`${ROW_BASE} w-full px-2 gap-2 text-left ${
    activeWorkspaceId === null
      ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
      : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
  }`}
>
  <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
    <User
      className="w-5 h-5"
      weight="fill"
      style={{ color: 'var(--color-copper)' }}
    />
  </span>
  <span className="truncate flex-1">Personal</span>
  {activeWorkspaceId === null && (
    <Check className="w-4 h-4 text-[var(--color-lime-dark)] shrink-0" weight="bold" />
  )}
</button>
```

Note: the icon weight no longer flips on selection — copper-filled `User` is the identity whether selected or not. The `Check` mark on the right is sufficient selection indication, matching how real workspaces render.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 6: Manual verify in browser**

1. Reload http://localhost:5173.
2. The dropdown trigger now reads **"Personal"** (with a copper-filled person icon) when no real workspace is active.
3. Open the dropdown. The top row reads **"Personal"** with the same icon. The selection state (checkmark, mauve-cream background) still works.
4. In collapsed sidebar mode (toggle via the sidebar's collapse control), the trigger shows just the copper `User` icon, centered.
5. Switch to a real workspace and back — the trigger correctly updates between the workspace's name + cube glyph and "Personal" + copper user.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/WorkspaceDropdown.jsx
git commit -m "$(cat <<'EOF'
feat(workspace): rename "All workspaces" to "Personal" with User glyph

Top dropdown entry now reads "Personal" with a copper-filled User icon
(Phosphor) to distinguish from team workspaces (Cube glyph, hashed
color). Trigger label and panel row both updated.
EOF
)"
```

---

## Task 3: Update the stale comment in Sidebar.jsx

Task 1 left a small comment-only loose end. The Sidebar.jsx filter block's comment was updated, but elsewhere in the file there may be stale references. Audit and fix.

**Files:**
- Modify: `src/components/layout/Sidebar.jsx` (comments only)

- [ ] **Step 1: Grep for residual "All workspaces" or "all workspaces" references**

Run:

```bash
grep -n "all workspaces\|All workspaces" src/components/layout/Sidebar.jsx
```

Expected output: zero lines (the comment in Task 1 step 2 already rewrites the only known site). If any lines remain, proceed to Step 2.

- [ ] **Step 2: Replace any remaining references**

For each line returned by the grep, update the comment text to use "Personal" wording where appropriate. Use judgment — if a comment is talking about the *legacy* `null = show everything` behavior, the rewrite is "When null (Personal), …".

- [ ] **Step 3: Commit (skip if nothing changed)**

```bash
git add src/components/layout/Sidebar.jsx
git commit -m "docs(workspace): update Sidebar comments to use 'Personal' wording"
```

---

## Task 4: Cross-file audit

Catch anything outside the two main files that still says "all workspaces."

**Files:**
- (Audit only — modify only if findings)

- [ ] **Step 1: Repo-wide grep**

Run:

```bash
grep -rn "All workspaces\|all workspaces" src/
```

Expected sites that should NOT change (these are about real workspaces all rendering with the Cube glyph — different meaning):
- `src/constants/colors.js:27` — comment about cube glyph
- `src/components/layout/WorkspaceDropdown.jsx:13` — comment about cube glyph

If anything else appears, it's a stale reference to the old sentinel. Update it to use "Personal" wording.

- [ ] **Step 2: Phosphor `SquaresFour` audit in the workspace dropdown only**

Run:

```bash
grep -n "SquaresFour" src/components/layout/WorkspaceDropdown.jsx
```

Expected: zero matches (Task 2 removed the import and both usages). If any remain, fix them.

Other `SquaresFour` usages in the repo (`BoardsPage.jsx`, `Header.jsx`, `BottomTabBar.jsx`, `LandingPage.jsx`) are unrelated and stay.

- [ ] **Step 3: Commit if anything changed**

```bash
git add -A
git commit -m "fix(workspace): scrub residual 'all workspaces' references"
```

---

## Task 5: End-to-end verification against the spec's checklist

This task contains no code — it's the manual confirmation that the feature behaves to spec before we call it done. Walk through every item; fix any failure by going back to the relevant task.

**Pre-conditions:** Dev server running at http://localhost:5173, signed in as a user who has (a) at least one personal board, (b) at least one shared board, and (c) is a member of at least one real workspace with at least one board.

- [ ] **Step 1: New / fresh-state user lands on Personal**

Sign out and sign back in. The dropdown trigger reads **"Personal"** with a copper `User` icon. The sidebar shows Personal Boards and Shared sections only.

- [ ] **Step 2: Personal filter excludes workspace boards**

While on Personal, confirm that boards belonging to the workspace you're a member of do NOT appear in the sidebar. They only appear when you select that workspace from the dropdown.

- [ ] **Step 3: Workspace switching returns to Personal cleanly**

Switch to a real workspace. Sidebar shows only that workspace's boards. Switch back to Personal. Sidebar shows Personal + Shared again. No flicker, no stale state.

- [ ] **Step 4: Board creation while Personal is active**

Create a new board while Personal is selected. The board appears immediately in the Personal Boards section. In Supabase (or via `console.log` in `createBoard`), confirm `workspace_id === null` on the new row.

- [ ] **Step 5: Workspace deletion falls back to Personal**

If you have a disposable test workspace: delete it while it's the active workspace. Confirm the active selection falls back to Personal (trigger reads "Personal") without errors.

If you don't have a disposable workspace, skip this step and document it as untested in the final commit message.

- [ ] **Step 6: Collapsed sidebar shows the copper User glyph**

Collapse the sidebar. The dropdown trigger should show the copper-filled `User` icon, centered, no label.

- [ ] **Step 7: Shared-board realtime still works**

(Requires a second account that can share a board with you, or pre-existing pending shares.) Accept a shared board while Personal is active. It appears under Shared without a reload.

- [ ] **Step 8: Final commit / done marker**

If anything in steps 1-7 failed, return to the relevant task and fix. Otherwise, no commit needed for this task — it's pure verification. Note any skipped steps (e.g. Step 5 if you had no disposable workspace) in the PR description.

---

## Out-of-band notes

- **AI surfaces** (`QuickAddBar`, chat) operate on a board, not a workspace, so they require no changes. Confirmed in spec, restated here so the engineer doesn't go looking.
- **`workspacesStore.isPersonalSelected` helper** — the spec mentioned this as optional polish. **Do not add it.** There are only two call sites (Sidebar.jsx and WorkspaceDropdown.jsx) and both already read `activeWorkspaceId === null` directly. Adding a helper for two call sites is premature DRY — YAGNI.
- **DB / Supabase** — zero changes. If you find yourself opening Supabase Studio or writing a migration, stop and re-read the spec; you're off-plan.
