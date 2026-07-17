import { describe, test, expect, vi, afterEach } from 'vitest'
import { resolveTheme, applyTheme } from '../utils/theme'
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
