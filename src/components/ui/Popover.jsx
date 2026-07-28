import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { OVERLAY_EXIT_MS } from '../../constants/motion'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

// Anchor-relative positioning for the default (inline) panel.
const PLACEMENT = {
  'bottom-start': 'top-full left-0 mt-1.5 origin-top-left',
  'bottom-end':   'top-full right-0 mt-1.5 origin-top-right',
  'top-start':    'bottom-full left-0 mb-1.5 origin-bottom-left',
  'top-end':      'bottom-full right-0 mb-1.5 origin-bottom-right',
}

// Transform-origin only — used when `portal` positions the panel via fixed
// coordinates instead of the anchor-relative PLACEMENT classes.
const ORIGIN = {
  'bottom-start': 'origin-top-left',
  'bottom-end':   'origin-top-right',
  'top-start':    'origin-bottom-left',
  'top-end':      'origin-bottom-right',
}

const PANEL_VISUAL =
  'z-50 min-w-[200px] p-1 ' +
  'bg-[var(--surface-card)] border border-[var(--color-mist)] rounded-[10px] ' +
  'shadow-[0_10px_30px_rgba(27,27,24,0.10),0_2px_6px_rgba(27,27,24,0.04)]'

export default function Popover({
  open,
  onOpenChange,
  placement = 'bottom-start',
  panel,
  panelClassName = '',
  closeOnEscape = true,
  closeOnOutsideClick = true,
  className = '',
  // When true the panel renders in a body-level portal, positioned `fixed`
  // from the anchor's rect. Use inside a clipping/scrolling container (e.g. a
  // scrollable modal list) where an `absolute` panel would be cut off.
  portal = false,
  children,
}) {
  const [rendered, setRendered] = useState(open)
  const [exiting, setExiting] = useState(false)
  const anchorRef = useRef(null)
  const panelRef = useRef(null)
  const [coords, setCoords] = useState(null)

  useEffect(() => {
    if (open) {
      setRendered(true)
      setExiting(false)
      return
    }
    if (!rendered) return
    setExiting(true)
    const t = setTimeout(() => {
      setRendered(false)
      setExiting(false)
    }, OVERLAY_EXIT_MS)
    return () => clearTimeout(t)
  }, [open, rendered])

  // Outside-click close. A click counts as "inside" if it lands on the anchor
  // OR the panel — the panel may live in a body-level portal, so a single
  // wrapper.contains() wouldn't see it.
  useEffect(() => {
    if (!open || !closeOnOutsideClick) return
    const onDown = (e) => {
      if (anchorRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      onOpenChange?.(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, closeOnOutsideClick, onOpenChange])

  useEffect(() => {
    if (!open || !closeOnEscape) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        // Blur whatever is focused (typically the trigger button) so the
        // keyboard-modality flip from Escape doesn't surface a :focus-visible
        // ring on the trigger after the popover closes.
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        onOpenChange?.(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeOnEscape, onOpenChange])

  // Fixed-position the portaled panel from the anchor's rect, and keep it
  // pinned as ancestors scroll (e.g. a scrollable modal list) or the window
  // resizes.
  const updatePosition = useCallback(() => {
    const a = anchorRef.current
    if (!a) return
    const r = a.getBoundingClientRect()
    const gap = 6
    const next = {}
    // Vertical flip: honor the requested side unless the panel would run off
    // the viewport there AND the opposite side has more room (tall panels
    // like the calendar near the bottom of the screen).
    const panelH = panelRef.current?.offsetHeight || 0
    const spaceBelow = window.innerHeight - r.bottom - gap
    const spaceAbove = r.top - gap
    const wantBottom = placement.startsWith('bottom')
    const fitsPreferred = wantBottom ? panelH <= spaceBelow : panelH <= spaceAbove
    const preferredIsRoomier = wantBottom ? spaceBelow >= spaceAbove : spaceAbove >= spaceBelow
    const openBottom = wantBottom === (fitsPreferred || preferredIsRoomier)
    if (openBottom) next.top = Math.round(r.bottom + gap)
    else next.bottom = Math.round(window.innerHeight - r.top + gap)
    if (placement.endsWith('start')) next.left = Math.round(r.left)
    else next.right = Math.round(window.innerWidth - r.right)
    // Identity-stable when unchanged so the re-measure effect below can key
    // on coords without looping.
    setCoords((prev) =>
      prev && prev.top === next.top && prev.bottom === next.bottom &&
      prev.left === next.left && prev.right === next.right ? prev : next
    )
  }, [placement])

  // The portal panel mounts only once coords exist, so the first positioning
  // pass measures a null panel (height 0 → never flips). Re-run once the
  // panel is real; identity-stable coords stop this from looping.
  useEffect(() => {
    if (open && portal && rendered && coords) updatePosition()
  }, [open, portal, rendered, coords, updatePosition])

  useEffect(() => {
    // Wait for `rendered` (the panel mounts one commit after `open` flips) —
    // positioning earlier measures a null panel, so the flip-when-cut-off
    // check reads height 0 and never flips on first open.
    if (!open || !portal || !rendered) return
    updatePosition()
    const onMove = () => updatePosition()
    // Capture phase so inner scrollers (not just window) trigger a reposition.
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, portal, rendered, updatePosition])

  const animClass = exiting ? 'animate-dropdown-out pointer-events-none' : 'animate-dropdown'

  const panelNode = (
    <div
      ref={panelRef}
      role="dialog"
      data-menu-root
      style={portal ? { position: 'fixed', ...coords } : undefined}
      className={
        portal
          ? mergeClassNames(PANEL_VISUAL, animClass, ORIGIN[placement] || ORIGIN['bottom-start'], panelClassName)
          : mergeClassNames('absolute', PANEL_VISUAL, animClass, PLACEMENT[placement] || PLACEMENT['bottom-start'], panelClassName)
      }
    >
      {panel}
    </div>
  )

  return (
    <div ref={anchorRef} data-menu-root className={mergeClassNames('relative', className)}>
      {children}
      {!portal && rendered && panelNode}
      {portal && rendered && coords && createPortal(panelNode, document.body)}
    </div>
  )
}
