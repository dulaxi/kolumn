# Chat UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend chat UI — store, message rendering, dedicated chat page, mock streaming, and sidebar conversation list — so the AI interface is fully interactive before wiring a real backend.

**Architecture:** Zustand chat store (in-memory for now, Supabase persistence deferred). Dedicated `/chat/:id` route with bottom-pinned input. Messages rendered with react-markdown + custom Kolumn styling. Mock streaming simulates token-by-token reveal. Sidebar shows conversation history matching the existing Boards expandable pattern.

**Tech Stack:** React 19, Zustand, react-markdown, remark-gfm, Phosphor Icons, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-04-16-chat-ui-design.md`

---

## File Structure

**Create:**
- `src/store/chatStore.js` — conversations, messages, CRUD, mock streaming logic
- `src/pages/ChatPage.jsx` — route page (message list + pinned input)
- `src/components/chat/ChatInput.jsx` — bottom-pinned input bar
- `src/components/chat/ChatMessage.jsx` — single message renderer (user bubble / AI minimal)
- `src/components/chat/MarkdownRenderer.jsx` — react-markdown wrapper with Kolumn overrides
- `src/components/chat/TypingIndicator.jsx` — glitchy Kanban icon pulse
- `src/__tests__/chatStore.test.js` — store unit tests

**Modify:**
- `src/App.jsx` — add `/chat/:id` route
- `src/pages/DashboardPage.jsx` — wire `handleSubmit` to create conversation + navigate
- `src/components/layout/Sidebar.jsx` — add expandable conversation list under Chat nav

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install react-markdown + remark-gfm**

Run: `npm install react-markdown remark-gfm`

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-markdown + remark-gfm dependencies"
```

---

### Task 2: Create chatStore with tests

**Files:**
- Create: `src/store/chatStore.js`
- Create: `src/__tests__/chatStore.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStore.test.js`:

```javascript
import { describe, test, expect, beforeEach } from 'vitest'
import { useChatStore } from '../store/chatStore'

beforeEach(() => {
  useChatStore.setState({
    conversations: {},
    messages: {},
    activeConversationId: null,
    streamingConversationId: null,
  })
})

describe('chatStore', () => {
  test('createConversation returns id and adds to store', () => {
    const id = useChatStore.getState().createConversation('Test chat')
    expect(id).toBeTruthy()
    const conv = useChatStore.getState().conversations[id]
    expect(conv.title).toBe('Test chat')
    expect(conv.id).toBe(id)
    expect(conv.created_at).toBeTruthy()
    expect(conv.updated_at).toBeTruthy()
  })

  test('addMessage appends to conversation messages', () => {
    const convId = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(convId, {
      role: 'user',
      text: 'Hello',
    })
    const msgs = useChatStore.getState().messages[convId]
    expect(msgs).toHaveLength(1)
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].text).toBe('Hello')
    expect(msgs[0].id).toBeTruthy()
    expect(msgs[0].cardIds).toEqual([])
    expect(msgs[0].created_at).toBeTruthy()
  })

  test('addMessage with cardIds stores them', () => {
    const convId = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(convId, {
      role: 'assistant',
      text: 'Created cards',
      cardIds: ['c1', 'c2'],
    })
    const msgs = useChatStore.getState().messages[convId]
    expect(msgs[0].cardIds).toEqual(['c1', 'c2'])
  })

  test('generateTitle truncates first user message', () => {
    const convId = useChatStore.getState().createConversation('Untitled')
    useChatStore.getState().addMessage(convId, {
      role: 'user',
      text: 'Create three cards for the new landing page redesign project',
    })
    useChatStore.getState().generateTitle(convId)
    const conv = useChatStore.getState().conversations[convId]
    expect(conv.title.length).toBeLessThanOrEqual(40)
    expect(conv.title).toBe('Create three cards for the new landing…')
  })

  test('generateTitle keeps short messages as-is', () => {
    const convId = useChatStore.getState().createConversation('Untitled')
    useChatStore.getState().addMessage(convId, {
      role: 'user',
      text: 'Hello',
    })
    useChatStore.getState().generateTitle(convId)
    expect(useChatStore.getState().conversations[convId].title).toBe('Hello')
  })

  test('getConversationsSorted returns newest first', () => {
    const id1 = useChatStore.getState().createConversation('First')
    const id2 = useChatStore.getState().createConversation('Second')
    // Manually set updated_at to control order
    useChatStore.setState((s) => ({
      conversations: {
        ...s.conversations,
        [id1]: { ...s.conversations[id1], updated_at: '2026-01-01T00:00:00Z' },
        [id2]: { ...s.conversations[id2], updated_at: '2026-01-02T00:00:00Z' },
      },
    }))
    const sorted = useChatStore.getState().getConversationsSorted()
    expect(sorted[0].id).toBe(id2)
    expect(sorted[1].id).toBe(id1)
  })

  test('multiple messages maintain order', () => {
    const convId = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(convId, { role: 'user', text: 'First' })
    useChatStore.getState().addMessage(convId, { role: 'assistant', text: 'Second' })
    useChatStore.getState().addMessage(convId, { role: 'user', text: 'Third' })
    const msgs = useChatStore.getState().messages[convId]
    expect(msgs.map((m) => m.text)).toEqual(['First', 'Second', 'Third'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- chatStore`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement chatStore**

