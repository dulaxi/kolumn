import { Ghost } from '@phosphor-icons/react'
import { useSettingsStore } from '../../store/settingsStore'
import Tooltip from '../ui/Tooltip'
import { TOOLBAR_ICON_BTN, TOOLBAR_BTN_FILL } from '../../constants/buttonStyles'

// Header toggle that arms "ghost mode" for this board. Icon-only, but with the
// same filled body as the other board toolbar buttons (surface-raised fill,
// lime-soft when armed) so it doesn't read as an orphan. Lime stays a *state*
// color (armed = lime-soft fill), never a plain button fill.
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
        className={`shrink-0 ${TOOLBAR_ICON_BTN} ${
          armed ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]' : TOOLBAR_BTN_FILL
        }`}
      >
        <Ghost className="w-4 h-4" weight={armed ? 'fill' : 'bold'} />
      </button>
    </Tooltip>
  )
}
