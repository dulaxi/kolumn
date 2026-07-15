// Cross-environment logger.
//
// Dev: writes to the browser console so engineers see what's wrong inline.
// Prod: forwards to Sentry so we still hear about failures, then stays quiet
//       in the user's console (no leaked stack traces, no noise).
//
// Usage:
//   import { logError, logWarn } from '../utils/logger'
//   logError('Failed to fetch:', error)
//   logWarn('Non-fatal but worth noting')
//
// Pass an Error object as one of the args when you have one — the captured
// Sentry event will use it as the canonical exception.

import * as Sentry from '@sentry/react'

// Supabase's PostgrestError is a plain object, not an Error instance —
// String(err) yields "[object Object]" and the DB message is lost.
const isErrorLike = (a) =>
  a && typeof a === 'object' && !(a instanceof Error) && typeof a.message === 'string'

export const formatLogArgs = (args) =>
  args
    .map((a) =>
      isErrorLike(a) ? `${a.message}${a.code ? ` (${a.code})` : ''}` : String(a),
    )
    .join(' ')

const findError = (args) => args.find((a) => a instanceof Error)

export const logError = import.meta.env.DEV
  ? (...args) => console.error(...args)
  : (...args) => {
      const err = findError(args)
      if (err) {
        Sentry.captureException(err, { extra: { args } })
      } else {
        Sentry.captureMessage(formatLogArgs(args), { level: 'error', extra: { args } })
      }
    }

export const logWarn = import.meta.env.DEV
  ? (...args) => console.warn(...args)
  : (...args) => {
      Sentry.captureMessage(formatLogArgs(args), { level: 'warning' })
    }
