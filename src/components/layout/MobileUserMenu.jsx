import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gear, Kanban, SignOut } from '@phosphor-icons/react'
import { useAuthStore } from '../../store/authStore'
import Menu from '../ui/Menu'

export default function MobileUserMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <Menu
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      panelClassName="w-56"
      panel={
        <>
          <div className="px-2.5 pt-1.5 pb-2 border-b border-[var(--color-cream-dark)] mb-1">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{profile?.display_name || 'User'}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{profile?.email || ''}</p>
          </div>
          <Menu.Item icon={<Gear size={16} />} onSelect={() => { setOpen(false); navigate('/settings') }}>
            Settings
          </Menu.Item>
          <Menu.Item icon={<SignOut size={16} />} destructive onSelect={handleSignOut}>
            Sign out
          </Menu.Item>
        </>
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
      >
        <Kanban className="w-[22px] h-[22px] text-[var(--text-primary)]" weight="light" />
      </button>
    </Menu>
  )
}
