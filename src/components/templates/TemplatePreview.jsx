import DynamicIcon from '../board/DynamicIcon'
import { PRIORITY_DOT } from '../../utils/formatting'

// Read-only miniature board preview for a template's detail page — spec
// §D3. Deliberately a small self-contained component rather than a fork of
// the landing page's demo-card internals (those are module-private inside
// LandingPage.jsx and out of scope for this page build). Columns get the
// kanban-card 16px radius exception (see CLAUDE.md → Coherency Rules).
function PreviewCard({ card }) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-page)] p-3 flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        {card.icon && (
          <DynamicIcon name={card.icon} className="w-4 h-4 mt-0.5 text-[var(--text-secondary)] shrink-0" />
        )}
        <p className="text-[13px] text-[var(--text-primary)] leading-snug">{card.title}</p>
      </div>
      <div className="flex items-center gap-1.5 pl-6">
        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[card.priority] || PRIORITY_DOT.medium}`} />
        <span className="text-[11px] font-mono text-[var(--text-muted)] capitalize">{card.priority || 'medium'}</span>
        {card.checklist?.length > 0 && (
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            · 0/{card.checklist.length}
          </span>
        )}
      </div>
    </div>
  )
}

export default function TemplatePreview({ template }) {
  return (
    <div className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-page)] p-6 overflow-x-auto">
      <div className="flex gap-4 min-w-max">
        {template.columns.map((col) => (
          <div key={col.title} className="w-[220px] shrink-0 rounded-[10px] bg-[var(--surface-card)] p-3 flex flex-col gap-2">
            {/* Not a heading: this is a decorative board-preview label, not part of
                the page's document outline (avoids a level skip under whatever
                heading wraps this component). */}
            <p className="text-[13px] font-medium text-[var(--text-primary)] px-1">{col.title}</p>
            {col.cards.length > 0 ? (
              col.cards.map((card) => <PreviewCard key={card.title} card={card} />)
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-3 text-center text-[11px] font-mono text-[var(--text-faint)]">
                Drop cards here
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
