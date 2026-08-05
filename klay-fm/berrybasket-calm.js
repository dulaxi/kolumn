// "Berry basket — calm" : an 8-second slow loop. Klay stands with a full basket,
// breathes/blinks, slowly reaches in, lifts ONE small berry, gently lets it drift
// down the side, then settles. Long holds = calm. klay-detailed-props format.
export const P={ o:'#8BA32E', l:'#C2D64A', m:'#A8969E', k:'#1B1B18', w:'#FDFBF7', h:'#D4A843', c:'#C27A4A', s:'#E0DBD5', K:'#5C5C57', S:'#C4BFB8', R:'#BE3A34', r:'#E0574F', n:'#7A4A2B' };
const E='............';
const BASE=[E,'......l.....','.....lll....','......o.....','...mmmmmm...','...mkmmkm...','...mmmmmm...','....m..m....',E,E,E];
const DOWN=[E,E,'......l.....','.....lll....','......o.....','...mmmmmm...','...mkmmkm...','...mmmmmm...','....m..m....',E,E];
const UP1 =['......l.....','.....lll....','......o.....','...mmmmmm...','...mkmmkm...','...mmmmmm...','....m..m....',E,E,E,E];
const XC='...mkmmkm...', XR='...mmkmmk...', XL='...kmmkmm...', BL='...mommom...';
const BLINK='...mmmmmm...';
const F=(base,mod,hi,ms)=>{ const c=base.slice(); if(mod) for(const y in mod) c[+y]=mod[y]; return {map:c, hi:hi||null, ms:ms||300}; };
// pixel-by-pixel overlay: later layer's non-'.' wins, its '.' keeps what's underneath
const mrg=(...layers)=>{ const out={};
  for(const layer of layers){ for(const y in layer){ const b=layer[y];
    if(!out[y]){ out[y]=b; continue; }
    const a=out[y]; let s=''; for(let i=0;i<24;i++){ const bc=b[i]||'.'; s += bc!=='.' ? bc : (a[i]||'.'); } out[y]=s; } }
  return out; };

// full woven basket held low-left, red berries mounded (fine grid) — 25% smaller (≈6×7 vs old 8×9)
const BK={
 13:'........RRR.............',   // berry mound top
 14:'.......RrRRr............',   // berries
 15:'.......hhhhhh...........',   // rim
 16:'.......hcnhcn...........',   // woven crosshatch
 17:'.......hnchcn...........',
 18:'........nhcn............',   // taper
 19:'.........nn.............',   // base
};

// ONE small berry (single fine pixel) drifting up-right then gently down the right side, clear of Klay
export const ANIM=[
  F(BASE,{5:XC}, mrg(BK,{}), 1500),                          // 1  idle, breathing
  F(BASE,{5:BLINK}, mrg(BK,{}), 150),                        // 2  slow blink
  F(BASE,{5:XC}, mrg(BK,{}), 1300),                          // 3  idle
  F(DOWN,{6:XC,7:BL}, mrg(BK,{}), 950),                      // 4  slowly reach into the basket (lean, blush)
  F(BASE,{5:XR}, mrg(BK,{11:'...............R........'}), 800),  // 5  lift one berry, glance right
  F(UP1,{4:XR},  mrg(BK,{3:'..................R.....'}), 750),   // 6  gentle release, berry drifts up-right
  F(BASE,{5:XR}, mrg(BK,{9:'....................r...'}), 750),   // 7  berry drifting down
  F(BASE,{5:XR}, mrg(BK,{15:'.....................R..'}), 700),  // 8  berry near the ground, fading past
  F(BASE,{5:XC}, mrg(BK,{}), 700),                           // 9  settle, back to center
  F(BASE,{5:BLINK}, mrg(BK,{}), 400),                        // 10 restful blink
  F(BASE,{5:XC}, mrg(BK,{}), 0),                             // (pad handled below)
];
// exact 8000ms: 1500+150+1300+950+800+750+750+700+700+400 = 8000; drop the trailing pad
ANIM.pop();
