import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import Popover from '../../ui/Popover'

export default function FilterPill({ label, active, children }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      // bottom-end anchors the dropdown to the trigger's RIGHT edge so
      // the panel grows leftward into the viewport. The board toolbar
      // sits on the right side of the page, so bottom-start was making
      // dropdowns clip off the window's right edge.
      placement="bottom-end"
      panel={children}
      panelClassName="min-w-[160px]"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 h-8 px-2.5 text-sm rounded-lg border-[0.5px] transition-all duration-75 cursor-pointer active:scale-[0.995] ${
          active
            ? 'bg-[var(--accent-lime-soft)] text-[var(--text-primary)] border-[var(--accent-lime-soft)]'
            : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        {label}
        <CaretDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </Popover>
  )
}
