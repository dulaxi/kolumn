import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMonths, addYears, format } from 'date-fns'

import { useAuthStore } from '../store/authStore'
import { showToast } from '../utils/toast'
import { ArrowLeft, CreditCard, Info } from '@phosphor-icons/react'
import Button from '../components/ui/Button'

// Pricing — matches what's on the landing + signup pricing cards.
// Yearly = 10× monthly (≈17% saved over paying month-by-month).
const PRICES = {
  monthly: { amount: 8, period: 'month', label: '$8.00/month + tax' },
  yearly:  { amount: 80, period: 'year',  label: '$80.00/year + tax' },
}

export default function UpgradeProPage() {
  const navigate = useNavigate()
  const setTier = useAuthStore((s) => s.setTier)

  const [period, setPeriod] = useState('yearly') // claude.ai-style: yearly preselected (cheaper)
  const [submitting, setSubmitting] = useState(false)

  const renewalDate = useMemo(() => {
    const next = period === 'monthly'
      ? addMonths(new Date(), 1)
      : addYears(new Date(), 1)
    return format(next, 'M/d/yyyy')
  }, [period])

  const price = PRICES[period]

  const handleSubscribe = async () => {
    setSubmitting(true)
    try {
      // STUB: real flow would create a Stripe SetupIntent + PaymentIntent
      // here, confirm the card, then flip tier on webhook success. For
      // now we write the tier directly so the rest of the app reflects
      // Pro state.
      await setTier('pro')
      showToast.success('Welcome to Pro')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      showToast.error(err?.message || 'Could not activate Pro')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Back button — absolute top-left, ghost styling */}
      <header className="relative flex w-full items-center justify-center pb-5 pt-8">
        <Button
          variant="ghost"
          size="icon-md"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="absolute left-4 top-8 !rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={20} weight="bold" />
        </Button>
      </header>

      <div className="flex flex-col w-full max-w-lg mx-auto px-4 pt-8 pb-16">
        <h1 className="font-heading text-3xl tracking-tight mb-6">Pro plan</h1>

        <div className="grid gap-4">
          {/* ── Period picker ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PeriodCard
              id="monthly"
              label="Monthly"
              sub="$8.00/month + tax"
              selected={period === 'monthly'}
              onSelect={() => setPeriod('monthly')}
            />
            <PeriodCard
              id="yearly"
              label="Yearly"
              sub="$80.00/year + tax"
              badge="Save 17%"
              selected={period === 'yearly'}
              onSelect={() => setPeriod('yearly')}
            />
          </div>

          {/* ── Order summary ── */}
          <section className="p-5 bg-[var(--surface-raised)] border border-[var(--color-sand)] rounded-xl text-sm text-[var(--text-secondary)] flex flex-col gap-4">
            <div className="text-[var(--text-primary)] text-base font-medium">Order details</div>

            <div className="flex justify-between w-full">
              <div>
                <div className="font-medium text-[var(--text-primary)]">Pro plan</div>
                <div className="text-[var(--text-muted)] capitalize">{period}</div>
              </div>
              <div className="font-medium text-[var(--text-primary)] tabular-nums">${price.amount}</div>
            </div>

            <div className="w-full border-t border-[var(--color-sand)]" />

            <div className="flex justify-between w-full font-medium text-[var(--text-primary)]">
              <span>Subtotal</span>
              <span className="tabular-nums">${price.amount}</span>
            </div>

            <div className="w-full border-t border-[var(--color-sand)]" />

            <div className="flex justify-between w-full font-medium text-[var(--text-primary)]">
              <span>Total due today</span>
              <span className="tabular-nums">${price.amount}</span>
            </div>
          </section>

          {/* ── Renewal info banner ── */}
          <div className="flex items-start gap-4 p-5 border border-[var(--color-sand)] rounded-xl text-sm text-[var(--text-secondary)]">
            <Info size={18} weight="regular" className="text-[var(--text-muted)] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              Your subscription will auto renew on {renewalDate}. You will be charged {price.label}. You can cancel anytime in your account settings.
            </p>
          </div>

          {/* ── Payment placeholder (Stripe Elements goes here later) ── */}
          <section className="p-5 bg-[var(--surface-card)] border border-[var(--color-sand)] rounded-xl">
            <div className="text-[var(--text-primary)] text-base font-medium mb-4">Payment method</div>
            <div className="flex items-start gap-3 p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--color-sand)]">
              <CreditCard size={20} weight="regular" className="text-[var(--text-muted)] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 text-sm text-[var(--text-secondary)] leading-relaxed">
                <span className="font-medium text-[var(--text-primary)]">Early access — no card required yet.</span>{' '}
                Activate Pro now and we'll email you before any charge when billing launches. You can keep all features in the meantime.
              </div>
            </div>
          </section>

          {/* ── Subscribe CTA ── */}
          <Button
                        size="lg"
            onClick={handleSubscribe}
            loading={submitting}
            loadingText="Activating"
            className="mt-2 w-full"
          >
            Activate Pro
          </Button>

          <p className="text-center text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
            By activating, you agree that Kolumn may charge your card on the renewal date once billing launches. Cancel anytime in settings.
          </p>
        </div>
      </div>
    </div>
  )
}

// Internal: one period option in the Monthly/Yearly picker.
function PeriodCard({ label, sub, badge, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Select ${label} billing`}
      className={[
        'relative flex flex-col rounded-xl p-4 items-start text-left transition-colors cursor-pointer',
        'border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-page)]',
        selected
          ? 'bg-[var(--accent-lime-wash)] border-[var(--color-lime-dark)]'
          : 'bg-[var(--surface-card)] border-[var(--color-sand)] hover:border-[var(--text-muted)]',
      ].join(' ')}
    >
      <div className="mb-3 flex w-full items-center justify-between">
        {/* Custom radio circle — fills with ink when selected */}
        <span
          aria-hidden="true"
          className={[
            'w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-colors',
            selected ? 'border-[var(--text-primary)]' : 'border-[var(--border-default)]',
          ].join(' ')}
        >
          {selected && <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-primary)]" />}
        </span>

        {badge && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[var(--color-lime-dark)] text-[var(--surface-page)]">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[var(--text-primary)] font-medium text-base leading-6">{label}</span>
      <span className="text-[var(--text-muted)] text-sm">{sub}</span>
    </button>
  )
}
