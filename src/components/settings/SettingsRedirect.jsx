import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// /settings is now a modal, not a page. Old links/bookmarks land here:
// bounce to the dashboard and pop the modal via the same global event the
// user menu uses (the listener lives in AppLayout, which wraps this route).
export default function SettingsRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/dashboard', { replace: true })
    window.dispatchEvent(new CustomEvent('kolumn:open-settings'))
  }, [navigate])

  return null
}
