import { useEffect, useMemo, useState } from 'react'
import KolumnLogo from '../components/layout/KolumnLogo'

// Dev-only sandbox (/sandbox/logo-align) for tuning the KolumnLogo ↔ wordmark
// lockup. Renders the pair zoomed with a px grid + cap-height guides, arrow
// keys nudge the mark, and the output block prints per-variant values to
// copy back into the real lockups. Not part of the product — never route it
// outside import.meta.env.DEV.

// Every logo+wordmark lockup in the app. Since 2026-08-04 they all render
// through KolumnLockup.jsx (mark 18/23 × text, gap 6/23 × text,
// offsetY -0.75/23 × text) — marks/gaps below are that standard applied.
const VARIANTS = [
  { key: 'sidebar', label: 'Sidebar + route shell', mark: 18, text: 23, gap: 6, weight: 500, file: 'Sidebar.jsx / RouteLoadingShell.jsx' },
  { key: 'landing-nav', label: 'Landing nav (both)', mark: 22, text: 28, gap: 7.3, weight: 500, file: 'LandingPage.jsx' },
  { key: 'onboarding', label: 'Onboarding header', mark: 17, text: 22, gap: 5.7, weight: 500, file: 'OnboardingPage.jsx' },
  { key: 'notfound', label: '404 state', mark: 16, text: 20, gap: 5.2, weight: 500, file: 'NotFoundState.jsx' },
  { key: 'footer', label: 'Landing footer', mark: 9, text: 12, gap: 3.1, weight: 700, file: 'LandingPage.jsx footer' },
]

const MASTER = VARIANTS[0]

// Clash Grotesk metrics at a given size/weight via canvas. fontBoundingBox*
// give the em-box ascent/descent (what CSS line-height:1 slots the glyphs
// into); actualBoundingBoxAscent of "K" gives the cap height.
function measureFont(textPx, weight) {
  const canvas = measureFont._c || (measureFont._c = document.createElement('canvas'))
  const ctx = canvas.getContext('2d')
  // Measure at 100× and scale down — canvas metrics quantize at small sizes
  // (at 23px they were ~0.4px off the true ratios), which skews the guides.
  const SCALE = 100
  ctx.font = `${weight} ${textPx * SCALE}px "Clash Grotesk"`
  const m = ctx.measureText('K')
  return {
    emAscent: m.fontBoundingBoxAscent / SCALE,
    emDescent: m.fontBoundingBoxDescent / SCALE,
    capHeight: m.actualBoundingBoxAscent / SCALE,
  }
}

// Geometry of a `flex items-center` lockup with leading-none text.
// Returns y-positions in lockup-local px (0 = top of the flex row).
function lockupGeometry({ mark, text, offsetY }, metrics) {
  const H = Math.max(mark, text)
  const textTop = (H - text) / 2
  // line-height:1 → half-leading centers the em box in the 1em line box
  const baseline = textTop + (text - (metrics.emAscent + metrics.emDescent)) / 2 + metrics.emAscent
  const capTop = baseline - metrics.capHeight
  const capCenter = baseline - metrics.capHeight / 2
  const markTop = (H - mark) / 2 + offsetY
  const markCenter = H / 2 + offsetY
  return { H, baseline, capTop, capCenter, markTop, markCenter }
}

// offsetY that puts the mark's center exactly on the wordmark's cap center.
function mathCenterOffset(variant, metrics) {
  const g = lockupGeometry({ ...variant, offsetY: 0 }, metrics)
  return g.capCenter - g.markCenter
}

const round = (v, step) => Math.round(v / step) / (1 / step)

function Lockup({ mark, text, gap, weight, offsetY }) {
  return (
    <span className="flex items-center" style={{ gap: `${gap}px` }}>
      <span style={{ display: 'inline-flex', transform: `translateY(${offsetY}px)` }}>
        <KolumnLogo size={mark} />
      </span>
      <span
        className="text-[var(--text-primary)] tracking-tight leading-none font-logo"
        style={{ fontSize: `${text}px`, fontWeight: weight }}
      >
        Kolumn
      </span>
    </span>
  )
}

