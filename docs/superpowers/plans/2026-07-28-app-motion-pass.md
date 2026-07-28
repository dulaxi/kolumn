# App-wide Motion Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every overlay surface subtle, industry-standard enter/exit motion (modal fade+scale, tooltip fade-out, drag-drop settle, inline-editor rise), centralize motion tokens, and add a user-facing Reduce-motion setting.

**Architecture:** Pure CSS keyframes on `transform`/`opacity` extend the existing `dropdownIn/Out` vocabulary; the `Modal` primitive gains a deferred-unmount exit (ported from `Popover.jsx`) so all consumers animate for free; a `motion` preference in `settingsStore` stamps `data-motion` on `<html>`, combined with `prefers-reduced-motion` by one global CSS guard.

**Tech Stack:** React 19, Tailwind v4 (`@theme` tokens in `src/index.css`), Zustand (persist), Vitest + @testing-library/react, @dnd-kit/core.

**Spec:** `docs/superpowers/specs/2026-07-28-app-motion-pass-design.md`

## Global Constraints

- Animate **only** `transform` and `opacity` (compositor-safe). No layout-property animation.
- No `motion` (framer) library usage anywhere in `src/components`, `src/pages` app UI (landing sandbox exempt, untouched).
- All new durations/easings come from the `@theme` tokens: `--dur-overlay-in: 150ms`, `--dur-overlay-out: 120ms`, `--dur-modal-in: 200ms`, `--dur-modal-out: 150ms`, `--dur-editor-in: 120ms`, `--ease-enter: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-exit: cubic-bezier(0.4, 0, 1, 1)`. JS timers use the matching constants from `src/constants/motion.js`.
- Existing Popover/Menu/WorkspaceDropdown feel must not change (same 150ms/120ms, same `ease-out`/`ease-in` easings they have today — the new `--ease-enter`/`--ease-exit` tokens are for the *modal* keyframes only).
- No hex codes; no new icon imports.
- Commits: conventional, scoped (`feat(ui):`, `fix(board):`, `test(ui):` etc.).
- After every task: `npm run test` green before commit.

---

### Task 1: Motion tokens, keyframes, shared JS constants, unified reduced-motion guard

**Files:**
- Modify: `src/index.css` (`@theme` block ~line 56; animation section lines ~324–517)
- Create: `src/constants/motion.js`
- Modify: `src/components/ui/Popover.jsx:30-32`
- Modify: `src/components/layout/WorkspaceDropdown.jsx:11`

**Interfaces:**
- Produces: CSS tokens `--dur-overlay-in/out`, `--dur-modal-in/out`, `--dur-editor-in`, `--ease-enter`, `--ease-exit`; keyframes `fadeOut`, `modalIn`, `modalOut`, `riseIn`; class `.animate-rise-in`; modal animation rules keyed on `[data-modal-backdrop][data-animated]` + `data-state`; JS constants `OVERLAY_EXIT_MS = 120`, `MODAL_EXIT_MS = 150` from `src/constants/motion.js`.
- Consumes: nothing.

- [ ] **Step 1: Add tokens to the `@theme` block in `src/index.css`**

Directly below the line `--animate-fadeIn: fadeIn 1s ease forwards;` (line 56), add:

```css
  /* Motion tokens — single source of truth for animation durations.
     JS deferred-unmount timers mirror these in src/constants/motion.js
     (CSS vars aren't synchronously readable pre-mount); keep in sync. */
  --dur-overlay-in: 150ms;   /* popover/menu/tooltip enter */
  --dur-overlay-out: 120ms;  /* popover/menu/tooltip exit */
  --dur-modal-in: 200ms;     /* modal panel + backdrop enter */
  --dur-modal-out: 150ms;    /* modal panel + backdrop exit */
  --dur-editor-in: 120ms;    /* InlineCardEditor entrance */
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);  /* decelerating (modal enter) */
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);      /* accelerating (modal exit) */
```

- [ ] **Step 2: Migrate dropdown animation durations onto the tokens (same feel)**

In `src/index.css`, change `.animate-dropdown` (line ~366) and `.animate-dropdown-out` (line ~375) — durations only, easings stay `ease-out`/`ease-in`:

```css
.animate-dropdown {
  animation: dropdownIn var(--dur-overlay-in) ease-out;
}
```

```css
.animate-dropdown-out {
  animation: dropdownOut var(--dur-overlay-out) ease-in forwards;
}
```

- [ ] **Step 3: Add modal + editor keyframes and the modal state rules**

In `src/index.css`, directly after the `.animate-dropdown-out` rule, add:

