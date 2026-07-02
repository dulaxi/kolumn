import { useEffect, useCallback, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'))
const UpgradeProPage = lazy(() => import('./pages/UpgradeProPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BoardsPage = lazy(() => import('./pages/BoardsPage'))
const BuilderPage = lazy(() => import('./pages/BuilderPage'))
// Calendar + Notes removed from the dashboard UI — they added little
// without core differentiation. Page files still exist on disk; restore
// the lazy imports + routes below if you want them back.
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ChatListPage = lazy(() => import('./pages/ChatListPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const LandingBoardSandbox = lazy(() => import('./pages/LandingBoardSandbox'))
const OnboardingBoardSandbox = lazy(() => import('./pages/OnboardingBoardSandbox'))

function UndoListener() {
  const handleClick = useCallback((e) => {
    const undoBtn = e.target.closest('[data-undo-id]')
    if (undoBtn) {
      const id = undoBtn.getAttribute('data-undo-id')
      window.dispatchEvent(new CustomEvent(`kolumn:undo:${id}`))
    }
  }, [])

  useEffect(() => {
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [handleClick])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      {createPortal(
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
          }}
          // Portal-to-body + explicit z-index above any Modal (default 50).
          // Modals also portal to body — without ALSO portaling the Toaster,
          // it would render inside <div id="root"> (z-auto) and any modal
          // would visually cover it regardless of the local z-index value.
          containerStyle={{ zIndex: 100 }}
          containerProps={{ role: 'status', 'aria-live': 'polite' }}
        />,
        document.body,
      )}
      <UndoListener />
      <Suspense fallback={<div className="min-h-screen bg-[var(--surface-raised)] flex items-center justify-center"><div className="text-sm text-[var(--text-muted)]">Loading...</div></div>}>
        <Routes>
          <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
          <Route path="/sandbox/landing-board" element={<ErrorBoundary><LandingBoardSandbox /></ErrorBoundary>} />
          <Route path="/sandbox/onboarding-board" element={<ErrorBoundary><OnboardingBoardSandbox /></ErrorBoundary>} />
          <Route path="/onboarding" element={<ErrorBoundary><OnboardingPage /></ErrorBoundary>} />
          <Route path="/forgot-password" element={<ErrorBoundary><ForgotPasswordPage /></ErrorBoundary>} />
          <Route path="/update-password" element={<ErrorBoundary><UpdatePasswordPage /></ErrorBoundary>} />
          {/* Auth-protected but renders OUTSIDE AppLayout — checkout-style
              focused view, no sidebar. */}
          <Route
            path="/upgrade/pro"
            element={
              <ProtectedRoute>
                <ErrorBoundary><UpgradeProPage /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
            <Route path="chat" element={<ErrorBoundary><ChatListPage /></ErrorBoundary>} />
            <Route path="chat/:id" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
            <Route path="boards/*" element={<ErrorBoundary><BoardsPage /></ErrorBoundary>} />
            <Route path="build" element={<ErrorBoundary><BuilderPage /></ErrorBoundary>} />
            <Route path="workspace" element={<ErrorBoundary><WorkspacePage /></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
