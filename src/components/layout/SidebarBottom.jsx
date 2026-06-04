import { SidebarSimple } from '@phosphor-icons/react'
import UserMenu from './UserMenu'
import NotificationBell from './NotificationBell'
import Tooltip from '../ui/Tooltip'

export default function SidebarBottom({ collapsed, showCollapsed, onToggle, workspaceSidebarOpen }) {
  const tooltipText = workspaceSidebarOpen
    ? 'Close workspaces to expand'
    : collapsed ? 'Expand sidebar' : 'Collapse sidebar'

  return (
    <div className={`border-t border-[var(--border-subtle)] ${showCollapsed ? 'px-1 py-2 flex flex-col items-center gap-1' : 'px-2 py-2 flex items-center gap-0.5'}`}>
      <UserMenu variant="sidebar" collapsed={showCollapsed} />
      <NotificationBell
        placement="top"
        tooltipPlacement={showCollapsed ? 'right' : 'top'}
      />
      <Tooltip content={tooltipText} placement={showCollapsed ? 'right' : 'top'}>
        <button
          onClick={onToggle}
          disabled={workspaceSidebarOpen}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)] shrink-0 inline-flex items-center justify-center"
        >
          <SidebarSimple size={20} weight="light" />
        </button>
      </Tooltip>
    </div>
  )
}
