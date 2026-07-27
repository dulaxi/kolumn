# Chat Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the audit's confirmed chat bugs (streaming races, delete-mid-stream crash, per-chunk persistence, swallowed server errors) and the S-sized UX wins (retry, confirm-delete, dead buttons, typing indicator, busy cue).

**Architecture:** Client work concentrates in `chatStore.js` (streaming map, guards, retry, debounced persist) with UI wiring in ChatPage/ChatMessage/ChatInput/ChatListPage; a small perf pass in CardRail/cardMentions; three surgical edge-function changes (stream error handling, pill tool exclusions, tier-gated pill rules).

**Tech Stack:** React 19, Zustand persist middleware, Vitest + @testing-library/react, Deno (edge tests), Supabase Edge Functions.

**Spec:** `docs/superpowers/specs/2026-07-26-chat-hardening-design.md`

## Global Constraints

- Streaming state: `streaming: { [conversationId]: true }` map; actions `setStreaming(id)` / `clearStreaming(id)`; a conversation's flag is only ever cleared by its own id. `streamingConversationId` is removed entirely — grep tests and update.
- `patchMsg` and post-loop patches are no-ops when `messages[conversationId]` no longer exists; `clearStreaming(id)` still runs.
- Persist debounce: trailing 400ms (`PERSIST_DEBOUNCE_MS = 400`), try/catch around the real `setItem` with `logError('[chatStore] persist failed (quota?):', err)`, `pagehide` flush, guarded by `typeof window !== 'undefined'`.
- Retry: only for messages with `error`; hidden for `error.isLimit`; removes the errored assistant message then re-sends the nearest preceding user message's text.
- Busy cue copy exactly: `Waiting for the current reply…` — mono 11px `var(--text-muted)`, `aria-live="polite"`, auto-hides after 2000ms, draft preserved.
- Typing indicator renders only while every reply in the newest exchange has empty text.
- List-page delete ConfirmModal copy identical to ChatPage's: title `Delete conversation?`, message `This permanently removes the conversation and its messages.`
- Removed affordances: ChatInput "Add files" + "voice mode" buttons; ChatListPage "Sort by Activity" button. Send button always rendered, `disabled={!input.trim() || busy}`.
- Edge: pro pill prompt block stays byte-identical; only free pill gets the compact ruleset. `PILL_DISALLOWED_TOOLS` gains `search_cards`, `summarize_board`. Anthropic `error` SSE events surface via `sse.error(...)`.
- Icons Phosphor only; colors via CSS-variable tokens; no new hex codes. Commits: `fix(chat)` / `feat(chat)` / `fix(ai)` scopes as given per task.

---

### Task 1: Streaming map + delete-mid-stream guards (chatStore)

**Files:**
- Modify: `src/store/chatStore.js`
- Test: `src/__tests__/chatStoreStreaming.test.js` (new)
- Also: update any existing test in `src/__tests__/` that references `streamingConversationId` (grep for it) to the new map.

**Interfaces:**
- Produces: `streaming` state map; `setStreaming(id)`, `clearStreaming(id)`. Task 4 reads `!!s.streaming[id]` in ChatPage.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStoreStreaming.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from '../store/chatStore'
import { runChatLoop } from '../lib/chatAgentLoop'

vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))
vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn().mockResolvedValue(undefined) }))

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('streaming map', () => {
  beforeEach(() => {
    useChatStore.setState({ conversations: {}, messages: {}, streaming: {} })
    runChatLoop.mockReset()
  })

  test('two conversations stream independently; finishing one leaves the other busy', async () => {
    const a = useChatStore.getState().createConversation()
    const b = useChatStore.getState().createConversation()
    let resolveA, resolveB
    runChatLoop
      .mockReturnValueOnce(new Promise((r) => { resolveA = r }))
      .mockReturnValueOnce(new Promise((r) => { resolveB = r }))

    const pA = useChatStore.getState().sendMessage(a, 'question A')
    const pB = useChatStore.getState().sendMessage(b, 'question B')
    expect(useChatStore.getState().streaming[a]).toBe(true)
    expect(useChatStore.getState().streaming[b]).toBe(true)

    resolveA({ toolCardIds: [], error: null })
    await pA
    expect(useChatStore.getState().streaming[a]).toBeUndefined()
    expect(useChatStore.getState().streaming[b]).toBe(true)

    resolveB({ toolCardIds: [], error: null })
    await pB
    expect(useChatStore.getState().streaming[b]).toBeUndefined()
  })

  test('deleting the conversation mid-stream does not throw and clears its flag', async () => {
    const id = useChatStore.getState().createConversation()
    let capturedCallbacks
    let resolveLoop
    runChatLoop.mockImplementation((_input, callbacks) => {
      capturedCallbacks = callbacks
      return new Promise((r) => { resolveLoop = r })
    })

    const p = useChatStore.getState().sendMessage(id, 'doomed question')
    useChatStore.getState().deleteConversation(id)

    // Chunks arriving after deletion must not throw.
    expect(() => capturedCallbacks.onText('late chunk')).not.toThrow()

    resolveLoop({ toolCardIds: [], error: null })
    await expect(p).resolves.toBeUndefined()
    await flush()
    expect(useChatStore.getState().streaming[id]).toBeUndefined()
    expect(useChatStore.getState().messages[id]).toBeUndefined()
  })

  test('error path also clears only its own flag', async () => {
    const id = useChatStore.getState().createConversation()
    runChatLoop.mockResolvedValue({ toolCardIds: [], error: 'boom', errorCode: null })
    useChatStore.setState((s) => ({ streaming: { ...s.streaming, other: true } }))
    await useChatStore.getState().sendMessage(id, 'q')
    expect(useChatStore.getState().streaming[id]).toBeUndefined()
    expect(useChatStore.getState().streaming.other).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- chatStoreStreaming`
Expected: FAIL (`streaming` is undefined; scalar semantics).

- [ ] **Step 3: Implement in `src/store/chatStore.js`**

State + actions — replace `streamingConversationId: null,` with `streaming: {},` and replace the `setStreaming`/`clearStreaming` actions:

```js
  setStreaming: (conversationId) => set((s) => ({
    streaming: { ...s.streaming, [conversationId]: true },
  })),
  clearStreaming: (conversationId) => set((s) => {
    const { [conversationId]: _, ...rest } = s.streaming
    return { streaming: rest }
  }),
```

In `deleteConversation`, also drop the entry — the return becomes:

```js
  deleteConversation: (id) => set((s) => {
    const { [id]: _, ...restConvs } = s.conversations
    const { [id]: __, ...restMsgs } = s.messages
    const { [id]: ___, ...restStreaming } = s.streaming
    return {
      conversations: restConvs,
      messages: restMsgs,
      streaming: restStreaming,
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
    }
  }),
```

In `sendMessage`: replace `set({ streamingConversationId: conversationId })` with `get().setStreaming(conversationId)`; replace both `set({ streamingConversationId: null })` calls with `get().clearStreaming(conversationId)`; and guard `patchMsg`:

```js
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
```

- [ ] **Step 4: Update existing tests that reference the scalar**

Run `grep -rn "streamingConversationId" src/__tests__/` and update each site: state setup `streamingConversationId: null` → `streaming: {}`; assertions `.streamingConversationId === x` → `.streaming[x]` truthiness / `.streaming` emptiness. Do not weaken what a test proves.

- [ ] **Step 5: Run tests**

Run: `npm run test -- chatStore` (matches all chatStore* files)
Expected: all PASS, including the 3 new ones.

- [ ] **Step 6: Commit**

```bash
git add src/store/chatStore.js src/__tests__/
git commit -m "fix(chat): per-conversation streaming map + delete-mid-stream guards"
```

---

### Task 2: Debounced, quota-guarded persistence (chatStore)

**Files:**
- Modify: `src/store/chatStore.js` (persist config only)
- Test: `src/__tests__/chatStorePersist.test.js` (new)

**Interfaces:**
- Produces: no API change; persistence timing changes only.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStorePersist.test.js`:

```js
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useChatStore } from '../store/chatStore'

describe('debounced persist', () => {
  let setItemSpy
  beforeEach(() => {
    vi.useFakeTimers()
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    setItemSpy.mockRestore()
  })

  test('rapid store writes collapse into one localStorage write', () => {
    const id = useChatStore.getState().createConversation()
    setItemSpy.mockClear()
    for (let i = 0; i < 20; i++) {
      useChatStore.getState().addMessage(id, { role: 'assistant', text: `chunk ${i}` })
    }
    expect(setItemSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(setItemSpy).toHaveBeenCalledTimes(1)
    const [, value] = setItemSpy.mock.calls[0]
    expect(value).toContain('chunk 19')
  })

  test('a quota error is swallowed, not thrown', () => {
    setItemSpy.mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'hi' })
    expect(() => vi.advanceTimersByTime(400)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- chatStorePersist`
Expected: FAIL — first test sees an immediate synchronous `setItem` per write.

- [ ] **Step 3: Implement the storage adapter**

In `src/store/chatStore.js`, change the middleware import to `import { persist, createJSONStorage } from 'zustand/middleware'` and add above the store creation:

```js
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
```

And extend the persist options at the bottom of the file:

```js
}), {
  name: 'kolumn-chat',
  storage: createJSONStorage(() => debouncedStorage),
  partialize: (s) => ({ conversations: s.conversations, messages: s.messages }),
}))
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- chatStorePersist` then `npm run test -- chatStore`
Expected: PASS; existing chatStore suites unaffected (they read store state, not localStorage).

- [ ] **Step 5: Commit**

```bash
git add src/store/chatStore.js src/__tests__/chatStorePersist.test.js
git commit -m "fix(chat): debounce chat persistence off the streaming chunk path"
```

---

### Task 3: `retryMessage` store action

**Files:**
- Modify: `src/store/chatStore.js`
- Test: `src/__tests__/chatStoreRetry.test.js` (new)

**Interfaces:**
- Produces: `retryMessage(conversationId, messageId)` — Task 4 wires it to the UI.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStoreRetry.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from '../store/chatStore'
import { runChatLoop } from '../lib/chatAgentLoop'

vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))
vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn().mockResolvedValue(undefined) }))