export default function LogoAlignSandbox() {
  const [fontsReady, setFontsReady] = useState(false)
  const [mark, setMark] = useState(MASTER.mark)
  const [text, setText] = useState(MASTER.text)
  const [gap, setGap] = useState(MASTER.gap)
  const [offsetY, setOffsetY] = useState(-0.25) // the shipped standard

  const [zoom, setZoom] = useState(10)
  const [showGrid, setShowGrid] = useState(true)
  const [showGuides, setShowGuides] = useState(true)

  useEffect(() => {
    let alive = true
    document.fonts.load('500 23px "Clash Grotesk"').then(() =>
      document.fonts.ready.then(() => { if (alive) setFontsReady(true) }))
    return () => { alive = false }
  }, [])

  // Arrow keys: ↑/↓ nudge offsetY by 0.25 (Shift = 1), ←/→ nudge gap by 0.5.
  useEffect(() => {
    const onKey = (e) => {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return
      const dy = e.shiftKey ? 1 : 0.25
      if (e.key === 'ArrowUp') { setOffsetY((v) => round(v - dy, 0.25)); e.preventDefault() }
      if (e.key === 'ArrowDown') { setOffsetY((v) => round(v + dy, 0.25)); e.preventDefault() }
      if (e.key === 'ArrowLeft') { setGap((v) => Math.max(0, round(v - 0.5, 0.5))); e.preventDefault() }
      if (e.key === 'ArrowRight') { setGap((v) => round(v + 0.5, 0.5)); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const metrics = useMemo(
    () => (fontsReady ? measureFont(text, 500) : null),
    [fontsReady, text],
  )
  const geo = metrics ? lockupGeometry({ mark, text, weight: 500, offsetY }, metrics) : null
  const mathOffset = metrics ? mathCenterOffset({ mark, text, weight: 500 }, metrics) : 0
  // How far the user's choice sits from mathematical cap-centering — this is
  // the optical preference, and it's what scales to the other variants.
  const opticalDelta = offsetY - mathOffset
  const delta = geo ? geo.markCenter - geo.capCenter : 0

  const variantValues = useMemo(() => {
    if (!fontsReady) return []
    return VARIANTS.map((v) => {
      const m = measureFont(v.text, v.weight)
      const base = mathCenterOffset(v, m)
      const scaled = base + opticalDelta * (v.mark / MASTER.mark)
      return {
        ...v,
        offsetY: round(scaled, 0.25),
        gap: round(gap * (v.mark / MASTER.mark), 0.5),
      }
    })
  }, [fontsReady, opticalDelta, gap])

  const output = [
    `master  { mark: ${mark}, text: ${text}, gap: ${gap}, offsetY: ${offsetY} }`,
    `optical delta vs mathematical cap-center: ${round(opticalDelta, 0.01)}px`,
    '',
    'apply per variant (offsetY = translateY on the mark, gap in px):',
    ...variantValues.map((v) =>
      `  ${v.key.padEnd(14)} mark ${String(v.mark).padEnd(2)}  text ${String(v.text).padEnd(2)}  gap ${String(v.gap).padEnd(4)}  offsetY ${v.offsetY >= 0 ? '+' : ''}${v.offsetY}   (${v.file})`),
  ].join('\n')

  const pad = 28 // breathing room inside the zoomed stage, in lockup px

  const guideLine = (y, color, label, dashed = false) => (
    <div key={label} className="absolute left-0 right-0" style={{ top: `${pad + y}px` }}>
      <div style={{
        height: `${1 / zoom}px`,
        background: dashed ? 'none' : color,
        backgroundImage: dashed ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 6px)` : 'none',
      }} />
      <span style={{
        position: 'absolute', right: '2px', top: `${-11 / zoom}px`, color,
        fontSize: `${9 / zoom}px`, lineHeight: 1, fontFamily: 'var(--font-mono)',
      }}>{label}</span>
    </div>
  )

  if (!fontsReady) return <div className="p-10 font-mono text-sm">loading Clash Grotesk…</div>

  return (
    <div className="min-h-screen bg-[var(--surface-page)] text-[var(--text-primary)] p-8 space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="font-heading text-xl">Logo ↔ wordmark alignment</h1>
        <span className="font-mono text-xs text-[var(--text-muted)]">
          ↑/↓ nudge mark 0.25px (Shift=1px) · ←/→ gap 0.5px
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-5 font-mono text-xs">
        {[
          ['mark', mark, setMark, 10, 34, 1],
          ['text', text, setText, 10, 34, 1],
          ['gap', gap, setGap, 0, 16, 0.5],
          ['offsetY', offsetY, setOffsetY, -4, 4, 0.25],
          ['zoom', zoom, setZoom, 3, 20, 1],
        ].map(([label, value, set, min, max, step]) => (
          <label key={label} className="flex flex-col gap-1">
            <span>{label}: <b>{value}</b>{label !== 'zoom' ? 'px' : '×'}</span>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={(e) => set(parseFloat(e.target.value))} className="w-36" />
          </label>
        ))}
        <label className="flex items-center gap-1.5 pb-1">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> grid
        </label>
        <label className="flex items-center gap-1.5 pb-1">
          <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} /> guides
        </label>
        <button
          type="button"
          onClick={() => setOffsetY(round(mathOffset, 0.25))}
          className="h-7 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] cursor-pointer hover:bg-[var(--surface-hover)]"
        >
          snap to cap-center ({round(mathOffset, 0.25)}px)
        </button>
        <span className={Math.abs(delta) < 0.05 ? 'text-[var(--accent-lime-dark)] pb-1.5' : 'text-[var(--text-muted)] pb-1.5'}>
          mark center is {Math.abs(round(delta, 0.01))}px {delta > 0 ? 'below' : 'above'} cap center
          {Math.abs(delta) < 0.05 && ' ✓ centered'}
        </span>
      </div>

      {/* Zoomed stage */}
      <div className="inline-block rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden">
        <div className="relative" style={{ zoom }}>
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  `repeating-linear-gradient(0deg, rgba(27,27,24,0.10) 0, rgba(27,27,24,0.10) ${1 / zoom}px, transparent ${1 / zoom}px, transparent 1px),` +
                  `repeating-linear-gradient(90deg, rgba(27,27,24,0.10) 0, rgba(27,27,24,0.10) ${1 / zoom}px, transparent ${1 / zoom}px, transparent 1px)`,
                backgroundPosition: `${pad}px ${pad}px`,
              }}
            />
          )}
          <div style={{ padding: `${pad}px`, paddingRight: `${pad + 8}px` }}>
            <Lockup mark={mark} text={text} gap={gap} weight={500} offsetY={offsetY} />
          </div>
          {showGuides && geo && (
            <>
              {guideLine(geo.capTop, '#B0662F', 'cap top')}
              {guideLine(geo.baseline, '#B0662F', 'baseline')}
              {guideLine(geo.capCenter, '#8BA32E', 'cap center', true)}
              {guideLine(geo.markTop, 'rgba(27,27,24,0.35)', 'mark top')}
              {guideLine(geo.markTop + mark, 'rgba(27,27,24,0.35)', 'mark btm')}
              {guideLine(geo.markCenter, '#C4553E', 'mark center', true)}
              {/* gap edges */}
              <div className="absolute" style={{
                top: `${pad}px`, bottom: `${pad}px`, left: `${pad + mark}px`,
                width: `${1 / zoom}px`, background: 'rgba(27,27,24,0.25)',
              }} />
              <div className="absolute" style={{
                top: `${pad}px`, bottom: `${pad}px`, left: `${pad + mark + gap}px`,
                width: `${1 / zoom}px`, background: 'rgba(27,27,24,0.25)',
              }} />
            </>
          )}
        </div>
      </div>

      {/* 1:1 previews of every real lockup, current values applied */}
      <div className="space-y-2">
        <h2 className="font-mono text-xs text-[var(--text-muted)]">live previews @1× (values scaled per variant)</h2>
        <div className="flex flex-wrap gap-3">
          {variantValues.map((v) => (
            <div key={v.key} className="rounded-xl border border-[var(--border-default)] overflow-hidden">
              <div className="px-5 py-4 bg-[#FBF9F7]"><Lockup mark={v.mark} text={v.text} gap={v.gap} weight={v.weight} offsetY={v.offsetY} /></div>
              <div className="px-5 py-4 bg-[#1B1B18]" data-theme="dark"><Lockup mark={v.mark} text={v.text} gap={v.gap} weight={v.weight} offsetY={v.offsetY} /></div>
              <div className="px-2 py-1 font-mono text-[10px] text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
                {v.label} · {v.mark}/{v.text}px
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Copyable output */}
      <div className="space-y-2 max-w-3xl">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-xs text-[var(--text-muted)]">values — copy this block back to Claude</h2>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(output)}
            className="h-6 px-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] font-mono text-[11px] cursor-pointer hover:bg-[var(--surface-hover)]"
          >
            copy
          </button>
        </div>
        <pre className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 font-mono text-[11px] leading-relaxed overflow-x-auto">
          {output}
        </pre>
      </div>
    </div>
  )
}
