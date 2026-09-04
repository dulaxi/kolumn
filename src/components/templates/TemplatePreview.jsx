import CardVisual from '../board/CardVisual'

const noop = () => {}

// Read-only miniature board preview for a template's detail page — spec
// §D3. Renders the product's real card face (CardVisual, the presentational
// half of board/Card.jsx) with static template data instead of a hand-drawn
// approximation, so a template preview matches the board a user actually
// gets. Columns get the kanban-card 16px radius exception (see CLAUDE.md →
// Coherency Rules) — that radius lives inside CardVisual itself.
function PreviewCard({ card }) {
  return (
    <CardVisual
      card={{
        id: card.title,
        title: card.title,
        description: card.description || '',
        icon: card.icon,
        priority: card.priority,
        due_date: null,
        checklist: card.checklist || [],
        completed: false,
      }}
      labels={[]}
      profile={null}
      watchers={[]}
      font="default"
      labelStyle="text"
      iconStyle="boxed"
      toggleLabelStyle={noop}
      toggleIconStyle={noop}
      onToggleChecklistItem={noop}
      onClick={noop}
      onComplete={noop}
      interactive={false}
    />
  )
}

export default function TemplatePreview({ template }) {
  return (
    <div className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-page)] p-6 overflow-x-auto">
      <div className="flex gap-3 sm:gap-5 min-w-max">
        {template.columns.map((col) => (
          // 290px + px-0.5 mirrors the real board column (Column.jsx:152 at lg),
          // so the card inside renders at its true in-app width rather than a
          // narrower approximation that wraps titles differently.
          <div key={col.title} className="w-[290px] shrink-0 flex flex-col gap-2 px-0.5">
            {/* Not a heading: this is a decorative board-preview label, not part of
                the page's document outline (avoids a level skip under whatever
                heading wraps this component). */}
            <p className="text-sm font-semibold text-[var(--text-primary)] px-0.5 pb-1">{col.title}</p>
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
