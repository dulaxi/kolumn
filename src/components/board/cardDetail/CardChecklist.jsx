import { useState } from 'react'
import { CheckCircle, Plus, X } from '@phosphor-icons/react'

function ChecklistItem({ item, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)
  return (
    <div className="flex items-center gap-2 py-1 group/check">
      <button type="button" onClick={onToggle} className="shrink-0">
        <CheckCircle className={`w-4 h-4 transition-colors ${item.done ? 'text-[var(--accent-lime-dark)]' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'}`} />
      </button>
      {editing ? (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onEdit(text.trim() || item.text); setEditing(false) }
            else if (e.key === 'Escape') { setText(item.text); setEditing(false) }
          }}
          onBlur={() => { onEdit(text.trim() || item.text); setEditing(false) }}
          autoFocus
          className="text-sm text-[var(--text-secondary)] bg-transparent focus:outline-none border border-[var(--border-default)] rounded-xl px-1 -mx-1"
        />
      ) : (
        <span
          className={`text-sm cursor-pointer ${item.done ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text-secondary)]'}`}
          onClick={() => setEditing(true)}
        >
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
    setChecklist([...checklist, { text: t, done: false }])
    setNewItem('')
    scheduleSave()
  }

  return (
    <div className="mt-5 max-w-sm">
      {checklist.map((item, idx) => (
        <ChecklistItem
          key={`${item.text}-${idx}`}
          item={item}
          onToggle={() => { setChecklist(checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c)); scheduleSave() }}
          onEdit={(text) => { setChecklist(checklist.map((c, i) => i === idx ? { ...c, text } : c)); scheduleSave() }}
          onDelete={() => { setChecklist(checklist.filter((_, i) => i !== idx)); scheduleSave() }}
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
