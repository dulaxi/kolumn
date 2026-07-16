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
  b: '#1A5DBA', // blueprint blue — props (Kolumn's --label-blue-text)
  B: '#DCEBF9', // blueprint line — props (Kolumn's --label-blue-bg)
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

// LEFT poses — Klay at coarse cols 0-5 instead of 3-8. Centred, he leaves only
// 3 coarse cols for props (a 6px sliver); shifted left, the prop layer gets
// cols 6-11 = 12 fine px, which is enough to draw a scene. Use for
// prop-heavy animations; keep BASE for Klay-only ones.
export const LEFT = [E, '...l........', '..lll.......', '...o........', 'mmmmmm......', 'mkmmkm......', 'mmmmmm......', '.m..m.......', E, E, E]
export const LEFT_DOWN = [E, E, '...l........', '..lll.......', '...o........', 'mmmmmm......', 'mkmmkm......', 'mmmmmm......', '.m..m.......', E, E]
export const LEFT_EYES = {
  center: 'mkmmkm......',
  closed: 'mmmmmm......',
  left: 'kmmkmm......',
  right: 'mmkmmk......',
}

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

/**
 * hi(art, x, y) — place a small art block on the fine grid, returning the
 * sparse {rowIndex: '24-char string'} shape `frame` expects. Beats
 * hand-counting dots, which is how props end up one pixel off.
 */
export function hi(art, x, y) {
  const rows = {}
  art.forEach((line, i) => {
    const row = '.'.repeat(x) + line
    rows[y + i] = row + '.'.repeat(Math.max(0, FINE_COLS - row.length))
  })
  return rows
}

// ── Props for the empty-state set ────────────────────────────────────────
// Cream (#FDFBF7) is invisible on the cream page (#FAF8F6) — every cream prop
// carries a mist outline so it exists in light mode. Sand reads unaided.
const BUB_S = ['SS', 'SS']
const BUB_M = ['.SSSS.', 'SwwwwS', 'SwwwwS', '.SSSS.', '.S....']
const BUB_BIG = ['.SSSSSSSS.', 'SwwwwwwwwS', 'SwkwkwkwwS', 'SwwwwwwwwS', '.SSSSSSSS.', '.S........']
const BUB_IN = ['.SSSSSSSS.', 'SwwwwwwwwS', 'SwwkwkwkwS', 'SwwwwwwwwS', '.SSSSSSSS.', '........S.']

// Blueprint: deep blue paper, pale blue drafting lines.
const BP_ROLL = ['bb', 'bb', 'bb', 'bb', 'bb', 'bb', 'bb', 'bb']
const BP_U1 = ['bbbb', 'bbbb', 'bbbb', 'bbbb', 'bbbb', 'bbbb', 'bbbb', 'bbbb']
const BP_U2 = ['bbbbbbb', 'bbbbbbb', 'bbbbbbb', 'bbbbbbb', 'bbbbbbb', 'bbbbbbb', 'bbbbbbb', 'bbbbbbb']
const BP_BLANK = ['bbbbbbbbbb', 'bbbbbbbbbb', 'bbbbbbbbbb', 'bbbbbbbbbb', 'bbbbbbbbbb', 'bbbbbbbbbb', 'bbbbbbbbbb', 'bbbbbbbbbb']
const BP_C1 = ['bbbbbbbbbb', 'bBBbbbbbbb', 'bBBbbbbbbb', 'bBBbbbbbbb', 'bBBbbbbbbb', 'bBBbbbbbbb', 'bBBbbbbbbb', 'bbbbbbbbbb']
const BP_C2 = ['bbbbbbbbbb', 'bBBbBBbbbb', 'bBBbBBbbbb', 'bBBbBBbbbb', 'bBBbBBbbbb', 'bBBbBBbbbb', 'bBBbBBbbbb', 'bbbbbbbbbb']
const BP_C3 = ['bbbbbbbbbb', 'bBBbBBbBBb', 'bBBbBBbBBb', 'bBBbBBbBBb', 'bBBbBBbBBb', 'bBBbBBbBBb', 'bBBbBBbBBb', 'bbbbbbbbbb']

// Teammate: sand pot walking in from the right. Sand, never mauve — the
// palette rule makes "that one isn't Klay" legible for free.
const MATE_FAR = { 1: '...l........', 2: '..lll.......', 3: '...o.......o', 4: 'mmmmmm.....s', 5: 'mkmmkm.....s', 6: 'mmmmmm.....s', 7: '.m..m.......' }
const MATE_MID = { 1: '...l......l.', 2: '..lll....lll', 3: '...o......o.', 4: 'mmmmmm..ssss', 5: 'mkmmkm..skss', 6: 'mmmmmm..ssss', 7: '.m..m....s.s' }
const MATE = { 1: '...l.....l..', 2: '..lll...lll.', 3: '...o.....o..', 4: 'mmmmmm.sssss', 5: 'mkmmkm.sksks', 6: 'mmmmmm.sssss', 7: '.m..m...s.s.' }
const MATE_DOWN = { 2: '...l.....l..', 3: '..lll...lll.', 4: '...o.....o..', 5: 'mmmmmm.sssss', 6: 'mkmmkm.sksks', 7: 'mmmmmm.sssss', 8: '.m..m...s.s.' }

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

  // ── Empty-state set (LEFT pose; long loops) ──────────────────────────
  // These run ~3-4s rather than the core set's ~1-2s: an empty state is read,
  // not glanced at, so each loop opens on a beat, builds a step at a time, and
  // holds its payoff ~1s. Same low frame rate — the story is longer, not slower.
  // Design record: docs/design-mockups/klay-emptystate-finals.html

  // Chat: a whole exchange — Klay asks, a reply comes back.
  converse: [
    frame(LEFT, null, null, 700),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BUB_S, 14, 8), 200),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BUB_M, 13, 5), 200),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BUB_BIG, 13, 2), 950),
    frame(LEFT, { 5: LEFT_EYES.center }, null, 350),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BUB_S, 14, 10), 200),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BUB_IN, 13, 8), 950),
    frame(LEFT, { 5: LEFT_EYES.center }, null, 450),
  ],

  // Builder: the plan unrolls, then three columns get drafted onto it.
  blueprint: [
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BP_ROLL, 13, 4), 550),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BP_U1, 13, 4), 220),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BP_U2, 13, 4), 220),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BP_BLANK, 13, 4), 450),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BP_C1, 13, 4), 320),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BP_C2, 13, 4), 320),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(BP_C3, 13, 4), 1100),
  ],

  // Workspace: Klay alone, someone walks in, they settle together.
  duo: [
    frame(LEFT, null, null, 650),
    frame(LEFT, MATE_FAR, null, 250),
    frame(LEFT, MATE_MID, null, 250),
    frame(LEFT, MATE, null, 450),
    frame(LEFT, MATE_DOWN, null, 420),
    frame(LEFT, MATE, null, 420),
    frame(LEFT, MATE_DOWN, null, 420),
    frame(LEFT, MATE, null, 1000),
  ],
}
