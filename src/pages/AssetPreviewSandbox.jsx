import { useSearchParams } from 'react-router-dom'
import { CaretRight, Sparkle } from '@phosphor-icons/react'
import KolumnLockup from '../components/layout/KolumnLockup'
import PixelKlay from '../components/klay/PixelKlay'
import CardVisual from '../components/board/CardVisual'

// Dev-only surface for marketing Open Graph assets. Two jobs:
//
// 1. No query params → the original design-review gallery (all three
//    layouts + section markers, at half scale). Nothing here is wired into
//    the marketing site.
// 2. `?layout=A|B|C&eyebrow=...&title=...&subhead=...` → renders ONE card
//    at true 1200×630, full bleed, nothing else on the page. This is what
//    scripts/og-generate.mjs screenshots — see that file for how the query
//    params are built from src/content/marketing-routes.js.
//
// Route: /sandbox/asset-preview (registered behind import.meta.env.DEV in
// App.jsx).

// Picks the largest font size whose length ceiling still fits `text`, so a
// short page title (most of them) gets the full design-review size and a
// long one steps down instead of wrapping past the card or clipping. Tiers
// are `[maxLength, px]`, ascending by maxLength; the last entry is the
// floor for anything longer.
function fitFontSize(text, tiers) {
  const len = text.length
  for (const [maxLen, px] of tiers) {
    if (len <= maxLen) return px
  }
  return tiers[tiers.length - 1][1]
}

// Open Graph cards are 1200×630. OgFrame renders them at half scale so
// several fit on screen in the gallery; the single-card mode below renders
// at true size for the generator to screenshot.
function OgFrame({ label, note, children }) {
  return (
    <figure className="m-0">
      <figcaption className="mb-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-muted)]">{label}</span>
        <span className="ml-3 text-[13px] text-[var(--text-secondary)]">{note}</span>
      </figcaption>
      <div
        data-og
        className="relative overflow-hidden rounded-xl border border-[var(--border-default)]"
        style={{ width: 1200, height: 630, transform: 'scale(0.5)', transformOrigin: 'top left' }}
      >
        {children}
      </div>
      {/* reserve the collapsed height left by the 0.5 scale */}
      <div style={{ height: 315 }} />
    </figure>
  )
}

// A — the workhorse. Title-led, quiet, works for all 83 pages.
function OgTitle({ eyebrow = 'Pricing', title = 'Free for as long as you like' }) {
  const size = fitFontSize(title, [
    [25, 76],
    [35, 68],
    [45, 60],
    [Infinity, 52],
  ])
  return (
    <div className="w-full h-full bg-[var(--surface-page)] flex flex-col justify-between p-16">
      <KolumnLockup text={40} />
      <div>
        <p className="font-mono text-[20px] uppercase tracking-[0.14em] text-[var(--text-muted)] mb-5">{eyebrow}</p>
        <h1
          className="font-heading font-[425] leading-[1.05] tracking-tight text-[var(--text-primary)] max-w-[900px]"
          style={{ fontSize: `${size}px` }}
        >
          {title}
        </h1>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[24px] text-[var(--text-secondary)]">kolumn.app</p>
        <span className="h-[3px] w-40 rounded-full bg-[var(--accent-lime)]" />
      </div>
    </div>
  )
}

// B — shows the product. A real card on a real board fragment.
function OgProduct({
  title = 'A board that listens',
  subhead = 'The kanban you talk to.',
  card: cardTitle = 'Redo the pricing page',
  cardIcon = 'Browser',
  cardLabel = 'Marketing',
  cardCheck = '1/3',
}) {
  const size = fitFontSize(title, [
    [20, 62],
    [32, 54],
    [45, 46],
    [Infinity, 40],
  ])
  const [doneN, totalN] = cardCheck.split('/').map(Number)
  const card = {
    id: 'og', title: cardTitle, icon: cardIcon,
    priority: 'high', due_date: null,
    checklist: Array.from({ length: totalN || 3 }, (_, i) => ({ done: i < (doneN || 0) })),
    completed: false, labels: [], description: '',
  }
  return (
    <div className="w-full h-full bg-[var(--surface-page)] flex items-center gap-16 p-16">
      <div className="flex-1 min-w-0">
        <KolumnLockup text={34} />
        <h1
          className="mt-8 font-heading font-[425] leading-[1.1] tracking-tight text-[var(--text-primary)]"
          style={{ fontSize: `${size}px` }}
        >
          {title}
        </h1>
        <p className="mt-5 text-[24px] leading-relaxed text-[var(--text-secondary)]">{subhead}</p>
      </div>
      <div className="w-[380px] shrink-0 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-5">
        <p className="mb-3 text-[15px] font-semibold text-[var(--text-secondary)]">This week</p>
        <div className="scale-[1.15] origin-top-left w-[290px]">
          <CardVisual card={card} interactive={false} labels={[{ text: cardLabel, color: 'blue' }]} />
        </div>
      </div>
    </div>
  )
}

