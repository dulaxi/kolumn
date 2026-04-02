import { useState } from 'react'
import { X, CheckSquare } from 'lucide-react'

export default function CardDetailChecklist({ checklist, onToggle, onRemove, onAdd }) {
  const [newCheckItem, setNewCheckItem] = useState('')
  const checkedCount = checklist.filter((item) => item.done).length

  const handleAdd = () => {
    const trimmed = newCheckItem.trim()
    if (trimmed) {
      onAdd(trimmed)
      setNewCheckItem('')
    }
  }

  return (
    <div className="px-5 pt-3 pb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[#8E8E89]">
          <CheckSquare className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Checklist</span>
        </div>
        {checklist.length > 0 && (
          <span className="text-xs text-[#8E8E89]">
            {checkedCount}/{checklist.length}
          </span>
        )}
      </div>

      {checklist.length > 0 && (
        <div className="w-full bg-[#E8E2DB] rounded-full h-1 mb-3">
          <div
            className="bg-[#C2D64A] h-1 rounded-full transition-all"
            style={{
              width: `${(checkedCount / checklist.length) * 100}%`,
            }}
          />
        </div>
      )}

      <div className="space-y-1">
        {checklist.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 group py-0.5">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => onToggle(idx)}
              className="w-4 h-4 rounded border-[#E0DBD5] text-[#C2D64A] focus:ring-[#EEF2D6]"
            />
            <span
              className={`flex-1 text-sm ${
                item.done ? 'line-through text-[#8E8E89]' : 'text-[#5C5C57]'
              }`}
            >
              {item.text}
            </span>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-[#8E8E89] hover:text-[#7A5C44] transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input
          value={newCheckItem}
          onChange={(e) => setNewCheckItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add an item..."
          className="flex-1 text-sm rounded-lg px-2.5 py-1.5 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none placeholder-[#8E8E89]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-2.5 py-1.5 text-xs font-medium bg-[#E8E2DB] text-[#5C5C57] rounded-lg hover:bg-[#E0DBD5] transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
