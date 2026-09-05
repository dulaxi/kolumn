import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import SegmentedControl from '../../components/ui/SegmentedControl'
import InlineNotice from '../../components/ui/InlineNotice'
import FaqItem from '../../components/marketing/FaqItem'
import TemplateTile from '../../components/templates/TemplateTile'
import { TEMPLATES, TEMPLATE_FAQ } from '../../content/templates'

// /templates — the gallery. Spec: docs/superpowers/specs/marketing/templates.md §G1-G6.
// Chip row replaces the source's 304px filter rail (12 tiles don't justify one).

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const H2 = 'font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight'

const CHIP_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'personal', label: 'Personal' },
  { value: 'team', label: 'Team' },
]

export default function TemplatesPage() {
  const [use, setUse] = useState('all')

  const visible = useMemo(
    () => (use === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.use === use)),
    [use],
  )

  return (
    <>
      <section className={`${SECTION} pt-16 pb-10 text-center`}>
        <h1 className="font-heading font-[425] text-5xl sm:text-6xl text-[var(--text-primary)] tracking-tight leading-[1.08] mb-4">
          Boards that start with the right columns
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
          Pick a template, get a board with columns and a few starter cards already on it. Rename anything, delete
          anything — it&rsquo;s a normal board from the first second.
        </p>
      </section>

      <section className={`${SECTION} pb-20`} id="gallery">
        <h2 className="sr-only">Templates</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <span className="font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Templates · {TEMPLATES.length}
          </span>
          <SegmentedControl ariaLabel="Filter by use" options={CHIP_OPTIONS} value={use} onChange={setUse} />
        </div>

        {visible.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((template) => (
              <TemplateTile key={template.slug} template={template} />
            ))}
          </div>
        ) : (
          <InlineNotice
            variant="info"
            action={
              <Button variant="ghost" size="sm" onClick={() => setUse('all')}>
                Clear filters
              </Button>
            }
          >
            Nothing matches that. Try another word, or clear the filters.
          </InlineNotice>
        )}
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="max-w-3xl mx-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-8">
          <p className="font-mono text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">Don&rsquo;t see yours?</p>
          <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)] mb-3">
            Start blank and let the AI lay it out
          </h2>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-6">
            Type &ldquo;set up a board for a podcast launch&rdquo; into the pill on any board and Kolumn adds the
            first cards for you. Templates are just a head start.
          </p>
          <Button asChild size="lg">
            <Link to="/onboarding">Create a free account</Link>
          </Button>
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="text-center mb-12">
          <h2 className={H2}>Frequently asked questions</h2>
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
