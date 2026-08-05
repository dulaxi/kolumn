// Lighthouse keeper — Klay at a GROUND telescope (tripod). He stays facing right and
// performs: leans into the eyepiece, perks up when he spots something, straightens,
// sprout sways in the sea breeze, breathes. Uses the new bob/sway/lean motion helpers.
import { P as KP, KLAY, bob, sway, lean, blinkOf } from './klay.js';
export const P={ ...KP, S:'#C4BFB8', K:'#3A3A3A', w:'#FDFBF7', n:'#4E2F1A', u:'#4E7CA8', U:'#7FB0D6' };  // silver / dark / glint / base / blue / light-blue

export const CW=40, CH=34, KOX=2, KOY=2, KSCALE=2;   // Klay 2× → fine x2..25, y2..29
const placeAt=(art,dx,dy)=>{ const o={}; art.forEach((r,i)=>{ o[dy+i]='.'.repeat(dx)+r; }); return o; };

// tower-viewer binocular (coin-op lookout style), SILVER body + BLUE panels: viewer head with
// twin eyepieces at the left (Klay's side) and a front lens at the right, on a silver pedestal + base.
const TELE_ART=[
  '.....SSSSSS..',   // head top (silver)
  '....SuuuuuuS.',   // blue panel
  '.nKSuuuuuuUw',    // eyepieces (nK) + blue body + front lens (U) + glint (w)
  '.nKSuuuuuuUw',    //   "
  '....SuuuuuuS.',   // blue panel
  '.....SSSSSS..',   // head bottom
  '.......KK....',   // neck
  '......SKKS...',   // yoke
  '.......KK....',   // pedestal post
  '.......KK....',
  '.......KK....',
  '......SKKS...',
  '.....SSKKSS..',   // base flare
  '....SSSSSSSS.',   // base plate
  '....nnnnnnnn.',   // ground
];
const TELE = placeAt(TELE_ART, 19, 13);   // eyepiece at his (leaned) eye-line; base on the ground

const F=(rows,over,ms)=>({ rows, over, ms });
export const FRAMES=[
  F(lean(KLAY.right,1),          TELE, 2200),  // lean into the eyepiece
  F(blinkOf(lean(KLAY.right,1)), TELE, 150),   // blink while looking
  F(lean(KLAY.right,1),          TELE, 1700),  // watching the sea
  F(bob(KLAY.right,-1),          TELE, 450),   // perk up — spotted something!
  F(KLAY.base,                   TELE, 950),   // straighten, standing by the scope
  F(sway(KLAY.base,1),           TELE, 700),   // sprout sways in the breeze
  F(sway(KLAY.base,-1),          TELE, 700),   // sway back
  F(KLAY.baseBlink,              TELE, 150),   // blink
  F(bob(KLAY.base,1),            TELE, 900),   // settle / breathe, then back to the eyepiece
];