```css
/* Modal enter/exit — applied by the Modal primitive via data attributes.
   The panel rule targets the backdrop's layout children through the
   display:contents wrapper ([role] = the dialog wrapper), so consumers
   need zero markup changes. QuickAddBar opts out via animated={false}
   (no data-animated attribute) to keep its bespoke pill-bounce. */
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96) translateY(4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes modalOut {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to { opacity: 0; transform: scale(0.97) translateY(2px); }
}
[data-modal-backdrop][data-animated] {
  animation: fadeIn var(--dur-modal-in) var(--ease-enter);
}
[data-modal-backdrop][data-animated] > [role] > * {
  animation: modalIn var(--dur-modal-in) var(--ease-enter);
}
[data-modal-backdrop][data-animated][data-state="closed"] {
  animation: fadeOut var(--dur-modal-out) var(--ease-exit) forwards;
  pointer-events: none;
}
[data-modal-backdrop][data-animated][data-state="closed"] > [role] > * {
  animation: modalOut var(--dur-modal-out) var(--ease-exit) forwards;
}

/* InlineCardEditor entrance — mount-only fade + 4px rise. Opacity and
   transform only; the editor's own size must never animate (see the
   "No transition-all" note in InlineCardEditor.jsx). */
@keyframes riseIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-rise-in {
  animation: riseIn var(--dur-editor-in) ease-out;
}
```

- [ ] **Step 4: Replace the scattered reduced-motion guards with one global block**

In `src/index.css`:

a. **Delete** the ghost guard (lines ~357–359):
```css
@media (prefers-reduced-motion: reduce) {
  .animate-ghost-in, .ghost-slot { animation: none; }
}
```

b. **Delete** the toast-pulse guard (lines ~501–503):
```css
@media (prefers-reduced-motion: reduce) {
  .toast-pulse-dot { animation: none; }
}
```

c. **Add** at the end of the animation section (after `.ai-skeleton-block`), the unified guard:

```css
/* ── Reduced motion ──────────────────────────────────────────────
   Two triggers, one list:
   1. OS-level prefers-reduced-motion, unless the user explicitly chose
      "Full" in Settings → Accessibility (data-motion="full").
   2. The in-app "Reduced" setting (data-motion="reduced"), regardless
      of OS. applyMotion() in src/utils/motion.js stamps the attribute;
      'system' means no attribute, so the media query live-follows the OS.
   Hover transition-colors is exempt (not motion in the vestibular
   sense). Deferred-unmount timers still run — surfaces linger inertly
   for ≤150ms, which is invisible without the animation. */
@media (prefers-reduced-motion: reduce) {
  :root:not([data-motion="full"]) :is(
    .animate-dropdown, .animate-dropdown-out, .animate-ghost-in,
    .ghost-slot, .animate-slide-in-right, .animate-rise-in,
    .toast-pulse-dot, .audio-bar, .btn-wave > span, .typing-wave > span,
    .ai-skeleton-block, [class*="pill-bounce"],
    [data-modal-backdrop][data-animated],
    [data-modal-backdrop][data-animated] > [role] > *
  ) {
    animation: none !important;
  }
}
:root[data-motion="reduced"] :is(
  .animate-dropdown, .animate-dropdown-out, .animate-ghost-in,
  .ghost-slot, .animate-slide-in-right, .animate-rise-in,
  .toast-pulse-dot, .audio-bar, .btn-wave > span, .typing-wave > span,
  .ai-skeleton-block, [class*="pill-bounce"],
  [data-modal-backdrop][data-animated],
  [data-modal-backdrop][data-animated] > [role] > *
) {
  animation: none !important;
}
```

