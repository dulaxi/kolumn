import { useRef } from 'react'
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
      {/* The surface is a normal raised dialog — the same 0.5px border,
          shadow and ground as every other modal in the app. It used to carry a
          full red border, a red title and a warning glyph, which made the
          panel shout before you had read what it was asking. Red is reserved
          for destructive *intent*, and that intent now lives in exactly one
          place: the confirm button. The title says what will happen and the
          button says what it does, so an icon repeating "careful" adds
          nothing. */}
      <div
        className="bg-[var(--surface-page)] border-0.5 border-[var(--border-default)] shadow-[var(--shadow-raised)] rounded-xl w-full max-w-sm mx-4 p-5"
      >
        <h3 id="confirm-title" className="text-sm font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
        <p id="confirm-message" className="text-sm text-[var(--text-secondary)] mb-4">{message}</p>
        <div className="flex items-center gap-2">
          <Button ref={confirmRef} variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
