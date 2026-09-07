import { useEffect, useState } from 'react'

import InlineErrorBoundary from '../components/InlineErrorBoundary'
import { useBoardStore } from '../store/boardStore'

import ConfirmModal from '../components/board/ConfirmModal'
import IconPicker from '../components/board/IconPicker'
import CreateBoardModal from '../components/board/CreateBoardModal'
import LabelManagerModal from '../components/board/LabelManagerModal'
import BoardShareModal from '../components/board/BoardShareModal'
import BoardActivityModal from '../components/board/BoardActivityModal'
import WorkspaceCreateModal from '../components/workspace/WorkspaceCreateModal'
import DeleteAccountModal from '../components/settings/DeleteAccountModal'
import SettingsModal from '../components/settings/SettingsModal'
import SearchDialog from '../components/SearchDialog'
import ShortcutsSheet from '../components/ShortcutsSheet'

// Dev-only surface for every overlay in the app: confirm dialogs, editors,
// pickers and sheets, opened one at a time. Route: /sandbox/overlays.
//
// Each entry renders the REAL component, never a copy of its markup — a
// sandbox that reimplements what it previews is free to drift from it
// silently, which is the one thing it must not do. That has a cost: several of
// these read from Zustand, so they need data to render. `seedBoard()` below
// puts a small fixture in the board store; anything that still can't stand up
// is caught by its own InlineErrorBoundary and reported in place rather than
// blanking the page. A boundary firing here is information, not a bug in the
// sandbox: it means that overlay cannot be previewed without a real session.
//
// Nothing here writes to Supabase. The fixture lives in memory and is cleared
// when you navigate away.

const BOARD_ID = 'sandbox-board'
const COLUMN_ID = 'sandbox-column'
const CARD_ID = 'sandbox-card'

function seedBoard() {
  useBoardStore.setState({
    boards: {
      [BOARD_ID]: {
        id: BOARD_ID,
        name: 'Launch plan',
        icon: 'rocket',
        owner_id: 'sandbox-user',
        workspace_id: null,
        next_task_number: 4,
      },
    },
    columns: {
      [COLUMN_ID]: { id: COLUMN_ID, board_id: BOARD_ID, title: 'In progress', position: 0 },
    },
    cards: {
      [CARD_ID]: {
        id: CARD_ID,
        board_id: BOARD_ID,
        column_id: COLUMN_ID,
        position: 0,
        task_number: 3,
        global_task_number: 12,
        title: 'Redo the pricing page',
        description: '',
        icon: 'browser',
        completed: false,
        priority: 'high',
        due_date: null,
        labels: [],
        checklist: [],
        assignees: [],
        assignee_name: null,
        assignee_refs: [],
      },
    },
    // Labels are what the label manager manages, so the fixture needs some —
    // its empty state says nothing about how the surface actually behaves.
    // One archived, one unused, and a couple in heavy use, so the counts and
    // the "show archived" toggle both have something to show.
    labels: {
      l1: { id: 'l1', board_id: BOARD_ID, text: 'frontend', color: 'blue', archived_at: null },
      l2: { id: 'l2', board_id: BOARD_ID, text: 'backend', color: 'red', archived_at: null },
      l3: { id: 'l3', board_id: BOARD_ID, text: 'design', color: 'pink', archived_at: null },
      l4: { id: 'l4', board_id: BOARD_ID, text: 'needs review', color: 'yellow', archived_at: null },
      l5: { id: 'l5', board_id: BOARD_ID, text: 'q3-planning', color: 'gray', archived_at: '2026-08-01T00:00:00Z' },
    },
    // Sets, not arrays: that is what the real store holds, and a fixture that
    // differs in shape can make a component look fine here and break in the app.
    cardLabels: {
      [CARD_ID]: new Set(['l1', 'l3']),
      'sandbox-card-2': new Set(['l1']),
      'sandbox-card-3': new Set(['l1', 'l2']),
      'sandbox-card-4': new Set(['l2']),
    },
    activeBoardId: BOARD_ID,
    loading: false,
  })
}

