import { useState, useEffect, useRef } from 'react'
import {
  X, Check, User, Calendar, Flag, Tag, Plus, CheckCircle2, FileText, Smile, Trash2, ListChecks,
} from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import { LABEL_COLORS, COLOR_DOT_CLASSES, PRIORITY_OPTIONS } from '../../constants/colors'
import { LABEL_BG } from '../../utils/formatting'

export default function InlineCardEditor({ cardId, onDone }) {
  const card = useBoardStore((s) => s.cards[cardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)

  const [title, setTitle] = useState(() => card?.title === 'Untitled task' ? '' : (card?.title || ''))
  const [assignee, setAssignee] = useState(() => card?.assignee_name || '')
  const [priority, setPriority] = useState(() => card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(() => card?.due_date || '')
  const [labels, setLabels] = useState(() => card?.labels ? [...card.labels] : [])
  const [showPriority, setShowPriority] = useState(false)
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [description, setDescription] = useState(() => card?.description || '')
  const [checklist, setChecklist] = useState(() => card?.checklist ? [...card.checklist] : [])
  const [newCheckItem, setNewCheckItem] = useState('')

  const titleRef = useRef(null)

  useEffect(() => {
    if (titleRef.current) titleRef.current.focus()
  }, [])

  if (!card) return null

  const handleSave = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      // Keep the card with its existing title (or 'Untitled task' for new cards)
      onDone()
      return
    }
    updateCard(cardId, {
      title: trimmedTitle,
      assignee_name: assignee.trim(),
      priority,
      due_date: dueDate || null,
      labels,
      description: description.trim(),
      checklist,
    })
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

  const addLabel = () => {
    const trimmed = newLabelText.trim()
    if (trimmed) {
      setLabels([...labels, { text: trimmed, color: newLabelColor }])
      setNewLabelText('')
      setShowLabelForm(false)
    }
  }

  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1]

  return (
    <div className="rounded-xl border border-[#C2D64A] bg-white shadow-md p-3 space-y-2.5">
      {/* Icon + Task number */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="w-7 h-7 rounded-lg bg-[#E8E2DB] flex items-center justify-center text-[#8E8E89] hover:bg-[#E0DBD5] transition-colors"
          >
            {card.icon ? (
              <DynamicIcon name={card.icon} className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </button>
          {showIconPicker && (
            <IconPicker
              value={card.icon}
              onChange={(icon) => { updateCard(cardId, { icon }); setShowIconPicker(false) }}
              onClose={() => setShowIconPicker(false)}
            />
          )}
        </div>
        {card.task_number > 0 && (
          <span className="text-[11px] font-medium text-[#5C5C57]">Task #{card.task_number}</span>
        )}
      </div>

      {/* Title */}
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task name..."
        className="w-full text-[13px] font-medium text-[#1B1B18] bg-transparent border-none focus:outline-none placeholder-[#8E8E89]"
      />

      {/* Quick fields row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Priority */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPriority(!showPriority)}
            className="flex items-center gap-1 text-[11px] text-[#5C5C57] hover:bg-[#E8E2DB] px-1.5 py-1 rounded-lg transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${currentPriority.dot}`} />
            {currentPriority.label}
          </button>
          {showPriority && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-[#E0DBD5] rounded-xl shadow-lg py-1 z-10 w-28">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setPriority(opt.value); setShowPriority(false) }}
                  className={`flex items-center gap-2 w-full px-2.5 py-1 text-[11px] transition-colors ${
                    priority === opt.value ? 'bg-[#F2EDE8] font-medium text-[#1B1B18]' : 'text-[#5C5C57] hover:bg-[#F2EDE8]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-[#8E8E89]" />
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Assignee"
            className="text-[11px] text-[#5C5C57] bg-transparent border-none focus:outline-none placeholder-[#8E8E89] w-16"
          />
        </div>

        {/* Due date */}
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-[#8E8E89]" />
          <input
            type="date"
            value={dueDate ? dueDate.split('T')[0] : ''}
            onChange={(e) => setDueDate(e.target.value ? `${e.target.value}T23:59:59` : '')}
            className="text-[11px] text-[#5C5C57] bg-transparent border-none focus:outline-none"
          />
        </div>
      </div>

      {/* Labels */}
      <div className="flex flex-wrap items-center gap-1">
        {labels.map((label, idx) => (
          <span
            key={`${label.text}-${label.color}`}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              LABEL_BG[label.color] || LABEL_BG.gray
            }`}
          >
            {label.text}
          </span>
        ))}
        {showLabelForm ? (
          <div className="flex items-center gap-1">
            <input
              value={newLabelText}
              onChange={(e) => setNewLabelText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLabel()}
              placeholder="Label..."
              autoFocus
              className="text-[11px] w-16 px-1.5 py-0.5 border border-[#E0DBD5] rounded-lg focus:border-[#C2D64A] focus:outline-none"
            />
            <div className="flex gap-0.5">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewLabelColor(c)}
                  className={`w-3 h-3 rounded-full ${COLOR_DOT_CLASSES[c]} ${newLabelColor === c ? 'ring-1 ring-offset-1 ring-[#C4BFB8]' : ''}`}
                />
              ))}
            </div>
            <button type="button" onClick={addLabel} className="text-[#8E8E89] hover:text-[#5C5C57]">
              <Check className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => { setShowLabelForm(false); setNewLabelText('') }} className="text-[#8E8E89] hover:text-[#5C5C57]">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLabelForm(true)}
            className="text-[#8E8E89] hover:text-[#5C5C57]"
          >
            <Tag className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add description..."
        rows={2}
        className="w-full text-[11px] text-[#5C5C57] bg-[#F2EDE8] rounded-lg border border-[#E8E2DB] focus:border-[#C2D64A] focus:outline-none px-2 py-1.5 resize-none placeholder-[#8E8E89]"
      />

      {/* Checklist */}
      <div className="space-y-1">
        {checklist.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-[#8E8E89] font-medium">
            <ListChecks className="w-3 h-3" />
            <span>{checklist.filter((i) => i.done).length}/{checklist.length}</span>
          </div>
        )}
        {checklist.map((item, idx) => (
          <div key={`${item.text}-${idx}`} className="flex items-center gap-1.5 group">
            <button
              type="button"
              onClick={() => {
                const updated = [...checklist]
                updated[idx] = { ...updated[idx], done: !updated[idx].done }
                setChecklist(updated)
              }}
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                item.done ? 'bg-[#C2D64A] border-[#C2D64A] text-white' : 'border-[#E0DBD5] hover:border-[#C4BFB8]'
              }`}
            >
              {item.done && <Check className="w-2.5 h-2.5" />}
            </button>
            <span className={`text-[11px] flex-1 ${item.done ? 'line-through text-[#8E8E89]' : 'text-[#5C5C57]'}`}>
              {item.text}
            </span>
            <button
              type="button"
              onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
              className="opacity-0 group-hover:opacity-100 text-[#8E8E89] hover:text-[#7A5C44] transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <Plus className="w-3 h-3 text-[#8E8E89] shrink-0" />
          <input
            value={newCheckItem}
            onChange={(e) => setNewCheckItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                const trimmed = newCheckItem.trim()
                if (trimmed) {
                  setChecklist([...checklist, { text: trimmed, done: false }])
                  setNewCheckItem('')
                }
              }
            }}
            placeholder="Add checklist item..."
            className="text-[11px] text-[#5C5C57] bg-transparent border-none focus:outline-none placeholder-[#8E8E89] flex-1"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#E8E2DB]">
        <button
          type="button"
          onClick={() => { deleteCard(cardId); onDone() }}
          className="text-[11px] text-[#8E8E89] hover:text-[#7A5C44] px-2 py-1 rounded-lg transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="text-[11px] font-medium text-white bg-[#1B1B18] hover:bg-[#1B1B18] px-3 py-1 rounded-lg transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}
