import { useState, useMemo } from 'react'
import { X, DotsThreeVertical, CaretRight } from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Menu from '../ui/Menu'
import Button from '../ui/Button'
import Input from '../ui/Input'
import FieldError from '../ui/FieldError'
import ConfirmModal from './ConfirmModal'
import { useBoardStore } from '../../store/boardStore'
import { LABEL_COLORS, LABEL_COLORS_LIGHT, COLOR_DOT_CLASSES } from '../../constants/colors'
import { LABEL_OUTLINE } from '../../utils/formatting'

// The board's label admin surface. Applying a label to a card is not this
// component's job — LabelAutocomplete does that from the card, and links here
// via the 'kolumn:open-label-manager' event for the rarer work: renaming,
// recolouring, merging, archiving, deleting.
//
// Reworked to match the other dialogs (CreateBoardModal, WorkspaceCreateModal):
// labelled sections, full-width controls, a footer. Three things changed
// beyond the styling, each fixing something the old version made hard:
//
// - **A row shows the label, not a description of it.** It used to render
//   "/name" beside a dot, which is neither how a label looks on a card nor
//   obviously editable. It is now the actual pill.
// - **The count is a way in, not a full stop.** "3 cards" filters the board to
//   that label; "Unused" makes the ones worth deleting obvious at a glance.
// - **One place for actions.** Colour, rename, merge, archive and delete were
//   spread across three different affordances — a dot menu, a click on the
//   name, and a ⋮ menu — none of them visible. They now all live in the ⋮,
//   with the colour swatch kept as a shortcut because it doubles as the
//   swatch itself.

