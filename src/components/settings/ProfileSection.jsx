import { useState } from 'react'
import { User } from '@phosphor-icons/react'
import { useAuthStore } from '../../store/authStore'
import { PROFILE_COLORS, resolveProfileColor } from '../../constants/colors'
import { showToast } from '../../utils/toast'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'
import Input from '../ui/Input'
import FieldError from '../ui/FieldError'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function ProfileSection() {
  const profile = useAuthStore((s) => s.profile)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [nameError, setNameError] = useState('')

  const update = async (updates) => {
    try {
      await updateProfile(updates)
      showToast.success('Profile updated')
    } catch {
      showToast.error("Couldn't update profile")
    }
  }

  // The name row reports through the field rather than the shared toast.
  // Clearing the field used to snap the old name back with no explanation —
  // the one moment a person most needs telling why — and a failed save floated
  // away in a toast, by which time your eye has left the box that caused it.
  // The other rows (avatar, colour, nickname) keep the toast: they have no
  // single field to blame, and empty is valid for the nickname.
  const updateName = async (next) => {
    setNameError('')
    try {
      await updateProfile({ display_name: next })
      showToast.success('Profile updated')
    } catch {
      setNameError("Couldn't save that. Try again.")
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
      <SettingsRow title="Full name" htmlFor="settings-full-name">
        {/* SettingsRow lays its control area out as a horizontal flex row, so
            the input and the error have to be stacked inside a wrapper of
            their own — as direct children they sat side by side, with the
            message beside the field instead of beneath it. The wrapper takes
            the input's width so the message aligns to the field's left edge
            rather than the row's. */}
        <div className="w-56">
          <Input
            id="settings-full-name"
            key={profile?.display_name || ''}
            defaultValue={profile?.display_name || ''}
            placeholder="Your name…"
            error={!!nameError}
            aria-invalid={!!nameError}
            onChange={() => { if (nameError) setNameError('') }}
            onBlur={(e) => {
              const next = e.target.value.trim()
              if (!next) {
                e.target.value = profile?.display_name || ''
                setNameError('Your name cannot be empty.')
                return
              }
              if (next !== profile?.display_name) updateName(next)
            }}
          />
          <FieldError>{nameError}</FieldError>
        </div>
      </SettingsRow>
      <SettingsRow
        title="Display name"
        description="What the dashboard greeting calls you."
        htmlFor="settings-nickname"
      >
        <Input
          id="settings-nickname"
          key={`nick-${profile?.nickname || ''}`}
          defaultValue={profile?.nickname || ''}
          placeholder="First name…"
          wrapperClassName="w-56"
          onBlur={(e) => {
            // Empty is valid here — clearing falls back to the first word
            // of the full name in the greeting.
            const next = e.target.value.trim()
            if (next !== (profile?.nickname || '')) update({ nickname: next })
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
