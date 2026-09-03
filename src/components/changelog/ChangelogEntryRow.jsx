import { Link } from 'react-router-dom'
import { LinkSimple } from '@phosphor-icons/react'
import { LABEL_BG } from '../../utils/formatting'
import { changelogEntryId } from '../../content/changelog'

// One row in the /changelog list (and the "Latest" block, via `large`).
// Tag color reuses the app's own card-label palette (New = green,
// Improved = blue, Fixed = yellow) so a changelog tag reads like a label
// on a card, not a new color system. Lime is never used — it's a state
// color, and "New" is not a state.
const TAG_STYLE = {
  new: LABEL_BG.green,
  improved: LABEL_BG.blue,
  fixed: LABEL_BG.yellow,
}
const TAG_LABEL = { new: 'New', improved: 'Improved', fixed: 'Fixed' }

function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function ChangelogEntryRow({ entry, large = false }) {
  const id = changelogEntryId(entry)
  return (
    <div id={id} className="grid grid-cols-1 md:grid-cols-[120px_88px_1fr] gap-2 md:gap-4 border-b border-[var(--border-subtle)] py-4">
      <div className="font-mono text-xs text-[var(--text-muted)] md:pt-1">{formatDate(entry.date)}</div>
      <div className="md:pt-0.5">
        <span className={`font-mono text-[11px] h-6 px-2 inline-flex items-center rounded-full ${TAG_STYLE[entry.tag]}`}>
          {TAG_LABEL[entry.tag]}
        </span>
      </div>
      <div>
        <a
          href={`#${id}`}
          className={`group inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)] ${large ? 'text-2xl font-heading font-[425]' : 'text-[17px]'}`}
        >
          {entry.title}
          <LinkSimple size={14} className="text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
        <p className="text-[15px] leading-6 text-[var(--text-secondary)] mt-1 max-w-[640px]">{entry.body}</p>
        {entry.links?.tutorial && (
          <div className="font-mono text-xs mt-2">
            <Link to={`/tutorials/${entry.links.tutorial}`} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Tutorial →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
