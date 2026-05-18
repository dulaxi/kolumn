import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CaretDown, Check, Cube, CubeFocus, MagnifyingGlass, Plus, UsersThree } from '@phosphor-icons/react'

import { useWorkspacesStore } from '../../store/workspacesStore'
import { resolveWorkspaceColor } from '../../constants/colors'
import WorkspaceCreateModal from '../workspace/WorkspaceCreateModal'

// Panel exit animation duration (matches @keyframes dropdownOut in index.css)
const EXIT_MS = 120

const ROW_BASE = 'flex items-center h-8 rounded-lg text-sm transition-colors duration-75 overflow-hidden'

// All workspaces render with the Cube glyph; identity is via color.
// resolveWorkspaceColor handles both new (color-name) and legacy
// (Phosphor-icon-name → hash fallback) `workspace.icon` values.
function WorkspaceGlyph({ workspace }) {
  return (
    <Cube
      className="w-5 h-5"
      weight="fill"
      style={{ color: resolveWorkspaceColor(workspace) }}
    />
  )
}

/**
 * WorkspaceDropdown — replaces the legacy Workspace nav row in the sidebar.
 *
 * - Trigger: looks like a nav row (icon + name + chevron-down). The name
 *   reflects the currently-active workspace, or "Personal" if null.
 * - Panel: search input on top, scrollable list of options (All + each
 *   workspace), "Manage workspaces" link at the bottom to access the
 *   sub-sidebar (members, invitations, settings).
 * - Selection: writes activeWorkspaceId to workspacesStore. Sidebar.jsx
 *   reads that value and filters the boards lists accordingly.
 *
 * Collapsed mode: shows the workspace glyph only, no name/chevron. Clicking
 * still opens the dropdown.
 */
