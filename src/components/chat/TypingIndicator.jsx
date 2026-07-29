import { Kanban } from '@phosphor-icons/react'
import ThinkingWave from '../ui/ThinkingWave'

// The word list + one-per-mount pick moved to the shared ThinkingWave
// (src/components/ui/ThinkingWave.jsx) so the chat and the Klay loaders
// draw from one vocabulary — see src/constants/thinkingWords.js.
export default function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Kolumn is thinking"
      className="flex items-center gap-2 py-3 pl-1 text-sm font-medium"
    >
      <Kanban size={16} weight="fill" className="text-[var(--color-logo)] shrink-0" />
      <ThinkingWave />
    </div>
  )
}
