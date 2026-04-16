import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useChatStore = create(persist((set, get) => ({
  conversations: {},
  messages: {},
  activeConversationId: null,
  streamingConversationId: null,

  createConversation: (title = 'New chat') => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    set((s) => ({
      conversations: {
        ...s.conversations,
        [id]: { id, title, created_at: now, updated_at: now },
      },
      messages: { ...s.messages, [id]: [] },
      activeConversationId: id,
    }))
    return id
  },

  addMessage: (conversationId, { role, text, cardIds }) => {
    const msg = {
      id: crypto.randomUUID(),
      role,
      text,
      cardIds: cardIds || [],
      created_at: new Date().toISOString(),
    }
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), msg],
      },
      conversations: {
        ...s.conversations,
        [conversationId]: {
          ...s.conversations[conversationId],
          updated_at: msg.created_at,
        },
      },
    }))
    return msg.id
  },

  generateTitle: (conversationId) => {
    const msgs = get().messages[conversationId] || []
    const firstUser = msgs.find((m) => m.role === 'user')
    if (!firstUser) return
    const title = firstUser.text.length > 39
      ? firstUser.text.slice(0, 39).trimEnd() + '\u2026'
      : firstUser.text
    set((s) => ({
      conversations: {
        ...s.conversations,
        [conversationId]: { ...s.conversations[conversationId], title },
      },
    }))
  },

  getConversationsSorted: () => {
    return Object.values(get().conversations)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),
  setStreaming: (conversationId) => set({ streamingConversationId: conversationId }),
  clearStreaming: () => set({ streamingConversationId: null }),

  mockRespond: async (conversationId, userText) => {
    set({ streamingConversationId: conversationId })

    const lower = userText.toLowerCase()
    let response
    if (lower.startsWith('create a card') || lower.startsWith('create card')) {
      const title = userText.replace(/^create a card[:\s]*/i, '').trim() || 'New task'
      response = `Done — created **${title}** in your board.\n\nAssigned to you, priority medium. Want me to set a due date?`
    } else if (lower.includes('find task') || lower.includes('search')) {
      response = `Here are the matching cards:\n\n1. **Hero section** — In Progress, due Friday\n2. **Pricing table** — To Do, no due date\n3. **Stripe integration** — Review, due today\n\nWant me to open any of these?`
    } else if (lower.includes('plan my week') || lower.includes('stand-up')) {
      response = `### This week's focus\n\n- **3 cards** due this week across 2 boards\n- **Stripe integration** is the most urgent (due today)\n- **Hero section** due Friday — currently in progress\n\n### Suggested priorities\n\n1. Fix the Stripe webhook (blocked)\n2. Finish hero section (in progress)\n3. Start pricing table (not started)\n\nWant me to create a stand-up summary from this?`
    } else {
      response = "I'll be able to help with that once my AI is connected. For now, try creating cards or boards from the templates on the Home page!"
    }

    await new Promise((r) => setTimeout(r, 1500))

    const words = response.split(' ')
    let streamed = ''
    const msgId = get().addMessage(conversationId, { role: 'assistant', text: '' })

    for (let i = 0; i < words.length; i++) {
      streamed += (i === 0 ? '' : ' ') + words[i]
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: s.messages[conversationId].map((m) =>
            m.id === msgId ? { ...m, text: streamed } : m
          ),
        },
      }))
      await new Promise((r) => setTimeout(r, 30))
    }

    set({ streamingConversationId: null })
    get().generateTitle(conversationId)
  },
}), {
  name: 'kolumn-chat',
  partialize: (s) => ({ conversations: s.conversations, messages: s.messages }),
}))
