import { cloneElement, isValidElement, useLayoutEffect, useRef, useState } from 'react'

// Radiogroup-semantics segmented control (claude.ai-style): subtle track,
// sliding 1px-bordered thumb, one tab stop, arrow-key navigation with wrap.
// Note: the arrow-key handler SELECTS as it moves (roving selection), the
// standard radiogroup pattern.
export default function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}) {
  const itemRefs = useRef({})
  const [thumb, setThumb] = useState(null) // { left, width } in px

  // Position the sliding thumb under the selected item. jsdom reports 0s
  // here, which is fine — the thumb is aria-hidden decoration.
  useLayoutEffect(() => {
    const el = itemRefs.current[value]
    if (!el) return
    setThumb({ left: el.offsetLeft, width: el.offsetWidth })
  }, [value, options])

  const selectedIndex = options.findIndex((o) => o.value === value)

  const moveSelection = (delta) => {
    const next = options[(selectedIndex + delta + options.length) % options.length]
    onChange(next.value)
    requestAnimationFrame(() => itemRefs.current[next.value]?.focus())
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      moveSelection(1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      moveSelection(-1)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`relative inline-flex h-8 items-stretch rounded-lg bg-[var(--surface-hover)] p-0.5 ${className}`}
    >
      {thumb && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 bottom-0.5 rounded-[6px] bg-[var(--surface-card)] border border-[var(--border-default)] shadow-sm transition-[left,width] duration-150 motion-reduce:transition-none"
          style={{ left: thumb.left, width: thumb.width }}
        />
      )}
      {options.map((opt) => {
        const selected = opt.value === value
        // Selected segment flips its icon to Phosphor fill (app-wide
        // convention). Only component elements (Phosphor icons) get the
        // weight — a raw DOM element (e.g. <svg>) is left untouched.
        const icon = isValidElement(opt.icon) && typeof opt.icon.type !== 'string'
          ? cloneElement(opt.icon, { weight: selected ? 'fill' : 'regular' })
          : opt.icon
        return (
          <button
            key={opt.value}
            ref={(el) => {
              itemRefs.current[opt.value] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.ariaLabel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={`relative z-[1] flex cursor-pointer items-center gap-1.5 rounded-[6px] px-3 text-sm transition-colors ${
              selected
                ? 'font-medium text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
