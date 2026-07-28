import Modal from './ui/Modal'

const ITEMS = [
  { keys: ['Ctrl', 'K'], desc: 'Open search' },
  { keys: ['/'], desc: 'Focus search' },
  { keys: ['Ctrl', 'B'], desc: 'Toggle sidebar' },
  { keys: ['?'], desc: 'Show / hide shortcuts' },
  { keys: ['Esc'], desc: 'Close any open dialog' },
]

export default function ShortcutsSheet({ open, onClose }) {
  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} contentClassName="flex items-center justify-center">
      <div className="bg-[var(--surface-card)] rounded-xl shadow-[var(--shadow-raised)] w-full max-w-md mx-4 p-7">
        <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)] mb-6">Keyboard shortcuts</h2>

        <ul className="divide-y divide-[var(--border-subtle)]">
          {ITEMS.map(({ keys, desc }) => (
            <li
              key={desc}
              className="flex items-center gap-3 py-3 font-mono text-[12px] text-[var(--text-primary)]"
            >
              <span className="flex-1 truncate">{desc}</span>
              <span className="font-mono text-[11px] text-[var(--accent-lime-text)] bg-[var(--accent-lime-wash)] px-2 py-0.5 rounded-md">
                {keys.join(' + ')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
