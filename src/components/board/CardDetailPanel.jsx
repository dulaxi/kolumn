import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Trash2, Plus, Check, User, Calendar, Flag, Tag, CheckSquare,
  Briefcase, LayoutList, CheckCircle2, FileText, Smile, UserPlus, ArrowLeft, MessageSquare, Repeat,
  History, ArrowRight, PencilLine, CircleCheck, CircleDot, Paperclip, Download, Upload, File, Image,
  Archive, ArchiveRestore, Bookmark,
} from 'lucide-react'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import { showToast } from '../../utils/toast'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { supabase } from '../../lib/supabase'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import MentionInput from './MentionInput'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useNotificationStore } from '../../store/notificationStore'
import { useTemplateStore } from '../../store/templateStore'
import { LABEL_BG, getAvatarColor, getInitials } from '../../utils/formatting'
import { addRecurrenceInterval } from '../../utils/dateUtils'

function parseMentions(text, boardMembers) {
  const mentions = []
  const re = /@(\w[\w ]*?)(?=\s@|\s[^@]|$)/g
  let m
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim()
    const member = boardMembers.find(
      (mb) => mb.display_name.toLowerCase() === name.toLowerCase()
    )
    if (member) mentions.push(member)
  }
  return mentions
}

function CommentBox({ commentText, setCommentText, addComment, cardId, card, boardMembers, notify, profile }) {
  const handleSubmit = () => {
    if (!commentText.trim()) return
    addComment(cardId, commentText.trim())

    // Notify mentioned users
    const mentioned = parseMentions(commentText, boardMembers)
    for (const member of mentioned) {
      notify({
        userId: member.user_id,
        type: 'mention',
        title: 'mentioned you in a comment',
        body: commentText.trim().slice(0, 100),
        cardId,
        boardId: card?.board_id,
        actorName: profile?.display_name || 'Someone',
      })
    }
    setCommentText('')
  }

  return (
    <div className="flex gap-2">
      <MentionInput
        value={commentText}
        onChange={setCommentText}
        members={boardMembers}
        placeholder="Add a comment... (@ to mention)"
        onSubmit={handleSubmit}
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="px-3 py-1.5 text-xs font-medium bg-[#1B1B18] text-white rounded-lg hover:bg-[#333] transition-colors"
      >
        Send
      </button>
    </div>
  )
}

const LABEL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gray']

const LABEL_COLOR_CLASSES = LABEL_BG

