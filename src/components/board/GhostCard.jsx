import { formatDistanceToNowStrict } from 'date-fns'
import { resolveProfileColor } from '../../constants/colors'

const AGE_OPACITY = { 1: 1, 2: 0.62, 3: 0.4 }

// Inert, dashed placeholder shown at a card's previous slot while its source
// card is hovered in ghost mode. Never interactive; never in the DnD context.
export default function GhostCard({ title, moverName, moverColor, movedAt, age = 1, approximate = false }) {
  const pc = resolveProfileColor(moverColor)
  const color = pc.style?.background || 'var(--color-mist)'
  const when = movedAt ? formatDistanceToNowStrict(new Date(movedAt), { addSuffix: true }) : ''
  const initial = (moverName?.[0] || '?').toLowerCase()

  return (
    <div
      aria-hidden="true"
      style={{
        pointerEvents: 'none',
        opacity: AGE_OPACITY[age] ?? 0.26,
        borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
        backgroundImage: `repeating-linear-gradient(135deg, color-mix(in srgb, ${color} 7%, transparent) 0 6px, transparent 6px 12px)`,
      }}
      className="relative rounded-2xl border-[1.5px] border-dashed p-3 select-none"
    >
      <span
        className="absolute -top-2 -right-2 w-[19px] h-[19px] rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[var(--surface-sidebar)]"
        style={{ ...pc.style, background: color }}
      >
        {initial}
      </span>
      <div className="text-[13px] font-medium leading-snug text-[var(--text-muted)]">{title}</div>
      <div className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--text-muted)]">
        <span className="w-[17px] h-[17px] rounded-full flex items-center justify-center text-[8.5px] font-bold text-white shrink-0" style={{ ...pc.style, background: color }}>{initial}</span>
        {approximate ? `${moverName} moved this from here · ${when}` : `${moverName} moved this · ${when}`}
      </div>
    </div>
  )
}