(`[class*="pill-bounce"]` catches QuickAddBar's Tailwind arbitrary classes `animate-[pill-bounce-in_…]` / `animate-[pill-bounce-out_…]`.)

- [ ] **Step 5: Create `src/constants/motion.js`**

```js
// JS mirrors of the CSS motion-duration tokens in src/index.css @theme.
// Deferred-unmount timers need these synchronously (CSS custom properties
// aren't readable before mount without a getComputedStyle round-trip).
// Keep in sync with the tokens:
//   --dur-overlay-out ↔ OVERLAY_EXIT_MS
//   --dur-modal-out   ↔ MODAL_EXIT_MS
export const OVERLAY_EXIT_MS = 120
export const MODAL_EXIT_MS = 150
```

- [ ] **Step 6: Point Popover and WorkspaceDropdown at the shared constant**

In `src/components/ui/Popover.jsx`, delete lines 30–32:
```js
// Keep the panel mounted briefly after close so the exit animation can play.
// Matches the duration of @keyframes dropdownOut in index.css.
const EXIT_MS = 120
```
and add to the imports:
```js
import { OVERLAY_EXIT_MS } from '../../constants/motion'
```
then replace the single usage `}, EXIT_MS)` (line ~66) with `}, OVERLAY_EXIT_MS)`.

In `src/components/layout/WorkspaceDropdown.jsx`, delete line 11 (`const EXIT_MS = 120`), add the import:
```js
import { OVERLAY_EXIT_MS } from '../../constants/motion'
```
and replace the usage `}, EXIT_MS)` (line ~85) with `}, OVERLAY_EXIT_MS)`.

- [ ] **Step 7: Verify suite + build**

Run: `npm run test`
Expected: all tests pass (no behavior changed; Popover.test.jsx and Menu.test.jsx exercise the dropdown timing).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/index.css src/constants/motion.js src/components/ui/Popover.jsx src/components/layout/WorkspaceDropdown.jsx
git commit -m "feat(ui): motion tokens, modal/editor keyframes, unified reduced-motion guard"
```

---

### Task 2: Modal enter/exit + `animated` prop; SearchDialog dedupe; QuickAddBar opt-out

**Files:**
- Modify: `src/components/ui/Modal.jsx`
- Modify: `src/components/SearchDialog.jsx:107`
- Modify: `src/components/board/QuickAddBar.jsx:162-168`
- Test: `src/__tests__/Modal.test.jsx`

**Interfaces:**
- Consumes: `MODAL_EXIT_MS` from `src/constants/motion.js` (Task 1); CSS rules on `[data-modal-backdrop][data-animated]` + `data-state` (Task 1).
- Produces: `Modal` prop `animated` (boolean, default `true`). When `true`: backdrop carries `data-animated` + `data-state="open" | "closed"`, and on `open→false` the DOM stays mounted for `MODAL_EXIT_MS` before removal. When `false`: no data-animated attribute, unmounts immediately (today's behavior). All other props unchanged.

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/Modal.test.jsx`. Extend the RTL import on line 3 to include `act`:

```js
import { render, screen, cleanup, act } from '@testing-library/react'
```

Append inside the `describe('Modal primitive', …)` block:

```jsx
  test('backdrop carries data-animated and data-state="open" while open', () => {
    render(<Harness />)
    const backdrop = document.querySelector('[data-modal-backdrop]')
    expect(backdrop.hasAttribute('data-animated')).toBe(true)
    expect(backdrop.getAttribute('data-state')).toBe('open')
  })

  test('exit is deferred: closing keeps the DOM with data-state="closed", then unmounts', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<Harness />)
      rerender(<Harness open={false} />)
      const backdrop = document.querySelector('[data-modal-backdrop]')
      expect(backdrop).not.toBe(null)
      expect(backdrop.getAttribute('data-state')).toBe('closed')
      act(() => { vi.advanceTimersByTime(200) })
      expect(document.querySelector('[data-modal-backdrop]')).toBe(null)
    } finally {
      vi.useRealTimers()
    }
  })

  test('animated={false} renders no data-animated and unmounts immediately', () => {
    const { rerender } = render(<Harness animated={false} />)
    const backdrop = document.querySelector('[data-modal-backdrop]')
    expect(backdrop.hasAttribute('data-animated')).toBe(false)
    rerender(<Harness animated={false} open={false} />)
    expect(document.querySelector('[data-modal-backdrop]')).toBe(null)
  })

  test('scroll lock and inert release immediately on close, before the exit finishes', () => {
    vi.useFakeTimers()
    try {
      document.body.style.overflow = 'auto'
      const { rerender } = render(<Harness />)
      expect(document.body.style.overflow).toBe('hidden')
      rerender(<Harness open={false} />)
      // Exit animation still playing (DOM mounted), but locks are gone
      expect(document.querySelector('[data-modal-backdrop]')).not.toBe(null)
      expect(document.body.style.overflow).toBe('auto')
      expect(appRoot.hasAttribute('inert')).toBe(false)
      act(() => { vi.advanceTimersByTime(200) })
    } finally {
      vi.useRealTimers()
    }
  })
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/__tests__/Modal.test.jsx`
Expected: the 4 new tests FAIL (no `data-animated`/`data-state` attributes; DOM gone immediately after `open={false}`). All pre-existing tests PASS.

- [ ] **Step 3: Implement in `src/components/ui/Modal.jsx`**

a. Change the first import line to include `useState`, and import the constant:

```js
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MODAL_EXIT_MS } from '../../constants/motion'
```

b. Add the `animated` prop to the signature (after `zIndex = 40,`):

```js
  zIndex = 40,
  // Enter/exit animation (backdrop fade + panel scale). Consumers with
  // bespoke animation (QuickAddBar's pill-bounce) pass false to keep
  // today's instant mount/unmount.
  animated = true,
```

c. Add deferred-unmount state directly after `const mouseDownInsideRef = useRef(false)`:

```js
  // Deferred unmount so the exit animation can play (same pattern as
  // Popover). `open` drives behavior (locks, listeners, data-state);
  // `rendered` only decides whether the DOM exists.
  const [rendered, setRendered] = useState(open)
  useEffect(() => {
    if (open) {
      setRendered(true)
      return
    }
    if (!rendered) return
    if (!animated) {
      setRendered(false)
      return
    }
    const t = setTimeout(() => setRendered(false), MODAL_EXIT_MS)
    return () => clearTimeout(t)
  }, [open, rendered, animated])
```

d. Replace `if (!open) return null` (line 184) with:

```js
  if (!rendered) return null
```

e. Stamp the attributes on the backdrop div — replace its opening tag:

```jsx
    <div
      className={`fixed inset-0 ${backdropClassName} ${contentClassName} ${className}`}
      style={{ zIndex }}
      data-state={open ? 'open' : 'closed'}
      {...(animated ? { 'data-animated': '' } : {})}
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
      data-modal-backdrop
    >
```

No other changes: the scroll-lock, focus, and Escape effects already key on `open`, so they release immediately when `open` flips false (verified by the Step 1 tests).

- [ ] **Step 4: Run the Modal tests**

Run: `npx vitest run src/__tests__/Modal.test.jsx`
Expected: ALL tests pass, including the pre-existing `renders nothing when open=false` (initial `rendered` state is `open`, i.e. `false`) and both stack-aware tests.

- [ ] **Step 5: Remove SearchDialog's now-duplicate panel animation**

In `src/components/SearchDialog.jsx` line 107, remove ` animate-dropdown` from the panel className, leaving:

```jsx
      <div
        className="relative w-full max-w-2xl mx-4 bg-[var(--surface-card)] rounded-xl border-[0.5px] border-[var(--border-default)] shadow-[var(--shadow-raised)] overflow-hidden"
      >
```

- [ ] **Step 6: Opt QuickAddBar out of Modal animation**

In `src/components/board/QuickAddBar.jsx`, the expanded composer's Modal (line 162) keeps its bespoke pill-bounce + backdrop transition — add the prop:

```jsx
    <Modal
      open
      onClose={collapseWithAnim}
      animated={false}
      backdropClassName={`bg-black/10 transition-opacity duration-200 ${collapsing ? 'opacity-0' : 'opacity-100'}`}
      contentClassName="flex items-end justify-center pb-6"
      initialFocusRef={inputRef}
    >
```

- [ ] **Step 7: Full suite + build**

Run: `npm run test`
Expected: all pass (SettingsModal.test.jsx, interactions.test.jsx and other Modal consumers unaffected — enter animation is CSS-only and invisible to jsdom).

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/Modal.jsx src/components/SearchDialog.jsx src/components/board/QuickAddBar.jsx src/__tests__/Modal.test.jsx
git commit -m "feat(ui): modal enter/exit animation with deferred unmount and animated prop"
```

---

### Task 3: CardDetailPanel deferred close

**Files:**
- Modify: `src/components/board/CardDetailPanel.jsx:184-199`

**Interfaces:**
- Consumes: `Modal` deferred exit when `open` flips false (Task 2); `MODAL_EXIT_MS` from `src/constants/motion.js`.
- Produces: nothing new — `onClose` prop contract with BoardsPage unchanged (still called exactly once per close, just `MODAL_EXIT_MS` later).

BoardsPage hard-unmounts the panel (`{editingCardId && <Suspense>…}`), so the exit must be sequenced inside the panel: flip the Modal to `open={false}` first (exit plays), then tell the parent after `MODAL_EXIT_MS`.

- [ ] **Step 1: Add the closing state**

In `src/components/board/CardDetailPanel.jsx`:

a. Verify `useState` is already imported from react (it is — the component has many `useState` calls). Add the constant import next to the other `../..`-style imports:

```js
import { MODAL_EXIT_MS } from '../../constants/motion'
```

b. Add state near the component's other `useState` declarations at the top of the function body:

```js
  const [closing, setClosing] = useState(false)
```

c. Replace `handleSaveAndClose` (line 184):

```js
  const handleSaveAndClose = () => {
    if (closing) return
    handleSave()
    // Flip the Modal closed so its exit animation plays, then unmount via
    // the parent (BoardsPage hard-unmounts us, so it must come second).
    setClosing(true)
    setTimeout(onClose, MODAL_EXIT_MS)
  }
```

d. Change the Modal's `open` prop (line 190) from `open` to:

```jsx
    <Modal
      open={!closing}
```

- [ ] **Step 2: Run the suite**

Run: `npm run test`
Expected: all pass.

- [ ] **Step 3: Manual check (dev server)**

Run: `npm run dev`, open a board, click a card. Expected: panel fades/scales in over ~200ms; pressing Escape, clicking the backdrop, or the back button fades it out (~150ms) instead of popping. Click rapidly on back button — closes once, no error.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/CardDetailPanel.jsx
git commit -m "feat(board): card detail panel exit animation via deferred close"
```

---

### Task 4: Tooltip exit animation

**Files:**
- Modify: `src/components/ui/Tooltip.jsx`
- Test: `src/__tests__/Tooltip.test.jsx`

**Interfaces:**
- Consumes: `OVERLAY_EXIT_MS` from `src/constants/motion.js`; existing `.animate-dropdown-out` class.
- Produces: no API change — Tooltip props unchanged.

- [ ] **Step 1: Update/add tests (they will fail first)**

In `src/__tests__/Tooltip.test.jsx`, replace the `hides content on mouseleave` test (lines 26–34) with:

```jsx
  test('hides content on mouseleave after the exit animation window', () => {
    render(<Tooltip content="Hint" delay={50}><button type="button">trigger</button></Tooltip>)
    const trigger = screen.getByText('trigger')
    fireEvent.mouseEnter(trigger)
    act(() => { vi.advanceTimersByTime(60) })
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.mouseLeave(trigger)
    // Deferred unmount: still in the DOM while the fade-out plays
    expect(screen.getByRole('tooltip')).toBeTruthy()
    act(() => { vi.advanceTimersByTime(130) })
    expect(screen.queryByRole('tooltip')).toBe(null)
  })

  test('re-hovering during the exit cancels it and keeps the tooltip up', () => {
    render(<Tooltip content="Hint" delay={50}><button type="button">trigger</button></Tooltip>)
    const trigger = screen.getByText('trigger')
    fireEvent.mouseEnter(trigger)
    act(() => { vi.advanceTimersByTime(60) })
    fireEvent.mouseLeave(trigger)
    fireEvent.mouseEnter(trigger)
    // Past the exit window — the cancelled exit must not have unmounted it
    act(() => { vi.advanceTimersByTime(200) })
    expect(screen.getByRole('tooltip')).toBeTruthy()
  })
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/__tests__/Tooltip.test.jsx`
Expected: first test FAILS at `expect(screen.getByRole('tooltip')).toBeTruthy()` after mouseleave (tooltip currently unmounts instantly). Second test FAILS or passes vacuously — confirm the first fails.

- [ ] **Step 3: Implement in `src/components/ui/Tooltip.jsx`**

a. Add the import:

```js
import { OVERLAY_EXIT_MS } from '../../constants/motion'
```

b. Add exit state next to the existing state (line 33–36):

```js
  const [open, setOpen] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [pos, setPos] = useState(null)
  const timer = useRef(null)
  const exitTimer = useRef(null)
  const anchorRef = useRef(null)
```

c. Clear both timers on unmount (line 38):

```js
  useEffect(() => () => {
    clearTimeout(timer.current)
    clearTimeout(exitTimer.current)
  }, [])
```

d. Replace `show` and `hide` (lines 58–69):

```js
  const show = () => {
    clearTimeout(timer.current)
    clearTimeout(exitTimer.current)
    setExiting(false)
    timer.current = setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (rect) setPos((POSITION[placement] || POSITION.top)(rect))
      setOpen(true)
    }, delay)
  }
  const hide = () => {
    clearTimeout(timer.current)
    clearTimeout(exitTimer.current)
    if (!open) return
    // Deferred unmount so the fade-out can play (mirrors Popover).
    setExiting(true)
    exitTimer.current = setTimeout(() => {
      setOpen(false)
      setExiting(false)
    }, OVERLAY_EXIT_MS)
  }
```

e. Swap the animation class on the inner tip span (line 101):

```jsx
          <span
            role="tooltip"
            className={`relative block px-2 py-1 text-[11px] font-medium text-white bg-[var(--color-ink)] rounded-md whitespace-nowrap ${exiting ? 'animate-dropdown-out' : 'animate-dropdown'}`}
          >
```

- [ ] **Step 4: Run the Tooltip tests**

Run: `npx vitest run src/__tests__/Tooltip.test.jsx`
Expected: ALL pass (including `disabled`, `null content`, portal, and focus-forwarding tests).

- [ ] **Step 5: Full suite, then commit**

Run: `npm run test` — expected all pass.

```bash
git add src/components/ui/Tooltip.jsx src/__tests__/Tooltip.test.jsx
git commit -m "feat(ui): tooltip exit fade with deferred unmount"
```

---

### Task 5: InlineCardEditor entrance

**Files:**
- Modify: `src/components/board/InlineCardEditor.jsx:163`

**Interfaces:**
- Consumes: `.animate-rise-in` class (Task 1).
- Produces: nothing.

- [ ] **Step 1: Add the class**

In `src/components/board/InlineCardEditor.jsx` line 163, prepend `animate-rise-in` to the root className (the comment above it stays — mount-only opacity/transform doesn't animate the editor's own size):

```jsx
      className="animate-rise-in w-full flex flex-col gap-3 rounded-2xl border border-[var(--color-mist)] p-4 text-left bg-[var(--surface-card)] shadow-[0_4px_24px_rgba(27,27,24,0.10)]"
```

- [ ] **Step 2: Verify + manual check**

Run: `npm run test` — expected all pass.
Manual (dev server): click "New task" in a column. Expected: editor fades in with a subtle 4px rise over ~120ms; caret is in the title field immediately (autofocus unaffected); typing/enter flow feels unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/board/InlineCardEditor.jsx
git commit -m "feat(board): inline card editor entrance animation"
```

---

### Task 6: Motion preference — util, store field, hook, boot wiring, Klay swap

**Files:**
- Create: `src/utils/motion.js`
- Create: `src/hooks/useReducedMotion.js`
- Modify: `src/store/settingsStore.js`
- Modify: `src/main.jsx:69-70`
- Modify: `src/components/layout/AppLayout.jsx` (~lines 15, 50)
- Modify: `src/components/klay/useKlayJourney.js:14-19`
- Test: `src/__tests__/motionPreference.test.js` (create)

**Interfaces:**
- Consumes: nothing from other tasks (independent of Tasks 2–5).
- Produces:
  - `resolveMotion(motion: any) => 'system' | 'full' | 'reduced'` and `applyMotion(motion) => void` from `src/utils/motion.js` (stamps/removes `data-motion` on `document.documentElement`).
  - `useSettingsStore` state `motion: 'system' | 'full' | 'reduced'` (default `'system'`) and action `setMotion(value)`.
  - `useReducedMotion() => boolean` default-export hook from `src/hooks/useReducedMotion.js` (Task 8 uses it in BoardView).

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/motionPreference.test.js`:

```js
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { resolveMotion, applyMotion } from '../utils/motion'
import { useSettingsStore } from '../store/settingsStore'
import useReducedMotion from '../hooks/useReducedMotion'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-motion')
  useSettingsStore.setState({ motion: 'system' })
})

describe('resolveMotion', () => {
  test('passes through the two explicit values', () => {
    expect(resolveMotion('full')).toBe('full')
    expect(resolveMotion('reduced')).toBe('reduced')
  })

  test('anything else resolves to system', () => {
    expect(resolveMotion('system')).toBe('system')
    expect(resolveMotion(undefined)).toBe('system')
    expect(resolveMotion('bogus')).toBe('system')
  })
})

describe('applyMotion', () => {
  test('stamps data-motion for explicit values', () => {
    applyMotion('reduced')
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced')
    applyMotion('full')
    expect(document.documentElement.getAttribute('data-motion')).toBe('full')
  })

  test('removes the attribute for system (media query takes over)', () => {
    applyMotion('reduced')
    applyMotion('system')
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false)
  })
})

describe('settingsStore.motion', () => {
  test('defaults to system', () => {
    expect(useSettingsStore.getState().motion).toBe('system')
  })

  test('setMotion updates state and stamps the attribute', () => {
    useSettingsStore.getState().setMotion('reduced')
    expect(useSettingsStore.getState().motion).toBe('reduced')
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced')
  })
})

describe('useReducedMotion', () => {
  test('reduced setting forces true', () => {
    act(() => { useSettingsStore.getState().setMotion('reduced') })
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  test('full setting forces false', () => {
    act(() => { useSettingsStore.getState().setMotion('full') })
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  test('system falls back to the media query (mocked to false in setup)', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/__tests__/motionPreference.test.js`
Expected: FAIL — `../utils/motion` and `../hooks/useReducedMotion` don't exist.

- [ ] **Step 3: Create `src/utils/motion.js`**

```js
// Motion preference resolution for the 'system' | 'full' | 'reduced'
// setting — the motion twin of utils/theme.js.
//
// 'system' removes the data-motion attribute entirely so the CSS
// prefers-reduced-motion media query in index.css live-follows the OS
// with no JS listener. Explicit values stamp data-motion, which the
// same CSS block reads to force ('reduced') or exempt ('full').

export function resolveMotion(motion) {
  return motion === 'full' || motion === 'reduced' ? motion : 'system'
}

export function applyMotion(motion) {
  const resolved = resolveMotion(motion)
  if (resolved === 'system') {
    document.documentElement.removeAttribute('data-motion')
  } else {
    document.documentElement.setAttribute('data-motion', resolved)
  }
}
```

- [ ] **Step 4: Add the store field**

In `src/store/settingsStore.js`:

a. Add the import below the `applyTheme` import:

```js
import { applyMotion } from '../utils/motion'
```

b. Add state after `theme: 'system',` (line 20):

```js
      motion: 'system', // 'system' | 'full' | 'reduced' — see utils/motion.js
```

c. Add the action after `setTheme` (lines 54–57):

```js
      setMotion: (motion) => {
        set({ motion })
        applyMotion(motion)
      },
```

(No persist version bump — an added field merges with defaults.)

- [ ] **Step 5: Create `src/hooks/useReducedMotion.js`**

```js
import { useSyncExternalStore } from 'react'
import { useSettingsStore } from '../store/settingsStore'

const QUERY = '(prefers-reduced-motion: reduce)'

function hasMatchMedia() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function subscribe(callback) {
  if (!hasMatchMedia()) return () => {}
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  return hasMatchMedia() && window.matchMedia(QUERY).matches
}

/**
 * useReducedMotion — the effective reduce-motion flag for JS-driven
 * animation (Klay journey, dnd-kit drop animation). The CSS side is
 * handled declaratively in index.css; this hook is only for code that
 * sets timers or configures animation in JS.
 *
 * 'reduced' | 'full' override the OS; 'system' follows the live
 * prefers-reduced-motion media query.
 */
export default function useReducedMotion() {
  const motion = useSettingsStore((s) => s.motion)
  const systemReduced = useSyncExternalStore(subscribe, getSnapshot, () => false)
  if (motion === 'reduced') return true
  if (motion === 'full') return false
  return systemReduced
}
```

- [ ] **Step 6: Run the new tests**

Run: `npx vitest run src/__tests__/motionPreference.test.js`
Expected: ALL pass.

- [ ] **Step 7: Boot + AppLayout wiring**

a. In `src/main.jsx`, add to the utils imports:

```js
import { applyMotion } from './utils/motion'
```

and change lines 69–70 from:

```js
const savedTheme = JSON.parse(localStorage.getItem('kolumn-settings') || '{}')?.state?.theme
applyTheme(pickBootTheme(window.location.pathname, savedTheme))
```

to:

```js
const savedSettings = JSON.parse(localStorage.getItem('kolumn-settings') || '{}')?.state
applyTheme(pickBootTheme(window.location.pathname, savedSettings?.theme))
// Motion applies on every route — reduced motion is welcome on marketing
// pages too, unlike the dark theme (whose CSS is app-shell-only).
applyMotion(savedSettings?.motion)
```

b. In `src/components/layout/AppLayout.jsx`, add next to the `applyTheme` import (line 15):

```js
import { applyMotion } from '../../utils/motion'
```

read the setting where `theme` is read from the settings store, and mirror the theme-apply effect (near line 50):

```js
  const motion = useSettingsStore((s) => s.motion)
  useEffect(() => {
    applyMotion(motion)
  }, [motion])
```

(Unlike theme, no unmount cleanup — `data-motion` staying set on marketing routes is correct.)

- [ ] **Step 8: Swap useKlayJourney onto the hook**

In `src/components/klay/useKlayJourney.js`, replace lines 14–19:

```js
export default function useKlayJourney(stationCount, { dwellMs = DWELL_MS, travelMs = TRAVEL_MS } = {}) {
  const reduced = useRef(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current
```

with:

```js
import useReducedMotion from '../../hooks/useReducedMotion'
```
(placed at the top of the file, below the react import — and remove `useRef` from the react import if now unused)

```js
export default function useKlayJourney(stationCount, { dwellMs = DWELL_MS, travelMs = TRAVEL_MS } = {}) {
  const reduced = useReducedMotion()
```

The hook's return contract (`{ station, phase, reduced }`) is unchanged.

- [ ] **Step 9: Full suite + build**

Run: `npm run test`
Expected: all pass — pay attention to `useKlayJourney.test.js` and `KlayJourney.test.jsx` (they mock `matchMedia`; the hook reads the same query through the same mock).

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/utils/motion.js src/hooks/useReducedMotion.js src/store/settingsStore.js src/main.jsx src/components/layout/AppLayout.jsx src/components/klay/useKlayJourney.js src/__tests__/motionPreference.test.js
git commit -m "feat(settings): motion preference (system/full/reduced) with data-motion wiring"
```

---

### Task 7: Settings UI — Accessibility section

**Files:**
- Modify: `src/components/settings/GeneralSection.jsx`
- Test: `src/__tests__/motionPreference.test.js` (extend) — rendering test uses `src/__tests__/GeneralAccessibility.test.jsx` (create)

**Interfaces:**
- Consumes: `useSettingsStore` `motion`/`setMotion` (Task 6); `SettingsSection`, `SettingsRow`, `SegmentedControl` (existing).
- Produces: nothing consumed later.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/GeneralAccessibility.test.jsx`:

```jsx
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import GeneralSection from '../components/settings/GeneralSection'
import { useSettingsStore } from '../store/settingsStore'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-motion')
  useSettingsStore.setState({ motion: 'system' })
})

describe('GeneralSection — Accessibility', () => {
  test('renders the Motion control with the three options', () => {
    render(<GeneralSection />)
    expect(screen.getByText('Accessibility')).toBeInTheDocument()
    const group = screen.getByRole('radiogroup', { name: 'Motion' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'System' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Full' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Reduced' })).toBeInTheDocument()
  })

  test('selecting Reduced updates the store and stamps data-motion', () => {
    render(<GeneralSection />)
    fireEvent.click(screen.getByRole('radio', { name: 'Reduced' }))
    expect(useSettingsStore.getState().motion).toBe('reduced')
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced')
  })
})
```

Note: if `SegmentedControl` renders options as `role="radio"` only when given `ariaLabel`/`label` differently than assumed, mirror how `src/__tests__/SegmentedControl.test.jsx` queries options and adjust the queries — the assertion targets (store value + `data-motion` attribute) stay the same.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/__tests__/GeneralAccessibility.test.jsx`
Expected: FAIL — no "Accessibility" text, no Motion radiogroup.

- [ ] **Step 3: Implement in `src/components/settings/GeneralSection.jsx`**

Replace the whole file:

```jsx
import { Desktop, Moon, Sun } from '@phosphor-icons/react'
import { useSettingsStore } from '../../store/settingsStore'
import SegmentedControl from '../ui/SegmentedControl'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function GeneralSection() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const font = useSettingsStore((s) => s.font)
  const setFont = useSettingsStore((s) => s.setFont)
  const motion = useSettingsStore((s) => s.motion)
  const setMotion = useSettingsStore((s) => s.setMotion)

  return (
    <>
      <SettingsSection title="Preferences">
        <SettingsRow title="Appearance" description="System follows your OS preference.">
          <SegmentedControl
            ariaLabel="Appearance"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', icon: <Desktop size={16} />, ariaLabel: 'System' },
              { value: 'light', icon: <Sun size={16} />, ariaLabel: 'Light' },
              { value: 'dark', icon: <Moon size={16} />, ariaLabel: 'Dark' },
            ]}
          />
        </SettingsRow>
        <SettingsRow title="Font" description="Typeface used on cards.">
          <SegmentedControl
            ariaLabel="Font"
            value={font}
            onChange={setFont}
            options={[
              // 'mona-sans' is the persisted enum for "default sans" (now Inter) — kept
              // for stored prefs across two font migrations
              { value: 'mona-sans', label: 'Inter' },
              { value: 'sf-mono', label: 'SF Mono' },
            ]}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Accessibility">
        <SettingsRow
          title="Motion"
          description="Reduce animations and transitions. System follows your OS preference."
        >
          <SegmentedControl
            ariaLabel="Motion"
            value={motion}
            onChange={setMotion}
            options={[
              { value: 'system', label: 'System' },
              { value: 'full', label: 'Full' },
              { value: 'reduced', label: 'Reduced' },
            ]}
          />
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
```

If the settings pane stacks sections without spacing (check how SettingsModal's General pane composes ProfileSection + GeneralSection — the pane container may already apply a vertical gap), and the two sections render flush against each other, add `className="mt-8"` to the Accessibility `SettingsSection` **only if** `SettingsSection` accepts a className prop; otherwise wrap it per the pane's existing spacing pattern.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/__tests__/GeneralAccessibility.test.jsx src/__tests__/settingsSections.test.jsx src/__tests__/SettingsModal.test.jsx`
Expected: ALL pass.

