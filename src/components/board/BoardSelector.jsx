import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react'
import { Archive, Funnel, Tag, Users, X } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import PriorityFilter from './filters/PriorityFilter'
import AssigneeFilter from './filters/AssigneeFilter'
import LabelFilter from './filters/LabelFilter'
import DueFilter from './filters/DueFilter'
import SortFilter from './filters/SortFilter'
import ArchivedCardsPanel from './ArchivedCardsPanel'
import Tooltip from '../ui/Tooltip'

const BoardShareModal = lazy(() => import('./BoardShareModal'))

export default function BoardSelector({ filters, setFilters, sortBy, setSortBy, onManageLabels }) {
  const [showShareModal, setShowShareModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
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
  const unarchiveCard = useBoardStore((s) => s.unarchiveCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
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

  const uniqueAssignees = useMemo(() => {
    const names = new Set()
    boardCards.forEach((c) => {
      if (c.assignee_name && c.assignee_name.trim()) names.add(c.assignee_name.trim())
    })
    return Array.from(names).sort()
  }, [boardCards])

  const uniqueLabels = useMemo(() => {
    const labelMap = new Map()
    boardCards.forEach((c) => {
      if (c.labels && Array.isArray(c.labels)) {
        c.labels.forEach((lbl) => {
          if (lbl.text && !labelMap.has(lbl.text)) labelMap.set(lbl.text, lbl)
        })
      }
    })
    return Array.from(labelMap.values()).sort((a, b) => a.text.localeCompare(b.text))
  }, [boardCards])

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
          {/* Owner: full Share modal (invite + remove). Non-owner member:
              read-only Members modal (just see who's on the board). Same
              modal, isOwner flag inside drives the difference. */}
          {isRealBoard && (
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 h-8 px-2.5 text-sm text-[var(--text-secondary)] bg-[var(--surface-card)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all duration-75 cursor-pointer active:scale-[0.995]"
            >
              <Users className="w-4 h-4 -ml-0.5" />
              {isOwner ? 'Share' : 'Members'}
            </button>
          )}

          {isRealBoard && onManageLabels && (
            <button
              type="button"
              onClick={onManageLabels}
              className="flex items-center gap-1.5 h-8 px-2.5 text-sm text-[var(--text-secondary)] bg-[var(--surface-card)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all duration-75 cursor-pointer active:scale-[0.995]"
            >
              <Tag className="w-4 h-4 -ml-0.5" />
              Labels
            </button>
          )}

          {isRealBoard && <SortFilter sortBy={sortBy} setSortBy={setSortBy} />}

          {isRealBoard && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-1.5 h-8 px-2.5 text-sm rounded-lg border-[0.5px] transition-all duration-75 cursor-pointer active:scale-[0.995] ${
                showFilters || activeFilterCount > 0
                  ? 'bg-[var(--accent-lime-soft)] text-[var(--text-primary)] border-[var(--accent-lime-soft)]'
                  : 'text-[var(--text-secondary)] bg-[var(--surface-card)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Funnel className="w-4 h-4 -ml-0.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white bg-[var(--color-lime)] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
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

          {isRealBoard && archivedCards.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 h-8 px-2.5 text-sm rounded-lg border-[0.5px] transition-all duration-75 cursor-pointer active:scale-[0.995] ${
                showArchived
                  ? 'bg-[var(--color-honey-wash)] text-[var(--color-honey)] border-[var(--color-honey)]'
                  : 'text-[var(--text-secondary)] bg-[var(--surface-card)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Archive className="w-4 h-4 -ml-0.5" />
              Archived ({archivedCards.length})
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
    </>
  )
}
