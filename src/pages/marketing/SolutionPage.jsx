import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import Button from '../../components/ui/Button'
import SegmentedControl from '../../components/ui/SegmentedControl'
import DynamicIcon from '../../components/board/DynamicIcon'
import CardVisual from '../../components/board/CardVisual'
import FaqItem from '../../components/marketing/FaqItem'
import { SHARED_FAQ, TIER_STRINGS } from '../../content/solutions/_shared'

const noop = () => {}

// One component renders every /solutions/<slug> page (solution-page.md §3).
// Section order: hero → pains → how Kolumn helps → example board → FAQ →
// CTA band. The proof strip (§2) is intentionally absent — every vertical
// ships with an empty testimonials array (open question 1), so there is
// nothing to render yet; nothing here fakes a quote in the meantime.

const SECTION = 'max-w-6xl mx-auto px-6 sm:px-10'
const H2 = 'font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)]'

// Sentinel due-date labels ('fri', 'thu', '+3d', '+21d', …) — content-authored
// shorthand so a solutions page doesn't hardcode a real calendar date that
// goes stale. Resolved to an actual date at render time (relative to "today")
// so it can flow through the product's own due-date pill (CardVisual →
// parseDueDate/formatDueDateLabel) instead of a hand-typed label — the same
// spirit as seedOnboardingBoard.js's resolveDueDate, extended to weekday
// sentinels.
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
function resolveDueSentinel(due) {
  if (!due) return null
  const relative = /^\+(\d+)d$/.exec(due)
  if (relative) return format(addDays(new Date(), Number(relative[1])), 'yyyy-MM-dd')
  const targetDow = WEEKDAYS.indexOf(due.toLowerCase())
  if (targetDow === -1) return null
  const today = new Date()
  let diff = (targetDow - today.getDay() + 7) % 7
  if (diff === 0) diff = 7 // next occurrence, not "today"
  return format(addDays(today, diff), 'yyyy-MM-dd')
}

// A checklist on solution content is a count ({ done, total }), not the
// product's item array — synthesize placeholder items so CardVisual's real
// checklist pill (and expand-to-see-items affordance) renders correctly.
function checklistItemsFromCount(checklist) {
  if (!checklist) return []
  return Array.from({ length: checklist.total }, (_, i) => ({
    text: `Item ${i + 1}`,
    done: i < checklist.done,
  }))
}

