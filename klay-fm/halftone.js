// ─────────────────────────────────────────────────────────────────────────────
// LOCKED Klay-FM halftone standard  (composite / live-video-over-loop)
// Single source of truth — every scene composite imports this so they can't drift.
// Reference-matched 2026-08-04: dark dots on cream, 9px gap, dots 2/4/5px, ~213 across @1920.
//
//   • FRAME-ANCHORED, not window-anchored: the dot geometry is defined relative to
//     the 1920-wide frame, so what you preview == what you export. Density is a
//     RATIO (~213 dots across); absolute px only matter once you pick an output size.
//   • Background dots are CIRCLES — never render the bg canvas with image-rendering:pixelated
//     (that nearest-neighbours the downscale and squares them). Only Klay is pixel-art.
// ─────────────────────────────────────────────────────────────────────────────
export const HALFTONE = {
  INK:'#15130d', BG:'#f5f3ed',                        // dark dots on cream (the channel's grey-dot world)
  OUTW:1920, OUTH:1080,                               // the anchor frame
  SP:9, R3:[1.125,1.875,2.25], O3:[0.78,0.9,1.0],     // 9px gap · three dot sizes (2/4/5px) · their opacities
  HP:{ contrast:1.5, floor:0.14, gamma:1.0, mid:0.34, hi:0.67 },   // tone → which of the 3 dot sizes
};

// Export at 1440p / 4K: scale the frame AND the geometry by the same factor → identical look.
export const scaleHalftone = (cfg, f) => ({
  ...cfg, OUTW:Math.round(cfg.OUTW*f), OUTH:Math.round(cfg.OUTH*f),
  SP:cfg.SP*f, R3:cfg.R3.map(r=>r*f),
});

const clamp = (v,a,b) => v<a?a:v>b?b:v;

// Live-halftone a <video> into a <canvas>. Returns { render, cfg }:
//   render() — call once per animation frame.
//   cfg      — the SAME (mutable) config object, so slider handlers can tweak cfg.HP live.
export function attachVideoHalftone(bgCanvas, video, cfg = HALFTONE) {
  bgCanvas.width = cfg.OUTW; bgCanvas.height = cfg.OUTH;
  const bx = bgCanvas.getContext('2d');
  const samp = document.createElement('canvas'); samp.width = cfg.OUTW; samp.height = cfg.OUTH;
  const sx = samp.getContext('2d', { willReadFrequently:true });
  let ready = false;
  video.addEventListener('loadeddata', () => { ready = true; video.play().catch(()=>{}); });

  function render() {
    if (!ready || video.readyState < 2) return;
    const { OUTW, OUTH, SP, R3, O3, HP, INK, BG } = cfg;
    try { sx.drawImage(video, 0, 0, OUTW, OUTH); } catch (_) { return; }
    let d; try { d = sx.getImageData(0, 0, OUTW, OUTH).data; } catch (_) { return; }
    const lum = (x,y) => { const i=((y|0)*OUTW+(x|0))*4; return (0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])/255; };
    bx.fillStyle = BG; bx.fillRect(0, 0, OUTW, OUTH); bx.fillStyle = INK;
    for (let gx=SP/2; gx<OUTW; gx+=SP) for (let gy=SP/2; gy<OUTH; gy+=SP) {
      let sd=0, n=0;
      for (let ddx=-2; ddx<=2; ddx+=2) for (let ddy=-2; ddy<=2; ddy+=2) {
        sd += 1 - lum(clamp(gx+ddx,0,OUTW-1), clamp(gy+ddy,0,OUTH-1)); n++;
      }
      let t = Math.pow(clamp(sd/n,0,1), HP.gamma);
      t = clamp((t-HP.floor)/(1-HP.floor)*HP.contrast, 0, 1);
      if (t < 0.04) continue;
      const b = t<HP.mid ? 0 : t<HP.hi ? 1 : 2;
      bx.globalAlpha = O3[b]; bx.beginPath(); bx.arc(gx, gy, R3[b], 0, 6.283); bx.fill();
    }
    bx.globalAlpha = 1;
  }
  return { render, cfg };
}
