import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useTemplateStore = create(
  persist(
    (set, get) => ({
      templates: [],

      addTemplate: (template) => {
        const id = crypto.randomUUID()
        set((state) => ({
          templates: [...state.templates, { ...template, id, created_at: new Date().toISOString() }],
        }))
        return id
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }))
      },
    }),
    { name: 'gambit_card_templates' }
  )
)
