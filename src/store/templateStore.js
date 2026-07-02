import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useTemplateStore = create(
  persist(
    (set) => ({
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
    { name: 'kolumn_card_templates' }
  )
)
