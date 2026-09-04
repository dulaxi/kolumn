import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { COMPARISONS_LIST } from '../../content/comparisons'
import { CHECKED_ON } from '../../content/comparisons/_shared'

// /compare hub — lists the three honest comparison pages. Small on purpose:
// docs/superpowers/specs/marketing/_competitor-monday.md §3's recommendation
// is "three well-verified pages beat eight formulaic ones," so this hub
// never grows past the three Kolumn's brief names (Trello, Asana, Notion).

const SECTION = 'max-w-6xl mx-auto px-6 sm:px-10'
const H2 = 'font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)]'

export default function ComparisonsPage() {
  return (
    <>
      {/* Hero */}
      <section className={`${SECTION} pt-16 pb-16 text-center`}>
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">Compare</p>
        <h1 className="font-heading font-normal text-5xl sm:text-6xl tracking-tight leading-[1.08] text-[var(--text-primary)] max-w-[40rem] mx-auto mb-5">
          How Kolumn compares
        </h1>
        <p className="text-xl leading-8 text-[var(--text-secondary)] max-w-[44rem] mx-auto mb-8">
          Three honest, single-vendor comparisons — what each product actually is, what it costs, and where the
          other product is genuinely the better choice.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button asChild variant="primary" size="lg">
            <Link to="/onboarding">Start free</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
        <p className="font-mono text-xs text-[var(--text-muted)]">Competitor details last checked {CHECKED_ON}.</p>
      </section>

      {/* Tile grid */}
      <section className={`${SECTION} py-10`}>
        <h2 className="sr-only">Comparisons</h2>
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] border-t border-b border-[var(--border-subtle)]">
          {COMPARISONS_LIST.map(({ COMPARISON }) => (
            <Link
              key={COMPARISON.slug}
              to={`/compare/${COMPARISON.slug}`}
              className="p-8 min-h-[200px] flex flex-col gap-3 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <h3 className="font-heading font-[425] text-xl text-[var(--text-primary)]">Kolumn vs {COMPARISON.name}</h3>
              <p className="text-[15px] leading-6 text-[var(--text-secondary)] flex-1">{COMPARISON.hero.subhead}</p>
              <span className="inline-flex items-center gap-1 text-sm text-[var(--text-primary)] font-medium">
                Read the comparison →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why these three */}
      <section className={`${SECTION} py-20`}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className={`${H2} mb-4`}>Why only these three</h2>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">
            Asana, Trello, and Notion are the products Kolumn names on its own landing page as the field it sits in.
            Each comparison names real scenarios where the other product is the better choice — Kolumn is a young,
            narrower tool, and these pages say so plainly rather than pretending otherwise.
          </p>
        </div>
      </section>

      {/* CTA band */}
      <section className={`${SECTION} pb-20`}>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-10 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-center md:text-left">
          <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)]">
            Still not sure? Start on Free and see for yourself.
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
