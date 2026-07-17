import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { TIERS } from '../../constants/tiers'
import { showToast } from '../../utils/toast'
import Button from '../ui/Button'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function BillingSection({ onClose }) {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const setTier = useAuthStore((s) => s.setTier)
  const [busy, setBusy] = useState(false)

  const tier = profile?.tier || 'free'
  const info = TIERS[tier] || TIERS.free

  const handleUpgrade = () => {
    onClose()
    navigate('/upgrade/pro')
  }

  const handleDowngrade = async () => {
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
    <SettingsSection title="Billing">
      <SettingsRow title="Plan" description={info.includes}>
        <span className="text-sm font-medium text-[var(--text-primary)]">{info.label}</span>
      </SettingsRow>
      <SettingsRow
        title={tier === 'free' ? 'Upgrade' : 'Change plan'}
        description={tier === 'free' ? 'Unlock all AI tools and unlimited messages.' : 'Drop back to the Free plan.'}
      >
        {tier === 'free' ? (
          <Button variant="primary" size="sm" onClick={handleUpgrade}>Upgrade to Pro</Button>
        ) : (
          <Button variant="secondary" size="sm" loading={busy} onClick={handleDowngrade}>Downgrade to Free</Button>
        )}
      </SettingsRow>
    </SettingsSection>
  )
}
