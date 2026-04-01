import { useState, useRef } from 'react'
import { Download, Upload, Trash2, AlertTriangle, Palette, User, Type } from 'lucide-react'
import { showToast } from '../utils/toast'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import DynamicIcon from '../components/board/DynamicIcon'
import IconPicker from '../components/board/IconPicker'

const PROFILE_COLORS = [
  { value: 'bg-[#C2D64A]', hex: '#C2D64A' },
  { value: 'bg-[#A8BA32]', hex: '#A8BA32' },
  { value: 'bg-[#D4A843]', hex: '#D4A843' },
  { value: 'bg-[#C27A4A]', hex: '#C27A4A' },
  { value: 'bg-[#A8969E]', hex: '#A8969E' },
  { value: 'bg-[#8B7355]', hex: '#8B7355' },
  { value: 'bg-[#7A5C44]', hex: '#7A5C44' },
  { value: 'bg-[#E0DBD5]', hex: '#E0DBD5' },
  { value: 'bg-[#E8E2DB]', hex: '#E8E2DB' },
  { value: 'bg-[#8E8E89]', hex: '#8E8E89' },
  { value: 'bg-[#5C5C57]', hex: '#5C5C57' },
  { value: 'bg-[#1B1B18]', hex: '#1B1B18' },
]

const themes = [
  {
    id: 'default',
    label: 'Default',
    swatches: ['#FFFFFF', '#F2EDE8', '#C2D64A', '#1B1B18'],
  },
]

