# App-wide Motion Pass — Design

**Date:** 2026-07-28
**Status:** Approved (brainstorm complete)

## Problem

Most surfaces in Kolumn appear and disappear instantly, which makes the app
feel like a document, not an app. The audit found the motion *vocabulary*
already exists (`dropdownIn`/`dropdownOut`, ghost settle, sidebar transition)
but was never applied to the largest surfaces:

- `Modal.jsx` has zero enter/exit animation — so SettingsModal,
  CardDetailPanel, every confirm dialog, and the QuickAddBar composer all pop.
- Tooltip and SearchDialog animate in but vanish instantly on close.
- Drag-and-drop drop settle is disabled (`dropAnimation={null}` in
  `BoardView.jsx`).
- Durations/easings are scattered literals (75/120/150/200/260/300ms).
- `prefers-reduced-motion` covers only 3 of ~14 animations.

## Approach (decided)

**Pure CSS** — extend the existing keyframe vocabulary. This is what
claude.ai (Radix `data-state` + CSS keyframes), Linear, Notion, and Figma
ship for overlay chrome: `transform`/`opacity`-only animations that run on
the compositor thread. The `motion` package stays landing-only. No new
dependencies.

Feel target: subtle. Overlays 150–250ms enter (decelerating ease-out),
~2/3-as-long exit (ease-in). Nothing bounces.

## Design

### 1. Motion tokens (`src/index.css` `@theme`)

```css
--dur-overlay-in: 150ms;   /* popover/menu/tooltip enter */
--dur-overlay-out: 120ms;  /* popover/menu exit */
--dur-modal-in: 200ms;     /* modal panel + backdrop enter */
--dur-modal-out: 150ms;    /* modal panel + backdrop exit */
--dur-editor-in: 120ms;    /* InlineCardEditor entrance */
--ease-enter: cubic-bezier(0.16, 1, 0.3, 1);  /* decelerating, Radix-style */
--ease-exit: cubic-bezier(0.4, 0, 1, 1);      /* ease-in */
```

Existing keyframe rules (`.animate-dropdown`, `.animate-dropdown-out`, and
the JS `EXIT_MS` constants in `Popover.jsx` / `WorkspaceDropdown.jsx`)
migrate onto these tokens so every animation duration has one source of
truth. JS reads durations via constants that match the tokens (documented
pairing; CSS custom properties aren't readable synchronously pre-mount
without a `getComputedStyle` call — a comment links the two).

### 2. Modal enter/exit (the core fix)

Port the `rendered`/`exiting` deferred-unmount pattern from `Popover.jsx`
into `Modal.jsx`:

- **Backdrop:** fades in over `--dur-modal-in`, out over `--dur-modal-out`
  (reuses the existing orphan `fadeIn` keyframe + a new `fadeOut`).
- **Panel:** fade + scale `0.96 → 1` + `translateY(4px → 0)`, new keyframes
  `modalIn` / `modalOut`.
