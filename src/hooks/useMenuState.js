import { useEffect, useRef, useState } from 'react'

// Named-menu state + outside-click close. Buttons that toggle a menu get
// data-menu-root on a wrapping element; clicks outside any such wrapper close.
// Clicks inside [data-icon-picker] (portaled pickers) are ignored.
export function useMenuState(onClose) {
  const [openMenu, setOpenMenu] = useState(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const toggleMenu = (name) => setOpenMenu((cur) => (cur === name ? null : name))

  useEffect(() => {
    if (!openMenu) return
    const handler = (e) => {
      if (e.target.closest('[data-icon-picker]')) return
      if (!e.target.closest('[data-menu-root]')) {
        onCloseRef.current?.(openMenu)
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  return [openMenu, setOpenMenu, toggleMenu]
}
