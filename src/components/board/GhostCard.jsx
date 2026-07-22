import Card from './Card'
import { resolveProfileColor } from '../../constants/colors'

// Recency → translucency. Even the most recent ghost stays semi-transparent so
// it reads as a phantom, never mistaken for a live card.
const GHOST_OPACITY = { 1: 0.55, 2: 0.4, 3: 0.28 }

const noop = () => {}

// A ghost is an EXACT ditto of the real card at its previous slot — same size,
// same layout, same content — with the colour drained (grayscale + translucent)
// so it reads as a phantom. Inert: aria-hidden + pointer-events none, never in
// the DnD context. A small mover badge (kept at full colour) preserves "who".
export default function GhostCard({ card, moverName, moverColor, age = 1, approximate = false }) {
  if (!card) return null
  const pc = resolveProfileColor(moverColor)
  const color = pc.style?.background || 'var(--color-mist)'
  const initial = (moverName?.[0] || '?').toLowerCase()

  return (
    <div aria-hidden="true" style={{ pointerEvents: 'none' }} className="relative select-none">
      {/* Exact card, colour drained to a ghost */}
      <div style={{ filter: 'grayscale(0.9)', opacity: GHOST_OPACITY[age] ?? 0.22 }}>
        <Card card={card} onClick={noop} onComplete={noop} />
      </div>
      {/* Who moved it — kept vivid so attribution survives the drain */}
      <span
        className="absolute -top-2 -right-2 z-10 w-[19px] h-[19px] rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[var(--surface-sidebar)]"
        style={{ ...pc.style, background: color }}
        title={approximate ? `${moverName} moved this from here` : `${moverName} moved this`}
      >
        {initial}
      </span>
    </div>
  )
}
