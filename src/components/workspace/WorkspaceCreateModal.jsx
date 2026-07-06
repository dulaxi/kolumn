import { useEffect, useRef, useState } from 'react'
import { X } from '@phosphor-icons/react'

import { useWorkspacesStore } from '../../store/workspacesStore'
import { WORKSPACE_COLORS } from '../../constants/colors'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'

/**
 * WorkspaceCreateModal — name + color picker.
 *
 * Schema note: the chosen color name (e.g. "lavender") is stored in the
 * existing `workspaces.icon` column to avoid a DB migration. The cube
 * glyph is rendered everywhere a workspace icon would appear, colored
 * via resolveWorkspaceColor(workspace).
 */
export default function WorkspaceCreateModal({ open, onClose, onCreated }) {
  const createWorkspace = useWorkspacesStore((s) => s.createWorkspace)
  const [name, setName] = useState('')
  // NOTE: description is captured but not persisted yet — createWorkspace's
  // signature is (name, icon). To actually save it, add a `description`
  // column to the workspaces table and thread it through the store action.
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(WORKSPACE_COLORS[0].name)
  const [submitting, setSubmitting] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setColor(WORKSPACE_COLORS[0].name)
      setSubmitting(false)
    }
  }, [open])

  const canSubmit = name.trim().length > 0 && !submitting

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!canSubmit) return
    setSubmitting(true)
    // Store color name in the `icon` field (overloaded — see colors.js).
    const id = await createWorkspace(name.trim(), color)
    setSubmitting(false)
    if (id && onCreated) onCreated(id)
    onClose()
  }

  return (
    <Modal
      open={open}
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
            <span className="[overflow-wrap:anywhere]">Create workspace</span>
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
          Workspaces group boards with team members.
        </p>

        {/* Name */}
        <div className="flex flex-col gap-1 mt-2">
          <label htmlFor="ws-name" className="text-sm font-medium text-[var(--text-secondary)]">
            Name
          </label>
          <Input
            id="ws-name"
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name for your workspace"
            maxLength={64}
          />
        </div>

        {/* Description — auto-growing textarea via grid trick.
            UI-only for now; not persisted (createWorkspace doesn't take it). */}
        <div className="flex flex-col gap-1 mt-3">
          <label htmlFor="ws-desc" className="text-sm font-medium text-[var(--text-secondary)]">
            Description <span className="text-[var(--text-faint)] font-normal">(optional)</span>
          </label>
          <div className="grid">
            <div
              aria-hidden="true"
              className="bg-[var(--surface-card)] border border-[var(--border-default)] p-3 leading-5 rounded-[0.6rem] whitespace-pre-wrap resize-none row-start-1 row-end-2 col-start-1 col-end-2 min-w-0 break-words text-sm max-h-[124px] overflow-y-auto pointer-events-none invisible"
            >{description || ' '}</div>
            <textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="What this workspace is for. Who's in it. What gets worked on here."
              className="bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--color-mist)] focus:border-[var(--text-muted)] transition-colors placeholder:text-[var(--text-faint)] p-3 leading-5 rounded-[0.6rem] whitespace-pre-wrap resize-none row-start-1 row-end-2 col-start-1 col-end-2 min-w-0 break-words text-sm max-h-[124px] overflow-y-auto focus:outline-none"
            />
          </div>
        </div>

        {/* Color picker — 2 rows × 5 cols, exact Anthropic palette */}
        <div className="flex flex-col gap-2 mt-4">
          <label className="text-sm font-medium text-[var(--text-secondary)]">Color</label>
          <div
            role="radiogroup"
            aria-label="Workspace color"
            className="grid grid-cols-7 grid-rows-2 gap-2 w-fit"
          >
            {WORKSPACE_COLORS.map((c) => {
              const selected = c.name === color
              return (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                  onClick={() => setColor(c.name)}
                  style={{ background: c.hex }}
                  className={`w-8 h-8 rounded-md cursor-pointer transition ${
                    selected
                      ? 'ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--surface-page)]'
                      : 'hover:opacity-75'
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row justify-end">
          <Button variant="secondary" onClick={onClose} className="min-w-[5rem]">
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit} className="min-w-[5rem]">
            Create
          </Button>
        </div>
      </form>
    </Modal>
  )
}
