import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CaretRight, FileText } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import InlineNotice from '../../components/ui/InlineNotice'
import { findArticle, SUPPORT_CONTACT } from '../../content/support'

// /support/<slug> — one component renders any article. Spec:
// docs/superpowers/specs/marketing/support.md §3. Reads the slug via the
// route param, so this page is route-shape-agnostic (same pattern as
// TemplatePage.jsx). Entries with body: null render a "coming soon" state
// instead of an empty page — most of the 24 articles ship as title +
// summary only; two carry full content (see src/content/support.js).
// `article.updated` is only set on entries with a real body — a date on an
// empty page is a fabricated freshness signal — so the "Updated" line only
// renders when it's present.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'

const markdownComponents = {
  h2: ({ children }) => (
    <h2 className="font-heading font-[425] text-[22px] text-[var(--text-primary)] mt-10 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-[var(--text-primary)] mt-6 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[15px] leading-[23px] text-[var(--text-secondary)] mb-4">{children}</p>
  ),
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 mb-4 text-[15px] leading-[23px] text-[var(--text-secondary)]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 mb-4 text-[15px] leading-[23px] text-[var(--text-secondary)]">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="text-[var(--text-primary)] font-semibold">{children}</strong>,
  code: ({ children }) => (
    <code className="font-mono text-[13px] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-md text-[var(--text-primary)]">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-[var(--text-primary)] underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)]"
    >
      {children}
    </a>
  ),
}

export default function SupportArticlePage({ slug: slugProp }) {
  const params = useParams()
  const slug = slugProp || params.slug
  const found = findArticle(slug)

  if (!found) {
    return (
      <section className={`${SECTION} py-24 text-center`}>
        <h1 className="font-heading font-[425] text-3xl text-[var(--text-primary)] mb-3">Article not found</h1>
        <p className="text-[var(--text-secondary)] mb-6">That article doesn&rsquo;t exist, or the link is wrong.</p>
        <Button asChild size="lg">
          <Link to="/support">Back to support</Link>
        </Button>
      </section>
    )
  }

  const { article, category } = found
  const related = (article.related || [])
    .map((relSlug) => findArticle(relSlug))
    .filter(Boolean)

  return (
    <>
      <section className={`${SECTION} pt-10`}>
        <nav aria-label="Breadcrumb" className="font-mono text-xs text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
          <Link to="/support" className="hover:text-[var(--text-primary)] transition-colors">Support</Link>
          <CaretRight size={12} />
          <span>{category.label}</span>
          <CaretRight size={12} />
          <span className="text-[var(--text-secondary)]">{article.title}</span>
        </nav>
      </section>

      <section className={`${SECTION} pt-6 pb-4`}>
        <h1 className="font-heading font-[425] text-[36px] leading-[1.1] tracking-tight text-[var(--text-primary)] max-w-[812px] mb-2">
          {article.title}
        </h1>
        {article.updated && (
          <p className="font-mono text-xs text-[var(--text-muted)]">Updated {article.updated}</p>
        )}
      </section>

      <section className={`${SECTION} pb-16`}>
        <div className="max-w-[812px]">
          {article.body ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {article.body}
            </ReactMarkdown>
          ) : (
            <InlineNotice variant="info">
              This article is coming soon. In the meantime: {article.summary}
              {' — '}
              <a href={`mailto:${SUPPORT_CONTACT}`} className="underline underline-offset-[3px]">
                write to us
              </a>{' '}
              if you need the details now.
            </InlineNotice>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className={`${SECTION} pb-20`}>
          <div className="max-w-[812px]">
            <h2 className="font-heading font-[425] text-xl text-[var(--text-primary)] mb-3">Related</h2>
            <div className="border-t border-[var(--border-subtle)]">
              {related.map(({ article: rel }) => (
                <Link
                  key={rel.slug}
                  to={`/support/${rel.slug}`}
                  className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border-subtle)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors -mx-2 px-2 rounded-lg"
                >
                  {rel.title}
                  <FileText size={18} className="shrink-0 text-[var(--text-muted)]" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
