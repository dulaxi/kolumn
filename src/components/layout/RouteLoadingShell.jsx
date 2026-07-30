import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSettingsStore } from '../../store/settingsStore'
import Skeleton from '../ui/Skeleton'
import KolumnLogo from './KolumnLogo'
import BoardSkeleton from '../board/BoardSkeleton'
import PixelKlay from '../klay/PixelKlay'
import ThinkingWave from '../ui/ThinkingWave'

/**
 * RouteLoadingShell — staged, destination-aware full-page loading fallback
 * (decision: docs/design-mockups/reload-loading-decisions.html, option D,
 * refined: the shell must match where the reload is actually landing).
 *
 * Stage 1, instantly: static app chrome + a content skeleton shaped like
 * the DESTINATION route (board columns for /boards, a thread for /chat/:id,
 * the dashboard stack for /dashboard, generic rows elsewhere), with the
 * sidebar honoring the locally-persisted collapsed state. None of it
 * depends on remote data, so a fast reload reads as "already there".
 *
 * Stage 2, only when the wait is real (> klayDelayMs): Klay grows in the
 * content area with a letter-wave verb — his rare-meaningful-moment rule.
 *
 * Skeletons here match at room-shape level, not pixel level: enough that
 * the loaded page replaces them without a bait-and-switch, cheap enough
 * that page redesigns don't strand a ghost twin.
 */
export default function RouteLoadingShell({ klayDelayMs = 600, pathname: pathnameProp }) {
  const [slow, setSlow] = useState(klayDelayMs === 0)
  const location = useLocation()
  // pathnameProp exists for the sandbox workbench, which can't nest routers
  // to fake destinations. Real callers omit it.
  const pathname = pathnameProp ?? location.pathname
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)

  useEffect(() => {
    // 0 = Klay immediately (sandbox), null = never (sandbox stage-1-only).
    // Note setTimeout can't take Infinity — it overflows and fires at once.
    if (klayDelayMs === 0 || klayDelayMs == null) return undefined
    const t = setTimeout(() => setSlow(true), klayDelayMs)
    return () => clearTimeout(t)
  }, [klayDelayMs])

  return (
    <div className="min-h-screen flex bg-[var(--surface-page)]" aria-busy="true">
      <span className="sr-only">Loading Kolumn</span>

      {collapsed ? (
        /* Collapsed rail — mirrors Sidebar.jsx's w-12 */
        <aside
          aria-hidden="true"
          className="hidden md:flex w-12 shrink-0 flex-col items-center border-r border-[var(--border-default)] bg-[var(--surface-sidebar)]"
        >
          {/* Same geometry as Sidebar.jsx's collapsed logo row: h-12, centered */}
          <div className="flex h-12 items-center justify-center px-1">
            <KolumnLogo size={17} />
          </div>
          <div className="flex flex-col items-center gap-4 pt-2">
            <Skeleton variant="circle" width={20} height={20} />
            <Skeleton variant="circle" width={20} height={20} />
            <Skeleton variant="circle" width={20} height={20} />
          </div>
          <div className="mt-auto pb-4">
            <Skeleton variant="circle" width={24} height={24} />
          </div>
        </aside>
      ) : (
        /* Expanded sidebar — mirrors Sidebar.jsx's w-[287px] */
        <aside
          aria-hidden="true"
          className="hidden md:flex w-[287px] shrink-0 flex-col gap-3.5 border-r border-[var(--border-default)] bg-[var(--surface-sidebar)] px-2 py-2"
        >
          {/* Same logo row as Sidebar.jsx expanded: h-16, mark 30 + wordmark */}
          <div className="flex h-16 items-center gap-2 px-2">
            <KolumnLogo size={21} />
            <span className="text-[23px] font-[500] text-[var(--text-primary)] tracking-tight leading-none font-logo">
              Kolumn
            </span>
          </div>
          <div className="flex flex-col gap-3.5 px-2">
            <Skeleton variant="line" width={128} />
            <Skeleton variant="line" width={96} />
            <Skeleton variant="line" width={140} />
          </div>
          <div className="mt-auto flex items-center gap-2.5 px-2 pb-2">
            <Skeleton variant="circle" width={28} height={28} />
            <div className="flex flex-col gap-1.5">
              <Skeleton variant="line" width={88} height={8} />
              <Skeleton variant="line" width={56} height={8} />
            </div>
          </div>
        </aside>
      )}

      {/* Content area: destination-shaped skeleton immediately;
          Klay joins only a real wait */}
      <main aria-hidden="true" className="relative flex-1 overflow-hidden px-4 sm:px-8 py-8">
        <ContentSkeleton pathname={pathname} />
        {slow && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--surface-page)]/70">
            <PixelKlay animation="tap" scale={8} label="Klay loading" />
            <span className="font-mono text-xs text-[var(--text-muted)]">
              <ThinkingWave />
            </span>
          </div>
        )}
      </main>
    </div>
  )
}

function ContentSkeleton({ pathname }) {
  if (pathname.startsWith('/boards')) {
    return (
      <div data-testid="skeleton-boards" className="h-full">
        <BoardSkeleton />
      </div>
    )
  }
  if (/^\/chat\/./.test(pathname)) return <ChatThreadSkeleton />
  if (pathname.startsWith('/dashboard')) return <DashboardSkeleton />
  // /chat (list), /settings, /workspace, /build, anything else:
  // an honest title-plus-rows page shape.
  return <PageSkeleton />
}

// Chat thread: alternating bubbles (user right, assistant left) + composer.
function ChatThreadSkeleton() {
  return (
    <div data-testid="skeleton-chat" className="mx-auto flex h-full max-w-2xl flex-col gap-5 pt-2">
      <Skeleton variant="block" height={44} className="w-3/5 self-end" style={{ borderRadius: 18 }} />
      <Skeleton variant="block" height={72} className="w-4/5" style={{ borderRadius: 12 }} />
      <Skeleton variant="block" height={44} className="w-1/2 self-end" style={{ borderRadius: 18 }} />
      <Skeleton variant="block" height={56} className="w-3/4" style={{ borderRadius: 12 }} />
      <div className="mt-auto pb-2">
        <Skeleton variant="block" height={52} className="w-full" style={{ borderRadius: 16 }} />
      </div>
    </div>
  )
}

// Dashboard: greeting, prompt box, quick-action pills, template tiles.
function DashboardSkeleton() {
  return (
    <div data-testid="skeleton-dashboard" className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-6">
      <Skeleton variant="line" width={320} height={28} />
      <Skeleton variant="block" height={88} className="w-full" style={{ borderRadius: 24 }} />
      <div className="flex flex-wrap justify-center gap-3">
        <Skeleton variant="pill" width={112} height={32} />
        <Skeleton variant="pill" width={100} height={32} />
        <Skeleton variant="pill" width={124} height={32} />
        <Skeleton variant="pill" width={128} height={32} />
      </div>
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="block" height={72} className="w-full" style={{ borderRadius: 12 }} />
        ))}
      </div>
    </div>
  )
}

// Generic page: title line + content rows (settings, workspace, chat list…).
function PageSkeleton() {
  return (
    <div data-testid="skeleton-page" className="mx-auto flex max-w-2xl flex-col gap-4 pt-2">
      <Skeleton variant="line" width={160} height={22} className="mb-3" />
      {[64, 64, 96, 64].map((h, i) => (
        <Skeleton key={i} variant="block" height={h} className="w-full" style={{ borderRadius: 12 }} />
      ))}
    </div>
  )
}
