import { memo } from 'react'

// Convert legacy PascalCase lucide names (e.g. "MapPin") to kebab-case ("map-pin")
// so existing board/card icons stored in Supabase still render via Phosphor.
function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/\d+$/, '') // strip trailing digits: Trash2 → trash, Building2 → building
}

// Naming convention for stored icon names:
//   "material:home"       → Material Symbols (prefix)
//   "check_circle"        → Material Symbols (legacy, has underscores)
//   "rocket"              → Phosphor (kebab-case / single word)
//   "arrow-right"         → Phosphor (kebab-case)
//   "MapPin"              → legacy lucide → convert to Phosphor kebab

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
  const iconName = name.includes('-') || name === name.toLowerCase() ? name : toKebab(name)
  return renderPhosphor(iconName, sizePx, props)
})
