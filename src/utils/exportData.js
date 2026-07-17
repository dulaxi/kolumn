// Boards/columns/cards only — notes are excluded (the notes feature is
// unwired; see CLAUDE.md "Removed pages").
export function buildExportPayload({ boards, columns, cards }) {
  return {
    boards,
    columns,
    cards,
    exported_at: new Date().toISOString(),
  }
}

export function downloadExport(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kolumn-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
