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
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const listener = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        handlerRef.current(event)
      }
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [])

  return ref
}
