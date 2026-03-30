import { useState, useRef } from 'react'
import { Download, Upload, Trash2, AlertTriangle, Palette, User, Type } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import DynamicIcon from '../components/board/DynamicIcon'
import IconPicker from '../components/board/IconPicker'

const PROFILE_COLORS = [
  { value: 'bg-[#7EB8DA]', hex: '#7EB8DA' },
  { value: 'bg-[#81C9A3]', hex: '#81C9A3' },
  { value: 'bg-[#B8A9D4]', hex: '#B8A9D4' },
  { value: 'bg-[#F2A7B3]', hex: '#F2A7B3' },
  { value: 'bg-[#F6C97E]', hex: '#F6C97E' },
  { value: 'bg-[#E8A0C8]', hex: '#E8A0C8' },
  { value: 'bg-[#7DC4C4]', hex: '#7DC4C4' },
  { value: 'bg-[#9BA8D4]', hex: '#9BA8D4' },
  { value: 'bg-[#F4B183]', hex: '#F4B183' },
  { value: 'bg-[#A8D8B9]', hex: '#A8D8B9' },
  { value: 'bg-[#A0A0A0]', hex: '#A0A0A0' },
  { value: 'bg-[#2C2C2C]', hex: '#2C2C2C' },
]

const themes = [
  {
    id: 'default',
    label: 'Default',
    swatches: ['#ffffff', '#e5e7eb', '#3b82f6', '#2563eb'],
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
          setImportMessage({ type: 'error', text: 'No valid data found in file.' })
          return
        }

        setImportMessage({
          type: 'success',
          text: `Imported ${imported} data key(s). Reloading...`,
        })
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        setImportMessage({
          type: 'error',
          text: 'Invalid JSON file. Please check the file format.',
        })
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
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 text-sm mt-1">
          Manage your data and preferences
        </p>
      </div>

      {/* My Profile */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">My Profile</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Set your name, avatar icon, and color. This appears on cards assigned to you.
        </p>

        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(profile?.color || 'bg-gray-300') === 'bg-[#A0A0A0]' ? 'text-gray-900' : 'text-white'} ${profile?.color || 'bg-gray-300'}`}>
              {profile?.icon ? (
                <DynamicIcon name={profile.icon} className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <span className="text-sm font-medium text-gray-700">{profile?.display_name || 'No name set'}</span>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Display name</label>
            <input
              value={profile?.display_name || ''}
              onChange={(e) => handleProfileUpdate({ display_name: e.target.value })}
              placeholder="Your name..."
              className="w-full text-sm rounded-xl px-3 py-2 border border-gray-200 focus:border-blue-200 focus:outline-none"
            />
          </div>

          {/* Icon */}
          <div className="relative">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Icon</label>
            <button
              type="button"
              onClick={() => setShowProfileIconPicker(!showProfileIconPicker)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${(profile?.color || 'bg-gray-300') === 'bg-[#A0A0A0]' ? 'text-gray-900' : 'text-white'} ${profile?.color || 'bg-gray-300'}`}>
                {profile?.icon ? (
                  <DynamicIcon name={profile.icon} className="w-3.5 h-3.5" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-gray-600">{profile?.icon || 'Choose icon'}</span>
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
            <label className="text-xs font-medium text-gray-600 mb-1 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleProfileUpdate({ color: c.value })}
                  className={`w-7 h-7 rounded-full transition-all ${
                    profile?.color === c.value
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
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
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">Theme</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Choose a color theme for the interface.
        </p>
        <div className="flex gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
                theme === t.id
                  ? 'border-blue-400 bg-blue-50/60'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex gap-1">
                {t.swatches.map((color, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-gray-700">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Type className="w-4 h-4 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">Font</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Choose a typeface for cards.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setFont('mona-sans')}
            className={`flex flex-col items-center gap-2 px-5 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
              font === 'mona-sans'
                ? 'border-blue-400 bg-blue-50/60'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span style={{ fontFamily: "'Mona Sans Variable', sans-serif" }} className="text-lg font-semibold text-gray-800">Aa</span>
            <span className="text-xs font-medium text-gray-700">Mona Sans</span>
          </button>
          <button
            onClick={() => setFont('sf-mono')}
            className={`flex flex-col items-center gap-2 px-5 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
              font === 'sf-mono'
                ? 'border-blue-400 bg-blue-50/60'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span style={{ fontFamily: "'SF Mono', 'Menlo', monospace" }} className="text-lg font-semibold text-gray-800">Aa</span>
            <span className="text-xs font-medium text-gray-700">SF Mono</span>
          </button>
        </div>
      </div>

      {/* Export Data */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Export Data
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Download all your boards, notes, and settings as a JSON backup file.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-200 cursor-pointer transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Backup
        </button>
      </div>

      {/* Import Data */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Import Data
        </h2>
        <p className="text-sm text-gray-600 mb-4">
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
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import Backup
        </button>

        {importMessage && (
          <div
            className={`mt-3 text-sm px-3 py-2 rounded-lg ${
              importMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {importMessage.text}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white border-2 border-red-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Permanently delete all your boards, notes, and settings. This action
          cannot be undone.
        </p>

        {!confirmingClear ? (
          <button
            onClick={() => setConfirmingClear(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearData}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 cursor-pointer transition-colors"
            >
              Yes, delete everything
            </button>
            <button
              onClick={() => setConfirmingClear(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
