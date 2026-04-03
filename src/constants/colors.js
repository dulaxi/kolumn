// Centralized color constants — single source of truth for the design system.
// All components should import from here instead of defining local copies.

// Label color names used for card labels
export const LABEL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gray']

// Tailwind background classes for each label color (used in pickers/dots)
export const COLOR_DOT_CLASSES = {
  red: 'bg-[#F2D9C7]',
  blue: 'bg-[#DAE0F0]',
  green: 'bg-[#EEF2D6]',
  yellow: 'bg-[#F5EDCF]',
  purple: 'bg-[#E8DDE2]',
  pink: 'bg-[#F0E0D2]',
  gray: 'bg-[#E8E2DB]',
}

// Priority options for card detail fields and inline editor
export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', dot: 'bg-[#A8BA32]' },
  { value: 'medium', label: 'Medium', dot: 'bg-[#D4A843]' },
  { value: 'high', label: 'High', dot: 'bg-[#C27A4A]' },
]

// Profile avatar color choices (settings page)
export const PROFILE_COLORS = [
  { value: 'bg-[#C2D64A]', hex: '#C2D64A' },
  { value: 'bg-[#A8BA32]', hex: '#A8BA32' },
  { value: 'bg-[#D4A843]', hex: '#D4A843' },
  { value: 'bg-[#C27A4A]', hex: '#C27A4A' },
  { value: 'bg-[#A8969E]', hex: '#A8969E' },
  { value: 'bg-[#8B7355]', hex: '#8B7355' },
  { value: 'bg-[#7A5C44]', hex: '#7A5C44' },
  { value: 'bg-[#E0DBD5]', hex: '#E0DBD5' },
  { value: 'bg-[#E8E2DB]', hex: '#E8E2DB' },
  { value: 'bg-[#8E8E89]', hex: '#8E8E89' },
  { value: 'bg-[#5C5C57]', hex: '#5C5C57' },
  { value: 'bg-[#1B1B18]', hex: '#1B1B18' },
]

// Chart segment colors (dashboard pie/donut charts)
export const SEGMENT_COLORS = ['#d2d6c5', '#a4b55b', '#8BA32E', '#7A5C44', '#5C5C57', '#3c402b', '#1B1B18']

// Calendar priority dot colors
export const DOT_COLORS = {
  high: 'bg-[#7A5C44]',
  medium: 'bg-[#C2D64A]',
  low: 'bg-[#A8BA32]',
}

// Calendar event left-border accent by priority
export const EVENT_ACCENT = {
  high: 'border-l-[#7A5C44]',
  medium: 'border-l-[#C2D64A]',
  low: 'border-l-[#A8BA32]',
}
