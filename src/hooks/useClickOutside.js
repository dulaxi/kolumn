import { useRef, useEffect } from 'react'

/**
 * Returns a ref to attach to a DOM element. When a mousedown event
 * occurs outside that element, the handler is called.
 *
 * @param {Function} handler - called on outside click
 * @returns {React.RefObject}
 */
export function useClickOutside(handler) {
  const ref = useRef(null)

  useEffect(() => {
    const listener = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        handler(event)
      }
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [handler])

  return ref
}
