import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react'
import { Archive, CaretRight, ClockCounterClockwise, Funnel, Tag, X } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import PriorityFilter from './filters/PriorityFilter'
import AssigneeFilter from './filters/AssigneeFilter'
import LabelFilter from './filters/LabelFilter'
import DueFilter from './filters/DueFilter'
import SortFilter from './filters/SortFilter'
import ArchivedCardsPanel from './ArchivedCardsPanel'
import GhostToggle from './GhostToggle'
import BoardActivityModal from './BoardActivityModal'
import Tooltip from '../ui/Tooltip'
import { TOOLBAR_BTN, TOOLBAR_ICON_BTN, TOOLBAR_BTN_FILL } from '../../constants/buttonStyles'

const BoardShareModal = lazy(() => import('./BoardShareModal'))

export default function BoardSelector({ filters, setFilters, sortBy, setSortBy, onManageLabels }) {
  const [showShareModal, setShowShareModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  // Collapsible tool cluster (Labels / Sort / Filter / Archived) — hidden by
  // default behind the rotating caret so the board header starts quiet.
  const [toolsOpen, setToolsOpen] = useState(false)
  const [toolsOverflowVisible, setToolsOverflowVisible] = useState(false)

  useEffect(() => {
    if (toolsOpen) {
      const t = setTimeout(() => setToolsOverflowVisible(true), 320)
      return () => clearTimeout(t)
    }
    setToolsOverflowVisible(false)
  }, [toolsOpen])
  const [showArchived, setShowArchived] = useState(false)
  // The drawer keeps overflow hidden during the open/close animation so the
  // pills don't spill out, then unhides it once the drawer is fully open so
  // individual filter popovers can drop below the toolbar without being
  // clipped.
  const [drawerOverflowVisible, setDrawerOverflowVisible] = useState(false)

  useEffect(() => {
    if (showFilters) {
      const t = setTimeout(() => setDrawerOverflowVisible(true), 320)
      return () => clearTimeout(t)
    }
    setDrawerOverflowVisible(false)
  }, [showFilters])

  const boards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const cards = useBoardStore((s) => s.cards)
  const columns = useBoardStore((s) => s.columns)
  const storeLabels = useBoardStore((s) => s.labels)
  const cardLabels = useBoardStore((s) => s.cardLabels)
  const unarchiveCard = useBoardStore((s) => s.unarchiveCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const fetchArchivedCount = useBoardStore((s) => s.fetchArchivedCount)
  const fetchArchivedCards = useBoardStore((s) => s.fetchArchivedCards)
  const archivedLoaded = useBoardStore((s) => s._loadedArchivedBoards.has(activeBoardId))
  const archivedCountRemote = useBoardStore((s) => s._archivedCounts[activeBoardId])
  const user = useAuthStore((s) => s.user)

  const activeBoard = boards[activeBoardId]
  const isOwner = activeBoard && user && activeBoard.owner_id === user.id
  const isRealBoard = !!activeBoardId && activeBoardId !== '__all__'

  const boardCards = useMemo(() => {
    if (!isRealBoard) return []
    return Object.values(cards).filter((c) => c.board_id === activeBoardId && !c.archived)
  }, [cards, activeBoardId, isRealBoard])

  const archivedCards = useMemo(() => {
    if (!isRealBoard) return []
    return Object.values(cards).filter((c) => c.board_id === activeBoardId && c.archived)
  }, [cards, activeBoardId, isRealBoard])

  // Archived cards no longer ride the boot/cross-board load — they're fetched
  // on demand per board. Head-count them when a board is viewed (drives the
  // toggle's visibility + count); load the rows only when the view opens. Once
  // loaded, the store-derived archivedCards.length is authoritative (it also
  // reflects in-session archives); before that, fall back to the head count.
  useEffect(() => {
    if (isRealBoard) fetchArchivedCount(activeBoardId)
  }, [isRealBoard, activeBoardId, fetchArchivedCount])

  useEffect(() => {
    if (showArchived && isRealBoard) fetchArchivedCards(activeBoardId)
  }, [showArchived, isRealBoard, activeBoardId, fetchArchivedCards])

  const displayArchivedCount = archivedLoaded ? archivedCards.length : (archivedCountRemote ?? archivedCards.length)

  const uniqueAssignees = useMemo(() => {
    const names = new Set()
    boardCards.forEach((c) => {
      // Full multi-assignee list, same fallback as cardFilters' matcher —
      // assignee_name alone is only the FIRST assignee's mirror and drops
      // everyone else (members and free-text alike) from the options.
      const list = (c.assignees && c.assignees.length)
        ? c.assignees
        : (c.assignee_name ? [c.assignee_name] : [])
      list.forEach((n) => { if (n && n.trim()) names.add(n.trim()) })
    })
    return Array.from(names).sort()
  }, [boardCards])

  const uniqueLabels = useMemo(() => {
    // Labels live in the normalized store (labels map + cardLabels join) —
    // the legacy c.labels jsonb column is empty for store-managed labels,
    // which left this filter with no options. Same source the matcher uses
    // (Column enriches _labelTexts from cardLabels).
    const labelMap = new Map()
    boardCards.forEach((c) => {
      ;[...(cardLabels[c.id] || [])].forEach((lid) => {
        const l = storeLabels[lid]
        if (l?.text && !labelMap.has(l.text)) labelMap.set(l.text, l)
      })
    })
    return Array.from(labelMap.values()).sort((a, b) => a.text.localeCompare(b.text))
  }, [boardCards, cardLabels, storeLabels])

  const activeFilterCount =
    (filters?.priority?.length || 0) +
    (filters?.assignee ? 1 : 0) +
    (filters?.label?.length || 0) +
    (filters?.due ? 1 : 0)

  const clearFilters = useCallback(() => {
    setFilters({ priority: [], assignee: null, label: [], due: null })
  }, [setFilters])

  return (
    <>
      <div className="space-y-2">
        {/* Single row — when filters expand, the new pills appear inline
            BEFORE the Archived button so the existing buttons compact
            left and the filter pills consume horizontal space rather
            than adding a second row (which would change the toolbar
            height + push the divider down). flex-wrap permits graceful
            wrapping only when truly out of room. */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Rotating caret — the toolbar's single handle. Points right when
              the tools are tucked away, flips to point left when open. */}
          {isRealBoard && (
            <Tooltip content={toolsOpen ? 'Hide board tools' : 'Show board tools'}>
              <button
                type="button"
                aria-label={toolsOpen ? 'Hide board tools' : 'Show board tools'}
                aria-expanded={toolsOpen}
                onClick={() => {
                  const next = !toolsOpen
                  setToolsOpen(next)
                  if (!next) setShowFilters(false)
                }}
                // Ghost styling on purpose: blends with the page bg (no fill,
                // no shadow) — the caret is a handle, not a tool.
                className="relative flex items-center justify-center h-8 w-8 rounded-lg transition-colors duration-75 cursor-pointer active:scale-[0.995] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              >
                {/* Toolbar is right-anchored, so expansion unfolds leftward:
                    closed points left (where tools will appear), open points
                    right (where they tuck back in). */}
                <CaretRight className={`w-4 h-4 transition-transform duration-300 ${toolsOpen ? '' : 'rotate-180'}`} />
              </button>
            </Tooltip>
          )}

          {/* Tool cluster — glides open exactly like the filter drawer:
              max-width animates, overflow unhides after the transition so
              the tools' own popovers can drop below. */}
          {isRealBoard && (
          <div
            inert={!toolsOpen ? '' : undefined}
            aria-hidden={!toolsOpen || undefined}
            className={`inline-flex items-center gap-2 ${
              toolsOverflowVisible ? 'overflow-visible' : 'overflow-hidden'
            }`}
            style={{
              maxWidth: toolsOpen ? '1100px' : 0,
              opacity: toolsOpen ? 1 : 0,
              transition:
                'max-width 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-out 80ms',
            }}
          >
          {/* Ghost — first of the four tools (moved here from BoardsPage
              so it collapses with the rest of the cluster) */}
          <GhostToggle boardId={activeBoardId} />
          <Tooltip content="Activity">
            <button
              type="button"
              aria-label="Board activity"
              onClick={() => setShowActivity(true)}
              className={`${TOOLBAR_ICON_BTN} ${TOOLBAR_BTN_FILL}`}
            >
              <ClockCounterClockwise className="w-4 h-4" />
            </button>
          </Tooltip>
          {isRealBoard && onManageLabels && (
            <Tooltip content="Labels">
              <button
                type="button"
                aria-label="Labels"
                onClick={onManageLabels}
                className={`${TOOLBAR_ICON_BTN} ${TOOLBAR_BTN_FILL}`}
              >
                <Tag className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {isRealBoard && <SortFilter sortBy={sortBy} setSortBy={setSortBy} />}

          {isRealBoard && (
            <Tooltip content="Filter">
              <button
                type="button"
                aria-label="Filter"
                onClick={() => setShowFilters(!showFilters)}
                className={`${TOOLBAR_ICON_BTN} ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
                    : TOOLBAR_BTN_FILL
                }`}
              >
                <Funnel className="w-4 h-4" weight={showFilters || activeFilterCount > 0 ? 'fill' : 'regular'} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-semibold text-[var(--btn-primary-text)] bg-[var(--btn-primary-bg)] rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </Tooltip>
          )}

          {/* Filter pills — drawer expansion. Pills live in a wrapper whose
              max-width animates from 0 → expanded. Because the wrapper is a
              flex child, the surrounding buttons (Share/Sort/Filter) glide
              left continuously as it grows — no separate animation needed.
              Overflow stays hidden during the transition (so pills don't
              spill out) and switches to visible once open, so the individual
              filter popovers can drop below without being clipped. */}
          {isRealBoard && (
            <div
              inert={!showFilters ? '' : undefined}
              aria-hidden={!showFilters || undefined}
              className={`inline-flex items-center gap-2 ${
                drawerOverflowVisible ? 'overflow-visible' : 'overflow-hidden'
              }`}
              style={{
                maxWidth: showFilters ? '800px' : 0,
                opacity: showFilters ? 1 : 0,
                transition:
                  'max-width 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-out 80ms',
              }}
            >
              <PriorityFilter filters={filters} setFilters={setFilters} />
              <AssigneeFilter filters={filters} setFilters={setFilters} assignees={uniqueAssignees} />
              <LabelFilter filters={filters} setFilters={setFilters} labels={uniqueLabels} />
              <DueFilter filters={filters} setFilters={setFilters} />
              {/* Clear all — icon-only X button. When filters are active, the
                  icon takes the copper/destructive tint so the user reads it
                  as "live, click to clear." When idle, it stays faint and
                  inert-looking. */}
              <Tooltip content={activeFilterCount > 0 ? 'Clear all filters' : 'Close filters'}>
                <button
                  type="button"
                  onClick={() => {
                    if (activeFilterCount > 0) clearFilters()
                    else setShowFilters(false)
                  }}
                  aria-label={activeFilterCount > 0 ? 'Clear all filters' : 'Close filters'}
                  className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] transition-colors ${
                    activeFilterCount > 0
                      ? 'text-[var(--color-copper)] hover:text-[var(--color-copper)]'
                      : 'text-[var(--text-faint)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          )}

          {isRealBoard && displayArchivedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className={`${TOOLBAR_BTN} ${
                showArchived
                  ? 'bg-[var(--color-honey-wash)] text-[var(--notice-warn-text)]'
                  : TOOLBAR_BTN_FILL
              }`}
            >
              <Archive className="w-4 h-4 -ml-0.5" weight={showArchived ? 'fill' : 'regular'} />
              Archived ({displayArchivedCount})
            </button>
          )}
          </div>
          )}

          {/* Share sits at the far right of the toolbar, text-only. Owner: full
              Share modal (invite + remove). Non-owner member: read-only Members
              modal. Same modal; isOwner drives the difference. */}
          {isRealBoard && (
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className={`ml-auto ${TOOLBAR_BTN} ${TOOLBAR_BTN_FILL}`}
            >
              {isOwner ? 'Share' : 'Members'}
            </button>
          )}

        </div>

        {showArchived && (
          <ArchivedCardsPanel
            archivedCards={archivedCards}
            columns={columns}
            onClose={() => setShowArchived(false)}
            onRestore={unarchiveCard}
            onDelete={deleteCard}
          />
        )}
      </div>

      {showShareModal && activeBoard && (
        <Suspense fallback={null}>
          <BoardShareModal
            board={activeBoard}
            onClose={() => setShowShareModal(false)}
          />
        </Suspense>
      )}

      {showActivity && isRealBoard && (
        <BoardActivityModal boardId={activeBoardId} onClose={() => setShowActivity(false)} />
      )}
    </>
  )
}
