import {
  ListChecks,
  CalendarBlank,
  Briefcase,
  Lightning,
  Bug,
  Confetti,
  UserPlus,
  Bank,
  BookOpen,
  Handshake,
  Compass,
  House,
} from '@phosphor-icons/react'

// Maps TEMPLATES[].icon (a Phosphor component name string, see
// src/content/templates.js) to the actual component. Kept in one place so
// both the gallery tile and the detail hero resolve icons the same way.
const TEMPLATE_ICONS = {
  ListChecks,
  CalendarBlank,
  Briefcase,
  Lightning,
  Bug,
  Confetti,
  UserPlus,
  Bank,
  BookOpen,
  Handshake,
  Compass,
  House,
}

export default function TemplateIcon({ name, size = 20, className = '', weight = 'regular' }) {
  const Icon = TEMPLATE_ICONS[name] || ListChecks
  return <Icon size={size} weight={weight} className={className} />
}
