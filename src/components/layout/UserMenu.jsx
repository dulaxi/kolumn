import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gear, Keyboard, SignOut, User } from '@phosphor-icons/react'
import { useAuthStore } from '../../store/authStore'
import { resolveProfileColor } from '../../constants/colors'
import DynamicIcon from '../board/DynamicIcon'
import Menu from '../ui/Menu'
import Tooltip from '../ui/Tooltip'

export default function UserMenu({ variant = 'header', collapsed = false }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  const { style: profileStyle, fallbackClass } = resolveProfileColor(profile?.color)

  // Sidebar avatar stays the SAME size in collapsed and expanded states
  // (was w-7 collapsed → w-9 expanded; now consistent w-7 in both). Header
  // variant (not "sidebar") still uses the larger w-9 avatar.
  const isSidebar = variant === 'sidebar'
  const avatarBox = isSidebar ? 'w-7 h-7' : 'w-9 h-9'
  const innerIcon = isSidebar ? 'w-[18px] h-[18px]' : 'w-5 h-5'
  const avatar = (
    <span
      className={`${avatarBox} rounded-full flex items-center justify-center shrink-0 ${profile?.icon ? fallbackClass : 'bg-[var(--surface-hover)]'}`}
      style={profile?.icon ? profileStyle : undefined}
    >
      {profile?.icon ? (
        <DynamicIcon name={profile.icon} className={innerIcon} />
      ) : (
        <User className={`${innerIcon} text-[var(--text-secondary)]`} />
      )}
    </span>
  )

  const menuPanel = (
    <>
      <div className="px-2.5 pt-1.5 pb-2 border-b border-[var(--color-cream-dark)] mb-1">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{profile?.display_name || 'User'}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">{profile?.email || ''}</p>
      </div>
      <Menu.Item icon={<Gear size={16} />} onSelect={() => { setOpen(false); navigate('/settings') }}>
        Settings
      </Menu.Item>
      <Menu.Item
        icon={<Keyboard size={16} />}
        shortcut="?"
        onSelect={() => { setOpen(false); window.dispatchEvent(new CustomEvent('kolumn:open-shortcuts')) }}
      >
        Keyboard shortcuts
      </Menu.Item>
      <Menu.Item icon={<SignOut size={16} />} destructive onSelect={handleSignOut}>
        Sign out
      </Menu.Item>
    </>
  )

  if (variant === 'sidebar') {
    return (
      <Menu
        open={open}
        onOpenChange={setOpen}
        placement={collapsed ? 'top-start' : 'top-start'}
        panel={menuPanel}
        panelClassName="w-56"
        className={collapsed ? '' : 'flex-1 min-w-0'}
      >
        <Tooltip content={collapsed ? profile?.display_name || 'Account' : undefined} placement="right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="User menu"
            className={`flex items-center w-full rounded-lg transition-colors text-left hover:bg-[var(--surface-hover)] ${
              collapsed ? 'justify-center p-1' : 'gap-2 p-1'
            }`}
          >
            {avatar}
            {!collapsed && (
              <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
                <span className="text-sm font-medium text-[var(--text-primary)] truncate w-full">
                  {profile?.display_name || 'User'}
                </span>
                <span className="text-xs text-[var(--text-muted)] truncate w-full">
                  {profile?.tier
                    ? `${profile.tier.charAt(0).toUpperCase()}${profile.tier.slice(1)} plan`
                    : 'Free plan'}
                </span>
              </div>
            )}
          </button>
        </Tooltip>
      </Menu>
    )
  }

  return (
    <Menu
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      panel={menuPanel}
      panelClassName="w-56"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ${avatarColorClass}`}
      >
        {profile?.icon ? (
          <DynamicIcon name={profile.icon} className="w-5 h-5" />
        ) : (
          <User className="w-5 h-5 text-[var(--text-secondary)]" />
        )}
      </button>
    </Menu>
  )
}
