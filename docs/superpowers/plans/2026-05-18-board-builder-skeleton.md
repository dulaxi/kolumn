# Board Builder Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the navigation skeleton for Board Builder — a sidebar tab, a `/build` route, and a "Coming soon" placeholder page — so the surface exists and can be iterated on without re-touching navigation later.

**Architecture:** Pure additive UI scaffolding. One new React component (`BuilderPage`), one new route, one new sidebar `NavLinkRow`, one documentation tweak. No AI, no edge functions, no `boardStore` integration, no schema changes. Follows the existing patterns in `src/App.jsx` (lazy-loaded routes under `<ProtectedRoute><AppLayout/>`) and `src/components/layout/SidebarNav.jsx` (NavLinkRow with Phosphor icon).

**Tech Stack:** React 19, react-router-dom v7, Tailwind v4 + CSS-variable design tokens, Phosphor icons.

**Spec:** `docs/superpowers/specs/2026-05-18-board-builder-skeleton-design.md`

**Pre-flight reading (skim before starting):**
- The spec linked above
- `src/components/layout/SidebarNav.jsx` (entire file, ~110 lines) — to see the `NavLinkRow` and `ROW_BASE` patterns
- `src/App.jsx:65-96` — the protected route block where the new route slots in
- `src/pages/ChatPage.jsx:35-41` — example of `flex flex-col items-center justify-center h-full` empty-state styling

**Note on testing:** No existing Vitest tests for page components in this codebase. Don't invent any here — verification is browser-based (dev server: `npm run dev`, http://localhost:5173). Build is the type-safety gate; manual click-through is the behavior gate.

---

## Task 1: BuilderPage component + `/build` route

Get the page reachable by URL first (`http://localhost:5173/build`). The sidebar tab comes in Task 2.

**Files:**
- Create: `src/pages/BuilderPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/pages/BuilderPage.jsx`**

Write this exact content:

```jsx
import { Blueprint } from '@phosphor-icons/react'

export default function BuilderPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="flex flex-col items-center text-center bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[12px] px-8 py-10 max-w-[360px]">
        <Blueprint className="w-8 h-8 text-[var(--text-muted)]" weight="light" />
        <h1 className="mt-4 text-base font-medium text-[var(--text-primary)]">
          Builder is coming soon.
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          AI-generated boards will live here.
        </p>
      </div>
    </div>
  )
}
```

Notes for the engineer:
- The `Blueprint` icon comes from `@phosphor-icons/react`. If the build fails with `'Blueprint' is not exported`, see Task 1 Step 6 (icon-fallback path).
- `h-full` is correct: the parent `AppLayout` provides a flex container that fills the viewport's main area; `h-full` makes BuilderPage stretch to it so the card can vertical-center.
- No state, no hooks, no event handlers — it's a static placeholder.

- [ ] **Step 2: Add a lazy import in `src/App.jsx`**

Open `src/App.jsx`. Find the block of `const PageName = lazy(() => import('./pages/PageName'))` lines (around lines 9-23). Add this new line, alphabetized near the others:

```jsx
const BuilderPage = lazy(() => import('./pages/BuilderPage'))
```

A reasonable insertion point is right after `BoardsPage` and before `SettingsPage`. The exact alphabetical position doesn't matter — just keep it grouped with the page lazy imports.

- [ ] **Step 3: Add the route inside the protected AppLayout block**

In `src/App.jsx`, find the protected-route group (around lines 88-94) that currently reads:

```jsx
<Route path="dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
<Route path="chat" element={<ErrorBoundary><ChatListPage /></ErrorBoundary>} />
<Route path="chat/:id" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
<Route path="boards/*" element={<ErrorBoundary><BoardsPage /></ErrorBoundary>} />
<Route path="workspace" element={<ErrorBoundary><WorkspacePage /></ErrorBoundary>} />
<Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
```

Insert a new line for `build`, placed between `boards/*` and `workspace` (mirrors the eventual sidebar position):

