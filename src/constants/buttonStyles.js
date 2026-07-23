// Shared toolbar/header button styling — filled secondary (no border), subtle
// field shadow, primary text. Used by the board toolbar (BoardSelector,
// FilterPill, GhostToggle) and the Chat/Builder page headers so every
// secondary header control reads identically. Compose:
//   `${TOOLBAR_BTN} ${TOOLBAR_BTN_FILL}`          → text button
//   `${TOOLBAR_ICON_BTN} ${TOOLBAR_BTN_FILL}`     → icon-only square
// Active/state variants swap the fill (e.g. color-mauve-cream) in place of
// TOOLBAR_BTN_FILL.

// Shape only (layout + shadow) — pair with a fill class.
const SHAPE =
  'rounded-lg shadow-[0_1px_2px_rgba(27,27,24,0.05)] transition-colors duration-75 cursor-pointer active:scale-[0.995]'

export const TOOLBAR_BTN = `flex items-center gap-1.5 h-8 px-3 text-sm font-medium ${SHAPE}`
export const TOOLBAR_ICON_BTN = `relative flex items-center justify-center h-8 w-8 ${SHAPE}`
export const TOOLBAR_BTN_FILL =
  'bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
// Primary (ink/black) fill — same shape as TOOLBAR_BTN, inverted colours. For
// the New chat / New build CTAs so they share the toolbar button behaviour.
export const TOOLBAR_BTN_FILL_PRIMARY =
  'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)]'
