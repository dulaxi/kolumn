import { useState, useMemo, useRef } from 'react'
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

export default function LabelAutocomplete({ boardId, excludeIds = [], onPick, onCreate, onManage }) {
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

  const handleEnter = () => {
    if (filtered[highlight]) {
      onPick(filtered[highlight])
    } else if (query.trim() && !exactMatch) {
      onCreate(query.trim(), newColor)
    }
    setQuery('')
    setHighlight(0)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setHighlight(0) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleEnter() }
          else if (e.key === 'ArrowDown') { setHighlight((h) => Math.min(h + 1, filtered.length - 1)) }
          else if (e.key === 'ArrowUp')   { setHighlight((h) => Math.max(h - 1, 0)) }
        }}
        placeholder="/label"
        autoFocus
        className="text-xs text-[var(--text-secondary)] lowercase bg-transparent border-none focus:outline-none w-24 placeholder-[var(--text-faint)]"
      />
      <div className="absolute z-10 top-full left-0 mt-1 min-w-[180px] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg shadow-md overflow-hidden">
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
            <span className={`w-2 h-2 rounded-full ${COLOR_DOT_CLASSES[l.color] || ''}`} />
            <span className="text-[var(--text-secondary)] capitalize">{l.text}</span>
          </button>
        ))}
        {query.trim() && !exactMatch && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onCreate(query.trim(), newColor); setQuery(''); setHighlight(0) }}
            className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left border-t border-[var(--border-subtle)]"
          >
            <span className={`w-2 h-2 rounded-full ${COLOR_DOT_CLASSES[newColor]}`} />
            <span className="text-[var(--text-faint)]">Create</span>
            <span className="text-[var(--text-secondary)] lowercase">/{query.trim()}</span>
            <span className="ml-auto flex items-center gap-1">
              {LABEL_COLORS.map((c) => (
                <span
                  key={c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); setNewColor(c) }}
                  className={`w-2.5 h-2.5 rounded-full cursor-pointer ${COLOR_DOT_CLASSES[c]} ${
                    newColor === c ? 'ring-1 ring-[var(--text-primary)]' : ''
                  }`}
                />
              ))}
            </span>
          </button>
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
}
