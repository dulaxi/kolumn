import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import Popover from './Popover'
import Tooltip from './Tooltip'
import { TOOLBAR_BTN, TOOLBAR_ICON_BTN, TOOLBAR_BTN_FILL } from '../../constants/buttonStyles'

// The app's dropdown trigger. Pass `label` for the text pill (caret + selected
// value — Priority/Assignee/Label/Due), or `icon` + `tooltip` for the icon-only
// variant (Sort, and the sidebar's board list).
//
// Lives in ui/ rather than board/filters/ because it is not board-specific: it
// owns the open state, the trigger and the panel's minimum width, which is
// exactly the plumbing anyone reaching for a dropdown would otherwise hand-roll
// and get subtly different.
//
// `compact` swaps the toolbar's filled 32px pill for a small ghost icon button.
// The board toolbar is a row of filled controls, so a pill belongs there; the
// sidebar's section heading is a row of quiet 16px glyphs, and a filled pill
// beside them would shout.
export default function FilterPill({
  label,
  icon,
  tooltip,
  active,
  compact = false,
  // Forwarded to Popover. A panel inside a scroll container — the sidebar's
  // nav is overflow-y-auto — is clipped at that container's edge unless it
  // renders in a body-level portal. The board toolbar has no such ancestor,
  // which is why the five filters that predate this never needed it.
  portal = false,
  placement = 'bottom-end',
  children,
}) {
  const [isOpen, setIsOpen] = useState(false)

  const fill = active ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]' : TOOLBAR_BTN_FILL

  const button = compact ? (
    <button
      type="button"
      aria-label={tooltip || label}
      onClick={() => setIsOpen(!isOpen)}
      className={`p-0.5 rounded flex items-center justify-center transition-colors ${
        active
          ? 'text-[var(--text-primary)] bg-[var(--surface-raised)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
      }`}
    >
      {icon}
    </button>
  ) : icon ? (
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
      // bottom-end by default: it anchors the dropdown to the trigger's RIGHT
      // edge so the panel grows leftward into the viewport. The board toolbar
      // sits on the right of the page, where bottom-start clipped dropdowns
      // off the window edge.
      placement={placement}
      portal={portal}
      panel={children}
      panelClassName="min-w-[160px]"
    >
      {tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button}
    </Popover>
  )
}
