import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import PlanGrid from '../../components/marketing/PlanGrid'
import CompareTable from '../../components/marketing/CompareTable'
import FaqItem from '../../components/marketing/FaqItem'
import { PRICING } from '../../content/pricing'

// /pricing — pricing spec §3. Skeleton follows the source (name → cards →
// footnote → comparison → FAQ) with a reassurance strip added between the
// table and the FAQ. Static: no auth, no Supabase. Head meta comes from the
// route registry via MarketingLayout.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const H2 = 'font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight'

export default function PricingPage() {
  const { hero, footnote, comparison, reassurance, faq } = PRICING
  return (
    <>
      <section className={`${SECTION} pt-16 pb-10 text-center`}>
        <h1 className="font-heading font-[425] text-5xl sm:text-6xl text-[var(--text-primary)] tracking-tight leading-[1.08] mb-4">
          {hero.heading}
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">{hero.subhead}</p>
      </section>

      <section className="px-6 sm:px-10 pb-20 max-w-[90rem] mx-auto">
        <h2 className="sr-only">Plans</h2>
        <PlanGrid />
        <p className="mt-8 text-center text-sm text-[var(--text-muted)] max-w-2xl mx-auto">{footnote}</p>
      </section>

      <section className={`${SECTION} py-20`}>
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2 className={`${H2} mb-3`}>Compare plans</h2>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">
            Same boards on every plan. The plans differ in what the AI is allowed to do.
          </p>
        </div>
        <CompareTable comparison={comparison} />
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="max-w-3xl mx-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="font-heading font-[425] text-lg text-[var(--text-primary)] mb-1">{reassurance.heading}</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{reassurance.body}</p>
          </div>
          <Button asChild size="md" className="shrink-0">
            <Link to={reassurance.cta.to}>{reassurance.cta.label}</Link>
          </Button>
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="text-center mb-12">
          <h2 className={H2}>Frequently asked questions</h2>
        </div>
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          {faq.map((item, i) => (
            <FaqItem key={item.q} question={item.q} answer={item.a} index={i} />
          ))}
        </div>
      </section>
    </>
  )
}
