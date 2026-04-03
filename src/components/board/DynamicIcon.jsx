import { memo } from 'react'

// Map lucide PascalCase names that DON'T have direct Phosphor equivalents.
// Only names where toKebab() produces a non-existent Phosphor icon need mapping.
const LUCIDE_TO_PHOSPHOR = {
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

function renderMaterial(materialName, sizePx, props) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: `${sizePx}px`,
        lineHeight: `${sizePx}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        flexShrink: 0,
        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
      {...props}
    >
      {materialName}
    </span>
  )
}

function renderPhosphor(iconName, sizePx, props) {
  return (
    <i
      className={`ph ph-${iconName}`}
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
      {...props}
    />
  )
}

export default memo(function DynamicIcon({ name, className = 'w-4 h-4', ...props }) {
  if (!name) return null

  const sizeMatch = className.match(/w-(\d+(?:\.\d+)?)/)
  const sizePx = sizeMatch ? parseFloat(sizeMatch[1]) * 4 : 16

  // Explicit prefix: "material:icon_name"
  if (name.startsWith('material:')) {
    return renderMaterial(name.slice(9), sizePx, props)
  }

  // Legacy Material names with underscores: "check_circle", "arrow_forward"
  if (name.includes('_')) {
    return renderMaterial(name, sizePx, props)
  }

  // Phosphor: kebab-case or single lowercase word; PascalCase → convert to kebab
  const kebab = name.includes('-') || name === name.toLowerCase() ? name : toKebab(name)

  // Apply lucide→phosphor fallback for names that don't exist in Phosphor
  const iconName = LUCIDE_TO_PHOSPHOR[kebab] || kebab

  return renderPhosphor(iconName, sizePx, props)
})