Create `src/store/chatStore.js`:

```javascript
import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
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
      ? firstUser.text.slice(0, 39) + '…'
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
}))
```

- [ ] **Step 4: Run tests**

Run: `npm test -- chatStore`
Expected: 7 passed.

- [ ] **Step 5: Run full suite + build**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/store/chatStore.js src/__tests__/chatStore.test.js
git commit -m "feat(chat): add chatStore with conversations, messages, and title generation"
```

---

### Task 3: Create TypingIndicator + MarkdownRenderer

**Files:**
- Create: `src/components/chat/TypingIndicator.jsx`
- Create: `src/components/chat/MarkdownRenderer.jsx`

- [ ] **Step 1: Create TypingIndicator**

Create `src/components/chat/TypingIndicator.jsx`:

```jsx
import { Kanban } from '@phosphor-icons/react'

export default function TypingIndicator() {
  return (
    <div className="flex items-center py-3 pl-1">
      <Kanban
        size={16}
        weight="fill"
        className="text-[#8BA32E] animate-[glitch-pulse_1.2s_steps(5,end)_infinite]"
      />
      <style>{`
        @keyframes glitch-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          20% { opacity: 0.3; transform: scale(0.95); }
          40% { opacity: 1; transform: scale(1.05); }
          60% { opacity: 0.5; transform: scale(0.98); }
          80% { opacity: 0.9; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: Create MarkdownRenderer**

Create `src/components/chat/MarkdownRenderer.jsx`:

```jsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components = {
  h3: ({ children }) => (
    <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mt-4 mb-1.5" style={{ fontFamily: "'Clash Grotesk', sans-serif" }}>
      {children}
    </h3>
  ),
  strong: ({ children }) => (
    <strong className="text-[var(--text-primary)]" style={{ fontFamily: "'Clash Grotesk', sans-serif", fontWeight: 600 }}>
      {children}
    </strong>
  ),
  ul: ({ children }) => <ul className="pl-5 my-2 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="pl-5 my-2 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="my-1">{children}</li>,
  code: ({ inline, children, className }) => {
    if (inline) {
      return (
        <code className="bg-[var(--surface-raised)] px-1.5 py-0.5 rounded text-[13px] font-mono">
          {children}
        </code>
      )
    }
    return (
      <pre className="bg-[var(--text-primary)] text-[#E8E2DB] px-4 py-3.5 rounded-[10px] text-[13px] font-mono leading-relaxed overflow-x-auto my-3">
        <code className={className}>{children}</code>
      </pre>
    )
  },
  table: ({ children }) => (
    <table className="w-full border-collapse my-3 text-[13px]">{children}</table>
  ),
  th: ({ children }) => (
    <th className="text-left font-semibold text-[var(--text-primary)] px-2.5 py-1.5 border-b border-[var(--border-default)]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="text-left px-2.5 py-1.5 border-b border-[var(--border-default)]">{children}</td>
  ),
  a: ({ children, href }) => (
    <a href={href} className="text-[#8BA32E] underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  p: ({ children }) => <p className="my-1.5">{children}</p>,
}

export default function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/TypingIndicator.jsx src/components/chat/MarkdownRenderer.jsx
git commit -m "feat(chat): add TypingIndicator and MarkdownRenderer components"
```

---

### Task 4: Create ChatMessage

**Files:**
- Create: `src/components/chat/ChatMessage.jsx`

- [ ] **Step 1: Create ChatMessage**

Create `src/components/chat/ChatMessage.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'
import { Kanban } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import Card from '../board/Card'
import MarkdownRenderer from './MarkdownRenderer'

export default function ChatMessage({ message }) {
  const navigate = useNavigate()
  const cards = useBoardStore((s) => s.cards)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)

  const openCard = (card) => {
    setActiveBoard(card.board_id)
    navigate('/boards')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: card.id } }))
    }, 50)
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-5">
        <div
          className="max-w-[75%] px-3.5 py-2.5 rounded-[18px] rounded-br-[4px] text-[14px] leading-relaxed text-[var(--text-primary)]"
          style={{ background: '#E8DDE2' }}
        >
          {message.text}
        </div>
      </div>
    )
  }

  const embeddedCards = (message.cardIds || [])
    .map((id) => cards[id])
    .filter(Boolean)

  return (
    <div className="mb-5 pl-1">
      <div className="flex items-center gap-1 mb-1">
        <Kanban size={16} weight="fill" className="text-[#8BA32E]" />
      </div>
      <div
        className="text-[15px] leading-[1.7] text-[var(--text-secondary)]"
        style={{ fontFamily: "'Clash Grotesk', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 400 }}
      >
        <MarkdownRenderer content={message.text} />
      </div>

      {embeddedCards.length > 0 && (
        <div className="flex flex-col gap-2 mt-3">
          {embeddedCards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onClick={() => openCard(card)}
            />
          ))}
        </div>
      )}

      {(message.cardIds || []).filter((id) => !cards[id]).map((id) => (
        <div key={id} className="mt-2 px-3 py-2 rounded-xl bg-[var(--surface-raised)] text-[13px] text-[var(--text-faint)]">
          Card not found
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatMessage.jsx
git commit -m "feat(chat): add ChatMessage component with user bubbles and AI markdown"
```

---

### Task 5: Create ChatInput

**Files:**
- Create: `src/components/chat/ChatInput.jsx`

- [ ] **Step 1: Create ChatInput**

Create `src/components/chat/ChatInput.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react'
import { Plus, ArrowUp } from 'lucide-react'

export default function ChatInput({ onSend, autoFocus = false }) {
  const [input, setInput] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) textareaRef.current.focus()
  }, [autoFocus])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
    onSend(text)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col bg-[var(--surface-card)] rounded-[20px] border border-transparent shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035),0_0_0_0.5px_rgba(224,219,213,0.6)] hover:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035),0_0_0_0.5px_rgba(174,170,164,0.6)] focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.075),0_0_0_0.5px_rgba(174,170,164,0.6)] transition-all duration-200">
          <div className="flex flex-col m-3.5 gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="How can I help you today?"
              rows={1}
              className="w-full resize-none bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none min-h-[1.5rem] max-h-96 pl-1.5 pt-1"
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
            />
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Add files" className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
                <Plus className="w-5 h-5" />
              </button>
              <div className="flex-1" />
              {input.trim() ? (
                <button type="button" onClick={handleSubmit} aria-label="Send message" className="h-8 w-8 rounded-lg flex items-center justify-center bg-[var(--text-primary)] text-[var(--surface-card)] hover:opacity-90 transition-opacity cursor-pointer">
                  <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                </button>
              ) : (
                <button type="button" aria-label="Use voice mode" className="h-8 px-1.5 rounded-lg flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 21 21" fill="none" className="block">
                    <rect x="0" y="7.5" height="6" fill="currentColor" width="1" rx="0.5" />
                    <rect x="4" y="5.5" height="10" fill="currentColor" width="1" rx="0.5" />
                    <rect x="8" y="2.5" height="16" fill="currentColor" width="1" rx="0.5" />
                    <rect x="12" y="5.5" height="10" fill="currentColor" width="1" rx="0.5" />
                    <rect x="16" y="2.5" height="16" fill="currentColor" width="1" rx="0.5" />
                    <rect x="20" y="7.5" height="6" fill="currentColor" width="1" rx="0.5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatInput.jsx
git commit -m "feat(chat): add ChatInput component with send/voice toggle"
```

---

### Task 6: Create ChatPage + add route

**Files:**
- Create: `src/pages/ChatPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create ChatPage**

Create `src/pages/ChatPage.jsx`:

```jsx
import { useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import ChatMessage from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import TypingIndicator from '../components/chat/TypingIndicator'

export default function ChatPage() {
  const { id } = useParams()
  const conversation = useChatStore((s) => s.conversations[id])
  const messages = useChatStore((s) => s.messages[id] || [])
  const streamingId = useChatStore((s) => s.streamingConversationId)
  const addMessage = useChatStore((s) => s.addMessage)
  const mockRespond = useChatStore((s) => s.mockRespond)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    useChatStore.getState().setActiveConversation(id)
    return () => useChatStore.getState().setActiveConversation(null)
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingId])

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
        <p className="text-sm">Conversation not found</p>
        <Link to="/dashboard" className="text-sm text-[#8BA32E] hover:underline">Back to Home</Link>
      </div>
    )
  }

  const handleSend = (text) => {
    addMessage(id, { role: 'user', text })
    mockRespond(id, text)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 subtle-scrollbar">
        <div className="mx-auto max-w-2xl">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {streamingId === id && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <ChatInput onSend={handleSend} autoFocus />
    </div>
  )
}
```

- [ ] **Step 2: Add route to App.jsx**

In `src/App.jsx`, add the lazy import near the other page imports (around line 18):

```javascript
const ChatPage = lazy(() => import('./pages/ChatPage'))
```

Add the route inside the `<ProtectedRoute>` block (after the `dashboard` route, around line 66):

```jsx
<Route path="chat/:id" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ChatPage.jsx src/App.jsx
git commit -m "feat(chat): add ChatPage with message list and /chat/:id route"
```

---

### Task 7: Add mock streaming to chatStore

**Files:**
- Modify: `src/store/chatStore.js`

- [ ] **Step 1: Add mockRespond action to chatStore**

Add this inside the `create((set, get) => ({` block, after the `clearStreaming` action:

```javascript
  mockRespond: async (conversationId, userText) => {
    set({ streamingConversationId: conversationId })

    // Pick a mock response based on user input
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

    // Simulate streaming delay
    await new Promise((r) => setTimeout(r, 1500))

    // Stream token-by-token
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
```

- [ ] **Step 2: Run tests + build**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass (existing chatStore tests still pass — mockRespond is async and not tested here).

- [ ] **Step 3: Commit**

```bash
git add src/store/chatStore.js
git commit -m "feat(chat): add mock streaming with contextual responses"
```

---

### Task 8: Wire DashboardPage handleSubmit

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Add chatStore import and wire handleSubmit**

In `src/pages/DashboardPage.jsx`, add the import:

```javascript
import { useChatStore } from '../store/chatStore'
```

Replace the existing `handleSubmit` function:

```javascript
  const handleSubmit = () => {
    // AI hook-up point — noop for now
  }
```

With:

```javascript
  const createConversation = useChatStore((s) => s.createConversation)
  const addMessage = useChatStore((s) => s.addMessage)
  const mockRespond = useChatStore((s) => s.mockRespond)

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
    const convId = createConversation('New chat')
    addMessage(convId, { role: 'user', text })
    setInput('')
    navigate(`/chat/${convId}`)
    mockRespond(convId, text)
  }
```

Note: `createConversation`, `addMessage`, and `mockRespond` selectors should be placed near the other store selectors (around line 78), NOT inside the `handleSubmit` function.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Manual smoke test**

Start `npm run dev`. Go to Home page. Type "Plan my week" in the input. Press Enter.
Expected: navigates to `/chat/:id`, shows the user message in a mauve bubble, then the mock AI response streams in word by word.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat(chat): wire Home page input to create conversations"
```

---

### Task 9: Add conversation list to Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`

- [ ] **Step 1: Import chatStore**

Add near the other store imports:

```javascript
import { useChatStore } from '../../store/chatStore'
```

- [ ] **Step 2: Add store selectors inside the Sidebar component**

Inside the `Sidebar` function body, near the other store hooks:

```javascript
  const chatConversations = useChatStore((s) => s.getConversationsSorted())
  const [chatsOpen, setChatsOpen] = useState(true)
```

- [ ] **Step 3: Replace Chat NavLink with expandable section**

Find the existing Chat NavLink block (around lines 153-170, the `<NavLink to="/dashboard"...>` with `ChatsCircle`).

Replace it with:

```jsx
          {/* Chat — expandable conversation list */}
          <button
            type="button"
            onClick={() => { if (showCollapsed) { closeMobileMenu(); navigate('/dashboard') } else { setChatsOpen(!chatsOpen) } }}
            title={showCollapsed ? 'Chat' : undefined}
            className={`flex items-center h-8 rounded-lg text-sm transition-colors duration-75 overflow-hidden w-full ${
              location.pathname.startsWith('/chat') || location.pathname === '/dashboard'
                ? 'bg-[var(--accent-lime-wash)] text-[var(--text-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]'
            } ${showCollapsed ? 'justify-center px-2' : 'gap-3 py-1.5 px-4'}`}
          >
            <span className="relative flex items-center justify-center" style={{ width: 16, height: 16 }}>
              <ChatsCircle size={16} weight="regular" className="shrink-0" />
            </span>
            {!showCollapsed && (
              <>
                <span className="truncate flex-1 text-left">Chat</span>
                <Plus
                  className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  onClick={(e) => { e.stopPropagation(); closeMobileMenu(); navigate('/dashboard') }}
                />
              </>
            )}
          </button>

          {/* Chat conversation list */}
          {!showCollapsed && chatsOpen && chatConversations.length > 0 && (
            <div className="flex flex-col gap-px">
              {chatConversations.map((conv) => (
                <NavLink
                  key={conv.id}
                  to={`/chat/${conv.id}`}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex items-center h-7 rounded-lg text-[13px] transition-colors duration-75 overflow-hidden gap-3 py-1 px-4 pl-11 ${
                      isActive
                        ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`
                  }
                >
                  <span className="truncate">{conv.title}</span>
                </NavLink>
              ))}
            </div>
          )}
