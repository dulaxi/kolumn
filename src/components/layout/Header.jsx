import { Search, User, LogOut, Settings, LayoutGrid } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import DynamicIcon from '../board/DynamicIcon'

export default function Header({ title }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const isDesktop = useIsDesktop()
  const toggleMobileMenu = useSettingsStore((s) => s.toggleMobileMenu)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <header className="relative h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
      {/* Left: grid button (mobile) + title (mobile) / title (desktop) */}
      <div className="flex items-center gap-2.5 min-w-0">
        {!isDesktop && (
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <LayoutGrid className="w-[18px] h-[18px]" />
          </button>
        )}
        {isDesktop ? (
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        ) : (
          <span className="text-sm font-medium text-gray-500 truncate">{title}</span>
        )}
      </div>

      {/* Center: logo (mobile) / search (desktop) */}
      {isDesktop ? (
        <div className="relative hidden sm:block sm:w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-gray-100 border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
          <span
            className="material-symbols-outlined text-gray-900"
            style={{ fontSize: '20px', lineHeight: '20px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          >
            owl
          </span>
          <span className="text-sm font-semibold text-gray-900 tracking-tight">Gambit</span>
        </div>
      )}

      {/* Avatar + Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ${
            profile?.icon ? `${profile.color === 'bg-[#A0A0A0]' ? 'text-gray-900' : 'text-white'} ${profile.color || 'bg-gray-300'}` : 'bg-gray-100'
          }`}
        >
          {profile?.icon ? (
            <DynamicIcon name={profile.icon} className="w-5 h-5" />
          ) : (
            <User className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30 w-48">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.display_name || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{profile?.email || ''}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                navigate('/settings')
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
