import { useState, useEffect, useRef, useCallback, memo } from 'react'
import {
  X, Trash2, Check, CheckCircle2, ArrowLeft, Bookmark, Archive, ArchiveRestore,
} from 'lucide-react'
import { showToast } from '../../utils/toast'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { supabase } from '../../lib/supabase'
import DynamicIcon from './DynamicIcon'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useNotificationStore } from '../../store/notificationStore'
import { useTemplateStore } from '../../store/templateStore'
import { getAvatarColor, getInitials } from '../../utils/formatting'
import CardDetailFields from './CardDetailFields'
import CardDetailChecklist from './CardDetailChecklist'
import CardDetailComments from './CardDetailComments'
import CardDetailAttachments from './CardDetailAttachments'
import CardDetailActivity from './CardDetailActivity'

export default memo(function CardDetailPanel({ cardId, onClose }) {
  const card = useBoardStore((s) => s.cards[cardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const archiveCard = useBoardStore((s) => s.archiveCard)
  const unarchiveCard = useBoardStore((s) => s.unarchiveCard)
  const completeCard = useBoardStore((s) => s.completeCard)
  const boardName = useBoardStore((s) => s.boards[s.cards[cardId]?.board_id]?.name || '—')
  const statusName = useBoardStore((s) => s.columns[s.cards[cardId]?.column_id]?.title || '—')
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
  const [boardMembers, setBoardMembers] = useState([])
  const [boardMemberNames, setBoardMemberNames] = useState([])

  // Dirty flag — ONLY set by user interactions, never by effects
  const isDirtyRef = useRef(false)
  const autoSaveTimerRef = useRef(null)
  const formDataRef = useRef({ title: card?.title || '', description: card?.description || '', assignee: card?.assignee_name || '', priority: card?.priority || 'medium', dueDate: card?.due_date || '', labels: card?.labels ? [...card.labels] : [], checklist: card?.checklist ? card.checklist.map((item) => ({ ...item })) : [] })

  // Fetch board members and comments when card changes
  useEffect(() => {
    if (!card) return
    let cancelled = false

    // Single query for board members (used for both assignee picker and @mentions)
    supabase
      .from('board_members')
      .select('user_id, profiles(id, display_name, icon, color)')
      .eq('board_id', card.board_id)
      .then(({ data, error }) => {
        if (cancelled || error) return
        const members = (data || [])
        setBoardMemberNames(members.map((m) => m.profiles?.display_name).filter(Boolean))
        setBoardMembers(members.map((m) => ({
          user_id: m.profiles?.id || m.user_id,
          display_name: m.profiles?.display_name || 'Unknown',
          color: m.profiles?.color || 'bg-[#E0DBD5]',
        })))
      })
    fetchComments(cardId)
    fetchActivity(cardId)
    fetchAttachments(cardId)

    return () => { cancelled = true }
  }, [cardId])

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

  const addCheckItem = (text) => {
    setChecklist([...checklist, { text, done: false }])
    scheduleSave()
  }

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

  return (
    <div className={`fixed bg-white border-l border-[#E0DBD5] flex flex-col z-20 ${
      isMobile
        ? 'inset-0'
        : 'top-16 right-0 bottom-0 w-[340px] lg:w-[420px] animate-slide-in-right'
    }`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#E8E2DB]">
        <div className="flex items-center gap-1">
          {isMobile && (
            <button
              type="button"
              onClick={handleSaveAndClose}
              aria-label="Back"
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
              aria-label="Close panel"
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
              aria-label={card.completed ? 'Mark as incomplete' : 'Mark as complete'}
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
            maxLength={200}
            aria-label="Task name"
            className={`text-lg font-semibold bg-transparent border-none focus:outline-none w-full placeholder-[#8E8E89] ${card.completed ? 'text-[#8E8E89] line-through' : 'text-[#1B1B18]'}`}
            placeholder="Task name"
          />
        </div>

        {/* Metadata fields */}
        <CardDetailFields
          card={card}
          cardId={cardId}
          assignee={assignee}
          setAssignee={setAssignee}
          priority={priority}
          setPriority={setPriority}
          dueDate={dueDate}
          setDueDate={setDueDate}
          labels={labels}
          setLabels={setLabels}
          scheduleSave={scheduleSave}
          renderAvatar={renderAvatar}
          boardMemberNames={boardMemberNames}
          boardName={boardName}
          statusName={statusName}
        />

        {/* Description */}
        <div className="px-5 pt-5 pb-2 border-t border-[#E8E2DB] mt-1">
          <label className="text-xs font-medium text-[#8E8E89] uppercase tracking-wider mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); scheduleSave() }}
            rows={4}
            maxLength={5000}
            placeholder="Add details about this task..."
            className="w-full text-sm text-[#5C5C57] rounded-lg px-3 py-2 resize-none border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6] placeholder-[#8E8E89]"
          />
        </div>

        <CardDetailComments
          comments={comments}
          commentText={commentText}
          setCommentText={setCommentText}
          addComment={addComment}
          deleteComment={deleteComment}
          cardId={cardId}
          card={card}
          boardMembers={boardMembers}
          notify={notify}
          profile={profile}
          userId={user?.id}
        />

        <CardDetailAttachments
          attachmentItems={attachmentItems}
          uploadAttachment={uploadAttachment}
          deleteAttachment={deleteAttachment}
          getAttachmentUrl={getAttachmentUrl}
          cardId={cardId}
          userId={user?.id}
        />

        <CardDetailChecklist
          checklist={checklist}
          onToggle={toggleCheckItem}
          onRemove={removeCheckItem}
          onAdd={addCheckItem}
        />

        <CardDetailActivity activityItems={activityItems} />
      </div>
    </div>
  )
})
