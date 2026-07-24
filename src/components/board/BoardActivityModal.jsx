import { useEffect, useMemo, useState } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { FileText, X } from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'
import DynamicIcon from './DynamicIcon'
import { useBoardStore } from '../../store/boardStore'
import { ACTIVITY_GROUPS, VERB_PHRASES, PAGE_SIZE } from '../../constants/activity'

function dayKey(iso) {
  return format(parseISO(iso), 'yyyy-MM-dd')
}

function dayLabel(iso) {
  const d = parseISO(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  const label = format(d, 'MMM d')
  return d.getFullYear() === new Date().getFullYear() ? label : `${label}, ${d.getFullYear()}`
}

// Board-wide activity feed. Anatomy matches WorkspaceCreateModal (header +
// X, panel styling on an inner wrapper — Modal's contentClassName only
// controls the outer backdrop's centering/positioning, not the panel look);
// rows are grouped by day; chips multi-select filter by action group.
export default function BoardActivityModal({ boardId, onClose }) {
  const rowsForBoard = useBoardStore((s) => s.boardActivity[boardId])
  const rows = useMemo(() => rowsForBoard || [], [rowsForBoard])
  const fetchBoardActivity = useBoardStore((s) => s.fetchBoardActivity)
  const [activeGroups, setActiveGroups] = useState(() => new Set())
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    fetchBoardActivity(boardId).then((n) => setHasMore(n === PAGE_SIZE))
  }, [boardId, fetchBoardActivity])

  const toggleGroup = (key) => {
    setActiveGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const actionToGroup = useMemo(() => {
    const m = {}
    ACTIVITY_GROUPS.forEach((g) => g.actions.forEach((a) => { m[a] = g.key }))
    return m
  }, [])

  const visible = useMemo(() => {
    if (activeGroups.size === 0) return rows
    return rows.filter((r) => activeGroups.has(actionToGroup[r.action]))
  }, [rows, activeGroups, actionToGroup])

  // Group by calendar day (yyyy-MM-dd), preserving desc order. Keying by the
  // raw date (not the display label) keeps distinct years from colliding —
  // two different Jan 5ths would otherwise share both a React key and a
  // visually ambiguous "Jan 5" header.
  const groups = useMemo(() => {
    const out = []
    let current = null
    visible.forEach((r) => {
      const key = dayKey(r.created_at)
      if (!current || current.key !== key) {
        current = { key, label: dayLabel(r.created_at), rows: [] }
        out.push(current)
      }
      current.rows.push(r)
    })
    return out
  }, [visible])

  const openCard = (row) => {
    if (!row.card_id) return
    window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: row.card_id } }))
    onClose()
  }

  const loadMore = async () => {
    if (!rows.length) return
    setLoadingMore(true)
    const oldest = rows[rows.length - 1].created_at
    const n = await fetchBoardActivity(boardId, { before: oldest })
    setHasMore(n === PAGE_SIZE)
    setLoadingMore(false)
  }

  return (
    <Modal
      open
      onClose={onClose}
      contentClassName="grid items-center justify-items-center overflow-y-auto md:p-10 p-4"
    >
      <div className="flex flex-col text-left shadow-[var(--shadow-raised)] border-0.5 border-[var(--border-default)] rounded-xl md:p-6 p-4 bg-[var(--surface-page)] w-full max-w-lg">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] flex w-full min-w-0 items-center leading-6 break-words">
            Activity
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors -mx-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type filter chips — multi-select, empty = all */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3 mb-2">
          {ACTIVITY_GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => toggleGroup(g.key)}
              aria-pressed={activeGroups.has(g.key)}
              className={`h-6 px-2 rounded-full border text-xs transition-colors cursor-pointer ${
                activeGroups.has(g.key)
                  ? 'bg-[var(--color-mauve-cream)] border-[var(--color-mauve)] text-[var(--text-primary)]'
                  : 'border-[var(--color-sand)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="h-[65vh] overflow-y-auto -mx-1 px-1">
          {groups.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              {rows.length === 0
                ? 'Nothing yet — activity shows up as your team works.'
                : 'No matching activity.'}
            </p>
          )}
          {groups.map((g) => (
            <div key={g.key}>
              <div className="pt-3 pb-1 font-mono text-[11px] uppercase tracking-wide text-[var(--text-faint)]">
                {g.label}
              </div>
              {g.rows.map((row) => {
                const dead = !row.card_id
                const title = row.meta?.card_title || 'a card'
                return (
                  <div key={row.id} className="py-1.5 flex items-start gap-2.5">
                    <Avatar name={row.actor_name} size="sm" className="mt-0.5" />
                    <div className="flex-1 min-w-0 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">{row.actor_name}</span>{' '}
                      {VERB_PHRASES[row.action] || row.action}{' '}
                      <button
                        type="button"
                        onClick={() => openCard(row)}
                        disabled={dead}
                        className={`inline-flex items-center gap-1 align-middle max-w-[220px] ${
                          dead
                            ? 'text-[var(--text-muted)] cursor-default'
                            : 'text-[var(--text-primary)] hover:underline cursor-pointer'
                        }`}
                      >
                        <span className="shrink-0 inline-flex">
                          {row.meta?.card_icon
                            ? <DynamicIcon name={row.meta.card_icon} className="w-3.5 h-3.5" />
                            : <FileText size={14} weight="regular" />}
                        </span>
                        <span className="truncate">{title}</span>
                      </button>
                      {row.detail && (
                        <span className="text-[var(--text-muted)]"> {row.detail}</span>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--text-faint)] mt-0.5">
                      {format(parseISO(row.created_at), 'HH:mm')}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2 my-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/50 rounded-lg transition-colors"
            >
              {loadingMore ? 'Loading…' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
