import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Lock } from '@phosphor-icons/react'
import KolumnLogo from '../components/layout/KolumnLogo'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import InlineNotice from '../components/ui/InlineNotice'
import FieldError from '../components/ui/FieldError'
import { PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE, PASSWORD_MISMATCH_MESSAGE } from '../utils/validation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  // Field-scoped, rendered under the input they belong to. `error` below
  // stays for form-scoped failures (the API rejecting the update), which
  // aren't about either field in particular.
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const updatePassword = useAuthStore((s) => s.updatePassword)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setPasswordError('')
    setConfirmError('')

    // Both of these are about one field each, so they belong under that
    // field rather than in a banner above the form that makes you work out
    // which box it means.
    if (password.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(PASSWORD_TOO_SHORT_MESSAGE)
      return
    }
    if (password !== confirm) {
      setConfirmError(PASSWORD_MISMATCH_MESSAGE)
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-raised)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <KolumnLogo size={28} className="mx-auto mb-3" />
          <h1 className="text-[26px] font-light tracking-tight text-[var(--text-primary)] font-logo">Set new password</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-sm space-y-4">
          {error && (
            <InlineNotice variant="error">{error}</InlineNotice>
          )}

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">New password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError('') }}
              required
              autoFocus
              error={!!passwordError}
              aria-invalid={!!passwordError}
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            />
            <FieldError>{passwordError}</FieldError>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Confirm password</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); if (confirmError) setConfirmError('') }}
              required
              error={!!confirmError}
              aria-invalid={!!confirmError}
              placeholder="Repeat your password"
            />
            <FieldError>{confirmError}</FieldError>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={loading}
            loadingText="Updating"
            className="w-full"
          >
            <Lock className="w-4 h-4" />
            Update password
          </Button>
        </form>
      </div>
    </div>
  )
}
