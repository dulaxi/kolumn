import { NavLink } from 'react-router-dom'
import { Blueprint, ChatsCircle, MagnifyingGlass, UsersThree } from '@phosphor-icons/react'
import WorkspaceDropdown from './WorkspaceDropdown'
import Tooltip from '../ui/Tooltip'

const ROW_BASE = 'flex w-full items-center h-8 rounded-lg text-sm transition-colors duration-75 overflow-hidden'

function activeClasses(isActive) {
  return isActive
    ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
    : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface-raised)]'
}

function layoutClasses(collapsed) {
  return collapsed ? 'justify-center px-2' : 'gap-3 py-1.5 px-2'
}

function IconSlot({ children, badge }) {
  return (
    <span className="relative flex items-center justify-center" style={{ width: 20, height: 20 }}>
      {children}
      {badge}
    </span>
  )
}

function NavLinkRow({ to, end, icon: Icon, label, collapsed, onNavigate, badge, badgeCollapsed }) {
  return (
    <Tooltip content={collapsed ? label : undefined} placement="right">
      <NavLink
        to={to}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) => `${ROW_BASE} ${activeClasses(isActive)} ${layoutClasses(collapsed)}`}
      >
        {({ isActive }) => (
          <>
            <IconSlot badge={collapsed ? badgeCollapsed : null}>
              <Icon className="w-5 h-5 shrink-0" weight={isActive ? 'fill' : 'light'} />
            </IconSlot>
            {!collapsed && (
              <>
                <span className="truncate flex-1">{label}</span>
                {badge}
              </>
            )}
          </>
        )}
      </NavLink>
    </Tooltip>
  )
}

export default function SidebarNav({
  collapsed,
  isDesktop,
  workspaceSidebarOpen,
  toggleWorkspaceSidebar,
  navigate,
  closeMobileMenu,
  invitationCount = 0,
}) {
  const invBadge = invitationCount > 0 ? (
    <span className="text-[10px] font-semibold bg-[var(--surface-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full">
      {invitationCount}
    </span>
  ) : null

  return (
    <div className="flex flex-col gap-px">
      {/* Search — fires global event, no route */}
      <Tooltip content={collapsed ? 'Search' : undefined} placement="right">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('kolumn:focus-search'))}
          className={`${ROW_BASE} ${activeClasses(false)} ${layoutClasses(collapsed)}`}
        >
          <IconSlot>
            <MagnifyingGlass size={20} weight="light" className="shrink-0" />
          </IconSlot>
          {!collapsed && <span className="truncate flex-1 text-left">Search</span>}
        </button>
      </Tooltip>

      <NavLinkRow to="/chat" end icon={ChatsCircle} label="Chats" collapsed={collapsed} onNavigate={closeMobileMenu} />
      <NavLinkRow to="/build" icon={Blueprint} label="Builder" collapsed={collapsed} onNavigate={closeMobileMenu} />
      {/* Calendar + Notes removed — see App.jsx note. */}

      {/* Workspace — desktop becomes a dropdown filter; mobile keeps a plain NavLink */}
      {isDesktop ? (
        <WorkspaceDropdown
          collapsed={collapsed}
          invitationCount={invitationCount}
          onManageClick={() => {
            if (!workspaceSidebarOpen) {
              toggleWorkspaceSidebar()
              navigate('/workspace')
            }
          }}
        />
      ) : (
        <NavLinkRow
          to="/workspace"
          icon={UsersThree}
          label="Workspace"
          collapsed={false}
          onNavigate={closeMobileMenu}
          badge={invBadge}
        />
      )}
    </div>
  )
}