describe('retryMessage', () => {
  beforeEach(() => {
    useChatStore.setState({ conversations: {}, messages: {}, streaming: {} })
    runChatLoop.mockReset()
    runChatLoop.mockResolvedValue({ toolCardIds: [], error: null })
  })

  const seedFailedExchange = () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'the question' })
    const failedId = useChatStore.getState().addMessage(id, { role: 'assistant', text: '' })
    useChatStore.setState((s) => ({
      messages: {
        ...s.messages,
        [id]: s.messages[id].map((m) =>
          m.id === failedId ? { ...m, error: { message: 'snag', isLimit: false } } : m
        ),
      },
    }))
    return { id, failedId }
  }

  test('removes the errored message and re-sends the preceding user text', async () => {
    const { id, failedId } = seedFailedExchange()
    await useChatStore.getState().retryMessage(id, failedId)
    const msgs = useChatStore.getState().messages[id]
    expect(msgs.find((m) => m.id === failedId)).toBeUndefined()
    expect(runChatLoop).toHaveBeenCalledTimes(1)
    expect(runChatLoop.mock.calls[0][0].text).toBe('the question')
  })

  test('no-op for a message without an error', async () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'q' })
    const okId = useChatStore.getState().addMessage(id, { role: 'assistant', text: 'fine' })
    await useChatStore.getState().retryMessage(id, okId)
    expect(runChatLoop).not.toHaveBeenCalled()
    expect(useChatStore.getState().messages[id]).toHaveLength(2)
  })

  test('no-op when no preceding user message exists', async () => {
    const id = useChatStore.getState().createConversation()
    const loneId = useChatStore.getState().addMessage(id, { role: 'assistant', text: '' })
    useChatStore.setState((s) => ({
      messages: {
        ...s.messages,
        [id]: s.messages[id].map((m) => ({ ...m, error: { message: 'x', isLimit: false } })),
      },
    }))
    await useChatStore.getState().retryMessage(id, loneId)
    expect(runChatLoop).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- chatStoreRetry`
Expected: FAIL (`retryMessage` is not a function).

- [ ] **Step 3: Add the action** (in `src/store/chatStore.js`, directly after `sendMessage`)

```js
  // Re-send the user message that produced an errored assistant reply. The
  // errored message is removed first so the transcript reads as a clean
  // second attempt (sendMessage appends a fresh assistant message).
  retryMessage: (conversationId, messageId) => {
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
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- chatStoreRetry`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/chatStore.js src/__tests__/chatStoreRetry.test.js
git commit -m "feat(chat): retryMessage store action for failed replies"
```

---

### Task 4: ChatMessage Retry button + ChatPage wiring + typing indicator

**Files:**
- Modify: `src/components/chat/ChatMessage.jsx`, `src/pages/ChatPage.jsx`
- Test: `src/__tests__/ChatMessageRetry.test.jsx` (new)

**Interfaces:**
- Consumes: `retryMessage` (Task 3); `streaming` map (Task 1).
- Produces: `ChatMessage` gains optional `onRetry` prop.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/ChatMessageRetry.test.jsx`:

```jsx
import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatMessage from '../components/chat/ChatMessage'

const renderMsg = (message, onRetry) =>
  render(<MemoryRouter><ChatMessage message={message} onRetry={onRetry} /></MemoryRouter>)

describe('ChatMessage retry', () => {
  test('errored message shows Retry and fires onRetry', () => {
    const onRetry = vi.fn()
    renderMsg(
      { id: 'm1', role: 'assistant', text: '', error: { message: 'Claude hit a snag — try sending that again.', isLimit: false } },
      onRetry,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test('limit errors show the upgrade link, not Retry', () => {
    renderMsg(
      { id: 'm1', role: 'assistant', text: '', error: { message: 'Daily limit reached.', isLimit: true } },
      vi.fn(),
    )
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument()
  })

  test('no Retry without an onRetry handler', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: '', error: { message: 'snag', isLimit: false } })
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- ChatMessageRetry`
Expected: FAIL (no Retry button rendered).

- [ ] **Step 3: Implement**

In `src/components/chat/ChatMessage.jsx`: widen the signature to
`export default function ChatMessage({ message, onRetry })` and replace the error notice block with:

```jsx
      {message.error && (
        <InlineNotice
          variant="error"
          className="mt-3 max-w-md"
          action={
            onRetry && !message.error.isLimit ? (
              <button type="button" onClick={onRetry} className="underline underline-offset-2">
                Retry
              </button>
            ) : undefined
          }
        >
          {message.error.message}
          {message.error.isLimit && (
            <>
              {' '}
              <Link to="/upgrade/pro" className="underline underline-offset-2">
                Upgrade to Pro
              </Link>
            </>
          )}
        </InlineNotice>
      )}
```

In `src/pages/ChatPage.jsx`:
1. Replace the streaming selector: `const streamingId = useChatStore((s) => s.streamingConversationId)` → `const streaming = useChatStore((s) => !!s.streaming[id])`.
2. Add after the `setRailGroupBy` selector: `const retryMessage = useChatStore((s) => s.retryMessage)`
3. `busy={streamingId === id}` → `busy={streaming}` on the ChatInput.
4. Replies render + typing indicator (inside the exchanges map) becomes:

```jsx
              {exchange.replies.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onRetry={msg.error && !msg.error.isLimit ? () => retryMessage(id, msg.id) : undefined}
                />
              ))}
              {i === 0 && streaming && !exchange.replies.some((r) => r.text) && <TypingIndicator />}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- ChatMessage`
Expected: PASS (new file + existing ChatMessageActivities).

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatMessage.jsx src/pages/ChatPage.jsx src/__tests__/ChatMessageRetry.test.jsx
git commit -m "feat(chat): retry failed replies; typing indicator yields to first token"
```

---

### Task 5: ChatInput cleanup + busy cue; ChatListPage confirm-delete + dead sort button

**Files:**
- Modify: `src/components/chat/ChatInput.jsx`, `src/pages/ChatListPage.jsx`
- Test: `src/__tests__/ChatInputBusy.test.jsx` (new), `src/__tests__/ChatListDelete.test.jsx` (new)

**Interfaces:**
- Consumes: `ConfirmModal` from `src/components/board/ConfirmModal` (props: `title`, `message`, `onConfirm`, `onCancel` — same usage as ChatPage.jsx:214-224).

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/ChatInputBusy.test.jsx`:

```jsx
import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ChatInput from '../components/chat/ChatInput'

describe('ChatInput', () => {
  test('send button is always rendered and disabled when empty', () => {
    render(<ChatInput onSend={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Add files' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use voice mode' })).not.toBeInTheDocument()
  })

  test('Enter while busy keeps the draft and shows the waiting hint, then hides it', () => {
    vi.useFakeTimers()
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} busy />)
    const box = screen.getByPlaceholderText('How can I help you today?')
    fireEvent.change(box, { target: { value: 'queued question' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
    expect(box).toHaveValue('queued question')
    expect(screen.getByText('Waiting for the current reply…')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.queryByText('Waiting for the current reply…')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  test('Enter sends when not busy', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    const box = screen.getByPlaceholderText('How can I help you today?')
    fireEvent.change(box, { target: { value: 'hello' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('hello')
    expect(box).toHaveValue('')
  })
})
```

Create `src/__tests__/ChatListDelete.test.jsx`:

```jsx
import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatListPage from '../pages/ChatListPage'
import { useChatStore } from '../store/chatStore'

describe('ChatListPage delete', () => {
  beforeEach(() => {
    useChatStore.setState({
      conversations: {
        c1: { id: 'c1', title: 'Doomed chat', created_at: '2026-07-26T10:00:00.000Z', updated_at: '2026-07-26T10:00:00.000Z' },
      },
      messages: { c1: [] },
    })
  })

  test('delete asks for confirmation and only deletes on confirm', () => {
    render(<MemoryRouter><ChatListPage /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText('Delete conversation'))
    expect(useChatStore.getState().conversations.c1).toBeDefined()
    expect(screen.getByText('Delete conversation?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))
    expect(useChatStore.getState().conversations.c1).toBeUndefined()
  })

  test('the decorative sort button is gone', () => {
    render(<MemoryRouter><ChatListPage /></MemoryRouter>)
    expect(screen.queryByText('Sort by Activity')).not.toBeInTheDocument()
  })
})
```

Note: if the ConfirmModal's confirm button label is not exactly "Delete", read `src/components/board/ConfirmModal.jsx` and match the test to its actual confirm-button text — adjust the test, not the modal.

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- ChatInputBusy` and `npm run test -- ChatListDelete`
Expected: both FAIL against current components.

- [ ] **Step 3: Implement ChatInput**

Rewrite the changing parts of `src/components/chat/ChatInput.jsx`: imports become `import { useState, useRef, useEffect } from 'react'` / `import { ArrowUp } from '@phosphor-icons/react'` (Plus/Waveform removed). Add hint state and rework submit:

```jsx
  const [blockedHint, setBlockedHint] = useState(false)
  const hintTimer = useRef(null)
  useEffect(() => () => clearTimeout(hintTimer.current), [])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
    if (busy) {
      // Draft stays put; a transient cue explains why nothing was sent.
      setBlockedHint(true)
      clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setBlockedHint(false), 2000)
      return
    }
    onSend(text)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }
```

Button row becomes:

```jsx
        <div className="flex items-center gap-2">
          {blockedHint && (
            <span aria-live="polite" className="font-mono text-[11px] text-[var(--text-muted)]">
              Waiting for the current reply…
            </span>
          )}
          <div className="flex-1" />
          <Button size="icon-sm" onClick={handleSubmit} disabled={!input.trim() || busy} aria-label="Send message">
            <ArrowUp className="w-4 h-4" weight="bold" />
          </Button>
        </div>
```

- [ ] **Step 4: Implement ChatListPage**

In `src/pages/ChatListPage.jsx`: remove the "Sort by Activity" button and the now-unused `CaretDown` import (and `TOOLBAR_BTN_FILL` if nothing else uses it); add `import ConfirmModal from '../components/board/ConfirmModal'`; add `const [confirmDelete, setConfirmDelete] = useState(null)`; change the X handler to `onClick={(e) => { e.stopPropagation(); setConfirmDelete(conv) }}`; and before the closing `</div>` of the page add:

```jsx
      {confirmDelete && (
        <ConfirmModal
          title="Delete conversation?"
          message="This permanently removes the conversation and its messages."
          onConfirm={() => {
            deleteConversation(confirmDelete.id)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- ChatInputBusy` and `npm run test -- ChatListDelete`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/ChatInput.jsx src/pages/ChatListPage.jsx src/__tests__/ChatInputBusy.test.jsx src/__tests__/ChatListDelete.test.jsx
git commit -m "fix(chat): confirm list-page delete, busy cue, drop dead composer buttons"
```

---

### Task 6: Perf — mention fingerprint memo + cached title scan

**Files:**
- Modify: `src/components/chat/CardRail.jsx`, `src/lib/cardMentions.js`
- Test: existing suites must stay green (`CardRail`, `cardMentions`); no new tests — both changes are pure memoization with identical outputs.

- [ ] **Step 1: CardRail fingerprint**

In `src/components/chat/CardRail.jsx`, replace the `{ current, earlier }` useMemo's dependency on `messages` with a cheap fingerprint (message text changes every chunk; mentions only change when a message's id lists change):

```jsx
  // Streaming replaces `messages` identity on every chunk, but mentions only
  // change when a message's id lists do — key the expensive split/resolve on
  // this fingerprint instead.
  const mentionKey = messages
    .map((m) => `${(m.mentionedCardIds || []).join(',')}|${(m.cardIds || []).join(',')}`)
    .join(';')

  const { current, earlier } = useMemo(() => {
    const { currentRaw, earlierRaw } = splitMentionedIds(messages)
    const seen = new Set()
    const resolve = (raws) => {
      const out = []
      for (const raw of raws) {
        const cardId = (tempIdMap && tempIdMap[raw]) || raw
        if (seen.has(cardId)) continue
        seen.add(cardId)
        if (cards[cardId]) out.push(cards[cardId])
      }
      return out
    }
    // Current resolves first so a card mentioned now AND earlier renders
    // once, as current.
    return { current: resolve(currentRaw), earlier: resolve(earlierRaw) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mentionKey stands in for messages
  }, [mentionKey, cards, tempIdMap])
```

- [ ] **Step 2: cardMentions cache**

In `src/lib/cardMentions.js`, cache the sorted candidate list keyed on the `cardsById` object identity (boardStore replaces the object on every change, so identity is a correct cache key). Locate where the function derives its sorted title list from `cardsById` (the `Object.values(...)`+sort at the top of `findMentionedCardIds`) and hoist it:

```js
// The sorted candidate list only changes when the cards object does —
// boardStore replaces `cards` wholesale on every mutation, so object
// identity is a safe cache key. Avoids re-sorting ~N cards per message.
let _cacheSource = null
let _cacheCandidates = null

function candidatesFor(cardsById) {
  if (cardsById === _cacheSource) return _cacheCandidates
  _cacheSource = cardsById
  _cacheCandidates = buildCandidates(cardsById)
  return _cacheCandidates
}
```

where `buildCandidates` is the existing derivation extracted into a function (exact same filtering/sorting logic, just moved), and `findMentionedCardIds` calls `candidatesFor(cardsById)` instead of deriving inline.

- [ ] **Step 3: Run tests, lint**

Run: `npm run test -- CardRail` and `npm run test -- cardMentions`
Expected: all PASS unchanged (behavior-identical refactor).
Run: `npm run lint` — no new warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/CardRail.jsx src/lib/cardMentions.js
git commit -m "fix(chat): keep mention scanning off the streaming chunk path"
```

---

### Task 7: Edge function — stream errors, pill tool exclusions, tier-gated pill rules

**Files:**
- Modify: `supabase/functions/chat/index.ts`, `supabase/functions/chat/tier.ts`, `supabase/functions/chat/context.ts`
- Test: `supabase/functions/chat/tier.test.ts` (extend)

**Interfaces:**
- `buildContext` opts gains `tier?: "free" | "pro"`; index.ts passes `tierInfo.tier`.

- [ ] **Step 1: Extend the deno test**

In `supabase/functions/chat/tier.test.ts`, add to the pill-mode expectations (match the file's existing style — it filters a FAKE_TOOLS list; add the two read tools to FAKE_TOOLS if absent):

```ts
Deno.test("pill mode excludes the chat read tools for every tier", () => {
  for (const tier of ["free", "pro"] as const) {
    const names = filterToolsForMode(FAKE_TOOLS, tier, "pill").map((t: any) => t.name)
    if (names.includes("search_cards") || names.includes("summarize_board")) {
      throw new Error(`pill/${tier} leaked read tools: ${names}`)
    }
  }
})
```

Run: `~/.deno/bin/deno test supabase/functions/chat/tier.test.ts` — expect the new test to FAIL.

- [ ] **Step 2: tier.ts fix**

```ts
const PILL_DISALLOWED_TOOLS = [
  "create_board",
  // Chat's read tools: their schemas say "across all their boards", which
  // contradicts the pill's locked single-board scope, and the pill prompt
  // never coaches them — the board snapshot already covers reads.
  "search_cards",
  "summarize_board",
]
```

Re-run the deno test — expect PASS (all tests).

- [ ] **Step 3: context.ts tier gating**

1. Widen the signature: `opts: { boardId?: string; today?: string; mode?: "pill" | "chat"; tier?: "free" | "pro" } = {}` and destructure `const tier = opts.tier || "pro"` (default pro = today's behavior, so an un-migrated caller can't accidentally shrink the prompt).
2. Extract the icon list into a shared constant so both pill rulesets use it — cut the exact text between `## Available icons` and the blank line before `## Always` from the template literal into:

```ts
const ICON_SECTION = `## Available icons (use ONLY these exact names, kebab-case)
house, star, heart, bookmark, tag, flag, target, trophy, gift, briefcase, buildings, user, users, users-three, graduation-cap, code, terminal, bug, cpu, monitor, device-mobile, laptop, database, gear, file-text, folder, clipboard, note, notepad, article, envelope, chat-circle, megaphone, bell, phone, calendar-blank, clock, hourglass, timer, camera, image, credit-card, currency-dollar, money, receipt, shopping-cart, airplane, car, rocket, truck, sun, moon, cloud, lightning, fire, leaf, tree, coffee, fork-knife, cake, pencil-simple, paint-brush, wrench, hammer, toolbox, key, lock, shield, check-circle, warning, sparkle, kanban, list, table, chart-bar, chart-pie, squares-four, columns, presentation, broom, person, hand-grabbing, magnifying-glass, paper-plane-tilt, robot, brain, lightbulb`
```

3. Build the free-pill ruleset (free pill's only tool is create_card — the full write rulebook is ~1,500 dead tokens for it):

```ts
  // Free pill: create_card is the only tool. The pro rulebook's move/update/
  // batch/board/member coaching is dead weight AND teaches the model to
  // roleplay actions it cannot perform — this compact set replaces it.
  const freePillRules = `${ICON_SECTION}

## Always
- Act on clear intent. "Add X and Y" = create both.
- Answer questions about boards, cards, tasks, and notes from the context above. You already have all the data.
- Use create_card immediately when the user asks to add or create tasks. Text alone does nothing.${toolConductRules}
- For card creation: always include title, priority, and icon (from the list above). The card's board is set automatically by the surface you're called from — do not include a "board" field. Add description, labels, checklist, assignee, due_date only when they add value. Do not include an assignee unless the user explicitly names a person — leave cards unassigned by default. Capitalize the first letter of titles.
- Labels are per-board entities. The current labels on each board are listed above under "Labels:". When attaching a label that already exists on a board, pass its exact text — the server matches case-insensitively, so don't worry about casing. Only invent a new label name when none of the existing labels fit the user's intent. Never invent stylistic variants (e.g. /front-end when /frontend exists).
- When you create a new label by passing a previously-unseen text, the server assigns its color deterministically. The labels field in your tool schemas is an array of label text strings.
- Only create the specific card(s) the user mentions.
- Parse natural language dates relative to Today.
- Infer priority from language: "urgent"/"ASAP" = high, "whenever"/"low priority" = low, default = medium.
- Infer labels from content: prefer existing board labels (listed above) over inventing new ones. For boards with no labels yet, infer from content — technical terms suggest /frontend, /backend, /design, /bug, etc.
- Always respond with text alongside tool calls.
- Use markdown: **bold** for names, lists for multiple items.

## Never
- Ask clarifying questions when conversation context makes the answer obvious.
- Use tools for read queries ("show me", "what's on", "how many", "list", "summarize") — answer from context.
- Use emojis.
- Include workspace/board names in card titles when they're just contextual references.
- Claim to move, update, complete, or delete anything, or walk the user through it as if you could — creating cards is the only action available from this surface on the current plan. For those requests, say so plainly in one sentence.`
```

4. In the system prompt template, the pill branch becomes a tier ternary. The current shape is `${chatMode ? chatRulesSection : \`…icon list + Always/Never…\`}`; it becomes `${chatMode ? chatRulesSection : tier === "free" ? freePillRules : proPillRules}` where `proPillRules` is the existing pill template extracted into a const **byte-identical** except its icon section is `${ICON_SECTION}` (which reproduces the same text).
5. In `index.ts`, extend the `buildContext` call at line ~230 with `tier: tierInfo.tier,`.

- [ ] **Step 4: index.ts mid-stream error handling**

In the SSE event switch (after the `message_delta` branch, index.ts:331-333), add:

```ts
            } else if (event.type === "error") {
              // Anthropic mid-stream failure (e.g. overloaded_error). Without
              // this branch the stream ends as a clean "done" with partial
              // text and the client gets no error and no retry path.
              console.error("[chat] anthropic mid-stream error:", JSON.stringify(event.error))
              sse.error(event.error?.message || "Claude stream error")
              return
            }
```

- [ ] **Step 5: Verify**

Run: `~/.deno/bin/deno check supabase/functions/chat/index.ts` — clean.
Run: `~/.deno/bin/deno test supabase/functions/chat/tier.test.ts` — all pass.
Then `git checkout -- deno.lock` if deno touched it.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/chat/index.ts supabase/functions/chat/tier.ts supabase/functions/chat/context.ts supabase/functions/chat/tier.test.ts
git commit -m "fix(ai): surface mid-stream errors, unleak pill read tools, tier-gate pill rules"
```

Deployment (controller does this after the final review): `deploy_edge_function` via the Supabase MCP — expect v51.
