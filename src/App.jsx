import { useEffect, useCallback, useState, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Spinner from './components/ui/Spinner'
import MarketingLayout from './components/marketing/MarketingLayout'
import { marketingRouteElements } from './components/marketing/MarketingRoutes'
import ScrollToTop from './components/marketing/ScrollToTop'


const LandingPage = lazy(() => import('./pages/LandingPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'))
const UpgradeProPage = lazy(() => import('./pages/UpgradeProPage'))
const PlanPickerPage = lazy(() => import('./pages/PlanPickerPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BoardsPage = lazy(() => import('./pages/BoardsPage'))
const BuilderPage = lazy(() => import('./pages/BuilderPage'))
// Calendar + Notes were removed from the product (files deleted in the
// 2026-08-05 repo cleanup). If a calendar returns, build it as a board
// view-toggle, not a page; notes data + noteStore still exist server-side.
const SettingsRedirect = lazy(() => import('./components/settings/SettingsRedirect'))
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ChatListPage = lazy(() => import('./pages/ChatListPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const LandingBoardSandbox = lazy(() => import('./pages/LandingBoardSandbox'))
const OnboardingBoardSandbox = lazy(() => import('./pages/OnboardingBoardSandbox'))
const BoardSkeletonSandbox = lazy(() => import('./pages/BoardSkeletonSandbox'))
const LogoAlignSandbox = lazy(() => import('./pages/LogoAlignSandbox'))
const AssetPreviewSandbox = lazy(() => import('./pages/AssetPreviewSandbox'))

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
  // Toaster can't exist during SSR (it portals to document.body, which
  // Node doesn't have) — a prerendered page's tree structurally never
  // includes it. Gating its first client render behind an effect makes
  // hydrateRoot's very first pass match that "nothing here" shape exactly;
  // it mounts one tick later, imperceptibly, since no toast is ever active
  // this early anyway. Without the gate, hydration for this fiber has
  // nothing server-rendered to reconcile against and logs an isolated
  // (but avoidable) `[hydrate] recovered` mismatch for it specifically.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <UndoListener />

      <Suspense fallback={<div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center"><Spinner size={24} /></div>}>
        <Routes>
          <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
          <Route element={<MarketingLayout />}>{marketingRouteElements()}</Route>
          <Route path="/sandbox/landing-board" element={<ErrorBoundary><LandingBoardSandbox /></ErrorBoundary>} />
          <Route path="/sandbox/onboarding-board" element={<ErrorBoundary><OnboardingBoardSandbox /></ErrorBoundary>} />
          {import.meta.env.DEV && (
            <Route path="/sandbox/board-skeleton" element={<ErrorBoundary><BoardSkeletonSandbox /></ErrorBoundary>} />
          )}
          {import.meta.env.DEV && (
            <Route path="/sandbox/logo-align" element={<ErrorBoundary><LogoAlignSandbox /></ErrorBoundary>} />
          )}
          {import.meta.env.DEV && (
            <Route path="/sandbox/asset-preview" element={<ErrorBoundary><AssetPreviewSandbox /></ErrorBoundary>} />
          )}
          {import.meta.env.DEV && (
            <Route path="/sandbox/upgrade-pro" element={<ErrorBoundary><UpgradeProPage /></ErrorBoundary>} />
          )}
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
            path="/plans"
            element={
              <ProtectedRoute>
                <ErrorBoundary><PlanPickerPage /></ErrorBoundary>
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
            <Route path="settings" element={<SettingsRedirect />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      {mounted && createPortal(
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
          }}
          // Portal-to-body + explicit z-index above any Modal (default 40 —
          // see the full app-wide z-index ledger in Modal.jsx).
          // Modals also portal to body — without ALSO portaling the Toaster,
          // it would render inside <div id="root"> (z-auto) and any modal
          // would visually cover it regardless of the local z-index value.
          //
          // Positioned AFTER the Suspense/Routes tree (not before), and
          // gated on `mounted` (see above): a portal fiber preceding a
          // Suspense boundary that a prerendered page's SSR tree doesn't
          // itself render (Toaster can't run in Node — no document) throws
          // off hydrateRoot's DOM-matching for everything that follows it
          // inside #root, even though the portal produces no DOM at this
          // position. Confirmed empirically while wiring up
          // marketing-page prerendering (task-12): moving this portal after
          // the routed content took hydration on /pricing from a full-tree
          // "[hydrate] recovered" mismatch down to one isolated warning for
          // this fiber alone; the `mounted` gate above clears that last one
          // by giving this nothing to hydrate against on the first pass.
          // Keep it last, and keep the gate.
          containerStyle={{ zIndex: 100 }}
          containerProps={{ role: 'status', 'aria-live': 'polite' }}
        />,
        document.body,
      )}
    </BrowserRouter>
  )
}