const COLOR_DOT_CLASSES = {
  red: 'bg-[#CF222E]',
  blue: 'bg-[#3094FF]',
  green: 'bg-[#08872B]',
  yellow: 'bg-[#9A6700]',
  purple: 'bg-[#8534F3]',
  pink: 'bg-[#BF3989]',
  gray: 'bg-[#909692]',
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', dot: 'bg-[#EEF2D6]' },
  { value: 'medium', label: 'Medium', dot: 'bg-[#F5EDCF]' },
  { value: 'high', label: 'High', dot: 'bg-[#F2D9C7]' },
]

export default function CardDetailPanel({ cardId, onClose }) {
  const card = useBoardStore((s) => s.cards[cardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const archiveCard = useBoardStore((s) => s.archiveCard)
  const unarchiveCard = useBoardStore((s) => s.unarchiveCard)
  const completeCard = useBoardStore((s) => s.completeCard)
  const boards = useBoardStore((s) => s.boards)
  const allColumns = useBoardStore((s) => s.columns)
  const addBoardMember = useBoardStore((s) => s.addBoardMember)
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const font = useSettingsStore((s) => s.font)
  const isMobile = useIsMobile()

  const [commentText, setCommentText] = useState('')
  const comments = useBoardStore((s) => s.comments[cardId])
  const fetchComments = useBoardStore((s) => s.fetchComments)
  const addComment = useBoardStore((s) => s.addComment)
  const deleteComment = useBoardStore((s) => s.deleteComment)
  const activityItems = useBoardStore((s) => s.activity[cardId])
  const fetchActivity = useBoardStore((s) => s.fetchActivity)
  const notify = useNotificationStore((s) => s.notify)
  const addTemplate = useTemplateStore((s) => s.addTemplate)
  const attachmentItems = useBoardStore((s) => s.attachments[cardId])
  const fetchAttachments = useBoardStore((s) => s.fetchAttachments)
  const uploadAttachment = useBoardStore((s) => s.uploadAttachment)
  const deleteAttachment = useBoardStore((s) => s.deleteAttachment)
  const getAttachmentUrl = useBoardStore((s) => s.getAttachmentUrl)

  // Initialize state directly from card (component remounts via key={cardId} in parent)
  const [title, setTitle] = useState(card?.title || '')
  const [description, setDescription] = useState(card?.description || '')
  const [assignee, setAssignee] = useState(card?.assignee_name || '')
  const [priority, setPriority] = useState(card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(card?.due_date || '')
  const [labels, setLabels] = useState(card?.labels ? [...card.labels] : [])
  const [checklist, setChecklist] = useState(card?.checklist ? card.checklist.map((item) => ({ ...item })) : [])
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [newCheckItem, setNewCheckItem] = useState('')
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [boardMembers, setBoardMembers] = useState([])
  const fileInputRef = useRef(null)
  const [customInterval, setCustomInterval] = useState(1)
  const [customUnit, setCustomUnit] = useState('days')
  const [boardMemberNames, setBoardMemberNames] = useState([])

  // Dirty flag — ONLY set by user interactions, never by effects
  const isDirtyRef = useRef(false)
  const autoSaveTimerRef = useRef(null)
  const formDataRef = useRef({ title: card?.title || '', description: card?.description || '', assignee: card?.assignee_name || '', priority: card?.priority || 'medium', dueDate: card?.due_date || '', labels: card?.labels ? [...card.labels] : [], checklist: card?.checklist ? card.checklist.map((item) => ({ ...item })) : [] })

  // Fetch board members and comments on mount
  useEffect(() => {
    if (card) {
      supabase
        .from('board_members')
        .select('profiles(display_name)')
        .eq('board_id', card.board_id)
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to fetch board members:', error)
            return
          }
          const names = (data || [])
            .map((m) => m.profiles?.display_name)
            .filter(Boolean)
          setBoardMemberNames(names)
        })
      fetchComments(cardId)
      fetchActivity(cardId)
      fetchAttachments(cardId)

      // Fetch board members for @mention autocomplete
      if (card?.board_id) {
        supabase
          .from('board_members')
          .select('user_id, profiles(id, display_name, icon, color)')
          .eq('board_id', card.board_id)
          .then(({ data }) => {
            if (data) {
              setBoardMembers(data.map((m) => ({
                user_id: m.profiles?.id || m.user_id,
                display_name: m.profiles?.display_name || 'Unknown',
                color: m.profiles?.color || 'bg-[#E0DBD5]',
              })))
            }
          })
      }
    }
  }, [])

  const saveAndCloseRef = useRef(null)

  // Schedule a debounced save — reads latest data from formDataRef
  const scheduleSave = useCallback(() => {
    isDirtyRef.current = true
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      if (cardId && formDataRef.current) {
        const d = formDataRef.current
        useBoardStore.getState().updateCard(cardId, {
          title: d.title.trim() || card?.title || 'Untitled task',
          description: d.description,
          assignee_name: d.assignee.trim(),
          priority: d.priority,
          due_date: d.dueDate || null,
          labels: d.labels,
          checklist: d.checklist,
        })
        isDirtyRef.current = false
      }
    }, 1000)
  }, [cardId, card?.title])

  // Keep formDataRef in sync (passive — does NOT trigger saves)
  useEffect(() => {
    formDataRef.current = { title, description, assignee, priority, dueDate, labels, checklist }
  })

  // Save on unmount (navigation away, component destroyed)
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      if (isDirtyRef.current && formDataRef.current && cardId) {
        const d = formDataRef.current
        useBoardStore.getState().updateCard(cardId, {
          title: d.title.trim() || 'Untitled task',
          description: d.description,
          assignee_name: d.assignee.trim(),
          priority: d.priority,
          due_date: d.dueDate || null,
          labels: d.labels,
          checklist: d.checklist,
        })
      }
    }
  }, [cardId])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        saveAndCloseRef.current?.()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!card) return null

  // Find board name and column (status)
  const board = boards[card.board_id]
  const boardName = board?.name || '—'
  const column = allColumns[card.column_id]
  const statusName = column?.title || '—'

  const handleSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    isDirtyRef.current = false
    updateCard(cardId, {
      title: title.trim() || card.title,
      description,
      assignee_name: assignee.trim(),
      priority,
      due_date: dueDate || null,
      labels,
      checklist,
    })
  }

  const handleSaveAndClose = () => {
    handleSave()
    onClose()
  }
  saveAndCloseRef.current = handleSaveAndClose

  const handleDelete = () => {
    deleteCard(cardId)
    onClose()
  }

  const handleArchive = () => {
    if (card?.archived) {
      unarchiveCard(cardId)
    } else {
      archiveCard(cardId)
      onClose()
    }
  }

  const addLabel = () => {
    const trimmed = newLabelText.trim()
    if (trimmed) {
      setLabels([...labels, { text: trimmed, color: newLabelColor }])
      setNewLabelText('')
      setShowLabelForm(false)
      scheduleSave()
    }
  }

  const removeLabel = (index) => {
    setLabels(labels.filter((_, i) => i !== index))
    scheduleSave()
  }

  const addCheckItem = () => {
    const trimmed = newCheckItem.trim()
    if (trimmed) {
      setChecklist([...checklist, { text: trimmed, done: false }])
      setNewCheckItem('')
      scheduleSave()
    }
  }

  const toggleCheckItem = (index) => {
    setChecklist(
      checklist.map((item, i) =>
        i === index ? { ...item, done: !item.done } : item
      )
    )
    scheduleSave()
  }

  const removeCheckItem = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index))
    scheduleSave()
  }

  const checkedCount = checklist.filter((item) => item.done).length
  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1]

  const renderAvatar = (name, size = 'w-6 h-6', iconSize = 'w-3.5 h-3.5') => {
    const isMe = profile?.display_name && name.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
    if (isMe && profile.icon) {
      const iconText = profile.color === 'bg-[#8E8E89]' ? 'text-[#1B1B18]' : 'text-white'
      return (
        <span className={`${size} rounded-full shrink-0 flex items-center justify-center ${iconText} ${profile.color}`}>
          <DynamicIcon name={profile.icon} className={iconSize} />
        </span>
      )
    }
    return (
      <span className={`${size} rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(name)}`}>
        {getInitials(name)}
      </span>
    )
  }
  const dueDateDisplay = dueDate ? (() => {
    const d = new Date(dueDate)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    if (sameDay(d, today)) return 'Today'
    if (sameDay(d, yesterday)) return 'Yesterday'
    if (sameDay(d, tomorrow)) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  })() : null

  const recurrenceLabel = card?.recurrence_interval
    ? card.recurrence_unit === 'months'
      ? card.recurrence_interval === 1 ? 'Monthly' : `Every ${card.recurrence_interval} months`
      : card.recurrence_interval === 1 ? 'Daily'
      : card.recurrence_interval === 7 ? 'Weekly'
      : card.recurrence_interval === 14 ? 'Biweekly'
      : `Every ${card.recurrence_interval} days`
    : null

  const handleRecurrenceChange = (interval, unit) => {
    if (!interval) {
      updateCard(cardId, { recurrence_interval: null, recurrence_unit: null, recurrence_next_due: null })
    } else {
      const nextDue = dueDate ? addRecurrenceInterval(parseISO(dueDate), interval, unit) : null
      updateCard(cardId, {
        recurrence_interval: interval,
        recurrence_unit: unit,
        recurrence_next_due: nextDue ? format(nextDue, 'yyyy-MM-dd') : null,
      })
    }
  }

  return (
    <div className={`fixed bg-white border-l border-[#E0DBD5] flex flex-col z-20 ${
      isMobile
        ? 'inset-0'
        : 'top-16 right-0 bottom-0 w-[340px] lg:w-[420px]'
    }`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#E8E2DB]">
        <div className="flex items-center gap-1">
          {isMobile && (
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="p-1.5 rounded-lg hover:bg-[#E8E2DB]"
            >
              <ArrowLeft className="w-5 h-5 text-[#5C5C57]" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5C5C57] hover:bg-[#E8E2DB] rounded-lg transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Save
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              addTemplate({
                name: card.title,
                title: card.title,
                description: card.description || '',
                priority: card.priority || 'medium',
                labels: card.labels || [],
                checklist: (card.checklist || []).map((item) => ({ text: item.text, checked: false })),
              })
              showToast.success('Saved as template')
            }}
            className="p-1.5 rounded-lg text-[#8E8E89] hover:text-[#A8BA32] hover:bg-[#E8E2DB] transition-colors"
            title="Save as template"
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleArchive}
            className="p-1.5 rounded-lg text-[#8E8E89] hover:text-[#D4A843] hover:bg-[#E8E2DB] transition-colors"
            title={card?.archived ? 'Unarchive' : 'Archive'}
          >
            {card?.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-[#8E8E89] hover:text-[#7A5C44] hover:bg-[#E8E2DB] transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {!isMobile && (
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="p-1.5 rounded-lg text-[#8E8E89] hover:text-[#5C5C57] hover:bg-[#E8E2DB] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Task number + completion + Title */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => completeCard(cardId)}
              className="shrink-0"
            >
              <CheckCircle2 className={`w-5 h-5 transition-colors ${card.completed ? 'text-[#A8BA32]' : 'text-[#8E8E89] hover:text-[#C2D64A]'}`} />
            </button>
            {card.task_number > 0 && (
              <span className="text-xs font-medium text-[#5C5C57]">Task #{card.task_number}</span>
            )}
            {card.global_task_number > 0 && (
              <span className="text-[10px] text-[#8E8E89] bg-[#F2EDE8] px-1.5 py-0.5 rounded-full">G-{card.global_task_number}</span>
            )}
            {card.archived && (
              <span className="text-[10px] font-medium text-[#8B7355] bg-[#F5EDCF] px-1.5 py-0.5 rounded-full">Archived</span>
            )}
          </div>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); scheduleSave() }}
            className={`text-lg font-semibold bg-transparent border-none focus:outline-none w-full placeholder-[#8E8E89] ${card.completed ? 'text-[#8E8E89] line-through' : 'text-[#1B1B18]'}`}
            placeholder="Task name"
          />
        </div>

        {/* Fields */}
        <div className="px-5 space-y-0">
          {/* Icon */}
          <div className="flex items-center py-2.5 border-t border-[#E8E2DB] relative">
            <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
              <Smile className="w-4 h-4" />
              <span className="text-sm">Icon</span>
            </div>
            <button
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="flex items-center gap-2 text-sm hover:bg-[#F2EDE8] px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-[#E8E2DB] flex items-center justify-center text-[#8E8E89]">
                {card.icon ? (
                  <DynamicIcon name={card.icon} className="w-3.5 h-3.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-[#5C5C57]">{card.icon || 'Default'}</span>
            </button>
            {showIconPicker && (
              <IconPicker
                value={card.icon}
                onChange={(iconName) => updateCard(cardId, { icon: iconName })}
                onClose={() => setShowIconPicker(false)}
              />
            )}
          </div>

          {/* Assignee */}
          <div className="flex items-center py-2.5 border-t border-[#E8E2DB] relative">
            <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
              <User className="w-4 h-4" />
              <span className="text-sm">Assignee</span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setShowAssigneePicker(!showAssigneePicker)
                  setAssigneeSearch('')
                }}
                className="flex items-center gap-2 text-sm hover:bg-[#F2EDE8] px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
              >
                {assignee.trim() ? (
                  <>
                    {renderAvatar(assignee)}
                    <span className="text-[#5C5C57]">{assignee}</span>
                  </>
                ) : (
                  <span className="text-[#8E8E89]">No assignee</span>
                )}
              </button>
            </div>
            {showAssigneePicker && (() => {
              const query = assigneeSearch.trim().toLowerCase()
              const filtered = query
                ? boardMemberNames.filter((m) => m.toLowerCase().includes(query))
                : boardMemberNames
              const exactMatch = boardMemberNames.some((m) => m.toLowerCase() === query)
              const showAddOption = query && !exactMatch

              return (
                <div className="absolute left-24 sm:left-32 top-full mt-1 bg-white border border-[#E0DBD5] rounded-xl shadow-lg z-10 w-56 overflow-hidden">
                  <div className="p-2 border-b border-[#E8E2DB]">
                    <input
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && showAddOption) {
                          const name = assigneeSearch.trim()
                          addBoardMember(card.board_id, name)
                          setAssignee(name)
                          setShowAssigneePicker(false)
                          setAssigneeSearch('')
                          scheduleSave()
                        } else if (e.key === 'Enter' && filtered.length === 1) {
                          setAssignee(filtered[0])
                          setShowAssigneePicker(false)
                          setAssigneeSearch('')
                          scheduleSave()
                        } else if (e.key === 'Escape') {
                          setShowAssigneePicker(false)
                          setAssigneeSearch('')
                        }
                      }}
                      autoFocus
                      placeholder="Search or add member..."
                      className="w-full text-sm rounded-lg px-2.5 py-1.5 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none placeholder-[#8E8E89]"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {assignee.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssignee('')
                          setShowAssigneePicker(false)
                          setAssigneeSearch('')
                          scheduleSave()
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#8E8E89] hover:bg-[#F2EDE8] transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Unassign
                      </button>
                    )}
                    {filtered.map((member) => (
                      <button
                        key={member}
                        type="button"
                        onClick={() => {
                          setAssignee(member)
                          setShowAssigneePicker(false)
                          setAssigneeSearch('')
                          scheduleSave()
                        }}
                        className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
                          assignee === member
                            ? 'bg-[#F2EDE8] text-[#1B1B18] font-medium'
                            : 'text-[#5C5C57] hover:bg-[#F2EDE8]'
                        }`}
                      >
                        {renderAvatar(member)}
                        {member}
                      </button>
                    ))}
                    {filtered.length === 0 && !showAddOption && (
                      <div className="px-3 py-2 text-sm text-[#8E8E89]">No members yet</div>
                    )}
                    {showAddOption && (
                      <button
                        type="button"
                        onClick={() => {
                          const name = assigneeSearch.trim()
                          addBoardMember(card.board_id, name)
                          setAssignee(name)
                          setShowAssigneePicker(false)
                          setAssigneeSearch('')
                          scheduleSave()
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#A8BA32] hover:bg-[#EEF2D6] transition-colors border-t border-[#E8E2DB]"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add "{assigneeSearch.trim()}"
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Due date */}
          <div className="flex items-center py-2.5 border-t border-[#E8E2DB]">
            <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Due date</span>
            </div>
            {editingDueDate ? (
              <input
                type="date"
                value={dueDate ? dueDate.split('T')[0] : ''}
                onChange={(e) => {
                  setDueDate(e.target.value ? `${e.target.value}T23:59:59` : '')
                  setEditingDueDate(false)
                  scheduleSave()
                }}
                onBlur={() => setEditingDueDate(false)}
                autoFocus
                className="text-sm text-[#5C5C57] bg-transparent border-none focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingDueDate(true)}
                className="text-sm hover:bg-[#F2EDE8] px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
              >
                {dueDateDisplay ? (
                  <span className={
                    dueDateDisplay === 'Yesterday' ? 'text-[#C27A4A] font-medium' :
                    dueDateDisplay === 'Today' ? 'text-[#D4A843] font-medium' :
                    dueDateDisplay === 'Tomorrow' ? 'text-[#A8BA32] font-medium' :
                    dueDate && new Date(dueDate) < new Date() ? 'text-[#C27A4A] font-medium' :
                    'text-[#A8BA32] font-medium'
                  }>{dueDateDisplay}</span>
                ) : (
                  <span className="text-[#8E8E89]">No due date</span>
                )}
              </button>
            )}
          </div>

          {/* Repeat */}
          <div className="flex items-center py-2.5 border-t border-[#E8E2DB]">
            <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
              <Repeat className="w-4 h-4" />
              <span className="text-sm">Repeat</span>
            </div>
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setShowRecurrencePicker(!showRecurrencePicker)}
                className="text-sm text-[#5C5C57] hover:bg-[#F2EDE8] px-2 py-0.5 rounded-lg transition-colors"
              >
                {recurrenceLabel || 'None'}
              </button>
              {showRecurrencePicker && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-[#E0DBD5] rounded-xl shadow-lg py-1 z-20 w-52">
                  {[
                    { label: 'No repeat', interval: null, unit: null },
                    { label: 'Daily', interval: 1, unit: 'days' },
                    { label: 'Weekly', interval: 7, unit: 'days' },
                    { label: 'Biweekly', interval: 14, unit: 'days' },
                    { label: 'Monthly', interval: 1, unit: 'months' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        handleRecurrenceChange(opt.interval, opt.unit)
                        setShowRecurrencePicker(false)
                      }}
                      className="w-full px-3 py-1.5 text-sm text-left text-[#5C5C57] hover:bg-[#F2EDE8] transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                  <div className="border-t border-[#E8E2DB] px-3 py-2 flex items-center gap-2">
                    <span className="text-xs text-[#8E8E89]">Every</span>
                    <input
                      type="number"
                      min="1"
                      value={customInterval}
                      onChange={(e) => setCustomInterval(parseInt(e.target.value) || 1)}
                      className="w-12 text-sm px-1.5 py-0.5 border border-[#E0DBD5] rounded-lg text-center focus:outline-none focus:border-[#C2D64A]"
                    />
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="text-sm px-1.5 py-0.5 border border-[#E0DBD5] rounded-lg focus:outline-none focus:border-[#C2D64A]"
                    >
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        handleRecurrenceChange(customUnit === 'weeks' ? customInterval * 7 : customInterval, customUnit === 'weeks' ? 'days' : customUnit)
                        setShowRecurrencePicker(false)
                      }}
                      className="text-xs font-medium text-[#A8BA32] hover:text-[#A8BA32]"
                    >
                      Set
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Projects */}
          <div className="flex items-center py-2.5 border-t border-[#E8E2DB]">
            <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
              <Briefcase className="w-4 h-4" />
              <span className="text-sm">Projects</span>
            </div>
            <span className="text-sm text-[#5C5C57]">{boardName}</span>
          </div>


          {/* Fields section header */}
          <div className="pt-4 pb-1 border-t border-[#E8E2DB]">
            <span className="text-xs font-medium text-[#8E8E89] uppercase tracking-wider">Fields</span>
          </div>

          {/* Priority */}
          <div className="flex items-center py-2.5 relative">
            <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
              <Flag className="w-4 h-4" />
              <span className="text-sm">Priority</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPriorityPicker(!showPriorityPicker)}
              className="flex items-center gap-2 text-sm hover:bg-[#F2EDE8] px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${currentPriority.dot}`} />
              <span className="text-[#5C5C57]">{currentPriority.label}</span>
            </button>
            {showPriorityPicker && (
              <div className="absolute left-24 sm:left-32 top-full mt-1 bg-white border border-[#E0DBD5] rounded-xl shadow-lg py-1 z-10 w-36">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPriority(opt.value)
                      setShowPriorityPicker(false)
                      scheduleSave()
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
                      priority === opt.value
                        ? 'bg-[#F2EDE8] text-[#1B1B18] font-medium'
                        : 'text-[#5C5C57] hover:bg-[#F2EDE8]'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center py-2.5 border-t border-[#E8E2DB]">
            <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
              <LayoutList className="w-4 h-4" />
              <span className="text-sm">Status</span>
            </div>
            <span className="text-sm text-[#5C5C57]">{statusName}</span>
          </div>

          {/* Labels */}
          <div className="flex items-start py-2.5 border-t border-[#E8E2DB]">
            <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89] pt-0.5">
              <Tag className="w-4 h-4" />
              <span className="text-sm">Labels</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {labels.length === 0 && !showLabelForm && (
                  <span className="text-sm text-[#8E8E89]">—</span>
                )}
                {labels.map((label, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      LABEL_COLOR_CLASSES[label.color] || LABEL_COLOR_CLASSES.gray
                    }`}
                  >
                    {label.text}
                    <button
                      type="button"
                      onClick={() => removeLabel(idx)}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {showLabelForm ? (
                  <div className="w-full mt-1.5 space-y-2">
                    <input
                      value={newLabelText}
                      onChange={(e) => setNewLabelText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addLabel()}
                      placeholder="Label text..."
                      autoFocus
                      className="w-full text-sm rounded-lg px-2.5 py-1.5 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {LABEL_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewLabelColor(color)}
                            className={`w-4.5 h-4.5 rounded-full ${COLOR_DOT_CLASSES[color]} ${
                              newLabelColor === color
                                ? 'ring-2 ring-offset-1 ring-gray-400'
                                : ''
                            }`}
                            style={{ width: 18, height: 18 }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={addLabel} className="p-1 bg-[#C2D64A] text-white rounded hover:bg-[#A8BA32]">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => { setShowLabelForm(false); setNewLabelText('') }} className="p-1 text-[#8E8E89] hover:text-[#5C5C57]">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLabelForm(true)}
                    className="flex items-center gap-0.5 text-xs text-[#8E8E89] hover:text-[#5C5C57] px-1.5 py-0.5"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-5 pt-5 pb-2 border-t border-[#E8E2DB] mt-1">
          <label className="text-xs font-medium text-[#8E8E89] uppercase tracking-wider mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); scheduleSave() }}
            rows={4}
            placeholder="Add details about this task..."
            className="w-full text-sm text-[#5C5C57] rounded-lg px-3 py-2 resize-none border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6] placeholder-[#8E8E89]"
          />
        </div>

        {/* Comments */}
        <div className="px-5 pt-4 pb-4 border-t border-[#E8E2DB]">
          <label className="text-xs font-medium text-[#8E8E89] uppercase tracking-wider mb-3 block">
            Comments
          </label>
          <div className="space-y-3 mb-3">
            {(comments || []).map((comment) => (
              <div key={comment.id} className="group">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-[#5C5C57]">{comment.author_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#8E8E89]">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {comment.user_id === user?.id && (
                      <button
                        type="button"
                        onClick={() => deleteComment(comment.id, cardId)}
                        className="opacity-0 group-hover:opacity-100 text-[#8E8E89] hover:text-[#7A5C44] transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#5C5C57] mt-0.5">
                  {comment.text.split(/(@\w[\w ]*)/g).map((part, i) =>
                    part.startsWith('@') ? (
                      <span key={i} className="font-medium text-[#A8BA32]">{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              </div>
            ))}
          </div>
          <CommentBox
            commentText={commentText}
            setCommentText={setCommentText}
            addComment={addComment}
            cardId={cardId}
            card={card}
            boardMembers={boardMembers}
            notify={notify}
            profile={profile}
          />
        </div>

        {/* Attachments */}
        <div className="px-5 pt-3 pb-3 border-t border-[#E8E2DB]">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-[#8E8E89] uppercase tracking-wider flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5" />
              Attachments
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-[11px] font-medium text-[#A8BA32] hover:text-[#A8BA32] disabled:opacity-50"
            >
              <Upload className="w-3 h-3" />
              {uploading ? 'Uploading...' : 'Add file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 10 * 1024 * 1024) {
                  showToast.error('File must be under 10 MB')
                  return
                }
                setUploading(true)
                await uploadAttachment(cardId, file)
                setUploading(false)
                e.target.value = ''
              }}
            />
          </div>
          {(attachmentItems || []).length > 0 && (
            <div className="space-y-1.5">
              {(attachmentItems || []).map((att) => {
                const isImage = att.content_type?.startsWith('image/')
                const sizeStr = att.file_size < 1024
                  ? `${att.file_size} B`
                  : att.file_size < 1024 * 1024
                    ? `${(att.file_size / 1024).toFixed(1)} KB`
                    : `${(att.file_size / (1024 * 1024)).toFixed(1)} MB`

                return (
                  <div key={att.id} className="group flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-[#F2EDE8] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-[#E8E2DB] flex items-center justify-center shrink-0">
                      {isImage ? <Image className="w-3.5 h-3.5 text-[#C2D64A]" /> : <File className="w-3.5 h-3.5 text-[#C4BFB8]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#5C5C57] truncate">{att.file_name}</p>
                      <p className="text-[10px] text-[#C4BFB8]">{sizeStr}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={async () => {
                          const url = await getAttachmentUrl(att.storage_path)
                          if (url) window.open(url, '_blank')
                        }}
                        className="p-1 text-[#C4BFB8] hover:text-[#A8BA32] transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {att.user_id === user?.id && (
                        <button
                          type="button"
                          onClick={() => deleteAttachment(att.id, cardId, att.storage_path)}
                          className="p-1 text-[#C4BFB8] hover:text-[#7A5C44] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="px-5 pt-3 pb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[#8E8E89]">
              <CheckSquare className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Checklist</span>
            </div>
            {checklist.length > 0 && (
              <span className="text-xs text-[#8E8E89]">
                {checkedCount}/{checklist.length}
              </span>
            )}
          </div>

          {checklist.length > 0 && (
            <div className="w-full bg-[#E8E2DB] rounded-full h-1 mb-3">
              <div
                className="bg-[#C2D64A] h-1 rounded-full transition-all"
                style={{
                  width: `${checklist.length > 0 ? (checkedCount / checklist.length) * 100 : 0}%`,
                }}
              />
            </div>
          )}

          <div className="space-y-1">
            {checklist.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group py-0.5">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleCheckItem(idx)}
                  className="w-4 h-4 rounded border-[#E0DBD5] text-[#C2D64A] focus:ring-[#EEF2D6]"
                />
                <span
                  className={`flex-1 text-sm ${
                    item.done ? 'line-through text-[#8E8E89]' : 'text-[#5C5C57]'
                  }`}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeCheckItem(idx)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-[#8E8E89] hover:text-[#7A5C44] transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              value={newCheckItem}
              onChange={(e) => setNewCheckItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCheckItem()}
              placeholder="Add an item..."
              className="flex-1 text-sm rounded-lg px-2.5 py-1.5 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none placeholder-[#8E8E89]"
            />
            <button
              type="button"
              onClick={addCheckItem}
              className="px-2.5 py-1.5 text-xs font-medium bg-[#E8E2DB] text-[#5C5C57] rounded-lg hover:bg-[#E0DBD5] transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Activity Log */}
        {activityItems && activityItems.length > 0 && (
          <div className="px-5 pt-3 pb-5 border-t border-[#E8E2DB]">
            <label className="text-xs font-medium text-[#8E8E89] uppercase tracking-wider mb-3 flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              Activity
            </label>
            <div className="space-y-2">
              {activityItems.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-[12px]">
                  <div className="mt-0.5 shrink-0">
                    {item.action === 'created' && <Plus className="w-3 h-3 text-[#A8BA32]" />}
                    {item.action === 'moved' && <ArrowRight className="w-3 h-3 text-[#A8BA32]" />}
                    {item.action === 'completed' && <CircleCheck className="w-3 h-3 text-[#A8BA32]" />}
                    {item.action === 'reopened' && <CircleDot className="w-3 h-3 text-[#D4A843]" />}
                    {item.action.startsWith('updated_') && <PencilLine className="w-3 h-3 text-[#C4BFB8]" />}
                    {item.action === 'renamed' && <PencilLine className="w-3 h-3 text-[#C4BFB8]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[#5C5C57]">{item.actor_name}</span>{' '}
                    <span className="text-[#8E8E89]">
                      {item.action === 'created' && 'created this task'}
                      {item.action === 'moved' && `moved ${item.detail}`}
                      {item.action === 'completed' && 'marked complete'}
                      {item.action === 'reopened' && 'reopened'}
                      {item.action === 'updated_priority' && `changed priority ${item.detail}`}
                      {item.action === 'updated_assignee' && `reassigned ${item.detail}`}
                      {item.action === 'updated_due_date' && `set due date to ${item.detail}`}
                      {item.action === 'renamed' && `renamed ${item.detail}`}
                    </span>
                    <span className="text-[#C4BFB8] ml-1.5">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
