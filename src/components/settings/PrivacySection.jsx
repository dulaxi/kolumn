import { useBoardStore } from '../../store/boardStore'
import { showToast } from '../../utils/toast'
import { buildExportPayload, downloadExport } from '../../utils/exportData'
import Button from '../ui/Button'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function PrivacySection() {
  const handleExport = () => {
    downloadExport(buildExportPayload(useBoardStore.getState()))
    showToast.success('Data exported')
  }

  return (
    <>
      <SettingsSection title="Privacy">
        <SettingsRow
          title="Where your data lives"
          description="Your boards and cards are stored in Supabase (Postgres), encrypted in transit and at rest."
        />
        <SettingsRow
          title="Your content is yours"
          description="We never sell your data and never use it to train AI models."
        />
        <SettingsRow title="Privacy Policy" description="How Kolumn handles your data.">
          <a
            href="/privacy"
            className="text-sm text-[var(--text-secondary)] underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)]"
          >
            Privacy Policy
          </a>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Your data">
        <SettingsRow
          title="Export your data"
          description="Download all boards, columns, and cards as a JSON backup."
        >
          <Button variant="secondary" size="sm" onClick={handleExport}>Export</Button>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
