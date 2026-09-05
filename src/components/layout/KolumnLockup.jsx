import KolumnLogo from './KolumnLogo'

// The standard logo ↔ wordmark lockup. One knob — the wordmark px size —
// and the mark size, gap, and vertical offset all derive from it, so every
// brand surface stays proportionally identical.
//
// Ratios tuned by hand 2026-08-04 in /sandbox/logo-align (master lockup:
// mark 18 / text 23 / gap 6, mark cap-centered on "Kolumn"). The offset
// compensates flex-centering against the full line box instead of the cap
// height — without it the mark rides visibly low next to the caps.
//
// Pixel-grid discipline: the mark is a crispEdges pixel sprite, so it must
// land on a WHOLE-pixel y or its edges antialias soft ("not snapped").
// Fractions creep in two ways: an odd lockup height centered in an even
// container (h-16 row → x.5 origin), and a fractional mark offset inside.
// So the lockup's height is forced even and the mark's offset from its top
// is rounded to a whole px — in integer-positioned containers (the app
// chrome) the sprite then always sits on the grid. The wordmark is regular
// text and antialiases fine at fractional positions.
const MARK_RATIO = 18 / 23 // mark px per wordmark px (rendered whole-px)
const GAP_RATIO = 6 / 23 // gap px per wordmark px
// Derived from the RENDERED bitmap (not canvas font metrics, whose baseline
// model runs ~1px off Chrome's raster): at text 23 the mark needs -0.75px to
// center on the word's actual ink. Matches the hand-tuned sandbox value.
const OFFSET_RATIO = -0.75 / 23 // cap-centering nudge per wordmark px

// Bitmap-calibrated whole-px mark offsets for the text sizes in use
// (screenshot at 2×, compare sprite rows vs glyph-ink rows). Chrome shifts
// the rasterized baseline non-linearly across font sizes, so the ratio
// formula alone can't hit every size — 28px rounds the wrong way and reads
// visibly high. Unlisted sizes fall back to the formula; recalibrate any
// new size against the rendered bitmap before adding it here.
const MARK_TOP_BY_TEXT = { 12: 1, 18: 1, 20: 1, 22: 2, 23: 2, 28: 3 }

export default function KolumnLockup({
  text,
  weight = 500,
  className = '',
  // Pass '' to inherit the parent's text color (e.g. the muted landing footer).
  wordClassName = 'text-[var(--text-primary)]',
}) {
  const mark = Math.round(text * MARK_RATIO)
  const height = Math.ceil(text / 2) * 2 // even → integer origin in even-height rows
  const markTop = MARK_TOP_BY_TEXT[text] ?? Math.round((height - mark) / 2 + text * OFFSET_RATIO)
  return (
    <span
      className={`flex items-center ${className}`}
      style={{ gap: `${text * GAP_RATIO}px`, height: `${height}px` }}
    >
      <span className="inline-flex self-start" style={{ marginTop: `${markTop}px` }}>
        <KolumnLogo size={mark} />
      </span>
      <span
        className={`tracking-tight leading-none font-logo ${wordClassName}`}
        style={{ fontSize: `${text}px`, fontWeight: weight }}
      >
        Kolumn
      </span>
    </span>
  )
}
