import { useState, useEffect, useRef } from 'react'
import {
  X, Check, User, Calendar, Flag, Tag, Plus, CheckCircle2, FileText, Smile,
} from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'

const LABEL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gray']

const LABEL_COLOR_CLASSES = {
  red: 'bg-[#FFE0DB] text-[#CF222E]',
  blue: 'bg-[#DAF0FF] text-[#3094FF]',
  green: 'bg-[#D1FDE0] text-[#08872B]',
  yellow: 'bg-[#FFF4D4] text-[#9A6700]',
  purple: 'bg-[#EDD8FD] text-[#8534F3]',
  pink: 'bg-[#FFD6EA] text-[#BF3989]',
  gray: 'bg-[#E4EBE6] text-[#909692]',
}

const COLOR_DOT_CLASSES = {
  red: 'bg-[#CF222E]',
  blue: 'bg-[#3094FF]',
  green: 'bg-[#08872B]',
  yellow: 'bg-[#9A6700]',
  purple: 'bg-[#8534F3]',
  pink: 'bg-[#BF3989]',
  gray: 'bg-[#909692]',
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', dot: 'bg-emerald-400' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-400' },
  { value: 'high', label: 'High', dot: 'bg-rose-400' },
]

export default function InlineCardEditor({ cardId, onDone }) {
  const card = useBoardStore((s) => s.cards[cardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)

  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [labels, setLabels] = useState([])
  const [showPriority, setShowPriority] = useState(false)
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [showIconPicker, setShowIconPicker] = useState(false)

  const titleRef = useRef(null)

  useEffect(() => {
    if (card) {
      setTitle(card.title === 'Untitled task' ? '' : card.title)
      setAssignee(card.assignee_name || '')
      setPriority(card.priority || 'medium')
      setDueDate(card.due_date || '')
      setLabels(card.labels ? [...card.labels] : [])
    }
  }, [cardId])

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
    <div className="rounded-xl border border-blue-200 bg-white shadow-md p-3 space-y-2.5">
      {/* Icon + Task number */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
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
          <span className="text-[11px] font-medium text-gray-500">Task #{card.task_number}</span>
        )}
      </div>

      {/* Title */}
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task name..."
        className="w-full text-[13px] font-medium text-gray-900 bg-transparent border-none focus:outline-none placeholder-gray-300"
      />

      {/* Quick fields row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Priority */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPriority(!showPriority)}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:bg-gray-100 px-1.5 py-1 rounded-lg transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${currentPriority.dot}`} />
            {currentPriority.label}
          </button>
          {showPriority && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 w-28">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setPriority(opt.value); setShowPriority(false) }}
                  className={`flex items-center gap-2 w-full px-2.5 py-1 text-[11px] transition-colors ${
                    priority === opt.value ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'
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
          <User className="w-3 h-3 text-gray-300" />
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Assignee"
            className="text-[11px] text-gray-600 bg-transparent border-none focus:outline-none placeholder-gray-300 w-16"
          />
        </div>

        {/* Due date */}
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-300" />
          <input
            type="date"
            value={dueDate ? dueDate.split('T')[0] : ''}
            onChange={(e) => setDueDate(e.target.value ? `${e.target.value}T23:59:59` : '')}
            className="text-[11px] text-gray-600 bg-transparent border-none focus:outline-none"
          />
        </div>
      </div>

      {/* Labels */}
      <div className="flex flex-wrap items-center gap-1">
        {labels.map((label, idx) => (
          <span
            key={idx}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              LABEL_COLOR_CLASSES[label.color] || LABEL_COLOR_CLASSES.gray
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
              className="text-[11px] w-16 px-1.5 py-0.5 border border-gray-200 rounded-lg focus:border-blue-200 focus:outline-none"
            />
            <div className="flex gap-0.5">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewLabelColor(c)}
                  className={`w-3 h-3 rounded-full ${COLOR_DOT_CLASSES[c]} ${newLabelColor === c ? 'ring-1 ring-offset-1 ring-gray-400' : ''}`}
                />
              ))}
            </div>
            <button type="button" onClick={addLabel} className="text-gray-400 hover:text-gray-600">
              <Check className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => { setShowLabelForm(false); setNewLabelText('') }} className="text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLabelForm(true)}
            className="text-gray-300 hover:text-gray-500"
          >
            <Tag className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-100">
        <button
          type="button"
          onClick={() => { deleteCard(cardId); onDone() }}
          className="text-[11px] text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="text-[11px] font-medium text-white bg-gray-800 hover:bg-gray-900 px-3 py-1 rounded-lg transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}
