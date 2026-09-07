import { useState } from 'react'
import ConfirmModal from '../components/board/ConfirmModal'

// Dev-only surface for the destructive-confirm dialog: every place the app
// asks "are you sure?", in one list. Route: /sandbox/confirm-modal.
//
// These render the REAL ConfirmModal with the real props from each call site —
// not a copy of its markup. A sandbox that reimplements the component can drift
// from it silently, which is the one thing a sandbox must not do. The trade is
// that they can only be viewed one at a time: ConfirmModal is a Modal, so it
// portals, traps focus and locks body scroll.
//
// Copy is transcribed from the call sites listed in `where`. If you change a
// message there, change it here too — or better, notice that three of these
// are the same dialog and reach for a shared constant.

const VARIANTS = [
  {
    id: 'delete-board',
    where: ['layout/Sidebar.jsx'],
    title: 'Delete board',
    message: 'This will permanently delete the board and all its tasks.',
  },
  {
    id: 'delete-column',
    where: ['board/Column.jsx'],
    // Title and message are interpolated at the call site; these are a
    // realistic instance rather than the template.
    title: 'Delete "In progress"',
    message: 'This section has 3 task(s) that will be permanently deleted.',
    note: '"task(s)" is the only place the app punts on pluralisation.',
  },
  {
    id: 'delete-conversation',
    where: ['pages/ChatPage.jsx', 'pages/ChatListPage.jsx'],
    title: 'Delete conversation?',
    message: 'This permanently removes the conversation and its messages.',
    note: 'Same dialog in two files. Only variant whose title takes a question mark, along with "Cancel your plan?".',
  },
  {
    id: 'leave-board',
    where: ['board/BoardShareModal.jsx', 'layout/Sidebar.jsx', 'layout/WorkspaceSidebar.jsx'],
    title: 'Leave board',
    message: "You'll lose access to this board. The owner can re-invite you later.",
    confirmLabel: 'Leave',
    note: 'Identical copy duplicated across three files — a shared constant waiting to happen.',
  },
  {
    id: 'cancel-plan',
    where: ['settings/BillingSection.jsx'],
    title: 'Cancel your plan?',
    message: "You'll move to the Free plan immediately. Your boards and data stay untouched.",
    confirmLabel: 'Cancel plan',
    note: 'The only one that is not destructive to data. It still gets the red treatment.',
  },
]

export default function ConfirmModalSandbox() {
  const [openId, setOpenId] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const open = VARIANTS.find((v) => v.id === openId)

  return (
    <div className="min-h-screen bg-[var(--surface-page)] px-6 sm:px-10 py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)]">
          Confirm dialogs
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Every destructive confirmation in the app, rendered from the real{' '}
          <code className="font-mono text-[13px]">ConfirmModal</code>. Five distinct
          dialogs across eight call sites.
        </p>

        {lastAction && (
          <p className="mt-6 font-mono text-[12px] text-[var(--text-muted)]">
            last action: {lastAction}
          </p>
        )}

        <ul className="mt-8 flex flex-col">
          {VARIANTS.map((v) => (
            <li
              key={v.id}
              className="flex items-start justify-between gap-6 border-b border-[var(--border-subtle)] py-4"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-[var(--text-primary)]">{v.title}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{v.message}</p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {v.where.map((w) => (
                    <span
                      key={w}
                      className="rounded bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]"
                    >
                      {w}
                    </span>
                  ))}
                </p>
                {v.note && (
                  <p className="mt-2 text-[13px] text-[var(--text-muted)]">{v.note}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpenId(v.id)}
                className="shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Open
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[13px] text-[var(--text-muted)]">
          Confirming here does nothing but close the dialog and log above — no data is touched.
        </p>
      </div>

      {open && (
        <ConfirmModal
          title={open.title}
          message={open.message}
          confirmLabel={open.confirmLabel}
          onConfirm={() => { setLastAction(`confirmed — ${open.id}`); setOpenId(null) }}
          onCancel={() => { setLastAction(`cancelled — ${open.id}`); setOpenId(null) }}
        />
      )}
    </div>
  )
}
