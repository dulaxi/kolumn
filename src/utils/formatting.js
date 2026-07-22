export const LABEL_BG = {
  red: 'bg-[var(--label-red-bg)] text-[var(--label-red-text)]',
  orange: 'bg-[var(--label-orange-bg)] text-[var(--label-orange-text)]',
  yellow: 'bg-[var(--label-yellow-bg)] text-[var(--label-yellow-text)]',
  green: 'bg-[var(--label-green-bg)] text-[var(--label-green-text)]',
  blue: 'bg-[var(--label-blue-bg)] text-[var(--label-blue-text)]',
  purple: 'bg-[var(--label-purple-bg)] text-[var(--label-purple-text)]',
  pink: 'bg-[var(--label-pink-bg)] text-[var(--label-pink-text)]',
  gray: 'bg-[var(--label-gray-bg)] text-[var(--label-gray-text)]',
  'red-light': 'bg-[var(--label-red-bg)] text-[var(--label-red-light)]',
  'orange-light': 'bg-[var(--label-orange-bg)] text-[var(--label-orange-light)]',
  'yellow-light': 'bg-[var(--label-yellow-bg)] text-[var(--label-yellow-light)]',
  'green-light': 'bg-[var(--label-green-bg)] text-[var(--label-green-light)]',
  'blue-light': 'bg-[var(--label-blue-bg)] text-[var(--label-blue-light)]',
  'purple-light': 'bg-[var(--label-purple-bg)] text-[var(--label-purple-light)]',
  'pink-light': 'bg-[var(--label-pink-bg)] text-[var(--label-pink-light)]',
  'gray-light': 'bg-[var(--label-gray-bg)] text-[var(--label-gray-light)]',
}

export const LABEL_BG_QUIET = {
  red: 'bg-[var(--label-red-bg)]/60 text-[var(--label-red-text)]',
  orange: 'bg-[var(--label-orange-bg)]/60 text-[var(--label-orange-text)]',
  yellow: 'bg-[var(--label-yellow-bg)]/60 text-[var(--label-yellow-text)]',
  green: 'bg-[var(--label-green-bg)]/60 text-[var(--label-green-text)]',
  blue: 'bg-[var(--label-blue-bg)]/60 text-[var(--label-blue-text)]',
  purple: 'bg-[var(--label-purple-bg)]/60 text-[var(--label-purple-text)]',
  pink: 'bg-[var(--label-pink-bg)]/60 text-[var(--label-pink-text)]',
  gray: 'bg-[var(--label-gray-bg)]/60 text-[var(--label-gray-text)]',
  'red-light': 'bg-[var(--label-red-bg)]/60 text-[var(--label-red-light)]',
  'orange-light': 'bg-[var(--label-orange-bg)]/60 text-[var(--label-orange-light)]',
  'yellow-light': 'bg-[var(--label-yellow-bg)]/60 text-[var(--label-yellow-light)]',
  'green-light': 'bg-[var(--label-green-bg)]/60 text-[var(--label-green-light)]',
  'blue-light': 'bg-[var(--label-blue-bg)]/60 text-[var(--label-blue-light)]',
  'purple-light': 'bg-[var(--label-purple-bg)]/60 text-[var(--label-purple-light)]',
  'pink-light': 'bg-[var(--label-pink-bg)]/60 text-[var(--label-pink-light)]',
  'gray-light': 'bg-[var(--label-gray-bg)]/60 text-[var(--label-gray-light)]',
}

// Exact match to the Anthropic "Upgrade pill" CSS: accent-000 text + border-400/15 border.
// Mapped to Kolumn tokens: --text-muted text, --text-muted at 15% alpha border.
export const LABEL_OUTLINE = {
  red: 'text-[var(--label-red-text)] border-[var(--label-red-text)]/20',
  orange: 'text-[var(--label-orange-text)] border-[var(--label-orange-text)]/20',
  yellow: 'text-[var(--label-yellow-text)] border-[var(--label-yellow-text)]/20',
  green: 'text-[var(--label-green-text)] border-[var(--label-green-text)]/20',
  blue: 'text-[var(--label-blue-text)] border-[var(--label-blue-text)]/20',
  purple: 'text-[var(--label-purple-text)] border-[var(--label-purple-text)]/20',
  pink: 'text-[var(--label-pink-text)] border-[var(--label-pink-text)]/20',
  gray: 'text-[var(--label-gray-text)] border-[var(--label-gray-text)]/20',
  'red-light': 'text-[var(--label-red-light)] border-[var(--label-red-light)]/25',
  'orange-light': 'text-[var(--label-orange-light)] border-[var(--label-orange-light)]/25',
  'yellow-light': 'text-[var(--label-yellow-light)] border-[var(--label-yellow-light)]/25',
  'green-light': 'text-[var(--label-green-light)] border-[var(--label-green-light)]/25',
  'blue-light': 'text-[var(--label-blue-light)] border-[var(--label-blue-light)]/25',
  'purple-light': 'text-[var(--label-purple-light)] border-[var(--label-purple-light)]/25',
  'pink-light': 'text-[var(--label-pink-light)] border-[var(--label-pink-light)]/25',
  'gray-light': 'text-[var(--label-gray-light)] border-[var(--label-gray-light)]/25',
}

export const PRIORITY_DOT = {
  low: 'bg-[var(--color-lime-dark)]',
  medium: 'bg-[var(--color-honey)]',
  high: 'bg-[var(--color-copper)]',
}

export const AVATAR_COLORS = [
  'bg-[var(--surface-hover)]',
  'bg-[var(--color-lime-wash)]',
  'bg-[var(--color-mauve-wash)]',
  'bg-[var(--color-copper-wash)]',
  'bg-[var(--color-honey-wash)]',
  'bg-[var(--label-blue-bg)]',
  'bg-[var(--color-mint-wash)]',
]

export function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getAvatarTextColor(bgClass) {
  const darkBgs = ['bg-[var(--text-primary)]', 'bg-[#5C5C57]', 'bg-[var(--color-bark)]', 'bg-[#8B7355]']
  return darkBgs.includes(bgClass) ? 'text-white' : 'text-[var(--text-primary)]'
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function avatarColorClasses(name) {
  const bg = getAvatarColor(name)
  return `${bg} ${getAvatarTextColor(bg)}`
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
