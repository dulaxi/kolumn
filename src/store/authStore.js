import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Failed to get session:', error)
      } else if (session) {
        set({ user: session.user, session })
        try {
          await get().fetchProfile()
        } catch (profileErr) {
          console.error('Failed to fetch profile:', profileErr)
        }
      }
    } catch (err) {
      console.error('Auth initialization failed:', err)
    } finally {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ user: session?.user || null, session })
      if (session?.user) {
        try {
          await get().fetchProfile()
        } catch (err) {
          console.error('Failed to fetch profile on auth change:', err)
        }
      } else {
        set({ profile: null })
      }
    })
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

  signUp: async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })
    if (error) throw error
    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  signOut: () => {
    // Clear state immediately so the UI redirects instantly,
    // then fire the API call in the background to invalidate server-side
    set({ user: null, session: null, profile: null })
    supabase.auth.signOut().catch((err) => {
      console.error('Sign out error:', err)
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
