import { useState, useRef, useCallback } from 'react'
import { X } from '@phosphor-icons/react'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useBoardStore } from '../../store/boardStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import Modal from '../ui/Modal'
import Tooltip from '../ui/Tooltip'
import FieldError from '../ui/FieldError'

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Review', 'Done']

// Column-name input that empties itself on focus so the user can type a fresh
// name. The previous value lingers as a faded placeholder; if the user blurs
// without typing anything, we restore it.
function ColumnInput({ value, onChange, fallback, ariaLabel }) {
  const [focused, setFocused] = useState(false)
  const [typing, setTyping] = useState(false)
  const originalRef = useRef(value)

  const display = focused && !typing ? '' : value
  const placeholder = focused ? originalRef.current || fallback : fallback
  const len = Math.max((display || placeholder).length, 5)

  return (
    <input
      type="text"
      value={display}
      onChange={(e) => {
        setTyping(true)
        onChange(e.target.value)
      }}
      onFocus={() => {
        originalRef.current = value
        setFocused(true)
        setTyping(false)
      }}
      onBlur={() => {
        if (!value.trim()) onChange(originalRef.current)
        setFocused(false)
        setTyping(false)
      }}
      maxLength={80}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={{ width: `calc(${len}ch + 1.75rem)` }}
      className="h-8 px-3 rounded-lg border border-[var(--border-default)] bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none transition-colors hover:border-[var(--color-mist)] focus:border-[var(--color-ink)]"
    />
  )
}

export default function CreateBoardModal({ onClose, workspaceId = null }) {
  const isMobile = useIsMobile()
  const addBoard = useBoardStore((s) => s.addBoard)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState(null)
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [creating, setCreating] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [nameError, setNameError] = useState(false)

  const nameRef = useRef(null)

  const updateColumn = useCallback((idx, value) => {
    setColumns((prev) => prev.map((c, i) => (i === idx ? value : c)))
  }, [])

  const handleCreate = useCallback(async () => {
    if (creating) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError(true)
      nameRef.current?.focus()
      return
    }
    const trimmedColumns = columns.map(
      (c, i) => c.trim() || DEFAULT_COLUMNS[i] || `Column ${i + 1}`,
    )
    setCreating(true)
    try {
      const id = await addBoard(trimmedName, icon, trimmedColumns, workspaceId)
      if (id) onClose()
    } finally {
      setCreating(false)
    }
  }, [name, columns, icon, creating, addBoard, onClose, workspaceId])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    handleCreate()
  }, [handleCreate])

  return (
    <>
      <Modal
        open
        onClose={onClose}
        contentClassName="flex items-center justify-center p-4"
        initialFocusRef={nameRef}
      >
        <div
          className={`relative bg-[var(--surface-page)] flex flex-col overflow-hidden ${
            isMobile
              ? 'fixed inset-0 rounded-none'
              : 'rounded-xl w-[512px] max-h-[88vh] shadow-[0_24px_72px_rgba(27,27,24,0.16)]'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-faint)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-10 pt-12 pb-2">
            <h2
              id="create-board-title"
              className="font-heading text-[30px] font-light leading-tight tracking-tight text-[var(--text-primary)] mb-7"
            >
              Create a new board
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {/* Name field */}
              <div>
                <label
                  htmlFor="cb-name"
                  className="block mb-1.5 text-[13px] text-[var(--text-secondary)]"
                >
                  Name your board
                </label>
                <div className="flex items-stretch gap-2">
                  <Tooltip content="Choose icon" placement="top">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(true)}
                      aria-label="Choose icon"
                      className="w-11 h-11 shrink-0 flex items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--color-mist)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <DynamicIcon
                        name={icon || 'cards-three'}
                        className={`w-4 h-4 ${icon ? '' : 'text-[var(--text-muted)]'}`}
                      />
                    </button>
                  </Tooltip>
                  <input
                    id="cb-name"
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (nameError) setNameError(false)
                    }}
                    autoFocus
                    maxLength={200}
                    placeholder="Untitled"
                    aria-invalid={nameError || undefined}
                    aria-describedby={nameError ? 'cb-name-error' : undefined}
                    className={`flex-1 min-w-0 h-11 px-3 rounded-[10px] border bg-[var(--surface-card)] text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none transition-colors ${
                      nameError
                        ? 'border-[var(--color-copper)] hover:border-[var(--color-copper)] focus:border-[var(--color-copper)]'
                        : 'border-[var(--border-default)] hover:border-[var(--color-mist)] focus:border-[var(--color-ink)]'
                    }`}
                  />
                </div>
                {nameError && (
                  // ml-[52px] = the 44px icon button (w-11) + 8px gap
                  // (gap-2) it sits next to, so the error text lines up
                  // under the name input, not the icon. Derived, not
                  // arbitrary — keep in sync if either value changes.
                  <FieldError id="cb-name-error" className="ml-[52px]">
                    Board name is required.
                  </FieldError>
                )}
              </div>

              {/* Columns */}
              <div>
                <label className="block mb-1.5 text-[13px] text-[var(--text-secondary)]">
                  Columns
                </label>
                <div className="flex flex-wrap gap-2">
                  {columns.map((col, i) => (
                    <ColumnInput
                      key={i}
                      value={col}
                      onChange={(v) => updateColumn(i, v)}
                      fallback={DEFAULT_COLUMNS[i] || `Column ${i + 1}`}
                      ariaLabel={`Column ${i + 1} name`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-2 pb-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center h-9 px-4 min-w-[5rem] rounded-lg text-[13px] font-medium text-[var(--text-primary)] border border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="relative inline-flex items-center justify-center h-9 px-4 min-w-[5rem] rounded-lg text-[13px] font-medium text-[var(--btn-primary-text)] bg-[var(--btn-primary-bg)] overflow-hidden transition-transform duration-150 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:scale-y-[1.015] hover:scale-x-[1.005] disabled:opacity-60 disabled:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(at_bottom,rgba(255,255,255,0.18),rgba(255,255,255,0))] after:opacity-0 after:translate-y-2 after:transition after:duration-200 hover:after:opacity-100 hover:after:translate-y-0"
              >
                <span className="relative z-10">{creating ? 'Creating…' : 'Create board'}</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {showIconPicker && (
        <IconPicker
          value={icon}
          onChange={(newIcon) => setIcon(newIcon)}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </>
  )
}
