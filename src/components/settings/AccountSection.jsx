import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Button from '../ui/Button'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function AccountSection({ onClose }) {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  const email = profile?.email || user?.email || ''
  const tier = profile?.tier || 'free'
  const plan = tier.charAt(0).toUpperCase() + tier.slice(1)

  const handleChangePassword = () => {
    onClose()
    navigate('/update-password')
  }

  const handleSignOut = async () => {
    onClose()
    await signOut()
    navigate('/')
  }

  return (
    <SettingsSection title="Account">
      <SettingsRow title="Email">
        <span className="text-sm text-[var(--text-secondary)]">{email}</span>
      </SettingsRow>
      <SettingsRow title="Plan">
        <span className="text-sm text-[var(--text-secondary)]">{plan}</span>
      </SettingsRow>
      <SettingsRow title="Password" description="Set a new password for your account.">
        <Button variant="secondary" size="sm" onClick={handleChangePassword}>
          Change password
        </Button>
      </SettingsRow>
      <SettingsRow title="Sign out" description="Sign out of Kolumn on this device.">
        <Button variant="secondary" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </SettingsRow>
    </SettingsSection>
  )
}
