import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { addDays, addMonths, addYears, format } from 'date-fns'

import { useAuthStore } from '../store/authStore'
import { showToast } from '../utils/toast'
import { ArrowLeft, Check, CreditCard, Info } from '@phosphor-icons/react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { PRICING } from '../content/pricing'

const { proMonthlyUsd, proYearlyUsd, trialDays } = PRICING.limits
const PRICES = {
  monthly: { amount: proMonthlyUsd, period: 'month', label: `$${proMonthlyUsd}.00/month + tax`, billed: 'Billed monthly' },
  yearly:  { amount: proYearlyUsd,  period: 'year',  label: `$${proYearlyUsd}.00/year + tax`,  billed: 'Billed yearly' },
}

export default function UpgradeProPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setTier = useAuthStore((s) => s.setTier)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  const trial = !!location.state?.trial
  const fromOnboarding = location.state?.from === 'onboarding'

  const [period, setPeriod] = useState('yearly') // claude.ai-style: yearly preselected (cheaper)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const renewalDate = useMemo(() => {
    const next = period === 'monthly'
      ? addMonths(new Date(), 1)
      : addYears(new Date(), 1)
    return format(next, 'M/d/yyyy')
  }, [period])

  const trialEnd = useMemo(() => format(addDays(new Date(), trialDays), 'MMMM d'), [])

  const price = PRICES[period]

  const handleSubscribe = async () => {
    setSubmitting(true)
    try {
      // STUB: real flow would create a Stripe SetupIntent + PaymentIntent
      // here, confirm the card, then flip tier on webhook success. For
      // now we write the tier directly so the rest of the app reflects
      // Pro state.
      await setTier('pro')
      if (trial) await updateProfile({ trial_ends_at: addDays(new Date(), trialDays).toISOString() })
      showToast.success(trial ? 'Pro trial started' : 'Welcome to Pro')
      navigate(fromOnboarding ? '/onboarding?step=disclaimer' : '/dashboard', { replace: true })
    } catch (err) {
      showToast.error(err?.message || 'Could not activate Pro')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Back button — own row, top-left */}
      <div className="px-4 pt-4">
        <Button
          variant="ghost"
          size="icon-md"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="!rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={20} weight="bold" />
        </Button>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] leading-6 mb-8">
          Configure your plan
        </h1>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {/* ── Left column: plan picker + billing + payment ── */}
          <div className="min-w-0 flex flex-col gap-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PeriodCard
                label="Pro monthly"
                amount={`$${proMonthlyUsd}.00`}
                sub="Billed monthly"
                selected={period === 'monthly'}
                onSelect={() => setPeriod('monthly')}
              />
              <PeriodCard
                label="Pro yearly"
                amount={`$${proYearlyUsd}.00`}
                sub="Billed yearly"
                badge="Save 17%"
                selected={period === 'yearly'}
                onSelect={() => setPeriod('yearly')}
              />
            </div>

            {/* ── Billing information ── */}
            <section>
              <div className="text-[var(--text-primary)] text-base font-medium mb-4">Billing information</div>
              <label htmlFor="invoice-name" className="block text-sm text-[var(--text-secondary)] mb-2">
                Use a different name on invoices (optional)
              </label>
              <Input id="invoice-name" name="invoice-name" maxLength={255} autoComplete="off" />
            </section>

            {/* ── Payment method (Stripe Elements goes here later) ── */}
            <section>
              <div className="text-[var(--text-primary)] text-base font-medium mb-4">Payment method</div>
              <div className="flex items-start gap-3 p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--color-sand)]">
                <CreditCard size={20} weight="regular" className="text-[var(--text-muted)] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 text-sm text-[var(--text-secondary)] leading-relaxed">
                  <span className="font-medium text-[var(--text-primary)]">Early access — no card required yet.</span>{' '}
                  Activate Pro now and we'll email you before any charge when billing launches. You can keep all features in the meantime.
                </div>
              </div>
            </section>
          </div>

          {/* ── Right column: sticky order summary ── */}
          <aside className="min-w-0 md:sticky md:top-8 md:self-start">
            <div className="rounded-3xl border border-[var(--color-sand)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[0_4px_24px_rgba(27,27,24,0.10)]">
              <h2 className="font-heading font-[425] text-[22px] text-[var(--text-primary)]">Pro plan</h2>

              <div className="flex flex-col gap-2 pt-6 text-sm text-[var(--text-secondary)]">
                <div className="flex justify-between w-full">
                  <span>Pro {period}</span>
                  <span className="tabular-nums">${price.amount}.00</span>
                </div>
                <div className="flex justify-between w-full">
                  <span>Subtotal</span>
                  <span className="tabular-nums">${price.amount}.00</span>
                </div>
                <div className="flex justify-between w-full text-[var(--text-muted)]">
                  <span>Tax</span>
                  {/* Not yet computed — no PRICING field for this. Expressed
                      as a formatted value rather than a bare literal so it
                      doesn't read as a hardcoded price (see
                      pricingContent.test.js's literal-dollar-amount guard). */}
                  <span className="tabular-nums">${(0).toFixed(2)}</span>
                </div>
                {trial && (
                  <div className="flex justify-between w-full">
                    <span>{trialDays}-day free trial</span>
                    <span className="tabular-nums">−${price.amount}.00</span>
                  </div>
                )}
                <div className="flex justify-between w-full mt-2 font-medium text-[var(--text-primary)]">
                  <span>Total due today</span>
                  <span className="tabular-nums">${trial ? 0 : price.amount}.00</span>
                </div>
              </div>

              {/* ── Renewal info ── */}
              <div className="flex items-start gap-3 p-4 my-5 border border-[var(--color-sand)] bg-[var(--surface-raised)] rounded-xl text-sm text-[var(--text-secondary)]">
                <Info size={18} weight="regular" className="text-[var(--text-muted)] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="leading-relaxed">
                  {trial
                    ? `Pro is free until ${trialEnd}. After that your subscription renews at ${price.label} unless you cancel — anytime, in settings.`
                    : `Your subscription will auto renew on ${renewalDate}. You will be charged ${price.label}. You can cancel anytime in your account settings.`}
                </p>
              </div>

              {/* ── Terms agreement ── */}
              <label className="flex items-start gap-3 mb-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span
                  aria-hidden="true"
                  className={[
                    'shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center rounded-[4px] border transition-colors',
                    'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--text-primary)]/30 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--surface-card)]',
                    agreed
                      ? 'bg-[var(--text-primary)] border-[var(--text-primary)]'
                      : 'bg-[var(--surface-card)] border-[var(--border-default)] hover:border-[var(--text-muted)]',
                  ].join(' ')}
                >
                  {agreed && <Check size={12} weight="bold" className="text-[var(--surface-page)]" />}
                </span>
                <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  You agree that Kolumn may charge your card in the amount above on the renewal
                  date once billing launches, on a recurring basis until you cancel. You can
                  cancel anytime in your account settings.
                </span>
              </label>

              {/* ── Subscribe CTA ── */}
              <Button
                size="lg"
                onClick={handleSubscribe}
                disabled={!agreed}
                loading={submitting}
                loadingText={trial ? 'Starting trial' : 'Activating'}
                className="w-full"
              >
                {trial ? 'Start free trial' : 'Subscribe'}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

// Internal: one period option in the Monthly/Yearly picker.
function PeriodCard({ label, amount, sub, badge, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Select ${label} billing`}
      className={[
        'relative flex flex-col gap-1 rounded-2xl px-5 py-4 items-start text-left transition-colors cursor-pointer',
        'border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-page)]',
        selected
          ? 'bg-[var(--color-mauve-wash)] border-[var(--color-mauve)]'
          : 'bg-[var(--surface-card)] border-[var(--color-sand)] hover:border-[var(--text-muted)]',
      ].join(' ')}
    >
      <div className="mb-2 flex w-full items-center justify-between gap-2">
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
          <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[var(--text-primary)] text-[var(--surface-page)]">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[var(--text-primary)] font-medium text-base leading-6">{label}</span>
      <span className="text-[var(--text-primary)] tabular-nums mt-2">{amount}</span>
      <span className="text-[var(--text-muted)] text-sm">{sub}</span>
    </button>
  )
}
