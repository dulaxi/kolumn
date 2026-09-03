import { Link, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ScenarioTag from '../../components/customers/ScenarioTag'
import BoardPreview from '../../components/customers/BoardPreview'
import StoryCard from '../../components/customers/StoryCard'
import Prose from '../../components/marketing/Prose'
import { getStory, relatedStories } from '../../content/customers'

// /customers/<slug> — one component renders any story. Spec:
// docs/superpowers/specs/marketing/customers.md §3 (story template). Every
// scenario carries a visible "Scenario" tag in the hero AND a plain-language
// disclosure sentence right under the headline — this page must never be
// mistaken for a real customer testimonial. `metrics` never renders here:
// scenarios show `setup` (what they configured) instead of a fabricated number.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'

export default function CustomerStoryPage() {
  const { slug } = useParams()
  const story = getStory(slug)

  if (!story) {
    return (
      <section className={`${SECTION} py-24 text-center`}>
        <h1 className="font-heading font-[425] text-3xl text-[var(--text-primary)] mb-3">Story not found</h1>
        <p className="text-[var(--text-secondary)] mb-6">That story doesn&rsquo;t exist, or the link is wrong.</p>
        <Button asChild size="lg">
          <Link to="/customers">Back to all scenarios</Link>
        </Button>
      </section>
    )
  }

  const related = relatedStories(story)
  const isScenario = story.kind !== 'customer'

  return (
    <>
      <section className={`${SECTION} pt-16 text-center`}>
        <nav aria-label="Breadcrumb" className="font-mono text-xs text-[var(--text-muted)] mb-6">
          <Link to="/customers" className="hover:text-[var(--text-primary)] transition-colors">Customers</Link>
          <span className="mx-1.5">/</span>
          <span className="text-[var(--text-primary)]">{story.name}</span>
        </nav>

        <ScenarioTag kind={story.kind} persona={story.persona} className="mb-4" />
        <h1 className="font-heading font-[425] text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-[var(--text-primary)] max-w-[880px] mx-auto mb-4">
          {story.headline}
        </h1>
        {isScenario && (
          <p className="font-mono text-xs text-[var(--text-muted)] max-w-[560px] mx-auto mb-6">
            This is an illustrative scenario — a composite of how people use Kolumn, not a named customer.
          </p>
        )}
        <Button asChild size="lg">
          <Link to="/onboarding">Start free</Link>
        </Button>

        <div className="mt-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] overflow-hidden text-left">
          <BoardPreview columns={story.boardPreview.columns} size="lg" />
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-8 text-left">
          <div className="border-l border-[var(--border-subtle)] pl-6 py-3">
            <dl className="font-mono text-xs flex flex-col gap-2">
              <div className="flex justify-between gap-4"><dt className="text-[var(--text-primary)]">Team</dt><dd className="text-[var(--text-muted)]">{story.teamSize}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--text-primary)]">Work</dt><dd className="text-[var(--text-muted)] text-right">{story.role}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--text-primary)]">Plan</dt><dd className="text-[var(--text-muted)]">{story.plan}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--text-primary)]">Boards</dt><dd className="text-[var(--text-muted)]">{story.boards}</dd></div>
            </dl>
          </div>
          {story.setup.map((item) => (
            <div key={item.label} className="border-l border-[var(--border-subtle)] pl-6 py-3">
              <p className="font-mono text-xs text-[var(--text-muted)] mb-1">{item.label}</p>
              <p className="text-[15px] text-[var(--text-primary)] leading-snug">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={SECTION}>
        <article className="max-w-[640px] mx-auto py-16 text-left">
          <Prose blocks={story.body} />
        </article>
      </section>

      {related.length > 0 && (
        <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
          <h2 className="font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight text-center mb-8">
            More scenarios
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
          </div>
        </section>
      )}

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
