import { useBoardStore } from '../../store/boardStore'
import { showToast } from '../../utils/toast'
import Button from '../ui/Button'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

// Exported for tests. Boards/columns/cards only — notes are excluded (the
// notes feature is unwired; see CLAUDE.md "Removed pages").
export function buildExportPayload({ boards, columns, cards }) {
  return {
    boards,
    columns,
    cards,
    exported_at: new Date().toISOString(),
  }
}

export default function DataSection() {
  const handleExport = () => {
    const payload = buildExportPayload(useBoardStore.getState())
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kolumn-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast.success('Data exported')
  }

  return (
    <SettingsSection title="Data">
      <SettingsRow
        title="Export your data"
        description="Download all boards, columns, and cards as a JSON backup."
      >
        <Button variant="secondary" size="sm" onClick={handleExport}>
          Export
        </Button>
      </SettingsRow>
    </SettingsSection>
  )
}
