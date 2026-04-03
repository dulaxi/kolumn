import { useRef, useCallback, useEffect } from 'react'

/**
 * Debounced auto-save hook. Schedules saves after a delay,
 * coalescing rapid calls. Flushes pending saves on unmount.
 *
 * @param {Function} saveFn - called when the debounce fires
 * @param {number} delay - milliseconds to wait before saving
 * @returns {{ scheduleSave, flushSave, isDirty }}
 */
export function useAutoSave(saveFn, delay = 1000) {
  const timerRef = useRef(null)
  const isDirtyRef = useRef(false)
  const saveFnRef = useRef(saveFn)
  saveFnRef.current = saveFn

  const scheduleSave = useCallback(() => {
    isDirtyRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveFnRef.current()
      isDirtyRef.current = false
      timerRef.current = null
    }, delay)
  }, [delay])

  const flushSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (isDirtyRef.current) {
      saveFnRef.current()
      isDirtyRef.current = false
    }
  }, [])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (isDirtyRef.current) saveFnRef.current()
    }
  }, [])

  return {
    scheduleSave,
    flushSave,
    get isDirty() { return isDirtyRef.current },
  }
}
