import { Link } from 'react-router-dom'
import { STATUS_COMPONENTS, STATE_COPY, overallStatus } from '../../content/status'

// /status — spec: docs/superpowers/specs/marketing/status.md §3. Kolumn has
// no monitoring provider wired up yet, so this page must never render a
// hardcoded "all systems operational" banner — see content/status.js's file
// header. Every component ships 'unknown' and the banner renders that
// honestly, with room for a future provider to replace the hardcoded
// `status` fields with live data.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'

export default function StatusPage() {
  const overall = overallStatus(STATUS_COMPONENTS)
  const state = STATE_COPY[overall]

  return (
    <>
      <section className={`${SECTION} pt-16 pb-8`}>
        <h1 className="font-heading font-[425] text-5xl text-[var(--text-primary)] tracking-tight leading-[1.08] mb-4 max-w-xl">
          Kolumn status
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
          Kolumn does not yet have live monitoring connected. This page lists what Kolumn depends on so you can tell
          what might be affected — it can&rsquo;t yet tell you whether any of it is actually up.
        </p>
      </section>

      <section className={`${SECTION} pb-10`}>
        <div
          role="status"
          aria-live="polite"
          className={`max-w-[850px] rounded-[10px] border border-[var(--border-default)] px-5 py-3.5 flex items-center gap-3 ${state.washClass}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${state.dotClass}`} aria-hidden="true" />
          <span className="font-heading font-[425] text-xl text-[var(--text-primary)] flex-1">{state.heading}</span>
        </div>
      </section>

      <section className={`${SECTION} pb-16`}>
        <h2 className="sr-only">Components</h2>
        <div className="max-w-[850px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] divide-y divide-[var(--border-subtle)]">
          {STATUS_COMPONENTS.map((component) => {
            const componentState = STATE_COPY[component.status] || STATE_COPY.unknown
            return (
              <div key={component.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-base font-medium text-[var(--text-primary)]">{component.name}</p>
                  <p className="text-[13px] text-[var(--text-secondary)]">{component.description}</p>
                </div>
                <span className="font-mono text-xs text-[var(--text-muted)] shrink-0 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${componentState.dotClass}`} aria-hidden="true" />
                  {componentState.statusLabel}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)] tracking-tight mb-4">
          Past incidents
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-[850px]">
          No incident history is tracked yet. Once a status provider is connected, incidents will be listed here as
          they happen.
        </p>
      </section>

      <section className={`${SECTION} pb-16`}>
        <div className="max-w-[850px] border-t border-[var(--border-subtle)] pt-4 flex items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
          <Link to="/support" className="hover:text-[var(--text-primary)] transition-colors">
            Something else wrong? Visit support
          </Link>
          <span className="font-mono text-xs">No status provider connected</span>
        </div>
      </section>
    </>
  )
}
