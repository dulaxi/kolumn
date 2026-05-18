# Board Builder Skeleton — Design Spec

**Date:** 2026-05-18
**Branch:** `development`
**Status:** approved (design); pending implementation plan

## Goal

Ship the **navigation skeleton** for Board Builder so the slot exists in the sidebar, the route resolves, and a placeholder page renders. No AI integration, no board generation, no edge-function changes. The point is to reserve the surface so we can iterate on what Builder *does* without re-touching navigation.

## Non-goals (strict)

- No AI prompt, no edge-function call, no `boardStore` integration
- No tier check, no rate limiting, no analytics events
- No feature flag (Builder is a placeholder, not a hidden feature)
- No mobile-specific path beyond what the existing `NavLinkRow` already handles
- No styling deviations from existing primitives (no new tokens, no new design-system pieces)

## What ships

### 1. Sidebar tab

A new `NavLinkRow` in `src/components/layout/SidebarNav.jsx`, inserted **between Chats and the Workspace dropdown**:

```jsx
<NavLinkRow to="/chat" end icon={ChatsCircle} label="Chats" collapsed={collapsed} onNavigate={closeMobileMenu} />
<NavLinkRow to="/build" icon={Blueprint} label="Builder" collapsed={collapsed} onNavigate={closeMobileMenu} />
{/* Workspace — desktop dropdown / mobile NavLink */}
```

- Icon: Phosphor `Blueprint` (imported alongside the existing `ChatsCircle`, etc.)
- Label: `"Builder"` (capitalized like other top-level tabs)
- Active styling: handled by the existing `NavLinkRow` component — no overrides
- Collapsed-sidebar tooltip: handled automatically (`title={collapsed ? label : undefined}` pattern)
- Mobile: NavLinkRow already works on mobile; no special handling needed

### 2. Route

A new `<Route>` in `src/App.jsx` as a sibling of `chat`, `boards`, `workspace`, `settings` — inside the protected `<AppLayout />` parent:

```jsx
<Route path="build" element={<ErrorBoundary><BuilderPage /></ErrorBoundary>} />
```

Plus a lazy import at the top of `App.jsx`:

```jsx
const BuilderPage = lazy(() => import('./pages/BuilderPage'))
```

### 3. Placeholder page

New file `src/pages/BuilderPage.jsx`. Renders a single centered card. No other chrome (the surrounding `AppLayout` provides the sidebar and header).

**Content:**

- Phosphor `Blueprint` icon, ~32px, muted color (`text-[var(--text-muted)]`)
- Heading: `"Builder is coming soon."` (text-base, font-medium, primary text color)
- Subhead: `"AI-generated boards will live here."` (text-sm, muted)

**Container:**

- Centered horizontally and vertically in the page area
- Card uses the existing raised-surface treatment: `bg-[var(--surface-card)]`, `border border-[var(--border-default)]`, `rounded-[12px]`, modest padding (`px-8 py-10`)
- Max width ~360px so the card doesn't sprawl on wide viewports

No buttons, no inputs, no interactivity. The page is purely informational.

### 4. Documentation update

`CLAUDE.md`'s Active focus section currently parenthesizes the route as `(likely /builder)`. Update to `(at /build)` so the doc matches what shipped.

## File-by-file changes

| File | Change |
|------|--------|
| `src/pages/BuilderPage.jsx` | **Create.** Single component, default export, ~30 lines including the JSX. |
| `src/App.jsx` | Add the lazy import for `BuilderPage` and the `<Route path="build" ... />` inside the protected AppLayout block. |
| `src/components/layout/SidebarNav.jsx` | Add `Blueprint` to the Phosphor imports; insert a new `NavLinkRow` between Chats and the Workspace block. |
| `CLAUDE.md` | One-line change in Active focus: `(likely /builder)` → `(at /build)`. |

## Verification

- [ ] Sidebar shows "Builder" between "Chats" and the workspace dropdown, with the Blueprint icon
- [ ] Collapsed sidebar shows just the Blueprint icon with a "Builder" tooltip on hover
- [ ] Clicking the tab navigates to `/build` and renders the placeholder card
- [ ] Active-state styling (mauve-cream background, fill icon weight) lights up the row when on `/build`
- [ ] Mobile sidebar still works — the row is reachable and tappable
- [ ] No console errors, no failed lazy imports, `npm run build` passes

## Risks

- **Phosphor `Blueprint` icon availability.** Likely fine — Phosphor's icon set is broad — but verify by importing it and checking the build doesn't error. If `Blueprint` doesn't exist, candidate fallbacks (in order of preference): `Compass`, `Ruler`, `Kanban`. The user explicitly asked for Blueprint, so prefer fixing/renaming over substituting if there's a casing/spelling issue.
- **CLAUDE.md drift.** Skipping the doc update would leave the parenthetical stale. Small change, but worth keeping in scope so docs match code.
