import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { streamChat } from '../lib/aiClient'
import { logError } from '../utils/logger'
import { useBoardStore } from './boardStore'
import { findMentionedCardIds } from '../lib/cardMentions'

/**
 * Maps a raw stream/HTTP error string to user-facing copy.
 * Raw detail must never reach the UI — it goes to logError instead.
 */
export function friendlyChatError(raw) {
  const s = String(raw)
  if (/daily limit/i.test(s)) return { message: s, isLimit: true }
  if (/overloaded|529|error 5\d\d|claude api error: 5/i.test(s)) {
    return { message: 'Claude is busy right now — give it a moment and try again.', isLimit: false }
  }
  if (/not authenticated|error 401\b|^unauthorized/i.test(s)) {
    return { message: "You're signed out — sign in again to keep chatting.", isLimit: false }
  }
  if (/failed to fetch|networkerror|load failed|no response stream/i.test(s)) {
    return { message: "Couldn't reach the server — check your connection and try again.", isLimit: false }
  }
  return { message: 'Claude hit a snag — try sending that again.', isLimit: false }
}

export const useChatStore = create(persist((set, get) => ({
  conversations: {},
  messages: {},
  activeConversationId: null,
  streamingConversationId: null,
  tierInfo: null,

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

  addMessage: (conversationId, { role, text, cardIds, mentionedCardIds }) => {
    const msg = {
      id: crypto.randomUUID(),
      role,
      text,
      cardIds: cardIds || [],
      mentionedCardIds: mentionedCardIds || [],
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

  renameConversation: (id, title) => {
    const trimmed = (title || '').trim()
    if (!trimmed) return
    set((s) => {
      if (!s.conversations[id]) return s
      return {
        conversations: {
          ...s.conversations,
          [id]: { ...s.conversations[id], title: trimmed },
        },
      }
    })
  },

  toggleStarred: (id) => set((s) => {
    if (!s.conversations[id]) return s
    return {
      conversations: {
        ...s.conversations,
        [id]: { ...s.conversations[id], starred: !s.conversations[id].starred },
      },
    }
  }),

  setActiveConversation: (id) => set({ activeConversationId: id }),
  setStreaming: (conversationId) => set({ streamingConversationId: conversationId }),
  clearStreaming: () => set({ streamingConversationId: null }),

  sendMessage: async (conversationId, userText) => {
    set({ streamingConversationId: conversationId })

    const allMsgs = (get().messages[conversationId] || []).filter((m) => m.id && m.text)
    const history = allMsgs
      .slice(0, -1)
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.text }))

    const msgId = get().addMessage(conversationId, { role: 'assistant', text: '' })
    let fullText = ''

    await streamChat(
      { message: userText, history, mode: 'chat' },
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
        onDone: () => {
          const mentionedCardIds = findMentionedCardIds(fullText, useBoardStore.getState().cards)
          set((s) => ({
            streamingConversationId: null,
            messages: {
              ...s.messages,
              [conversationId]: s.messages[conversationId].map((m) =>
                m.id === msgId ? { ...m, mentionedCardIds } : m
              ),
            },
          }))
          get().generateTitle(conversationId)
        },
        onTier: (info) => {
          set({ tierInfo: info })
        },
        onError: (error, code) => {
          logError('[chatStore] stream error:', error, code)
          const friendly = code
            ? { message: String(error), isLimit: code === 'rate_limit' }
            : friendlyChatError(error)
          set((s) => ({
            streamingConversationId: null,
            messages: {
              ...s.messages,
              [conversationId]: s.messages[conversationId].map((m) =>
                m.id === msgId ? { ...m, error: friendly } : m
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
