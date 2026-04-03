import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION — we already handled it via getSession() above
      if (event === 'INITIAL_SESSION') return

      set({ user: session?.user || null, session })
      if (session?.user) {
        try {
          await get().fetchProfile()
        } catch (err) {
          logError('Failed to fetch profile on auth change:', err)
        }
      } else {
        set({ profile: null })
      }
    })
    set({ _authSubscription: subscription })
  },

  fetchProfile: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) {
      set({ profile: data })
    }
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
    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    set({ user: data.session.user, session: data.session })
    return data
  },

  signOut: () => {
    set({ user: null, session: null, profile: null })
    supabase.auth.signOut({ scope: 'local' }).catch((err) => {
      logError('Sign out error:', err)
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
