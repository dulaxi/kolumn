import { Ghost } from '@phosphor-icons/react'
import { useSettingsStore } from '../../store/settingsStore'
import Tooltip from '../ui/Tooltip'

// Header toggle that arms "ghost mode" for this board. Lime is a *state* color
// here (armed = lime wash), never a button fill — per coherency rules.
export default function GhostToggle({ boardId }) {
  const armed = useSettingsStore((s) => !!s.ghostBoards[boardId])
  const toggleGhostMode = useSettingsStore((s) => s.toggleGhostMode)

  if (!boardId || boardId === '__all__') return null

  return (
    <Tooltip content={armed ? 'Ghost mode on — hover a card to see its last move' : 'Show where cards were last moved from'}>
      <button
        type="button"
        aria-label="Ghost mode"
        aria-pressed={armed}
        onClick={() => toggleGhostMode(boardId)}
        className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
          armed
            ? 'bg-[var(--accent-lime-wash)] border-[var(--accent-lime-dark)]/40 text-[var(--accent-lime-dark)]'
            : 'bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
        }`}
      >
        <Ghost size={16} weight={armed ? 'fill' : 'regular'} />
        Ghosts
      </button>
    </Tooltip>
  )
}
