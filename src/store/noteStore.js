import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

export const useNoteStore = create(
  persist(
    (set, get) => ({
      notes: {},
      addNote: (title) => {
        const note = {
          id: nanoid(),
          title: title || 'Untitled',
          content: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({ notes: { ...state.notes, [note.id]: note } }))
        return note.id
      },
      updateNote: (noteId, updates) =>
        set((state) => ({
          notes: {
            ...state.notes,
            [noteId]: { ...state.notes[noteId], ...updates, updatedAt: new Date().toISOString() },
          },
        })),
      deleteNote: (noteId) =>
        set((state) => {
          const { [noteId]: _, ...rest } = state.notes
          return { notes: rest }
        }),
      getAllNotes: () => Object.values(get().notes),
    }),
    { name: 'gambit-notes' }
  )
)
