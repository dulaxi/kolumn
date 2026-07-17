import { useState } from 'react'
import { User } from '@phosphor-icons/react'
import { useAuthStore } from '../../store/authStore'
import { PROFILE_COLORS, resolveProfileColor } from '../../constants/colors'
import { showToast } from '../../utils/toast'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'
import Input from '../ui/Input'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function ProfileSection() {
  const profile = useAuthStore((s) => s.profile)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [pickerOpen, setPickerOpen] = useState(false)

  const update = async (updates) => {
    try {
      await updateProfile(updates)
      showToast.success('Profile updated')
    } catch {
      showToast.error("Couldn't update profile")
    }
  }

  const { style: avatarStyle, fallbackClass } = resolveProfileColor(profile?.color)

  return (
    <SettingsSection title="Profile">
      <SettingsRow title="Avatar" description="Shown on cards assigned to you.">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-label="Change avatar icon"
            aria-expanded={pickerOpen}
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-80 ${
              profile?.icon ? fallbackClass : 'bg-[var(--surface-hover)]'
            }`}
            style={profile?.icon ? avatarStyle : undefined}
          >
            {profile?.icon ? (
              <DynamicIcon name={profile.icon} className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5 text-[var(--text-secondary)]" />
            )}
          </button>
          {pickerOpen && (
            <IconPicker
              value={profile?.icon}
              onChange={(iconName) => {
                update({ icon: iconName })
                setPickerOpen(false)
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      </SettingsRow>
      <SettingsRow title="Display name" htmlFor="settings-display-name">
        <Input
          id="settings-display-name"
          key={profile?.display_name || ''}
          defaultValue={profile?.display_name || ''}
          placeholder="Your name…"
          wrapperClassName="w-56"
          onBlur={(e) => {
            const next = e.target.value.trim()
            if (!next) {
              e.target.value = profile?.display_name || ''
              return
            }
            if (next !== profile?.display_name) update({ display_name: next })
          }}
        />
      </SettingsRow>
      <SettingsRow title="Color" description="Avatar background color.">
        <div className="flex max-w-64 flex-wrap justify-end gap-2">
          {PROFILE_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={`Profile color ${c.hex}`}
              onClick={() => update({ color: c.value })}
              className={`h-6 w-6 rounded-full transition-transform ${
                profile?.color === c.value
                  ? 'ring-2 ring-[var(--accent-lime-soft)] ring-offset-2'
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
