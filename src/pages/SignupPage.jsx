import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ArrowRight } from 'lucide-react'
import { Kanban as PhosphorKanban } from '@phosphor-icons/react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const slowTimer = useRef(null)
  const signUp = useAuthStore((s) => s.signUp)
  const navigate = useNavigate()

  // Clean up timer on unmount
  useEffect(() => () => clearTimeout(slowTimer.current), [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setSlow(false)
    // Show "still working" after 3s so user knows it's not stuck
    slowTimer.current = setTimeout(() => setSlow(true), 3000)
    try {
      await signUp(email, password, displayName || email.split('@')[0])
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      clearTimeout(slowTimer.current)
      setLoading(false)
      setSlow(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <PhosphorKanban size={30} weight="fill" className="text-[#8BA32E]" />
          <span className="text-[23px] font-[450] text-[var(--text-primary)] tracking-tight leading-none font-logo">
            Kolumn
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-normal text-[var(--text-primary)] font-heading mb-2 leading-tight">
            Create your account
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Start organizing your work in under a minute.
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm space-y-4"
        >
          {error && (
            <div className="text-sm text-[#7A5C44] bg-[#F0E0D2]/60 border border-[#D4A07A]/40 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              placeholder="Your name"
              className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-lime-wash)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-lime-wash)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 6 characters"
              className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-lime-wash)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-sm font-medium rounded-xl hover:bg-[var(--btn-primary-hover)] transition-all duration-75 active:scale-[0.995] disabled:opacity-50 disabled:pointer-events-none"
          >
            {slow ? 'Setting up your workspace…' : loading ? 'Creating account…' : 'Create account'}
            {!loading && (
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[#8BA32E] font-medium hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
