export const LABEL_BG = {
  red: 'bg-[var(--label-red-bg)] text-[var(--label-red-text)]',
  blue: 'bg-[var(--label-blue-bg)] text-[var(--label-blue-text)]',
  green: 'bg-[var(--label-green-bg)] text-[var(--label-green-text)]',
  yellow: 'bg-[var(--label-yellow-bg)] text-[var(--label-yellow-text)]',
  purple: 'bg-[var(--label-purple-bg)] text-[var(--label-purple-text)]',
  pink: 'bg-[var(--label-pink-bg)] text-[var(--label-pink-text)]',
  gray: 'bg-[var(--label-gray-bg)] text-[var(--label-gray-text)]',
}

export const PRIORITY_DOT = {
  low: 'bg-[#A8BA32]',
  medium: 'bg-[#D4A843]',
  high: 'bg-[#C27A4A]',
}

export const AVATAR_COLORS = [
  'bg-[#E8E2DB]',
  'bg-[#EEF2D6]',
  'bg-[#E8DDE2]',
  'bg-[#F2D9C7]',
  'bg-[#F5EDCF]',
  'bg-[#DAE0F0]',
  'bg-[#D6E8E0]',
]

export function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
