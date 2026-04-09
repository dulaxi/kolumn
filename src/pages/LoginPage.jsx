import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogIn, SquareKanban } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)] font-logo">Kolumn</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Sign in to your account</p>
        </div>

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

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-sm rounded-xl px-3 py-2.5 border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-lime-wash)]"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--btn-primary-bg)] text-white text-sm font-medium rounded-xl hover:bg-[var(--btn-primary-hover)] transition-colors disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="text-center">
            <Link to="/forgot-password" className="text-xs text-[var(--text-muted)] hover:text-[#A8BA32] transition-colors">
              Forgot your password?
            </Link>
          </div>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#A8BA32] hover:text-[#A8BA32] font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