```jsx
<Route path="dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
<Route path="chat" element={<ErrorBoundary><ChatListPage /></ErrorBoundary>} />
<Route path="chat/:id" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
<Route path="boards/*" element={<ErrorBoundary><BoardsPage /></ErrorBoundary>} />
<Route path="build" element={<ErrorBoundary><BuilderPage /></ErrorBoundary>} />
<Route path="workspace" element={<ErrorBoundary><WorkspacePage /></ErrorBoundary>} />
<Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
```

- [ ] **Step 4: Build to catch syntax / import errors**

Run: `npm run build`
Expected: build succeeds. If it fails with `Blueprint is not exported from '@phosphor-icons/react'`, jump to Step 6 to apply the fallback. Any other build error is unexpected — read it carefully and fix in place.

- [ ] **Step 5: Manual browser verify (URL-only — sidebar tab comes in Task 2)**

Dev server should be running at http://localhost:5173 (start with `npm run dev` if not).

1. Sign in.
2. In the URL bar, type `http://localhost:5173/build` and press Enter.
3. **Verify:** A centered card appears with the Blueprint icon, "Builder is coming soon." heading, and "AI-generated boards will live here." subhead.
4. **Verify:** The surrounding sidebar + header (AppLayout chrome) is still visible.
5. **Verify:** No console errors in the browser devtools.

If you see "Page not found" or a blank screen, recheck Steps 2-3 — the lazy import or route is missing.

- [ ] **Step 6: Icon fallback (only if Step 4 build failed on the Blueprint import)**

`Blueprint` should exist in Phosphor's React icon set, but if it doesn't:

1. Confirm by running: `grep -i "export.*Blueprint" node_modules/@phosphor-icons/react/dist/index.d.ts` — empty output confirms it's missing.
2. Replace `Blueprint` with `Compass` in `src/pages/BuilderPage.jsx`:
   - Import: `import { Compass } from '@phosphor-icons/react'`
   - Usage: `<Compass className="w-8 h-8 text-[var(--text-muted)]" weight="light" />`
3. Re-run `npm run build` — should now pass.
4. **Report this in your commit message and final report so Task 2 knows to import `Compass` instead of `Blueprint` in `SidebarNav.jsx`.**

(Skip this step entirely if Step 4 succeeded with `Blueprint`.)

- [ ] **Step 7: Commit**

```bash
git add src/pages/BuilderPage.jsx src/App.jsx
git commit -m "$(cat <<'EOF'
feat(builder): scaffold BuilderPage + /build route

Placeholder-only page: centered card with the Blueprint icon and
"Builder is coming soon." copy. Lazy-loaded route under the existing
ProtectedRoute + AppLayout block, placed between /boards and
/workspace so its eventual sidebar slot mirrors its route position.
EOF
)"
```

---

## Task 2: Sidebar nav row + CLAUDE.md update

Make the page reachable by clicking a sidebar tab, and reconcile the doc parenthetical now that we know the route is `/build`.

**Files:**
- Modify: `src/components/layout/SidebarNav.jsx`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add `Blueprint` to the Phosphor imports in `SidebarNav.jsx`**

Open `src/components/layout/SidebarNav.jsx`. Find line 2:

```jsx
import { ChatsCircle, MagnifyingGlass, UsersThree } from '@phosphor-icons/react'
```

Insert `Blueprint` alphabetically before `ChatsCircle`:

```jsx
import { Blueprint, ChatsCircle, MagnifyingGlass, UsersThree } from '@phosphor-icons/react'
```

**If Task 1 used the `Compass` fallback** instead of `Blueprint`, use `Compass` here too — keep the icon consistent between the page and the nav row.

- [ ] **Step 2: Insert the Builder NavLinkRow between Chats and the Workspace block**

In `SidebarNav.jsx`, find this region (around lines 82-86):

```jsx
<NavLinkRow to="/chat" end icon={ChatsCircle} label="Chats" collapsed={collapsed} onNavigate={closeMobileMenu} />
{/* Calendar + Notes removed — see App.jsx note. */}

{/* Workspace — desktop becomes a dropdown filter; mobile keeps a plain NavLink */}
{isDesktop ? (
```

Insert a new `NavLinkRow` for Builder between the Chats row and the comment about Calendar/Notes:

