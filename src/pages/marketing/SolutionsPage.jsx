import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import DynamicIcon from '../../components/board/DynamicIcon'
import { SOLUTIONS, GROUPS, PIECES } from '../../content/solutions'

// /solutions hub — solutions.md §3. Hero → tile grid (grouped by team/work)
// → "what every board comes with" → CTA band. Not routed yet (the caller
// wires marketing-routes.js separately).

const SECTION = 'max-w-6xl mx-auto px-6 sm:px-10'
const H2 = 'font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)]'

function TileGroup({ group }) {
  return (
    <div className="mb-14 last:mb-0">
      <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">{group.caption}</p>
      <h2 className={`${H2} mb-6`}>{group.title}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-[var(--border-subtle)] border-t border-b border-[var(--border-subtle)]">
        {group.slugs.map((slug) => {
          const solution = SOLUTIONS[slug]
          return (
            <Link
              key={slug}
              to={`/solutions/${slug}`}
              className="p-8 min-h-[220px] flex flex-col gap-3 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <DynamicIcon name={solution.icon} className="w-6 h-6 text-[var(--text-secondary)]" />
              <h3 className="font-heading font-[425] text-xl text-[var(--text-primary)]">{solution.name}</h3>
              <p className="text-[15px] leading-6 text-[var(--text-secondary)] flex-1">{solution.blurb}</p>
              <span className="inline-flex items-center gap-1 text-sm text-[var(--text-primary)] font-medium">
                See the board →
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function SolutionsPage() {
  return (
    <>
      {/* Hero */}
      <section className={`${SECTION} pt-16 pb-16 text-center`}>
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">Solutions</p>
        <h1 className="font-heading font-normal text-5xl sm:text-6xl tracking-tight leading-[1.08] text-[var(--text-primary)] max-w-[40rem] mx-auto mb-5">
          One kanban. Eight ways to use it.
        </h1>
        <p className="text-xl leading-8 text-[var(--text-secondary)] max-w-[44rem] mx-auto mb-8">
          Kolumn doesn't change by industry — the board does. Pick the team that looks like yours and start
          from a board built for its work.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="primary" size="lg">
            <Link to="/onboarding">Start free</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </section>

      {/* Tile grid */}
      <section className={`${SECTION} py-10`}>
        {GROUPS.map((group) => (
          <TileGroup key={group.id} group={group} />
        ))}
      </section>

      {/* Every board, same pieces */}
      <section className={`${SECTION} py-20`}>
        <h2 className={`${H2} text-center mb-12`}>What every board comes with</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 max-w-5xl mx-auto">
          {PIECES.map((piece) => (
            <div key={piece.title} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <DynamicIcon name={piece.icon} className="w-5 h-5 text-[var(--text-secondary)]" />
                <h3 className="font-sans text-base font-semibold text-[var(--text-primary)]">{piece.title}</h3>
              </div>
              <p className="text-[15px] leading-6 text-[var(--text-secondary)]">{piece.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className={`${SECTION} pb-20`}>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-10 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-center md:text-left">
          <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)]">
            Not on the list? Start with a blank board.
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center shrink-0">
            <Button asChild variant="secondary" size="lg">
              <Link to="/pricing">See pricing</Link>
            </Button>
            <Button asChild variant="primary" size="lg">
              <Link to="/onboarding">Start free</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