function LabelPill({ label }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium leading-[1.4] py-px px-1.5 border-[0.5px] rounded-md capitalize truncate ${
        LABEL_OUTLINE[label.color] || LABEL_OUTLINE.gray
      }`}
    >
      {label.text}
    </span>
  )
}

// Row 1 is the saturated hues, row 2 their light variants — same grid the
// card's label picker uses, so the palette reads the same everywhere.
function ColorGrid({ value, onPick }) {
  return (
    <div role="radiogroup" aria-label="Label colour" className="grid grid-cols-8 gap-1.5 p-0.5">
      {[...LABEL_COLORS, ...LABEL_COLORS_LIGHT].map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={c}
          onClick={() => onPick(c)}
          className={`w-7 h-7 rounded-md transition ${COLOR_DOT_CLASSES[c] || ''} ${
            c === value
              ? 'ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--surface-page)]'
              : 'hover:opacity-75'
          }`}
        />
      ))}
    </div>
  )
}

export default function LabelManagerModal({ open, onClose, boardId, onFilterByLabel }) {
  const [newText, setNewText] = useState('')
  const [newColor, setNewColor] = useState('blue')
  const [newColorOpen, setNewColorOpen] = useState(false)
  const [addError, setAddError] = useState('')

  const [renameId, setRenameId] = useState(null)
  const [renameText, setRenameText] = useState('')
  const [menuOpen, setMenuOpen] = useState({})
  const [colorOpen, setColorOpen] = useState({})
  const [mergeFrom, setMergeFrom] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [archivedOpen, setArchivedOpen] = useState(false)

  // Selectors must return referentially-stable values. Read primitive slices,
  // derive via useMemo. (See selectors.js header comment for why.)
  const labelsMap = useBoardStore((s) => s.labels)
  const cardLabelsMap = useBoardStore((s) => s.cardLabels)

  const { active, archived } = useMemo(() => {
    const a = []
    const b = []
    for (const id in labelsMap) {
      const l = labelsMap[id]
      if (l.board_id !== boardId) continue
      ;(l.archived_at ? b : a).push(l)
    }
    const byName = (x, y) => x.text.toLowerCase().localeCompare(y.text.toLowerCase())
    return { active: a.sort(byName), archived: b.sort(byName) }
  }, [labelsMap, boardId])

  const usageById = useMemo(() => {
    const counts = {}
    for (const cid in cardLabelsMap) {
      for (const lid of cardLabelsMap[cid]) counts[lid] = (counts[lid] || 0) + 1
    }
    return counts
  }, [cardLabelsMap])

  const renameLabel = useBoardStore((s) => s.renameLabel)
  const updateLabelColor = useBoardStore((s) => s.updateLabelColor)
  const mergeLabels = useBoardStore((s) => s.mergeLabels)
  const archiveLabel = useBoardStore((s) => s.archiveLabel)
  const unarchiveLabel = useBoardStore((s) => s.unarchiveLabel)
  const createLabel = useBoardStore((s) => s.createLabel)
  const deleteLabel = useBoardStore((s) => s.deleteLabel)

  const addLabel = async () => {
    const text = newText.trim()
    if (!text) return
    // Caught here rather than at the database, where the unique constraint
    // would surface as a raw Postgres error.
    if (active.concat(archived).some((l) => l.text.toLowerCase() === text.toLowerCase())) {
      setAddError('That label already exists on this board.')
      return
    }
    setAddError('')
    await createLabel(boardId, text, newColor)
    setNewText('')
  }

  const commitRename = (label) => {
    const next = renameText.trim()
    if (next && next !== label.text) renameLabel(label.id, next)
    setRenameId(null)
  }

  const setMenu = (id, v) => setMenuOpen((p) => ({ ...p, [id]: v }))
  const setColor = (id, v) => setColorOpen((p) => ({ ...p, [id]: v }))

  const renderRow = (l) => {
    const count = usageById[l.id] || 0
    return (
      <li key={l.id} className={`flex items-center gap-2.5 py-2.5 ${l.archived_at ? 'opacity-60' : ''}`}>
        {/* The swatch is both the colour indicator and the shortcut to change
            it — the one action worth reaching without opening a menu. */}
        <Menu
          open={!!colorOpen[l.id]}
          onOpenChange={(v) => setColor(l.id, v)}
          placement="bottom-start"
          portal
          panel={
            <ColorGrid
              value={l.color}
              onPick={(c) => { updateLabelColor(l.id, c); setColor(l.id, false) }}
            />
          }
        >
          <button
            type="button"
            onClick={() => setColor(l.id, !colorOpen[l.id])}
            aria-label={`Change colour of ${l.text}`}
            className={`block w-4 h-4 rounded shrink-0 transition hover:opacity-75 ${COLOR_DOT_CLASSES[l.color] || ''}`}
          />
        </Menu>

        {renameId === l.id ? (
          <Input
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename(l)
              else if (e.key === 'Escape') setRenameId(null)
            }}
            onBlur={() => commitRename(l)}
            autoFocus
            aria-label={`Rename ${l.text}`}
            className="!h-7 !text-xs"
            wrapperClassName="flex-1"
          />
        ) : (
          // flex + items-center, so the pill is centred on the row rather than
          // sitting on a text baseline. Measured before the fix: the pill sat
          // 1px below the row's centre and the swatch 2.5px above it — 3.5px
          // apart, which reads as a wonky row. The swatch needs `block` for the
          // same reason: an inline-level button reserves descender space.
          <div className="flex-1 min-w-0 flex items-center">
            <LabelPill label={l} />
          </div>
        )}

        {/* A count that goes somewhere. "Unused" is deliberately plain text —
            there is nothing to filter to, and it is the cue to delete. */}
        {count > 0 ? (
          <button
            type="button"
            onClick={() => { onFilterByLabel?.(l.text); onClose() }}
            className="shrink-0 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline transition-colors"
          >
            {count} card{count === 1 ? '' : 's'}
          </button>
        ) : (
          <span className="shrink-0 text-xs text-[var(--text-faint)]">Unused</span>
        )}

        <Menu
          open={!!menuOpen[l.id]}
          onOpenChange={(v) => setMenu(l.id, v)}
          placement="bottom-end"
          portal
          panel={
            <>
              <Menu.Item onSelect={() => { setMenu(l.id, false); setRenameId(l.id); setRenameText(l.text) }}>
                Rename
              </Menu.Item>
              {!l.archived_at && (
                <>
                  <Menu.Item onSelect={() => { setMenu(l.id, false); setMergeFrom(l) }}>
                    Merge into…
                  </Menu.Item>
                  <Menu.Item onSelect={() => { setMenu(l.id, false); archiveLabel(l.id) }}>
                    Archive
                  </Menu.Item>
                </>
              )}
              {l.archived_at && (
                <Menu.Item onSelect={() => { setMenu(l.id, false); unarchiveLabel(l.id) }}>
                  Restore
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item destructive onSelect={() => { setMenu(l.id, false); setConfirmDelete(l) }}>
                Delete
              </Menu.Item>
            </>
          }
        >
          <button
            type="button"
            onClick={() => setMenu(l.id, !menuOpen[l.id])}
            aria-label={`Options for ${l.text}`}
            className="shrink-0 flex items-center justify-center p-1 -mr-1 rounded text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <DotsThreeVertical className="w-4 h-4" />
          </button>
        </Menu>
      </li>
    )
  }

  const mergeTargets = active.filter((l) => l.id !== mergeFrom?.id)

  return (
    <Modal
      open={open}
      onClose={onClose}
      contentClassName="grid items-center justify-items-center overflow-y-auto md:p-10 p-4"
    >
      <div className="flex flex-col text-left shadow-[var(--shadow-raised)] border-0.5 border-[var(--border-default)] rounded-xl md:p-6 p-4 bg-[var(--surface-page)] w-full max-w-md">
        <div className="flex items-start gap-4 justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] leading-6">Labels</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Rename, recolour and tidy up this board&rsquo;s labels.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1 -m-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add — a permanent field, not a disclosure. Creating a label was the
            most common thing to do here and it took two clicks to reach. */}
        <label htmlFor="new-label" className="mt-5 block text-sm font-medium text-[var(--text-secondary)]">
          Add a label
        </label>
        <div className="mt-1.5 flex items-stretch gap-2">
          <Input
            id="new-label"
            value={newText}
            onChange={(e) => { setNewText(e.target.value); if (addError) setAddError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel() } }}
            placeholder="Label name"
            maxLength={64}
            error={!!addError}
            aria-invalid={!!addError}
            wrapperClassName="flex-1"
            className="flex-1"
          />
          <Menu
            open={newColorOpen}
            onOpenChange={setNewColorOpen}
            placement="bottom-end"
            portal
            panel={<ColorGrid value={newColor} onPick={(c) => { setNewColor(c); setNewColorOpen(false) }} />}
          >
            <button
              type="button"
              onClick={() => setNewColorOpen((v) => !v)}
              aria-label="Choose a colour"
              className={`w-9 h-9 shrink-0 rounded-lg border border-[var(--border-default)] flex items-center justify-center hover:border-[var(--color-mist)] transition-colors`}
            >
              <span className={`w-4 h-4 rounded ${COLOR_DOT_CLASSES[newColor] || ''}`} />
            </button>
          </Menu>
          <Button onClick={addLabel} disabled={!newText.trim()}>Add</Button>
        </div>
        <FieldError>{addError}</FieldError>

        <p className="mt-6 text-sm font-medium text-[var(--text-secondary)]">
          On this board {active.length > 0 && `(${active.length})`}
        </p>
        {active.length === 0 ? (
          <p className="py-4 text-xs text-[var(--text-faint)] text-center">
            No labels yet. Add one above.
          </p>
        ) : (
          <ul className="mt-1 divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto subtle-scrollbar">
            {active.map(renderRow)}
          </ul>
        )}

        {/* Archived only takes up room when there is something in it — it used
            to be a permanent checkbox for a rare case. */}
        {archived.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setArchivedOpen((v) => !v)}
              aria-expanded={archivedOpen}
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <CaretRight className={`w-3 h-3 transition-transform ${archivedOpen ? 'rotate-90' : ''}`} />
              Archived ({archived.length})
            </button>
            {archivedOpen && (
              <ul className="mt-1 divide-y divide-[var(--border-subtle)]">
                {archived.map(renderRow)}
              </ul>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>

      {mergeFrom && (
        <Modal
          open
          onClose={() => setMergeFrom(null)}
          contentClassName="flex items-center justify-center"
          zIndex={60}
        >
          <div className="bg-[var(--surface-page)] border-0.5 border-[var(--border-default)] rounded-xl shadow-[var(--shadow-raised)] w-full max-w-xs mx-4 p-4">
            <p className="text-sm text-[var(--text-primary)]">
              Merge <span className="font-medium">{mergeFrom.text}</span> into…
            </p>
            <p className="mt-1 mb-3 text-xs text-[var(--text-muted)]">
              Every card keeps the label you pick. {mergeFrom.text} is removed.
            </p>
            {mergeTargets.length === 0 ? (
              <p className="py-3 text-xs text-[var(--text-faint)] text-center">
                No other labels to merge into
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)] max-h-64 overflow-auto">
                {mergeTargets.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => { mergeLabels(mergeFrom.id, l.id); setMergeFrom(null) }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-left hover:bg-[var(--surface-hover)] transition-colors rounded"
                    >
                      <LabelPill label={l} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${confirmDelete.text}"`}
          message={
            (usageById[confirmDelete.id] || 0) > 0
              ? `This removes the label from ${usageById[confirmDelete.id]} card${usageById[confirmDelete.id] === 1 ? '' : 's'}. The cards themselves are not deleted.`
              : 'This label is not on any card. Deleting it cannot be undone.'
          }
          onConfirm={() => { deleteLabel(confirmDelete.id); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </Modal>
  )
}
