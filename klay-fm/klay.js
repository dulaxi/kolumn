// ─────────────────────────────────────────────────────────────────────────────
// Canonical CHANNEL Klay (Klay FM only — the app's Klay component is untouched).
// Hand-drawn by the user (2026-08): 12×14, front-lit shading.
//   base   — neutral, front-facing, flat mauve, symmetric eyes
//   right  — looks right; front-lit so the LEFT side is shadow (M mauve-dark, O olive-dark)
//   left   — auto-mirror of right (shadow flips to the right, eyes shift left)
//   *Blink — eyes closed (eye rows replaced by the solid body row)
// Props attach at the HAND anchor (his right side, mid-body).
// ─────────────────────────────────────────────────────────────────────────────
export const P={ o:'#8BA32E', l:'#C2D64A', m:'#A8969E', M:'#8F8088', k:'#1B1B18', O:'#6b7b2d' };
export const KW=12, KH=14;
export const EYE_ROWS=[7,8], BODY_FILL_ROW=6;   // rows 7-8 hold the eyes; row 6 is the clean body row
export const HAND=[10,10];                        // fine-grid anchor (x,y) where a held prop sits (his right hand)

const BASE=[
  '......ll....',
  '......ll....',
  '....llllll..',
  '....llllll..',
  '......oo....',
  '......oo....',
  'mmmmmmmmmmmm',
  'mmmkmmmmkmmm',
  'mmmkmmmmkmmm',
  'mmmmmmmmmmmm',
  'mmmmmmmmmmmm',
  'mmmmmmmmmmmm',
  '..mm....mm..',
  '..mm....mm..',
];
const RIGHT=[
  '......ll....',
  '......ol....',
  '....llllll..',
  '....olllll..',
  '......Oo....',
  '......Oo....',
  'MMmmmmmmmmmm',
  'MMmmkmmmmkmm',
  'MMmmkmmmmkmm',
  'MMmmmmmmmmmm',
  'MMmmmmmmmmmm',
  'MMmmmmmmmmmm',
  '..mm....mm..',
  '..mm....mm..',
];
const mirror = g => g.map(r => r.padEnd(KW,'.').split('').reverse().join(''));
const blink  = g => { const c=g.slice(); c[EYE_ROWS[0]]=c[BODY_FILL_ROW]; c[EYE_ROWS[1]]=c[BODY_FILL_ROW]; return c; };
const LEFT = mirror(RIGHT);

export const KLAY = {
  base: BASE,  right: RIGHT,  left: LEFT,
  baseBlink: blink(BASE),  rightBlink: blink(RIGHT),  leftBlink: blink(LEFT),
};

// ── motion helpers (compose these for per-scene variety; he's a plant — use the sprout!) ──
const shiftRow=(r,dx)=>{ r=r.padEnd(KW,'.'); if(dx>0) return ('.'.repeat(dx)+r).slice(0,KW); if(dx<0) return (r.slice(-dx)+'.'.repeat(-dx)); return r; };
// breathing / bounce — shift the WHOLE sprite vertically (dy>0 = down)
export const bob  = (g,dy)=> dy===0? g : dy>0 ? [...Array(dy).fill('.'.repeat(KW)), ...g.slice(0,KH-dy)] : [...g.slice(-dy), ...Array(-dy).fill('.'.repeat(KW))];
// sprout sway — lean just the leaf+stem (rows 0–5) left/right
export const sway = (g,dx)=> g.map((r,i)=> i<6 ? shiftRow(r,dx) : r);
// lean-in — tip the upper body (rows 0–8) toward something, feet planted
export const lean = (g,dx)=> g.map((r,i)=> i<9 ? shiftRow(r,dx) : r);
// blink any pose on the fly
export const blinkOf = blink;
