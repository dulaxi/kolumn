// Dev-only logger — stripped from production bundles by Vite's dead code elimination.
// Usage: import { logError } from '../utils/logger'
//        logError('Failed to fetch:', error)

export const logError = import.meta.env.DEV
  ? (...args) => console.error(...args)
  : () => {}

export const logWarn = import.meta.env.DEV
  ? (...args) => console.warn(...args)
  : () => {}
