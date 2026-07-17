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

// Boot-time theme pick: public/marketing routes are pinned light (their CSS
// is not dark-ready); only the app shell routes are themed. AppLayout owns
// theming after mount — this only covers the pre-paint of a hard load.
const APP_PATH = /^\/(dashboard|boards|chat|build|workspace|settings)(\/|$)/

export function pickBootTheme(pathname, savedTheme) {
  return APP_PATH.test(pathname) ? savedTheme || 'system' : 'light'
}
