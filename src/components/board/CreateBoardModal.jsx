import { useState, useRef, useCallback } from 'react'
import { X } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
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
      className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none transition-colors hover:border-[var(--color-mist)] focus:border-[var(--color-ink)]"
    />
  )
}

export default function CreateBoardModal({ onClose, workspaceId = null }) {
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
        contentClassName="grid items-center justify-items-center overflow-y-auto md:p-10 p-4"
        initialFocusRef={nameRef}
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col text-left shadow-[var(--shadow-raised)] border-0.5 border-[var(--border-default)] rounded-xl md:p-6 p-4 bg-[var(--surface-page)] w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center gap-4 justify-between">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex w-full min-w-0 items-center leading-6 break-words">
              <span className="[overflow-wrap:anywhere]">Create a new board</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors -mx-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-[var(--text-secondary)] mt-1 mb-3">
            Boards organize tasks into columns.
          </p>

          {/* Name */}
          <div className="flex flex-col gap-1 mt-2">
            <label htmlFor="cb-name" className="text-sm font-medium text-[var(--text-secondary)]">
              Name
            </label>
            <div className="flex items-stretch gap-2">
              <Tooltip content="Choose icon" placement="top">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  aria-label="Choose icon"
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--color-mist)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <DynamicIcon
                    name={icon || 'cards-three'}
                    className={`w-4 h-4 ${icon ? '' : 'text-[var(--text-muted)]'}`}
                  />
                </button>
              </Tooltip>
              <Input
                id="cb-name"
                ref={nameRef}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError(false)
                }}
                maxLength={200}
                placeholder="Untitled"
                error={nameError}
                aria-invalid={nameError || undefined}
                aria-describedby={nameError ? 'cb-name-error' : undefined}
              />
            </div>
            {nameError && (
              // ml-[44px] = the 36px icon button (w-9) + 8px gap (gap-2) it
              // sits next to, so the error text lines up under the name input,
              // not the icon. Derived, not arbitrary — keep in sync if either
              // value changes.
              <FieldError id="cb-name-error" className="ml-[44px]">
                Board name is required.
              </FieldError>
            )}
          </div>

          {/* Columns */}
          <div className="flex flex-col gap-1 mt-3">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
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

          {/* Footer */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row justify-end">
            <Button variant="secondary" onClick={onClose} className="min-w-[5rem]">
              Cancel
            </Button>
            <Button type="submit" disabled={creating} className="min-w-[5rem]">
              {creating ? 'Creating…' : 'Create board'}
            </Button>
          </div>
        </form>
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
