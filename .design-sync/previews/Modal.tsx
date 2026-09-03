// Modal — portal + fixed overlay, dimmed ink backdrop, focus trap.
// The component renders only the overlay/wrapper; callers compose the
// actual panel markup. These stories mirror ConfirmModal.jsx (alertdialog)
// and CreateBoardModal.jsx (form dialog) — the two real-app patterns.
import { useRef } from 'react'
import { Modal, Button, Input } from 'kolumn'
import { Warning, X } from '@phosphor-icons/react'

const overlayNote: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--text-faint)',
  marginBottom: 8,
}

const confirmPanel: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--label-red-text)',
  borderRadius: 12,
  width: '100%',
  maxWidth: 360,
  margin: '0 16px',
  padding: 20,
}

const formPanel: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 12,
  boxShadow: '0 4px 24px rgba(27,27,24,0.10)',
  width: '100%',
  maxWidth: 420,
  margin: '0 16px',
  padding: 20,
}

const headerRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}

const titleRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
}

const footerRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 16,
}

export const ConfirmDelete = () => {
  const confirmRef = useRef<HTMLButtonElement>(null)
  return (
    <div>
      <div style={overlayNote}>Modal — alertdialog (ConfirmModal pattern)</div>
      <Modal
        open
        onClose={() => {}}
        role="alertdialog"
        ariaLabelledBy="confirm-title"
        ariaDescribedBy="confirm-message"
        initialFocusRef={confirmRef}
      >
        <div style={confirmPanel}>
          <div style={titleRow}>
            <Warning size={16} color="var(--label-red-text)" weight="fill" />
            <h3
              id="confirm-title"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--label-red-text)', margin: 0 }}
            >
              Delete &quot;Q3 Launch&quot; board
            </h3>
          </div>
          <p id="confirm-message" style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            This permanently deletes the board, its 6 columns, and all 34 cards. Members lose
            access immediately. This can&apos;t be undone.
          </p>
          <div style={footerRow}>
            <Button ref={confirmRef} variant="destructive">
              Delete board
            </Button>
            <Button variant="ghost">Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export const RenameBoard = () => {
  const nameRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <div style={overlayNote}>Modal — form dialog (CreateBoardModal pattern)</div>
      <Modal open onClose={() => {}} initialFocusRef={nameRef}>
        <div style={formPanel}>
          <div style={headerRow}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Rename board
            </h2>
            <button
              type="button"
              aria-label="Close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 12px' }}>
            This updates the board name everywhere it appears, including the sidebar and card
            breadcrumbs.
          </p>
          <Input ref={nameRef} defaultValue="Q3 Launch" aria-label="Board name" />
          <div style={footerRow}>
            <Button variant="primary">Save changes</Button>
            <Button variant="secondary">Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
