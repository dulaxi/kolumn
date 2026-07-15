import { Check } from '@phosphor-icons/react'
import Popover from './Popover'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

function MenuItem({
  icon,
  shortcut,
  destructive = false,
  selected = false,
  checkbox = false,
  onSelect,
  className = '',
  children,
  ...rest
}) {
  // Multi-select checkbox replaces the leading icon slot
  const leadingIcon = checkbox ? (
    <span
      className={mergeClassNames(
        'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
        selected
          ? 'bg-[var(--color-ink)] border-[var(--color-ink)]'
          : 'border-[var(--border-default)]',
      )}
    >
      {selected && <Check className="w-2.5 h-2.5 text-white" weight="bold" />}
    </span>
  ) : icon

  return (
    <button
      type="button"
      onClick={onSelect}
      className={mergeClassNames(
        'w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-md',
        'select-none transition-colors text-left cursor-pointer',
        'focus:outline-none focus-visible:bg-[var(--color-cream)]',
        destructive
          ? 'text-[var(--label-red-text)] hover:bg-[var(--label-red-bg)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--color-cream)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      {...rest}
    >
      {leadingIcon && (
        <span
          className={mergeClassNames(
            'shrink-0 flex items-center justify-center',
            destructive ? 'text-[var(--label-red-text)]' : 'text-[var(--color-stone)]',
          )}
          style={{ width: 16, height: 16 }}
        >
          {leadingIcon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {/* Single-select checkmark trails the label */}
      {selected && !checkbox && (
        <Check className="w-3.5 h-3.5 text-[var(--text-primary)] shrink-0" weight="bold" />
      )}
      {shortcut && (
        <span className="ml-auto font-mono text-[10px] text-[var(--color-stone)] shrink-0">
          {shortcut}
        </span>
      )}
    </button>
  )
}

function MenuDivider({ className = '' }) {
  return <div className={mergeClassNames('h-px bg-[var(--color-cream-dark)] my-1 mx-0.5', className)} />
}

function MenuLabel({ children, className = '' }) {
  return (
    <div className={mergeClassNames('px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]', className)}>
      {children}
    </div>
  )
}

function Menu(props) {
  return <Popover {...props} />
}

Menu.Item = MenuItem
Menu.Divider = MenuDivider
Menu.Label = MenuLabel

export default Menu
