import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { runChatLoop } from '../lib/chatAgentLoop'
import { streamChat } from '../lib/aiClient'
import { logError } from '../utils/logger'
import { useBoardStore } from './boardStore'
import { useAuthStore } from './authStore'
import * as chatSync from '../lib/chatSync'
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

// One in-flight stream per conversation; Stop and delete abort through here.
const abortControllers = new Map()

// Per-session sync bookkeeping. syncedIds: conversations known to exist on
// the server (created or upserted this session, or hydrated) — hydrate must
// never flag these localOnly even if a fetch races a fresh upsert.
// loadedThreads: conversations whose messages were fetched this session.
export const _syncedIds = new Set()
const loadedThreads = new Set()

// Streaming patches the store on every SSE chunk; without a debounce each
// chunk re-serializes the ENTIRE chat history into localStorage
// synchronously. Trailing 400ms debounce + quota guard + pagehide flush.
const PERSIST_DEBOUNCE_MS = 400
let persistTimer = null
let pendingPersist = null

function flushPersist() {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  if (pendingPersist) {
    const { name, value } = pendingPersist
    pendingPersist = null
    try {
      localStorage.setItem(name, value)
    } catch (err) {
      logError('[chatStore] persist failed (quota?):', err)
    }
  }
}

const debouncedStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    pendingPersist = { name, value }
    if (!persistTimer) {
      persistTimer = setTimeout(() => {
        persistTimer = null
        flushPersist()
      }, PERSIST_DEBOUNCE_MS)
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPersist)
}

export const useChatStore = create(persist((set, get) => ({
  conversations: {},
  messages: {},
  activeConversationId: null,
  streaming: {},
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

  deleteConversation: (id) => {
    abortControllers.get(id)?.abort()
    set((s) => {
      const { [id]: _, ...restConvs } = s.conversations
      const { [id]: __, ...restMsgs } = s.messages
      const { [id]: ___, ...restStreaming } = s.streaming
      return {
        conversations: restConvs,
        messages: restMsgs,
        streaming: restStreaming,
        activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
      }
    })
  },

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

  // Reconcile the thread list from the server (once, post-auth). Server rows
  // replace same-id cached conversations; cached conversations the server
  // doesn't know become localOnly (legacy, pre-persistence) and never sync.
  hydrateFromServer: async () => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    const res = await chatSync.fetchThreads()
    if (!res.ok) return
    for (const t of res.data) _syncedIds.add(t.id)
    set((s) => {
      const merged = {}
      for (const [id, conv] of Object.entries(s.conversations)) {
        merged[id] = conv.localOnly || _syncedIds.has(id)
          ? conv
          : { ...conv, localOnly: true }
      }
      for (const t of res.data) {
        merged[t.id] = t
      }
      return { conversations: merged }
    })
  },

  // Lazy per-conversation message load: cache paints first, server
  // reconciles once per session. Local messages the server doesn't have
  // (errored replies, in-flight sends) are preserved as a tail.
  ensureMessagesLoaded: async (conversationId) => {
    const conv = get().conversations[conversationId]
    const userId = useAuthStore.getState().user?.id
    if (!conv || conv.localOnly || !userId) return
    if (loadedThreads.has(conversationId)) return
    loadedThreads.add(conversationId)
    const res = await chatSync.fetchMessages(conversationId)
    if (!res.ok) {
      loadedThreads.delete(conversationId)
      return
    }
    set((s) => {
      if (!s.conversations[conversationId]) return s
      const local = s.messages[conversationId] || []
      const serverIds = new Set(res.data.map((m) => m.id))
      const merged = [...res.data, ...local.filter((m) => !serverIds.has(m.id))]
      return { messages: { ...s.messages, [conversationId]: merged } }
    })
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),
  setStreaming: (conversationId) => set((s) => ({
    streaming: { ...s.streaming, [conversationId]: true },
  })),
  clearStreaming: (conversationId) => set((s) => {
    const { [conversationId]: _, ...rest } = s.streaming
    return { streaming: rest }
  }),

  // Abort the conversation's in-flight stream (no-op when idle). The loop
  // resolves `aborted: true`; sendMessage keeps the partial text and stamps
  // the message `stopped`.
  stopStreaming: (conversationId) => {
    abortControllers.get(conversationId)?.abort()
  },

  sendMessage: async (conversationId, userText) => {
    get().setStreaming(conversationId)

    const controller = new AbortController()
    abortControllers.set(conversationId, controller)

    const allMsgs = (get().messages[conversationId] || []).filter((m) => m.id && m.text)
    const history = allMsgs
      .slice(0, -1)
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.text }))

    const msgId = get().addMessage(conversationId, { role: 'assistant', text: '' })
    let fullText = ''
    const patchMsg = (patch) => set((s) => {
      const msgs = s.messages[conversationId]
      // Conversation deleted mid-stream — drop the patch, don't throw.
      if (!msgs) return s
      return {
        messages: {
          ...s.messages,
          [conversationId]: msgs.map((m) =>
            m.id === msgId ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m
          ),
        },
      }
    })

    const today = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())

    const { toolCardIds, error, errorCode, aborted } = await runChatLoop(
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
      { signal: controller.signal },
    )
    abortControllers.delete(conversationId)

    const scanned = findMentionedCardIds(fullText, useBoardStore.getState().cards)
    const mentionedCardIds = [...new Set([...(toolCardIds || []), ...scanned])]

    if (aborted) {
      // User-initiated stop: keep everything that streamed, no error state.
      patchMsg({ stopped: true, mentionedCardIds })
      get().clearStreaming(conversationId)
      if (fullText.trim()) get().generateTitle(conversationId).catch(() => {})
      return
    }

    if (error) {
      logError('[chatStore] stream error:', error, errorCode)
      const friendly = errorCode
        ? { message: String(error), isLimit: errorCode === 'rate_limit' }
        : friendlyChatError(error)
      patchMsg({ error: friendly, mentionedCardIds })
      get().clearStreaming(conversationId)
      return
    }

    patchMsg({ mentionedCardIds })
    get().clearStreaming(conversationId)
    get().generateTitle(conversationId).catch(() => {})
  },

  // Re-send the user message that produced an errored assistant reply. The
  // errored message is removed first so the transcript reads as a clean
  // second attempt (sendMessage appends a fresh assistant message).
  retryMessage: (conversationId, messageId) => {
    // Retry must respect the same one-stream-per-conversation rule the
    // composer's busy guard enforces — an old exchange's Retry button is
    // still clickable while a new reply streams.
    if (get().streaming[conversationId]) return Promise.resolve()
    const msgs = get().messages[conversationId] || []
    const idx = msgs.findIndex((m) => m.id === messageId)
    if (idx === -1 || !msgs[idx].error) return Promise.resolve()
    let userText = null
    for (let i = idx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        userText = msgs[i].text
        break
      }
    }
    if (!userText) return Promise.resolve()
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: s.messages[conversationId].filter((m) => m.id !== messageId),
      },
    }))
    return get().sendMessage(conversationId, userText)
  },
}), {
  name: 'kolumn-chat',
  storage: createJSONStorage(() => debouncedStorage),
  partialize: (s) => ({ conversations: s.conversations, messages: s.messages }),
}))
