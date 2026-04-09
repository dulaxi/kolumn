import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, SquareKanban } from 'lucide-react'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useBoardStore } from '../../store/boardStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'

const TEMPLATES = [
  {
    key: 'blank',
    label: 'Blank',
    icon: null,
    columns: ['To Do', 'In Progress', 'Review', 'Done'],
    description: 'Start from scratch',
  },
  {
    key: 'bug-tracker',
    label: 'Bug Tracker',
    icon: 'bug',
    columns: ['Triage', 'Investigating', 'Fix In Progress', 'Verified'],
    description: 'Track and squash bugs',
  },
  {
    key: 'sprint',
    label: 'Sprint Board',
    icon: 'lightning',
    columns: ['Backlog', 'Sprint', 'In Progress', 'Done'],
    description: 'Agile sprint workflow',
  },
  {
    key: 'content',
    label: 'Content Pipeline',
    icon: 'pen-nib',
    columns: ['Ideas', 'Drafting', 'Editing', 'Published'],
    description: 'Create and ship content',
  },
  {
    key: 'hiring',
    label: 'Hiring Pipeline',
    icon: 'user-plus',
    columns: ['Applied', 'Phone Screen', 'Interview', 'Offer'],
    description: 'Manage candidates',
  },
  {
    key: 'simple',
    label: 'Simple',
    icon: null,
    columns: ['To Do', 'Done'],
    description: 'Just two columns',
  },
]

// Deterministic ghost card heights per column index
const GHOST_CARD_PATTERNS = [
  [40, 56, 32],
  [52, 36],
  [44, 60, 48],
  [36, 44],
]

function SkeletonPreview({ columns }) {
  return (
    <div className="flex gap-2 p-1">
      {columns.map((col, ci) => {
        const pattern = GHOST_CARD_PATTERNS[ci % GHOST_CARD_PATTERNS.length]
        return (
          <div
            key={col}
            className="flex-1 min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)]/60 p-2.5"
          >
            <div className="text-[11px] font-medium text-[var(--text-muted)] truncate mb-3">
              {col}
            </div>
            <div className="flex flex-col gap-2">
              {pattern.map((h, gi) => (
                <div
                  key={gi}
                  className="rounded-lg bg-[var(--surface-raised)] animate-pulse"
                  style={{ height: h }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function CreateBoardModal({ onClose }) {
  const isMobile = useIsMobile()
  const addBoard = useBoardStore((s) => s.addBoard)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState('blank')
  const [creating, setCreating] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)

  const nameRef = useRef(null)

  const template = TEMPLATES.find((t) => t.key === selectedTemplate) || TEMPLATES[0]

  // Autofocus name input on mount
  useEffect(() => {
    if (nameRef.current) nameRef.current.focus()
  }, [])

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // When selecting a template with a preset icon, apply it
  const handleTemplateSelect = useCallback((tpl) => {
    setSelectedTemplate(tpl.key)
    if (tpl.icon) {
      setIcon(tpl.icon)
    }
  }, [])

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed || creating) return

    setCreating(true)
    try {
      const id = await addBoard(trimmed, icon, template.columns)
      if (id) onClose()
    } finally {
      setCreating(false)
    }
  }, [name, icon, template, creating, addBoard, onClose])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCreate()
      }
    },
    [handleCreate],
  )

  const canCreate = name.trim().length > 0 && !creating

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className={`bg-[var(--surface-page)] shadow-2xl flex flex-col overflow-hidden ${
            isMobile
              ? 'fixed inset-0 rounded-none'
              : 'rounded-2xl w-[900px] max-h-[85vh]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              <SquareKanban className="w-4 h-4 text-[var(--text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                New Board
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div
            className={`flex-1 overflow-y-auto ${
              isMobile ? 'flex flex-col' : 'flex'
            }`}
          >
            {/* Left side: inputs + templates */}
            <div
              className={`p-6 flex flex-col gap-5 ${
                isMobile
                  ? 'w-full'
                  : 'w-[340px] shrink-0 border-r border-[var(--border-default)]'
              }`}
            >
              {/* Board name + icon */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Board name
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(true)}
                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-raised)] transition-colors"
                    title="Choose icon"
                  >
                    {icon ? (
                      <DynamicIcon
                        name={icon}
                        className="w-4 h-4 text-[var(--text-secondary)]"
                      />
                    ) : (
                      <SquareKanban className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </button>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    maxLength={200}
                    placeholder="e.g. Product Roadmap"
                    className="flex-1 h-10 px-3 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#C2D64A] focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              {/* Template list */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Template
                </label>
                <div className="flex flex-col gap-1">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => handleTemplateSelect(tpl)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        selectedTemplate === tpl.key
                          ? 'bg-[var(--accent-lime-wash)] ring-1 ring-[#C2D64A]'
                          : 'hover:bg-[var(--surface-raised)]'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedTemplate === tpl.key
                            ? 'bg-[#C2D64A]/20 text-[#7A8A1E]'
                            : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                        }`}
                      >
                        {tpl.icon ? (
                          <DynamicIcon name={tpl.icon} className="w-4 h-4" />
                        ) : (
                          <SquareKanban className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                          {tpl.label}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                          {tpl.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: skeleton preview */}
            <div
              className={`flex-1 flex flex-col items-center justify-center p-6 ${
                isMobile ? 'border-t border-[var(--border-default)]' : ''
              }`}
            >
              <div className="text-[11px] font-medium text-[var(--text-muted)] mb-3 self-start">
                Preview
              </div>
              <div className="w-full">
                <SkeletonPreview columns={template.columns} />
              </div>
              <div className="mt-3 text-[11px] text-[var(--text-muted)]">
                {template.columns.length} column
                {template.columns.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border-default)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate}
              className="px-4 py-2 text-sm font-medium rounded-xl transition-colors bg-[var(--btn-primary-bg)] text-white hover:bg-[var(--btn-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>

      {/* Icon picker overlay */}
      {showIconPicker && (
        <IconPicker
          value={icon}
          onChange={setIcon}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </>,
    document.body,
  )
}
