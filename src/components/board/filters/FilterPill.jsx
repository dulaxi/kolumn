import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import Popover from '../../ui/Popover'
import Tooltip from '../../ui/Tooltip'
import { TOOLBAR_BTN, TOOLBAR_ICON_BTN, TOOLBAR_BTN_FILL } from '../../../constants/buttonStyles'

// A toolbar dropdown trigger. Pass `label` for the text pill (shows the caret +
// selected value — used by the Priority/Assignee/Label/Due filters), or `icon`
// + `tooltip` for the icon-only variant (used by Sort).
export default function FilterPill({ label, icon, tooltip, active, children }) {
  const [isOpen, setIsOpen] = useState(false)

  const fill = active ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]' : TOOLBAR_BTN_FILL

  const button = icon ? (
    <button
      type="button"
      aria-label={tooltip || label}
      onClick={() => setIsOpen(!isOpen)}
      className={`${TOOLBAR_ICON_BTN} ${fill}`}
    >
      {icon}
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={`${TOOLBAR_BTN} ${fill}`}
    >
      {label}
      <CaretDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )

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
      {tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button}
    </Popover>
  )
}
