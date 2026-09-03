import { Link } from 'react-router-dom'
import { Sparkle, Crown } from '@phosphor-icons/react'

// Tutorials hub + article "Next up" tile. Thumbnail rotates through the
// app's own label-palette washes (never lime as a fill on something
// clickable — lime is a state color only). 12px radius, 1px border, per
// the tutorials spec §3 card anatomy.
const WASHES = ['bg-[var(--accent-lime-wash)]', 'bg-[var(--label-blue-bg)]', 'bg-[var(--label-purple-bg)]']

export default function TutorialCard({ tutorial, index = 0 }) {
  const wash = WASHES[index % WASHES.length]
  return (
    <Link
      to={`/tutorials/${tutorial.slug}`}
      className="group flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden hover:border-[var(--border-focus)] hover:-translate-y-px transition-[border-color,transform] duration-150"
    >
      <div className={`aspect-[2.73/1] ${wash} flex items-center justify-center`}>
        <Sparkle size={28} weight="duotone" className="text-[var(--text-primary)]/60" />
      </div>
      <div className="p-4 flex flex-col gap-1.5">
        <h3 className="font-heading font-[425] text-lg leading-snug text-[var(--text-primary)]">{tutorial.title}</h3>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{tutorial.summary}</p>
        <div className="font-mono text-xs text-[var(--text-muted)] mt-1.5 flex items-center gap-1.5">
          {tutorial.tier === 'pro' ? <Crown size={13} /> : <Sparkle size={13} />}
          <span>{tutorial.tier === 'pro' ? 'Pro' : 'Free'} · {tutorial.minutes} min</span>
        </div>
      </div>
    </Link>
  )
}
