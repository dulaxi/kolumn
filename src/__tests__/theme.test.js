import { describe, test, expect, vi, afterEach } from 'vitest'
import { resolveTheme, applyTheme, pickBootTheme } from '../utils/theme'
import { migrateSettingsState } from '../store/settingsStore'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
})

function mockPrefersDark(matches) {
  vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

describe('resolveTheme', () => {
  test('light and dark pass through', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  test('system resolves via prefers-color-scheme', () => {
    mockPrefersDark(true)
    expect(resolveTheme('system')).toBe('dark')
    mockPrefersDark(false)
    expect(resolveTheme('system')).toBe('light')
  })

  test('legacy/unknown values resolve to light', () => {
    expect(resolveTheme('default')).toBe('light')
    expect(resolveTheme(undefined)).toBe('light')
  })
})

describe('applyTheme', () => {
  test('sets the data-theme attribute to the resolved value', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})

describe('pickBootTheme', () => {
  test('app paths use the saved theme', () => {
    expect(pickBootTheme('/dashboard', 'dark')).toBe('dark')
    expect(pickBootTheme('/boards/abc', 'dark')).toBe('dark')
    expect(pickBootTheme('/settings', 'dark')).toBe('dark')
  })

  test('app paths fall back to system when nothing is saved', () => {
    expect(pickBootTheme('/dashboard', undefined)).toBe('system')
    expect(pickBootTheme('/boards/abc', undefined)).toBe('system')
    expect(pickBootTheme('/settings', undefined)).toBe('system')
  })

  test('public paths are pinned light regardless of saved theme', () => {
    expect(pickBootTheme('/', 'dark')).toBe('light')
    expect(pickBootTheme('/onboarding', 'dark')).toBe('light')
    expect(pickBootTheme('/update-password', 'dark')).toBe('light')
    expect(pickBootTheme('/upgrade/pro', 'dark')).toBe('light')
    expect(pickBootTheme('/sandbox/landing-board', 'dark')).toBe('light')
  })
})

describe('migrateSettingsState', () => {
  test("maps persisted 'default' theme to 'light'", () => {
    expect(migrateSettingsState({ theme: 'default', font: 'mona-sans' })).toEqual({
      theme: 'light',
      font: 'mona-sans',
    })
  })

  test('leaves other themes untouched', () => {
    expect(migrateSettingsState({ theme: 'dark' }).theme).toBe('dark')
    expect(migrateSettingsState({ theme: 'system' }).theme).toBe('system')
  })

  test('tolerates missing state', () => {
    expect(migrateSettingsState(undefined)).toEqual(undefined)
  })
})