// `render` gets the close handler, so every overlay closes back to the list.
const OVERLAYS = [
  {
    group: 'Confirm dialogs',
    note: 'One ConfirmModal behind eight call sites. Five distinct dialogs.',
    items: [
      {
        id: 'delete-board',
        label: 'Delete board',
        where: 'layout/Sidebar.jsx',
        render: (close) => (
          <ConfirmModal
            title="Delete board"
            message="This will permanently delete the board and all its tasks."
            onConfirm={close}
            onCancel={close}
          />
        ),
      },
      {
        id: 'delete-column',
        label: 'Delete a column',
        where: 'board/Column.jsx',
        note: '"task(s)" is the only place the app punts on pluralisation.',
        render: (close) => (
          <ConfirmModal
            title={'Delete "In progress"'}
            message="This section has 3 task(s) that will be permanently deleted."
            onConfirm={close}
            onCancel={close}
          />
        ),
      },
      {
        id: 'delete-conversation',
        label: 'Delete conversation',
        where: 'ChatPage.jsx · ChatListPage.jsx',
        render: (close) => (
          <ConfirmModal
            title="Delete conversation?"
            message="This permanently removes the conversation and its messages."
            onConfirm={close}
            onCancel={close}
          />
        ),
      },
      {
        id: 'leave-board',
        label: 'Leave board',
        where: 'BoardShareModal · Sidebar · WorkspaceSidebar',
        note: 'Identical copy duplicated across three files.',
        render: (close) => (
          <ConfirmModal
            title="Leave board"
            message="You'll lose access to this board. The owner can re-invite you later."
            confirmLabel="Leave"
            onConfirm={close}
            onCancel={close}
          />
        ),
      },
      {
        id: 'cancel-plan',
        label: 'Cancel plan',
        where: 'settings/BillingSection.jsx',
        note: 'Destroys nothing, yet gets the same destructive treatment as deleting a board.',
        render: (close) => (
          <ConfirmModal
            title="Cancel your plan?"
            message="You'll move to the Free plan immediately. Your boards and data stay untouched."
            confirmLabel="Cancel plan"
            onConfirm={close}
            onCancel={close}
          />
        ),
      },
      {
        id: 'delete-account',
        label: 'Delete account',
        where: 'settings/DeleteAccountModal.jsx',
        note: 'Its own component, not ConfirmModal — the only one gated behind typing a phrase.',
        render: (close) => <DeleteAccountModal open onClose={close} />,
      },
    ],
  },
  {
    group: 'Create and edit',
    note: 'The dialogs that make something rather than destroy it.',
    items: [
      {
        id: 'create-board',
        label: 'New board',
        where: 'board/CreateBoardModal.jsx',
        render: (close) => <CreateBoardModal onClose={close} onCreated={close} />,
      },
      {
        id: 'create-workspace',
        label: 'New workspace',
        where: 'workspace/WorkspaceCreateModal.jsx',
        render: (close) => <WorkspaceCreateModal open onClose={close} onCreated={close} />,
      },
      {
        id: 'labels',
        label: 'Manage labels',
        where: 'board/LabelManagerModal.jsx',
        render: (close) => (
          <LabelManagerModal
            open
            onClose={close}
            boardId={BOARD_ID}
            onFilterByLabel={(t) => console.info('[sandbox] would filter board by label:', t)}
          />
        ),
      },
      {
        id: 'icon-picker',
        label: 'Icon picker',
        where: 'board/IconPicker.jsx',
        note: 'The only overlay with no store dependency at all.',
        render: (close) => <IconPicker value="rocket" onChange={close} onClose={close} />,
      },
    ],
  },
  {
    group: 'Board context',
    note: 'These read a real board. The sandbox seeds one card on one column.',
    items: [
      {
        id: 'share',
        label: 'Share board',
        where: 'board/BoardShareModal.jsx',
        render: (close) => (
          <BoardShareModal board={useBoardStore.getState().boards[BOARD_ID]} onClose={close} />
        ),
      },
      {
        id: 'activity',
        label: 'Board activity',
        where: 'board/BoardActivityModal.jsx',
        note: 'Seeded with no activity rows, so this is its empty state.',
        render: (close) => <BoardActivityModal boardId={BOARD_ID} onClose={close} />,
      },
    ],
  },
  {
    group: 'App chrome',
    note: 'Reached by keyboard in the real app.',
    items: [
      {
        id: 'search',
        label: 'Search (⌘K)',
        where: 'SearchDialog.jsx',
        render: (close) => <SearchDialog open onClose={close} />,
      },
      {
        id: 'shortcuts',
        label: 'Keyboard shortcuts (?)',
        where: 'ShortcutsSheet.jsx',
        render: (close) => <ShortcutsSheet open onClose={close} />,
      },
      {
        id: 'settings',
        label: 'Settings',
        where: 'settings/SettingsModal.jsx',
        render: (close) => <SettingsModal open onClose={close} />,
      },
    ],
  },
]

export default function OverlaysSandbox() {
  const [openId, setOpenId] = useState(null)
  const [last, setLast] = useState(null)

  useEffect(() => {
    seedBoard()
  }, [])

  const all = OVERLAYS.flatMap((g) => g.items)
  const open = all.find((o) => o.id === openId)
  const close = () => { setLast(openId); setOpenId(null) }

  return (
    <div className="min-h-screen bg-[var(--surface-page)] px-6 sm:px-10 py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)]">
          Overlays
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Every modal, dialog and sheet in the app — {all.length} of them — rendered
          from the real components. A seeded board stands in for real data; anything
          that still cannot render reports itself in place.
        </p>
        {last && (
          <p className="mt-4 font-mono text-[12px] text-[var(--text-muted)]">
            last closed: {last}
          </p>
        )}

        {OVERLAYS.map((g) => (
          <section key={g.group} className="mt-10">
            <h2 className="font-heading font-[425] text-xl tracking-tight text-[var(--text-primary)]">
              {g.group}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{g.note}</p>
            <ul className="mt-4 flex flex-col">
              {g.items.map((o) => (
                <li
                  key={o.id}
                  className="flex items-start justify-between gap-6 border-b border-[var(--border-subtle)] py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] text-[var(--text-primary)]">{o.label}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">{o.where}</p>
                    {o.note && (
                      <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">{o.note}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(o.id)}
                    className="shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-10 text-[13px] text-[var(--text-muted)]">
          Nothing here writes to Supabase. Confirming only closes the dialog.
        </p>
      </div>

      {open && (
        <InlineErrorBoundary name={`${open.label} (${open.where})`}>
          {open.render(close)}
        </InlineErrorBoundary>
      )}
    </div>
  )
}
