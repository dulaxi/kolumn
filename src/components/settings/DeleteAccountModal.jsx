import { useState } from 'react'
import { Warning } from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import InlineNotice from '../ui/InlineNotice'
import { useAuthStore } from '../../store/authStore'
import { deleteAccount } from '../../lib/accountClient'

export default function DeleteAccountModal({ open, onClose, onDeleted }) {
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const email = profile?.email || user?.email || ''
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [blockers, setBlockers] = useState(null)
  const [error, setError] = useState(null)

  const reset = () => { setTyped(''); setBlockers(null); setError(null); setBusy(false) }

  const handleDelete = async () => {
    setBusy(true)
    setError(null)
    setBlockers(null)
    try {
      await deleteAccount()
      onDeleted()
    } catch (err) {
      if (err.blockers) setBlockers(err.blockers)
      else setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} role="alertdialog" ariaLabel="Delete account" zIndex={60}>
      <div className="w-full max-w-md mx-4 rounded-xl border border-[var(--label-red-text)] bg-[var(--surface-card)] p-5">
        <div className="mb-2 flex items-center gap-2">
          <Warning className="h-4 w-4 text-[var(--label-red-text)]" />
          <h3 className="text-sm font-semibold text-[var(--label-red-text)]">Delete account</h3>
        </div>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          This permanently deletes your account, boards, cards, and workspaces.
          There is no undo.
        </p>

        {blockers && (
          <InlineNotice variant="danger">
            <strong className="block font-semibold">Transfer or delete these first</strong>
            <span className="text-[var(--text-secondary)]">
              You still own shared items other people are using:{' '}
              {blockers.map((b) => `${b.name} (${b.type})`).join(', ')}
            </span>
          </InlineNotice>
        )}
        {error && <InlineNotice variant="error">{error}</InlineNotice>}

        <label htmlFor="delete-confirm-email" className="mb-1 mt-3 block text-xs text-[var(--text-secondary)]">
          Type your email to confirm
        </label>
        <Input
          id="delete-confirm-email"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={email}
        />
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="destructive"
            disabled={typed !== email || busy}
            loading={busy}
            onClick={handleDelete}
          >
            Delete my account
          </Button>
          <Button variant="ghost" onClick={() => { reset(); onClose() }}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