```jsx
<NavLinkRow to="/chat" end icon={ChatsCircle} label="Chats" collapsed={collapsed} onNavigate={closeMobileMenu} />
<NavLinkRow to="/build" icon={Blueprint} label="Builder" collapsed={collapsed} onNavigate={closeMobileMenu} />
{/* Calendar + Notes removed — see App.jsx note. */}

{/* Workspace — desktop becomes a dropdown filter; mobile keeps a plain NavLink */}
{isDesktop ? (
```

Notes:
- No `end` prop on Builder — `/build` is a leaf route with no nested children, so default matching is fine. (`chat` uses `end` because `chat/:id` is a child route that should highlight separately.)
- The existing `NavLinkRow` component handles active state, icon weight flipping (`light` → `fill`), collapsed tooltip, and mobile dismissal. No customization needed.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Update `CLAUDE.md`**

Open `CLAUDE.md`. Find the Active focus section (around line 18-50). Locate this line:

```
- Standalone page with its own route (likely `/builder`)
```

Replace with:

```
- Standalone page at the route `/build`
```

(The parenthetical "likely" is now stale — we know the route. The change tightens the doc.)

- [ ] **Step 5: Manual browser verify — full end-to-end**

With dev server running:

1. Reload http://localhost:5173.
2. **Verify:** A new sidebar row labeled "Builder" appears between "Chats" and the Workspace dropdown trigger, with the Blueprint icon at `weight="light"` (or `Compass` if the fallback was used).
3. Click the Builder row. **Verify:** The URL changes to `/build`, the Builder placeholder card renders, and the sidebar row's icon flips to `weight="fill"` with the active-state mauve-cream background.
4. Navigate to another tab (e.g. Chats). **Verify:** The Builder row de-activates (icon back to `weight="light"`, no background).
5. Collapse the sidebar (toggle button in the bottom-left). **Verify:** The Builder slot shows just the Blueprint icon, centered, with a "Builder" tooltip on hover.
6. **Verify:** No console errors during any of this.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/SidebarNav.jsx CLAUDE.md
git commit -m "$(cat <<'EOF'
feat(builder): add Builder sidebar tab + tighten doc

NavLinkRow inserted between Chats and the Workspace dropdown,
Phosphor Blueprint icon at weight=light (or Compass fallback if
Blueprint isn't exported in our Phosphor version). Updates
CLAUDE.md's Active focus parenthetical from "(likely /builder)" to
the now-known "/build".
EOF
)"
```

(If the `Compass` fallback was used, swap "Blueprint" for "Compass" in the commit message body so the trail is accurate.)

---

## Final verification (no commit needed)

A quick end-to-end check after both tasks are done. This isn't a separate task — it's a sanity gate before declaring the skeleton ready.

- [ ] **Sign out, sign back in** — Builder is reachable from a cold session, not just a stale in-memory state.
- [ ] **Type `/build` directly in the URL bar** — page renders without needing the sidebar click (the URL is a valid bookmark).
- [ ] **Mobile sidebar** (resize to <768px or use devtools mobile view) — Builder row is reachable and tapping it navigates correctly. Mobile menu closes on tap (via `closeMobileMenu`, which the NavLinkRow forwards).
- [ ] **`npm run build`** — final clean build, no errors, no warnings introduced.
- [ ] **`git log --oneline 2aa9cb4..HEAD`** — should show exactly two new commits, one per task.

If any of the above fails, return to the relevant task. If everything passes, the skeleton is done and the next focus pass can layer on the actual AI behavior.

---

## Out-of-band notes

- **No tests for these components.** Don't invent any. The spec explicitly defers verification to manual browser checks; a Vitest test for a static placeholder page is busywork.
- **No analytics events.** When Builder gets real behavior later, that's the right time to add a `capture('builder_opened', ...)` call. Adding it now would emit hollow events from an empty page.
- **No tier check.** Builder is a placeholder accessible to every signed-in user. Tier gating belongs with the AI integration pass.
- **Stay on the rails.** If you find yourself wanting to import `useChatStore`, wire up `handleSubmit`, or anything that touches behavior — stop. That's a different plan. This plan ships an empty page.
