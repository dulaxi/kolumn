/**
 * Klay — Kolumn's mascot. Sprite data + animation library.
 *
 * Authoring rules live in .claude/skills/klay/SKILL.md. The short version:
 * - Coarse grid 12×11 (Klay himself), fine grid 24×22 (props, half-pixels).
 * - Klay is 4 colors only: olive, lime, mauve, ink. MAUVE IS KLAY'S ALONE —
 *   props use honey/copper/sand/mist/charcoal/cream/lime instead.
 * - 2–5 frames per animation, 150–600ms per frame. Low fps IS the charm.
 * - Design new animations in docs/design-mockups/klay-detailed-props.html
 *   first (hot-reload studio), then port the frames here.
 */

export const PALETTE = {
  o: '#8BA32E', // olive — stem (Klay)
  l: '#C2D64A', // lime — leaves (Klay)
  m: '#A8969E', // mauve — pot (KLAY ONLY, never props)
  k: '#1B1B18', // ink — eyes (Klay)
  w: '#FDFBF7', // cream — props
  h: '#D4A843', // honey — props
  c: '#C27A4A', // copper — props
  s: '#E0DBD5', // sand — props
  K: '#5C5C57', // charcoal — prop shading
  S: '#C4BFB8', // mist — prop shading
}

export const COARSE_COLS = 12
export const COARSE_ROWS = 11
export const FINE_COLS = 24
export const FINE_ROWS = 22

const E = '............'

// ── Poses (coarse 12×11; pot cols 3-8, eyes y5, feet y7, sprout y1-3) ──
export const BASE = [E, '......l.....', '.....lll....', '......o.....', '...mmmmmm...', '...mkmmkm...', '...mmmmmm...', '....m..m....', E, E, E]
export const DOWN = [E, E, '......l.....', '.....lll....', '......o.....', '...mmmmmm...', '...mkmmkm...', '...mmmmmm...', '....m..m....', E, E]
export const UP1 = ['......l.....', '.....lll....', '......o.....', '...mmmmmm...', '...mkmmkm...', '...mmmmmm...', '....m..m....', E, E, E, E]

// Eye rows (swap into y5 of BASE / y6 of DOWN / y4 of UP1)
export const EYES = {
  center: '...mkmmkm...',
  closed: '...mmmmmm...',
  left: '...kmmkmm...',
  right: '...mmkmmk...',
}
// Blush row (swap into the row below the eyes)
export const BLUSH = '...mommom...'

/**
 * Build a frame: `base` pose, optional row overrides (coarse), optional
 * `hi` sparse fine-grid rows ({rowIndex: '24-char string'}), duration ms.
 */
export function frame(base, mod, hi, ms) {
  const map = base.slice()
  if (mod) for (const y in mod) map[+y] = mod[y]
  return { map, hi: hi || null, ms: ms || 300 }
}

// ── Core animation library (the shipped set — extend freely) ──
export const ANIMATIONS = {
  idle: [
    frame(BASE, null, null, 550),
    frame(DOWN, null, null, 550),
  ],
  blink: [
    frame(BASE, null, null, 2400),
    frame(BASE, { 5: EYES.closed }, null, 140),
  ],
  look: [
    frame(BASE, null, null, 900),
    frame(BASE, { 5: EYES.left }, null, 700),
    frame(BASE, null, null, 500),
    frame(BASE, { 5: EYES.right }, null, 700),
  ],
  tap: [
    frame(BASE, null, null, 260),
    frame(BASE, { 7: '....m.......', 8: '.......m....' }, null, 200),
    frame(BASE, null, null, 200),
    frame(BASE, { 7: '....m.......', 8: '.......m....' }, null, 200),
  ],
  walk: [
    frame(BASE, { 7: '....m...m...' }, null, 190),
    frame(DOWN, null, null, 190),
    frame(BASE, { 7: '...m...m....' }, null, 190),
    frame(DOWN, null, null, 190),
  ],
  hop: [
    frame(DOWN, { 8: '.....mm.....' }, null, 180),
    frame(UP1, { 6: '.....mm.....' }, null, 240),
    frame(BASE, null, null, 700),
  ],
  grow: [
    frame(BASE, { 1: E, 2: E, 3: E }, null, 800),
    frame(BASE, { 1: E, 2: '......l.....', 3: '......o.....' }, null, 800),
    frame(BASE, null, null, 800),
    frame(BASE, { 0: '.....lml....' }, null, 1400),
  ],
  wilt: [
    frame(BASE, { 1: '.......l....', 2: '......ll....' }, null, 700),
    frame(BASE, { 1: E, 2: '......ll....', 4: '...mmmmmm..l' }, null, 500),
    frame(BASE, { 1: E, 2: '.......l....', 5: EYES.closed, 10: '..........l.' }, null, 1200),
  ],
  sleep: [
    frame(BASE, { 5: EYES.closed, 1: '......l..l..' }, null, 800),
    frame(BASE, { 5: EYES.closed, 0: '..........l.' }, null, 800),
  ],
  delight: [
    frame(BASE, { 6: BLUSH }, null, 500),
    frame(BASE, null, null, 400),
  ],
  sit: [
    frame(BASE, null, null, 700),
    frame(BASE, { 7: '.....mm.....' }, null, 300),
    frame(DOWN, { 8: E }, null, 1600),
    frame(BASE, { 7: '.....mm.....' }, null, 300),
  ],
  deliver: [
    frame(BASE, { 4: '...mmmmmmww.', 5: '...mkmmkmww.', 7: '....m...m...' }, null, 200),
    frame(DOWN, { 5: '...mmmmmmww.', 6: '...mkmmkmww.', 8: '...m...m....' }, null, 200),
  ],
}
