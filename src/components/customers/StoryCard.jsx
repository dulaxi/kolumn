import { Link } from 'react-router-dom'
import ScenarioTag from './ScenarioTag'
import BoardPreview from './BoardPreview'

// Hub grid tile + "More scenarios" tile. The preview well always shows the
// story's board preview (never a logo — Kolumn has none), and ScenarioTag
// keeps the "this is illustrative, not a real customer" label visible
// wherever a story can be discovered.
export default function StoryCard({ story }) {
  return (
    <Link
      to={`/customers/${story.slug}`}
      className="group flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden hover:border-[var(--border-default)]/80 transition-colors duration-150"
    >
      <div className="aspect-[16/9] bg-[var(--surface-raised)] border-b border-[var(--border-subtle)]">
        <BoardPreview columns={story.boardPreview.columns} size="sm" />
      </div>
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ScenarioTag kind={story.kind} />
          <span className="font-mono text-[11px] text-[var(--text-muted)]">{story.persona}</span>
        </div>
        <h3 className="font-heading font-[425] text-lg leading-snug text-[var(--text-primary)] line-clamp-2">{story.headline}</h3>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{story.summary}</p>
      </div>
    </Link>
  )
}
