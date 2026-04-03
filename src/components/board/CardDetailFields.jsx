import { useState } from 'react'
import {
  X, Plus, Check, User, Calendar, Flag, Tag,
  Briefcase, LayoutList, Smile, UserPlus, Repeat, FileText,
} from 'lucide-react'
import { parseISO, format } from 'date-fns'
import { useBoardStore } from '../../store/boardStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import { LABEL_BG, getAvatarColor, getInitials } from '../../utils/formatting'
import { addRecurrenceInterval } from '../../utils/dateUtils'

const LABEL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gray']

const COLOR_DOT_CLASSES = {
  red: 'bg-[#F2D9C7]',
  blue: 'bg-[#DAE0F0]',
  green: 'bg-[#EEF2D6]',
  yellow: 'bg-[#F5EDCF]',
  purple: 'bg-[#E8DDE2]',
  pink: 'bg-[#F0E0D2]',
  gray: 'bg-[#E8E2DB]',
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', dot: 'bg-[#EEF2D6]' },
  { value: 'medium', label: 'Medium', dot: 'bg-[#F5EDCF]' },
  { value: 'high', label: 'High', dot: 'bg-[#F2D9C7]' },
]

export default function CardDetailFields({
  card, cardId, assignee, setAssignee, priority, setPriority,
  dueDate, setDueDate, labels, setLabels, scheduleSave,
  renderAvatar, boardMemberNames, boardName, statusName,
}) {
  const updateCard = useBoardStore((s) => s.updateCard)

  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false)
  const [customInterval, setCustomInterval] = useState(1)
  const [customUnit, setCustomUnit] = useState('days')

  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1]

  const dueDateDisplay = dueDate ? (() => {
    const d = new Date(dueDate)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    if (sameDay(d, today)) return 'Today'
    if (sameDay(d, yesterday)) return 'Yesterday'
    if (sameDay(d, tomorrow)) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  })() : null

  const recurrenceLabel = card?.recurrence_interval
    ? card.recurrence_unit === 'months'
      ? card.recurrence_interval === 1 ? 'Monthly' : `Every ${card.recurrence_interval} months`
      : card.recurrence_interval === 1 ? 'Daily'
      : card.recurrence_interval === 7 ? 'Weekly'
      : card.recurrence_interval === 14 ? 'Biweekly'
      : `Every ${card.recurrence_interval} days`
    : null

  const handleRecurrenceChange = (interval, unit) => {
    if (!interval) {
      updateCard(cardId, { recurrence_interval: null, recurrence_unit: null, recurrence_next_due: null })
    } else {
      const nextDue = dueDate ? addRecurrenceInterval(parseISO(dueDate), interval, unit) : null
      updateCard(cardId, {
        recurrence_interval: interval,
        recurrence_unit: unit,
        recurrence_next_due: nextDue ? format(nextDue, 'yyyy-MM-dd') : null,
      })
    }
  }

  const addLabel = () => {
    const trimmed = newLabelText.trim()
    if (trimmed) {
      setLabels([...labels, { text: trimmed, color: newLabelColor }])
      setNewLabelText('')
      setShowLabelForm(false)
      scheduleSave()
    }
  }

  const removeLabel = (index) => {
    setLabels(labels.filter((_, i) => i !== index))
    scheduleSave()
  }

  return (
    <div className="px-5 space-y-0">
      {/* Icon */}
      <div className="flex items-center py-2.5 border-t border-[#E8E2DB] relative">
        <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
          <Smile className="w-4 h-4" />
          <span className="text-sm">Icon</span>
        </div>
        <button
          type="button"
          onClick={() => setShowIconPicker(!showIconPicker)}
          className="flex items-center gap-2 text-sm hover:bg-[#F2EDE8] px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
        >
          <div className="w-6 h-6 rounded-lg bg-[#E8E2DB] flex items-center justify-center text-[#8E8E89]">
            {card.icon ? (
              <DynamicIcon name={card.icon} className="w-3.5 h-3.5" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="text-[#5C5C57]">{card.icon || 'Default'}</span>
        </button>
        {showIconPicker && (
          <IconPicker
            value={card.icon}
            onChange={(iconName) => updateCard(cardId, { icon: iconName })}
            onClose={() => setShowIconPicker(false)}
          />
        )}
      </div>

      {/* Assignee */}
      <div className="flex items-center py-2.5 border-t border-[#E8E2DB] relative">
        <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
          <User className="w-4 h-4" />
          <span className="text-sm">Assignee</span>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => {
              setShowAssigneePicker(!showAssigneePicker)
              setAssigneeSearch('')
            }}
            className="flex items-center gap-2 text-sm hover:bg-[#F2EDE8] px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
          >
            {assignee.trim() ? (
              <>
                {renderAvatar(assignee)}
                <span className="text-[#5C5C57]">{assignee}</span>
              </>
            ) : (
              <span className="text-[#8E8E89]">No assignee</span>
            )}
          </button>
        </div>
        {showAssigneePicker && (() => {
          const query = assigneeSearch.trim().toLowerCase()
          const filtered = query
            ? boardMemberNames.filter((m) => m.toLowerCase().includes(query))
            : boardMemberNames
          const exactMatch = boardMemberNames.some((m) => m.toLowerCase() === query)
          const showAddOption = query && !exactMatch

          return (
            <div className="absolute left-24 sm:left-32 top-full mt-1 bg-white border border-[#E0DBD5] rounded-xl shadow-lg z-10 w-56 overflow-hidden">
              <div className="p-2 border-b border-[#E8E2DB]">
                <input
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && showAddOption) {
                      const name = assigneeSearch.trim()

                      setAssignee(name)
                      setShowAssigneePicker(false)
                      setAssigneeSearch('')
                      scheduleSave()
                    } else if (e.key === 'Enter' && filtered.length === 1) {
                      setAssignee(filtered[0])
                      setShowAssigneePicker(false)
                      setAssigneeSearch('')
                      scheduleSave()
                    } else if (e.key === 'Escape') {
                      setShowAssigneePicker(false)
                      setAssigneeSearch('')
                    }
                  }}
                  autoFocus
                  placeholder="Search or add member..."
                  className="w-full text-sm rounded-lg px-2.5 py-1.5 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none placeholder-[#8E8E89]"
                />
              </div>
              <div className="max-h-48 overflow-y-auto py-1">
                {assignee.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setAssignee('')
                      setShowAssigneePicker(false)
                      setAssigneeSearch('')
                      scheduleSave()
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#8E8E89] hover:bg-[#F2EDE8] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Unassign
                  </button>
                )}
                {filtered.map((member) => (
                  <button
                    key={member}
                    type="button"
                    onClick={() => {
                      setAssignee(member)
                      setShowAssigneePicker(false)
                      setAssigneeSearch('')
                      scheduleSave()
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
                      assignee === member
                        ? 'bg-[#F2EDE8] text-[#1B1B18] font-medium'
                        : 'text-[#5C5C57] hover:bg-[#F2EDE8]'
                    }`}
                  >
                    {renderAvatar(member)}
                    {member}
                  </button>
                ))}
                {filtered.length === 0 && !showAddOption && (
                  <div className="px-3 py-2 text-sm text-[#8E8E89]">No members yet</div>
                )}
                {showAddOption && (
                  <button
                    type="button"
                    onClick={() => {
                      const name = assigneeSearch.trim()

                      setAssignee(name)
                      setShowAssigneePicker(false)
                      setAssigneeSearch('')
                      scheduleSave()
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#A8BA32] hover:bg-[#EEF2D6] transition-colors border-t border-[#E8E2DB]"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add "{assigneeSearch.trim()}"
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Due date */}
      <div className="flex items-center py-2.5 border-t border-[#E8E2DB]">
        <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Due date</span>
        </div>
        {editingDueDate ? (
          <input
            type="date"
            value={dueDate ? dueDate.split('T')[0] : ''}
            onChange={(e) => {
              setDueDate(e.target.value ? `${e.target.value}T23:59:59` : '')
              setEditingDueDate(false)
              scheduleSave()
            }}
            onBlur={() => setEditingDueDate(false)}
            autoFocus
            className="text-sm text-[#5C5C57] bg-transparent border-none focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingDueDate(true)}
            className="text-sm hover:bg-[#F2EDE8] px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
          >
            {dueDateDisplay ? (
              <span className={
                dueDateDisplay === 'Yesterday' ? 'text-[#C27A4A] font-medium' :
                dueDateDisplay === 'Today' ? 'text-[#D4A843] font-medium' :
                dueDateDisplay === 'Tomorrow' ? 'text-[#A8BA32] font-medium' :
                dueDate && new Date(dueDate) < new Date() ? 'text-[#C27A4A] font-medium' :
                'text-[#A8BA32] font-medium'
              }>{dueDateDisplay}</span>
            ) : (
              <span className="text-[#8E8E89]">No due date</span>
            )}
          </button>
        )}
      </div>

      {/* Repeat */}
      <div className="flex items-center py-2.5 border-t border-[#E8E2DB]">
        <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
          <Repeat className="w-4 h-4" />
          <span className="text-sm">Repeat</span>
        </div>
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setShowRecurrencePicker(!showRecurrencePicker)}
            className="text-sm text-[#5C5C57] hover:bg-[#F2EDE8] px-2 py-0.5 rounded-lg transition-colors"
          >
            {recurrenceLabel || 'None'}
          </button>
          {showRecurrencePicker && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-[#E0DBD5] rounded-xl shadow-lg py-1 z-20 w-52">
              {[
                { label: 'No repeat', interval: null, unit: null },
                { label: 'Daily', interval: 1, unit: 'days' },
                { label: 'Weekly', interval: 7, unit: 'days' },
                { label: 'Biweekly', interval: 14, unit: 'days' },
                { label: 'Monthly', interval: 1, unit: 'months' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    handleRecurrenceChange(opt.interval, opt.unit)
                    setShowRecurrencePicker(false)
                  }}
                  className="w-full px-3 py-1.5 text-sm text-left text-[#5C5C57] hover:bg-[#F2EDE8] transition-colors"
                >
                  {opt.label}
                </button>
              ))}
              <div className="border-t border-[#E8E2DB] px-3 py-2 flex items-center gap-2">
                <span className="text-xs text-[#8E8E89]">Every</span>
                <input
                  type="number"
                  min="1"
                  value={customInterval}
                  onChange={(e) => setCustomInterval(parseInt(e.target.value) || 1)}
                  className="w-12 text-sm px-1.5 py-0.5 border border-[#E0DBD5] rounded-lg text-center focus:outline-none focus:border-[#C2D64A]"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="text-sm px-1.5 py-0.5 border border-[#E0DBD5] rounded-lg focus:outline-none focus:border-[#C2D64A]"
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    handleRecurrenceChange(customUnit === 'weeks' ? customInterval * 7 : customInterval, customUnit === 'weeks' ? 'days' : customUnit)
                    setShowRecurrencePicker(false)
                  }}
                  className="text-xs font-medium text-[#A8BA32] hover:text-[#A8BA32]"
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="flex items-center py-2.5 border-t border-[#E8E2DB]">
        <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
          <Briefcase className="w-4 h-4" />
          <span className="text-sm">Projects</span>
        </div>
        <span className="text-sm text-[#5C5C57]">{boardName}</span>
      </div>

      {/* Fields section header */}
      <div className="pt-4 pb-1 border-t border-[#E8E2DB]">
        <span className="text-xs font-medium text-[#8E8E89] uppercase tracking-wider">Fields</span>
      </div>

      {/* Priority */}
      <div className="flex items-center py-2.5 relative">
        <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
          <Flag className="w-4 h-4" />
          <span className="text-sm">Priority</span>
        </div>
        <button
          type="button"
          onClick={() => setShowPriorityPicker(!showPriorityPicker)}
          className="flex items-center gap-2 text-sm hover:bg-[#F2EDE8] px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${currentPriority.dot}`} />
          <span className="text-[#5C5C57]">{currentPriority.label}</span>
        </button>
        {showPriorityPicker && (
          <div className="absolute left-24 sm:left-32 top-full mt-1 bg-white border border-[#E0DBD5] rounded-xl shadow-lg py-1 z-10 w-36">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setPriority(opt.value)
                  setShowPriorityPicker(false)
                  scheduleSave()
                }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
                  priority === opt.value
                    ? 'bg-[#F2EDE8] text-[#1B1B18] font-medium'
                    : 'text-[#5C5C57] hover:bg-[#F2EDE8]'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center py-2.5 border-t border-[#E8E2DB]">
        <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89]">
          <LayoutList className="w-4 h-4" />
          <span className="text-sm">Status</span>
        </div>
        <span className="text-sm text-[#5C5C57]">{statusName}</span>
      </div>

      {/* Labels */}
      <div className="flex items-start py-2.5 border-t border-[#E8E2DB]">
        <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-[#8E8E89] pt-0.5">
          <Tag className="w-4 h-4" />
          <span className="text-sm">Labels</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {labels.length === 0 && !showLabelForm && (
              <span className="text-sm text-[#8E8E89]">—</span>
            )}
            {labels.map((label, idx) => (
              <span
                key={`${label.text}-${label.color}`}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  LABEL_BG[label.color] || LABEL_BG.gray
                }`}
              >
                {label.text}
                <button
                  type="button"
                  onClick={() => removeLabel(idx)}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {showLabelForm ? (
              <div className="w-full mt-1.5 space-y-2">
                <input
                  value={newLabelText}
                  onChange={(e) => setNewLabelText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLabel()}
                  placeholder="Label text..."
                  autoFocus
                  className="w-full text-sm rounded-lg px-2.5 py-1.5 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewLabelColor(color)}
                        className={`w-4.5 h-4.5 rounded-full ${COLOR_DOT_CLASSES[color]} ${
                          newLabelColor === color
                            ? 'ring-2 ring-offset-1 ring-gray-400'
                            : ''
                        }`}
                        style={{ width: 18, height: 18 }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={addLabel} className="p-1 bg-[#C2D64A] text-white rounded hover:bg-[#A8BA32]">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => { setShowLabelForm(false); setNewLabelText('') }} className="p-1 text-[#8E8E89] hover:text-[#5C5C57]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLabelForm(true)}
                className="flex items-center gap-0.5 text-xs text-[#8E8E89] hover:text-[#5C5C57] px-1.5 py-0.5"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
