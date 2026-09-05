import { Link } from 'react-router-dom'
import { CaretRight, FileText, Sparkle, Kanban, ChatCircleDots, Cube, CreditCard, LockKey } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import { SUPPORT_CATEGORIES, SUPPORT_CONTACT, popularArticles } from '../../content/support'

// /support — the help-centre hub. Spec: docs/superpowers/specs/marketing/support.md §3.
// Six category cards (collapsed from the source's 16 collections) + a popular-articles
// list + a plain contact row instead of a chat bubble. Static: no auth, no Supabase.
// Head meta comes from the route registry via MarketingLayout once wired.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const H2 = 'font-heading font-[425] text-2xl text-[var(--text-primary)] tracking-tight'

const ICONS = { Sparkle, Kanban, ChatCircleDots, Cube, CreditCard, LockKey }

function CategoryIcon({ name, size = 20 }) {
  const Cmp = ICONS[name]
  if (!Cmp) return null
  return <Cmp size={size} className="text-[var(--text-secondary)]" aria-hidden="true" />
}

export default function SupportPage() {
  const popular = popularArticles()

  return (
    <>
      <section className={`${SECTION} pt-16 pb-10`}>
        <h1 className="font-heading font-[425] text-5xl text-[var(--text-primary)] tracking-tight leading-[1.08] mb-4 max-w-xl">
          How can we help?
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
          Answers about boards, cards, the AI pill and chat, workspaces, billing, and your data.
        </p>
      </section>

      {popular.length > 0 && (
        <section className={`${SECTION} pb-16`}>
          <h2 className="sr-only">Popular articles</h2>
          <div className="max-w-[812px] border-t border-[var(--border-subtle)]">
            {popular.map(({ article }) => (
              <Link
                key={article.slug}
                to={`/support/${article.slug}`}
                className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border-subtle)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors -mx-2 px-2 rounded-lg"
              >
                {article.title}
                <FileText size={18} className="shrink-0 text-[var(--text-muted)]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={`${SECTION} pb-20`}>
        <h2 className={`${H2} mb-8`}>Browse by topic</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUPPORT_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              to={`/support/${category.articles[0].slug}`}
              className="flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)] transition-colors overflow-hidden"
            >
              <div className="h-14 flex items-center px-5 border-b border-[var(--border-subtle)]">
                <CategoryIcon name={category.icon} />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base font-medium text-[var(--text-primary)] mb-1.5">{category.label}</h3>
                <p className="text-[13px] leading-5 text-[var(--text-secondary)] mb-4">{category.summary}</p>
                <p className="mt-auto font-mono text-xs text-[var(--text-muted)]">
                  {category.articles.length} articles
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <h2 className="sr-only">Categories</h2>
        <div className="max-w-[812px] flex flex-col gap-10">
          {SUPPORT_CATEGORIES.map((category) => (
            <div key={category.slug}>
              <h3 className="font-heading font-[425] text-lg text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <CategoryIcon name={category.icon} size={18} />
                {category.label}
              </h3>
              <ul className="flex flex-col gap-1">
                {category.articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      to={`/support/${article.slug}`}
                      className="flex items-center gap-1.5 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <CaretRight size={12} className="shrink-0 text-[var(--text-muted)]" />
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="max-w-[812px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-base font-medium text-[var(--text-primary)] mb-1">Didn&rsquo;t find it?</h2>
            <p className="text-sm text-[var(--text-secondary)]">Write to us and a person answers.</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Button asChild variant="secondary" size="md">
              <a href={`mailto:${SUPPORT_CONTACT}`}>Email support</a>
            </Button>
            <Link
              to="/status"
              className="text-sm text-[var(--text-secondary)] underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)]"
            >
              Check status
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
