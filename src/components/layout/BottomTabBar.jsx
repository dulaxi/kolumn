import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Columns3, Calendar, StickyNote, Settings, Users } from 'lucide-react'

const tabs = [
  { to: '/boards', icon: Columns3, label: 'Board' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/workspace', icon: Users, label: 'Workspace' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
]

export default function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--surface-card)] border-t border-[var(--border-default)] flex items-center justify-around h-16 z-30 lg:hidden pb-safe" role="navigation" aria-label="Main navigation">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors ${
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
