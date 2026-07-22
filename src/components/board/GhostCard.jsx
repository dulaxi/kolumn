import Card from './Card'
import { formatDistanceToNowStrict } from 'date-fns'
import { resolveProfileColor } from '../../constants/colors'

// Recency → translucency. Even the most recent ghost stays semi-transparent so
// it reads as a phantom, never mistaken for a live card.
const GHOST_OPACITY = { 1: 0.6, 2: 0.42, 3: 0.3 }

const noop = () => {}

// A ghost is an EXACT ditto of the real card at its previous slot — same size,
// same layout, same content — with the colour drained (grayscale + translucent)
// and a dashed outline so it reads as a phantom. Move attribution is woven into
// the card's own bottom line: when-moved on the left (the date slot), the mover
// avatar on the right (the assignee slot). Inert: aria-hidden + pointer-events
// none, never in the DnD context.
export default function GhostCard({ card, moverName, moverColor, movedAt, age = 1, approximate = false }) {
  if (!card) return null
  const pc = resolveProfileColor(moverColor)
  const color = pc.style?.background || 'var(--color-mist)'
  const initial = (moverName?.[0] || '?').toLowerCase()
  const when = movedAt ? formatDistanceToNowStrict(new Date(movedAt), { addSuffix: true }) : ''

  return (
    <div
      aria-hidden="true"
      style={{ pointerEvents: 'none', borderColor: `color-mix(in srgb, ${color} 60%, transparent)` }}
      className="relative select-none rounded-2xl border-[1.5px] border-dashed"
    >
      {/* Exact card, colour drained to a ghost */}
      <div style={{ filter: 'grayscale(0.9)', opacity: GHOST_OPACITY[age] ?? 0.24 }}>
        <Card card={card} onClick={noop} onComplete={noop} />
      </div>

      {/* Move attribution in the card's own bottom line:
          when-moved (date slot, left) · mover avatar (assignee slot, right) */}
      <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-2">
        {when ? (
          <span className="rounded bg-[var(--surface-sidebar)]/85 px-1 font-mono text-[10.5px] text-[var(--text-secondary)]">
            moved {when}
          </span>
        ) : <span />}
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-[var(--surface-sidebar)]"
          style={{ ...pc.style, background: color }}
          title={approximate ? `${moverName} moved this from here` : `${moverName} moved this`}
        >
          {initial}
        </span>
      </div>
    </div>
  )
}