export default function WorkspaceDropdown({
  collapsed,
  onManageClick,
  invitationCount = 0,
}) {
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const inputRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const workspaces = useWorkspacesStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspacesStore((s) => s.activeWorkspaceId)
  const setActiveWorkspace = useWorkspacesStore((s) => s.setActiveWorkspace)

  // ── Position panel relative to trigger (fixed-positioned, portaled) ──
  useEffect(() => {
    if (!open) return
    const compute = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      // bottom-start placement: panel sits below trigger, left-aligned with it
      setPosition({ top: rect.bottom + 4, left: rect.left })
    }
    compute()
    // capture=true so nested scroll containers (e.g. the sidebar nav) bubble
    window.addEventListener('scroll', compute, true)
    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('scroll', compute, true)
      window.removeEventListener('resize', compute)
    }
  }, [open])

  // ── Mount/unmount with exit animation ──
  useEffect(() => {
    if (open) { setRendered(true); setExiting(false); return }
    if (!rendered) return
    setExiting(true)
    const t = setTimeout(() => { setRendered(false); setExiting(false) }, EXIT_MS)
    return () => clearTimeout(t)
  }, [open, rendered])

  // ── Outside-click (both trigger and portaled panel count as "inside") ──
  useEffect(() => {
    if (!open) return
    const onMouseDown = (e) => {
      const t = e.target
      if (triggerRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // ── Escape closes ──
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const workspaceList = useMemo(() => Object.values(workspaces), [workspaces])
  // activeWorkspaceId encoding: null = All workspaces (aggregate, default),
  // 'personal' = Personal (virtual; only owned + shared boards), UUID = real workspace.
  const isAll = activeWorkspaceId === null
  const isPersonal = activeWorkspaceId === 'personal'
  const activeWorkspace = !isAll && !isPersonal ? workspaces[activeWorkspaceId] : null

  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return workspaceList
    return workspaceList.filter((w) => w.name?.toLowerCase().includes(q))
  }, [workspaceList, q])
  const personalMatchesSearch = !q || 'personal'.includes(q)

  const handlePick = (id) => {
    setActiveWorkspace(id)
    setOpen(false)
    setSearch('')
  }

  const handleOpenChange = (next) => {
    setOpen(next)
    if (next) {
      setSearch('')
      // Focus the search input on open. Run on next tick so the input is mounted.
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const triggerLabel = isAll
    ? 'All workspaces'
    : isPersonal
      ? 'Personal'
      : activeWorkspace?.name || 'All workspaces'
  const triggerGlyph = isAll
    ? <CubeFocus className="w-5 h-5" weight="light" />
    : isPersonal
      ? <Cube className="w-5 h-5" weight="light" />
      : activeWorkspace
        ? <WorkspaceGlyph workspace={activeWorkspace} />
        : <CubeFocus className="w-5 h-5" weight="light" />

  // ── Panel content ──────────────────────────────────────────────
  const panel = (
    <div className="flex flex-col max-h-[24rem]">
      {/* Search */}
      <div className="shrink-0 p-1.5">
        <div className="flex items-center gap-2 h-8 px-2 rounded-md bg-[var(--surface-raised)]">
          <MagnifyingGlass className="w-4 h-4 text-[var(--text-muted)] shrink-0" weight="light" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workspaces…"
            className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder-[var(--text-muted)] text-[var(--text-primary)]"
          />
        </div>
      </div>

      {/* List — scrollable when long */}
      <div className="flex-1 min-h-0 overflow-y-auto p-1.5 pt-0">
        {/* "All workspaces" — aggregate view, default. Only shown when not searching
            (it isn't a workspace and shouldn't compete in name search). */}
        {!q && (
          <button
            type="button"
            onClick={() => handlePick(null)}
            className={`${ROW_BASE} w-full px-2 gap-2 text-left ${
              isAll
                ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
              <CubeFocus className="w-5 h-5" weight="light" />
            </span>
            <span className="truncate flex-1">All workspaces</span>
            {isAll && (
              <Check className="w-4 h-4 text-[var(--color-lime-dark)] shrink-0" weight="bold" />
            )}
          </button>
        )}

        {/* "Personal" — virtual workspace, leads the workspace list. */}
        {personalMatchesSearch && (
          <button
            type="button"
            onClick={() => handlePick('personal')}
            className={`${ROW_BASE} w-full px-2 gap-2 text-left ${
              isPersonal
                ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
              <Cube className="w-5 h-5" weight="light" />
            </span>
            <span className="truncate flex-1">Personal</span>
            {isPersonal && (
              <Check className="w-4 h-4 text-[var(--color-lime-dark)] shrink-0" weight="bold" />
            )}
          </button>
        )}

        {/* Real workspaces */}
        {filtered.length === 0 && !personalMatchesSearch ? (
          <div className="px-2 py-2 text-xs text-[var(--text-faint)] select-none">
            {workspaceList.length === 0 ? 'No workspaces yet.' : 'No matches.'}
          </div>
        ) : filtered.length === 0 ? null : (
          filtered.map((ws) => {
            const selected = ws.id === activeWorkspaceId
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => handlePick(ws.id)}
                className={`${ROW_BASE} w-full px-2 gap-2 text-left ${
                  selected
                    ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                }`}
              >
                <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
                  <WorkspaceGlyph workspace={ws} />
                </span>
                <span className="truncate flex-1">{ws.name}</span>
                {selected && (
                  <Check className="w-4 h-4 text-[var(--color-lime-dark)] shrink-0" weight="bold" />
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Bottom actions — Manage opens the sub-sidebar, Create opens the modal */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] p-1">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onManageClick?.()
          }}
          className={`${ROW_BASE} w-full px-2 gap-2 text-left text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]`}
        >
          <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
            <UsersThree className="w-5 h-5" weight="light" />
          </span>
          <span className="truncate flex-1">Manage workspaces</span>
          {invitationCount > 0 && (
            <span className="text-[10px] font-semibold bg-[var(--surface-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full shrink-0">
              {invitationCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setCreateOpen(true)
          }}
          className={`${ROW_BASE} w-full px-2 gap-2 text-left text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]`}
        >
          <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
            <Plus className="w-5 h-5" weight="light" />
          </span>
          <span className="truncate flex-1">Create workspace</span>
        </button>
      </div>
    </div>
  )

  // ── Trigger + portaled panel ──────────────────────────────────
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => handleOpenChange(!open)}
        title={collapsed ? triggerLabel : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${ROW_BASE} w-full ${
          collapsed ? 'justify-center px-2' : 'gap-3 py-1.5 px-2'
        } text-[var(--text-primary)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface-raised)]`}
      >
        <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
          {triggerGlyph}
        </span>
        {!collapsed && (
          <>
            <span className="truncate flex-1 text-left">{triggerLabel}</span>
            {invitationCount > 0 && (
              <span className="text-[10px] font-semibold bg-[var(--surface-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full shrink-0">
                {invitationCount}
              </span>
            )}
            <CaretDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" weight="bold" />
          </>
        )}
      </button>

      {/* Portaled panel: escapes the sidebar's overflow:auto clipping so the
          dropdown can overlay the main content area. position:fixed +
          triggerRect-anchored. */}
      {rendered && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Select workspace"
          style={{ position: 'fixed', top: position.top, left: position.left }}
          className={`z-50 w-[18rem] bg-[var(--surface-card)] border border-[var(--color-mist)] rounded-[10px] shadow-[0_10px_30px_rgba(27,27,24,0.10),0_2px_6px_rgba(27,27,24,0.04)] ${
            exiting ? 'animate-dropdown-out pointer-events-none' : 'animate-dropdown'
          } origin-top-left`}
        >
          {panel}
        </div>,
        document.body,
      )}

      <WorkspaceCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
