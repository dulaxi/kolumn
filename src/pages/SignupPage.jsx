import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { UserPlus, SquareKanban } from 'lucide-react'

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
    <div className="min-h-screen bg-[var(--surface-raised)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <SquareKanban className="w-10 h-10 text-black mx-auto mb-3" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] font-logo">Kolumn</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm space-y-4">
          {error && (
            <div className="text-sm text-[#7A5C44] bg-[#F0E0D2] rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              className="w-full text-sm rounded-xl px-3 py-2.5 border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-lime-wash)]"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-sm rounded-xl px-3 py-2.5 border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-lime-wash)]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-sm rounded-xl px-3 py-2.5 border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-lime-wash)]"
              placeholder="Min 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--btn-primary-bg)] text-white text-sm font-medium rounded-xl hover:bg-[var(--btn-primary-hover)] transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {slow ? 'Setting up your workspace...' : loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-[#A8BA32] hover:text-[#A8BA32] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
