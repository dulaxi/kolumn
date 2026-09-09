import { Check, CaretRight } from '@phosphor-icons/react'
import Popover from './Popover'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

function MenuItem({
  icon,
  shortcut,
  // `value` shows the row's current setting on the right; `chevron` marks the
  // row as opening a further list. Together they make the settings-row shape —
  // "Sort by ......... Name ›" — as opposed to the checklist shape, where each
  // row IS an option and `selected` ticks the chosen one. A menu should pick
  // one shape: rows that lead somewhere, or rows that choose something.
  value,
  chevron = false,
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
        // Workspace-dropdown row standard (2026-07-19): h-8 / text-sm /
        // rounded-lg / px-2, hover on --surface-raised.
        'w-full flex items-center gap-2 h-8 px-2 text-sm rounded-lg',
        'select-none transition-colors text-left cursor-pointer',
        'focus:outline-none focus-visible:bg-[var(--surface-raised)]',
        destructive
          ? 'text-[var(--label-red-text)] hover:bg-[var(--label-red-bg)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      {...rest}
    >
      {/* The icon matches its label's colour rather than sitting a shade
          behind it. It was --color-stone, which read as muted next to ink text
          and made every menu item look half-disabled. The trailing `shortcut`
          below keeps stone deliberately: a keyboard hint IS secondary to the
          action, whereas the icon is just the action again, in glyph form. */}
      {leadingIcon && (
        <span
          className={mergeClassNames(
            'shrink-0 flex items-center justify-center',
            destructive ? 'text-[var(--label-red-text)]' : 'text-[var(--text-primary)]',
          )}
          style={{ width: 16, height: 16 }}
        >
          {leadingIcon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {value && (
        <span className="shrink-0 text-[var(--text-muted)] truncate max-w-[9rem]">{value}</span>
      )}
      {chevron && <CaretRight className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />}
      {/* Single-select checkmark trails the label */}
      {selected && !checkbox && (
        <Check className="w-4 h-4 text-[var(--color-lime-dark)] shrink-0" weight="bold" />
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
  return <div className={mergeClassNames('h-px bg-[var(--border-subtle)] my-1 mx-0.5', className)} />
}

function MenuLabel({ children, className = '' }) {
  return (
    <div className={mergeClassNames('px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]', className)}>
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
