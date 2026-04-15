import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { X, Plus, Check, User, ArrowLeft, MoreVertical, Trash2, Copy, Bookmark, Calendar, CheckCircle2, Flag, Paperclip, Upload, FileIcon, Image as ImageIcon, Download } from 'lucide-react'
import { LABEL_COLORS, COLOR_DOT_CLASSES } from '../../constants/colors'
import { FileText } from '@phosphor-icons/react'
import DynamicIcon from './DynamicIcon'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useWorkspacesStore } from '../../store/workspacesStore'
import { supabase } from '../../lib/supabase'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useClickOutside } from '../../hooks/useClickOutside'
import IconPicker from './IconPicker'
import { getAvatarColor, getInitials } from '../../utils/formatting'
import { showToast } from '../../utils/toast'
import { useTemplateStore } from '../../store/templateStore'

function ChecklistItem({ item, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)
  return (
    <div className="flex items-center gap-2 py-1 group/check">
      <button type="button" onClick={onToggle} className="shrink-0">
        <CheckCircle2 className={`w-4 h-4 transition-colors ${item.done ? 'text-[var(--accent-lime-dark)]' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'}`} />
      </button>
      {editing ? (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onEdit(text.trim() || item.text); setEditing(false) }
            else if (e.key === 'Escape') { setText(item.text); setEditing(false) }
          }}
          onBlur={() => { onEdit(text.trim() || item.text); setEditing(false) }}
          autoFocus
          className="text-sm text-[var(--text-secondary)] bg-transparent focus:outline-none border border-[var(--border-default)] rounded-xl px-1 -mx-1"
        />
      ) : (
        <span
          className={`text-sm cursor-pointer ${item.done ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text-secondary)]'}`}
          onClick={() => setEditing(true)}
        >
          {item.text}
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover/check:opacity-100 text-[var(--text-faint)] hover:text-[#7A5C44] transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

export default memo(function CardDetailPanel({ cardId, onClose }) {
  const card = useBoardStore((s) => s.cards[cardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const duplicateCard = useBoardStore((s) => s.duplicateCard)
  const addTemplate = useTemplateStore((s) => s.addTemplate)
  const boardName = useBoardStore((s) => s.boards[s.cards[cardId]?.board_id]?.name || '—')
  const statusName = useBoardStore((s) => s.columns[s.cards[cardId]?.column_id]?.title || '—')
  const attachmentItems = useBoardStore((s) => s.attachments[cardId])
  const fetchAttachments = useBoardStore((s) => s.fetchAttachments)
  const uploadAttachment = useBoardStore((s) => s.uploadAttachment)
  const deleteAttachment = useBoardStore((s) => s.deleteAttachment)
  const getAttachmentUrl = useBoardStore((s) => s.getAttachmentUrl)
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const isMobile = useIsMobile()

  const [title, setTitle] = useState(card?.title || '')
  const [description, setDescription] = useState(card?.description || '')
  const [editingDescription, setEditingDescription] = useState(false)
  const [checklist, setChecklist] = useState(card?.checklist ? card.checklist.map((item) => ({ ...item })) : [])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [priority, setPriority] = useState(card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(card?.due_date || '')
  // Single openMenu value: 'menu' | 'priority' | 'due' | 'assignee' | 'icon' | null
  const [openMenu, setOpenMenu] = useState(null)
  const toggleMenu = (name) => setOpenMenu((cur) => cur === name ? null : name)

  useEffect(() => {
    if (!openMenu) return
    const handler = (e) => {
      // Ignore clicks inside portaled pickers (icon picker, etc)
      if (e.target.closest('[data-icon-picker]')) return
      if (!e.target.closest('[data-menu-root]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])
  const titleRef = useRef(null)
  const [labels, setLabels] = useState(card?.labels ? [...card.labels] : [])
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [editingLabelIdx, setEditingLabelIdx] = useState(null)
  const [editingLabelText, setEditingLabelText] = useState('')
  // Multi-assignee: array of display names. Falls back to legacy single
  // assignee_name for cards not yet migrated / re-saved.
  const initialAssignees = card?.assignees?.length
    ? card.assignees
    : (card?.assignee_name ? [card.assignee_name] : [])
  const [assignees, setAssignees] = useState(initialAssignees)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [boardMemberNames, setBoardMemberNames] = useState([])

  const isDirtyRef = useRef(false)
  const autoSaveTimerRef = useRef(null)
  const formDataRef = useRef({ title: card?.title || '', description: card?.description || '', labels: card?.labels ? [...card.labels] : [], assignees: [...initialAssignees], dueDate: card?.due_date || '', checklist: card?.checklist ? card.checklist.map((item) => ({ ...item })) : [], priority: card?.priority || 'medium' })

  // Resolve which board this card belongs to, and whether it's scoped to a workspace
  const board = useBoardStore((s) => (card ? s.boards[card.board_id] : null))
  const workspaceId = board?.workspace_id || null
  const workspaceMembers = useWorkspacesStore((s) => (workspaceId ? s.members[workspaceId] : null))

  useEffect(() => {
    if (!card) return
    let cancelled = false

    if (workspaceId) {
      // Workspace board → source assignee list from workspace_members (whole team)
      useWorkspacesStore.getState().fetchMembers(workspaceId)
    } else {
      // Personal board → fetch board_members then profiles in two steps.
      // The old single-query `profiles(...)` embed returned null because
      // board_members.user_id FKs to auth.users (not profiles), so PostgREST
      // can't auto-resolve the join — same problem the workspace fetch had.
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
    }
    fetchAttachments(cardId)
    return () => { cancelled = true }
  }, [cardId, workspaceId])

  // When on a workspace board, keep the picker list mirrored from workspacesStore.members
  useEffect(() => {
    if (!workspaceId) return
    const names = (workspaceMembers || []).map((m) => m.display_name).filter(Boolean)
    setBoardMemberNames(names)
  }, [workspaceId, workspaceMembers])

  const scheduleSave = useCallback(() => {
    isDirtyRef.current = true
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      if (cardId && formDataRef.current) {
        const d = formDataRef.current
        useBoardStore.getState().updateCard(cardId, {
          title: d.title.trim() || card?.title || 'Untitled task',
          description: d.description,
          labels: d.labels,
          assignees: d.assignees,
          due_date: d.dueDate || null,
          checklist: d.checklist,
          priority: d.priority,
        })
        isDirtyRef.current = false
      }
    }, 1000)
  }, [cardId, card?.title])

  useEffect(() => {
    formDataRef.current = { title, description, labels, assignees, dueDate, checklist, priority }
  })

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      if (isDirtyRef.current && formDataRef.current && cardId) {
        const d = formDataRef.current
        useBoardStore.getState().updateCard(cardId, {
          title: d.title.trim() || 'Untitled task',
          description: d.description,
          labels: d.labels,
          assignees: d.assignees,
          due_date: d.dueDate || null,
          checklist: d.checklist,
          priority: d.priority,
        })
      }
    }
  }, [cardId])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (e.target.closest('[data-modal]') || e.target.closest('[data-icon-picker]')) return
        handleSaveAndClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!card) return null

  const handleSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    isDirtyRef.current = false
    updateCard(cardId, { title: title.trim() || card.title, description, labels, assignees, due_date: dueDate || null, checklist, priority })
  }

  const handleSaveAndClose = () => { handleSave(); onClose() }

  const priColor = priority === 'high' ? '#C27A4A' : priority === 'low' ? '#A8BA32' : '#D4A843'

  return (
    <div
      className="fixed inset-0 z-50 grid items-center justify-items-center bg-black/50 backdrop-brightness-75 overflow-y-auto overflow-x-hidden md:p-10 p-4"
      onClick={handleSaveAndClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col text-left shadow-xl border-0.5 border-[var(--border-default)] rounded-2xl md:p-6 p-4 bg-[var(--surface-page)] w-full max-w-3xl min-h-[50vh] max-h-[90vh] overflow-hidden"
      >
        {/* Top bar — back + actions */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            All cards
          </button>
          <div className="flex items-center gap-1 ml-auto">
            {/* Due date */}
            <div className="relative" data-menu-root>
              {(() => {
                let dateLabel = null
                let dateColor = 'text-[var(--text-muted)]'
                if (dueDate) {
                  const d = new Date(dueDate)
                  const today = new Date()
                  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
                  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
                  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
                  if (sameDay(d, today)) { dateLabel = 'Today'; dateColor = 'text-[#D4A843]' }
                  else if (sameDay(d, tomorrow)) { dateLabel = 'Tomorrow'; dateColor = 'text-[#A8BA32]' }
                  else if (sameDay(d, yesterday)) { dateLabel = 'Yesterday'; dateColor = 'text-[#C27A4A]' }
                  else if (d < today) { dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); dateColor = 'text-[#C27A4A]' }
                  else { dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); dateColor = 'text-[var(--text-secondary)]' }
                }
                return (
                  <button
                    type="button"
                    onClick={() => toggleMenu('due')}
                    className={`h-8 rounded-md flex items-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${dueDate ? 'px-2' : 'w-8 justify-center'} ${dateColor}`}
                    title={dueDate ? `Due: ${new Date(dueDate).toLocaleDateString()}` : 'Set due date'}
                  >
                    <Calendar className="w-4 h-4" />
                    {dateLabel && <span className="text-xs font-medium">{dateLabel}</span>}
                  </button>
                )
              })()}
              {openMenu === 'due' && (
                <div className="absolute right-0 top-full mt-1 p-2 bg-[var(--surface-card)] border-0.5 border-[var(--color-mist)] backdrop-blur-xl rounded-xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] z-50">
                  <input
                    type="date"
                    value={dueDate ? dueDate.split('T')[0] : ''}
                    onChange={(e) => {
                      setDueDate(e.target.value ? `${e.target.value}T23:59:59` : '')
                      setOpenMenu(null)
                      scheduleSave()
                    }}
                    autoFocus
                    className="text-sm text-[var(--text-primary)] bg-transparent border border-[var(--border-default)] rounded-lg px-2 py-1.5 focus:border-[var(--border-focus)] focus:outline-none"
                  />
                </div>
              )}
            </div>
            {/* Attach file */}
            <label
              className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
              <input
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  for (const file of files) {
                    try {
                      await uploadAttachment(cardId, file, user?.id)
                    } catch (err) {
                      showToast.error(`Failed to upload ${file.name}`)
                    }
                  }
                  e.target.value = ''
                }}
              />
            </label>
            {/* 3-dot menu */}
            <div className="relative" data-menu-root>
              <button
                type="button"
                onClick={() => toggleMenu('menu')}
                aria-label="More options"
                className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {openMenu === 'menu' && (
                <div className="absolute right-0 top-full mt-1 p-1.5 bg-[var(--surface-card)] border-0.5 border-[var(--color-mist)] backdrop-blur-xl rounded-xl min-w-[8rem] text-[var(--text-primary)] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] z-50">
                  <div role="menuitem" onClick={() => { duplicateCard(cardId); showToast.success('Duplicated'); setOpenMenu(null) }} className="min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs">
                    <div className="flex items-center gap-2 w-full"><div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Copy className="w-4 h-4 shrink-0" /></div><span className="flex-1 truncate">Duplicate</span></div>
                  </div>
                  <div role="menuitem" onClick={() => { addTemplate({ name: card.title, title: card.title, description: card.description || '', priority: card.priority || 'medium', labels: card.labels || [], checklist: (card.checklist || []).map((item) => ({ text: item.text, done: false })) }); showToast.success('Saved as template'); setOpenMenu(null) }} className="min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs">
                    <div className="flex items-center gap-2 w-full"><div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bookmark className="w-4 h-4 shrink-0" /></div><span className="flex-1 truncate">Template</span></div>
                  </div>
                  <div role="separator" className="h-[0.5px] bg-[var(--border-subtle)] my-1.5 mx-2" />
                  <div role="menuitem" onClick={() => { deleteCard(cardId); onClose(); setOpenMenu(null) }} className="min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[#7A5C44]/10 text-[#7A5C44] text-xs">
                    <div className="flex items-center gap-2 w-full"><div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 className="w-4 h-4 shrink-0" /></div><span className="flex-1 truncate">Delete</span></div>
                  </div>
                </div>
              )}
            </div>
            {/* Priority flag */}
            <div className="relative" data-menu-root>
              <button
                type="button"
                onClick={() => toggleMenu('priority')}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <Flag className="w-4 h-4" fill={priColor} style={{ color: priColor }} />
              </button>
              {openMenu === 'priority' && (
                <div className="absolute right-0 top-full mt-1 p-1.5 bg-[var(--surface-card)] border-0.5 border-[var(--color-mist)] backdrop-blur-xl rounded-xl min-w-[8rem] text-[var(--text-primary)] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] z-50">
                  {[
                    { value: 'low', label: 'Low', color: '#A8BA32' },
                    { value: 'medium', label: 'Medium', color: '#D4A843' },
                    { value: 'high', label: 'High', color: '#C27A4A' },
                  ].map((opt) => (
                    <div key={opt.value} role="menuitem" onClick={() => { setPriority(opt.value); setOpenMenu(null); scheduleSave() }} className="min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs">
                      <div className="flex items-center gap-2 w-full"><Flag className="w-3.5 h-3.5 shrink-0" fill={opt.color} style={{ color: opt.color }} /><span className="flex-1 truncate">{opt.label}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Icon + Title + Labels + Assignee */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="relative" data-menu-root>
              <button
                type="button"
                onClick={() => toggleMenu('icon')}
                className="flex w-10 h-10 shrink-0 items-center justify-center rounded-lg border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--color-mist)] transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  {card.icon ? <DynamicIcon name={card.icon} className="w-5 h-5 text-[var(--text-primary)]" /> : <FileText size={20} weight="regular" className="text-[var(--text-muted)]" />}
                </div>
              </button>
              {openMenu === 'icon' && (
                <IconPicker value={card.icon} onChange={(icon) => { updateCard(cardId, { icon }); setOpenMenu(null) }} onClose={() => setOpenMenu(null)} />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap min-w-0 flex-1">
              <span
                ref={titleRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setTitle(e.currentTarget.textContent || '')}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
                onBlur={() => scheduleSave()}
                className="font-heading text-[var(--text-primary)] text-left text-[22px] cursor-text focus:outline-none focus:ring-0 border border-transparent focus:border-[var(--border-default)] rounded-xl px-1 -mx-1"
              >
                {card?.title || 'Untitled task'}
              </span>
              {/* Labels */}
              {labels.map((label, idx) => (
                editingLabelIdx === idx ? (
                  <span key={`${label.text}-${label.color}-edit`} className="relative inline-flex items-center align-middle leading-tight flex-shrink-0 bg-[var(--surface-hover)] text-[var(--text-secondary)] h-6 rounded-lg text-xs lowercase border border-[var(--border-default)]">
                    <span className="invisible px-2">/{editingLabelText || label.text}</span>
                    <input value={editingLabelText} onChange={(e) => setEditingLabelText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { const t = editingLabelText.trim(); if (t) { setLabels(labels.map((l, i) => i === idx ? { ...l, text: t } : l)); scheduleSave() }; setEditingLabelIdx(null) } else if (e.key === 'Escape') { setEditingLabelIdx(null) } }}
                      onBlur={() => { const t = editingLabelText.trim(); if (t) { setLabels(labels.map((l, i) => i === idx ? { ...l, text: t } : l)); scheduleSave() }; setEditingLabelIdx(null) }}
                      autoFocus className="absolute inset-0 h-full bg-transparent text-xs text-[var(--text-secondary)] px-2 rounded-lg focus:outline-none lowercase" style={{ width: '100%' }} />
                  </span>
                ) : (
                  <span key={`${label.text}-${label.color}`} className="relative inline-flex items-center align-middle leading-tight flex-shrink-0 bg-[var(--surface-hover)] text-[var(--text-secondary)] h-6 px-2 rounded-lg text-xs lowercase group/label cursor-pointer" onClick={() => { setEditingLabelIdx(idx); setEditingLabelText(label.text) }}>
                    /{label.text}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setLabels(labels.filter((_, i) => i !== idx)); scheduleSave() }} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--surface-card)] border-0.5 border-[var(--border-default)] flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] opacity-0 group-hover/label:opacity-100 transition-all">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )
              ))}
              {showLabelForm ? (
                <span className="inline-flex items-center align-middle leading-tight flex-shrink-0 bg-[var(--surface-hover)] text-[var(--text-secondary)] h-6 rounded-lg text-xs lowercase border border-[var(--border-default)]">
                  <input value={newLabelText} onChange={(e) => setNewLabelText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { const t = newLabelText.trim(); if (t) { setLabels([...labels, { text: t, color: newLabelColor }]); setNewLabelText(''); setShowLabelForm(false); scheduleSave() } } else if (e.key === 'Escape') { setShowLabelForm(false); setNewLabelText('') } }}
                    onBlur={() => { const t = newLabelText.trim(); if (t) { setLabels([...labels, { text: t, color: newLabelColor }]); setNewLabelText(''); scheduleSave() }; setShowLabelForm(false) }}
                    autoFocus placeholder="/label" className="h-full bg-transparent text-xs text-[var(--text-secondary)] px-2 rounded-lg focus:outline-none lowercase w-16" />
                </span>
              ) : (
                <button type="button" onClick={() => setShowLabelForm(true)} className="inline-flex items-center justify-center flex-shrink-0 w-6 h-6 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Assignees — multi-select, right aligned */}
          {(() => {
            const lightColors = ['bg-[#8E8E89]', 'bg-[#E0DBD5]', 'bg-[#E8E2DB]', 'bg-[#C2D64A]', 'bg-[#A8BA32]', 'bg-[#D4A843]', 'bg-[#C27A4A]']
            const isMeName = (n) => profile?.display_name && n.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
            const iconText = lightColors.includes(profile?.color) ? 'text-[#1B1B18]' : 'text-white'
            const maxVisible = 3
            const visible = assignees.slice(0, maxVisible)
            const overflow = Math.max(0, assignees.length - maxVisible)

            const toggleAssignee = (name) => {
              const next = assignees.some((a) => a.toLowerCase() === name.toLowerCase())
                ? assignees.filter((a) => a.toLowerCase() !== name.toLowerCase())
                : [...assignees, name]
              setAssignees(next)
              scheduleSave()
            }

            return (
          <div className="relative shrink-0" data-menu-root>
            <button
              type="button"
              onClick={() => { toggleMenu('assignee'); setAssigneeSearch('') }}
              className="flex items-center cursor-pointer"
              title={assignees.length === 0 ? 'Assign someone' : assignees.join(', ')}
            >
              {assignees.length === 0 ? (
                <span className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--surface-hover)] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors">
                  <User className="w-3.5 h-3.5" />
                </span>
              ) : (
                <span className="flex -space-x-2">
                  {visible.map((name) => {
                    const isMe = isMeName(name)
                    return (
                      <span
                        key={name}
                        className={`w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-[var(--surface-page)] ${
                          isMe && profile?.icon
                            ? `${iconText} ${profile.color}`
                            : `${getAvatarColor(name)} text-[9px] font-bold text-white`
                        }`}
                      >
                        {isMe && profile?.icon
                          ? <DynamicIcon name={profile.icon} className="w-3.5 h-3.5" />
                          : getInitials(name)}
                      </span>
                    )
                  })}
                  {overflow > 0 && (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-[var(--surface-page)] bg-[var(--surface-hover)] text-[10px] font-medium text-[var(--text-secondary)]">
                      +{overflow}
                    </span>
                  )}
                </span>
              )}
            </button>
            {openMenu === 'assignee' && (
              <div className="absolute right-0 top-full mt-2 p-1.5 bg-[var(--surface-card)] border-0.5 border-[var(--color-mist)] backdrop-blur-xl rounded-xl min-w-[14rem] text-[var(--text-primary)] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] z-50 overflow-hidden">
                <div className="px-1.5 pb-1.5">
                  <input
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const name = assigneeSearch.trim()
                        if (!name) return
                        // Add if not already there (picker stays open)
                        if (!assignees.some((a) => a.toLowerCase() === name.toLowerCase())) {
                          toggleAssignee(name)
                        }
                        setAssigneeSearch('')
                      } else if (e.key === 'Escape') {
                        setOpenMenu(null)
                      }
                    }}
                    autoFocus
                    placeholder="Search or type name..."
                    className="w-full text-sm rounded-lg px-2 py-1.5 border border-[var(--border-default)] hover:border-[var(--color-mist)] focus:border-[var(--border-focus)] focus:outline-none placeholder-[var(--text-faint)]"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {/* Already-selected external names (not in board member list) shown first */}
                  {assignees
                    .filter((a) => !boardMemberNames.some((m) => m.toLowerCase() === a.toLowerCase()))
                    .filter((a) => !assigneeSearch.trim() || a.toLowerCase().includes(assigneeSearch.trim().toLowerCase()))
                    .map((name) => (
                      <div
                        key={`ext-${name}`}
                        role="menuitem"
                        onClick={() => toggleAssignee(name)}
                        className="min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs bg-[var(--surface-hover)] font-medium"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${getAvatarColor(name)}`}>{getInitials(name)}</span>
                          <span className="flex-1 truncate">{name}</span>
                        </div>
                        <Check className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      </div>
                    ))}
                  {/* Board/workspace members */}
                  {boardMemberNames
                    .filter((m) => !assigneeSearch.trim() || m.toLowerCase().includes(assigneeSearch.trim().toLowerCase()))
                    .map((member) => {
                      const checked = assignees.some((a) => a.toLowerCase() === member.toLowerCase())
                      return (
                        <div
                          key={member}
                          role="menuitem"
                          onClick={() => toggleAssignee(member)}
                          className={`min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs ${checked ? 'bg-[var(--surface-hover)] font-medium' : ''}`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${getAvatarColor(member)}`}>{getInitials(member)}</span>
                            <span className="flex-1 truncate">{member}</span>
                          </div>
                          {checked && <Check className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                        </div>
                      )
                    })}
                  {/* Free-text "add" when search doesn't match anyone and not already assigned */}
                  {assigneeSearch.trim() &&
                    !boardMemberNames.some((m) => m.toLowerCase() === assigneeSearch.trim().toLowerCase()) &&
                    !assignees.some((a) => a.toLowerCase() === assigneeSearch.trim().toLowerCase()) && (
                    <>
                      <div role="separator" className="h-[0.5px] bg-[var(--border-subtle)] my-1.5 mx-2" />
                      <div
                        role="menuitem"
                        onClick={() => { toggleAssignee(assigneeSearch.trim()); setAssigneeSearch('') }}
                        className="min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)]"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus className="w-3.5 h-3.5" /></div>
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
                        onClick={() => { setAssignees([]); scheduleSave() }}
                        className="min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs text-[var(--text-muted)]"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X className="w-3.5 h-3.5" /></div>
                          <span className="flex-1 truncate">Clear all</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          )
          })()}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Description */}
          {editingDescription ? (
            <div className="border border-[var(--border-default)] rounded-xl p-6">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => { setEditingDescription(false); scheduleSave() }}
                onKeyDown={(e) => { if (e.key === 'Escape') { setEditingDescription(false); scheduleSave() } }}
                autoFocus
                placeholder="Add details about this task..."
                className="w-full text-sm text-[var(--text-secondary)] bg-transparent focus:outline-none resize-none placeholder-[var(--text-faint)] leading-relaxed min-h-[80px]"
              />
            </div>
          ) : description ? (
            <div className="text-[var(--text-secondary)] text-sm leading-relaxed cursor-pointer line-clamp-2 hover:text-[var(--text-primary)] transition-colors" onClick={() => setEditingDescription(true)}>
              {description}
            </div>
          ) : (
            <div className="border border-[var(--border-default)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--color-mist)] transition-colors" onClick={() => setEditingDescription(true)}>
              <h3 className="text-[var(--text-faint)] mb-1 text-balance text-sm">Click to add a description for this task.</h3>
            </div>
          )}

          {/* Checklist */}
          <div className="mt-5 max-w-sm">
            {checklist.map((item, idx) => (
              <ChecklistItem
                key={`${item.text}-${idx}`}
                item={item}
                onToggle={() => { setChecklist(checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c)); scheduleSave() }}
                onEdit={(text) => { setChecklist(checklist.map((c, i) => i === idx ? { ...c, text } : c)); scheduleSave() }}
                onDelete={() => { setChecklist(checklist.filter((_, i) => i !== idx)); scheduleSave() }}
              />
            ))}
            <div className="flex items-center gap-2 py-1">
              <Plus className="w-4 h-4 text-[var(--text-faint)] shrink-0" />
              <input
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { const t = newCheckItem.trim(); if (t) { setChecklist([...checklist, { text: t, done: false }]); setNewCheckItem(''); scheduleSave() } } }}
                placeholder="Add an item..."
                className="text-sm text-[var(--text-secondary)] bg-transparent focus:outline-none placeholder-[var(--text-faint)]"
              />
            </div>
          </div>

          {/* Files — only shown when files exist */}
          {attachmentItems && attachmentItems.length > 0 && (
          <div className="w-full py-4 mt-4 border-t-0.5 border-[var(--border-subtle)]">
            <div className="h-6 w-full flex flex-row items-center justify-between gap-4 mb-1">
              <h3 className="text-[var(--text-secondary)] text-sm font-semibold">Files</h3>
            </div>
            {(
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mt-3">
                {attachmentItems.map((file) => {
                  const ext = (file.file_name || '').split('.').pop()?.toLowerCase() || 'file'
                  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)
                  return (
                    <li key={file.id} className="relative group/file">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const url = await getAttachmentUrl(file.storage_path)
                            if (url) window.open(url, '_blank')
                          } catch (err) {
                            showToast.error('Failed to open file')
                          }
                        }}
                        className="w-full rounded-lg text-left block cursor-pointer transition-all border border-[var(--color-sand)] flex flex-col justify-between gap-2.5 overflow-hidden px-2.5 py-2 bg-[var(--surface-card)] hover:border-[var(--color-mist)] shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04)]"
                        style={{ height: 120, minWidth: '100%' }}
                        aria-label={`${file.file_name}, ${ext}`}
                      >
                        <div className="flex flex-col gap-1 min-h-0">
                          <h3 className="text-[12px] break-words text-[var(--text-primary)] line-clamp-3">
                            {file.file_name}
                          </h3>
                          {file.file_size > 0 && (
                            <p className="text-[10px] line-clamp-1 break-words text-[var(--text-faint)]">
                              {file.file_size < 1024 ? `${file.file_size} B` : file.file_size < 1048576 ? `${(file.file_size / 1024).toFixed(1)} KB` : `${(file.file_size / 1048576).toFixed(1)} MB`}
                            </p>
                          )}
                        </div>
                        <div>
                          <div className="relative flex flex-row items-center gap-1 justify-between">
                            <div className="flex flex-row gap-1 shrink min-w-0">
                              <div className="min-w-0 h-[18px] flex flex-row items-center justify-center gap-0.5 px-1 border-0.5 border-[var(--border-default)] shadow-sm rounded bg-[var(--surface-card)]/70 backdrop-blur-sm font-medium">
                                <p className="uppercase truncate text-[var(--text-secondary)] text-[11px] leading-[13px]">{ext}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                      {/* Delete badge on hover */}
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            await deleteAttachment(cardId, file.id, file.storage_path)
                          } catch (err) {
                            showToast.error('Failed to delete')
                          }
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--surface-card)] border-0.5 border-[var(--border-default)] flex items-center justify-center text-[var(--text-faint)] hover:text-[#7A5C44] hover:bg-[var(--surface-hover)] opacity-0 group-hover/file:opacity-100 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
})