- **The `display: contents` wrinkle:** Modal's inner wrapper is
  `display: contents` and cannot animate. Decision: Modal stamps
  `data-state="open" | "closed"` on the backdrop element, and `index.css`
  carries two scoped rules — backdrop fade on
  `[data-modal-backdrop][data-state=…]` itself, panel motion on
  `[data-modal-backdrop][data-state=…] > [role] > *` (the contents
  wrapper's layout children). This keeps Modal's layout contract intact
  (children remain effective flex items of the backdrop for centering) and
  requires zero consumer markup changes.
- **Exit requires staying mounted.** Deferred unmount inside Modal only
  plays when the consumer flips `open` to false while keeping the element
  mounted. Consumer census (verified in code):
  - **Already prop-driven — exit works free:** SettingsModal
    (`open={settingsOpen}`, always mounted in AppLayout), SearchDialog
    (`open={open}`).
  - **CardDetailPanel:** hard-unmounted by BoardsPage
    (`{editingCardId && <Suspense>…}`). Fix inside the panel: a `closing`
    state — close actions run `handleSave()`, set `closing`, render
    `<Modal open={!closing}>`, and call the parent `onClose` after
    `MODAL_EXIT_MS`. No BoardsPage changes.
  - **QuickAddBar composer:** already has bespoke pill-bounce enter/exit
    and its own backdrop opacity transition. It passes a new
    `animated={false}` prop (default `true`) so Modal's animation doesn't
    double up. `animated={false}` also skips the deferred unmount.
  - **Leave enter-only:** remaining conditional modals (CreateBoardModal,
    BoardActivityModal, etc.); they gain the enter animation for free.
- **SearchDialog dedupe:** remove its own `animate-dropdown` panel class so
  it doesn't double-animate once Modal animates.
- Escape/focus behavior unchanged: `handleClose` fires immediately;
  interaction is never gated on the exit animation. During exit the backdrop
  gets `pointer-events-none` (same as Popover's exiting state).

### 3. Symmetric exits for the stragglers

- **Tooltip:** reuses `animate-dropdown-out` (120ms scale+fade, symmetric
  with its `animate-dropdown` enter) with the same deferred-unmount
  pattern. Hovering back during the exit cancels it.
- **SearchDialog:** exit comes free from §2.

### 4. Drag-and-drop settle

Restore `dropAnimation` in `BoardView.jsx` (`dropAnimation={null}` →
dnd-kit's default drop animation, ~250ms ease), except under effective
reduced motion, where it stays `null` (via `useReducedMotion()`).
Note: `dropAnimation={null}` predates the cc380ca flicker fix (that commit
touched only the store persistence layer), so this is independent of it.
**Acceptance gate:** the cross-column drag flicker fixed in cc380ca must
not regress — re-test that exact scenario in the browser. If flicker returns, tune
`dropAnimation.sideEffects` (e.g. suppress the source-card opacity flash)
rather than reverting to `null`. If it can't be made clean, keep `null` and
record why in a code comment.

### 5. InlineCardEditor entrance

Mount-only 120ms fade + 4px rise (opacity/transform only). No exit
animation, no layout/size transitions — the existing "No transition-all"
comment stays honored, and input focus is not delayed (autofocus fires on
mount as today).

### 6. Reduced-motion architecture

One global guard replaces the three scattered ones. Three-state interaction
between the OS preference and the in-app setting:

```css
/* OS says reduce, and the user hasn't explicitly opted back into motion */
@media (prefers-reduced-motion: reduce) {
  :root:not([data-motion="full"]) :is(.animate-dropdown, .animate-dropdown-out,
    .animate-modal-in, …) { animation: none !important; }
}
/* In-app setting forces reduce regardless of OS */
:root[data-motion="reduced"] :is(…same list…) { animation: none !important; }
```

- Covers all enter/exit + decorative animations (dropdown, modal, ghost,
  pill-bounce, shimmer, letter-wave, toast pulse, slide-in-right).
- Hover `transition-colors` is exempt (not motion in the vestibular sense).
- With animations set to `none`, surfaces appear/disappear instantly and the
  deferred-unmount timers still run — harmless 120–150ms mount tail, no
  behavior change.
- No JS listener needed for the CSS side: `'system'` means no forcing
  attribute, so the media query live-follows the OS.

### 7. Motion setting (Accessibility)

- **Store:** `settingsStore` gains `motion: 'system' | 'full' | 'reduced'`
  (default `'system'`) + `setMotion(value)`. Follows the `theme` pattern;
  persist version stays 1 (additive field, merge handles it).
- **Apply:** `src/utils/motion.js` mirrors `utils/theme.js` —
  `applyMotion(motion)` stamps `data-motion="full" | "reduced"` on
  `document.documentElement`, or removes the attribute for `'system'`.
  Called from `setMotion` and once at app boot alongside `applyTheme`.
- **JS hook:** `useReducedMotion()` returns the *effective* boolean
  (setting, falling back to a live `matchMedia('(prefers-reduced-motion:
  reduce)')` subscription when `'system'`). `useKlayJourney.js` switches to
  it; `PixelKlay`'s `paused` prop keeps working.
- **UI:** new `SettingsSection title="Accessibility"` in
  `GeneralSection.jsx`, below Preferences. One `SettingsRow` titled
  "Motion", description "Reduce animations and transitions. System follows
  your OS preference." Control: `SegmentedControl` with labeled options
  System / Full / Reduced (same pattern as Appearance).

## Out of scope (deliberate)

- No route/page transitions (Linear/Notion ship none).
- No `motion` library usage in app UI.
- No stagger/orchestration choreography.
- Toasts keep react-hot-toast default animations.
- SettingsModal pane switching stays instant (matches claude.ai).
- Popover/Menu/WorkspaceDropdown/NotificationBell keep their existing
  animation behavior (token migration only, no feel change).

## Testing

- **Unit (Vitest):** Modal deferred unmount (open→false keeps DOM for the
  exit window, then removes); Tooltip exit unmount; `settingsStore.motion`
  default + `setMotion` stamps `data-motion`; `useReducedMotion` resolves
  setting × media query; existing Modal-consumer tests still pass.
- **Manual (dev server):** open/close Settings, CardDetailPanel, ⌘K,
  QuickAddBar composer, a confirm dialog; drag a card across columns
  (flicker regression from cc380ca); toggle the Motion setting to Reduced
  and confirm overlays snap; toggle OS reduce-motion with setting on Full
  and confirm motion persists.
- `npm run build`, `npm run test`, `npm run lint`.
