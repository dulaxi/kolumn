import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// /settings is now a modal, not a page. Old links/bookmarks land here:
// bounce to the dashboard and pop the modal via the same global event the
// user menu uses (the listener lives in AppLayout, which wraps this route).
export default function SettingsRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/dashboard', { replace: true })
    // Deferred: this is a child of AppLayout, and React fires passive effects
    // child-before-parent on a shared mount. A synchronous dispatch here would
    // fire before AppLayout's own effect has registered the listener, so the
    // event would be lost. Pushing it a macrotask out lets that effect run first.
    //
    // Deliberately NOT cleared on unmount: the navigate() above is what causes
    // this component to unmount (swapped out by the /dashboard route) — that
    // unmount always completes before this timeout's macrotask runs, so a
    // clearTimeout in cleanup would cancel every dispatch and reintroduce the
    // original bug. The event has no dependency on this component's lifecycle.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kolumn:open-settings'))
    }, 0)
  }, [navigate])

  return null
}
