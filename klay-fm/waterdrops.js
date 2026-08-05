// Watering can (user's hand-drawn 32x32 sprite) with ANIMATED water droplets.
// The can is static; blue teardrops (b core + B highlight) fall from the spout tip
// along the same down-right line the user painted. Loops.
export const P={ k:'#1B1B18', s:'#C4BFB8', b:'#7FB3D5', B:'#A9D3EA' };

// static can = user's sprite with the drawn droplets (b/B) removed (they become the animated layer)
export const CAN=[
  '................................','................................','................................','................................',
  '................................','................................','................................','................................',
  '................................','................................','................................',
  '............sss.....s...........',
  '...........sskss....ss..........',
  '..........sskkkss..sss..........',
  '.........sksssssssss............',
  '.........skssssssss.............',
  '.........sksssssss..............',
  '.........skssssss...............',
  '..........sssssss...............',
  '................................','................................','................................','................................',
  '................................','................................','................................','................................',
  '................................','................................','................................','................................','................................',
];
export const NW=32;

// fall path from the spout tip, down-right then straight down — matches where the user placed droplets
const PATH=[[20,14],[20,15],[21,16],[21,17],[22,18],[22,19],[22,20],[23,21],[23,22],[23,23]];

// build a looping droplet animation: a few staggered teardrops, each B(highlight)-over-b(core)
const NF=20, DROPS=3;
export const FRAMES=[];
for(let f=0;f<NF;f++){ const ov={};
  const put=(x,y,ch)=>{ if(y<0||y>=NW||x<0||x>=NW)return; const row=ov[y]||'.'.repeat(NW); ov[y]=row.slice(0,x)+ch+row.slice(x+1); };
  for(let d=0;d<DROPS;d++){ const ph=((f/NF)+d/DROPS)%1; const idx=Math.floor(ph*PATH.length); if(idx>=PATH.length) continue;
    const [x,y]=PATH[idx];
    put(x,y,'B');           // highlight (top of the teardrop)
    if(ph<0.82) put(x,y+1,'b');   // core below; the drop thins to a single highlight as it lands
  }
  FRAMES.push(ov);
}
export const FRAME_MS=110;   // calm, steady drip (~2.2s loop)
