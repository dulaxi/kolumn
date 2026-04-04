import { useEffect, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import toast, { Toaster, useToasterStore } from 'react-hot-toast'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LandingPageV2 = lazy(() => import('./pages/LandingPageV2'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BoardsPage = lazy(() => import('./pages/BoardsPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const NotesPage = lazy(() => import('./pages/NotesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'))

function UndoListener() {
  const { toasts } = useToasterStore()

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
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
        }}
      />
      <UndoListener />
      <Suspense fallback={<div className="min-h-screen bg-[#F2EDE8] flex items-center justify-center"><div className="text-sm text-[#8E8E89]">Loading...</div></div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing-v2" element={<LandingPageV2 />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
            <Route path="boards/*" element={<ErrorBoundary><BoardsPage /></ErrorBoundary>} />
            <Route path="workspace" element={<ErrorBoundary><WorkspacePage /></ErrorBoundary>} />
            <Route path="calendar" element={<ErrorBoundary><CalendarPage /></ErrorBoundary>} />
            <Route path="notes" element={<ErrorBoundary><NotesPage /></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
