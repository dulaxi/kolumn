import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Mail, ArrowLeft, SquareKanban } from 'lucide-react'

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
          <SquareKanban className="w-10 h-10 text-black mx-auto mb-3" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] font-heading">Reset password</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {sent ? 'Check your email for a reset link' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {sent ? (
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-lime-wash)] flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-[#A8BA32]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              We sent a password reset link to <span className="font-medium text-[var(--text-primary)]">{email}</span>. Click the link in the email to set a new password.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#A8BA32] hover:text-[#A8BA32]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm space-y-4">
            {error && (
              <div className="text-sm text-[#7A5C44] bg-[#F0E0D2] rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full text-sm rounded-xl px-3 py-2.5 border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-lime-wash)]"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--btn-primary-bg)] text-white text-sm font-medium rounded-xl hover:bg-[var(--btn-primary-hover)] transition-colors disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
          <Link to="/login" className="text-[#A8BA32] hover:text-[#A8BA32] font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
