// Centralized color constants — single source of truth for the design system.
// All components should import from here instead of defining local copies.

// Label color names used for card labels.
// Ordered along the color wheel (red → pink) with gray at the end.
// Must match the DB check constraint on the labels.color column.
export const LABEL_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']

// Tailwind background classes for each label color (used in pickers/dots)
// Solid color swatches for dots and color pickers. These use the saturated
// `-text` token (the label's identity color, e.g. #B53333), NOT the pale `-bg`
// wash that sits behind text in the filled-pill style — so a dot actually
// reads as the label's color.
export const COLOR_DOT_CLASSES = {
  red: 'bg-[var(--label-red-text)]',
  orange: 'bg-[var(--label-orange-text)]',
  yellow: 'bg-[var(--label-yellow-text)]',
  green: 'bg-[var(--label-green-text)]',
  blue: 'bg-[var(--label-blue-text)]',
  purple: 'bg-[var(--label-purple-text)]',
  pink: 'bg-[var(--label-pink-text)]',
  gray: 'bg-[var(--label-gray-text)]',
}

// Workspace identity colors — Phosphor system palette.
// Top row = saturated tones; bottom row = lighter "wash" variants for
// quieter workspace identities. Picker is laid out as 7 cols × 2 rows,
// so list order MUST be: 7 saturated first, then 7 washes (left→right).
// All workspaces render with the same Cube glyph; color comes from
// `workspaces.icon` via resolveWorkspaceColor (overloaded field —
// existing rows with Phosphor icon names hash to a stable color).
export const WORKSPACE_COLORS = [
  // Saturated row
  { name: 'copper',         hex: '#C27A4A' },
  { name: 'honey',          hex: '#D4A843' },
  { name: 'lime',           hex: '#C2D64A' },
  { name: 'mauve',          hex: '#A8969E' },
  { name: 'walnut',         hex: '#8B7355' },
  { name: 'bark',           hex: '#7A5C44' },
  { name: 'bark-dark',      hex: '#6B4D38' },
  // Wash row — lighter variants of each saturated tone, darkened by
  // ~10% from the standard Phosphor --color-*-wash tokens so they
  // carry a touch more visual weight in the picker (otherwise they
  // read too pastel against the modal background).
  { name: 'copper-wash',    hex: '#DAC3B3' },
  { name: 'honey-wash',     hex: '#DCD5BA' },
  { name: 'lime-wash',      hex: '#D6DAC1' },
  { name: 'mauve-wash',     hex: '#D1C7CB' },
  { name: 'walnut-wash',    hex: '#D1C7BB' },
  { name: 'bark-wash',      hex: '#D8CABD' },
  { name: 'bark-dark-wash', hex: '#CEBDAD' },
]

const WORKSPACE_COLOR_MAP = Object.fromEntries(
  WORKSPACE_COLORS.map((c) => [c.name, c.hex])
)

// Resolves a workspace to its display hex color. Reads the `icon` field
// — if it matches a known color name, returns that hex. Otherwise falls
// back to a deterministic hash of the workspace id (so legacy workspaces
// with Phosphor icon names still get a stable, identifying color).
export function resolveWorkspaceColor(workspace) {
  const stored = workspace?.icon
  if (stored && WORKSPACE_COLOR_MAP[stored]) return WORKSPACE_COLOR_MAP[stored]
  const id = workspace?.id || ''
  if (!id) return WORKSPACE_COLORS[0].hex
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return WORKSPACE_COLORS[h % WORKSPACE_COLORS.length].hex
}

// Priority options for card detail fields and inline editor
export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', dot: 'bg-[var(--color-lime-dark)]' },
  { value: 'medium', label: 'Medium', dot: 'bg-[var(--color-honey)]' },
  { value: 'high', label: 'High', dot: 'bg-[var(--color-copper)]' },
]

