import InlineNotice from './ui/InlineNotice'
import PlanCard from './PlanCard'

// Shared plan-picker grid. One source of truth for the "Choose your plan"
// surface, used by both the onboarding flow (OnboardingPage → 'plan' step)
// and the standalone plan page reached from Billing (PlanPickerPage). Keep
// this presentational — the caller owns tier commits + navigation via onPick.
export default function PlanPicker({
  plans,
  committingPlan,
  error,
  onPick,
  title = 'Choose your plan',
  subtitle = 'You can change this anytime in settings.',
}) {
  const isCommitting = committingPlan !== null
  return (
    <div className="flex w-full flex-1 flex-col items-center gap-10 px-4 py-12 max-w-[90rem] mx-auto">
      <header className="w-full max-w-md text-center mb-1">
        <h1 className="text-[40px] font-[425] text-[var(--text-primary)] font-logo mb-2 leading-[1.1] tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
      </header>

      {error && (
        <InlineNotice variant="error" className="max-w-md w-full">{error}</InlineNotice>
      )}

      <div className="grid w-full grid-cols-1 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            mode="picker"
            onSelect={onPick}
            loading={committingPlan === plan.id}
            disabled={isCommitting && committingPlan !== plan.id}
          />
        ))}
      </div>
    </div>
  )
}
