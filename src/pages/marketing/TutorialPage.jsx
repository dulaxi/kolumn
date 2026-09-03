import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Sparkle, Crown } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import InlineNotice from '../../components/ui/InlineNotice'
import Prose from '../../components/marketing/Prose'
import TutorialCard from '../../components/tutorials/TutorialCard'
import { getTutorial, relatedTutorials } from '../../content/tutorials'

// /tutorials/<slug> — one component renders any tutorial. Spec:
// docs/superpowers/specs/marketing/tutorials.md §3 (article). Reads the
// slug via the route param, so whoever wires /tutorials/:slug into
// MARKETING_ROUTES doesn't need a second component (see TemplatePage.jsx
// for the same convention).

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'

export default function TutorialPage({ slug: slugProp }) {
  const params = useParams()
  const slug = slugProp || params.slug
  const tutorial = getTutorial(slug)

  if (!tutorial) {
    return (
      <section className={`${SECTION} py-24 text-center`}>
        <h1 className="font-heading font-[425] text-3xl text-[var(--text-primary)] mb-3">Tutorial not found</h1>
        <p className="text-[var(--text-secondary)] mb-6">That tutorial doesn&rsquo;t exist, or the link is wrong.</p>
        <Button asChild size="lg">
          <Link to="/tutorials">Back to all tutorials</Link>
        </Button>
      </section>
    )
  }

  const related = relatedTutorials(tutorial)

  return (
    <>
      <section className="bg-[var(--surface-raised)] border-b border-[var(--border-subtle)]">
        <div className={`${SECTION} pt-10 pb-12 min-h-[240px] flex flex-col justify-center max-w-[768px]`}>
          <Link
            to="/tutorials"
            className="font-mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5 mb-6 w-fit"
          >
            <ArrowLeft size={14} /> Tutorials
          </Link>
          <h1 className="font-heading font-[425] text-4xl leading-[1.15] tracking-tight text-[var(--text-primary)] mb-3">
            {tutorial.title}
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-6">{tutorial.summary}</p>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="font-mono text-xs inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
              <Clock size={13} /> {tutorial.minutes} min
            </span>
            <span className="font-mono text-xs inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
              {tutorial.tier === 'pro' ? <Crown size={13} /> : <Sparkle size={13} />}
              {tutorial.tier === 'pro' ? 'Pro' : 'Free'}
            </span>
          </div>
          <Button asChild size="lg" className="w-fit">
            <Link to="/onboarding">Open Kolumn</Link>
          </Button>
        </div>
      </section>

      <section className={`${SECTION} py-12`}>
        <div className="mx-auto max-w-[640px]">
          {tutorial.body ? (
            <Prose blocks={tutorial.body} />
          ) : (
            <InlineNotice variant="info" icon={false}>
              This tutorial is being written. In the meantime, the summary above is accurate — {tutorial.summary.toLowerCase()}
            </InlineNotice>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className={`${SECTION} pb-20 max-w-[768px] border-t border-[var(--border-subtle)] pt-12`}>
          <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)] tracking-tight mb-6">Next up</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {related.map((t, i) => (
              <TutorialCard key={t.slug} tutorial={t} index={i} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
