import { WarningCircle } from '@phosphor-icons/react'

/**
 * FieldError — the micro tier of the error grammar: a single-input
 * validation message. Mono 11px + 13px icon, no box (a boxed banner
 * under one field outweighs the field itself). Pairs with the input's
 * own error border (Input error prop / copper border).
 */
export default function FieldError({ children, className = '' }) {
  if (!children) return null
  return (
    <p
      role="alert"
      className={`flex items-center gap-1.5 font-mono text-[11px] text-[var(--notice-error-text)] mt-1.5 ${className}`}
    >
      <WarningCircle size={13} className="shrink-0" />
      <span>{children}</span>
    </p>
  )
}