- [ ] **Step 5: Manual check (dev server)**

Open Settings → General. Expected: "Accessibility" heading below Preferences with the Motion segmented control, visually matching the Appearance row (same control height, same title/description typography). Selecting "Reduced" makes overlays open/close instantly (verify by opening the workspace dropdown and ⌘K). Selecting "System" restores animation (assuming OS motion is on).

- [ ] **Step 6: Full suite, then commit**

Run: `npm run test` — expected all pass.

```bash
git add src/components/settings/GeneralSection.jsx src/__tests__/GeneralAccessibility.test.jsx
git commit -m "feat(settings): accessibility section with motion preference control"
```

---

### Task 8: Drag-and-drop drop settle

**Files:**
- Modify: `src/components/board/BoardView.jsx:4,170`

**Interfaces:**
- Consumes: `useReducedMotion` from `src/hooks/useReducedMotion.js` (Task 6).
- Produces: nothing.

- [ ] **Step 1: Restore the drop animation**

In `src/components/board/BoardView.jsx`:

a. Add the hook import next to the other hook imports:

```js
import useReducedMotion from '../../hooks/useReducedMotion'
```

b. Read it inside the component body (top of the component with the other hooks):

```js
  const reducedMotion = useReducedMotion()
```

c. Change line 170 from:

