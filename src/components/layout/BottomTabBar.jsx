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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-14 z-30 lg:hidden pb-safe">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors ${
              isActive ? 'text-gray-900' : 'text-gray-500'
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
