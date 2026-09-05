import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Sparkle, ChatCircle, Cube, Stack, ArrowsClockwise, MagnifyingGlass,
  Plus, ArrowsLeftRight, PencilSimple, CheckCircle, ListChecks, Columns,
  Question, Clock, Users, Cards, Star, ShieldCheck, Check, ArrowUp,
} from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import SegmentedControl from '../../components/ui/SegmentedControl'
import FaqItem from '../../components/marketing/FaqItem'
import { FEATURE_PAGES } from '../../content/features'

// One component renders every /features/<slug> detail page — see
// docs/superpowers/specs/marketing/feature-page.md §3 for the template this
// follows: Hero → How it works → Try it → What it can do → Plans → FAQ →
// Sibling banner → Closing band. Section order and copy come entirely from
// FEATURE_PAGES[slug]; unknown slugs fall back to the hub.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const H2 = 'font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight text-center'

// Covers every `icon` value used across FEATURE_PAGES: the six-up grid
// items and the sibling-banner icon (which reuses the hub's feature icons,
// e.g. 'Sparkle' for the pill, 'ChatCircle' for chat).
const ICONS = {
  Plus, ArrowsLeftRight, PencilSimple, CheckCircle, ListChecks, Columns,
  Question, Clock, Users, Cards, Star, ShieldCheck,
  Sparkle, ChatCircle, Cube, Stack, ArrowsClockwise, MagnifyingGlass,
}

function GridIcon({ name, ...props }) {
  const Icon = ICONS[name]
  return Icon ? <Icon {...props} /> : null
}

function Hero({ hero }) {
  return (
    <section className={`${SECTION} pt-16 pb-6 text-center`}>
      <span className="inline-flex items-center h-7 px-2.5 mb-5 rounded-lg border border-[var(--border-default)] font-mono text-[12px] text-[var(--text-secondary)]">
        {hero.tag}
      </span>
      <h1 className="font-heading font-[300] text-5xl sm:text-6xl tracking-tight leading-[1.08] text-[var(--text-primary)] max-w-3xl mx-auto mb-5">
        {hero.h1}
      </h1>
      <p className="text-[21px] leading-8 text-[var(--text-secondary)] max-w-[700px] mx-auto mb-8">
        {hero.subhead}
      </p>
      <div className="flex flex-col items-center gap-3 mb-14">
        <Button asChild size="lg">
          <Link to={hero.cta.to}>{hero.cta.label}</Link>
        </Button>
        <p className="font-mono text-[12px] text-[var(--text-muted)]">
          {hero.availability}{' '}
          <Link to={hero.availabilityLink.to} className="underline underline-offset-2 hover:text-[var(--text-secondary)]">
            {hero.availabilityLink.label} →
          </Link>
        </p>
      </div>
      <HeroDemo demo={hero.demo} />
    </section>
  )
}

