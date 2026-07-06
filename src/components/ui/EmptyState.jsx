function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

/**
 * EmptyState — centered icon + title + optional body + optional action.
 * Used for "nothing here yet" placeholders (empty lists, empty boards, no
 * search results with a call to action, etc).
 *
 * <EmptyState
 *   icon={SquaresFour}
 *   title="Create your first board"
 *   body="Boards hold your columns and cards."
 *   action={<Button variant="accent" onClick={...}>New board</Button>}
 * />
 */
export default function EmptyState({ icon: Icon, title, body, action, className = '' }) {
  return (
    <div
      className={mergeClassNames(
        'flex flex-col items-center justify-center text-center gap-1 py-16',
        className,
      )}
    >
      {Icon && <Icon size={56} weight="light" className="text-[var(--text-faint)]" />}
      {title && <h3 className="text-base font-medium text-[var(--text-primary)]">{title}</h3>}
      {body && <p className="text-sm text-[var(--text-muted)] max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
