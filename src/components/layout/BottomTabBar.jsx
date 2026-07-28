import { NavLink } from 'react-router-dom'
import { Columns, SquaresFour, Users } from '@phosphor-icons/react'

// Calendar + Notes tabs removed — see App.jsx note. The bar now has 3
// tabs which fit comfortably without crowding on phones.
const tabs = [
  { to: '/boards', icon: Columns, label: 'Board' },
  { to: '/dashboard', icon: SquaresFour, label: 'Home' },
  { to: '/workspace', icon: Users, label: 'Workspace' },
]

export default function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--surface-card)] border-t border-[var(--border-default)] flex items-center justify-around h-16 z-10 lg:hidden pb-safe" role="navigation" aria-label="Main navigation">
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
          {({ isActive }) => (
            <>
              <Icon className="w-5 h-5" weight={isActive ? 'fill' : 'regular'} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
