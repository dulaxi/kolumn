import { useState, memo } from 'react'

import { CalendarDot, CheckCircle, CheckSquare, FileText } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import DynamicIcon from './DynamicIcon'
import { LABEL_OUTLINE } from '../../utils/formatting'
import { selectCardLabels } from '../../store/selectors'
import { formatDueDateLabel, dueDateOutlineClass, parseDueDate } from '../../utils/dateUtils'
import Avatar from '../ui/Avatar'
import Tooltip from '../ui/Tooltip'
import { resolveProfileColor, COLOR_DOT_CLASSES } from '../../constants/colors'
import { usePresenceStore } from '../../store/presenceStore'
import { othersOnCard } from '../../store/presence'

export default memo(function Card({ card, onClick, onComplete, isSelected, iconOverride, ghost }) {
  const { title, description, priority, due_date: dueDate, checklist, completed, icon } = card
  const labels = useBoardStore(selectCardLabels(card.id))
  // Multi-assignee: prefer new `assignees` array; fall back to legacy single name
  const assignees = (card.assignees && card.assignees.length)
    ? card.assignees
    : (card.assignee_name ? [card.assignee_name] : [])
  const displayIcon = iconOverride || icon
  const updateCard = useBoardStore((s) => s.updateCard)
  const profile = useAuthStore((s) => s.profile)
  const font = useSettingsStore((s) => s.font)
  const labelStyle = useSettingsStore((s) => s.labelStyle)
  const toggleLabelStyle = useSettingsStore((s) => s.toggleLabelStyle)
  const iconStyle = useSettingsStore((s) => s.iconStyle)
  const toggleIconStyle = useSettingsStore((s) => s.toggleIconStyle)
  // While ghost mode is armed for this board, the card surfaces swap: default
  // becomes the page colour and hover lifts to the card colour.
  const ghostArmed = useSettingsStore((s) => !!s.ghostBoards?.[card.board_id])
  const [checklistOpen, setChecklistOpen] = useState(false)

  const presenceByCard = usePresenceStore((s) => s.byCard)
  // Teammates currently on this card (excludes you) — shown as haloed avatars
  // in the card's avatar row, not a whole-card ring.
  const watchers = othersOnCard(presenceByCard, card.id, profile?.id)

  const checkedCount = checklist?.filter((item) => item.done).length || 0
  const totalCount = checklist?.length || 0
  const hasChecklist = totalCount > 0

  const toggleCheckItem = (target) => {
    // Reconcile by item identity (id when present, else object reference) so a
    // reorder or concurrent edit can't flip the wrong row by stale index.
    const updated = checklist.map((item) =>
      (item.id ? item.id === target.id : item === target) ? { ...item, done: !item.done } : item
    )
    updateCard(card.id, { checklist: updated })
  }
  const hasDescription = description && description.trim().length > 0
  const hasAssignee = assignees.length > 0

  const dueDateObj = dueDate ? parseDueDate(dueDate) : null

  const fontStyle = font === 'sf-mono'
    ? { fontFamily: "'SF Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', monospace" }
    : undefined

  // The ghost placeholder itself always sits on the card surface (so it pops
  // against the armed board's page-coloured real cards). Otherwise ghost mode
  // swaps the two surface tokens for un-selected cards.
  const unselectedClasses = ghost
    ? 'bg-[var(--surface-card)] border-[var(--color-mist)]'
    : ghostArmed
      ? 'bg-[var(--surface-page)] border-[var(--color-mist)] hover:bg-[var(--surface-card)] hover:shadow-none hover:border-[var(--text-muted)]'
      : 'bg-[var(--surface-card)] border-[var(--color-mist)] hover:bg-[var(--surface-page)] hover:shadow-none hover:border-[var(--text-muted)]'

  return (
    <button
      type="button"
      aria-label={`Task: ${title}`}
      onClick={() => onClick(card.id)}
      style={fontStyle}
      className={`relative w-full flex flex-col gap-3 rounded-2xl border p-4 text-left shadow-sm transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 group ${
        isSelected
          ? 'bg-[var(--color-mauve-cream)] border-[var(--color-ink)]'
          : unselectedClasses
      }${ghost ? ' border-dashed' : ''}`}
    >
      {/* Ghost drains the CONTENT to grayscale + 75% opacity, leaving the
          card's own (dashed) border in full colour. `contents` = no layout
          change for normal cards. */}
      <div
        className={ghost ? 'flex flex-col gap-3 w-full' : 'contents'}
        style={ghost ? { filter: 'grayscale(1)', opacity: 0.75 } : undefined}
      >
      {/* Top row: icon + title + check */}
      <div className="flex items-center gap-3">
        {/* Icon — toggleable between "boxed" (40×40 raised container) and
            "plain" (bare 20×20 icon). Click toggles iconStyle in settingsStore.
            stopPropagation so card-open click handler doesn't fire. */}
        {iconStyle === 'plain' ? (
          <div
            onClick={(e) => { e.stopPropagation(); toggleIconStyle() }}
            className="w-5 h-5 shrink-0 flex items-center justify-center cursor-pointer"
          >
            {displayIcon ? (
              <DynamicIcon name={displayIcon} className="w-5 h-5 text-[var(--text-primary)]" />
            ) : (
              <FileText size={20} weight="regular" className="text-[var(--text-muted)]" />
            )}
          </div>
        ) : (
          <div
            onClick={(e) => { e.stopPropagation(); toggleIconStyle() }}
            className="flex w-10 h-10 shrink-0 items-center justify-center rounded-lg border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)] cursor-pointer"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {displayIcon ? (
                <DynamicIcon name={displayIcon} className="w-5 h-5 text-[var(--text-primary)]" />
              ) : (
                <FileText size={20} weight="regular" className="text-[var(--text-muted)]" />
              )}
            </div>
          </div>
        )}

        {/* Title + meta */}
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`text-sm font-medium flex-1 min-w-0 break-words ${completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
              {title}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onComplete) onComplete(card.id)
              }}
              aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
              className="shrink-0"
            >
              <CheckCircle className={`w-4 h-4 transition-colors ${completed ? 'text-[var(--color-lime-dark)]' : priority === 'high' ? 'text-[var(--color-copper)] hover:text-[var(--color-lime-dark)]' : priority === 'low' ? 'text-[var(--color-lime-dark)] hover:text-[var(--color-logo)]' : 'text-[var(--color-honey)] hover:text-[var(--color-lime-dark)]'}`} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)] min-w-0">
            {labels?.length > 0 && labels.map((label) => {
              const onLabelClick = (e) => { e.stopPropagation(); toggleLabelStyle() }
              if (labelStyle === 'dot') {
                return (
                  <Tooltip key={`${label.text}-${label.color}`} content={label.text}>
                    <span
                      onClick={onLabelClick}
                      className={`cursor-pointer w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_DOT_CLASSES[label.color] || COLOR_DOT_CLASSES.gray}`}
                    />
                  </Tooltip>
                )
              }
              if (labelStyle === 'alt') {
                const colorClasses = LABEL_OUTLINE[label.color] || LABEL_OUTLINE.gray
                return (
                  <span
                    key={`${label.text}-${label.color}`}
                    onClick={onLabelClick}
                    className={`cursor-pointer text-xs font-medium leading-[1.4] py-px px-1.5 border-[0.5px] rounded-md capitalize ${colorClasses}`}
                  >
                    {label.text}
                  </span>
                )
              }
              return (
                <span
                  key={`${label.text}-${label.color}`}
                  onClick={onLabelClick}
                  className="cursor-pointer font-medium text-[var(--text-secondary)] lowercase"
                >
                  /{label.text}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Description */}
      {hasDescription && (
        <p className="line-clamp-2 text-xs text-[var(--text-muted)] leading-relaxed break-words">
          {description}
        </p>
      )}

      {/* Bottom metadata row */}
      {(dueDateObj || hasChecklist || hasAssignee || watchers.length > 0) && (
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            {dueDateObj && (
              <span
                className={`font-medium flex items-center gap-1 rounded-full text-xs leading-[1.4] border-[0.5px] py-px px-1.5 ${dueDateOutlineClass(dueDateObj)}`}
              >
                <CalendarDot size={14} weight="regular" className="shrink-0 -mt-px" />
                {formatDueDateLabel(dueDateObj)}
              </span>
            )}

            {hasChecklist && (() => {
              const colorClasses = checkedCount === totalCount
                ? 'text-[var(--color-lime-dark)] border-[var(--color-lime-dark)]/30'
                : 'text-[var(--text-muted)] border-[var(--text-muted)]/30'
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setChecklistOpen(!checklistOpen)
                  }}
                  className={`font-medium flex items-center gap-1 rounded-full text-xs leading-[1.4] border-[0.5px] py-px px-1.5 transition-colors ${colorClasses}`}
                >
                  <CheckSquare size={14} weight="regular" className="shrink-0 -mt-px" />
                  {checkedCount}/{totalCount}
                </button>
              )
            })()}
          </div>

          <div className="flex items-center gap-1.5">
          {hasAssignee && (() => {
            const isMeName = (n) => profile?.display_name && n.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
            const { style: profileStyle, fallbackClass: profileFallback } = resolveProfileColor(profile?.color)
            // Identity comes from the per-entry ref id when present (rename- and
            // namesake-proof); fall back to name match for un-refed/legacy rows.
            const entries = (card.assignee_refs && card.assignee_refs.length)
              ? card.assignee_refs
              : assignees.map((name) => ({ name, id: null }))
            const isMeEntry = (e) => (e.id ? e.id === profile?.id : isMeName(e.name))
            const maxVisible = 3
            const visible = entries.slice(0, maxVisible)
            const overflow = Math.max(0, entries.length - maxVisible)
            return (
              <Tooltip content={entries.map((e) => e.name).join(', ')}>
                <span className="flex -space-x-1.5">
                  {visible.map((e, i) => {
                    const isMe = isMeEntry(e)
                    return isMe && profile?.icon ? (
                      <span
                        key={e.id || `${e.name}-${i}`}
                        className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ring-2 ring-[var(--surface-card)] ${profileFallback}`}
                        style={profileStyle}
                      >
                        <DynamicIcon name={profile.icon} className="w-3 h-3" />
                      </span>
                    ) : (
                      <Avatar key={e.id || `${e.name}-${i}`} name={e.name} size="sm" ringed className="text-[10px]" />
                    )
                  })}
                  {overflow > 0 && (
                    <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center ring-2 ring-[var(--surface-card)] bg-[var(--surface-hover)] text-[9px] font-medium text-[var(--text-secondary)]">
                      +{overflow}
                    </span>
                  )}
                </span>
              </Tooltip>
            )
          })()}
          {watchers.length > 0 && (
            <Tooltip content={`${watchers.map((w) => w.name).join(', ')} — here now`}>
              <span className="flex -space-x-1.5">
                {watchers.slice(0, 3).map((w) => {
                  const pc = resolveProfileColor(w.color)
                  return (
                    <span
                      key={w.user_id}
                      className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-medium ${pc.fallbackClass}`}
                      style={{ ...pc.style, boxShadow: `0 0 0 1.5px var(--surface-card), 0 0 0 3px ${pc.style?.background || 'var(--color-mist)'}` }}
                    >
                      {w.icon ? <DynamicIcon name={w.icon} className="w-3 h-3" /> : (w.name?.[0]?.toLowerCase() || '?')}
                    </span>
                  )
                })}
              </span>
            </Tooltip>
          )}
          </div>
        </div>
      )}

      {/* Expandable checklist — matches CardDetailPanel's CardChecklist style:
          CheckCircle icon button, no native checkbox. */}
      {hasChecklist && checklistOpen && (
        <div className="pt-2 border-t border-[var(--border-subtle)]" onClick={(e) => e.stopPropagation()}>
          {checklist.map((item, idx) => (
            <div key={item.id || `${item.text}-${idx}`} className="flex items-center gap-2 py-1">
              <button
                type="button"
                onClick={() => toggleCheckItem(item)}
                aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}
                className="shrink-0"
              >
                <CheckCircle
                  className={`w-4 h-4 transition-colors ${item.done ? 'text-[var(--color-lime-dark)]' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'}`}
                />
              </button>
              <span className={`text-xs ${item.done ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text-secondary)]'}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Ghost attribution — one appended line so nothing overlaps: the mover's
          avatar (left) + "<name> moved <when>". Only present on move ghosts. */}
      {ghost && (() => {
        const { style: moverStyle, fallbackClass: moverFallback } = resolveProfileColor(ghost.moverColor)
        return (
          <div className="flex items-center gap-2 pt-2.5 border-t border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)]">
            {ghost.moverIcon ? (
              <span
                className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ring-2 ring-[var(--surface-card)] ${moverFallback}`}
                style={moverStyle}
              >
                <DynamicIcon name={ghost.moverIcon} className="w-3 h-3" />
              </span>
            ) : (
              <Avatar name={ghost.moverName} size="sm" ringed className="text-[10px]" />
            )}
            <span className="truncate">{ghost.moverName} moved {ghost.when}</span>
          </div>
        )
      })()}
      </div>
    </button>
  )
})
