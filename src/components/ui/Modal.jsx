import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MODAL_EXIT_MS } from '../../constants/motion'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// --- Z-index ledger (app-wide) ---------------------------------------
// Kept here because Modal sits in the middle of the stack and is the
// layer most likely to collide with something. Bump this comment if the
// ledger changes; don't let per-component z-index values drift from it.
//   z-10   Bottom tab bar (mobile nav, BottomTabBar.jsx)
//   z-20   Floating QuickAddBar pill (collapsed state)
//   z-40   Modal (this component's default `zIndex` prop below). The
//          QuickAddBar's *expanded* composer is itself a Modal, so it
//          inherits this layer once open.
//   z-50   Overlays that must always beat a modal: Popover, Menu,
//          Tooltip, and other in-place dropdowns. These are almost
//          always rendered *inside* a Modal's own DOM subtree, so their
//          z-50 only has to out-rank siblings within that local
//          stacking context — it doesn't need to (and shouldn't) be
//          bumped just because Modal moved from 50 to 40.
//   z-60+  Deliberately-nested modals stacked on top of another modal
//          (e.g. LabelManagerModal's merge-picker) — pass an explicit
//          `zIndex` prop higher than the parent's.
//   z-100  Toaster (App.jsx) — always on top, see note there.
// -----------------------------------------------------------------------
let openModalCount = 0
let savedBodyOverflow = ''
let savedBodyPaddingRight = ''

// Stack of currently-open modals (most-recent last). Only the topmost
// modal handles Escape and Tab focus-trap, so nested modals work correctly.
const modalStack = []

export function lockBodyScroll() {
  if (openModalCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    savedBodyOverflow = document.body.style.overflow
    savedBodyPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      const current = parseInt(window.getComputedStyle(document.body).paddingRight, 10) || 0
      document.body.style.paddingRight = `${current + scrollbarWidth}px`
    }
    const root = document.getElementById('root')
    if (root) {
      root.setAttribute('inert', '')
      root.setAttribute('aria-hidden', 'true')
    }
  }
  openModalCount += 1
}

export function unlockBodyScroll() {
  openModalCount = Math.max(0, openModalCount - 1)
  if (openModalCount === 0) {
    document.body.style.overflow = savedBodyOverflow
    document.body.style.paddingRight = savedBodyPaddingRight
    const root = document.getElementById('root')
    if (root) {
      root.removeAttribute('inert')
      root.removeAttribute('aria-hidden')
    }
  }
}

function getFocusables(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  )
}

export default function Modal({
  open,
  onClose,
  children,
  role = 'dialog',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  lockScroll = true,
  trapFocus = true,
  dismissOnEscape = true,
  dismissOnOutside = true,
  initialFocusRef,
  // When true, skip the auto-focus on open. Use for "view-only" panels
  // (e.g., CardDetailPanel opened via search → Enter) where any focused
  // element would render a stray :focus-visible ring on the first
  // focusable child.
  disableInitialFocus = false,
  backdropClassName = 'bg-[rgba(27,27,24,0.45)]',
  contentClassName = 'flex items-center justify-center',
  className = '',
  zIndex = 40,
  // Enter/exit animation (backdrop fade + panel scale). Consumers with
  // bespoke animation (QuickAddBar's pill-bounce) pass false to keep
  // today's instant mount/unmount.
  animated = true,
}) {
  const contentRef = useRef(null)
  const mouseDownInsideRef = useRef(false)

  // Deferred unmount so the exit animation can play (same pattern as
  // Popover). `open` drives behavior (locks, listeners, data-state);
  // `rendered` only decides whether the DOM exists.
  const [rendered, setRendered] = useState(open)
  useEffect(() => {
    if (open) {
      setRendered(true)
      return
    }
    if (!rendered) return
    if (!animated) {
      setRendered(false)
      return
    }
    const t = setTimeout(() => setRendered(false), MODAL_EXIT_MS)
    return () => clearTimeout(t)
  }, [open, rendered, animated])

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose()
  }, [onClose])

  // Body scroll lock + inert root
  useEffect(() => {
    if (!open || !lockScroll) return
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [open, lockScroll])

  // Set initial focus inside the modal. We do NOT restore focus to the
  // trigger on close — restoring would surface a :focus-visible ring on the
  // trigger after Escape (keyboard modality), which the user does not want.
  useEffect(() => {
    if (!open) return
    if (disableInitialFocus) {
      // Pull focus off any previously-focused element so a stale
      // :focus-visible ring (e.g., on a button under the dialog) doesn't
      // bleed through. Body becomes active, no element shows a focus ring.
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      return
    }
    const target =
      initialFocusRef?.current ||
      getFocusables(contentRef.current)[0] ||
      contentRef.current
    target?.focus?.()
  }, [open, initialFocusRef, disableInitialFocus])

  // Escape + Tab focus trap — only the topmost modal in the stack responds,
  // so nested modals don't all close at once.
  useEffect(() => {
    if (!open) return
    const token = { contentRef }
    modalStack.push(token)

    const isTopmost = () => modalStack[modalStack.length - 1] === token

    const onKeyDown = (e) => {
      if (!isTopmost()) return
      if (e.key === 'Escape' && dismissOnEscape) {
        e.stopPropagation()
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        handleClose()
        return
      }
      if (e.key === 'Tab' && trapFocus) {
        const focusables = getFocusables(contentRef.current)
        if (focusables.length === 0) {
          e.preventDefault()
          contentRef.current?.focus?.()
          return
        }
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || !contentRef.current?.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (active === last || !contentRef.current?.contains(active))) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      const idx = modalStack.indexOf(token)
      if (idx >= 0) modalStack.splice(idx, 1)
    }
  }, [open, dismissOnEscape, trapFocus, handleClose])

  if (!rendered) return null

  // Track whether the *mousedown* started inside the panel. If a user
  // selects text inside the dialog and drags the cursor outside the
  // panel before releasing, the click event resolves to the backdrop
  // (common ancestor of mousedown + mouseup targets), which would
  // misfire as an outside-click and close the dialog. By recording
  // mousedown's origin, we can ignore clicks that started inside.
  const onBackdropMouseDown = (e) => {
    mouseDownInsideRef.current = e.target !== e.currentTarget
  }

  const onBackdropClick = (e) => {
    if (!dismissOnOutside) return
    if (mouseDownInsideRef.current) {
      mouseDownInsideRef.current = false
      return
    }
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${backdropClassName} ${contentClassName} ${className}`}
      style={{ zIndex }}
      data-state={open ? 'open' : 'closed'}
      {...(animated ? { 'data-animated': '' } : {})}
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
      data-modal-backdrop
    >
      <div
        ref={contentRef}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className="outline-none contents"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
