import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Check, Plus, X, Calendar, User, Flag } from 'lucide-react'
import { FileText, CalendarDot, CheckSquare } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useWorkspacesStore } from '../../store/workspacesStore'
import { supabase } from '../../lib/supabase'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import { PRIORITY_OPTIONS } from '../../constants/colors'
import { getAvatarColor, getAvatarTextColor, getInitials } from '../../utils/formatting'
import { format, isPast, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'

/**
 * InlineCardEditor — matches the new Card.jsx layout 1:1.
 * Every visual element is the same, but each is editable:
 *   - Icon container → click opens IconPicker
 *   - Title → inline input inside the title row
 *   - Check circle → priority color, click cycles priority
 *   - Labels row → /label chips + inline add
 *   - Bottom row → date pill, checklist, assignee avatar (all clickable)
 *   - Description textarea appears inline when focused
 */
export default function InlineCardEditor({ cardId: rawCardId, onDone }) {
  const resolvedId = useBoardStore((s) => s._tempIdMap?.[rawCardId] || rawCardId)
  const card = useBoardStore((s) => s.cards[s._tempIdMap?.[rawCardId] || rawCardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const profile = useAuthStore((s) => s.profile)

  const [title, setTitle] = useState(() => card?.title === 'Untitled task' ? '' : (card?.title || ''))
  const [assignees, setAssignees] = useState(() => {
    if (card?.assignees?.length) return card.assignees
    return card?.assignee_name ? [card.assignee_name] : []
  })
  const [priority, setPriority] = useState(() => card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(() => card?.due_date || '')
  const [labels, setLabels] = useState(() => card?.labels ? [...card.labels] : [])
  const [description, setDescription] = useState(() => card?.description || '')
  const [checklist, setChecklist] = useState(() => card?.checklist ? [...card.checklist] : [])

  const [openMenu, setOpenMenu] = useState(null) // 'icon' | 'priority' | 'date' | 'label' | 'assignee' | null
  const [showDescription, setShowDescription] = useState(() => !!card?.description)
  const [newLabelText, setNewLabelText] = useState('')
  const [boardMemberNames, setBoardMemberNames] = useState([])
  const [assigneeSearch, setAssigneeSearch] = useState('')

  // Resolve whether this card's board is scoped to a workspace
  const board = useBoardStore((s) => (card && s.boards ? s.boards[card.board_id] : null))
  const workspaceId = board?.workspace_id || null
  const workspaceMembers = useWorkspacesStore((s) => (workspaceId ? s.members[workspaceId] : null))

  // Fetch assignee list — workspace members when board belongs to a workspace,
  // otherwise fall back to board_members.
  useEffect(() => {
    if (!card) return
    let cancelled = false

    if (workspaceId) {
      useWorkspacesStore.getState().fetchMembers(workspaceId)
      return () => { cancelled = true }
    }

    // Two-step fetch: board_members → profiles. PostgREST can't auto-embed
    // profiles here because board_members.user_id FKs to auth.users, not
    // profiles directly — so the old nested-select returned null and the
    // picker silently showed no one.
    ;(async () => {
      const { data: rows, error } = await supabase
        .from('board_members')
        .select('user_id')
        .eq('board_id', card.board_id)
      if (cancelled || error || !rows?.length) {
        if (!cancelled && !error) setBoardMemberNames([])
        return
      }
      const userIds = rows.map((r) => r.user_id)
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)
      if (cancelled || pErr) return
      setBoardMemberNames((profiles || []).map((p) => p.display_name).filter(Boolean))
    })()
    return () => { cancelled = true }
  }, [card?.board_id, workspaceId])

  // Mirror workspacesStore.members into boardMemberNames for workspace boards
  useEffect(() => {
    if (!workspaceId) return
    const names = (workspaceMembers || []).map((m) => m.display_name).filter(Boolean)
    setBoardMemberNames(names)
  }, [workspaceId, workspaceMembers])

  const titleRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (titleRef.current) titleRef.current.focus()
  }, [])

  // Close menus on outside click — save pending label if any
  useEffect(() => {
    if (!openMenu) return
    const handler = (e) => {
      // Ignore clicks inside portaled pickers (icon picker, etc)
      if (e.target.closest('[data-icon-picker]')) return
      if (!e.target.closest('[data-menu-root]')) {
        if (openMenu === 'label') {
          const trimmed = newLabelText.trim()
          if (trimmed) {
            setLabels((prev) => [...prev, { text: trimmed, color: 'gray' }])
            setNewLabelText('')
          }
        }
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu, newLabelText])

  if (!card) return null

  const priOption = PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1]
  const priColor = priority === 'high' ? '#C27A4A' : priority === 'low' ? '#A8BA32' : '#D4A843'

  const handleSave = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) { onDone(); return }
    updateCard(resolvedId, {
      title: trimmedTitle,
      assignees,
      priority,
      due_date: dueDate || null,
      labels,
      description: description.trim(),
      checklist,
    })
    onDone()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleSave()
    }
  }

  const addLabel = () => {
    const trimmed = newLabelText.trim()
    if (trimmed) {
      setLabels((prev) => [...prev, { text: trimmed, color: 'gray' }])
      setNewLabelText('')
    }
  }

  const dueDateObj = dueDate ? parseISO(dueDate) : null
  const hasLabels = labels.length > 0
  const hasChecklist = checklist.length > 0
  const hasAssignee = assignees.length > 0

  return (
    <div
      ref={rootRef}
      onKeyDown={handleKeyDown}
      className="w-full flex flex-col gap-3 rounded-2xl border border-[var(--text-muted)] p-4 text-left bg-[var(--surface-page)] transition-all"
    >
      {/* Top row: icon + title + check (priority) */}
      <div className="flex items-center gap-3">
        {/* Icon — click to open picker */}
        <div className="relative" data-menu-root>
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'icon' ? null : 'icon')}
            className="flex w-10 h-10 shrink-0 items-center justify-center rounded-lg border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--color-mist)] transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {card.icon ? (
                <DynamicIcon name={card.icon} className="w-5 h-5 text-[var(--text-primary)]" />
              ) : (
                <FileText size={20} weight="regular" className="text-[var(--text-muted)]" />
              )}
            </div>
          </button>
          {openMenu === 'icon' && (
            <IconPicker
              value={card.icon}
              onChange={(icon) => { updateCard(resolvedId, { icon }); setOpenMenu(null) }}
              onClose={() => setOpenMenu(null)}
            />
          )}
        </div>

        {/* Title + labels */}
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name..."
              className="flex-1 text-sm font-medium text-[var(--text-primary)] bg-transparent border-none focus:outline-none placeholder-[var(--text-faint)]"
            />
            {/* Priority check circle — cycles priority on click */}
            <div className="relative shrink-0" data-menu-root>
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'priority' ? null : 'priority')}
                aria-label="Set priority"
                title={`Priority: ${priOption.label}`}
              >
                <CheckCircle2 className="w-4 h-4 transition-colors" style={{ color: priColor }} />
              </button>
              {openMenu === 'priority' && (
                <div className="absolute right-0 top-full mt-1 p-1.5 bg-[var(--surface-card)] border-0.5 border-[var(--color-mist)] backdrop-blur-xl rounded-xl min-w-[8rem] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] z-50">
                  {[
                    { value: 'low', label: 'Low', color: '#A8BA32' },
                    { value: 'medium', label: 'Medium', color: '#D4A843' },
                    { value: 'high', label: 'High', color: '#C27A4A' },
                  ].map((opt) => (
                    <div
                      key={opt.value}
                      role="menuitem"
                      onClick={() => { setPriority(opt.value); setOpenMenu(null) }}
                      className="min-h-7 px-2 py-1 rounded-lg cursor-pointer text-xs flex items-center gap-2 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                    >
                      <Flag className="w-3.5 h-3.5 shrink-0" fill={opt.color} style={{ color: opt.color }} />
                      <span className="flex-1 truncate">{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Labels inline — /label chips */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] flex-wrap">
            {labels.map((label, idx) => (
              <span
                key={`${label.text}-${idx}`}
                className="relative inline-flex items-center group/label"
              >
                <span className="font-medium text-[var(--text-secondary)] lowercase">/{label.text}</span>
                <button
                  type="button"
                  onClick={() => setLabels(labels.filter((_, i) => i !== idx))}
                  className="ml-0.5 opacity-0 group-hover/label:opacity-100 text-[var(--text-faint)] hover:text-[#7A5C44] transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {openMenu === 'label' ? (
              <input
                value={newLabelText}
                onChange={(e) => setNewLabelText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    addLabel()
                    // stay open for next label
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    e.stopPropagation()
                    setNewLabelText('')
                    setOpenMenu(null)
                  }
                }}
                onBlur={() => {
                  // save current, then close
                  addLabel()
                  setOpenMenu(null)
                }}
                placeholder="/label"
                autoFocus
                data-menu-root
                className="text-xs text-[var(--text-secondary)] lowercase bg-transparent border-none focus:outline-none w-20 placeholder-[var(--text-faint)]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setOpenMenu('label')}
                className="text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
                data-menu-root
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description — expanded textarea or hint */}
      {showDescription ? (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          rows={2}
          autoFocus
          className="w-full text-xs text-[var(--text-muted)] leading-relaxed bg-transparent border-none focus:outline-none resize-none placeholder-[var(--text-faint)]"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowDescription(true)}
          className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors text-left"
        >
          + Add description
        </button>
      )}

      {/* Bottom row: date pill / checklist / assignee */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          {/* Date */}
          <div className="relative" data-menu-root>
            {dueDateObj ? (
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'date' ? null : 'date')}
                className={`font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                  isYesterday(dueDateObj) || (isPast(dueDateObj) && !isToday(dueDateObj))
                    ? 'bg-[#F2D9C7] text-[#C27A4A]'
                    : isToday(dueDateObj)
                    ? 'bg-[#F5EDCF] text-[#D4A843]'
                    : isTomorrow(dueDateObj)
                    ? 'bg-[#EEF2D6] text-[#A8BA32]'
                    : 'bg-[#EEF2D6] text-[#A8BA32]'
                }`}
              >
                <CalendarDot size={12} weight="bold" />
                {isToday(dueDateObj) ? 'Today' : isYesterday(dueDateObj) ? 'Yesterday' : isTomorrow(dueDateObj) ? 'Tomorrow' : format(dueDateObj, 'MMM d')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'date' ? null : 'date')}
                className="flex items-center gap-1 text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors text-[10px]"
              >
                <CalendarDot size={12} weight="bold" />
                Date
              </button>
            )}
            {openMenu === 'date' && (
              <div className="absolute left-0 top-full mt-1 p-2 bg-[var(--surface-card)] border-0.5 border-[var(--color-mist)] backdrop-blur-xl rounded-xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] z-50 flex flex-col gap-1">
                <input
                  type="date"
                  value={dueDate ? dueDate.split('T')[0] : ''}
                  onChange={(e) => {
                    setDueDate(e.target.value ? `${e.target.value}T23:59:59` : '')
                    setOpenMenu(null)
                  }}
                  autoFocus
                  className="text-sm text-[var(--text-primary)] bg-transparent border border-[var(--border-default)] rounded-lg px-2 py-1.5 focus:border-[var(--border-focus)] focus:outline-none"
                />
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => { setDueDate(''); setOpenMenu(null) }}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[#7A5C44] transition-colors self-start"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Checklist counter — only show if items */}
          {hasChecklist && (
            <span className="font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-hover)] text-[var(--text-muted)]">
              <CheckSquare size={12} weight="bold" />
              {checklist.filter((i) => i.done).length}/{checklist.length}
            </span>
          )}
        </div>

        {/* Assignees — multi-select with stacked avatars */}
        <div className="relative" data-menu-root>
          {(() => {
            const lightColors = ['bg-[#8E8E89]', 'bg-[#E0DBD5]', 'bg-[#E8E2DB]', 'bg-[#C2D64A]', 'bg-[#A8BA32]', 'bg-[#D4A843]', 'bg-[#C27A4A]']
            const isMeName = (n) => profile?.display_name && n.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
            const iconText = lightColors.includes(profile?.color) ? 'text-[#1B1B18]' : 'text-white'
            const maxVisible = 3
            const visible = assignees.slice(0, maxVisible)
            const overflow = Math.max(0, assignees.length - maxVisible)

            const toggleAssignee = (name) => {
              setAssignees((prev) => (
                prev.some((a) => a.toLowerCase() === name.toLowerCase())
                  ? prev.filter((a) => a.toLowerCase() !== name.toLowerCase())
                  : [...prev, name]
              ))
            }

            const openPicker = () => {
              setOpenMenu(openMenu === 'assignee' ? null : 'assignee')
              setAssigneeSearch('')
            }

            return (
              <>
                <button
                  type="button"
                  onClick={openPicker}
                  className="flex items-center cursor-pointer"
                  title={assignees.length === 0 ? 'Assign' : assignees.join(', ')}
                >
                  {assignees.length === 0 ? (
                    <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-[var(--surface-hover)] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors">
                      <User className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="flex -space-x-1.5">
                      {visible.map((name) => {
                        const isMe = isMeName(name)
                        return (
                          <span
                            key={name}
                            className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ring-2 ring-[var(--surface-page)] ${
                              isMe && profile?.icon
                                ? `${iconText} ${profile.color}`
                                : `${getAvatarColor(name)} ${getAvatarTextColor(getAvatarColor(name))} text-[9px] font-heading`
                            }`}
                          >
                            {isMe && profile?.icon ? <DynamicIcon name={profile.icon} className="w-3 h-3" /> : getInitials(name).toLowerCase()}
                          </span>
                        )
                      })}
                      {overflow > 0 && (
                        <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center ring-2 ring-[var(--surface-page)] bg-[var(--surface-hover)] text-[9px] font-medium text-[var(--text-secondary)]">
                          +{overflow}
                        </span>
                      )}
                    </span>
                  )}
                </button>
                {openMenu === 'assignee' && (
                  <div className="absolute right-0 bottom-full mb-2 p-1.5 bg-[var(--surface-card)] border-0.5 border-[var(--color-mist)] backdrop-blur-xl rounded-xl min-w-[14rem] text-[var(--text-primary)] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] z-50 overflow-hidden">
                    <div className="px-1.5 pb-1.5">
                      <input
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            e.stopPropagation()
                            const name = assigneeSearch.trim()
                            if (!name) return
                            if (!assignees.some((a) => a.toLowerCase() === name.toLowerCase())) {
                              toggleAssignee(name)
                            }
                            setAssigneeSearch('')
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            e.stopPropagation()
                            setOpenMenu(null)
                          }
                        }}
                        autoFocus
                        placeholder="Search or type name..."
                        className="w-full text-sm rounded-lg px-2 py-1.5 border border-[var(--border-default)] hover:border-[var(--color-mist)] focus:border-[var(--border-focus)] focus:outline-none placeholder-[var(--text-faint)]"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {/* External (free-text) names already selected */}
                      {assignees
                        .filter((a) => !boardMemberNames.some((m) => m.toLowerCase() === a.toLowerCase()))
                        .filter((a) => !assigneeSearch.trim() || a.toLowerCase().includes(assigneeSearch.trim().toLowerCase()))
                        .map((name) => (
                          <div
                            key={`ext-${name}`}
                            role="menuitem"
                            onClick={() => toggleAssignee(name)}
                            className="min-h-7 px-2 py-1 rounded-lg cursor-pointer grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs bg-[var(--surface-hover)] font-medium"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-heading ${getAvatarColor(name)} ${getAvatarTextColor(getAvatarColor(name))}`}>
                                {getInitials(name).toLowerCase()}
                              </span>
                              <span className="flex-1 truncate">{name}</span>
                            </div>
                            <Check className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          </div>
                        ))}
                      {/* Board / workspace members */}
                      {boardMemberNames
                        .filter((m) => !assigneeSearch.trim() || m.toLowerCase().includes(assigneeSearch.trim().toLowerCase()))
                        .map((member) => {
                          const checked = assignees.some((a) => a.toLowerCase() === member.toLowerCase())
                          return (
                            <div
                              key={member}
                              role="menuitem"
                              onClick={() => toggleAssignee(member)}
                              className={`min-h-7 px-2 py-1 rounded-lg cursor-pointer grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs ${checked ? 'bg-[var(--surface-hover)] font-medium' : ''}`}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-heading ${getAvatarColor(member)} ${getAvatarTextColor(getAvatarColor(member))}`}>
                                  {getInitials(member).toLowerCase()}
                                </span>
                                <span className="flex-1 truncate">{member}</span>
                              </div>
                              {checked && <Check className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                            </div>
                          )
                        })}
                      {/* Free-text add when search doesn't match anyone */}
                      {assigneeSearch.trim() &&
                        !boardMemberNames.some((m) => m.toLowerCase() === assigneeSearch.trim().toLowerCase()) &&
                        !assignees.some((a) => a.toLowerCase() === assigneeSearch.trim().toLowerCase()) && (
                          <>
                            <div role="separator" className="h-[0.5px] bg-[var(--border-subtle)] my-1.5 mx-2" />
                            <div
                              role="menuitem"
                              onClick={() => { toggleAssignee(assigneeSearch.trim()); setAssigneeSearch('') }}
                              className="min-h-7 px-2 py-1 rounded-lg cursor-pointer grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)]"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Plus className="w-3.5 h-3.5" />
                                </div>
                                <span className="flex-1 truncate">Add "{assigneeSearch.trim()}"</span>
                              </div>
                            </div>
                          </>
                        )}
                      {/* Clear all */}
                      {assignees.length > 0 && (
                        <>
                          <div role="separator" className="h-[0.5px] bg-[var(--border-subtle)] my-1.5 mx-2" />
                          <div
                            role="menuitem"
                            onClick={() => setAssignees([])}
                            className="min-h-7 px-2 py-1 rounded-lg cursor-pointer grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs text-[var(--text-muted)]"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X className="w-3.5 h-3.5" />
                              </div>
                              <span className="flex-1 truncate">Clear all</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => { deleteCard(resolvedId); onDone() }}
          className="text-[11px] text-[var(--text-muted)] hover:text-[#7A5C44] px-2 py-1 rounded-lg transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="text-[11px] font-medium text-white bg-[var(--text-primary)] hover:opacity-90 px-3 py-1 rounded-lg transition-opacity"
        >
          Save
        </button>
      </div>
    </div>
  )
}
