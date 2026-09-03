import { Link } from 'react-router-dom'
import { Sparkle, ChatCircle, Cube, Stack, ArrowsClockwise, MagnifyingGlass, Check } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import { FEATURES, FEATURES_HUB } from '../../content/features'
import { PRICING } from '../../content/pricing'

// /features — the hub spec (docs/superpowers/specs/marketing/features.md
// §3): hero with an inert pill CTA, the six-feature grid (this page's job
// per the parent task), a compact plan summary, and a closing band. Static
// content only — nothing here reads Supabase.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const H2 = 'font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight text-center'

const ICONS = { Sparkle, ChatCircle, Cube, Stack, ArrowsClockwise, MagnifyingGlass }

function FeatureCard({ feature }) {
  const Icon = ICONS[feature.icon]
  const body = (
    <>
      {Icon && <Icon size={24} weight="regular" className="text-[var(--text-secondary)] mb-4" />}
      <h3 className="font-heading font-[425] text-lg text-[var(--text-primary)] mb-1.5">{feature.name}</h3>
      <p className="text-[15px] leading-6 text-[var(--text-secondary)] flex-1">{feature.summary}</p>
    </>
  )

  // Every feature is real; not every one has a detail page yet. With no
  // `to`, render an inert card — same shape, no link and no "Explore"
  // affordance — instead of pointing at a page that doesn't exist.
  if (!feature.to) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 flex flex-col">
        {body}
      </div>
    )
  }

  return (
    <Link
      to={feature.to}
      className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 flex flex-col hover:border-[var(--text-muted)] transition-colors"
    >
      {body}
      <span className="mt-4 text-sm font-medium text-[var(--text-primary)] group-hover:underline underline-offset-2">
        Explore →
      </span>
    </Link>
  )
}

function PlanRow({ name, body, cta }) {
  return (
    <div className="py-6 grid sm:grid-cols-[14rem_1fr] gap-3 sm:gap-8 items-start">
      <h3 className="font-heading font-[425] text-xl text-[var(--text-primary)] flex items-center gap-2">
        <Check size={18} weight="bold" className="text-[var(--accent-lime-dark)]" />
        {name}
      </h3>
      <div>
        <p className="text-[15px] leading-6 text-[var(--text-secondary)]">{body}</p>
        {cta && (
          <Button asChild size="md" className="mt-4">
            <Link to={cta.to}>{cta.label}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export default function FeaturesPage() {
  const { eyebrow, h1, subhead, heroCta, pricingLink, closing } = FEATURES_HUB
  const { freeMessagesPerDay, proMonthlyUsd } = PRICING.limits

  return (
    <>
      <section className={`${SECTION} pt-16 pb-20 text-center`}>
        <span className="inline-flex items-center h-7 px-2.5 mb-5 rounded-lg border border-[var(--border-default)] font-mono text-[12px] text-[var(--text-secondary)]">
          {eyebrow}
        </span>
        <h1 className="font-heading font-[425] text-5xl sm:text-6xl text-[var(--text-primary)] tracking-tight leading-[1.08] mb-5 max-w-3xl mx-auto">
          {h1}
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed mb-8">{subhead}</p>
        <div className="flex flex-col items-center gap-3">
          <Button asChild size="lg">
            <Link to={heroCta.to}>{heroCta.label}</Link>
          </Button>
          <Link to={pricingLink.to} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2">
            {pricingLink.label} →
          </Link>
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <h2 className={`${H2} mb-12`}>Six pieces, one board</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.slug} feature={feature} />
          ))}
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <h2 className={`${H2} mb-8`}>What each plan includes</h2>
        <div className="max-w-3xl mx-auto divide-y divide-[var(--border-subtle)]">
          <PlanRow name="Free" body={`Every board feature. ${freeMessagesPerDay} AI messages a day.`} />
          <PlanRow
            name="Pro"
            body={`Every AI write action. $${proMonthlyUsd} a month.`}
            cta={{ label: 'Start Pro trial', to: '/onboarding' }}
          />
        </div>
        <p className="mt-6 text-center">
          <Link to="/pricing" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2">
            Compare plans in full →
          </Link>
        </p>
      </section>

      <section className="bg-[var(--color-ink)] py-20 px-6 sm:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading font-[425] text-4xl text-[var(--text-on-ink)] tracking-tight mb-8">
            {closing.h2}
          </h2>
          <div className="flex flex-col items-center gap-4">
            <Link
              to={closing.cta.to}
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg font-medium text-[15px] bg-[var(--surface-page)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              {closing.cta.label}
            </Link>
            <Link
              to={closing.secondary.to}
              className="text-sm text-[var(--text-on-ink-muted)] hover:text-[var(--text-on-ink)] underline underline-offset-2"
            >
              {closing.secondary.label} →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