```

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Manual smoke test**

Start `npm run dev`.
1. From Home, send a message → conversation is created, navigated to `/chat/:id`.
2. Check sidebar — "Chat" section now shows the conversation title.
3. Click another sidebar item, then click back on the conversation → loads the chat.
4. Send another message from Home → second conversation appears in sidebar.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Sidebar.jsx
git commit -m "feat(chat): add conversation list to sidebar under Chat nav"
```

---

### Task 10: Refactor DashboardPage to use ChatInput

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Replace inline input with ChatInput component**

In `src/pages/DashboardPage.jsx`, add the import:

```javascript
import ChatInput from '../components/chat/ChatInput'
```

Remove the `input` state (`const [input, setInput] = useState('')`), the `handleKeyDown` function, and the `handleActionClick` function.

Replace the entire `{/* Chat input */}` section (the `<div className="w-full">` wrapping the textarea card, around lines 128-169) with:

```jsx
        {/* Chat input */}
        <div className="w-full">
          <ChatInput onSend={(text) => handleSubmit(text)} />
        </div>
```

Update `handleSubmit` to accept a `text` parameter instead of reading from `input` state:

```javascript
  const handleSubmit = (text) => {
    if (!text) return
    const convId = createConversation('New chat')
    addMessage(convId, { role: 'user', text })
    navigate(`/chat/${convId}`)
    mockRespond(convId, text)
  }
```

