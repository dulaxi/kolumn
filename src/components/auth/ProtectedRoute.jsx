import { Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import RouteLoadingShell from '../layout/RouteLoadingShell'

export default function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) {
    return <RouteLoadingShell />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  // Inner Suspense: lazy app-page chunks resolve inside the shell too,
  // instead of bubbling to App's top-level (public-route) spinner.
  return <Suspense fallback={<RouteLoadingShell />}>{children}</Suspense>
}
