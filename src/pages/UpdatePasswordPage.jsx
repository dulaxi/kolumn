import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Kanban, Lock } from '@phosphor-icons/react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const updatePassword = useAuthStore((s) => s.updatePassword)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
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
          <Kanban className="w-10 h-10 text-[var(--text-primary)] mx-auto mb-3" weight="light" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] font-heading">Set new password</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-sm space-y-4">
          {error && (
            <div className="text-sm text-[var(--color-copper)] bg-[var(--color-copper-wash)] rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">New password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Confirm password</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repeat your password"
            />
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
