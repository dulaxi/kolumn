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
export const LEFT_UP = ['...l........', '..lll.......', '...o........', 'mmmmmm......', 'mkmmkm......', 'mmmmmm......', '.m..m.......', E, E, E, E]
export const LEFT_EYES = {
  center: 'mkmmkm......',
  closed: 'mmmmmm......',
  left: 'kmmkmm......',
  right: 'mmkmmk......',
}
// Arm-out row for LEFT poses (pot row extended one px toward the prop).
const LEFT_ARM = 'mmmmmmm.....'

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

/**
 * merge(...layers) — overlay several sparse fine-grid layers (later wins per
 * pixel). Lets a frame compose independent props (two cards, moon + z's)
 * without hand-weaving their rows.
 */
function merge(...layers) {
  const out = {}
  for (const layer of layers) {
    for (const y in layer) {
      if (!out[y]) {
        out[y] = layer[y]
        continue
      }
      const a = out[y]
      const b = layer[y]
      out[y] = Array.from({ length: FINE_COLS }, (_, i) => (b[i] && b[i] !== '.' ? b[i] : a[i] || '.')).join('')
    }
  }
  return out
}

// Teammate: sand pot walking in from the right. Sand, never mauve — the
// palette rule makes "that one isn't Klay" legible for free.
const MATE_FAR = { 1: '...l........', 2: '..lll.......', 3: '...o.......o', 4: 'mmmmmm.....s', 5: 'mkmmkm.....s', 6: 'mmmmmm.....s', 7: '.m..m.......' }
const MATE_MID = { 1: '...l......l.', 2: '..lll....lll', 3: '...o......o.', 4: 'mmmmmm..ssss', 5: 'mkmmkm..skss', 6: 'mmmmmm..ssss', 7: '.m..m....s.s' }
const MATE = { 1: '...l.....l..', 2: '..lll...lll.', 3: '...o.....o..', 4: 'mmmmmm.sssss', 5: 'mkmmkm.sksks', 6: 'mmmmmm.sssss', 7: '.m..m...s.s.' }
const MATE_DOWN = { 2: '...l.....l..', 3: '..lll...lll.', 4: '...o.....o..', 5: 'mmmmmm.sssss', 6: 'mkmmkm.sksks', 7: 'mmmmmm.sssss', 8: '.m..m...s.s.' }

// ── Props for the dashboard perch set ────────────────────────────────────
// board(specks): 10×7 sand board, mist frame, charcoal specks at [x,y].
function board(specks) {
  const g = Array.from({ length: 7 }, () => Array(10).fill('s'))
  for (let i = 0; i < 10; i++) {
    g[0][i] = 'S'
    g[6][i] = 'S'
  }
  for (let r = 0; r < 7; r++) {
    g[r][0] = 'S'
    g[r][9] = 'S'
  }
  specks.forEach(([x, y]) => {
    g[y][x] = 'K'
  })
  return g.map((r) => r.join(''))
}
// bar(x, h, tip): sand column, 3 fine px wide, bottom on the floor line
// (fine y15 = Klay's feet). Optional lime crown for the sprouting variant.
function bar(x, h, tip) {
  const rows = {}
  for (let i = 0; i < h; i++) rows[15 - i] = '.'.repeat(x) + 'sss' + '.'.repeat(FINE_COLS - x - 3)
  if (tip) rows[15 - h] = '.'.repeat(x + 1) + 'l' + '.'.repeat(FINE_COLS - x - 2)
  return rows
}
// seed(x): a single lime pixel on the floor — lime, not olive, so Klay's own
// stem color stays his (same reservation logic as mauve).
const seed = (x) => hi(['l'], x + 1, 15)

const BOX = ['hhhhhh', 'hcchch', 'hhhhhh', 'hhhhhh']
const BOX_LID_OPEN = ['cc....', 'hhhhhh', 'hSSSSh', 'hhhhhh']
const BOX_CLOSED = ['cccccc', 'hhhhhh', 'hhhhhh']
const CARD = ['SSSS', 'SwwS', 'SSSS']
const LIST0 = ['SSSSSSSS', 'SwwwwwwS', 'SwwwwwwS', 'SwwwwwwS', 'SSSSSSSS']
const LIST1 = ['SSSSSSSS', 'SkwwwwwS', 'SwwwwwwS', 'SwwwwwwS', 'SSSSSSSS']
const LIST2 = ['SSSSSSSS', 'SkwwwwwS', 'SkwwwwwS', 'SwwwwwwS', 'SSSSSSSS']
const LIST3 = ['SSSSSSSS', 'SkwwwwwS', 'SkwwwwwS', 'SkwwwwwS', 'SSSSSSSS']
// prog(f): 8-wide progress bar, f of 6 inner cells honey-filled.
const prog = (f) => ['SSSSSSSS', 'S' + 'h'.repeat(f) + 'w'.repeat(6 - f) + 'S', 'SSSSSSSS']
const LAMP_ON = ['.hh.', 'hhhh', '.KK.', '.KK.']
const LAMP_GLOW = ['h..h', '.hh.', 'hhhh', '.KK.', '.KK.']
const CUP = ['K..K', 'KwwK', 'KwwK', '.KK.']
const STEAM1 = ['.S..', '..S.']
const STEAM2 = ['..S.', '.S..']
const MOON = ['.hh', 'hh.', 'hh.', '.hh']

