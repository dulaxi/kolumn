import { useState } from 'react'
import { X } from '@phosphor-icons/react'

import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import FieldError from '../ui/FieldError'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import { useBoardStore } from '../../store/boardStore'

// Editing a board's name and icon in one place.
//
// "Details" is exactly those two fields — the boards table has no description
// column, so there is nothing else to edit here. Renaming and changing the
// icon were previously only reachable from the sidebar, one inline and one
// through a picker, with no single surface that said "this board's settings".
//
// Shaped after CreateBoardModal deliberately: same header, same icon-button
// beside the name field, same footer. Editing a board should look like the
// dialog that made it.
export default function BoardDetailsModal({ board, onClose }) {
  const renameBoard = useBoardStore((s) => s.renameBoard)
  const updateBoardIcon = useBoardStore((s) => s.updateBoardIcon)

  const [name, setName] = useState(board.name)
  const [icon, setIcon] = useState(board.icon)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e?.preventDefault?.()
    const next = name.trim()
    if (!next) {
      setError('Give the board a name.')
      return
    }
    setSaving(true)
    try {
      // Two independent writes; only send the ones that changed so an
      // unchanged field can't fail the save.
      if (next !== board.name) await renameBoard(board.id, next)
      if (icon !== board.icon) await updateBoardIcon(board.id, icon)
      onClose()
    } catch {
      setError("Couldn't save those changes. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      contentClassName="grid items-center justify-items-center overflow-y-auto md:p-10 p-4"
    >
      <form
        onSubmit={handleSave}
        className="flex flex-col text-left shadow-[var(--shadow-raised)] border-0.5 border-[var(--border-default)] rounded-xl md:p-6 p-4 bg-[var(--surface-page)] w-full max-w-md"
      >
        <div className="flex items-start gap-4 justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] leading-6">Board details</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              The name and icon shown in the sidebar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 flex items-center justify-center p-1 -m-1 rounded text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label htmlFor="board-name" className="mt-5 block text-sm font-medium text-[var(--text-secondary)]">
          Name
        </label>
        <div className="mt-1.5 flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label="Change board icon"
            className="w-9 h-9 shrink-0 rounded-lg border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--color-mist)] transition-colors"
          >
            <DynamicIcon name={icon} className="w-4 h-4" />
          </button>
          <Input
            id="board-name"
            value={name}
            onChange={(e) => { setName(e.target.value); if (error) setError('') }}
            placeholder="Board name"
            maxLength={200}
            autoFocus
            error={!!error}
            aria-invalid={!!error}
            wrapperClassName="flex-1"
            className="flex-1"
          />
        </div>
        <FieldError>{error}</FieldError>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} loadingText="Saving">Save</Button>
        </div>
      </form>

      {pickerOpen && (
        <IconPicker
          value={icon}
          onChange={(next) => { setIcon(next); setPickerOpen(false) }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Modal>
  )
}
