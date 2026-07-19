import { Flag } from '@phosphor-icons/react'
import Menu from '../ui/Menu'

// Single source of truth for the priority dropdown. Previously forked
// between CardDetailPanel (Menu-based, selected check) and InlineCardEditor
// (hand-rolled, no selected state) — see the 2026-07-19 dropdown audit.
const OPTIONS = [
  { value: 'low', label: 'Low', color: 'var(--color-lime-dark)' },
  { value: 'medium', label: 'Medium', color: 'var(--color-honey)' },
  { value: 'high', label: 'High', color: 'var(--color-copper)' },
]

export default function PriorityMenu({
  open,
  onOpenChange,
  value,
  onChange,
  placement = 'bottom-end',
  className = '',
  children,
}) {
  return (
    <Menu
      open={open}
      onOpenChange={onOpenChange}
      placement={placement}
      className={className}
      panelClassName="w-36"
      panel={OPTIONS.map((opt) => (
        <Menu.Item
          key={opt.value}
          selected={value === opt.value}
          onSelect={() => onChange(opt.value)}
          icon={<Flag className="w-4 h-4" fill={opt.color} style={{ color: opt.color }} />}
        >
          {opt.label}
        </Menu.Item>
      ))}
    >
      {children}
    </Menu>
  )
}
