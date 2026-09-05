import { Link } from 'react-router-dom'
import { ShieldCheck, UsersThree, Brain, Export, Key, LockKey, Cloud } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import FaqItem from '../../components/marketing/FaqItem'
import {
  HERO,
  AT_A_GLANCE,
  CONTROLS,
  CERTIFICATIONS,
  SUBPROCESSORS,
  FAQ,
  CTA,
} from '../../content/security'

// /security — security.md §3. Every claim in content/security.js carries a
// `code` tag naming the file(s) that back it; this component only renders,
// it doesn't editorialize the claims. Static: no auth, no Supabase. Head
// meta comes from the route registry via MarketingLayout once wired.

const ICONS = { ShieldCheck, UsersThree, Brain, Export, Key, LockKey, Cloud }

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const H2 = 'font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight'

function Icon({ name, size = 20 }) {
  const Cmp = ICONS[name]
  if (!Cmp) return null
  return <Cmp size={size} className="text-[var(--text-secondary)]" aria-hidden="true" />
}

export default function SecurityPage() {
  const visibleFaq = FAQ.filter((item) => item.a)

  return (
    <>
      <section className={`${SECTION} pt-24 pb-16`}>
        <h1 className="font-heading font-[425] text-5xl md:text-6xl text-[var(--text-primary)] tracking-tight leading-[1.08] mb-4">
          {HERO.heading}
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed mb-8">{HERO.subhead}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={HERO.primary.href}>{HERO.primary.label}</a>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to={HERO.secondary.to}>{HERO.secondary.label}</Link>
          </Button>
        </div>
      </section>

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <h2 className="sr-only">{AT_A_GLANCE.heading}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AT_A_GLANCE.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
              <Icon name={item.icon} />
              <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wide mt-3 mb-1">{item.label}</p>
              <p className="text-base font-semibold text-[var(--text-primary)]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <div className="max-w-2xl mb-10">
          <h2 className={`${H2} mb-3`}>{CONTROLS.heading}</h2>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">{CONTROLS.lede}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CONTROLS.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
              <Icon name={item.icon} />
              <h3 className="text-base font-semibold text-[var(--text-primary)] mt-3 mb-2">{item.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-4">{item.body}</p>
              <p className="font-mono text-xs text-[var(--text-muted)]">In the app: {item.inApp}</p>
            </div>
          ))}
        </div>
      </section>

      {CERTIFICATIONS.length > 0 && (
        <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
          <h2 className={`${H2} mb-8`}>Compliance</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {CERTIFICATIONS.map((cert) => (
              <div key={cert.name} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
                <p className="font-semibold text-[var(--text-primary)] mb-1">{cert.name}</p>
                <p className="font-mono text-xs text-[var(--text-muted)]">
                  {cert.scope} · {cert.date}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <div className="max-w-2xl mb-8">
          <h2 className={`${H2} mb-3`}>{SUBPROCESSORS.heading}</h2>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">{SUBPROCESSORS.lede}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                {SUBPROCESSORS.columns.map((col) => (
                  <th key={col} scope="col" className="text-left text-xs uppercase text-[var(--text-muted)] py-2 pr-6">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.rows.map((row) => (
                <tr key={row.service} className="border-b border-[var(--border-subtle)]">
                  <th scope="row" className="text-left font-normal text-[var(--text-primary)] py-3 pr-6">{row.service}</th>
                  <td className="text-[var(--text-secondary)] py-3 pr-6">{row.does}</td>
                  <td className="text-[var(--text-secondary)] py-3">{row.sees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <h2 className={`${H2} mb-8 text-center`}>Questions</h2>
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          {visibleFaq.map((item, i) => (
            <FaqItem key={item.q} question={item.q} answer={item.a} index={i} />
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] bg-[var(--surface-sidebar)]">
        <div className={`${SECTION} py-24 text-center max-w-2xl`}>
          <h2 className="font-heading font-[425] text-3xl md:text-4xl text-[var(--text-primary)] tracking-tight mb-3">
            {CTA.heading}
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">{CTA.body}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Button asChild size="lg">
              <a href={CTA.primary.href}>{CTA.primary.label}</a>
            </Button>
            <Link
              to={CTA.secondary.to}
              className="text-sm text-[var(--text-secondary)] underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)]"
            >
              {CTA.secondary.label} →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
