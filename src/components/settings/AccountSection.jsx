import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Button from '../ui/Button'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'
import SessionsList from './SessionsList'
import DeleteAccountModal from './DeleteAccountModal'

export default function AccountSection({ onClose }) {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const signOutEverywhere = useAuthStore((s) => s.signOutEverywhere)
  const clearAfterAccountDeletion = useAuthStore((s) => s.clearAfterAccountDeletion)

  const email = profile?.email || user?.email || ''

  const [deleteOpen, setDeleteOpen] = useState(false)

  const leave = async (fn) => {
    onClose()
    await fn()
    navigate('/')
  }

  const handleDeleted = () => {
    setDeleteOpen(false)
    onClose()
    clearAfterAccountDeletion()
    navigate('/')
  }

  return (
    <>
      <SettingsSection title="Account">
        <SettingsRow title="Email">
          <span className="text-sm text-[var(--text-secondary)]">{email}</span>
        </SettingsRow>
        <SettingsRow title="Password" description="Set a new password for your account.">
          <Button variant="secondary" size="sm" onClick={() => { onClose(); navigate('/update-password') }}>
            Change password
          </Button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Active sessions">
        <SessionsList />
      </SettingsSection>

      <SettingsSection title="Sign out">
        <SettingsRow title="Sign out" description="Sign out of Kolumn on this device.">
          <Button variant="secondary" size="sm" onClick={() => leave(signOut)}>
            Sign out
          </Button>
        </SettingsRow>
        <SettingsRow title="Log out of all devices" description="Ends every active session, including this one.">
          <Button variant="secondary" size="sm" onClick={() => leave(signOutEverywhere)}>
            Log out everywhere
          </Button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Danger zone">
        <SettingsRow title="Delete account" description="Permanently delete your account and all your data.">
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </SettingsRow>
      </SettingsSection>
      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </>
  )
}
