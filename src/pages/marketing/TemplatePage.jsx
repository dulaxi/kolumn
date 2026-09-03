import { Link, useParams } from 'react-router-dom'
import { CaretRight, Columns, Cards, Tag } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import FaqItem from '../../components/marketing/FaqItem'
import TemplateIcon from '../../components/templates/TemplateIcon'
import TemplateTile from '../../components/templates/TemplateTile'
import TemplatePreview from '../../components/templates/TemplatePreview'
import { getTemplate, relatedTemplates, templateCardCount, TEMPLATE_FAQ } from '../../content/templates'

// /templates/<slug> — one component renders any template's detail. Spec:
// docs/superpowers/specs/marketing/templates.md §D1-D7. Reads the slug via
// the route param, so this page is route-shape-agnostic — whoever wires
// /templates/:slug in MARKETING_ROUTES doesn't need a second component.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const H3 = 'font-heading font-[425] text-xl text-[var(--text-primary)] mb-3'

export default function TemplatePage() {
  const { slug } = useParams()
  const template = getTemplate(slug)

  if (!template) {
    return (
      <section className={`${SECTION} py-24 text-center`}>
        <h1 className="font-heading font-[425] text-3xl text-[var(--text-primary)] mb-3">Template not found</h1>
        <p className="text-[var(--text-secondary)] mb-6">That template doesn&rsquo;t exist, or the link is wrong.</p>
        <Button asChild size="lg">
          <Link to="/templates">Back to all templates</Link>
        </Button>
      </section>
    )
  }

  const cardCount = templateCardCount(template)
  const related = relatedTemplates(template)

  return (
    <>
      <section className={`${SECTION} pt-10`}>
        <nav aria-label="Breadcrumb" className="font-mono text-xs text-[var(--text-muted)] flex items-center gap-1.5">
          <Link to="/templates" className="hover:text-[var(--text-primary)] transition-colors">
            Templates
          </Link>
          <CaretRight size={12} />
          <span className="text-[var(--text-primary)]">{template.name}</span>
        </nav>
      </section>

      <section className={`${SECTION} pt-6 pb-10 text-center`}>
        <div className="max-w-2xl mx-auto">
          <h1 className="font-heading font-[425] text-4xl text-[var(--text-primary)] tracking-tight leading-tight mb-4">
            <TemplateIcon name={template.icon} size={32} className="inline-block align-[-6px] mr-2.5 text-[var(--text-secondary)]" />
            {template.name}
          </h1>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-5">{template.description}</p>
          <div className="flex items-center justify-center gap-4 font-mono text-xs text-[var(--text-muted)] mb-8">
            <span className="inline-flex items-center gap-1.5">
              <Tag size={14} />
              {template.use === 'team' ? 'Team' : 'Personal'} · {template.area}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Columns size={14} />
              {template.columns.length} columns
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Cards size={14} />
              {cardCount} starter cards
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/onboarding">Use this template</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/templates">Back to all templates</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <h2 className="sr-only">Board preview</h2>
        <TemplatePreview template={template} />
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="max-w-2xl mx-auto flex flex-col gap-10">
          <div>
            <h3 className={H3}>What&rsquo;s on the board</h3>
            <ul className="flex flex-col gap-2">
              {template.columns.map((col, i) => (
                <li key={col.title} className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                  <span className="text-[var(--text-primary)] font-medium">{col.title}</span> — {template.columnNotes[i]}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={H3}>Who it&rsquo;s for</h3>
            <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">{template.audience}</p>
          </div>

          <div>
            <h3 className={H3}>Try saying this in the pill</h3>
            <div className="flex flex-col gap-2 mb-3">
              {template.prompts.map((prompt) => (
                <p
                  key={prompt}
                  className="font-mono text-[13px] text-[var(--text-primary)] bg-[var(--surface-raised)] rounded-lg px-3.5 py-2.5 w-fit"
                >
                  &ldquo;{prompt}&rdquo;
                </p>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)]">{template.proNote}</p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className={`${SECTION} pb-20 border-t border-[var(--border-subtle)] pt-16`}>
          <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)] tracking-tight mb-8">
            More like this
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((t) => (
              <TemplateTile key={t.slug} template={t} />
            ))}
          </div>
        </section>
      )}

      <section className={`${SECTION} pb-20`}>
        <div className="text-center mb-12">
          <h2 className="font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight">
            Frequently asked questions
          </h2>
        </div>
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          {TEMPLATE_FAQ.map((item, i) => (
            <FaqItem key={item.q} question={item.q} answer={item.a} index={i} />
          ))}
        </div>
      </section>
    </>
  )
}