Remove the action pill `handleActionClick` function and update pill buttons to call `handleSubmit` directly with the prompt:

```jsx
                <button
                  type="button"
                  onClick={() => handleSubmit(prompt)}
                  className="..."
                >
```

- [ ] **Step 2: Clean up unused imports**

Remove `useState` if no longer used (keep `useEffect`). Remove `ArrowUp`, `Plus` from lucide if no longer used in DashboardPage (they're still used via ChatInput, but not in this file). Check with:

```bash
grep -n "ArrowUp\|useState" src/pages/DashboardPage.jsx
```

- [ ] **Step 3: Run build + tests**

Run: `npm run build && npm test`
Expected: success.

- [ ] **Step 4: Manual smoke test**

1. Home page looks the same visually (ChatInput renders identically to the old inline version).
2. Type and send → navigates to chat.
3. Click a pill → immediately creates chat with that prompt.
4. Template tiles still work (create boards).

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "refactor(home): replace inline input with ChatInput component"
```

---

### Task 11: End-to-end verification

- [ ] **Step 1: Run full build + tests**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 2: Full smoke test**

Start `npm run dev` and verify each flow:

1. **Home → new chat:** Type message, press Enter → navigates to `/chat/:id`, user bubble appears, typing indicator shows, mock AI response streams in.
2. **Action pills:** Click "Plan my week" → creates chat with that prompt, AI responds with weekly plan mock.
3. **Sidebar:** Conversation appears under Chat section. Title shows truncated first message.
4. **Sidebar click:** Click conversation title → navigates to `/chat/:id`, messages load.
5. **Multiple chats:** Create 2-3 conversations. All appear in sidebar sorted by most recent.
6. **Typing indicator:** During AI response, glitchy Kanban icon pulses. Disappears when response completes.
7. **Markdown:** AI responses render bold text, lists, headings correctly.
8. **Template tiles:** Still create boards (not chats). Navigate to /boards.
9. **Kolumn logo:** Clicks to Home (`/dashboard`).
10. **Conversation not found:** Navigate to `/chat/fake-id` → shows "Conversation not found" with link back.

- [ ] **Step 3: Line count**

Run:
```bash
wc -l src/store/chatStore.js src/pages/ChatPage.jsx src/components/chat/*.jsx
```

---

## Self-Review

**Spec coverage:**
- `/chat/:id` route → Task 6 ✓
- Chat store (conversations, messages, CRUD) → Task 2 ✓
- TypingIndicator (glitchy pulse) → Task 3 ✓
- MarkdownRenderer (react-markdown + overrides) → Task 3 ✓
- ChatMessage (user bubble + AI minimal + card embeds) → Task 4 ✓
- ChatInput (extracted, bottom-pinned) → Task 5, Task 10 ✓
- ChatPage (message list + pinned input) → Task 6 ✓
- Mock streaming (token-by-token) → Task 7 ✓
- DashboardPage handleSubmit wiring → Task 8 ✓
- Sidebar conversation list → Task 9 ✓
- Title generation (truncation) → Task 2 ✓
- Card embeds via cardIds → Task 4 ✓
- Supabase tables → Deferred (spec says "persisted to Supabase" but noted as separate migration task; in-memory store works for mock phase)

**Placeholder scan:** No TBDs. All steps have complete code.

**Type consistency:** `useChatStore` consistent throughout. `mockRespond(conversationId, text)` signature matches across Tasks 7, 8. `addMessage` shape `{ role, text, cardIds? }` consistent in store and callers. `ChatInput` prop `onSend(text)` consistent in ChatPage and DashboardPage.
