import { useRef } from 'react'
import { Warning } from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function ConfirmModal({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const confirmRef = useRef(null)

  return (
    <Modal
      open
      onClose={onCancel}
      role="alertdialog"
      ariaLabelledBy="confirm-title"
      ariaDescribedBy="confirm-message"
      initialFocusRef={confirmRef}
    >
      <div
        className="bg-[var(--surface-card)] border border-[var(--color-copper)] rounded-2xl w-full max-w-sm mx-4 p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Warning className="w-4 h-4 text-[var(--color-copper)]" />
          <h3 id="confirm-title" className="text-sm font-semibold text-[var(--color-copper)]">{title}</h3>
        </div>
        <p id="confirm-message" className="text-sm text-[var(--text-secondary)] mb-4">{message}</p>
        <div className="flex items-center gap-2">
          <Button ref={confirmRef} variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
