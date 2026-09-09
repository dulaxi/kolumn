import { SignOut, Trash, PushPin } from '@phosphor-icons/react'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'
import Tooltip from '../ui/Tooltip'

/**
 * Single board row used inside the sidebar lists.
 *
 * - Personal boards & workspace boards (owned): editable=true, deletable=true
 * - Workspace boards (non-owner): editable=false (static icon glyph)
 * - Shared boards: editable=false, deletable=false
 */
export default function SidebarBoardItem({
  board,
  active,
  pinned = false,
  editable = false,
  deletable = false,
  leavable = false,
  onSelect,
  onUpdateIcon,
  onDelete,
  onLeave,
  iconPickerOpen,
  onToggleIconPicker,
  renaming,
  renameValue,
  onRenameChange,
  onCommitRename,
  onCancelRename,
  onStartRename,
}) {
  const iconColor = active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
  const iconWeight = active ? 'fill' : 'regular'

  const iconGlyph = (
    <DynamicIcon
      name={board.icon || 'cards-three'}
      weight={iconWeight}
      className={`w-5 h-5 ${iconColor}`}
    />
  )

  return (
    <div
      onClick={() => onSelect?.(board.id)}
      className={`flex items-center justify-between w-full h-8 py-1.5 px-2 rounded-lg text-sm transition-colors duration-75 group cursor-pointer overflow-hidden relative ${
        active
          ? 'text-[var(--text-primary)] bg-[var(--color-mauve-cream)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface-raised)]'
      }`}
    >
      {/* min-w-0 (not an overflow clip) — the name fades itself; clipping here
          would crop the icon's Tooltip bubble to the width of icon + name
          (short names = clipped tooltip). */}
      <span className="flex items-center gap-3 min-w-0 flex-1">
        {editable ? (
          <Tooltip content="Change icon" placement="right">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleIconPicker?.(board.id)
              }}
              aria-label="Change icon"
              className="shrink-0 hover:bg-[var(--border-default)] rounded p-0.5 transition-colors flex items-center justify-center"
              style={{ width: 20, height: 20 }}
            >
              {iconGlyph}
            </button>
          </Tooltip>
        ) : (
          <span className="flex items-center justify-center shrink-0" style={{ width: 20, height: 20 }}>
            {iconGlyph}
          </span>
        )}

        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename?.()
              else if (e.key === 'Escape') onCancelRename?.()
            }}
            onBlur={onCommitRename}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm bg-[var(--surface-card)] border border-[var(--border-default)] rounded px-1.5 py-0.5 focus:outline-none focus:border-[var(--text-primary)] min-w-0"
          />
        ) : (
          /* The mask goes on this wrapper, not on the text. The wrapper is
             flex-1 so it always spans the free space, which means a short name
             never reaches the fade — only a name long enough to overflow
             dissolves. Masking the text itself would fade every name, since a
             short one's box IS its text.

             The inner span stays content-sized so double-click-to-rename
             targets the name rather than the empty space beside it. */
          <span className="flex-1 min-w-0 fade-out-right">
            <span
              onDoubleClick={(e) => {
                if (!editable) return
                e.stopPropagation()
                onStartRename?.(board)
              }}
            >
              {board.name}
            </span>
          </span>
        )}
      </span>

      {/* One trailing slot, one icon. A pinned board shows its pin and nothing
          else — deleting it means unpinning first, which is a reasonable
          speed bump on a board you deliberately marked as important.

          Centred by flex rather than absolute positioning: Tooltip wraps its
          child in a span of its own, so `absolute inset-0` on the icon
          positions against THAT wrapper rather than this slot, and the pin
          lands off-centre. */}
      {(pinned || deletable) && (
        <span data-row-actions className="flex items-center justify-center w-5 h-5 shrink-0">
          {pinned ? (
            <Tooltip content="Pinned to the top">
              <PushPin
                weight="fill"
                aria-label="Pinned"
                // Ink, not muted. The pin is a state the board is in, and a
                // greyed state marker reads as disabled — the row's muted grey
                // is for the hover-revealed actions beside it (trash, leave),
                // which are quiet until you reach for them.
                className="w-3.5 h-3.5 text-[var(--text-primary)]"
              />
            </Tooltip>
          ) : deletable ? (
            <Trash
              role="button"
              aria-label={`Delete board ${board.name}`}
              weight="light"
              className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--label-red-text)] opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onDelete?.(board.id) }}
            />
          ) : null}
        </span>
      )}

      {leavable && (
        <span className="flex items-center gap-0.5 shrink-0">
          <Tooltip content="Leave board">
            <SignOut
              role="button"
              aria-label={`Leave board ${board.name}`}
              weight="light"
              className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--label-red-text)] opacity-0 group-hover:opacity-100 shrink-0"
              onClick={(e) => { e.stopPropagation(); onLeave?.(board.id) }}
            />
          </Tooltip>
        </span>
      )}

      {iconPickerOpen && (
        <div className="absolute left-0 top-full z-40" onClick={(e) => e.stopPropagation()}>
          <IconPicker
            value={board.icon}
            onChange={(icon) => onUpdateIcon?.(board.id, icon)}
            onClose={() => onToggleIconPicker?.(null)}
          />
        </div>
      )}
    </div>
  )
}