// Renders the product's real card face (CardVisual) for a solution page's
// static example-board content. Content fields (due sentinel, checklist
// count, single assignee name, plain-string labels) are adapted into the
// shape CardVisual/the real product expects.
function BoardCard({ card }) {
  return (
    <CardVisual
      card={{
        id: card.title,
        title: card.title,
        description: card.description || '',
        icon: card.icon,
        priority: card.priority,
        due_date: resolveDueSentinel(card.due),
        checklist: checklistItemsFromCount(card.checklist),
        assignee_name: card.assignee || '',
        completed: false,
      }}
      labels={(card.labels || []).map((text) => ({ text, color: 'gray' }))}
      profile={null}
      watchers={[]}
      font="default"
      labelStyle="alt"
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

// Hero right column — the vertical's example board cropped to its first two
// columns, ~2 cards each (solution-page.md §3.1: "not a doodle").
function HeroBoardPreview({ board }) {
  const cols = board.columns.slice(0, 2)
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 sm:p-5">
      {/* Scrolls rather than squeezing: a 2-up grid rendered these cards at
          146px on a phone, roughly 40% of their true in-app width, which wraps
          titles that would fit on one line in the product. Columns now hold the
          real board width (Column.jsx:152) and the strip scrolls, which is also
          what a real board does. */}
      <div className="flex gap-3 sm:gap-5 overflow-x-auto -mx-1 px-1">
        {cols.map((col) => (
          <div key={col.title} className="flex flex-col gap-2 w-[260px] lg:w-[290px] shrink-0 px-0.5">
            <div className="font-sans text-sm font-semibold text-[var(--text-secondary)] truncate">{col.title}</div>
            <div className="flex flex-col gap-2">
              {col.cards.slice(0, 2).map((card) => (
                <BoardCard key={card.title} card={card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// The "how Kolumn helps" canvas — a static mock of the pill or chat doing
// the vertical's job, per the active tab. kind: 'pill' | 'chat' | 'info'.
function HelpCanvas({ help }) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-6 sm:p-8 min-h-[240px] grid gap-6 md:grid-cols-2 items-center">
      <div className="min-w-0">
        {help.kind === 'pill' && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-4 h-11 min-w-0">
            <DynamicIcon name={help.icon} className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <span className="text-sm text-[var(--text-primary)] truncate min-w-0">{help.prompt}</span>
          </div>
        )}
        {help.kind === 'chat' && (
          <div className="rounded-xl rounded-bl-sm bg-[var(--surface-hover)] px-4 py-2.5 text-sm text-[var(--text-primary)] max-w-[85%]">
            {help.prompt}
          </div>
        )}
        {help.kind === 'info' && (
          <div className="flex items-center gap-3 text-[var(--text-secondary)]">
            <DynamicIcon name={help.icon} className="w-6 h-6 shrink-0" />
            <span className="text-sm">No prompt needed — this is how the board behaves.</span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        {help.kind === 'chat' && help.result?.[0] && (
          <div className="rounded-xl rounded-br-sm bg-[var(--surface-page)] border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] max-w-[90%] ml-auto">
            {help.result[0]}
          </div>
        )}
        {help.kind === 'pill' && help.result?.length > 0 && (
          <div className="flex flex-col gap-2">
            {help.result.map((card) => (
              <BoardCard key={card.title} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SolutionPage({ solution }) {
  const { slug, hero, pains, helpIntro, helps, board, faq, cta } = solution
  const [activeTab, setActiveTab] = useState(helps[0].tab)
  const activeHelp = helps.find((h) => h.tab === activeTab) || helps[0]
  const faqItems = [...SHARED_FAQ, ...faq]
  const onboardingHref = `/onboarding?board=${slug}`

  return (
    <>
      {/* Hero */}
      <section className={`${SECTION} pt-16 pb-10 grid md:grid-cols-2 gap-10 items-center`}>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">{hero.eyebrow}</p>
          <h1 className="font-heading font-normal text-5xl sm:text-6xl tracking-tight leading-[1.08] text-[var(--text-primary)] max-w-[42rem] mb-5">
            {hero.h1}
          </h1>
          <p className="text-xl leading-8 text-[var(--text-secondary)] max-w-[44rem] mb-8">{hero.subhead}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="primary" size="lg">
              <Link to={onboardingHref}>Start free</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href="#board">See the example board</a>
            </Button>
          </div>
        </div>
        <HeroBoardPreview board={board} />
      </section>

      {/* Pain points */}
      <section className={`${SECTION} py-20`}>
        <h2 className={`${H2} text-center mb-10`}>Where it breaks today</h2>
        <div className="max-w-[40rem] mx-auto flex flex-col">
          {pains.map((pain) => (
            <div
              key={pain.title}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-8 pt-6 pb-6 border-t border-[var(--border-subtle)]"
            >
              <div className="flex items-start gap-2">
                <DynamicIcon name={pain.icon} className="w-5 h-5 text-[var(--text-muted)] mt-0.5 shrink-0" />
                <h3 className="font-heading font-[425] text-xl leading-snug text-[var(--text-primary)]">{pain.title}</h3>
              </div>
              <p className="text-[17px] leading-7 text-[var(--text-secondary)]">{pain.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How Kolumn helps */}
      <section className={`${SECTION} py-20`}>
        <div className="text-center mb-10">
          <h2 className={`${H2} mb-3`}>How Kolumn helps</h2>
          <p className="text-base text-[var(--text-secondary)] max-w-2xl mx-auto">{helpIntro}</p>
        </div>
        <div className="flex justify-center mb-8">
          <SegmentedControl
            ariaLabel="How Kolumn helps"
            value={activeTab}
            onChange={setActiveTab}
            options={helps.map((h) => ({
              value: h.tab,
              label: h.tab,
              icon: <DynamicIcon name={h.icon} className="w-4 h-4" />,
            }))}
          />
        </div>
        <HelpCanvas help={activeHelp} />
        <div className="grid md:grid-cols-2 gap-8 max-w-[54rem] mx-auto mt-8">
          <h3 className="font-heading font-[425] text-2xl text-[var(--text-primary)]">{activeHelp.title}</h3>
          <div>
            <p className="text-[17px] leading-7 text-[var(--text-secondary)]">{activeHelp.body}</p>
            {activeHelp.pro && (
              <p className="font-mono text-xs text-[var(--text-muted)] mt-2">{TIER_STRINGS.pillPro}</p>
            )}
            {activeHelp.kind === 'chat' && (
              <p className="font-mono text-xs text-[var(--text-muted)] mt-2">{TIER_STRINGS.chatReadTools}</p>
            )}
          </div>
        </div>
      </section>

      {/* Example board */}
      <section id="board" className={`${SECTION} py-20`}>
        <div className="text-center mb-10">
          <h2 className={`${H2} mb-2`}>{board.name}</h2>
          <p className="text-base text-[var(--text-secondary)]">An example board. Start with it, then make it yours.</p>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max sm:min-w-0 sm:grid sm:grid-cols-4">
            {board.columns.map((col) => (
              <div key={col.title} className="w-64 sm:w-auto flex flex-col gap-3">
                <div className="font-sans text-sm font-semibold text-[var(--text-secondary)]">{col.title}</div>
                <div className="flex flex-col gap-2">
                  {col.cards.map((card) => (
                    <BoardCard key={card.title} card={card} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <Button asChild variant="primary" size="lg">
            <Link to={onboardingHref}>Start with this board</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/templates">Browse all templates</Link>
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className={`${SECTION} py-20`}>
        <div className="text-center mb-12">
          <h2 className={H2}>Questions</h2>
        </div>
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          {faqItems.map((item, i) => (
            <FaqItem key={item.q} question={item.q} answer={item.a} index={i} />
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className={`${SECTION} pb-20`}>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-10 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-center md:text-left">
          <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)]">{cta.heading}</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center shrink-0">
            <Button asChild variant="secondary" size="lg">
              <Link to="/pricing">See pricing</Link>
            </Button>
            <Button asChild variant="primary" size="lg">
              <Link to={onboardingHref}>Start free</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
