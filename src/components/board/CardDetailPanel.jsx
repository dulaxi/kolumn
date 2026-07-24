import { useState, useEffect, useRef, useCallback, memo } from 'react'

import { ArrowLeft, Bookmark, CalendarDot, ClockCounterClockwise, Copy, DotsThreeVertical, FileText, Flag, Paperclip, Plus, Trash, X } from '@phosphor-icons/react'
import DynamicIcon from './DynamicIcon'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useMenuState } from '../../hooks/useMenuState'
import { useCardEditState, cardAssigneeRefs } from '../../hooks/useCardEditState'
import { useBoardMembers } from '../../hooks/useBoardMemberNames'
import IconPicker from './IconPicker'
import LabelAutocomplete from './LabelAutocomplete'
import PriorityMenu from './PriorityMenu'
// Aliased: `Calendar` in this file is the Phosphor icon above.
import CalendarPicker from '../ui/Calendar'
import BoardActivityModal from './BoardActivityModal'
import { formatDueDateLabel, parseDueDate, dueDateOutlineClass } from '../../utils/dateUtils'
import Modal from '../ui/Modal'
import Popover from '../ui/Popover'
import Menu from '../ui/Menu'
import Tooltip from '../ui/Tooltip'
import AssigneePicker from './cardDetail/AssigneePicker'
import CardChecklist from './cardDetail/CardChecklist'
import CardFiles from './cardDetail/CardFiles'
import { showToast } from '../../utils/toast'
import { useTemplateStore } from '../../store/templateStore'
import { selectCardLabels } from '../../store/selectors'
import { usePresenceStore } from '../../store/presenceStore'
import { othersOnCard } from '../../store/presence'
import { resolveProfileColor, COLOR_DOT_CLASSES } from '../../constants/colors'

