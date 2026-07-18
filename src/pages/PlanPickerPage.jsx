import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'

import { useAuthStore } from '../store/authStore'
import { showToast } from '../utils/toast'
import { PLANS } from '../data/plans'
import Button from '../components/ui/Button'
import PlanPicker from '../components/PlanPicker'

// Standalone "Choose your plan" page, reached from the Billing pane's
// Upgrade / Adjust plan button. Same picker UI as the onboarding 'plan'
// step (shared PlanPicker component), but wired for an existing user
// changing tiers rather than a first-time signup — no upsell detour.
//
// Focused view: renders OUTSIDE AppLayout (no sidebar), matching
// UpgradeProPage — see the /plans route in App.jsx.
export default function PlanPickerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useAuthStore((s) => s.profile)
  const setTier = useAuthStore((s) => s.setTier)

  const currentTier = profile?.tier || 'free'
  const cameFromSettings = location.state?.from === 'settings'
  const [committingPlan, setCommittingPlan] = useState(null)
  const [error, setError] = useState('')

  // Back returns to wherever the user came from. If that was the Settings
  // Billing pane (a modal that unmounted when we routed here), drop a
  // breadcrumb so AppLayout reopens it on Billing after the back-nav.
  const goBack = () => {
    if (cameFromSettings) sessionStorage.setItem('kolumn:reopen-settings', 'billing')
    navigate(-1)
  }

  const handlePick = async (planId) => {
    setError('')
    // Already on this plan — nothing to change.
    if (planId === currentTier) {
      goBack()
      return
    }
    // Pro keeps its dedicated checkout-style flow (period picker + payment
    // stub); the other tiers commit directly until real billing lands.
    if (planId === 'pro') {
      navigate('/upgrade/pro')
      return
    }
    setCommittingPlan(planId)
    try {
      await setTier(planId)
      showToast.success(planId === 'free' ? 'Moved to the Free plan' : 'Plan updated')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message || "Couldn't change your plan")
      setCommittingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <header className="relative flex w-full items-center justify-center pb-5 pt-8">
        <Button
          variant="ghost"
          size="icon-md"
          onClick={goBack}
          aria-label="Back"
          className="absolute left-4 top-8 !rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={20} weight="bold" />
        </Button>
      </header>

      <PlanPicker
        plans={PLANS}
        committingPlan={committingPlan}
        error={error}
        onPick={handlePick}
        subtitle="Switch anytime — your boards and data stay untouched."
      />
    </div>
  )
}
