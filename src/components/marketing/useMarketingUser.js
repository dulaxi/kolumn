import { useEffect, useState } from 'react'

// Auth state for the marketing chrome, read client-side only. The auth store
// pulls in the Supabase client and src/lib/env.js (which throws without env
// vars), so it must never be imported by the prerender bundle. Dynamic import
// inside an effect keeps it out of the SSR graph; SSR and first paint render
// the signed-out chrome, then a signed-in visitor sees "Open Kolumn".
export default function useMarketingUser() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    let unsubscribe = () => {}
    let cancelled = false
    import('../../store/authStore').then(({ useAuthStore }) => {
      if (cancelled) return
      setUser(useAuthStore.getState().user || null)
      unsubscribe = useAuthStore.subscribe((s) => setUser(s.user || null))
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])
  return user
}