// C — Klay. The one thing no competitor can copy.
//
// Klay's coarse sprite has 3 empty rows below his feet (the anatomy stops
// at row 7 of 0-indexed COARSE_ROWS=11 — see .claude/skills/klay). Cropping
// the wrapper to exactly the foot row's height, instead of the sprite's
// full bounding box, means the flex row's `items-end` aligns his actual
// feet with the text block's baseline rather than with 3 rows of
// transparent padding beneath them (previously read as "sits low").
const KLAY_SCALE = 16
const KLAY_FOOT_ROW = 7 // last non-transparent row in the coarse grid
const KLAY_CROP_HEIGHT = (KLAY_FOOT_ROW + 1) * KLAY_SCALE

function OgKlay({ eyebrow = 'Support', title = 'What is Kolumn?' }) {
  const size = fitFontSize(title, [
    [20, 68],
    [30, 60],
    [42, 52],
    [Infinity, 44],
  ])
  return (
    <div className="w-full h-full bg-[var(--surface-raised)] flex flex-col justify-between p-16">
      <KolumnLockup text={38} />
      <div className="flex items-end gap-12">
        <div className="shrink-0 overflow-hidden" style={{ height: KLAY_CROP_HEIGHT }}>
          <PixelKlay animation="idle" scale={KLAY_SCALE} paused />
        </div>
        <div className="min-w-0">
          <h1
            className="font-heading font-[425] leading-[1.05] tracking-tight text-[var(--text-primary)] max-w-[760px]"
            style={{ fontSize: `${size}px` }}
          >
            {title}
          </h1>
          <p className="mt-4 text-[24px] text-[var(--text-secondary)]">{eyebrow} · kolumn.app</p>
        </div>
      </div>
      <span className="h-[3px] w-full rounded-full bg-[var(--accent-lime)]" />
    </div>
  )
}

// Section markers — the 64–96px punctuation Anthropic uses to break up text.
function Markers() {
  const Row = ({ name, children }) => (
    <div className="flex items-center gap-6 py-4 border-b border-[var(--border-subtle)]">
      <span className="w-40 shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-muted)]">{name}</span>
      {children}
    </div>
  )
  return (
    <div className="max-w-2xl">
      <Row name="Klay, paused">
        <PixelKlay animation="idle" scale={5} paused />
      </Row>
      <Row name="Rule + mark">
        <span className="flex items-center gap-3 w-full">
          <Sparkle size={20} weight="fill" className="text-[var(--accent-lime-dark)] shrink-0" />
          <span className="h-px flex-1 bg-[var(--border-default)]" />
        </span>
      </Row>
      <Row name="Eyebrow">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
          How it works <CaretRight size={12} />
        </span>
      </Row>
      <Row name="Lime tick">
        <span className="h-[3px] w-16 rounded-full bg-[var(--accent-lime)]" />
      </Row>
    </div>
  )
}

const LAYOUTS = { A: OgTitle, B: OgProduct, C: OgKlay }

export default function AssetPreviewSandbox() {
  const [params] = useSearchParams()
  const layout = params.get('layout')

  // Single-card mode: render exactly one 1200×630 card, full bleed, nothing
  // else — this is the DOM the generator screenshots.
  if (layout && LAYOUTS[layout]) {
    const Layout = LAYOUTS[layout]
    const props = {}
    if (params.has('eyebrow')) props.eyebrow = params.get('eyebrow')
    if (params.has('title')) props.title = params.get('title')
    if (params.has('subhead')) props.subhead = params.get('subhead')
    for (const k of ['card', 'cardIcon', 'cardLabel', 'cardCheck']) {
      if (params.has(k)) props[k] = params.get(k)
    }
    return (
      <div data-og-card className="landing-font relative overflow-hidden" style={{ width: 1200, height: 630 }}>
        <Layout {...props} />
      </div>
    )
  }

  return (
    <div className="landing-font min-h-screen bg-[var(--surface-page)] px-10 py-14">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)]">Marketing asset proposals</h1>
        <p className="mt-2 mb-12 text-[var(--text-secondary)]">
          Not wired into any page. Open Graph cards are shown at half of their real 1200×630.
        </p>

        <div className="flex flex-col gap-10">
          <OgFrame label="Option A" note="Title-led. Scales to all 83 pages from data we already have.">
            <OgTitle />
          </OgFrame>
          <OgFrame label="Option B" note="Shows the product, using the real card component.">
            <OgProduct />
          </OgFrame>
          <OgFrame label="Option C" note="Klay. Nothing a competitor can imitate.">
            <OgKlay />
          </OgFrame>
        </div>

        <h2 className="mt-16 mb-6 font-heading font-[425] text-2xl tracking-tight text-[var(--text-primary)]">Section markers</h2>
        <Markers />
      </div>
    </div>
  )
}