function HeroDemo({ demo }) {
  if (!demo) return null
  const isPill = 'input' in demo
  return (
    <div className="max-w-2xl mx-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-6 text-left">
      {isPill ? (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3.5">
          <div className="flex items-center gap-2 text-[15px] text-[var(--text-primary)] mb-3">
            <span className="flex-1">{demo.input}</span>
            <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]">
              <ArrowUp size={16} weight="bold" />
            </span>
          </div>
          <div className="border-t border-[var(--border-subtle)] pt-3 flex flex-col gap-1.5 font-mono text-[12px]">
            {demo.rows.map((row) => (
              <div key={row.label} className="flex items-start gap-2 text-[var(--text-secondary)]">
                <Check size={13} weight="bold" className="shrink-0 mt-[2px] text-[var(--accent-lime-dark)]" />
                <span>{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="self-end max-w-[85%] rounded-xl bg-[var(--surface-hover)] px-3.5 py-2.5 text-[14px] text-[var(--text-primary)]">
            {demo.question}
          </div>
          <div className="max-w-[90%] rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-2.5 text-[14px] text-[var(--text-secondary)] leading-relaxed">
            {demo.answer}
          </div>
          <div className="flex flex-wrap gap-2 pl-1">
            {demo.cards.map((title) => (
              <span key={title} className="inline-flex items-center h-7 px-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] font-mono text-[11px] text-[var(--text-secondary)]">
                {title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HowItWorks({ rows }) {
  return (
    <section className={`${SECTION} py-20`}>
      <h2 className={`${H2} mb-14`}>How it works</h2>
      <div className="flex flex-col gap-14 max-w-3xl mx-auto">
        {rows.map((row, i) => (
          <div key={row.h3} className="grid sm:grid-cols-[3rem_1fr] gap-4 sm:gap-6">
            <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] font-mono text-sm text-[var(--text-muted)]">
              {String(i + 1).padStart(2, '0')}
            </div>
            <div>
              <h3 className="font-heading font-[425] text-2xl text-[var(--text-primary)] mb-2">{row.h3}</h3>
              <p className="text-[17px] leading-7 text-[var(--text-secondary)]">{row.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TryIt({ tabs }) {
  const [active, setActive] = useState(tabs[0].key)
  const tab = tabs.find((t) => t.key === active) || tabs[0]
  return (
    <section className={`${SECTION} py-20`}>
      <h2 className={`${H2} mb-8`}>Try it</h2>
      <div className="flex justify-center mb-8">
        <SegmentedControl
          ariaLabel="Example prompts"
          options={tabs.map((t) => ({ value: t.key, label: t.label }))}
          value={active}
          onChange={setActive}
        />
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-8 sm:p-10 max-w-4xl mx-auto">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-5 py-4 mb-8 font-mono text-[14px] text-[var(--text-primary)] whitespace-pre-line shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035)]">
          {tab.prompt}
        </div>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-8">
          <h3 className="font-heading font-[425] text-2xl text-[var(--text-primary)]">{tab.h3}</h3>
          <p className="text-[15px] leading-6 text-[var(--text-secondary)]">{tab.body}</p>
        </div>
      </div>
    </section>
  )
}

function WhatItCanDo({ grid }) {
  return (
    <section className={`${SECTION} py-20`}>
      <h2 className={`${H2} mb-12`}>What it can do</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-10 [&>*:not(:nth-child(3n+1))]:sm:border-l [&>*:not(:nth-child(3n+1))]:sm:border-[var(--border-subtle)] [&>*:not(:nth-child(3n+1))]:sm:pl-8">
        {grid.map((item) => (
          <div key={item.h3}>
            <GridIcon name={item.icon} size={24} weight="regular" className="text-[var(--text-secondary)] mb-3" />
            <h3 className="font-heading font-[425] text-lg text-[var(--text-primary)] mb-1.5">{item.h3}</h3>
            <p className="text-[15px] leading-6 text-[var(--text-secondary)]">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Plans({ plans }) {
  return (
    <section className={`${SECTION} py-20`}>
      <h2 className={`${H2} mb-12`}>Plans</h2>
      <div className="max-w-3xl mx-auto divide-y divide-[var(--border-subtle)]">
        {[plans.free, plans.pro].map((plan) => (
          <div key={plan.name} className="py-6 grid sm:grid-cols-[18rem_1fr] gap-3 sm:gap-8 items-start">
            <h3 className="font-heading font-[425] text-xl text-[var(--text-primary)] flex items-center gap-2">
              <Check size={18} weight="bold" className="text-[var(--accent-lime-dark)]" />
              {plan.name}
            </h3>
            <div>
              <p className="text-[15px] leading-6 text-[var(--text-secondary)]">{plan.body}</p>
              {plan.cta && (
                <Button asChild size="md" className="mt-4">
                  <Link to={plan.cta.to}>{plan.cta.label}</Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Faq({ faq }) {
  return (
    <section className={`${SECTION} pb-20`}>
      <h2 className={`${H2} mb-12`}>Frequently asked questions</h2>
      <div className="flex flex-col gap-2 max-w-2xl mx-auto">
        {faq.map((item, i) => (
          <FaqItem
            key={item.q}
            question={item.q}
            answer={item.link ? (
              <>
                {item.a}{' '}
                <Link to={item.link.to} className="underline underline-offset-2">{item.link.label}</Link>
              </>
            ) : item.a}
            index={i}
          />
        ))}
      </div>
    </section>
  )
}

function SiblingBanner({ sibling }) {
  return (
    <section className={`${SECTION} pb-20`}>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 flex items-start gap-3">
          <GridIcon name={sibling.icon} size={22} weight="regular" className="text-[var(--text-secondary)] shrink-0 mt-1" />
          <div>
            <h3 className="font-heading font-[425] text-lg text-[var(--text-primary)] mb-1">{sibling.h3}</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{sibling.body}</p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm" className="shrink-0">
          <Link to={sibling.cta.to}>{sibling.cta.label} →</Link>
        </Button>
      </div>
    </section>
  )
}

function ClosingBand({ closing }) {
  return (
    <section className="bg-[var(--color-ink)] py-20 px-6 sm:px-10">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-heading font-[425] text-4xl text-[var(--text-on-ink)] tracking-tight mb-8">
          {closing.h2}
        </h2>
        <Link
          to={closing.cta.to}
          className="inline-flex items-center justify-center h-11 px-6 rounded-lg font-medium text-[15px] bg-[var(--surface-page)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          {closing.cta.label}
        </Link>
      </div>
    </section>
  )
}

export default function FeaturePage({ slug: slugProp }) {
  const params = useParams()
  const slug = slugProp || params.slug
  const page = FEATURE_PAGES[slug]

  if (!page) return <Navigate to="/features" replace />

  return (
    <>
      <Hero hero={page.hero} />
      <HowItWorks rows={page.rows} />
      <TryIt tabs={page.tabs} />
      <WhatItCanDo grid={page.grid} />
      <Plans plans={page.plans} />
      <Faq faq={page.faq} />
      <SiblingBanner sibling={page.sibling} />
      <ClosingBand closing={page.closing} />
    </>
  )
}
