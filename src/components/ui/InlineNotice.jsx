import { X, WarningCircle, Warning, Info, CheckCircle } from '@phosphor-icons/react'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

const VARIANTS = {
  info: 'border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--surface-card)]',
  error: 'border-[var(--color-copper)] text-[var(--notice-error-text)] bg-[var(--color-copper-wash)]',
  warn: 'border-[var(--color-honey)] text-[var(--notice-warn-text)] bg-[var(--color-honey-wash)]',
  danger: 'border-[var(--label-red-text)] text-[var(--label-red-text)] bg-[var(--label-red-bg)]',
  success: 'border-[var(--color-lime)] bg-[var(--accent-lime-wash)] text-[var(--text-primary)]',
}

const DEFAULT_ICONS = {
  info: Info,
  error: WarningCircle,
  warn: Warning,
  danger: Warning,
  success: CheckCircle,
}

/**
 * InlineNotice — the persistent ("wash") tier of the app-wide error
 * grammar (see docs/design-mockups/error-style-decisions.html). Shares
 * the showToast.* anatomy — mono 12px, 18px Phosphor icon, 1px border,
 * 10px radius — with a quieter wash fill because it sits in the layout
 * until resolved. Solid fills stay exclusive to transient toasts.
 *
 * <InlineNotice variant="error" onDismiss={() => setError(null)}>
 *   Something went wrong.
 * </InlineNotice>
 */
export default function InlineNotice({
  variant = 'info',
  icon,
  action,
  onDismiss,
  children,
  className = '',
}) {
  const DefaultIcon = DEFAULT_ICONS[variant] || Info
  const iconNode = icon === false ? null : icon ?? <DefaultIcon size={18} className="shrink-0 mt-px" />
  const isAlert = variant === 'error' || variant === 'danger'

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      className={mergeClassNames(
        'rounded-[10px] border px-3.5 py-2.5 font-mono text-[12px] leading-relaxed flex items-start gap-2.5',
        VARIANTS[variant] || VARIANTS.info,
        className,
      )}
    >
      {iconNode}
      <span className="flex-1 whitespace-pre-wrap break-words">{children}</span>
      {action}
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
