import { useState, useEffect, useRef } from 'react'

import { CalendarDot, CheckCircle, CheckSquare, FileText, Plus, X } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import { useMenuState } from '../../hooks/useMenuState'
import { useCardEditState } from '../../hooks/useCardEditState'
import { useBoardMembers } from '../../hooks/useBoardMemberNames'
import { PRIORITY_OPTIONS } from '../../constants/colors'
import { formatDueDateLabel, dueDateBadgeClass, parseDueDate } from '../../utils/dateUtils'
import AssigneePicker from './cardDetail/AssigneePicker'
import LabelAutocomplete from './LabelAutocomplete'
import PriorityMenu from './PriorityMenu'
import Popover from '../ui/Popover'
import Tooltip from '../ui/Tooltip'
import { selectCardLabels } from '../../store/selectors'
import { usePresenceStore } from '../../store/presenceStore'

/**
 * InlineCardEditor — matches the new Card.jsx layout 1:1.
 * Every visual element is the same, but each is editable:
 *   - Icon container → click opens IconPicker
 *   - Title → inline input inside the title row
 *   - Check circle → priority color, click cycles priority
 *   - Labels row → label chips from store + LabelAutocomplete
 *   - Bottom row → date pill, checklist, assignee avatar (all clickable)
 *   - Description textarea appears inline when focused
 */
