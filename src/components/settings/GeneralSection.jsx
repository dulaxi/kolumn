import { Desktop, Moon, Sun } from '@phosphor-icons/react'
import { useSettingsStore } from '../../store/settingsStore'
import SegmentedControl from '../ui/SegmentedControl'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function GeneralSection() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const font = useSettingsStore((s) => s.font)
  const setFont = useSettingsStore((s) => s.setFont)
  const motion = useSettingsStore((s) => s.motion)
  const setMotion = useSettingsStore((s) => s.setMotion)

  return (
    <>
      <SettingsSection title="Preferences">
        <SettingsRow title="Appearance" description="System follows your OS preference.">
          <SegmentedControl
            ariaLabel="Appearance"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', icon: <Desktop size={16} />, ariaLabel: 'System' },
              { value: 'light', icon: <Sun size={16} />, ariaLabel: 'Light' },
              { value: 'dark', icon: <Moon size={16} />, ariaLabel: 'Dark' },
            ]}
          />
        </SettingsRow>
        <SettingsRow title="Font" description="Typeface used on cards.">
          <SegmentedControl
            ariaLabel="Font"
            value={font}
            onChange={setFont}
            options={[
              // 'mona-sans' is the persisted enum for "default sans" (now Inter) — kept
              // for stored prefs across two font migrations
              { value: 'mona-sans', label: 'Inter' },
              { value: 'sf-mono', label: 'SF Mono' },
            ]}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Accessibility">
        <SettingsRow
          title="Motion"
          description="Reduce animations and transitions. System follows your OS preference."
        >
          <SegmentedControl
            ariaLabel="Motion"
            value={motion}
            onChange={setMotion}
            options={[
              { value: 'system', label: 'System' },
              { value: 'full', label: 'Full' },
              { value: 'reduced', label: 'Reduced' },
            ]}
          />
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
