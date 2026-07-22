# Page title + actions inside the 64px header bar

**Date:** 2026-07-22
**Branch:** development
**Status:** Approved design

## Problem

Every desktop page renders an empty 64px header bar (`Header.jsx`, `h-16` —
its hamburger/title/search are all `!isDesktop`-gated, so on desktop it's blank).
Each page then renders its own title + action buttons separately, *below* that
bar, inside the scrolling `<main>`. The result: wasted empty header space up
top, and page titles/buttons that scroll away.

We want the page title and its primary buttons to live **inside** the existing
64px bar, bottom-aligned (matching claude.ai's `h-16 items-end` header) — one
header, no doubling.

## Scope

- **In:** Chat (`/chat`), Builder (`/build`), Boards (`/boards`).
- **Out:** Dashboard and Workspace (centered special layouts, no title-left/
  buttons-right header). Shared-title-only pages keep their current
  `AppLayout` `h-9` row.
- **Desktop only.** On mobile the 64px bar keeps its existing nav role
  (hamburger + title + search); page buttons stay in the page body. No mobile
  behavior changes.

## Approach — portal into a header slot

The bar is rendered by `AppLayout` (above the page/`Outlet` in the tree), but
each page owns its own buttons and their state. A portal bridges the two:
`Header` publishes an empty slot node; pages portal their content into it.

Rejected alternatives:
- **Context state setter** (`setHeaderContent(<jsx>)`) — storing JSX in state,
  flicker on route change. No.
- **AppLayout renders headers centrally** — forces lifting Boards' filter/sort/
  selector/presence state into the layout. Heavy coupling. No.

## Design

### New file — `src/components/layout/headerSlot.jsx`

- `HeaderSlotProvider` — holds the slot DOM node in `useState`; provides
  `{ node, setNode }` via context. Wraps `Header` + `<main>` in `AppLayout`.
- `useHeaderSlot()` — context accessor.
- `PageHeader({ align = 'narrow', children })` — page-facing API:
  - **Desktop** (`useIsDesktop()` true, slot node present): `createPortal` of
    ```
    <div className="{alignCls} w-full flex items-end justify-between gap-3 pb-3">
      {children}
    </div>
    ```
    into the slot node. `alignCls`:
    - `narrow` → `max-w-4xl mx-auto px-4 sm:px-8` (matches Chat/Builder body)
    - `wide` → `px-4 sm:px-8` (matches Boards full-width body)
  - **Mobile / no slot:** renders `<div className="flex items-center
    justify-between mb-6">{children}</div>` inline (today's behavior).

### `Header.jsx`

Desktop branch renders the slot instead of an empty bar:
```
<header className="relative h-16 shrink-0 bg-[var(--surface-page)] flex items-end">
  <div ref={setNode} className="w-full" />
</header>
```
Mobile branch (hamburger + title + search) untouched. Header reads `setNode`
from the slot context.

### `AppLayout.jsx`

Wrap `Header` + the shared title row + `<main>` in `<HeaderSlotProvider>`. No
other changes; the existing `h-9` shared-title row and its exclusion list stay.

### Pages

Each wraps its existing header row in `<PageHeader>` and deletes the old inline
header markup:

- **ChatListPage / BuilderPage** (`align="narrow"`): `<h1>` + the two-button
  cluster as children.
- **BoardsPage** (`align="wide"`): the left cluster (`<h1>`/skeleton +
  `PresenceBar` + `GhostToggle`) and the `BoardSelector` as the two children.
  Board root becomes `h-full flex flex-col` with the board area taking full
  height (header portaled away on desktop, inline on mobile).

## Result

Desktop: title + buttons bottom-aligned in the 64px bar; page body starts at its
search/content. No doubling. Mobile: unchanged.

## Risks / notes

- Slot registers via callback ref → one extra provider render on mount when the
  node attaches. Negligible.
- Portaled nodes stay in the React tree, so Boards' hooks/store subscriptions
  (BoardSelector filters, PresenceBar realtime, GhostToggle) are unaffected.
- Desktop↔mobile resize: desktop Header unmounts → `setNode(null)`; `PageHeader`
  flips to inline. Symmetric on the way back.
