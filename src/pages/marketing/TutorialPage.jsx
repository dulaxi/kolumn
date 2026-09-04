import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Clock, Sparkle, Crown } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import InlineNotice from '../../components/ui/InlineNotice'
import TutorialCard from '../../components/tutorials/TutorialCard'
import { getTutorial, relatedTutorials } from '../../content/tutorials'

// /tutorials/<slug> — one component renders any tutorial. Spec:
// docs/superpowers/specs/marketing/tutorials.md §3 (article). Reads the
// slug via the route param, so whoever wires /tutorials/:slug into
// MARKETING_ROUTES doesn't need a second component (see TemplatePage.jsx
// for the same convention).
// `tutorial.minutes` (read time) is only set on entries with a real body —
// a read time on an empty page is a fabricated signal — so the "min" pill
// only renders when it's present.
//
// tutorial.body is markdown (src/content/articles/tutorials/<slug>.md via
// src/lib/content.js), rendered with react-markdown + remark-gfm. The
// component map below mirrors src/components/marketing/Prose.jsx's type
// scale exactly, wrapped in the same `flex flex-col gap-5` rhythm, so a
// migrated tutorial renders identically to its old block-array body.
const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'

const markdownComponents = {
  h2: ({ children }) => (
    <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)] tracking-tight mt-12 mb-4">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-heading font-[425] text-xl text-[var(--text-primary)] tracking-tight mt-8 mb-3">{children}</h3>
  ),
  p: ({ children }) => <p className="text-[17px] leading-7 text-[var(--text-primary)]">{children}</p>,
  ul: ({ children }) => (
    <ul className="pl-6 flex flex-col gap-2 text-[17px] leading-7 text-[var(--text-primary)] list-disc marker:text-[var(--text-muted)]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="pl-6 flex flex-col gap-2 text-[17px] leading-7 text-[var(--text-primary)] list-decimal marker:text-[var(--text-muted)]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  // Fenced code blocks: match Prose's CodeBlock exactly (plain text inside
  // the <pre>, no nested styled <code>) rather than nesting the inline
  // `code` component's chip styling inside it.
  pre: ({ children }) => {
    const codeEl = Array.isArray(children) ? children[0] : children
    const text = codeEl?.props?.children ?? children
    return (
      <pre className="font-mono text-[14px] leading-6 text-[var(--text-primary)] bg-[var(--surface-input)] border border-[var(--border-default)] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
        {text}
      </pre>
    )
  },
  code: ({ children }) => (
    <code className="font-mono text-[13px] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-md text-[var(--text-primary)]">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[var(--border-default)] pl-5 text-[17px] leading-7 text-[var(--text-secondary)] italic">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="text-[var(--text-primary)] font-semibold">{children}</strong>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-[var(--text-primary)] underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)]"
    >
      {children}
    </a>
  ),
}

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
            {tutorial.minutes != null && (
              <span className="font-mono text-xs inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
                <Clock size={13} /> {tutorial.minutes} min
              </span>
            )}
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
            <div className="flex flex-col gap-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {tutorial.body}
              </ReactMarkdown>
            </div>
          ) : (
            <InlineNotice variant="info" icon={false}>
              This tutorial is being written. In the meantime, the summary above is accurate — {tutorial.summary}
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
