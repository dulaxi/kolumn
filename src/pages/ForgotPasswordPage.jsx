import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ArrowLeft, Envelope } from '@phosphor-icons/react'
import KolumnLogo from '../components/layout/KolumnLogo'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import InlineNotice from '../components/ui/InlineNotice'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const resetPassword = useAuthStore((s) => s.resetPassword)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
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
          <h1 className="text-[26px] font-light tracking-tight text-[var(--text-primary)] font-logo">Reset password</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {sent ? 'Check your email for a reset link' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {sent ? (
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-lime-wash)] flex items-center justify-center mx-auto mb-3">
              <Envelope className="w-6 h-6 text-[var(--color-lime-dark)]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              We sent a password reset link to <span className="font-medium text-[var(--text-primary)]">{email}</span>. Click the link in the email to set a new password.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-lime-dark)] hover:text-[var(--color-lime-dark)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-sm space-y-4">
            {error && (
              <InlineNotice variant="error">{error}</InlineNotice>
            )}

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@example.com"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              loading={loading}
              loadingText="Sending"
              className="w-full"
            >
              <Envelope className="w-4 h-4" />
              Send reset link
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
          <Link to="/" className="text-[var(--color-lime-dark)] hover:text-[var(--color-lime-dark)] font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
