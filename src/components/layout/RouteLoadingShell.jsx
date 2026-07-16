import { useEffect, useState } from 'react'
import Skeleton from '../ui/Skeleton'
import BoardSkeleton from '../board/BoardSkeleton'
import PixelKlay from '../klay/PixelKlay'
import LetterWave from '../ui/LetterWave'

/**
 * RouteLoadingShell — staged full-page loading fallback
 * (decision: docs/design-mockups/reload-loading-decisions.html, option D).
 *
 * Stage 1, instantly: static app chrome + board skeletons. None of it
 * depends on data — the sidebar's shape is layout, the user block is a
 * skeleton — so a fast reload reads as "already there" instead of a
 * spinner flash in a void.
 *
 * Stage 2, only when the wait is real (> klayDelayMs): Klay grows in the
 * board area with a letter-wave verb. Keeping him gated preserves his
 * rare-meaningful-moments rule — on a healthy reload he never appears.
 *
 * Replaces the old full-page <Spinner /> in ProtectedRoute and App's
 * route-chunk Suspense fallback.
 */
export default function RouteLoadingShell({ klayDelayMs = 600 }) {
  const [slow, setSlow] = useState(klayDelayMs === 0)

  useEffect(() => {
    if (klayDelayMs === 0) return undefined
    const t = setTimeout(() => setSlow(true), klayDelayMs)
    return () => clearTimeout(t)
  }, [klayDelayMs])

  return (
    <div className="min-h-screen flex bg-[var(--surface-page)]" aria-busy="true">
      <span className="sr-only">Loading Kolumn</span>

      {/* Sidebar chrome — mirrors Sidebar.jsx's w-[287px] */}
      <aside
        aria-hidden="true"
        className="hidden md:flex w-[287px] shrink-0 flex-col gap-3.5 border-r border-[var(--border-subtle)] bg-[var(--surface-sidebar)] px-4 py-4"
      >
        <span className="font-logo text-lg font-semibold text-[var(--text-primary)] mb-2">
          Kolumn
        </span>
        <Skeleton variant="line" width={128} />
        <Skeleton variant="line" width={96} />
        <Skeleton variant="line" width={140} />
        <div className="mt-auto flex items-center gap-2.5">
          <Skeleton variant="circle" width={28} height={28} />
          <div className="flex flex-col gap-1.5">
            <Skeleton variant="line" width={88} height={8} />
            <Skeleton variant="line" width={56} height={8} />
          </div>
        </div>
      </aside>

      {/* Board area: skeletons immediately; Klay joins only a real wait */}
      <main aria-hidden="true" className="relative flex-1 overflow-hidden px-4 sm:px-8 py-8">
        <BoardSkeleton />
        {slow && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--surface-page)]/70">
            <PixelKlay animation="grow" scale={8} label="Klay loading" />
            <span className="font-mono text-xs text-[var(--text-muted)]">
              <LetterWave text="Kanbanning…" tone="typing" />
            </span>
          </div>
        )}
      </main>
    </div>
  )
}