```jsx
      <DragOverlay dropAnimation={null}>
```

to:

```jsx
      {/* undefined = dnd-kit's default ~250ms drop settle; null (reduced
          motion) = snap instantly, the pre-motion-pass behavior. */}
      <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
```

- [ ] **Step 2: Run the suite**

Run: `npm run test`
Expected: all pass — especially `dndPersistRace.test.js` (the cc380ca regression suite) and `dndPersistRace`-adjacent board tests.

- [ ] **Step 3: Manual flicker regression check (dev server) — the acceptance gate**

With `npm run dev` open on a board with 2+ columns and several cards:

1. Drag a card to another column, drop. Expected: overlay settles into its slot over ~250ms; **no** flash of the card at its old position, no whole-board repaint.
2. Rapidly drag two different cards cross-column back-to-back (the cc380ca race). Expected: both land where dropped; no revert-flash when the server reconcile returns.
3. Drag a card within its own column. Expected: smooth settle, neighbors glide.
4. Toggle Settings → Accessibility → Motion → Reduced, repeat a cross-column drag. Expected: instant snap (no settle).

If step 1 or 2 shows the released card flashing at the origin, replace `undefined` with a `dropAnimation` object using `defaultDropAnimationSideEffects` from `@dnd-kit/core` to suppress the source-card opacity flash:

