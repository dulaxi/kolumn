import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useNoteStore = create((set, get) => ({
  notes: {},
  loading: false,

  fetchNotes: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })

    const noteMap = {}
    ;(data || []).forEach((n) => { noteMap[n.id] = n })
    set({ notes: noteMap, loading: false })
  },

  addNote: async (title) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: note } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: title || 'Untitled',
        content: '',
      })
      .select()
      .single()

    if (note) {
      set((state) => ({ notes: { ...state.notes, [note.id]: note } }))
      return note.id
    }
    return null
  },

  updateNote: async (noteId, updates) => {
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
      console.error('Failed to update note:', error)
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
      console.error('Failed to delete note:', error)
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
