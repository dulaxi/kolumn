import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Mail, ArrowLeft } from 'lucide-react'

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span
            className="material-symbols-outlined text-black mx-auto mb-3 block"
            style={{ fontSize: '40px', lineHeight: '40px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          >owl</span>
          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="text-sm text-gray-600 mt-1">
            {sent ? 'Check your email for a reset link' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {sent ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              We sent a password reset link to <span className="font-medium text-gray-900">{email}</span>. Click the link in the email to set a new password.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full text-sm rounded-xl px-3 py-2.5 border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-4">
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
