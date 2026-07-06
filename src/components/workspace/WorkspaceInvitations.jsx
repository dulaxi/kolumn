import { useState } from 'react'
import { Envelope, X } from '@phosphor-icons/react'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function WorkspaceInvitations({ sentInvitations, onInvite, onCancelInvitation }) {
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const handleInvite = async (e) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setInviting(true)
    await onInvite(trimmed)
    setInviting(false)
    setEmail('')
  }

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">Invite members</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Enter an email. They'll join the workspace next time they sign in.</p>

      <form onSubmit={handleInvite} className="mt-4 flex items-stretch gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          leadingIcon={<Envelope className="w-4 h-4" />}
          wrapperClassName="flex-1"
        />
        <Button
          type="submit"
          disabled={!email.trim() || inviting}
          loading={inviting}
          loadingText="Sending"
          className="whitespace-nowrap"
        >
          Send invite
        </Button>
      </form>

      {sentInvitations.length > 0 && (
        <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden">
          <div className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] border-b border-[var(--border-default)]">
            Pending invitations
          </div>
          <ul className="divide-y divide-[var(--border-default)]">
            {sentInvitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--surface-hover)] text-[var(--text-muted)]">
                  <Envelope className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-primary)] truncate">{inv.invited_email}</div>
                  <div className="text-xs text-[var(--text-muted)]">Pending</div>
                </div>
                <button
                  type="button"
                  onClick={() => onCancelInvitation(inv.id)}
                  aria-label="Cancel invitation"
                  className="h-8 w-8 rounded-md inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
