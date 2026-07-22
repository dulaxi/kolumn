import { Link } from 'react-router-dom'
import { ArrowRight, Check } from '@phosphor-icons/react'
import LetterWave from './ui/LetterWave'

// Visual pricing card. Two modes share the same content (icon, name,
// tagline, price, inherits-from preamble, feature bullets) and the
// same per-tier styling (Pro's heavy border, Free's transparent bg,
// etc.) — they differ only in what the bottom CTA does:
//
//   mode="landing" (default)
//     - CTA is a <Link> to /onboarding with text from plan.cta
//
//   mode="picker"
//     - CTA is a <button> that calls onSelect(plan.id) so the parent
//       can commit the tier and navigate. CTA text is
//       "Continue with {plan.name}" so the choice is unambiguous.
//     - loading={true} spins the CTA on the actively-committing card.
//     - disabled={true} on every other card while one is committing,
//       so the user can't double-fire mid-flight.
export default function PlanCard({
  plan,
  mode = 'landing',
  onSelect,
  loading = false,
  disabled = false,
  className = '',
}) {
  const TopIcon = plan.topIcon
  const isPicker = mode === 'picker'

  const wrapperClasses = [
    'relative rounded-xl p-7 flex flex-col text-left',
    plan.primaryCta ? 'border-2' : 'border',
    plan.ghost
      ? 'bg-[var(--surface-page)] border-[var(--color-sand)]'
      : plan.primaryCta
      ? 'bg-[var(--color-mauve-cream)] border-[var(--color-ink)]'
      : 'bg-[var(--surface-card)] border-[var(--color-sand)]',
    className,
  ].filter(Boolean).join(' ')

  // `mt-auto` pushes the CTA to the bottom of the flex column so all
  // three cards' buttons line up on the same baseline even when
  // bullet counts differ between tiers.
  const ctaBaseClasses = [
    'mt-auto inline-flex items-center justify-center gap-2 h-11 rounded-[0.6rem] text-base font-medium transition-colors',
    plan.primaryCta
      ? 'bg-[var(--text-primary)] text-white hover:bg-[var(--btn-primary-hover)]'
      : 'bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--color-sand)] hover:border-[var(--text-primary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--surface-hover)]',
  ].join(' ')

  return (
    <div className={wrapperClasses}>
      {TopIcon && (
        <div className="mb-5">
          <TopIcon size={56} weight="duotone" className={plan.topIconClass} />
        </div>
      )}

      <h3
        className="text-3xl font-normal tracking-tight text-[var(--text-primary)] font-logo"
      >
        {plan.name}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{plan.tagline}</p>

      <div className="flex items-baseline gap-1.5 mb-6">
        <span className="text-4xl font-normal text-[var(--text-primary)] font-logo">
          {plan.price}
        </span>
        <span className="text-sm text-[var(--text-muted)]">/ {plan.period}</span>
      </div>

      {plan.inheritsFrom && (
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
          Everything in {plan.inheritsFrom}, plus:
        </p>
      )}

      <ul className="space-y-2.5 text-sm text-[var(--text-secondary)] mb-8">
        {plan.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <Check size={14} weight="bold" className="mt-1 text-[var(--color-logo)] shrink-0" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      {isPicker ? (
        <button
          type="button"
          onClick={() => onSelect?.(plan.id)}
          disabled={disabled || loading}
          aria-label={plan.cta}
          aria-busy={loading || undefined}
          className={ctaBaseClasses}
          style={loading ? { opacity: 1 } : undefined}
        >
          {loading ? (
            <>
              <span className="sr-only">Setting up</span>
              <LetterWave text="Setting up" />
            </>
          ) : (
            <>
              {plan.cta}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      ) : (
        <Link to="/onboarding" className={ctaBaseClasses}>
          {plan.cta}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}
