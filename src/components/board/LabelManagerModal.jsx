import { useState, useMemo } from 'react'
import { X, Plus, DotsThreeVertical } from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Menu from '../ui/Menu'
import { useBoardStore } from '../../store/boardStore'
import { LABEL_COLORS, LABEL_COLORS_LIGHT, COLOR_DOT_CLASSES } from '../../constants/colors'

export default function LabelManagerModal({ open, onClose, boardId }) {
  const [showArchived, setShowArchived] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [newText, setNewText] = useState('')
  const [newColor, setNewColor] = useState('blue')
  const [mergePicker, setMergePicker] = useState(null) // { fromLabel }
  const [renameId, setRenameId] = useState(null)
  const [renameText, setRenameText] = useState('')

  // Per-label dot-menu open state: { [labelId]: boolean }
  const [dotMenuOpen, setDotMenuOpen] = useState({})
  // Per-label color-picker menu open state: { [labelId]: boolean }
  const [colorMenuOpen, setColorMenuOpen] = useState({})

  // Selectors must return referentially-stable values. Read primitive slices,
  // derive via useMemo. (See selectors.js header comment for why.)
  const labelsMap = useBoardStore((s) => s.labels)
  const cardLabelsMap = useBoardStore((s) => s.cardLabels)

  const allLabels = useMemo(() => {
    const out = []
    for (const id in labelsMap) {
      const l = labelsMap[id]
      if (l.board_id === boardId && (showArchived || !l.archived_at)) out.push(l)
    }
    out.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()))
    return out
  }, [labelsMap, boardId, showArchived])

  const usageById = useMemo(() => {
    const counts = {}
    for (const cid in cardLabelsMap) {
      for (const lid of cardLabelsMap[cid]) counts[lid] = (counts[lid] || 0) + 1
    }
    return counts
  }, [cardLabelsMap])

  const renameLabel     = useBoardStore((s) => s.renameLabel)
  const updateLabelColor = useBoardStore((s) => s.updateLabelColor)
  const mergeLabels     = useBoardStore((s) => s.mergeLabels)
  const archiveLabel    = useBoardStore((s) => s.archiveLabel)
  const unarchiveLabel  = useBoardStore((s) => s.unarchiveLabel)
  const createLabel     = useBoardStore((s) => s.createLabel)

  const addNewLabel = async () => {
    const t = newText.trim()
    if (!t) return
    // createLabel inserts the new row into state.labels directly, so it appears
    // immediately rather than waiting on a realtime event.
    await createLabel(boardId, t, newColor)
    setNewText('')
    setNewOpen(false)
  }

  const toggleDotMenu = (id, val) =>
    setDotMenuOpen((prev) => ({ ...prev, [id]: val }))

  const toggleColorMenu = (id, val) =>
    setColorMenuOpen((prev) => ({ ...prev, [id]: val }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      contentClassName="grid items-center justify-items-center overflow-y-auto md:p-10 p-4"
    >
      <div className="flex flex-col text-left shadow-[var(--shadow-raised)] border-0.5 border-[var(--border-default)] rounded-xl md:p-6 p-4 bg-[var(--surface-page)] w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-4 justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] leading-6">Labels</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors -mx-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mt-1 mb-3">
          Organize cards with colored labels.
        </p>

        {/* Label list — scrolls internally so a long list never pushes the
            modal (or its header/footer controls) off-screen. */}
        <div className="divide-y divide-[var(--border-subtle)] max-h-[50vh] overflow-y-auto subtle-scrollbar">
            {allLabels.length === 0 && (
              <p className="py-4 text-xs text-[var(--text-faint)] text-center">
                No labels yet
              </p>
            )}
            {allLabels.map((l) => (
              <div
                key={l.id}
                className={`flex items-center gap-3 py-2 ${l.archived_at ? 'opacity-50' : ''}`}
              >
                {/* Color dot — opens color picker */}
                <Menu
                  open={!!colorMenuOpen[l.id]}
                  onOpenChange={(v) => toggleColorMenu(l.id, v)}
                  placement="bottom-start"
                  portal
                  panel={
                    <div
                      role="radiogroup"
                      aria-label="Label color"
                      className="grid grid-cols-8 gap-1.5 p-0.5"
                    >
                      {/* Row 1: saturated hues. Row 2: their light variants. */}
                      {[...LABEL_COLORS, ...LABEL_COLORS_LIGHT].map((c) => {
                        const selected = c === l.color
                        return (
                          <button
                            key={c}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={c}
                            onClick={() => {
                              updateLabelColor(l.id, c)
                              toggleColorMenu(l.id, false)
                            }}
                            className={`w-7 h-7 rounded-md transition ${COLOR_DOT_CLASSES[c] || ''} ${
                              selected
                                ? 'ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--surface-card)]'
                                : 'hover:opacity-75'
                            }`}
                          />
                        )
                      })}
                    </div>
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleColorMenu(l.id, !colorMenuOpen[l.id])}
                    className={`w-3 h-3 rounded-full cursor-pointer shrink-0 ${COLOR_DOT_CLASSES[l.color] || ''}`}
                    aria-label={`Change color for ${l.text}`}
                  />
                </Menu>

                {/* Label name — inline rename */}
                {renameId === l.id ? (
                  <input
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameLabel(l.id, renameText)
                        setRenameId(null)
                      } else if (e.key === 'Escape') {
                        setRenameId(null)
                      }
                    }}
                    onBlur={() => {
                      renameLabel(l.id, renameText)
                      setRenameId(null)
                    }}
                    autoFocus
                    className="text-sm text-[var(--text-primary)] bg-transparent border-b border-[var(--border-default)] focus:outline-none flex-1"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRenameId(l.id)
                      setRenameText(l.text)
                    }}
                    className="text-sm text-[var(--text-primary)] flex-1 text-left hover:underline truncate lowercase"
                  >
                    /{l.text}
                  </button>
                )}

                {/* Usage count */}
                <span className="text-xs text-[var(--text-faint)] shrink-0">
                  {usageById[l.id] || 0}
                </span>

                {/* Dot-menu: merge / archive / unarchive */}
                <Menu
                  open={!!dotMenuOpen[l.id]}
                  onOpenChange={(v) => toggleDotMenu(l.id, v)}
                  placement="bottom-end"
                  portal
                  panelClassName="w-40"
                  panel={
                    <>
                      {!l.archived_at && (
                        <>
                          <Menu.Item
                            onSelect={() => {
                              toggleDotMenu(l.id, false)
                              setMergePicker({ fromLabel: l })
                            }}
                          >
                            Merge into…
                          </Menu.Item>
                          <Menu.Item
                            destructive
                            onSelect={() => {
                              toggleDotMenu(l.id, false)
                              archiveLabel(l.id)
                            }}
                          >
                            Archive
                          </Menu.Item>
                        </>
                      )}
                      {l.archived_at && (
                        <Menu.Item
                          onSelect={() => {
                            toggleDotMenu(l.id, false)
                            unarchiveLabel(l.id)
                          }}
                        >
                          Unarchive
                        </Menu.Item>
                      )}
                    </>
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleDotMenu(l.id, !dotMenuOpen[l.id])}
                    className="text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                    aria-label={`Options for ${l.text}`}
                  >
                    <DotsThreeVertical className="w-4 h-4" />
                  </button>
                </Menu>
              </div>
            ))}
          </div>

          {/* New label row */}
          {newOpen ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNewLabel()
                  if (e.key === 'Escape') setNewOpen(false)
                }}
                placeholder="label name"
                autoFocus
                className="flex-1 text-sm text-[var(--text-primary)] bg-transparent border-b border-[var(--border-default)] focus:outline-none"
              />
              <div className="flex items-center gap-1">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-3 h-3 rounded-full ${COLOR_DOT_CLASSES[c]} ${
                      newColor === c ? 'ring-1 ring-[var(--text-primary)]' : ''
                    }`}
                    aria-label={c}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addNewLabel}
                className="text-xs font-medium text-[var(--text-primary)] hover:underline shrink-0"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="mt-3 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Plus className="w-3 h-3" />
              New label
            </button>
          )}

          {/* Show archived toggle */}
          <label className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
      </div>

      {/* Merge picker — nested modal */}
      {mergePicker && (
        <Modal
          open
          onClose={() => setMergePicker(null)}
          contentClassName="flex items-center justify-center"
          zIndex={60}
        >
          <div className="bg-[var(--surface-page)] border-0.5 border-[var(--border-default)] rounded-xl shadow-[var(--shadow-raised)] w-full max-w-xs mx-4">
            <div className="p-3">
              <div className="text-sm mb-2 text-[var(--text-primary)]">
                Merge{' '}
                <span className="font-medium">{mergePicker.fromLabel.text}</span> into…
              </div>
              <div className="divide-y divide-[var(--border-subtle)] max-h-64 overflow-auto">
                {allLabels
                  .filter((l) => l.id !== mergePicker.fromLabel.id && !l.archived_at)
                  .map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        mergeLabels(mergePicker.fromLabel.id, l.id)
                        setMergePicker(null)
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left hover:bg-[var(--surface-hover)] transition-colors rounded"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT_CLASSES[l.color] || ''}`}
                      />
                      <span className="lowercase">/{l.text}</span>
                    </button>
                  ))}
                {allLabels.filter(
                  (l) => l.id !== mergePicker.fromLabel.id && !l.archived_at
                ).length === 0 && (
                  <p className="py-3 text-xs text-[var(--text-faint)] text-center">
                    No other labels to merge into
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
