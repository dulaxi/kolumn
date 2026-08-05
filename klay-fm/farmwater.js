// Farm scene — TWO-SCALE: Klay 2× (chunky), can + droplets 1× (fine). Can placement from the
// prop-rig: Klay-relative (+14,+19); farm Klay at (KOX,KOY)=(2,2) → can @ (16,21).
import { P as KP, KLAY } from './klay.js';
export const P={ ...KP, s:'#C4BFB8', b:'#7FB3D5', B:'#A9D3EA' };   // + can silver + water

export const CW=34, CH=38, KOX=2, KOY=2, KSCALE=2;   // Klay 2× → fine x2..25, y2..29
export const CANX=16, CANY=21;                        // rigged can position

export const KLAY_ANIM=[
  { rows:KLAY.right,      ms:2200 },
  { rows:KLAY.rightBlink, ms:150  },
  { rows:KLAY.right,      ms:2600 },
];

export const CAN=[
  '...sss.....s.',
  '..sskss....ss',
  '.sskkkss..sss',
  'sksssssssss..',
  'skssssssss...',
  'sksssssss....',
  'skssssss.....',
  '.sssssss.....',
];

// droplets fall from the spout tip (fine) — spout ≈ (CANX+11, CANY) = (27,21)
const PATH=[[28,23],[28,24],[29,25],[29,26],[29,27],[30,28],[30,29],[30,30]];
const NF=20, DROPS=3;
export const DROP_FRAMES=[];
for(let f=0;f<NF;f++){ const ov={};
  const put=(x,y,ch)=>{ if(y<0||y>=CH||x<0||x>=CW)return; const row=ov[y]||'.'.repeat(CW); ov[y]=row.slice(0,x)+ch+row.slice(x+1); };
  for(let d=0;d<DROPS;d++){ const ph=((f/NF)+d/DROPS)%1; const idx=Math.floor(ph*PATH.length); if(idx>=PATH.length) continue;
    const [x,y]=PATH[idx]; put(x,y,'B'); if(ph<0.82) put(x,y+1,'b'); }
  DROP_FRAMES.push(ov);
}
export const DROP_MS=110;