```jsx
import { defaultDropAnimationSideEffects } from '@dnd-kit/core'

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
}
```

and pass `dropAnimation={reducedMotion ? null : dropAnimation}`. If it still can't be made clean, revert to `null` and add a code comment recording what was observed.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/BoardView.jsx
git commit -m "feat(board): restore drag-drop settle animation, honoring reduced motion"
```

---

### Task 9: Final verification

**Files:** none (verification only; fixes go through the task they belong to).

- [ ] **Step 1: Automated gates**

Run: `npm run build` — expected: success, no warnings introduced.
Run: `npm run test` — expected: full suite green.
Run: `npm run lint` — expected: clean.

- [ ] **Step 2: Full manual pass (dev server, per the spec's test list)**

- Settings modal: open (fade+scale in), close via Escape, backdrop, and the X (fade out each way).
- Card detail panel: open from a card click and from ⌘K → Enter; close via Escape/backdrop/back button.
- ⌘K search: open and close — no double animation, single clean scale-fade both ways.
- QuickAddBar: expand and collapse — pill-bounce unchanged (no added fade beneath it).
- A confirm/destructive dialog (e.g. delete board) — animates in.
- Workspace dropdown, notification bell, card context menus — unchanged feel.
- Tooltip (hover a card's assignee avatar): fades in AND out; rapid hover on/off doesn't strand a stuck tooltip.
- Inline card editor: New task → rises in; rapid consecutive creates feel instant.
- Drag-and-drop: settle on drop; cc380ca flicker scenarios clean (Task 8 list).
- Reduce motion: (a) Settings → Reduced: all of the above become instant, including drop settle and AI shimmer; (b) Settings → System + macOS `System Settings → Accessibility → Display → Reduce motion` ON: same instant behavior; (c) Settings → Full with OS reduce ON: animations play (in-app override wins).
- Dark mode spot-check: modal backdrop fade looks right on dark theme.

- [ ] **Step 3: Update CLAUDE.md tokens/conventions if needed**

If everything above passes, add one line to the Design System section of `CLAUDE.md` noting the motion tokens + `src/constants/motion.js` pairing and the `data-motion` attribute (keeps the coherency rules discoverable). Commit as `docs: record motion tokens and reduce-motion setting in CLAUDE.md`.
