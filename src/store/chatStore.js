import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { streamChat } from '../lib/aiClient'
import { executeTool } from '../lib/toolExecutor'

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

  deleteConversation: (id) => set((s) => {
    const { [id]: _, ...restConvs } = s.conversations
    const { [id]: __, ...restMsgs } = s.messages
    return {
      conversations: restConvs,
      messages: restMsgs,
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
    }
  }),

  setActiveConversation: (id) => set({ activeConversationId: id }),
  setStreaming: (conversationId) => set({ streamingConversationId: conversationId }),
  clearStreaming: () => set({ streamingConversationId: null }),

  sendMessage: async (conversationId, userText) => {
    set({ streamingConversationId: conversationId })

    const history = (get().messages[conversationId] || [])
      .filter((m) => m.id)
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.text }))

    const msgId = get().addMessage(conversationId, { role: 'assistant', text: '' })
    let fullText = ''
    const collectedCardIds = []

    await streamChat(
      { message: userText, history },
      {
        onText: (chunk) => {
          fullText += chunk
          set((s) => ({
            messages: {
              ...s.messages,
              [conversationId]: s.messages[conversationId].map((m) =>
                m.id === msgId ? { ...m, text: fullText } : m
              ),
            },
          }))
        },
        onToolCall: async (action, params) => {
          const result = await executeTool(action, params)
          if (result.cardId) {
            collectedCardIds.push(result.cardId)
            set((s) => ({
              messages: {
                ...s.messages,
                [conversationId]: s.messages[conversationId].map((m) =>
                  m.id === msgId ? { ...m, cardIds: [...collectedCardIds] } : m
                ),
              },
            }))
          }
        },
        onDone: () => {
          set({ streamingConversationId: null })
          get().generateTitle(conversationId)
        },
        onError: (error) => {
          fullText += `\n\n*Error: ${error}*`
          set((s) => ({
            streamingConversationId: null,
            messages: {
              ...s.messages,
              [conversationId]: s.messages[conversationId].map((m) =>
                m.id === msgId ? { ...m, text: fullText } : m
              ),
            },
          }))
        },
      },
    )
  },
}), {
  name: 'kolumn-chat',
  partialize: (s) => ({ conversations: s.conversations, messages: s.messages }),
}))
