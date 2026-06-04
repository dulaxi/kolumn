import { memo } from 'react'

// Forward-compat shim: legacy icon names persisted in DB (board.icon, card.icon)
// from the old lucide era are remapped to their current Phosphor equivalents.
// Lucide-react itself has been removed. Do not delete — would break old boards.
export const LEGACY_ICON_REMAP = {
  'grip-vertical': 'dots-six-vertical',
  'panel-right': 'sidebar-simple',
  'calendar-days': 'calendar-blank',
  'layout-dashboard': 'squares-four',
  'party-popper': 'confetti',
  'pen-tool': 'pen-nib',
  'zap': 'lightning',
  'square-kanban': 'kanban',
  'align-left': 'text-align-left',
  'check-circle': 'check-circle',
  'file-text': 'file-text',
  'more-horizontal': 'dots-three',
  'chevrons-left': 'caret-double-left',
  'chevrons-right': 'caret-double-right',
  'refresh-cw': 'arrow-clockwise',
  'alert-triangle': 'warning',
  'alert-circle': 'warning-circle',
  'wifi-off': 'wifi-slash',
  'circle-dot': 'circle-half',
  'pencil-line': 'pencil-simple-line',
  'log-in': 'sign-in',
  'log-out': 'sign-out',
  'sticky-note': 'note',
  'columns': 'columns',
  'layers': 'stack',
  'bar-chart': 'chart-bar',
  'trending-up': 'trend-up',
  'list-checks': 'list-checks',
}

function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/\d+$/, '')
}

const WEIGHT_PREFIX = {
  thin: 'ph-thin',
  light: 'ph-light',
  regular: 'ph',
  bold: 'ph-bold',
  fill: 'ph-fill',
  duotone: 'ph-duotone',
}

function renderPhosphor(iconName, sizePx, props) {
  const prefix = WEIGHT_PREFIX[props.weight] || 'ph'
  const { weight: _, ...restProps } = props
  return (
    <i
      className={`${prefix} ph-${iconName}`}
      style={{
        fontSize: `${sizePx}px`,
        lineHeight: `${sizePx}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        flexShrink: 0,
      }}
      {...restProps}
    />
  )
}

export default memo(function DynamicIcon({ name, className = 'w-4 h-4', ...props }) {
  if (!name) return null

  const sizeMatch = className.match(/w-(\d+(?:\.\d+)?)/)
  const sizePx = sizeMatch ? parseFloat(sizeMatch[1]) * 4 : 16

  // Phosphor: kebab-case or single lowercase word; PascalCase → convert to kebab
  const kebab = name.includes('-') || name === name.toLowerCase() ? name : toKebab(name)

  // Remap legacy icon names persisted from the old lucide era
  const iconName = LEGACY_ICON_REMAP[kebab] || kebab

  return renderPhosphor(iconName, sizePx, props)
})
