import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'
import { noteInsertSchema, noteUpdateSchema } from '../utils/schemas'

export const useNoteStore = create((set, get) => ({
  notes: {},
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchNotes: async () => {
    if (Object.keys(get().notes).length === 0) set({ loading: true })
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      logError('Failed to fetch notes:', error)
      set({ loading: false, error: { message: error.message, action: 'fetchNotes' } })
      return
    }

    const noteMap = {}
    ;(data || []).forEach((n) => { noteMap[n.id] = n })
    set({ notes: noteMap, loading: false, error: null })
  },

  addNote: async (title) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const validated = noteInsertSchema.safeParse({ user_id: user.id, title: title || 'Untitled', content: '' })
    if (!validated.success) {
      logError('Note validation failed:', validated.error.flatten())
      return null
    }

    const { data: note } = await supabase
      .from('notes')
      .insert(validated.data)
      .select()
      .single()

    if (note) {
      set((state) => ({ notes: { ...state.notes, [note.id]: note } }))
      return note.id
    }
    return null
  },

  updateNote: async (noteId, updates) => {
    const validated = noteUpdateSchema.safeParse(updates)
    if (!validated.success) {
      logError('Note update validation failed:', validated.error.flatten())
      return
    }

    const prevNote = get().notes[noteId]
    // Optimistic update
    set((state) => ({
      notes: {
        ...state.notes,
        [noteId]: { ...state.notes[noteId], ...updates, updated_at: new Date().toISOString() },
      },
    }))
    const { error } = await supabase.from('notes').update(updates).eq('id', noteId)
    if (error) {
      logError('Failed to update note:', error)
      // Rollback optimistic update
      if (prevNote) {
        set((state) => ({
          notes: { ...state.notes, [noteId]: prevNote },
        }))
      }
    }
  },

  deleteNote: async (noteId) => {
    const prevNote = get().notes[noteId]
    set((state) => {
      const { [noteId]: _, ...rest } = state.notes
      return { notes: rest }
    })
    const { error } = await supabase.from('notes').delete().eq('id', noteId)
    if (error) {
      logError('Failed to delete note:', error)
      // Rollback — restore the note
      if (prevNote) {
        set((state) => ({
          notes: { ...state.notes, [noteId]: prevNote },
        }))
      }
    }
  },

  getAllNotes: () => Object.values(get().notes),
}))
