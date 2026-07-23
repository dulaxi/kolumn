import { useState, useMemo, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Tag } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { selectBoardLabels } from '../../store/selectors'
import { LABEL_COLORS, COLOR_DOT_CLASSES } from '../../constants/colors'

function fuzzyScore(text, query) {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (t.startsWith(q)) return 0
  if (t.includes(q)) return 1
  let qi = 0
  for (const ch of t) if (ch === q[qi]) qi++
  return qi === q.length ? 2 : Infinity
}

const LabelAutocomplete = forwardRef(function LabelAutocomplete(
  { boardId, excludeIds = [], onPick, onCreate, onManage, onClose },
  ref,
) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [newColor, setNewColor] = useState('blue')
  const allLabels = useBoardStore(selectBoardLabels(boardId))
  const inputRef = useRef(null)

  // The dropdown portals to body (fixed) so the column's scroll container
  // can't clip it and it never runs off the viewport: left is clamped to
  // the screen, and it flips above the input when out of room below.
  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  const [coords, setCoords] = useState(null)
  const PANEL_W = 220

  const updatePosition = useCallback(() => {
    const a = wrapRef.current
    if (!a) return
    const r = a.getBoundingClientRect()
    const gap = 6
    const panelH = panelRef.current?.offsetHeight || 0
    const left = Math.round(Math.min(Math.max(r.left, 8), window.innerWidth - PANEL_W - 8))
    const spaceBelow = window.innerHeight - r.bottom - gap
    const openBottom = panelH <= spaceBelow || spaceBelow >= r.top - gap
    const next = openBottom
      ? { top: Math.round(r.bottom + gap), left }
      : { bottom: Math.round(window.innerHeight - r.top + gap), left }
    // Identity-stable so the every-render re-measure below can't loop.
    setCoords((prev) =>
      prev && prev.top === next.top && prev.bottom === next.bottom && prev.left === next.left ? prev : next
    )
  }, [])

  useEffect(() => {
    const onMove = () => updatePosition()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [updatePosition])

  // Re-measure on every render: typing changes the list, which changes the
  // panel height, which can change the flip decision. Identity-stable
  // setCoords makes this settle instead of looping.
  useEffect(() => { updatePosition() })

  const filtered = useMemo(() => {
    const ex = new Set(excludeIds)
    const visible = allLabels.filter((l) => !ex.has(l.id))
    if (!query.trim()) return visible
    const scored = visible
      .map((l) => ({ l, s: fuzzyScore(l.text, query.trim()) }))
      .filter(({ s }) => s !== Infinity)
      .sort((a, b) => a.s - b.s)
    return scored.map(({ l }) => l)
  }, [allLabels, query, excludeIds])

  const exactMatch = useMemo(
    () => allLabels.find((l) => l.text.toLowerCase() === query.trim().toLowerCase()),
    [allLabels, query],
  )

  // Commit the typed text. `requireQuery` distinguishes Enter (commit
  // the highlighted item even when input is empty) from blur (only
  // commit if the user actually typed — empty blur means "close").
  const commit = ({ requireQuery }) => {
    const q = query.trim()
    if (requireQuery && !q) return false
    if (filtered[highlight]) {
      onPick(filtered[highlight])
      return true
    }
    if (q && !exactMatch) {
      onCreate(q, newColor)
      return true
    }
    return false
  }

  const handleEnter = () => {
    commit({ requireQuery: false })
    setQuery('')
    setHighlight(0)
  }

  // Click-away should feel like Enter: if the user typed something,
  // register it. Otherwise just close the popover.
  const handleBlur = () => {
    if (!commit({ requireQuery: true })) onClose?.()
    setQuery('')
    setHighlight(0)
  }

  // Parent (e.g. useMenuState's outside-click) can call commit() before
  // unmounting so typed text is captured even when blur won't fire.
  useImperativeHandle(ref, () => ({
    commit: () => {
      commit({ requireQuery: true })
    },
  }), [filtered, highlight, query, newColor, exactMatch]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrapRef} className="relative" data-menu-root>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setHighlight(0) }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleEnter() }
          else if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
          else if (e.key === 'ArrowDown') { setHighlight((h) => Math.min(h + 1, filtered.length - 1)) }
          else if (e.key === 'ArrowUp')   { setHighlight((h) => Math.max(h - 1, 0)) }
        }}
        placeholder="/label"
        autoFocus
        className="text-xs text-[var(--text-secondary)] lowercase bg-transparent border-none focus:outline-none w-24 placeholder-[var(--text-faint)]"
      />
      {/* Standard dropdown surface (PANEL_BASE in ui/Popover) — kept outside
          Popover because this combobox is "open while mounted" and its
          blur/commit wiring owns the close lifecycle. Anatomy mirrors
          WorkspaceDropdown: inset rounded rows, sectioned footer action.
          Portaled to body: mounted off-screen until first measure so the
          flip/clamp math always sees a real panel height. */}
      {createPortal(
      <div
        ref={panelRef}
        data-menu-root
        style={{ position: 'fixed', ...(coords || { top: -9999, left: -9999 }) }}
        className="z-50 w-[220px] bg-[var(--surface-card)] border border-[var(--color-mist)] rounded-[10px] shadow-[0_10px_30px_rgba(27,27,24,0.10),0_2px_6px_rgba(27,27,24,0.04)] animate-dropdown overflow-hidden">
        {filtered.length > 0 && (
          <div className="max-h-[224px] overflow-y-auto p-1">
            {filtered.map((l, i) => (
              <button
                key={l.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPick(l); setQuery(''); setHighlight(0) }}
                className={`w-full flex items-center gap-2 h-8 px-2 text-sm rounded-lg text-left ${
                  i === highlight ? 'bg-[var(--surface-raised)]' : 'hover:bg-[var(--surface-raised)]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT_CLASSES[l.color] || ''}`} />
                <span className="text-[var(--text-secondary)] lowercase truncate">{l.text}</span>
              </button>
            ))}
          </div>
        )}
        {query.trim() && !exactMatch && (
          <div className={`p-1 ${filtered.length > 0 ? 'border-t border-[var(--border-subtle)]' : ''}`}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onCreate(query.trim(), newColor); setQuery(''); setHighlight(0) }}
              className="w-full flex items-center gap-2 h-8 px-2 text-sm rounded-lg text-left hover:bg-[var(--surface-raised)]"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT_CLASSES[newColor]}`} />
              <span className="text-[var(--text-faint)] shrink-0">Create</span>
              <span className="text-[var(--text-secondary)] lowercase truncate">/{query.trim()}</span>
            </button>
            <div className="flex items-center justify-start gap-1.5 px-2 pb-1.5 pt-1.5">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); setNewColor(c) }}
                  aria-label={`Use ${c}`}
                  className={`w-3 h-3 rounded-full ${COLOR_DOT_CLASSES[c]} ${
                    newColor === c
                      ? 'ring-1 ring-offset-1 ring-offset-[var(--surface-card)] ring-[var(--text-primary)]'
                      : ''
                  }`}
                />
              ))}
            </div>
          </div>
        )}
        {/* Footer action — same shape as WorkspaceDropdown's "Manage workspaces" */}
        <div className={`p-1 ${filtered.length > 0 || (query.trim() && !exactMatch) ? 'border-t border-[var(--border-subtle)]' : ''}`}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onManage()}
            className="w-full flex items-center gap-2 h-8 px-2 text-sm rounded-lg text-left text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" weight="light" />
            </span>
            <span className="truncate">Manage labels</span>
          </button>
        </div>
      </div>,
      document.body,
      )}
    </div>
  )
})

export default LabelAutocomplete
