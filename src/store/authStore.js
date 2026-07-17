import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'
import * as Sentry from '@sentry/react'
import { identifyUser, resetUser, capture } from '../lib/analytics'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  _authSubscription: null,

  initialize: async () => {
    // Unsubscribe any previous listener (prevents duplicates on HMR / re-init)
    get()._authSubscription?.unsubscribe()

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        logError('Failed to get session:', error)
      } else if (session) {
        set({ user: session.user, session })
        try {
          await get().fetchProfile()
        } catch (profileErr) {
          logError('Failed to fetch profile:', profileErr)
        }
      }
    } catch (err) {
      logError('Auth initialization failed:', err)
    } finally {
      set({ loading: false })
    }

    // Listen for future auth changes (token refresh, sign-out from another tab, etc.)
    // NOT used for initial signUp/signIn — those set state explicitly from their response.
    //
    // CRITICAL: This callback runs WHILE the auth lock is held (Supabase fires
    // SIGNED_IN from inside _recoverAndRefresh on tab visibility change, which
    // is wrapped in _acquireLock). Awaiting another Supabase call here causes
    // a recursive lock deadlock — the inner call waits for the outer lock,
    // which waits for this callback, which waits for the inner call. After 5s
    // the inner lock times out, every subsequent supabase call errors out, and
    // the user perceives the app as "frozen". So this handler must be sync —
    // any async work that touches Supabase must be deferred to a microtask
    // outside the lock context via setTimeout(0).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip INITIAL_SESSION — we already handled it via getSession() above
      if (event === 'INITIAL_SESSION') return

      // Only update session (not user reference) if the same user is still logged in.
      // Changing user triggers AppLayout's useEffect [user] dependency, which
      // re-fetches all data and sets loading: true — causing the white flash.
      const currentUser = get().user
      if (session?.user && currentUser?.id === session.user.id) {
        set({ session })
        if (event !== 'TOKEN_REFRESHED') {
          // Defer fetchProfile to escape the auth lock — see comment above
          setTimeout(() => { get().fetchProfile().catch(() => {}) }, 0)
        }
        return
      }

      // User id actually changed (different account on same tab, or first
      // sign-in after anon). Purge tenant-scoped stores so the fresh user
      // doesn't briefly see the previous user's workspaces / boards.
      const prevUserId = currentUser?.id
      const nextUserId = session?.user?.id
      if (prevUserId && prevUserId !== nextUserId) {
        setTimeout(() => {
          import('./boardStore').then(({ useBoardStore }) => useBoardStore.getState().resetStore())
          import('./noteStore').then(({ useNoteStore }) => useNoteStore.getState().resetStore())
          import('./workspacesStore').then(({ useWorkspacesStore }) => useWorkspacesStore.getState().resetStore())
          import('./boardSharingStore').then(({ useBoardSharingStore }) => useBoardSharingStore.getState().resetStore())
        }, 0)
      }

      set({ user: session?.user || null, session })
      if (session?.user) {
        // Defer fetchProfile to escape the auth lock — see comment above
        setTimeout(() => {
          get().fetchProfile().catch((err) => logError('Failed to fetch profile on auth change:', err))
        }, 0)
      } else {
        set({ profile: null })
      }
    })
    set({ _authSubscription: subscription })
  },

  fetchProfile: async () => {
    const { user } = get()
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (error) {
      logError('fetchProfile error:', error)
      return
    }
    set({ profile: data || null })
  },

  // signUp and signIn explicitly set user/session from the API response.
  // This is intentional — we do NOT rely on onAuthStateChange for the
  // initial state after auth. onAuthStateChange handles later events
  // (token refresh, sign-out from another tab, etc.)

  signUp: async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })
    if (error) throw error
    if (!data.session) {
      throw new Error('Please check your email to confirm your account.')
    }
    set({ user: data.session.user, session: data.session })
    if (data.user) Sentry.setUser({ id: data.user.id, email })
    if (data.user) identifyUser(data.user.id, { email, display_name: displayName })
    capture('user_signed_up')
    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    set({ user: data.session.user, session: data.session })
    if (data.session?.user) Sentry.setUser({ id: data.session.user.id, email })
    if (data.session?.user) identifyUser(data.session.user.id, { email })
    capture('user_signed_in')
    return data
  },

  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) throw error
    capture('user_signed_in_oauth_initiated', { provider: 'google' })
    return data
  },

  // Returns true if an account exists for this email. Backed by the
  // `check-email` Edge Function, which rate-limits per IP and runs the
  // lookup under the service-role key. Throws on transport error or
  // 429 so callers can decide how to degrade — the landing card falls
  // through to the sign-in form on failure rather than blocking.
  checkEmailExists: async (email) => {
    const { data, error } = await supabase.functions.invoke('check-email', {
      body: { email: email.trim().toLowerCase() },
    })
    if (error) {
      // functions.invoke wraps non-2xx in FunctionsHttpError with the raw
      // Response on error.context — read the body so the server's error
      // codes (invalid_email / rate_limited / …) aren't thrown away.
      let code = null
      try {
        const body = await error.context?.json?.()
        code = body?.error ?? null
      } catch { /* non-JSON body — fall through to generic */ }
      const MESSAGES = {
        invalid_email: "That email address doesn't look right.",
        rate_limited: 'Too many attempts — wait a moment and try again.',
      }
      const err = new Error(MESSAGES[code] || "Couldn't verify that email — try signing in.")
      err.code = code
      throw err
    }
    if (data && typeof data.exists === 'boolean') return data.exists
    throw new Error('check-email returned unexpected shape')
  },

  // Shared local cleanup for every way of leaving the account.
  _resetLocalState: () => {
    set({ user: null, session: null, profile: null })
    Sentry.setUser(null)
    resetUser()
    // Lazy imports to avoid circular dependency (these stores import authStore)
    import('./boardStore').then(({ useBoardStore }) => useBoardStore.getState().resetStore())
    import('./noteStore').then(({ useNoteStore }) => useNoteStore.getState().resetStore())
    import('./workspacesStore').then(({ useWorkspacesStore }) => useWorkspacesStore.getState().resetStore())
    import('./boardSharingStore').then(({ useBoardSharingStore }) => useBoardSharingStore.getState().resetStore())
    localStorage.removeItem('kolumn_active_board')
  },

  // The account row is already gone server-side; just drop local state.
  clearAfterAccountDeletion: () => get()._resetLocalState(),

  // This device only. Other sessions keep working (see signOutEverywhere).
  signOut: () => {
    get()._resetLocalState()
    supabase.auth.signOut({ scope: 'local' }).catch((err) => {
      logError('Sign out error:', err)
    })
  },

  // Revokes every session for this user (all devices).
  signOutEverywhere: () => {
    get()._resetLocalState()
    supabase.auth.signOut({ scope: 'global' }).catch((err) => {
      logError('Sign out everywhere error:', err)
    })
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) throw error
  },

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  // Sets the user's tier in their profile row. Called from the
  // post-signup plan picker today; will move behind a Stripe webhook
  // once real billing lands. Keep all "tier becomes X" writes routed
  // through here so the eventual swap is one place.
  setTier: async (tier) => {
    const { user } = get()
    if (!user) throw new Error('Not signed in')
    if (!['free', 'pro', 'team'].includes(tier)) {
      throw new Error(`Unknown tier: ${tier}`)
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({ tier })
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    set({ profile: data })
    capture('user_picked_tier', { tier })
    return data
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    set({ profile: data })
    return data
  },
}))
