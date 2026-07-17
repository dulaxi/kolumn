// Theme resolution for the 'system' | 'light' | 'dark' setting.
// 'system' follows the OS via prefers-color-scheme; anything unrecognized
// (including the legacy persisted 'default') resolves to light.

export function resolveTheme(theme) {
  if (theme === 'dark' || theme === 'light') return theme
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', resolveTheme(theme))
}
