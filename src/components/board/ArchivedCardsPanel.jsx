import { ArrowCounterClockwise, Trash, X } from '@phosphor-icons/react'
import Tooltip from '../ui/Tooltip'

export default function ArchivedCardsPanel({ archivedCards, columns, onClose, onRestore, onDelete }) {
  if (archivedCards.length === 0) return null

  return (
    <div className="bg-[var(--color-honey-wash)]/50 border border-[var(--color-honey)] rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--color-walnut)] uppercase tracking-wider">Archived Tasks</span>
        <button type="button" onClick={onClose} className="text-[var(--color-honey)] hover:text-[var(--color-walnut)]">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {archivedCards.map((card) => (
          <div key={card.id} className="flex items-center justify-between py-1.5 px-2 bg-[var(--surface-card)] rounded-lg group">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--text-secondary)] truncate">{card.title}</p>
              <p className="text-[10px] text-[var(--text-faint)]">{columns[card.column_id]?.title || 'Unknown section'}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip content="Restore" placement="top">
                <button
                  type="button"
                  onClick={() => onRestore(card.id)}
                  aria-label="Restore"
                  className="p-1 text-[var(--text-faint)] hover:text-[var(--color-lime-dark)] transition-colors"
                >
                  <ArrowCounterClockwise className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Delete permanently" placement="top">
                <button
                  type="button"
                  onClick={() => onDelete(card.id)}
                  aria-label="Delete permanently"
                  className="p-1 text-[var(--text-faint)] hover:text-[var(--label-red-text)] transition-colors"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
