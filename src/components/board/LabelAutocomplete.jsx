import { useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
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
    <div className="relative" data-menu-root>
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
      <div className="absolute z-10 top-full left-0 mt-1 w-[220px] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg shadow-md overflow-hidden">
        {filtered.length > 0 && (
          <div className="max-h-[180px] overflow-y-auto">
            {filtered.map((l, i) => (
              <button
                key={l.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPick(l); setQuery(''); setHighlight(0) }}
                className={`w-full flex items-center gap-2 px-2 py-1 text-xs text-left ${
                  i === highlight ? 'bg-[var(--surface-hover)]' : 'hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT_CLASSES[l.color] || ''}`} />
                <span className="text-[var(--text-secondary)] capitalize truncate">{l.text}</span>
              </button>
            ))}
          </div>
        )}
        {query.trim() && !exactMatch && (
          <div className={filtered.length > 0 ? 'border-t border-[var(--border-subtle)]' : ''}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onCreate(query.trim(), newColor); setQuery(''); setHighlight(0) }}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT_CLASSES[newColor]}`} />
              <span className="text-[var(--text-faint)] shrink-0">Create</span>
              <span className="text-[var(--text-secondary)] lowercase truncate">/{query.trim()}</span>
            </button>
            <div className="flex items-center justify-start gap-1.5 px-2 pb-1.5">
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
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onManage()}
          className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] text-left px-2 py-1 border-t border-[var(--border-subtle)]"
        >
          Manage labels…
        </button>
      </div>
    </div>
  )
})

export default LabelAutocomplete
