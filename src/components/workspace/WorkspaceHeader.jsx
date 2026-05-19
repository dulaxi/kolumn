import { useEffect, useRef, useState } from 'react'
import { Cube, Pencil } from '@phosphor-icons/react'
import Popover from '../ui/Popover'
import WorkspaceColorPicker from './WorkspaceColorPicker'
import { resolveWorkspaceColor } from '../../constants/colors'

export default function WorkspaceHeader({
  workspace,
  isOwner,
  memberCount,
  ownerName,
  onRename,
  onIconChange,
}) {
  // `onIconChange` and `workspace.icon` are misnamed historically — the
  // column now stores a color name (see resolveWorkspaceColor). Kept as-is
  // to avoid a cross-cutting rename through the store + RPCs.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingName) setTimeout(() => inputRef.current?.focus(), 50)
  }, [editingName])

  const startRename = () => {
    setNameDraft(workspace.name)
    setEditingName(true)
  }

  const saveRename = async () => {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== workspace.name) await onRename(trimmed)
    setEditingName(false)
  }

  const handleColor = async (name) => {
    setPickerOpen(false)
    await onIconChange(name)
  }

  const color = resolveWorkspaceColor(workspace)

  return (
    <div className="flex items-start gap-4">
      <Popover
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        placement="bottom-start"
        className="shrink-0"
        panel={
          <WorkspaceColorPicker
            value={workspace.icon}
            onChange={handleColor}
            onClose={() => setPickerOpen(false)}
          />
        }
      >
        <button
          type="button"
          onClick={() => isOwner && setPickerOpen((o) => !o)}
          disabled={!isOwner}
          className={`h-16 w-16 rounded-2xl border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)] flex items-center justify-center transition-colors ${
            isOwner ? 'hover:border-[var(--color-mist)] cursor-pointer' : ''
          }`}
          aria-label={isOwner ? 'Change workspace color' : undefined}
        >
          <Cube weight="fill" className="w-7 h-7" style={{ color }} />
        </button>
      </Popover>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {editingName ? (
            <input
              ref={inputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename()
                if (e.key === 'Escape') setEditingName(false)
              }}
              maxLength={64}
              className="font-heading text-2xl text-[var(--text-primary)] bg-transparent border-b border-[var(--border-default)] focus:outline-none focus:border-[var(--text-muted)] min-w-0 flex-1"
            />
          ) : (
            <>
              <h1 className="font-heading text-2xl text-[var(--text-primary)] truncate">{workspace.name}</h1>
              {isOwner && (
                <button
                  type="button"
                  onClick={startRename}
                  aria-label="Rename workspace"
                  className="h-7 w-7 rounded-md inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {memberCount} member{memberCount !== 1 ? 's' : ''}
          {ownerName ? ` · owned by ${ownerName}` : ''}
        </p>
      </div>
    </div>
  )
}
