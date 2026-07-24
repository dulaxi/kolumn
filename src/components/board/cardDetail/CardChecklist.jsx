import { useState, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import { CheckCircle, Plus, X } from '@phosphor-icons/react'

function ChecklistItem({ item, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const spanRef = useRef(null)

  // Same pattern as the panel's description: contentEditable on the same
  // element, text set via ref (not children) so React can't clobber typing
  // mid-edit. No border, no size change — edit mode looks like view mode
  // with a caret.
  useEffect(() => {
    if (!editing || !spanRef.current) return
    const el = spanRef.current
    el.innerText = item.text
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(el)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
    el.focus()
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const textClasses = `text-sm cursor-text focus:outline-none break-words min-w-0 ${
    item.done ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text-secondary)]'
  }`

  return (
    <div className="flex items-center gap-2 py-1 group/check">
      <button type="button" onClick={onToggle} className="shrink-0">
        <CheckCircle className={`w-4 h-4 transition-colors ${item.done ? 'text-[var(--accent-lime-dark)]' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'}`} />
      </button>
      {editing ? (
        <span
          ref={spanRef}
          contentEditable
          suppressContentEditableWarning
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
            else if (e.key === 'Escape') {
              e.preventDefault()
              e.currentTarget.innerText = item.text
              e.currentTarget.blur()
            }
          }}
          onBlur={(e) => {
            const t = e.currentTarget.innerText.trim()
            setEditing(false)
            if (t && t !== item.text) onEdit(t)
          }}
          className={textClasses}
        />
      ) : (
        <span className={textClasses} onClick={() => setEditing(true)}>
          {item.text}
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover/check:opacity-100 text-[var(--text-faint)] hover:text-[var(--label-red-text)] transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

export default function CardChecklist({ checklist, setChecklist, scheduleSave }) {
  const [newItem, setNewItem] = useState('')

  const handleAdd = () => {
    const t = newItem.trim()
    if (!t) return
    setChecklist([...checklist, { id: nanoid(), text: t, done: false }])
    setNewItem('')
    scheduleSave()
  }

  // Match the target item by identity (id when present, else object reference)
  // rather than by array index, so a reorder or concurrent edit can't hit the
  // wrong row.
  const isItem = (item) => (c) => (item.id ? c.id === item.id : c === item)

  return (
    <div className="mt-5 max-w-sm">
      {checklist.map((item, idx) => (
        <ChecklistItem
          key={item.id || `${item.text}-${idx}`}
          item={item}
          onToggle={() => { setChecklist(checklist.map((c) => isItem(item)(c) ? { ...c, done: !c.done } : c)); scheduleSave() }}
          onEdit={(text) => { setChecklist(checklist.map((c) => isItem(item)(c) ? { ...c, text } : c)); scheduleSave() }}
          onDelete={() => { setChecklist(checklist.filter((c) => !isItem(item)(c))); scheduleSave() }}
        />
      ))}
      <div className="flex items-center gap-2 py-1">
        <Plus className="w-4 h-4 text-[var(--text-faint)] shrink-0" />
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          // Commit on blur too — clicking outside the input now saves the
          // typed text as a new item, same as pressing Enter. handleAdd
          // is a no-op when the input is empty so it's safe to call.
          onBlur={handleAdd}
          placeholder="Add an item..."
          className="text-sm text-[var(--text-secondary)] bg-transparent focus:outline-none placeholder-[var(--text-faint)]"
        />
      </div>
    </div>
  )
}
