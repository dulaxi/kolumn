import { Link } from 'react-router-dom'
import { CaretRight, Notepad, Envelope, ChatsCircle, Waveform } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import InlineNotice from '../../components/ui/InlineNotice'
import FaqItem from '../../components/marketing/FaqItem'
import { HERO, SOURCES, SOURCES_FOOTNOTE, STEPS, TIER_NOTE, INTEGRATIONS, FAQ } from '../../content/connectors'

// /connectors — "capture from anywhere." Spec:
// docs/superpowers/specs/marketing/connectors.md §3. Honesty rule: Kolumn
// has no OAuth integrations — the four SOURCES are paste/type flows, and
// the Integrations section says so plainly. The source page's DemoSlider
// section (§3.4) is intentionally not reproduced here: it lives as
// module-private code inside src/pages/LandingPage.jsx and lifting it out
// is separate work, not part of this page build.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const H2 = 'font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight'

const SOURCE_ICONS = { Notepad, Envelope, ChatsCircle, Waveform }

export default function ConnectorsPage() {
  return (
    <>
      <section className={`${SECTION} pt-6`}>
        <nav aria-label="Breadcrumb" className="font-mono text-xs text-[var(--text-muted)] flex items-center gap-1.5">
          <Link to="/" className="hover:text-[var(--text-primary)] transition-colors">
            Kolumn
          </Link>
          <CaretRight size={12} />
          <span className="text-[var(--text-primary)]">Capture from anywhere</span>
        </nav>
      </section>

      <section className={`${SECTION} pt-10 pb-16 text-center`}>
        <h1 className="font-heading font-normal text-5xl sm:text-6xl text-[var(--text-primary)] tracking-tight leading-[1.08] mb-5">
          {HERO.h1}
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed mb-8">{HERO.subhead}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link to={HERO.primaryCta.to}>{HERO.primaryCta.label}</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <a href={HERO.secondaryCta.to}>{HERO.secondaryCta.label}</a>
          </Button>
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="text-center mb-3">
          <h2 className={H2}>Four kinds of text, one board</h2>
        </div>
        <p className="text-base text-[var(--text-secondary)] max-w-2xl mx-auto text-center mb-12">
          You already wrote it somewhere. Paste it into a board&rsquo;s pill and read the cards back.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SOURCES.map((source) => {
            const Icon = SOURCE_ICONS[source.icon]
            return (
              <div
                key={source.id}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 hover:border-[var(--color-mist)] transition-colors"
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] mb-4">
                  {Icon && <Icon size={20} weight="regular" className="text-[var(--text-primary)]" />}
                </span>
                <h3 className="text-base font-medium text-[var(--text-primary)] mb-1.5">{source.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{source.description}</p>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-[var(--text-muted)] text-center mt-8">{SOURCES_FOOTNOTE}</p>
      </section>

      <section id="how-it-works" className={`${SECTION} pb-20 border-t border-[var(--border-subtle)] pt-16`}>
        <div className="text-center mb-12">
          <h2 className={H2}>How it works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {STEPS.map((step) => (
            <div key={step.n}>
              <span className="font-mono text-xs text-[var(--text-muted)] block mb-2">{step.n}</span>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1.5">{step.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="max-w-3xl mx-auto">
          <InlineNotice
            variant="info"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to={TIER_NOTE.cta.to}>{TIER_NOTE.cta.label}</Link>
              </Button>
            }
          >
            {TIER_NOTE.body}
          </InlineNotice>
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="text-center mb-8">
          <h2 className={H2}>Integrations</h2>
        </div>
        <div className="max-w-3xl mx-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 md:p-8">
          <p className="font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-3">
            {INTEGRATIONS.eyebrow}
          </p>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-6">{INTEGRATIONS.body}</p>
          <Button asChild variant="secondary" size="md">
            <a href={INTEGRATIONS.cta.to}>{INTEGRATIONS.cta.label}</a>
          </Button>
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="text-center mb-12">
          <h2 className={H2}>Frequently asked questions</h2>
        </div>
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          {FAQ.map((item, i) => (
            <FaqItem key={item.q} question={item.q} answer={item.a} index={i} />
          ))}
        </div>
      </section>
    </>
  )
}
