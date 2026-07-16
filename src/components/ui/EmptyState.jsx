import PixelKlay from '../klay/PixelKlay'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

/**
 * EmptyState — centered illustration + title + optional body + optional action.
 * Used for "nothing here yet" placeholders (empty lists, empty boards, no
 * search results with a call to action, etc).
 *
 * Pass EITHER `icon` (a Phosphor component) or `klay` (an animation name) —
 * Klay is reserved for the rare, meaningful empty states that carry the
 * product's story (chat / builder / workspace), not every list.
 * Decision record: docs/design-mockups/klay-emptystate-finals.html
 *
 * <EmptyState
 *   klay="converse"
 *   title="Looking to start a chat?"
 *   body="Ask questions about your boards…"
 *   action={<Button onClick={...}>New chat</Button>}
 * />
 */
export default function EmptyState({ icon: Icon, klay, klayLabel, title, body, action, className = '' }) {
  return (
    <div
      className={mergeClassNames(
        'flex flex-col items-center justify-center text-center gap-1 py-16',
        className,
      )}
    >
      {klay ? (
        <div className="mb-3">
          <PixelKlay animation={klay} scale={7} label={klayLabel || 'Klay'} />
        </div>
      ) : (
        Icon && <Icon size={56} weight="light" className="text-[var(--text-faint)]" />
      )}
      {title && <h3 className="text-base font-medium text-[var(--text-primary)]">{title}</h3>}
      {body && <p className="text-sm text-[var(--text-muted)] max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
