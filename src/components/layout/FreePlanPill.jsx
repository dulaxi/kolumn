import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X } from '@phosphor-icons/react'

import { useAuthStore } from '../../store/authStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useHeaderSlot } from './headerSlot'

// "Free plan · Upgrade" pill, centered in the 64px header bar (claude.ai
// style). Renders only for free-tier users on desktop; portals into the
// header slot so it stays pinned above the scrolling page body. Dismissal
// is in-memory only — the pill returns on every reload.
export default function FreePlanPill() {
  const tier = useAuthStore((s) => s.profile?.tier)
  const slot = useHeaderSlot()
  const isDesktop = useIsDesktop()
  const [dismissed, setDismissed] = useState(false)

  if (tier !== 'free' || !isDesktop || !slot?.node || dismissed) return null

  return createPortal(
    <div className="absolute inset-x-0 top-0 h-12 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto inline-flex items-center gap-1.5 h-8 pl-2 pr-1.5 rounded-lg bg-[var(--surface-raised)] font-mono text-xs text-[var(--text-secondary)] select-none">
        Free plan
        <span aria-hidden="true" className="w-[3px] h-[3px] rounded-full bg-[var(--text-muted)] opacity-40 mt-0.5" />
        <Link
          to="/plans"
          className="underline underline-offset-[3px] decoration-[var(--text-faint)] hover:decoration-current hover:text-[var(--text-primary)] transition-colors"
        >
          Upgrade
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>,
    slot.node,
  )
}