// Profile avatar color choices (settings page).
// `value` is the legacy stored format ("bg-[#XXXXXX]") — kept stable so existing
// rows in `profiles.color` continue to match the picker's current selection.
// `token` references the theme-aware CSS variable (`--profile-N`); use
// resolveProfileColor() below to map any stored value to a {bgClass, fgClass}.
export const PROFILE_COLORS = [
  { value: 'bg-[#C2D64A]', hex: '#C2D64A', token: '--profile-1' },
  { value: 'bg-[#A8BA32]', hex: '#A8BA32', token: '--profile-2' },
  { value: 'bg-[#D4A843]', hex: '#D4A843', token: '--profile-3' },
  { value: 'bg-[#C27A4A]', hex: '#C27A4A', token: '--profile-4' },
  { value: 'bg-[#A8969E]', hex: '#A8969E', token: '--profile-5' },
  { value: 'bg-[#8B7355]', hex: '#8B7355', token: '--profile-6' },
  { value: 'bg-[#7A5C44]', hex: '#7A5C44', token: '--profile-7' },
  { value: 'bg-[#E0DBD5]', hex: '#E0DBD5', token: '--profile-8' },
  { value: 'bg-[#E8E2DB]', hex: '#E8E2DB', token: '--profile-9' },
  { value: 'bg-[#8E8E89]', hex: '#8E8E89', token: '--profile-10' },
  { value: 'bg-[#5C5C57]', hex: '#5C5C57', token: '--profile-11' },
  { value: 'bg-[#1B1B18]', hex: '#1B1B18', token: '--profile-12' },
]

const PROFILE_VALUE_TO_TOKEN = new Map(PROFILE_COLORS.map((p) => [p.value, p.token]))

// Resolve a stored `profile.color` string to a theme-aware inline style.
// Returns { style, fallbackClass } — apply `style` directly via React's
// `style={...}` prop. Tailwind's JIT can't see runtime-built class strings
// like `bg-[var(--profile-1)]` (the concrete form never appears in source),
// so we use CSS variables via inline style instead — that's exactly what
// they're for. `fallbackClass` is set only when the stored value isn't in
// the palette, in which case the caller can drop it on as a Tailwind class.
export function resolveProfileColor(stored) {
  if (!stored) {
    return {
      style: { background: 'var(--surface-hover)', color: 'var(--text-primary)' },
      fallbackClass: '',
    }
  }
  const token = PROFILE_VALUE_TO_TOKEN.get(stored)
  if (!token) {
    return { style: { color: 'var(--text-primary)' }, fallbackClass: stored }
  }
  return {
    style: {
      background: `var(${token})`,
      color: `var(${token}-fg)`,
    },
    fallbackClass: '',
  }
}

// Chart segment colors (dashboard pie/donut charts).
// Order encodes "lightest → darkest" — preserved across themes so legend
// position stays meaningful. SEGMENT_COLORS keeps the light palette as a
// default export for back-compat; call getSegmentColors(theme) when
// rendering charts so dark consumers get values tuned for dark surfaces.
const SEGMENT_LIGHT = ['#d2d6c5', '#a4b55b', '#8BA32E', '#7A5C44', '#5C5C57', '#3c402b', '#1B1B18']
const SEGMENT_DARK  = ['#3A4030', '#A4B55B', '#8BA32E', '#C49878', '#9C9A95', '#7A8A50', '#E8E5E0']

export const SEGMENT_COLORS = SEGMENT_LIGHT

export function getSegmentColors(theme = 'light') {
  return theme === 'dark' ? SEGMENT_DARK : SEGMENT_LIGHT
}

// Calendar priority dot colors
export const DOT_COLORS = {
  high: 'bg-[var(--color-bark)]',
  medium: 'bg-[var(--color-lime)]',
  low: 'bg-[var(--color-lime-dark)]',
}

// Calendar event left-border accent by priority
export const EVENT_ACCENT = {
  high: 'border-l-[var(--color-bark)]',
  medium: 'border-l-[var(--color-lime)]',
  low: 'border-l-[var(--color-lime-dark)]',
}
