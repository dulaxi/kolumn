import { memo } from 'react'

// Convert legacy PascalCase lucide names (e.g. "MapPin") to kebab-case ("map-pin")
// so existing board/card icons stored in Supabase still render via Phosphor.
function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/\d+$/, '') // strip trailing digits: Trash2 → trash, Building2 → building
}

// Material Symbols use underscores (check_circle, arrow_forward)
// Phosphor uses hyphens (check-circle, arrow-right)
// PascalCase = legacy lucide → convert to kebab for Phosphor
function isMaterial(name) {
  return name.includes('_')
}

export default memo(function DynamicIcon({ name, className = 'w-4 h-4', ...props }) {
  if (!name) return null

  // Parse Tailwind size class to px (w-4 = 16px, w-5 = 20px, etc.)
  const sizeMatch = className.match(/w-(\d+(?:\.\d+)?)/)
  const sizePx = sizeMatch ? parseFloat(sizeMatch[1]) * 4 : 16

  // Material Symbols: snake_case names
  if (isMaterial(name)) {
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
        {name}
      </span>
    )
  }

  // Phosphor: kebab-case names (or PascalCase converted to kebab)
  const iconName = name.includes('-') || name === name.toLowerCase() ? name : toKebab(name)

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
})
