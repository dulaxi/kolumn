import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import { HERO, WHAT_IT_IS, TEAM, VALUES, DETAILS, CTA } from '../../content/about'

// /about — about.md §3. Two-column split (5/7) preserved from the source
// spec, sections separated by hairlines. Static: no auth, no Supabase.
// Head meta comes from the route registry via MarketingLayout once wired.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const SPLIT = 'grid md:grid-cols-[5fr_7fr] gap-10'
const H2 = 'font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight'

export default function AboutPage() {
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
              <Link to={HERO.cta.to}>{HERO.cta.label}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <div className={SPLIT}>
          <div>
            <h2 className={`${H2} mb-3`}>{WHAT_IT_IS.heading}</h2>
            <p className="text-xl text-[var(--text-secondary)] leading-snug">{WHAT_IT_IS.lede}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
            {WHAT_IT_IS.items.map((item) => (
              <div key={item.title}>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <div className={SPLIT}>
          <h2 className={H2}>{TEAM.heading}</h2>
          <div>
            <p className="text-base leading-relaxed text-[var(--text-secondary)] max-w-[60ch]">{TEAM.body}</p>
            {TEAM.members.length > 0 && (
              <div className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-6">
                {TEAM.members.map((m) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <Avatar name={m.name} size="lg" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{m.name}</p>
                      <p className="text-xs font-mono text-[var(--text-muted)]">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <div className={SPLIT}>
          <div>
            <h2 className={`${H2} mb-3`}>{VALUES.heading}</h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">{VALUES.lede}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-8">
            {VALUES.items.map((item) => (
              <div key={item.index}>
                <p className="font-mono text-xs text-[var(--text-muted)] mb-1">{item.index}</p>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
        <div className={SPLIT}>
          <h2 className={H2}>{DETAILS.heading}</h2>
          <dl className="font-mono text-sm">
            {DETAILS.rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 py-3 border-b border-[var(--border-subtle)]">
                <dt className="text-[var(--text-muted)]">{row.label}</dt>
                <dd className="text-[var(--text-primary)] text-right">{row.value}</dd>
              </div>
            ))}
          </dl>
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
