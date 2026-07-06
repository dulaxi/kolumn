/**
 * Large rounded action card — Claude.ai style
 * Usage:
 *   <ActionCard icon={Plus} title="Create a board" description="Start organizing tasks" onClick={...} />
 *   <ActionCard icon={Upload} title="Import" description="..." to="/settings" />
 *   <ActionCard variant="danger" icon={Trash} title="Clear data" description="..." onClick={...} />
 */
export default function ActionCard({ icon: Icon, title, description, onClick, to, disabled = false, variant = 'default' }) {
  const isDanger = variant === 'danger'

  const baseClasses = `flex w-full items-center gap-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 text-left shadow-sm transition-colors ${
    disabled
      ? 'opacity-50 cursor-not-allowed'
      : isDanger
        ? 'hover:bg-[var(--color-copper-wash)]/40 hover:border-[var(--color-copper)]/30 cursor-pointer'
        : 'hover:bg-[var(--surface-raised)] cursor-pointer'
  }`

  const iconWrapClasses = `flex shrink-0 items-center justify-center rounded-full p-2.5 ${
    isDanger ? 'bg-[var(--color-copper-wash)]' : 'bg-[var(--accent-lime-wash)]'
  }`

  const iconColor = isDanger ? 'text-[var(--color-copper)]' : 'text-[var(--color-logo)]'
  const titleColor = isDanger ? 'text-[var(--color-copper)]' : 'text-[var(--text-primary)]'

  const content = (
    <>
      <div className={iconWrapClasses}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <span className={`font-semibold text-[15px] ${titleColor} truncate`}>{title}</span>
        <span className="text-sm text-[var(--text-secondary)]">{description}</span>
      </div>
    </>
  )

  if (to && !disabled) {
    return (
      <a href={to} className={baseClasses}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} className={baseClasses}>
      {content}
    </button>
  )
}
