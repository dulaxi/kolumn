import { useState, useRef, useEffect, cloneElement, isValidElement } from 'react'
import { createPortal } from 'react-dom'
import { OVERLAY_EXIT_MS } from '../../constants/motion'

// Gap between trigger and tip (the old mb-2/mt-2 offset).
const GAP = 8

// The tip is portaled to document.body and fixed-positioned from the
// trigger's rect. An in-place absolute tip gets clipped by any overflow
// ancestor — kanban cards inside the column's overflow-y-auto list were
// cutting off assignee names. Same escape hatch as WorkspaceDropdown's
// portaled panel.
const POSITION = {
  top:    (r) => ({ left: r.left + r.width / 2, top: r.top - GAP,          transform: 'translate(-50%, -100%)' }),
  bottom: (r) => ({ left: r.left + r.width / 2, top: r.bottom + GAP,       transform: 'translate(-50%, 0)' }),
  left:   (r) => ({ left: r.left - GAP,         top: r.top + r.height / 2, transform: 'translate(-100%, -50%)' }),
  right:  (r) => ({ left: r.right + GAP,        top: r.top + r.height / 2, transform: 'translate(0, -50%)' }),
}

const ARROW_PLACEMENT = {
  top: 'top-full left-1/2 -translate-x-1/2 -mt-px border-t-[var(--color-ink)]',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-px rotate-180 border-t-[var(--color-ink)]',
  left: 'left-full top-1/2 -translate-y-1/2 -rotate-90 -ml-1 border-t-[var(--color-ink)]',
  right: 'right-full top-1/2 -translate-y-1/2 rotate-90 -mr-1 border-t-[var(--color-ink)]',
}

export default function Tooltip({
  content,
  placement = 'top',
  delay = 300,
  disabled = false,
  children,
}) {
  const [open, setOpen] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [pos, setPos] = useState(null)
  const timer = useRef(null)
  const exitTimer = useRef(null)
  const anchorRef = useRef(null)

  useEffect(() => () => {
    clearTimeout(timer.current)
    clearTimeout(exitTimer.current)
  }, [])

  // Track the trigger while open so the tip follows scrolls/resizes
  // (capture=true catches nested scroll containers like the column list).
  useEffect(() => {
    if (!open) return
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (rect) setPos((POSITION[placement] || POSITION.top)(rect))
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, placement])

  if (!content || disabled) return children

  const show = () => {
    clearTimeout(timer.current)
    clearTimeout(exitTimer.current)
    setExiting(false)
    timer.current = setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (rect) setPos((POSITION[placement] || POSITION.top)(rect))
      setOpen(true)
    }, delay)
  }
  const hide = () => {
    clearTimeout(timer.current)
    clearTimeout(exitTimer.current)
    if (!open) return
    // Deferred unmount so the fade-out can play (mirrors Popover).
    setExiting(true)
    exitTimer.current = setTimeout(() => {
      setOpen(false)
      setExiting(false)
    }, OVERLAY_EXIT_MS)
  }

  const triggerProps = {
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  }

  const trigger = isValidElement(children)
    ? cloneElement(children, {
        ...triggerProps,
        onMouseEnter: (e) => { children.props.onMouseEnter?.(e); show() },
        onMouseLeave: (e) => { children.props.onMouseLeave?.(e); hide() },
        onFocus: (e) => { children.props.onFocus?.(e); show() },
        onBlur: (e) => { children.props.onBlur?.(e); hide() },
      })
    : <span {...triggerProps}>{children}</span>

  return (
    <span ref={anchorRef} className="relative inline-flex">
      {trigger}
      {open && pos && createPortal(
        // Outer span owns the fixed positioning transform; the inner span
        // plays animate-dropdown. Keeping them separate stops the keyframe's
        // transform from overriding the positioning transform mid-animation.
        <span
          style={{ position: 'fixed', left: pos.left, top: pos.top, transform: pos.transform, zIndex: 50 }}
          className="pointer-events-none"
        >
          <span
            role="tooltip"
            className={`relative block px-2 py-1 text-[11px] font-medium text-white bg-[var(--color-ink)] rounded-md whitespace-nowrap ${exiting ? 'animate-dropdown-out' : 'animate-dropdown'}`}
          >
            {content}
            <span
              aria-hidden="true"
              className={`absolute w-0 h-0 border-4 border-transparent ${ARROW_PLACEMENT[placement] || ARROW_PLACEMENT.top}`}
            />
          </span>
        </span>,
        document.body,
      )}
    </span>
  )
}
