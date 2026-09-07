import { useState } from 'react'
import { Envelope, X } from '@phosphor-icons/react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import FieldError from '../ui/FieldError'
import { isValidEmail, EMAIL_INVALID_MESSAGE } from '../../utils/validation'

export default function WorkspaceInvitations({ sentInvitations, onInvite, onCancelInvitation }) {
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [emailError, setEmailError] = useState('')

  // The await used to sit bare: a rejection escaped as an unhandled promise,
  // setInviting(false) never ran, and the button stayed on "Sending" with the
  // address still in the box and no way to try again. There was also no format
  // check, so a typo produced the browser's native tooltip rather than ours.
  const handleInvite = async (e) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    if (!isValidEmail(trimmed)) {
      setEmailError(EMAIL_INVALID_MESSAGE)
      return
    }
    setEmailError('')
    setInviting(true)
    try {
      await onInvite(trimmed)
      setEmail('')
    } catch {
      setEmailError("Couldn't send that invite. Try again.")
    } finally {
      setInviting(false)
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">Invite members</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Enter an email. They'll join the workspace next time they sign in.</p>

      {/* noValidate: type="email" + the browser's own constraint check would
          block submit and show a native tooltip before our validation runs. */}
      <form onSubmit={handleInvite} noValidate className="mt-4 flex items-stretch gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError('') }}
          placeholder="teammate@example.com"
          leadingIcon={<Envelope className="w-4 h-4" />}
          wrapperClassName="flex-1"
          error={!!emailError}
          aria-invalid={!!emailError}
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
      <FieldError>{emailError}</FieldError>

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
