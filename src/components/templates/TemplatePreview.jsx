import { ArrowRight } from '@phosphor-icons/react'
import CardVisual from '../board/CardVisual'
import { resolveDueSentinel } from '../../lib/dueSentinel'

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
        due_date: resolveDueSentinel(card.due),
        checklist: card.checklist || [],
        assignee_name: card.assignee || '',
        completed: false,
      }}
      labels={card.labels || []}
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

// A template board has 4-5 columns; five real 260px columns (Column.jsx:152)
// plus gaps run well past this page's content width, so — unlike every
// other card depiction on the marketing site — this one keeps a horizontal
// scroll rather than shrinking cards to fit (spec: "one card width
// everywhere", with this as the one deliberate exception). To keep that
// scroll from reading as a layout cutoff, the right edge fades to
// transparent and an explicit "scroll for more columns" hint sits under
// the strip.
export default function TemplatePreview({ template }) {
  return (
    <div className="w-full">
      <div className="relative">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-page)] p-6 overflow-x-auto subtle-scrollbar">
          <div className="flex gap-3 sm:gap-5 min-w-max">
            {template.columns.map((col) => (
              // 260px mirrors the real board column (Column.jsx:152 at sm), with no
              // horizontal padding on the card list itself (matching Column.jsx's own
              // card-list container) so the card inside renders at its true in-app
              // width rather than a narrower approximation that wraps titles
              // differently. The column title keeps the header's own px-0.5 inset.
              <div key={col.title} className="w-[260px] lg:w-[290px] shrink-0 flex flex-col gap-2">
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
        {/* Fade hint: the strip always overflows (every template has 4-5
            columns), so this is unconditional rather than scroll-state-driven. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-6 bottom-6 right-0 w-16 rounded-r-xl bg-gradient-to-l from-[var(--surface-page)] to-transparent"
        />
      </div>
      <p className="mt-2 flex items-center gap-1 font-mono text-[11px] text-[var(--text-muted)]">
        Scroll to see all {template.columns.length} columns
        <ArrowRight size={12} />
      </p>
    </div>
  )
}