export default function SettingsPage() {
  const fileInputRef = useRef(null)
  const [importMessage, setImportMessage] = useState(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const font = useSettingsStore((s) => s.font)
  const setFont = useSettingsStore((s) => s.setFont)
  const profile = useAuthStore((s) => s.profile)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [showProfileIconPicker, setShowProfileIconPicker] = useState(false)

  const handleProfileUpdate = (updates) => {
    updateProfile(updates)
    showToast.success('Profile updated')
  }

  const handleExport = () => {
    const data = {}
    const keys = ['gambit-boards', 'gambit-notes', 'gambit-settings']
    keys.forEach((key) => {
      const value = localStorage.getItem(key)
      if (value) {
        data[key] = JSON.parse(value)
      }
    })

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gambit-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast.success('Data exported')
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        const validKeys = ['gambit-boards', 'gambit-notes', 'gambit-settings']
        let imported = 0

        validKeys.forEach((key) => {
          if (data[key]) {
            localStorage.setItem(key, JSON.stringify(data[key]))
            imported++
          }
        })

        if (imported === 0) {
          showToast.error('No valid data found in file')
          return
        }

        showToast.success(`Imported ${imported} data key(s). Reloading...`)
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        showToast.error('Invalid JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClearData = () => {
    localStorage.removeItem('gambit-boards')
    localStorage.removeItem('gambit-notes')
    localStorage.removeItem('gambit-settings')
    window.location.reload()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B1B18] font-heading">Settings</h1>
        <p className="text-[#5C5C57] text-sm mt-1">
          Manage your data and preferences
        </p>
      </div>

      {/* My Profile */}
      <div className="bg-white border border-[#E0DBD5] rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-[#5C5C57]" />
          <h2 className="text-sm font-semibold text-[#1B1B18]">My Profile</h2>
        </div>
        <p className="text-sm text-[#5C5C57] mb-4">
          Set your name, avatar icon, and color. This appears on cards assigned to you.
        </p>

        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(profile?.color || 'bg-[#E0DBD5]') === 'bg-[#A0A0A0]' ? 'text-[#1B1B18]' : 'text-white'} ${profile?.color || 'bg-[#E0DBD5]'}`}>
              {profile?.icon ? (
                <DynamicIcon name={profile.icon} className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <span className="text-sm font-medium text-[#5C5C57]">{profile?.display_name || 'No name set'}</span>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-[#5C5C57] mb-1 block">Display name</label>
            <input
              value={profile?.display_name || ''}
              onChange={(e) => handleProfileUpdate({ display_name: e.target.value })}
              placeholder="Your name..."
              className="w-full text-sm rounded-xl px-3 py-2 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none"
            />
          </div>

          {/* Icon */}
          <div className="relative">
            <label className="text-xs font-medium text-[#5C5C57] mb-1 block">Icon</label>
            <button
              type="button"
              onClick={() => setShowProfileIconPicker(!showProfileIconPicker)}
              className="flex items-center gap-2 px-3 py-2 border border-[#E0DBD5] rounded-xl hover:bg-[#F2EDE8] transition-colors text-sm"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${(profile?.color || 'bg-[#E0DBD5]') === 'bg-[#A0A0A0]' ? 'text-[#1B1B18]' : 'text-white'} ${profile?.color || 'bg-[#E0DBD5]'}`}>
                {profile?.icon ? (
                  <DynamicIcon name={profile.icon} className="w-3.5 h-3.5" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-[#5C5C57]">{profile?.icon || 'Choose icon'}</span>
            </button>
            {showProfileIconPicker && (
              <IconPicker
                value={profile?.icon}
                onChange={(iconName) => {
                  handleProfileUpdate({ icon: iconName })
                  setShowProfileIconPicker(false)
                }}
                onClose={() => setShowProfileIconPicker(false)}
              />
            )}
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-medium text-[#5C5C57] mb-1 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleProfileUpdate({ color: c.value })}
                  className={`w-7 h-7 rounded-full transition-all ${
                    profile?.color === c.value
                      ? 'ring-2 ring-offset-2 ring-[#C4BFB8] scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white border border-[#E0DBD5] rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-[#5C5C57]" />
          <h2 className="text-sm font-semibold text-[#1B1B18]">Theme</h2>
        </div>
        <p className="text-sm text-[#5C5C57] mb-4">
          Choose a color theme for the interface.
        </p>
        <div className="flex gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
                theme === t.id
                  ? 'border-[#C2D64A] bg-[#EEF2D6]/60'
                  : 'border-[#E0DBD5] hover:border-[#E0DBD5]'
              }`}
            >
              <div className="flex gap-1">
                {t.swatches.map((color, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border border-[#E0DBD5]"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-[#5C5C57]">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div className="bg-white border border-[#E0DBD5] rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Type className="w-4 h-4 text-[#5C5C57]" />
          <h2 className="text-sm font-semibold text-[#1B1B18]">Font</h2>
        </div>
        <p className="text-sm text-[#5C5C57] mb-4">
          Choose a typeface for cards.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setFont('mona-sans')}
            className={`flex flex-col items-center gap-2 px-5 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
              font === 'mona-sans'
                ? 'border-[#C2D64A] bg-[#EEF2D6]/60'
                : 'border-[#E0DBD5] hover:border-[#E0DBD5]'
            }`}
          >
            <span style={{ fontFamily: "'Mona Sans Variable', sans-serif" }} className="text-lg font-semibold text-[#1B1B18]">Aa</span>
            <span className="text-xs font-medium text-[#5C5C57]">Mona Sans</span>
          </button>
          <button
            onClick={() => setFont('sf-mono')}
            className={`flex flex-col items-center gap-2 px-5 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
              font === 'sf-mono'
                ? 'border-[#C2D64A] bg-[#EEF2D6]/60'
                : 'border-[#E0DBD5] hover:border-[#E0DBD5]'
            }`}
          >
            <span style={{ fontFamily: "'SF Mono', 'Menlo', monospace" }} className="text-lg font-semibold text-[#1B1B18]">Aa</span>
            <span className="text-xs font-medium text-[#5C5C57]">SF Mono</span>
          </button>
        </div>
      </div>

      {/* Export Data */}
      <div className="bg-white border border-[#E0DBD5] rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-[#1B1B18] mb-1">
          Export Data
        </h2>
        <p className="text-sm text-[#5C5C57] mb-4">
          Download all your boards, notes, and settings as a JSON backup file.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-[#E8E2DB] text-[#1B1B18] text-sm font-medium rounded-xl hover:bg-[#E0DBD5] cursor-pointer transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Backup
        </button>
      </div>

      {/* Import Data */}
      <div className="bg-white border border-[#E0DBD5] rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-[#1B1B18] mb-1">
          Import Data
        </h2>
        <p className="text-sm text-[#5C5C57] mb-4">
          Restore from a previously exported JSON backup. This will replace your
          current data.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 border border-[#E0DBD5] text-[#5C5C57] text-sm font-medium rounded-xl hover:bg-[#F2EDE8] cursor-pointer transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import Backup
        </button>

        {importMessage && (
          <div
            className={`mt-3 text-sm px-3 py-2 rounded-lg ${
              importMessage.type === 'success'
                ? 'bg-[#EEF2D6] text-[#A8BA32]'
                : 'bg-[#F0E0D2] text-[#7A5C44]'
            }`}
          >
            {importMessage.text}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white border-2 border-[#D4A07A] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-[#C27A4A]" />
          <h2 className="text-sm font-semibold text-[#7A5C44]">Danger Zone</h2>
        </div>
        <p className="text-sm text-[#5C5C57] mb-4">
          Permanently delete all your boards, notes, and settings. This action
          cannot be undone.
        </p>

        {!confirmingClear ? (
          <button
            onClick={() => setConfirmingClear(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7A5C44] text-white text-sm font-medium rounded-xl hover:bg-[#6B4D38] cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearData}
              className="px-4 py-2 bg-[#7A5C44] text-white text-sm font-medium rounded-xl hover:bg-[#6B4D38] cursor-pointer transition-colors"
            >
              Yes, delete everything
            </button>
            <button
              onClick={() => setConfirmingClear(false)}
              className="px-4 py-2 border border-[#E0DBD5] text-[#5C5C57] text-sm font-medium rounded-xl hover:bg-[#F2EDE8] cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
