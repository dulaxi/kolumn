import { Link } from 'react-router-dom'
import { ArrowSquareOut } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import DynamicIcon from '../../components/board/DynamicIcon'
import FaqItem from '../../components/marketing/FaqItem'
import { PRICING } from '../../content/pricing'
import { KOLUMN_HONEST_INTRO } from '../../content/comparisons/_shared'

// One component renders every /compare/<slug> page. Section order follows
// docs/superpowers/specs/marketing/_competitor-monday.md §3's recipe for an
// honest comparison page: hero → structural positioning (not feature
// checkboxes) → where Kolumn differs → pricing side by side → the
// "choose them instead if" credibility anchor → FAQ → dated sources. No
// section claims or implies social proof, a benchmark, or a user count —
// see _KOLUMN-BRIEF.md and the brief this page was built against.

const SECTION = 'max-w-6xl mx-auto px-6 sm:px-10'
const H2 = 'font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)]'

function CheckedOnLine({ checkedOn, name }) {
  return (
    <p className="font-mono text-xs text-[var(--text-muted)]">
      Competitor details for {name} checked on {checkedOn}. Features and prices change — verify anything
      time-sensitive on {name}&rsquo;s own site before you rely on it.
    </p>
  )
}

function TierCard({ tier }) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 flex flex-col gap-1.5">
      <p className="font-heading font-[425] text-base text-[var(--text-primary)]">{tier.name}</p>
      <p className="text-2xl font-heading font-[425] text-[var(--text-primary)]">
        {tier.price}
        {tier.period && <span className="text-xs font-sans font-normal text-[var(--text-muted)] ml-1">{tier.period}</span>}
      </p>
      {tier.caption && <p className="text-xs text-[var(--text-muted)]">{tier.caption}</p>}
      {tier.note && <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1">{tier.note}</p>}
    </div>
  )
}

export default function ComparisonPage({ comparison }) {
  const { name, checkedOn, hero, positioning, competitorPricing, differentiators, chooseThemInstead, competitorClaims, faq, cta } =
    comparison

  const kolumnTiers = PRICING.tiers.map((t) => ({
    name: t.name,
    price: t.price,
    period: t.period === 'month' ? '/month' : t.period === 'forever' ? 'forever' : null,
    caption: t.caption,
  }))

  return (
    <>
      {/* Hero */}
      <section className={`${SECTION} pt-16 pb-10 text-center`}>
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">Compare</p>
        <h1 className="font-heading font-normal text-5xl sm:text-6xl tracking-tight leading-[1.08] text-[var(--text-primary)] max-w-[42rem] mx-auto mb-5">
          {hero.h1}
        </h1>
        <p className="text-xl leading-8 text-[var(--text-secondary)] max-w-[46rem] mx-auto mb-6">{hero.subhead}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button asChild variant="primary" size="lg">
            <Link to={hero.cta.to}>{hero.cta.label}</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/pricing">See Kolumn pricing</Link>
          </Button>
        </div>
        <CheckedOnLine checkedOn={checkedOn} name={name} />
      </section>

      {/* How they're built */}
      <section className={`${SECTION} py-20`}>
        <h2 className={`${H2} text-center mb-10`}>How they&rsquo;re built</h2>
        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          <div>
            <h3 className="font-heading font-[425] text-lg text-[var(--text-primary)] mb-2">Kolumn</h3>
            <p className="text-[15px] leading-7 text-[var(--text-secondary)]">{positioning.kolumn}</p>
          </div>
          <div>
            <h3 className="font-heading font-[425] text-lg text-[var(--text-primary)] mb-2">{name}</h3>
            <p className="text-[15px] leading-7 text-[var(--text-secondary)]">{positioning.competitor}</p>
          </div>
        </div>
      </section>

      {/* Where Kolumn differs */}
      <section className={`${SECTION} py-20`}>
        <h2 className={`${H2} text-center mb-12`}>Where Kolumn differs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 max-w-5xl mx-auto">
          {differentiators.map((d) => (
            <div key={d.title} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <DynamicIcon name={d.icon} className="w-5 h-5 text-[var(--text-secondary)]" />
                <h3 className="font-sans text-base font-semibold text-[var(--text-primary)]">{d.title}</h3>
              </div>
              <p className="text-[15px] leading-6 text-[var(--text-secondary)]">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing side by side */}
      <section className={`${SECTION} py-20`}>
        <div className="text-center mb-10">
          <h2 className={`${H2} mb-3`}>Pricing, side by side</h2>
          <p className="text-base text-[var(--text-secondary)] max-w-2xl mx-auto">
            Kolumn&rsquo;s prices come from /pricing. {name}&rsquo;s come from {competitorPricing.source}, checked{' '}
            {competitorPricing.checkedOn}.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">Kolumn</p>
            <div className="flex flex-col gap-3">
              {kolumnTiers.map((tier) => (
                <TierCard key={tier.name} tier={tier} />
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">{name}</p>
            <div className="flex flex-col gap-3">
              {competitorPricing.tiers.map((tier) => (
                <TierCard key={tier.name} tier={tier} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Choose them instead if */}
      <section className={`${SECTION} py-20`}>
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2 className={`${H2} mb-3`}>Choose {name} instead if</h2>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">{KOLUMN_HONEST_INTRO}</p>
        </div>
        <div className="max-w-3xl mx-auto flex flex-col">
          {chooseThemInstead.map((item) => (
            <div key={item.title} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3 sm:gap-8 pt-6 pb-6 border-t border-[var(--border-subtle)]">
              <h3 className="font-heading font-[425] text-lg leading-snug text-[var(--text-primary)]">{item.title}</h3>
              <p className="text-[15px] leading-7 text-[var(--text-secondary)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className={`${SECTION} py-20`}>
        <div className="text-center mb-12">
          <h2 className={H2}>Questions</h2>
        </div>
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          {faq.map((item, i) => (
            <FaqItem key={item.q} question={item.q} answer={item.a} index={i} />
          ))}
        </div>
      </section>

      {/* Sources */}
      <section className={`${SECTION} pb-20`}>
        <div className="max-w-3xl mx-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-6">
          <h2 className="font-heading font-[425] text-lg text-[var(--text-primary)] mb-1">Sources</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
            Every claim about {name} above is checked against one of these pages. {name} ships changes continuously —
            if something here looks out of date, that&rsquo;s why.
          </p>
          <ul className="flex flex-col gap-2.5">
            {competitorClaims.map((claim) => (
              <li key={claim.text} className="text-sm text-[var(--text-secondary)] leading-relaxed">
                <span className="text-[var(--text-primary)]">{claim.text}</span>{' '}
                <a
                  href={claim.source}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)]"
                >
                  Source
                  <ArrowSquareOut size={12} weight="bold" />
                </a>{' '}
                <span className="font-mono text-xs text-[var(--text-muted)]">checked {claim.checkedOn}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA band */}
      <section className={`${SECTION} pb-20`}>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-10 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-center md:text-left">
          <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)]">{cta.heading}</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center shrink-0">
            <Button asChild variant="secondary" size="lg">
              <Link to="/compare">Compare all three</Link>
            </Button>
            <Button asChild variant="primary" size="lg">
              <Link to={hero.cta.to}>{hero.cta.label}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
