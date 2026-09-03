import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ScenarioTag from '../../components/customers/ScenarioTag'
import BoardPreview from '../../components/customers/BoardPreview'
import StoryCard from '../../components/customers/StoryCard'
import { CUSTOMER_STORIES, featuredStory } from '../../content/customers'
import { CONTACT_EMAIL } from '../../content/pricing'

// /customers — the hub. Spec: docs/superpowers/specs/marketing/customers.md
// §3. Kolumn has no named customers, no logos, and no measured outcomes —
// this page launches as a scenario gallery instead, and every story is
// labelled "Scenario" wherever it appears (see ScenarioTag). The disclosure
// line under "Four scenarios" is load-bearing; do not remove it.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'

export default function CustomersPage() {
  const featured = featuredStory()
  const grid = CUSTOMER_STORIES.filter((s) => s.slug !== featured.slug)

  return (
    <>
      <section className={`${SECTION} pt-20 pb-16`}>
        <div className="grid lg:grid-cols-[1fr_320px] gap-12 items-start">
          <div>
            <h1 className="font-heading font-[425] text-5xl sm:text-6xl tracking-tight leading-[1.08] text-[var(--text-primary)] max-w-[640px] mb-5">
              How people run their work on Kolumn
            </h1>
            <p className="text-xl leading-8 text-[var(--text-secondary)] max-w-[560px] mb-8">
              Kolumn is young and we don&rsquo;t have customer logos to show you yet. What we have are four worked
              scenarios — the kinds of teams the product is built for, written out board by board. When real teams
              let us tell their story, they&rsquo;ll appear here first.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/onboarding">Start free</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>

          <div>
            <h2 className="sr-only">Featured scenario</h2>
            <Link
              to={`/customers/${featured.slug}`}
              className="block rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden hover:border-[var(--border-focus)] transition-colors duration-150"
            >
              <div className="aspect-[16/9] bg-[var(--surface-raised)] border-b border-[var(--border-subtle)]">
                <BoardPreview columns={featured.boardPreview.columns} size="sm" />
              </div>
              <div className="p-5 flex flex-col gap-2">
                <ScenarioTag kind={featured.kind} persona={featured.persona} />
                <h3 className="font-heading font-[425] text-[15px] leading-snug text-[var(--text-primary)] line-clamp-2">
                  {featured.headline}
                </h3>
                <span className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-[var(--color-sand)] bg-[var(--color-cream)] text-[var(--text-primary)] text-xs font-medium w-fit mt-1">
                  Read the scenario
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <h2 className="font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight mb-1">
          Four scenarios
        </h2>
        <p className="font-mono text-xs text-[var(--text-secondary)] mb-8">
          Scenarios are illustrative — composite teams, real features, no invented numbers.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {grid.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-sidebar)] p-8 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="font-heading font-[425] text-2xl text-[var(--text-primary)] mb-2">Using Kolumn for real work?</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              We&rsquo;d like to write it up — a short conversation, a look at the boards you&rsquo;re willing to
              show, and you approve every word before it goes live. First stories replace the scenarios above.
            </p>
          </div>
          <div className="md:justify-self-end">
            <Button asChild variant="secondary" size="lg">
              <a href={`mailto:${CONTACT_EMAIL}?subject=Our%20Kolumn%20story`}>Get in touch</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-b border-[var(--border-subtle)] bg-[var(--surface-sidebar)]">
        <div className={`${SECTION} py-20 text-center`}>
          <h2 className="font-heading font-[425] text-4xl sm:text-5xl tracking-tight text-[var(--text-primary)] max-w-[720px] mx-auto mb-3">
            Try it on a board of your own
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Free tier, no card, a board in under a minute. Type the first three tasks into the pill and see what it
            does with them.
          </p>
          <Button asChild size="lg">
            <Link to="/onboarding">Start free</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