export default function InlineCardEditor({ cardId: rawCardId, onDone }) {
  const resolvedId = useBoardStore((s) => s._tempIdMap?.[rawCardId] || rawCardId)
  const card = useBoardStore((s) => s.cards[s._tempIdMap?.[rawCardId] || rawCardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const addLabelToCard = useBoardStore((s) => s.addLabelToCard)
  const removeLabelFromCard = useBoardStore((s) => s.removeLabelFromCard)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const profile = useAuthStore((s) => s.profile)

  const setViewingCard = usePresenceStore((s) => s.setViewingCard)
  useEffect(() => {
    setViewingCard(resolvedId)
    return () => setViewingCard(null)
  }, [resolvedId, setViewingCard])

  const isExistingCard = !!card?.id && !card?._optimistic

  // For existing (already-persisted) cards, labels come from the store.
  // useBoardStore selector must be called unconditionally — use resolvedId
  // and let the selector return EMPTY_LABELS if the card isn't found.
  const persistedLabels = useBoardStore(selectCardLabels(resolvedId))

  const {
    title, setTitle,
    assignees, setAssignees,
    priority, setPriority,
    dueDate, setDueDate,
    pendingLabels, setPendingLabels,
    description, setDescription,
    checklist,
  } = useCardEditState(card, { treatUntitledAsEmpty: true })

  const [showDescription, setShowDescription] = useState(() => !!card?.description)
  const members = useBoardMembers(card)
  // useMenuState fires onClose synchronously before unmount, so we can
  // hand control to LabelAutocomplete here to flush its typed text
  // before its DOM node disappears (the input's onBlur is too late —
  // by then the input is already unmounted).
  const labelAutocompleteRef = useRef(null)
  const [openMenu, setOpenMenu] = useMenuState((closingMenu) => {
    if (closingMenu === 'label') labelAutocompleteRef.current?.commit()
  })

  const titleRef = useRef(null)
  const rootRef = useRef(null)

  // Track pending labels to flush once the tempId resolves to a real card ID.
  const pendingLabelsRef = useRef(pendingLabels)
  pendingLabelsRef.current = pendingLabels

  useEffect(() => {
    if (titleRef.current) titleRef.current.focus()
  }, [])

  // Flush pendingLabels once the optimistic card becomes a real persisted card.
  // resolvedId changes from tempId → realId when _tempIdMap is updated.
  useEffect(() => {
    if (!resolvedId || resolvedId === rawCardId) return
    // resolvedId is now the real card ID
    const toFlush = pendingLabelsRef.current
    if (toFlush.length === 0) return
    for (const p of toFlush) {
      addLabelToCard(resolvedId, p.text, p.color)
    }
    setPendingLabels([])
  }, [resolvedId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!card) return null

  const priOption = PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1]
  const priColor = priority === 'high' ? 'var(--color-copper)' : priority === 'low' ? 'var(--color-lime-dark)' : 'var(--color-honey)'

  // Combined display: persisted labels (from store) for existing cards,
  // or pending labels for new (optimistic) cards.
  const displayedLabels = isExistingCard
    ? persistedLabels.map((l) => ({ key: l.id, text: l.text, color: l.color, persistedId: l.id }))
    : pendingLabels.map((p, i) => ({ key: `pending-${i}-${p.text}`, text: p.text, color: p.color, pendingIdx: i }))

  const boardIdForLabels = card?.board_id || activeBoardId

  const handleSave = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) { onDone(); return }
    updateCard(resolvedId, {
      title: trimmedTitle,
      assigneeRefs: assignees,
      priority,
      due_date: dueDate || null,
      description: description.trim(),
      checklist,
    })
    // If real ID is already resolved, flush any pending labels immediately.
    if (resolvedId !== rawCardId && pendingLabels.length > 0) {
      for (const p of pendingLabels) {
        addLabelToCard(resolvedId, p.text, p.color)
      }
      setPendingLabels([])
    }
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

  const dueDateObj = dueDate ? parseDueDate(dueDate) : null
  const hasChecklist = checklist.length > 0

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
            <PriorityMenu
              open={openMenu === 'priority'}
              onOpenChange={(next) => setOpenMenu(next ? 'priority' : null)}
              value={priority}
              onChange={(value) => { setPriority(value); setOpenMenu(null) }}
              className="shrink-0"
            >
              <Tooltip content={`Priority: ${priOption.label}`}>
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'priority' ? null : 'priority')}
                  aria-label="Set priority"
                >
                  <CheckCircle className="w-4 h-4 transition-colors" style={{ color: priColor }} />
                </button>
              </Tooltip>
            </PriorityMenu>
          </div>

          {/* Labels inline — chips + LabelAutocomplete */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] flex-wrap">
            {displayedLabels.map((d) => (
              <span key={d.key} className="relative inline-flex items-center group/label">
                <span className="font-medium text-[var(--text-secondary)] lowercase">/{d.text}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (isExistingCard) removeLabelFromCard(resolvedId, d.persistedId)
                    else setPendingLabels(pendingLabels.filter((_, i) => i !== d.pendingIdx))
                  }}
                  className="ml-0.5 opacity-0 group-hover/label:opacity-100 text-[var(--text-faint)] hover:text-[var(--label-red-text)] transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {openMenu === 'label' ? (
              <LabelAutocomplete
                ref={labelAutocompleteRef}
                boardId={boardIdForLabels}
                excludeIds={isExistingCard ? persistedLabels.map((l) => l.id) : []}
                onPick={(l) => {
                  if (isExistingCard) addLabelToCard(resolvedId, l.text, l.color)
                  else setPendingLabels([...pendingLabels, { text: l.text, color: l.color }])
                  setOpenMenu(null)
                }}
                onCreate={(text, color) => {
                  if (isExistingCard) addLabelToCard(resolvedId, text, color)
                  else setPendingLabels([...pendingLabels, { text, color }])
                  setOpenMenu(null)
                }}
                onManage={() => {
                  setOpenMenu(null)
                  window.dispatchEvent(new CustomEvent('kolumn:open-label-manager'))
                }}
                onClose={() => setOpenMenu(null)}
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
          <Popover
            open={openMenu === 'date'}
            onOpenChange={(next) => setOpenMenu(next ? 'date' : null)}
            placement="bottom-start"
            panel={
              <div className="flex flex-col gap-1 p-1">
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
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--color-copper)] transition-colors self-start"
                  >
                    Clear
                  </button>
                )}
              </div>
            }
          >
            {dueDateObj ? (
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'date' ? null : 'date')}
                className={`font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${dueDateBadgeClass(dueDateObj)}`}
              >
                <CalendarDot size={12} weight="bold" />
                {formatDueDateLabel(dueDateObj)}
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
          </Popover>

          {/* Checklist counter — only show if items */}
          {hasChecklist && (
            <span className="font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-hover)] text-[var(--text-muted)]">
              <CheckSquare size={12} weight="bold" />
              {checklist.filter((i) => i.done).length}/{checklist.length}
            </span>
          )}
        </div>

        <AssigneePicker
          assignees={assignees}
          setAssignees={setAssignees}
          members={members}
          profile={profile}
          open={openMenu === 'assignee'}
          onOpenChange={(next) => setOpenMenu(next === 'assignee' ? 'assignee' : null)}
          size="sm"
          placement="top-end"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => { deleteCard(resolvedId); onDone() }}
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--color-copper)] px-2 py-1 rounded-lg transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="text-[11px] font-medium text-[var(--btn-primary-text)] bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] px-3 py-1 rounded-lg transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}
