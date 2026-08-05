// Station commuter — TWO-SCALE model: Klay drawn at 2× (chunky, his 12×14 grid),
// props (briefcase + watch) drawn at 1× (fine = half Klay's pixel), so they stay small AND detailed.
import { P as KP, KLAY } from './klay.js';
export const P={ ...KP,                       // Klay: o l m M k O
  n:'#4E2F1A', c:'#C27A4A', h:'#D4A843', w:'#FDFBF7', s:'#C4BFB8', S:'#8E8A83', K:'#3A3A3A' };  // briefcase + watch

export const CW=34, CH=30, KOX=1, KOY=1;      // Klay 2× → fine x1..24, y1..28; props live in the same fine grid at 1×
export const KSCALE=2;                        // <-- composite draws Klay cells at 2×2, props at 1×1
const mrg=(...layers)=>{ const out={};
  for(const layer of layers){ for(const y in layer){ const b=layer[y];
    if(!out[y]){ out[y]=b; continue; }
    const a=out[y]; let s=''; for(let i=0;i<CW;i++){ const bc=b[i]||'.'; s += bc!=='.'?bc:(a[i]||'.'); } out[y]=s; } }
  return out; };
const placeAt=(art,dx,dy)=>{ const o={}; art.forEach((r,i)=>{ o[dy+i]='.'.repeat(dx)+r; }); return o; };

// detailed leather briefcase (fine 1×) — handle, twin latches, stitched seam, corner-reinforced base
const BRIEF_ART=[
  '.KKKKKK...',
  '.K....K...',
  'nnnnnnnnnn',
  'nshsnnshsn',
  'nccccccccn',
  'nccwcccccn',
  'nnnnnnnnnn',
  'nccccccccn',
  'nKnnnnnnKn',
];
const BRIEF = placeAt(BRIEF_ART, 22, 20);      // rigged: Klay-relative (+21,+19) → (22,20)

// the user's FULL detailed pocket watch (fine 1×): dangling chain → copper crown → gold rim,
// cream dial with silver + dark hands, copper side accents.
const WATCH_ART=[
  '...h.....',
  '..h......',
  '.h.......',
  '...hch...',
  '..hhhhh..',
  '.hhwswhh.',
  'hhwwSwwhh',
  'chswKSshc',
  'hhwwwwwhh',
  '.hhwswhh.',
  '..hhhhh..',
  '...hch...',
];
// position from the prop-rig: Klay-relative (+7,+16); station Klay is at (KOX,KOY)=(1,1) → (8,17)
const WATCH_FACE = placeAt(WATCH_ART, 8, 17);  // held (rigged spot)
const WATCH_MID  = placeAt(WATCH_ART, 8, 19);  // lifting (2px lower)

const F=(rows,over,ms)=>({ rows, over, ms });
export const FRAMES=[
  F(KLAY.base,      BRIEF, 1500),                 // waiting
  F(KLAY.baseBlink, BRIEF, 150),                  // blink
  F(KLAY.right,     BRIEF, 1400),                 // glance right down the track
  F(KLAY.base,      BRIEF, 700),                  // center
  F(KLAY.left,      BRIEF, 1400),                 // glance the other way
  F(KLAY.base,      BRIEF, 600),                  // center (train passes about here)
  F(KLAY.base,      mrg(BRIEF,WATCH_MID),  350),  // lift the watch
  F(KLAY.base,      mrg(BRIEF,WATCH_FACE), 1200), // check the time
  F(KLAY.base,      mrg(BRIEF,WATCH_MID),  400),  // lower it
];
