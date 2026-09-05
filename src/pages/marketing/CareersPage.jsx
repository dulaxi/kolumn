import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FaqItem from '../../components/marketing/FaqItem'
import { HERO, HOW_WE_BUILD, VALUES, ROLES, OPEN_ROLES_EMPTY, FAQ, CTA } from '../../content/careers'

// /careers — careers.md §3. Ships with zero open roles; the empty state is
// a designed component, not a placeholder. Static: no auth, no Supabase.
// Head meta comes from the route registry via MarketingLayout once wired.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const SPLIT = 'grid md:grid-cols-[5fr_7fr] gap-10'
const H2 = 'font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight'

export default function CareersPage() {
  const visibleFaq = FAQ.filter((item) => item.a)

  return (
    <>
      <section className={`${SECTION} pt-24 pb-16`}>
        <div className={SPLIT}>
          <h1 className="font-heading font-[425] text-5xl md:text-6xl text-[var(--text-primary)] tracking-tight leading-[1.08]">
            {HERO.heading}
          </h1>
          <div>
            <p className="text-lg leading-relaxed text-[var(--text-secondary)] mb-6">{HERO.subhead}</p>
            <Button asChild size="lg">
              <a href={OPEN_ROLES_EMPTY.cta.href}>{OPEN_ROLES_EMPTY.cta.label}</a>
            </Button>
          </div>
        </div>
      </section>

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <h2 className={`${H2} mb-8`}>{HOW_WE_BUILD.heading}</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {HOW_WE_BUILD.items.map((item) => (
            <div key={item.title}>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{item.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-8 md:p-10">
          <h2 className={`${H2} mb-8`}>{VALUES.heading}</h2>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
            {VALUES.items.map((item) => (
              <div key={item.index}>
                <p className="font-mono text-xs text-[var(--text-muted)] mb-1">{item.index}</p>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <div className={SPLIT}>
          <div>
            <h2 className={`${H2} mb-3`}>{OPEN_ROLES_EMPTY.heading}</h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">{OPEN_ROLES_EMPTY.lede}</p>
          </div>
          {ROLES.length === 0 ? (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
              <p className="font-mono text-xs text-[var(--text-muted)] mb-2">{OPEN_ROLES_EMPTY.caption}</p>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{OPEN_ROLES_EMPTY.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{OPEN_ROLES_EMPTY.body}</p>
              <Button asChild variant="secondary" size="sm">
                <a href={OPEN_ROLES_EMPTY.cta.href}>{OPEN_ROLES_EMPTY.cta.label}</a>
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] divide-y divide-[var(--border-subtle)]">
              {ROLES.map((role) => (
                <a
                  key={role.slug}
                  href={role.href}
                  className="flex items-center justify-between gap-4 py-4 px-5 min-h-[72px] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{role.title}</h3>
                    <p className="font-mono text-xs text-[var(--text-muted)]">
                      {role.team} · {role.location} · {role.type}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
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
              <Link to={CTA.primary.to}>{CTA.primary.label}</Link>
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