// Upsell journey: honey wall socket (slots on its left face) + copper plug.
const SOCKET = ['hhhh', 'Khhh', 'hhhh', 'Khhh', 'hhhh']
const PLUG = ['ccK', 'ccc', 'ccK'] // charcoal prongs face the socket
const PLUG_IN = ['cc', 'cc', 'cc'] // prongs seated — flush with the socket
const SPARK = ['h.h', '.h.', 'h.h']
// Picked journey candidates (design record: klay-upsell-candidates.html):
// tick-sweep's card stack, handshake's tool nodes, a blush row for LEFT poses.
const TODO = ['SSSSSS', 'SwwwwS', 'SwwwwS', 'SSSSSS']
const DONE = ['SSSSSS', 'ShhhhS', 'ShhhhS', 'SSSSSS'] // honey-lit: completed
const NODE_H = ['hhh', 'hKh', 'hhh'] // honey tool node
const NODE_C = ['ccc', 'cKc', 'ccc'] // copper tool node
const LEFT_BLUSH = 'mommom......' // blush row for LEFT poses (below the eyes)

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

  // ── Dashboard perch set (LEFT pose; long loops) ──────────────────────
  // One work scene per greeting line — GREETINGS and KLAY_BY_SLOT in
  // src/utils/greeting.js share the same day index, so the words and the
  // scene always match ("Ship it" day shows the shipping scene). Same
  // story shape as the empty-state set: beat → build → ~1s payoff hold.
  // Design records: docs/design-mockups/dashboard-klay-worksets.html and
  // dashboard-klay-freshcolumns-r2.html (morning[2] = sprout-columns, A).

  // Morning 0 · "Clear the board": a speckled board wipes clean, row by row.
  sweep: [
    frame(LEFT, { 5: LEFT_EYES.right }, hi(board([[2, 2], [5, 3], [7, 1], [3, 5]]), 13, 5), 650),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, hi(board([[5, 3], [7, 1], [3, 5]]), 13, 5), 420),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(board([[7, 1], [3, 5]]), 13, 5), 420),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, hi(board([[3, 5]]), 13, 5), 420),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(board([]), 13, 5), 300),
    frame(LEFT, { 5: LEFT_EYES.closed }, hi(board([]), 13, 5), 1100),
  ],

  // Morning 1 · "Ship it": he pushes the box out of frame (PixelKlay clips
  // at the fine-grid edge, so the x=21 frame is the box half-gone).
  ship: [
    frame(LEFT, { 4: LEFT_ARM }, hi(BOX, 13, 10), 650),
    frame(LEFT_DOWN, { 5: LEFT_ARM }, hi(BOX, 15, 10), 350),
    frame(LEFT, { 4: LEFT_ARM }, hi(BOX, 18, 10), 350),
    frame(LEFT_DOWN, { 5: LEFT_ARM }, hi(BOX, 21, 10), 350),
    frame(LEFT, { 5: LEFT_EYES.right }, null, 500),
    frame(LEFT_UP, { 4: LEFT_EYES.right }, null, 300),
    frame(LEFT, { 5: LEFT_EYES.right }, null, 900),
  ],

  // Morning 2 · "Fresh columns": three seeds grow into lime-tipped columns.
  'sprout-columns': [
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, seed(13), 500),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, merge(seed(13), seed(17)), 400),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, merge(seed(13), seed(17), seed(21)), 400),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(bar(13, 3, 1), seed(17), seed(21)), 350),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(bar(13, 5, 1), bar(17, 3, 1), seed(21)), 350),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(bar(13, 7, 1), bar(17, 5, 1), bar(21, 3, 1)), 350),
    frame(LEFT_UP, { 4: LEFT_EYES.center }, merge(bar(13, 8, 1), bar(17, 6, 1), bar(21, 4, 1)), 400),
    frame(LEFT, { 5: LEFT_EYES.closed }, merge(bar(13, 8, 1), bar(17, 6, 1), bar(21, 4, 1)), 1300),
  ],

  // Afternoon 0 · "Momentum's yours": he nudges a card across the board.
  'push-card': [
    frame(LEFT, { 4: LEFT_ARM }, hi(CARD, 13, 11), 600),
    frame(LEFT_DOWN, { 5: LEFT_ARM }, hi(CARD, 15, 11), 350),
    frame(LEFT, { 4: LEFT_ARM }, hi(CARD, 17, 11), 350),
    frame(LEFT_DOWN, { 5: LEFT_ARM }, hi(CARD, 19, 11), 350),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(CARD, 20, 11), 1100),
  ],

  // Afternoon 1 · "Keep the flow": cards stream past — a seamless conveyor.
  flow: [
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(CARD, 13, 11), hi(CARD, 19, 11)), 350),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(CARD, 15, 11), hi(CARD, 21, 11)), 350),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(CARD, 13, 11), hi(CARD, 17, 11)), 350),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, merge(hi(CARD, 15, 11), hi(CARD, 19, 11)), 350),
  ],

  // Afternoon 2 · "Halfway through": the bar fills to half — and holds there.
  progress: [
    frame(LEFT, { 5: LEFT_EYES.right }, hi(prog(0), 14, 9), 550),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(prog(1), 14, 9), 380),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, hi(prog(2), 14, 9), 380),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(prog(3), 14, 9), 1400),
  ],

  // Evening 0 · "Close it out": ticks land one by one; the last earns a hop.
  checklist: [
    frame(LEFT, { 5: LEFT_EYES.right }, hi(LIST0, 14, 7), 550),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(LIST1, 14, 7), 450),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, hi(LIST2, 14, 7), 450),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(LIST3, 14, 7), 300),
    frame(LEFT_UP, { 4: LEFT_EYES.center }, hi(LIST3, 14, 7), 350),
    frame(LEFT, { 5: LEFT_EYES.closed }, hi(LIST3, 14, 7), 1100),
  ],

  // Evening 1 · "Wrap the day": the lid comes down; done means closed.
  'box-lid': [
    frame(LEFT, { 4: LEFT_ARM }, hi(BOX_LID_OPEN, 14, 9), 700),
    frame(LEFT_DOWN, { 5: LEFT_ARM }, hi(BOX_LID_OPEN, 14, 10), 400),
    frame(LEFT, { 5: LEFT_EYES.center }, hi(BOX_CLOSED, 14, 10), 400),
    frame(LEFT, { 5: LEFT_EYES.closed }, hi(BOX_CLOSED, 14, 10), 1300),
  ],

  // Evening 2 · "One more move": one card hops from Doing to Done.
  'last-move': [
    frame(LEFT, { 5: LEFT_EYES.right }, merge(bar(13, 5), bar(20, 5), hi(CARD, 13, 9)), 700),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(bar(13, 5), bar(20, 5), hi(CARD, 16, 7)), 350),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(bar(13, 5), bar(20, 5), hi(CARD, 20, 9)), 450),
    frame(LEFT_UP, { 4: LEFT_EYES.right }, merge(bar(13, 5), bar(20, 5), hi(CARD, 20, 9)), 350),
    frame(LEFT, { 5: LEFT_EYES.closed }, merge(bar(13, 5), bar(20, 5), hi(CARD, 20, 9)), 1100),
  ],

  // Night 0 · "Still at it": working late by the lamp — it flickers.
  lamplight: [
    frame(LEFT, { 5: LEFT_EYES.right }, hi(LAMP_ON, 16, 10), 550),
    frame(LEFT, { 7: '.m..........', 8: '...m........' }, hi(LAMP_GLOW, 16, 9), 300),
    frame(LEFT, { 5: LEFT_EYES.right }, hi(LAMP_ON, 16, 10), 450),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, hi(LAMP_GLOW, 16, 9), 550),
  ],

  // Night 1 · "Locked in": coffee steams; he does not look up.
  'night-focus': [
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(CUP, 15, 10), hi(STEAM1, 15, 8)), 650),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(CUP, 15, 10), hi(STEAM2, 15, 8)), 650),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, merge(hi(CUP, 15, 10), hi(STEAM1, 15, 8)), 650),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(CUP, 15, 10), hi(STEAM2, 15, 8)), 650),
  ],

  // Night 2 · "The quiet hours": asleep under the moon — the deep loop.
  moonsleep: [
    frame(LEFT, { 5: LEFT_EYES.closed, 1: '...l..l.....' }, hi(MOON, 19, 2), 900),
    frame(LEFT, { 5: LEFT_EYES.closed, 0: '......l.....' }, merge(hi(MOON, 19, 2), hi(['S'], 15, 5)), 900),
    frame(LEFT_DOWN, { 6: LEFT_EYES.closed }, merge(hi(MOON, 19, 2), hi(['S', '.S'], 15, 4)), 1100),
  ],

  // ── Subscription-tier set (play-once, then rest) ─────────────────────
  // One animation per profile.tier for the Billing pane's plan hero. These
  // are meant to run a single pass on mount and FREEZE on the last frame —
  // render them with <PixelKlay playOnce> so Klay doesn't loop forever next
  // to the plan name. The final frame of each array is the resting pose (the
  // tier "badge"), which is what's on screen 95% of the time — so it's
  // designed to read as a still image, blush and all.
  // Design record: docs/design-mockups/klay-tier-animations.html
  // Prop-count escalates with tier: Free is pose-only, Pro earns one honey
  // star, Team gets two pot-buddies (honey + copper — never mauve).

  // Free · "First sprout": grows in beat by beat, blinks once, rests as the
  // open-eyed bloom. Zero props — the product metaphor itself.
  'tier-free': [
    frame(BASE, { 1: E, 2: E, 3: E }, null, 450),
    frame(BASE, { 1: E, 2: E, 3: '......l.....' }, null, 300),
    frame(BASE, { 1: E, 2: '......l.....', 3: '......o.....' }, null, 300),
    frame(BASE, null, null, 750),
    frame(BASE, { 5: EYES.closed }, null, 150),
    frame(BASE, null, null, 600), // rest: open-eyed bloom
  ],

  // Pro · "Star crown": Klay eyes a honey star, it twinkles, drifts over, and
  // settles above his sprout. Rests wearing it, blushing, feet on the ground.
  'tier-pro': [
    frame(BASE, { 5: EYES.right }, { 1: '...................h....', 2: '..................hhh...', 3: '.................hhhhh..', 4: '..................hhh...', 5: '...................h....' }, 450),
    frame(BASE, { 5: EYES.right }, { 0: '................w.....w.', 2: '...................h....', 3: '..................hhh...', 4: '...................h....', 6: '.................w....w.' }, 250),
    frame(BASE, null, { 0: '...............h........', 1: '..............hhh.......', 2: '...............h........' }, 250),
    frame(BASE, { 6: BLUSH }, { 0: '...........h............', 1: '..........hhh...........', 2: '...........h............' }, 600), // rest: crowned + blush
  ],

  // Team · "Pot buddies": honey + copper buddies bob in counterphase with
  // Klay, then lean in level. Rests as a quiet group photo — mauve keeps Klay
  // unmistakable in the crowd.
  'tier-team': [
    frame(BASE, null, { 11: '...l....................', 12: '..lll...............l...', 13: '.hhhhh.............lll..', 14: '.hkhkh............ccccc.', 15: '.hhhhh............ckckc.', 16: '..................ccccc.' }, 280),
    frame(DOWN, null, { 11: '....................l...', 12: '...l...............lll..', 13: '..lll.............ccccc.', 14: '.hhhhh............ckckc.', 15: '.hkhkh............ccccc.', 16: '.hhhhh..................' }, 280),
    frame(BASE, null, { 11: '...l....................', 12: '..lll...............l...', 13: '.hhhhh.............lll..', 14: '.hkhkh............ccccc.', 15: '.hhhhh............ckckc.', 16: '..................ccccc.' }, 280),
    frame(BASE, { 6: BLUSH }, { 11: '....l..............l....', 12: '...lll............lll...', 13: '..hhhhh..........ccccc..', 14: '..hkhkh..........ckckc..', 15: '..hhhhh..........ccccc..' }, 600), // rest: huddle + blush
  ],

  // ── Upsell journey set ───────────────────────────────────────────────
  // Scenes for the onboarding upsell's traveling Klay. Picked from the
  // candidate sheet (klay-upsell-candidates.html): converse (chat, reused
  // from the empty-state set), tick-sweep (agentic), handshake (tools),
  // scurry (travel). `connect` stays in the library as an alternate.

  // Alternate station-3 scene: Klay pushes a copper plug into a honey
  // socket — click, spark, payoff hold. Push grammar from ship/push-card.
  connect: [
    frame(LEFT, { 4: LEFT_ARM }, merge(hi(PLUG, 13, 12), hi(SOCKET, 20, 11)), 650),
    frame(LEFT_DOWN, { 5: LEFT_ARM }, merge(hi(PLUG, 15, 12), hi(SOCKET, 20, 11)), 350),
    frame(LEFT, { 4: LEFT_ARM }, merge(hi(PLUG, 17, 12), hi(SOCKET, 20, 11)), 350),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(PLUG_IN, 18, 12), hi(SOCKET, 20, 11), hi(SPARK, 17, 8)), 320),
    frame(LEFT_UP, { 4: LEFT_EYES.right }, merge(hi(PLUG_IN, 18, 12), hi(SOCKET, 20, 11)), 350),
    frame(LEFT, { 5: LEFT_EYES.closed }, merge(hi(PLUG_IN, 18, 12), hi(SOCKET, 20, 11)), 1100),
  ],

  // Station 2 · Agentic moves: a stack of cards completes itself bottom-to-top
  // — bam, bam, bam — while Klay watches. The agent does the work, not Klay.
  'tick-sweep': [
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(TODO, 16, 12), hi(TODO, 16, 7), hi(TODO, 16, 2)), 650),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, merge(hi(DONE, 16, 12), hi(TODO, 16, 7), hi(TODO, 16, 2)), 250),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(DONE, 16, 12), hi(DONE, 16, 7), hi(TODO, 16, 2)), 250),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, merge(hi(DONE, 16, 12), hi(DONE, 16, 7), hi(DONE, 16, 2)), 250),
    frame(LEFT_UP, { 4: LEFT_EYES.right }, merge(hi(DONE, 16, 12), hi(DONE, 16, 7), hi(DONE, 16, 2), hi(SPARK, 13, 3)), 320),
    frame(LEFT, { 5: LEFT_EYES.closed, 6: LEFT_BLUSH }, merge(hi(DONE, 16, 12), hi(DONE, 16, 7), hi(DONE, 16, 2)), 1200),
  ],

  // Station 3 · Connect your tools: two tool nodes; a charcoal cable draws
  // itself between them and sparks on contact. Hold the linked payoff.
  handshake: [
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(NODE_H, 13, 9), hi(NODE_C, 21, 9)), 650),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(NODE_H, 13, 9), hi(NODE_C, 21, 9), hi(['KK'], 16, 10)), 250),
    frame(LEFT_DOWN, { 6: LEFT_EYES.right }, merge(hi(NODE_H, 13, 9), hi(NODE_C, 21, 9), hi(['KKKK'], 16, 10)), 250),
    frame(LEFT_UP, { 4: LEFT_EYES.right }, merge(hi(NODE_H, 13, 9), hi(NODE_C, 21, 9), hi(['KKKKK'], 16, 10), hi(SPARK, 17, 5)), 320),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(NODE_H, 13, 9), hi(NODE_C, 21, 9), hi(['KKKKK'], 16, 10)), 400),
    frame(LEFT, { 5: LEFT_EYES.closed, 6: LEFT_BLUSH }, merge(hi(NODE_H, 13, 9), hi(NODE_C, 21, 9), hi(['KKKKK'], 16, 10)), 1100),
  ],

  // Travel: quick tiny steps, eyes locked on the destination (right), sprout
  // wobbling. No vertical bob — a bob fights the horizontal glide. Cadence:
  // 150ms/frame; pair with a steps() count whose step ≈ 150ms (see KlayJourney).
  scurry: [
    frame(BASE, { 5: EYES.right, 1: '......l.....', 7: '....m.m.....' }, null, 150),
    frame(BASE, { 5: EYES.right, 1: '.......l....', 7: '.....m.m....' }, null, 150),
  ],
}

// Resting props for the upsell journey stations — what each card shows while
// Klay performs elsewhere. Rendered statically by KlayStatic on the same
// fine-grid canvas, so they sit exactly where the animated scenes put them.
// Contract: each layer equals its scene's stable prop frame (see
// klayAnimations.test.js), keeping the static↔animated crossfade invisible.
export const UPSELL_REST_PROPS = {
  chat: hi(BUB_M, 13, 5), // converse's mid bubble, quiet
  agentic: merge(hi(TODO, 16, 12), hi(TODO, 16, 7), hi(TODO, 16, 2)), // tick-sweep's stack, all to-do
  tools: merge(hi(NODE_H, 13, 9), hi(NODE_C, 21, 9)), // handshake's nodes, not yet linked
}
