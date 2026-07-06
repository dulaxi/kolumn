import { X } from '@phosphor-icons/react'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

const VARIANTS = {
  info: 'border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--surface-card)]',
  error: 'border-[var(--color-copper)] text-[var(--color-copper)] bg-[var(--surface-card)]',
  success: 'border-[var(--color-lime)] bg-[var(--accent-lime-wash)] text-[var(--text-primary)]',
}

/**
 * InlineNotice — inline banner matching the showToast.* visual spec
 * (src/utils/toast.js): mono 12px, 1px border, 10px radius, raised shadow.
 * Use for in-page banners/feedback rows (migration prompt, pill feedback,
 * inline form errors) — not for ephemeral notifications, which should
 * still go through showToast.
 *
 * <InlineNotice variant="error" onDismiss={() => setError(null)}>
 *   Something went wrong.
 * </InlineNotice>
 */
export default function InlineNotice({ variant = 'info', onDismiss, children, className = '' }) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={mergeClassNames(
        'rounded-[10px] border px-3.5 py-2.5 font-mono text-[12px] leading-relaxed flex items-start gap-2.5 shadow-[var(--shadow-raised)]',
        VARIANTS[variant] || VARIANTS.info,
        className,
      )}
    >
      <span className="flex-1 whitespace-pre-wrap break-words">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 -mr-1 -mt-0.5 p-0.5 leading-none opacity-70 hover:opacity-100 cursor-pointer"
        >
          <X size={13} weight="bold" />
        </button>
      )}
    </div>
  )
}