export default memo(function CardDetailPanel({ cardId, onClose }) {
  const card = useBoardStore((s) => s.cards[cardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const duplicateCard = useBoardStore((s) => s.duplicateCard)
  const addLabelToCard = useBoardStore((s) => s.addLabelToCard)
  const removeLabelFromCard = useBoardStore((s) => s.removeLabelFromCard)
  const addTemplate = useTemplateStore((s) => s.addTemplate)
  const attachmentItems = useBoardStore((s) => s.attachments[cardId])
  const fetchAttachments = useBoardStore((s) => s.fetchAttachments)
  const uploadAttachment = useBoardStore((s) => s.uploadAttachment)
  const deleteAttachment = useBoardStore((s) => s.deleteAttachment)
  const getAttachmentUrl = useBoardStore((s) => s.getAttachmentUrl)
  // Labels come from the store via selector — not local state.
  const labels = useBoardStore(selectCardLabels(cardId))
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  const setViewingCard = usePresenceStore((s) => s.setViewingCard)
  const presenceByCard = usePresenceStore((s) => s.byCard)
  const selfId = useAuthStore((s) => s.profile?.id)
  useEffect(() => {
    setViewingCard(cardId)
    return () => setViewingCard(null)
  }, [cardId, setViewingCard])
  const alsoHere = othersOnCard(presenceByCard, cardId, selfId)

  const {
    title, setTitle,
    description, setDescription,
    checklist, setChecklist,
    priority, setPriority,
    dueDate, setDueDate,
    assignees, setAssignees,
  } = useCardEditState(card)
  const [editingDescription, setEditingDescription] = useState(false)

  // Notion-style description: contentEditable div, NOT a textarea. View
  // and edit modes share the same DOM element so box dimensions are
  // guaranteed identical — no size jump when the user clicks to edit.
  // We set innerText via ref on mount instead of via children prop,
  // because React would otherwise reconcile and overwrite the user's
  // typing on any re-render mid-edit.
  useEffect(() => {
    if (!editingDescription || !descriptionRef.current) return
    const el = descriptionRef.current
    el.innerText = description || ''
    // Place caret at end of content
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(el)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
    el.focus()
  }, [editingDescription]) // eslint-disable-line react-hooks/exhaustive-deps
  // Single openMenu value: 'menu' | 'priority' | 'due' | 'assignee' | 'icon' | null
  const [openMenu, setOpenMenu, toggleMenu] = useMenuState()
  const titleRef = useRef(null)
  const descriptionRef = useRef(null)
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  // Legacy assignee fallback preserved — formDataRef initialization below still needs this local
  const initialAssignees = cardAssigneeRefs(card)
  const members = useBoardMembers(card)

  const isDirtyRef = useRef(false)
  const autoSaveTimerRef = useRef(null)
  const formDataRef = useRef({ title: card?.title || '', description: card?.description || '', assignees: [...initialAssignees], dueDate: card?.due_date || '', checklist: card?.checklist ? card.checklist.map((item) => ({ ...item })) : [], priority: card?.priority || 'medium' })

  useEffect(() => {
    if (card) fetchAttachments(cardId)
    // `card` is only an existence guard here — depending on it would refetch
    // attachments on every card edit. fetchAttachments is a stable store action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, fetchAttachments])

  // Re-sync local form state when the card is updated externally (AI tool
  // call, realtime broadcast from another client, etc.) and the user has no
  // pending unsaved edits. Without this, useCardEditState's lazy initializers
  // freeze the form at mount-time values and AI updates only show after a
  // page reload. Gating on isDirtyRef.current prevents clobbering in-progress
  // edits — if the user is mid-type, their unsaved changes win until autosave
  // fires (which resets isDirtyRef and lets the next external update through).
  useEffect(() => {
    if (!card) return
    if (isDirtyRef.current) return
    setTitle(card.title || '')
    setDescription(card.description || '')
    setPriority(card.priority || 'medium')
    setDueDate(card.due_date || '')
    setAssignees(
      cardAssigneeRefs(card)
    )
    setChecklist(card.checklist ? card.checklist.map((i) => ({ ...i })) : [])
    // Deliberately keyed on updated_at/id, not the full `card` object: the store
    // hands back a new card identity on every optimistic edit, and re-running
    // this sync then would clobber in-progress user input. Setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.updated_at, card?.id])

  const scheduleSave = useCallback(() => {
    isDirtyRef.current = true
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      if (cardId && formDataRef.current) {
        const d = formDataRef.current
        useBoardStore.getState().updateCard(cardId, {
          title: d.title.trim() || card?.title || 'Untitled task',
          description: d.description,
          assigneeRefs: d.assignees,
          due_date: d.dueDate || null,
          checklist: d.checklist,
          priority: d.priority,
        })
        isDirtyRef.current = false
      }
    }, 1000)
  }, [cardId, card?.title])

  useEffect(() => {
    formDataRef.current = { title, description, assignees, dueDate, checklist, priority }
  })

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      if (isDirtyRef.current && formDataRef.current && cardId) {
        // Bail if the card was deleted while the panel was open — otherwise
        // the optimistic spread in updateCard re-inserts a corrupt card row
        // (no id/board_id/column_id) and the user sees it "come back".
        if (!useBoardStore.getState().cards[cardId]) return
        const d = formDataRef.current
        useBoardStore.getState().updateCard(cardId, {
          title: d.title.trim() || 'Untitled task',
          description: d.description,
          assigneeRefs: d.assignees,
          due_date: d.dueDate || null,
          checklist: d.checklist,
          priority: d.priority,
        })
      }
    }
  }, [cardId])

  if (!card) return null

  const handleSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    isDirtyRef.current = false
    updateCard(cardId, { title: title.trim() || card.title, description, assigneeRefs: assignees, due_date: dueDate || null, checklist, priority })
  }

  const handleSaveAndClose = () => { handleSave(); onClose() }

  const priColor = priority === 'high' ? 'var(--color-copper)' : priority === 'low' ? 'var(--color-lime-dark)' : 'var(--color-honey)'

  return (
    <Modal
      open
      onClose={handleSaveAndClose}
      contentClassName="grid items-center justify-items-center overflow-y-auto overflow-x-hidden md:p-10 p-4"
      // Open in view-only mode — no element gets initial focus. The
      // previous fallback (first focusable = "All cards" back button)
      // showed a stray :focus-visible ring whenever the panel was opened
      // by keyboard (Enter from search). Tab still reaches everything
      // inside; we just don't pre-select anything.
      disableInitialFocus
    >
      {/* Card-family frame: matches Card.jsx (rounded-2xl + 1px mist border)
          so the detail view reads as the zoomed-in card, not a generic modal. */}
      <div
        className="flex flex-col text-left shadow-[var(--shadow-raised)] border border-[var(--color-mist)] rounded-2xl md:p-6 p-4 bg-[var(--surface-page)] w-full max-w-3xl min-h-[50vh] max-h-[90vh] overflow-hidden"
      >
        {/* Top bar — icon-only back on the left; actions on the right in
            three groups split by hairlines: card properties (due,
            priority) · content (attach) · card management (⋯, delete). */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <Tooltip content="Back to board" placement="bottom">
            <button
              type="button"
              onClick={handleSaveAndClose}
              aria-label="Back to board"
              className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Tooltip>
          {/* Labels — beside the back button; bordered chips with the
              label's color dot, X reveals inside the chip on hover. */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            {labels.map((l) => (
              <span
                key={l.id}
                className="group/label inline-flex items-center gap-1.5 h-6 pl-2 pr-1.5 rounded-full border border-[var(--color-sand)] text-xs lowercase text-[var(--text-secondary)]"
              >
                <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT_CLASSES[l.color] || 'bg-[var(--text-faint)]'}`} />
                /{l.text}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeLabelFromCard(cardId, l.id) }}
                  aria-label={`Remove label ${l.text}`}
                  className="w-0 overflow-hidden group-hover/label:w-3 flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--label-red-text)] transition-all"
                >
                  <X className="w-3 h-3 shrink-0" />
                </button>
              </span>
            ))}
            {showLabelForm ? (
              <LabelAutocomplete
                boardId={card.board_id}
                excludeIds={labels.map((l) => l.id)}
                onPick={(l) => { addLabelToCard(cardId, l.text, l.color); setShowLabelForm(false) }}
                onCreate={(text, color) => { addLabelToCard(cardId, text, color); setShowLabelForm(false) }}
                onManage={() => {
                  setShowLabelForm(false)
                  window.dispatchEvent(new CustomEvent('kolumn:open-label-manager'))
                }}
                onClose={() => setShowLabelForm(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowLabelForm(true)}
                className={`inline-flex items-center justify-center h-6 rounded-full border border-dashed border-[var(--border-default)] text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:border-[var(--text-muted)] transition-colors cursor-pointer ${
                  labels.length === 0 ? 'gap-1 px-2 text-xs' : 'w-6'
                }`}
              >
                <Plus className="w-3 h-3" />
                {labels.length === 0 && <span>Label</span>}
              </button>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1">
            {/* Priority flag */}
            <PriorityMenu
              open={openMenu === 'priority'}
              onOpenChange={(next) => setOpenMenu(next ? 'priority' : null)}
              value={priority}
              onChange={(value) => { setPriority(value); setOpenMenu(null); scheduleSave() }}
            >
              <button
                type="button"
                onClick={() => toggleMenu('priority')}
                aria-label="Set priority"
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <Flag className="w-4 h-4" fill={priColor} style={{ color: priColor }} />
              </button>
            </PriorityMenu>
            <span aria-hidden="true" className="w-px h-5 bg-[var(--border-subtle)] mx-1" />
            {/* Attach file */}
            <Tooltip content="Attach files" placement="bottom">
            <label
              className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              aria-label="Attach files"
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
                    } catch {
                      showToast.error(`Failed to upload ${file.name}`)
                    }
                  }
                  e.target.value = ''
                }}
              />
            </label>
            </Tooltip>
            <span aria-hidden="true" className="w-px h-5 bg-[var(--border-subtle)] mx-1" />
            {/* 3-dot menu — Delete pulled out so it's directly clickable.
                Duplicate + Template stay here as secondary actions. */}
            <Menu
              open={openMenu === 'menu'}
              onOpenChange={(next) => setOpenMenu(next ? 'menu' : null)}
              placement="bottom-end"
              panelClassName="w-44"
              panel={
                <>
                  <Menu.Item
                    icon={<Copy size={16} />}
                    onSelect={() => { duplicateCard(cardId); showToast.success('Duplicated'); setOpenMenu(null) }}
                  >
                    Duplicate
                  </Menu.Item>
                  <Menu.Item
                    icon={<Bookmark size={16} />}
                    onSelect={() => {
                      addTemplate({
                        name: card.title,
                        title: card.title,
                        description: card.description || '',
                        priority: card.priority || 'medium',
                        // Store-managed labels — card.labels (legacy jsonb) is
                        // empty for them; capture text+color specs instead.
                        labels: labels.map((l) => ({ text: l.text, color: l.color })),
                        checklist: (card.checklist || []).map((item) => ({ text: item.text, done: false })),
                      })
                      showToast.success('Saved as template')
                      setOpenMenu(null)
                    }}
                  >
                    Template
                  </Menu.Item>
                  <Menu.Item
                    icon={<ClockCounterClockwise size={16} />}
                    onSelect={() => { setShowActivity(true); setOpenMenu(null) }}
                  >
                    Activity
                  </Menu.Item>
                </>
              }
            >
              <button
                type="button"
                onClick={() => toggleMenu('menu')}
                aria-label="More options"
                className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <DotsThreeVertical className="w-5 h-5" />
              </button>
            </Menu>
            {/* Delete — promoted out of the 3-dot menu so it's a direct
                one-click action. Red tint flags it as destructive. */}
            <Tooltip content="Delete card" placement="bottom">
              <button
                type="button"
                onClick={() => {
                  // Clear dirty flag first so the cleanup effect skips the
                  // save-on-unmount and doesn't fight the optimistic delete.
                  isDirtyRef.current = false
                  deleteCard(cardId)
                  onClose()
                }}
                aria-label="Delete card"
                className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--label-red-text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <Trash className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {alsoHere.length > 0 && (() => {
          const lead = alsoHere[0]
          const { style } = resolveProfileColor(lead.color)
          return (
            <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded-full" style={style} />
              <span><b className="font-medium text-[var(--text-primary)]">{lead.name}</b>
                {alsoHere.length > 1 ? ` +${alsoHere.length - 1}` : ''} {alsoHere.length > 1 ? 'are' : 'is'} here</span>
            </div>
          )
        })()}

        {/* Icon + Title + Assignee */}
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
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0 flex-1">
              <span
                ref={titleRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setTitle(e.currentTarget.textContent || '')}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
                onBlur={() => scheduleSave()}
                // Notion-style inline edit — no border, no padding, no
                // focus box. Same visual whether viewing or editing; the
                // contentEditable + cursor-text affordance signals that
                // it's editable without chrome.
                className="font-heading font-[425] text-[var(--text-primary)] text-left text-[22px] cursor-text focus:outline-none break-words min-w-0 flex-1"
              >
                {card?.title || 'Untitled task'}
              </span>
              {/* Labels relocated to the action row above so the title
                  stays clean and uncrowded. */}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Description — same DOM element across view + edit modes
              so box dimensions never shift on click. Read-only divs and
              the contentEditable share the exact `text-sm leading-relaxed
              py-1 whitespace-pre-wrap` footprint. */}
          {editingDescription ? (
            <div
              ref={descriptionRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                setDescription(e.currentTarget.innerText.trim())
                setEditingDescription(false)
                scheduleSave()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
              className="text-sm text-[var(--text-secondary)] leading-relaxed cursor-text whitespace-pre-wrap py-1 focus:outline-none"
            />
          ) : description ? (
            <div
              className="text-sm text-[var(--text-secondary)] leading-relaxed cursor-text whitespace-pre-wrap py-1 hover:text-[var(--text-primary)] transition-colors"
              onClick={() => setEditingDescription(true)}
            >
              {description}
            </div>
          ) : (
            <div
              className="text-sm text-[var(--text-faint)] leading-relaxed cursor-text whitespace-pre-wrap py-1 hover:text-[var(--text-muted)] transition-colors"
              onClick={() => setEditingDescription(true)}
            >
              Add a description…
            </div>
          )}

          <CardChecklist
            checklist={checklist}
            setChecklist={setChecklist}
            scheduleSave={scheduleSave}
          />

          <CardFiles
            cardId={cardId}
            attachmentItems={attachmentItems}
            getAttachmentUrl={getAttachmentUrl}
            deleteAttachment={deleteAttachment}
          />
        </div>

        {/* Footer — mirrors the board card's bottom row: deadline pill
            bottom-left, assignee avatars bottom-right. Pinned below the
            scrolling content; pickers open upward. */}
        <div className="shrink-0 flex items-center justify-between pt-3 mt-3">
          <Popover
            open={openMenu === 'due'}
            onOpenChange={(next) => setOpenMenu(next ? 'due' : null)}
            placement="top-start"
            portal
            panel={
              <CalendarPicker
                value={dueDate ? dueDate.split('T')[0] : ''}
                onChange={(iso) => {
                  setDueDate(iso ? `${iso}T23:59:59` : '')
                  setOpenMenu(null)
                  scheduleSave()
                }}
              />
            }
          >
            {dueDate ? (() => {
              const d = parseDueDate(dueDate)
              return (
                <Tooltip content={`Due: ${d.toLocaleDateString()}`} placement="top">
                  <button
                    type="button"
                    onClick={() => toggleMenu('due')}
                    aria-label="Change due date"
                    className={`font-medium flex items-center gap-1 rounded-full text-xs leading-[1.4] border-[0.5px] py-px px-1.5 cursor-pointer ${dueDateOutlineClass(d)}`}
                  >
                    <CalendarDot size={14} weight="regular" className="shrink-0 -mt-px" />
                    {formatDueDateLabel(d)}
                  </button>
                </Tooltip>
              )
            })() : (
              <button
                type="button"
                onClick={() => toggleMenu('due')}
                aria-label="Set due date"
                className="flex items-center gap-1 h-6 px-2 rounded-full border border-dashed border-[var(--border-default)] text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:border-[var(--text-muted)] transition-colors cursor-pointer"
              >
                <CalendarDot size={14} weight="regular" className="shrink-0 -mt-px" />
                Deadline
              </button>
            )}
          </Popover>

          <AssigneePicker
            assignees={assignees}
            setAssignees={setAssignees}
            members={members}
            profile={profile}
            scheduleSave={scheduleSave}
            open={openMenu === 'assignee'}
            onOpenChange={(next) => setOpenMenu(next === 'assignee' ? 'assignee' : null)}
            placement="top-end"
          />
        </div>
      </div>

      {/* Per-card activity feed — stacks above this modal (Modal primitive
          is stacked-aware; only the topmost responds to Escape). */}
      {showActivity && (
        <BoardActivityModal
          boardId={card.board_id}
          cardId={cardId}
          onClose={() => setShowActivity(false)}
        />
      )}
    </Modal>
  )
})
