import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { runChatLoop } from '../lib/chatAgentLoop'
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

// Normalizes a model-emitted title: collapse whitespace, strip wrapping
// quotes and trailing punctuation, clamp. Empty result = "unusable".
export function cleanTitle(raw) {
  let t = String(raw || '').replace(/\s+/g, ' ').trim()
  t = t.replace(/^["'“‘]+/, '').replace(/["'”’]+$/, '')
  t = t.replace(/[.…]+$/, '').trim()
  if (t.length > 60) t = [...t].slice(0, 60).join('').trimEnd()
  return t
}

// Guards concurrent generateTitle() calls for the same conversation from
// firing streamChat more than once (e.g. a rapid double sendMessage).
const titlingInFlight = new Set()

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
    // Centralized mention stamping: any caller that adds a user message
    // (ChatPage, DashboardPage, ...) gets mentions computed here so no
    // call site can forget it. An explicit mentionedCardIds arg still wins.
    const resolvedMentions = mentionedCardIds !== undefined
      ? mentionedCardIds
      : role === 'user'
        ? findMentionedCardIds(text, useBoardStore.getState().cards)
        : []
    const msg = {
      id: crypto.randomUUID(),
      role,
      text,
      cardIds: cardIds || [],
      mentionedCardIds: resolvedMentions,
      activities: [],
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

  generateTitle: async (conversationId) => {
    const conv = get().conversations[conversationId]
    // Manual renames are sticky; AI naming runs once per conversation.
    // Guards + truncation fallback run synchronously (no await above them) —
    // callers and existing tests rely on the fallback landing immediately.
    if (!conv || conv.titleEdited || conv.aiTitled) return
    if (titlingInFlight.has(conversationId)) return
    const msgs = get().messages[conversationId] || []
    const firstUser = msgs.find((m) => m.role === 'user')
    if (!firstUser) return

    const fallback = firstUser.text.length > 39
      ? firstUser.text.slice(0, 39).trimEnd() + '…'
      : firstUser.text
    set((s) => ({
      conversations: {
        ...s.conversations,
        [conversationId]: { ...s.conversations[conversationId], title: fallback },
      },
    }))

    const firstAssistant = msgs.find((m) => m.role === 'assistant' && m.text && m.text.trim())
    if (!firstAssistant) return

    let raw = ''
    titlingInFlight.add(conversationId)
    try {
      await streamChat(
        {
          mode: 'title',
          history: [],
          message: `User: ${firstUser.text.slice(0, 500)}\nAssistant: ${firstAssistant.text.slice(0, 500)}`,
        },
        {
          onText: (chunk) => { raw += chunk },
          onToolCall: () => {},
          onTier: () => {},
          onDone: () => {},
          onError: (err) => {
            logError('[chatStore] title error:', err)
            raw = ''
          },
        },
      )

      const title = cleanTitle(raw)
      if (!title) return
      set((s) => {
        const current = s.conversations[conversationId]
        // Deleted, or manually renamed while the call was in flight → discard.
        if (!current || current.titleEdited) return s
        return {
          conversations: {
            ...s.conversations,
            [conversationId]: { ...current, title, aiTitled: true },
          },
        }
      })
    } finally {
      titlingInFlight.delete(conversationId)
    }
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
          [id]: { ...s.conversations[id], title: trimmed, titleEdited: true },
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

  // Per-conversation card-rail grouping ('mentioned' | 'board' | 'column' |
  // 'due'). Absent = 'mentioned'. Lives on the conversation so it persists
  // with the rest of the chat state.
  setRailGroupBy: (id, mode) => set((s) => {
    if (!s.conversations[id]) return s
    return {
      conversations: {
        ...s.conversations,
        [id]: { ...s.conversations[id], railGroupBy: mode },
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
    const patchMsg = (patch) => set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: s.messages[conversationId].map((m) =>
          m.id === msgId ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m
        ),
      },
    }))

    const today = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())

    const { toolCardIds, error, errorCode } = await runChatLoop(
      { text: userText, history, today },
      {
        onText: (chunk) => {
          fullText += chunk
          patchMsg({ text: fullText })
        },
        onActivity: ({ icon, label }) => {
          patchMsg((m) => ({ activities: [...(m.activities || []), { atChar: fullText.length, icon, label }] }))
        },
        onTier: (info) => set({ tierInfo: info }),
      },
    )

    const scanned = findMentionedCardIds(fullText, useBoardStore.getState().cards)
    const mentionedCardIds = [...new Set([...(toolCardIds || []), ...scanned])]

    if (error) {
      logError('[chatStore] stream error:', error, errorCode)
      const friendly = errorCode
        ? { message: String(error), isLimit: errorCode === 'rate_limit' }
        : friendlyChatError(error)
      patchMsg({ error: friendly, mentionedCardIds })
      set({ streamingConversationId: null })
      return
    }

    patchMsg({ mentionedCardIds })
    set({ streamingConversationId: null })
    get().generateTitle(conversationId).catch(() => {})
  },
}), {
  name: 'kolumn-chat',
  partialize: (s) => ({ conversations: s.conversations, messages: s.messages }),
}))
