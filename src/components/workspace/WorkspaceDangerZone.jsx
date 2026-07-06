import { useState } from 'react'
import { Check, SignOut, Trash } from '@phosphor-icons/react'
import Button from '../ui/Button'

export default function WorkspaceDangerZone({ isOwner, onDelete, onLeave }) {
  const [confirm, setConfirm] = useState(false)

  const action = isOwner ? onDelete : onLeave
  const title = isOwner ? 'Delete workspace' : 'Leave workspace'
  const description = isOwner
    ? 'This permanently removes the workspace and unlinks its boards. This cannot be undone.'
    : "You'll lose access to all boards in this workspace."
  const confirmLabel = isOwner ? 'Confirm delete' : 'Confirm leave'
  const triggerIcon = isOwner ? <Trash className="w-4 h-4" /> : <SignOut className="w-4 h-4" />

  return (
    <section className="mt-12 mb-6">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">Danger zone</h2>
      <div className="mt-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-sm font-medium text-[var(--text-primary)]">{title}</div>
          <div className="text-xs text-[var(--text-muted)]">{description}</div>
        </div>
        {confirm ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={action}>
              <Check className="w-4 h-4" /> {confirmLabel}
            </Button>
          </div>
        ) : isOwner ? (
          <Button variant="secondary" onClick={() => setConfirm(true)} className="text-[var(--color-copper)]">
            {triggerIcon} {title}
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setConfirm(true)}>
            {triggerIcon} {title}
          </Button>
        )}
      </div>
    </section>
  )
}
