// JS mirrors of the CSS motion-duration tokens in src/index.css @theme.
// Deferred-unmount timers need these synchronously (CSS custom properties
// aren't readable before mount without a getComputedStyle round-trip).
// Keep in sync with the tokens:
//   --dur-overlay-out ↔ OVERLAY_EXIT_MS
//   --dur-modal-out   ↔ MODAL_EXIT_MS
export const OVERLAY_EXIT_MS = 120
export const MODAL_EXIT_MS = 150
