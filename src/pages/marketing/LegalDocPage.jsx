import InlineNotice from '../../components/ui/InlineNotice'
import { CONTACT_EMAIL } from '../../content/pricing'

// Generic legal-document renderer — one component for every document in
// src/content/legal/*.js. Layout proportions per
// docs/superpowers/specs/marketing/legal-template.md: a 640px reading
// measure, Inter body text, Clash Grotesk headings (font-[425], no size
// skip beyond h1 → h2), and a draft notice above the fold since none of
// these documents have been reviewed by counsel yet.
//
// `doc` shape: { title, lastUpdated, sections: [{ heading, body }] } where
// `body` is an array of paragraph strings and/or `{ list: [...] }` groups.
//
// MarketingLayout supplies the surrounding nav/<main>/footer and head tags —
// this component renders only the document itself.

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

const LINK = 'underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)]'

function SectionBody({ body }) {
  return body.map((item, i) => {
    if (typeof item === 'string') {
      return (
        <p key={i} className="mb-4 text-[16px] leading-[26px] text-[var(--text-primary)]">
          {item}
        </p>
      )
    }
    if (item && Array.isArray(item.list)) {
      return (
        <ul key={i} className="list-disc pl-5 mb-4 space-y-2 text-[16px] leading-[26px] text-[var(--text-primary)]">
          {item.list.map((li, j) => (
            <li key={j}>{li}</li>
          ))}
        </ul>
      )
    }
    return null
  })
}

export default function LegalDocPage({ doc }) {
  const { title, lastUpdated, sections } = doc
  const ids = sections.map((s) => slugify(s.heading))

  return (
    <div className="max-w-[640px] mx-auto px-6 sm:px-8 pt-14 sm:pt-20 pb-24">
      <h1 className="font-heading font-[425] text-[40px] leading-[1.1] tracking-tight sm:text-[48px] sm:leading-[1.08] text-[var(--text-primary)] mb-8">
        {title}
      </h1>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-4 mb-8 border-b border-[var(--border-default)]">
        <p className="text-xs font-mono text-[var(--text-muted)]">Last updated {formatDate(lastUpdated)}</p>
        <a href="/" className={`text-xs font-mono text-[var(--text-muted)] ${LINK}`}>
          Back to Kolumn
        </a>
      </div>

      <InlineNotice variant="warn" className="mb-10">
        Draft pending legal review. This document describes Kolumn&rsquo;s current practices in plain
        language. It has not yet been reviewed by counsel and is not a final legal agreement.
      </InlineNotice>

      <nav aria-label="Table of contents" className="mb-10">
        <p className="font-mono text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">Contents</p>
        <ul className="space-y-1.5">
          {sections.map((s, i) => (
            <li key={ids[i]}>
              <a href={`#${ids[i]}`} className={`text-sm text-[var(--text-secondary)] ${LINK}`}>
                {s.heading}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        {sections.map((s, i) => (
          <section key={ids[i]} aria-labelledby={ids[i]}>
            <h2
              id={ids[i]}
              className="font-heading font-[425] text-[22px] leading-[28px] text-[var(--text-primary)] mt-10 mb-3 scroll-mt-24"
            >
              {s.heading}
            </h2>
            <SectionBody body={s.body} />
          </section>
        ))}
      </div>

      <div className="mt-16 pt-6 border-t border-[var(--border-subtle)] font-mono text-xs text-[var(--text-muted)]">
        Questions:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
          {CONTACT_EMAIL}
        </a>
      </div>
    </div>
  )
}
