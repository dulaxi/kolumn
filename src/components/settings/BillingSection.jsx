import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { TIERS } from '../../constants/tiers'
import { showToast } from '../../utils/toast'
import Button from '../ui/Button'
import KolumnLogo from '../layout/KolumnLogo'
import ConfirmModal from '../board/ConfirmModal'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

// Billing pane: plan hero + Payment/Invoices (honest empty states until
// Stripe lands) + Cancellation for paid tiers. Mirrors the claude.ai
// billing layout; nothing here fabricates records that don't exist.
export default function BillingSection({ onClose }) {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const setTier = useAuthStore((s) => s.setTier)
  const [busy, setBusy] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const tier = profile?.tier || 'free'
  const info = TIERS[tier] || TIERS.free
  const isPaid = tier !== 'free'

  const handleAdjust = () => {
    onClose()
    navigate('/upgrade/pro')
  }

  const handleCancel = async () => {
    setConfirmingCancel(false)
    setBusy(true)
    try {
      // Same stub the upgrade page uses — real flow becomes a Stripe
      // subscription change once billing lands.
      await setTier('free')
      showToast.success('Moved to the Free plan')
    } catch (err) {
      showToast.error(err?.message || "Couldn't change your plan")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Plan hero — logo + plan identity, no section heading */}
      <div className="mb-8 flex items-center justify-between gap-8 border-b border-[var(--border-subtle)] pb-6">
        <div className="flex min-w-0 items-center gap-4">
          <KolumnLogo size={48} />
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{info.label} plan</h3>
            <p className="text-sm text-[var(--text-primary)]">{info.includes}</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {isPaid
                ? 'Managed manually until Kolumn billing launches.'
                : 'Upgrade to unlock every AI tool.'}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          {isPaid ? (
            <Button variant="secondary" size="sm" onClick={handleAdjust}>Adjust plan</Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleAdjust}>Upgrade</Button>
          )}
        </div>
      </div>

      <SettingsSection title="Payment">
        <SettingsRow
          title="No payment method"
          description="Payment methods arrive when Kolumn billing launches."
        />
      </SettingsSection>

      <SettingsSection title="Invoices">
        <SettingsRow
          title="No invoices yet"
          description="Your invoices will appear here once billing is live."
        />
      </SettingsSection>

      {isPaid && (
        <SettingsSection title="Cancellation">
          <SettingsRow title="Cancel plan" description="Drops you back to the Free plan immediately.">
            <Button
              variant="destructive"
              size="sm"
              loading={busy}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel
            </Button>
          </SettingsRow>
        </SettingsSection>
      )}
      {confirmingCancel && (
        <ConfirmModal
          title="Cancel your plan?"
          message="You'll move to the Free plan immediately. Your boards and data stay untouched."
          confirmLabel="Cancel plan"
          onConfirm={handleCancel}
          onCancel={() => setConfirmingCancel(false)}
        />
      )}
    </>
  )
}
