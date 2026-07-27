# Chat Capability Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop-generating (abort plumbing + Stop button + `Stopped` marker), a `get_card` detail tool with due/offset search upgrades, and copy affordances on messages and code blocks.

**Architecture:** An `AbortSignal` threads `chatStore → runChatLoop → streamChat → fetch`; aborts resolve quietly as `{ aborted: true }` (never through `onError`). The read-tool upgrades live in `toolExecutor` (client execution) + the edge function's schemas/prompt (deploy v52). Copy affordances are self-contained stateful buttons in ChatMessage and MarkdownRenderer.

**Tech Stack:** React 19, Zustand, AbortController, Vitest + @testing-library/react, Deno (edge tests), Supabase Edge Functions.

**Spec:** `docs/superpowers/specs/2026-07-26-chat-capability-pass-design.md`

## Global Constraints

- Abort is QUIET: `onError` is never called for `AbortError`; `streamChat` resolves via `onDone({ stopReason: 'aborted' })`; `runChatLoop` returns `{ ..., aborted: true, error: null }`.
- Stop keeps ALL partial text and stamps the assistant message `stopped: true`; no error state, no Retry. `generateTitle` still runs after a stop iff `fullText.trim()` is non-empty.
- Only the Stop button and `deleteConversation` abort. Navigation does NOT.
- Stop button: replaces the send button while `busy && onStop` — primary `Button size="icon-sm"`, Phosphor `Stop size={14} weight="fill"`, `aria-label="Stop generating"`.
- `Stopped` marker: mono 12px `var(--text-muted)`, the exact word `Stopped`.
- `get_card`: `{ card_title (required), board? }`; exact-title (case-insensitive) matches beat substring matches; >1 match → `{ ambiguous: true, candidates: [...] }` (cap 10), never guess; none → `{ found: false }`; found → full untruncated description + checklist item texts. Chat mode only — must be in `CHAT_READ_TOOLS` AND `PILL_DISALLOWED_TOOLS`.
- `search_cards`: `due: 'overdue' | 'today' | 'week' | 'none'` with the rail's local-midnight bucket math ('week' = due after today through today+7); completed cards never match `overdue`; `query` becomes optional when `due` is given; `offset` (default 0) applied after ranking before the 20 cap; response gains `offset`.
- Copy buttons: raw `message.text` markdown / code block text via `navigator.clipboard.writeText`, no fallback; swap to `Check` (lime `--color-lime-dark`) for 1500ms; hover-reveal (`opacity-0 group-hover:opacity-100 focus-visible:opacity-100`); hidden while the message is streaming (`busy` prop), empty, or errored.
- Pro/pill prompts untouched; only `chatRulesSection` in context.ts changes. Deploy v52 AFTER final review (controller does it).
- Icons Phosphor only; colors via tokens; commits use `feat(chat)` / `feat(ai)` scopes as given.

---

### Task 1: Abort plumbing — aiClient + chatAgentLoop

**Files:**
- Modify: `src/lib/aiClient.js`, `src/lib/chatAgentLoop.js`
- Test: `src/__tests__/aiClientAbort.test.js` (new), `src/__tests__/chatLoopAbort.test.js` (new)

**Interfaces:**
- Produces: `streamChat(payload, callbacks, { signal } = {})`; `runChatLoop(input, callbacks, { signal } = {}) -> { fullText, toolCardIds, error, errorCode, aborted }`. Task 2 consumes both.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/aiClientAbort.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) } },
}))
vi.mock('../lib/env', () => ({ env: { supabaseUrl: 'http://test', supabaseAnonKey: 'anon' } }))

import { streamChat } from '../lib/aiClient'

describe('streamChat abort', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  test('fetch AbortError resolves via onDone(aborted), not onError', async () => {
    const err = new Error('The user aborted a request.')
    err.name = 'AbortError'
    global.fetch.mockRejectedValue(err)
    const onDone = vi.fn()
    const onError = vi.fn()
    await streamChat(
      { message: 'hi', mode: 'chat' },
      { onText: vi.fn(), onDone, onError },
      { signal: new AbortController().signal },
    )
    expect(onDone).toHaveBeenCalledWith({ stopReason: 'aborted' })
    expect(onError).not.toHaveBeenCalled()
  })

  test('the signal is passed through to fetch', async () => {
    const controller = new AbortController()
    global.fetch.mockResolvedValue({ ok: true, body: null })
    await streamChat(
      { message: 'hi', mode: 'chat' },
      { onText: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
      { signal: controller.signal },
    )
    expect(global.fetch.mock.calls[0][1].signal).toBe(controller.signal)
  })
})
```

Create `src/__tests__/chatLoopAbort.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { runChatLoop } from '../lib/chatAgentLoop'
import { streamChat } from '../lib/aiClient'
import { executeTool } from '../lib/toolExecutor'

vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn() }))
vi.mock('../lib/toolExecutor', () => ({ executeTool: vi.fn() }))

describe('runChatLoop abort', () => {
  beforeEach(() => {
    streamChat.mockReset()
    executeTool.mockReset()
  })

  test('aborted stream returns aborted:true with partial text and no error', async () => {
    streamChat.mockImplementation(async (_payload, cbs) => {
      cbs.onText('partial ')
      cbs.onDone({ stopReason: 'aborted' })
    })
    const controller = new AbortController()
    const res = await runChatLoop({ text: 'q' }, {}, { signal: controller.signal })
    expect(res.aborted).toBe(true)
    expect(res.fullText).toBe('partial ')
    expect(res.error).toBeNull()
    expect(streamChat).toHaveBeenCalledTimes(1)
  })

  test('abort landing during tool execution stops before the continuation round', async () => {
    const controller = new AbortController()
    executeTool.mockImplementation(async () => {
      controller.abort()
      return { ok: true, cards: [] }
    })
    streamChat.mockImplementation(async (_payload, cbs) => {
      cbs.onToolCall({ id: 't1', action: 'search_cards', params: {} })
      cbs.onDone({ stopReason: 'tool_use' })
    })
    const res = await runChatLoop({ text: 'q' }, {}, { signal: controller.signal })
    expect(res.aborted).toBe(true)
    expect(streamChat).toHaveBeenCalledTimes(1)
  })

  test('the signal is forwarded to every streamChat call', async () => {
    streamChat.mockImplementation(async (_p, cbs) => cbs.onDone({ stopReason: null }))
    const controller = new AbortController()
    const res = await runChatLoop({ text: 'q' }, {}, { signal: controller.signal })
    expect(streamChat.mock.calls[0][2]).toEqual({ signal: controller.signal })
    expect(res.aborted).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- aiClientAbort` and `npm run test -- chatLoopAbort`
Expected: FAIL (no third parameter; `aborted` undefined).

- [ ] **Step 3: Implement `aiClient.js`**

Signature: `export async function streamChat({ message, history = [], mode, boardId, today }, { onText, onToolCall, onDone, onError, onTier }, { signal } = {})`.

Fetch options gain `signal,` (after `body: JSON.stringify(body),`). The fetch catch becomes:

```js
  } catch (err) {
    // A deliberate abort is a quiet exit — the caller stopped the stream.
    if (err.name === 'AbortError') {
      onDone?.({ stopReason: 'aborted' })
      return
    }
    logError('[aiClient] request failed', err)
    onError(err.message, undefined)
    return
  }
```

The reader-loop catch (currently `catch (err) { onError(err.message) }`) becomes:

```js
  } catch (err) {
    if (err.name === 'AbortError') {
      onDone({ stopReason: 'aborted' })
      return
    }
    onError(err.message)
  }
```

- [ ] **Step 4: Implement `chatAgentLoop.js`**

Signature: `export async function runChatLoop({ text, history = [], today }, { onText, onActivity, onTier } = {}, { signal } = {})`. The `streamChat(...)` call gains a third argument `{ signal }`. Directly after the `await new Promise(...)` block (before `if (streamErr)`), add:

```js
    // Abort is quiet: keep whatever streamed, report nothing as an error.
    if (stopReason === 'aborted' || signal?.aborted) {
      return { fullText, toolCardIds: [...toolCardIds], error: null, errorCode: null, aborted: true }
    }
```

After the tool-execution `for` loop (before the round-limit note block), add:

```js
    if (signal?.aborted) {
      return { fullText, toolCardIds: [...toolCardIds], error: null, errorCode: null, aborted: true }
    }
```

The final return becomes:

```js
  return { fullText, toolCardIds: [...toolCardIds], error, errorCode, aborted: false }
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- aiClientAbort`, `npm run test -- chatLoopAbort`, then `npm run test -- chat` (wider net: chatStore*, chatAgentLoop, chatExchanges suites must stay green — `runChatLoop`'s existing callers ignore the new field).
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/aiClient.js src/lib/chatAgentLoop.js src/__tests__/aiClientAbort.test.js src/__tests__/chatLoopAbort.test.js
git commit -m "feat(chat): abort plumbing through the stream client and chat loop"
```

---

### Task 2: chatStore — stopStreaming + stopped stamping

**Files:**
- Modify: `src/store/chatStore.js`
- Test: `src/__tests__/chatStoreStop.test.js` (new)

**Interfaces:**
- Consumes: `runChatLoop(input, callbacks, { signal })` (Task 1).
- Produces: `stopStreaming(conversationId)`; assistant messages gain optional `stopped: true`. Task 3 wires the UI.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStoreStop.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from '../store/chatStore'
import { runChatLoop } from '../lib/chatAgentLoop'

vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))
vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn().mockResolvedValue(undefined) }))

describe('stopStreaming', () => {
  beforeEach(() => {
    useChatStore.setState({ conversations: {}, messages: {}, streaming: {} })
    runChatLoop.mockReset()
  })

  const mockAbortableLoop = () =>
    runChatLoop.mockImplementation((_input, cbs, opts) => {
      cbs.onText('partial answer')
      return new Promise((resolve) => {
        opts.signal.addEventListener('abort', () =>
          resolve({ toolCardIds: [], error: null, errorCode: null, aborted: true }),
        )
      })
    })

  test('stop keeps partial text, stamps stopped, clears the flag, no error', async () => {
    mockAbortableLoop()
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'long question' })
    const p = useChatStore.getState().sendMessage(id, 'long question')
    expect(useChatStore.getState().streaming[id]).toBe(true)
    useChatStore.getState().stopStreaming(id)
    await p
    const reply = useChatStore.getState().messages[id].at(-1)
    expect(reply.text).toBe('partial answer')
    expect(reply.stopped).toBe(true)
    expect(reply.error).toBeUndefined()
    expect(useChatStore.getState().streaming[id]).toBeUndefined()
  })

  test('deleteConversation aborts the in-flight stream', async () => {
    let sawAbort = false
    runChatLoop.mockImplementation((_input, _cbs, opts) =>
      new Promise((resolve) => {
        opts.signal.addEventListener('abort', () => {
          sawAbort = true
          resolve({ toolCardIds: [], error: null, errorCode: null, aborted: true })
        })
      }),
    )
    const id = useChatStore.getState().createConversation()
    const p = useChatStore.getState().sendMessage(id, 'q')
    useChatStore.getState().deleteConversation(id)
    await p
    expect(sawAbort).toBe(true)
    expect(useChatStore.getState().streaming[id]).toBeUndefined()
  })

  test('stopStreaming on an idle conversation is a no-op', () => {
    expect(() => useChatStore.getState().stopStreaming('nope')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- chatStoreStop`
Expected: FAIL (`stopStreaming` is not a function; loop invoked without opts).

- [ ] **Step 3: Implement**

In `src/store/chatStore.js`, add near the other module-level state (after the `debouncedStorage` block):

```js
// One in-flight stream per conversation; Stop and delete abort through here.
const abortControllers = new Map()
```

Change `deleteConversation` to abort first (keep the existing set body EXACTLY as is, just wrapped):

```js
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
```

Add after `clearStreaming`:

```js
  // Abort the conversation's in-flight stream (no-op when idle). The loop
  // resolves `aborted: true`; sendMessage keeps the partial text and stamps
  // the message `stopped`.
  stopStreaming: (conversationId) => {
    abortControllers.get(conversationId)?.abort()
  },
```

In `sendMessage`: after `get().setStreaming(conversationId)` add:

```js
    const controller = new AbortController()
    abortControllers.set(conversationId, controller)
```

The `runChatLoop` call gains a third argument `{ signal: controller.signal }`, and its destructure gains `aborted`:

```js
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
```

Between the `mentionedCardIds` computation and the `if (error)` block, add:

```js
    if (aborted) {
      // User-initiated stop: keep everything that streamed, no error state.
      patchMsg({ stopped: true, mentionedCardIds })
      get().clearStreaming(conversationId)
      if (fullText.trim()) get().generateTitle(conversationId).catch(() => {})
      return
    }
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- chatStoreStop`, then `npm run test -- chatStore` (all chatStore suites green).
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/chatStore.js src/__tests__/chatStoreStop.test.js
git commit -m "feat(chat): stopStreaming action — abort keeps partial text as stopped"
```

---

### Task 3: Stop button + Stopped marker (UI)

**Files:**
- Modify: `src/components/chat/ChatInput.jsx`, `src/pages/ChatPage.jsx`, `src/components/chat/ChatMessage.jsx`
- Test: `src/__tests__/ChatInputBusy.test.jsx` (append), `src/__tests__/ChatMessageStopped.test.jsx` (new)

**Interfaces:**
- Consumes: `stopStreaming` (Task 2).
- Produces: `ChatInput` gains `onStop`; `ChatMessage` gains `busy` prop (message currently streaming) — Task 4 reuses `busy` to hide the copy button.

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('ChatInput', ...)` in `src/__tests__/ChatInputBusy.test.jsx`:

```jsx
  test('busy with onStop swaps the send button for Stop', () => {
    const onStop = vi.fn()
    render(<ChatInput onSend={vi.fn()} busy onStop={onStop} />)
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stop generating' }))
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  test('busy without onStop keeps the disabled send button', () => {
    render(<ChatInput onSend={vi.fn()} busy />)
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Stop generating' })).not.toBeInTheDocument()
  })
```

Create `src/__tests__/ChatMessageStopped.test.jsx`:

```jsx
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatMessage from '../components/chat/ChatMessage'

const renderMsg = (message) =>
  render(<MemoryRouter><ChatMessage message={message} /></MemoryRouter>)

describe('ChatMessage stopped marker', () => {
  test('a stopped message shows the muted Stopped note', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: 'partial reply', stopped: true })
    expect(screen.getByText('Stopped')).toBeInTheDocument()
  })

  test('normal messages show no marker', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: 'full reply' })
    expect(screen.queryByText('Stopped')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- ChatInputBusy` and `npm run test -- ChatMessageStopped`
Expected: new tests FAIL.

- [ ] **Step 3: Implement**

`ChatInput.jsx`: import becomes `import { ArrowUp, Stop } from '@phosphor-icons/react'`; signature gains `onStop` (`export default function ChatInput({ onSend, onStop, autoFocus = false, docked = true, busy = false })`); the send-button slot becomes:

```jsx
          {busy && onStop ? (
            <Button size="icon-sm" onClick={onStop} aria-label="Stop generating">
              <Stop size={14} weight="fill" />
            </Button>
          ) : (
            <Button size="icon-sm" onClick={handleSubmit} disabled={!input.trim() || busy} aria-label="Send message">
              <ArrowUp className="w-4 h-4" weight="bold" />
            </Button>
          )}
```

`ChatPage.jsx`: add `const stopStreaming = useChatStore((s) => s.stopStreaming)` after the `retryMessage` selector; the composer line becomes:

```jsx
        <ChatInput onSend={handleSend} onStop={() => stopStreaming(id)} autoFocus docked={false} busy={streaming} />
```

and the replies map passes `busy`:

```jsx
              {exchange.replies.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  busy={i === 0 && streaming}
                  onRetry={msg.error && !msg.error.isLimit ? () => retryMessage(id, msg.id) : undefined}
                />
              ))}
```

`ChatMessage.jsx`: signature becomes `export default function ChatMessage({ message, onRetry, busy })`; directly after the closing `</div>` of the text/segments block (before the error notice), add:

```jsx
      {message.stopped && (
        <div className="mt-2 font-mono text-xs text-[var(--text-muted)]">Stopped</div>
      )}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- ChatInputBusy`, `npm run test -- ChatMessage` (Stopped + Retry + Activities suites).
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatInput.jsx src/pages/ChatPage.jsx src/components/chat/ChatMessage.jsx src/__tests__/ChatInputBusy.test.jsx src/__tests__/ChatMessageStopped.test.jsx
git commit -m "feat(chat): Stop button while streaming + Stopped marker"
```

---

### Task 4: Copy affordances

**Files:**
- Modify: `src/components/chat/ChatMessage.jsx`, `src/components/chat/MarkdownRenderer.jsx`
- Test: `src/__tests__/ChatMessageCopy.test.jsx` (new), `src/__tests__/MarkdownCopy.test.jsx` (new)

**Interfaces:**
- Consumes: `busy` prop on ChatMessage (Task 3).

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/ChatMessageCopy.test.jsx`:

```jsx
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatMessage from '../components/chat/ChatMessage'

const renderMsg = (message, props = {}) =>
  render(<MemoryRouter><ChatMessage message={message} {...props} /></MemoryRouter>)

describe('ChatMessage copy', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  test('copies the raw markdown of an assistant message', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: '**bold** reply' })
    fireEvent.click(screen.getByRole('button', { name: 'Copy message' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('**bold** reply')
  })

  test('hidden while the message is streaming (busy)', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: 'partial' }, { busy: true })
    expect(screen.queryByRole('button', { name: 'Copy message' })).not.toBeInTheDocument()
  })

  test('hidden for empty and errored messages', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: '' })
    expect(screen.queryByRole('button', { name: 'Copy message' })).not.toBeInTheDocument()
    renderMsg({ id: 'm2', role: 'assistant', text: 'x', error: { message: 'snag', isLimit: false } })
    expect(screen.queryByRole('button', { name: 'Copy message' })).not.toBeInTheDocument()
  })

  test('user messages get no copy button', () => {
    renderMsg({ id: 'm1', role: 'user', text: 'question' })
    expect(screen.queryByRole('button', { name: 'Copy message' })).not.toBeInTheDocument()
  })
})
```

Create `src/__tests__/MarkdownCopy.test.jsx`:

```jsx
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownRenderer from '../components/chat/MarkdownRenderer'

describe('MarkdownRenderer code copy', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  test('fenced blocks get a copy button that copies the code text', () => {
    render(<MarkdownRenderer content={'```\nconst x = 1\n```'} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('const x = 1'))
  })

  test('inline code gets no button', () => {
    render(<MarkdownRenderer content={'use `npm test` here'} />)
    expect(screen.queryByRole('button', { name: 'Copy code' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- ChatMessageCopy` and `npm run test -- MarkdownCopy`
Expected: FAIL (no buttons).

- [ ] **Step 3: Implement ChatMessage**

Imports gain `import { useEffect, useRef, useState } from 'react'` and extend the Phosphor import to `import { Check, Copy, MagnifyingGlass } from '@phosphor-icons/react'`. Add above the default export:

```jsx
// Hover-reveal copy for an assistant message; copies the raw markdown.
function CopyMessageButton({ text }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = () => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy message"
      className="mt-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--surface-raised)] hover:text-[var(--text-secondary)] focus-visible:opacity-100 group-hover:opacity-100"
    >
      {copied ? (
        <Check size={14} weight="bold" className="text-[var(--color-lime-dark)]" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  )
}
```

The assistant root div gains the `group` class (`className="mb-5 pl-1 group"`), and directly after the `Stopped` marker block (before the error notice) add:

```jsx
      {message.text && !message.error && !busy && <CopyMessageButton text={message.text} />}
```

- [ ] **Step 4: Implement MarkdownRenderer**

Add imports `import { useEffect, useRef, useState } from 'react'` and `import { Check, Copy } from '@phosphor-icons/react'`. Above `components`, add:

```jsx
// Flattens a react-markdown children tree back to plain text for copying.
function nodeText(node) {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (node.props?.children) return nodeText(node.props.children)
  return ''
}

function CodeCopyButton({ getText }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = () => {
    navigator.clipboard?.writeText(getText())
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy code"
      className="absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--text-secondary)] focus-visible:opacity-100 group-hover/code:opacity-100"
    >
      {copied ? (
        <Check size={12} weight="bold" className="text-[var(--color-lime-dark)]" />
      ) : (
        <Copy size={12} />
      )}
    </button>
  )
}
```

The `code` component's non-inline branch becomes (note `my-3` moves from the `pre` to the wrapper):

```jsx
    return (
      <div className="relative group/code my-3">
        <CodeCopyButton getText={() => nodeText(children)} />
        <pre className="bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] px-4 py-3.5 rounded-[10px] text-[13px] font-mono leading-relaxed overflow-x-auto">
          <code className={className}>{children}</code>
        </pre>
      </div>
    )
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- ChatMessage` and `npm run test -- MarkdownCopy`.
Expected: PASS (all ChatMessage suites incl. Activities/Retry/Stopped stay green).

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/ChatMessage.jsx src/components/chat/MarkdownRenderer.jsx src/__tests__/ChatMessageCopy.test.jsx src/__tests__/MarkdownCopy.test.jsx
git commit -m "feat(chat): copy buttons on assistant messages and code blocks"
```

---

### Task 5: Executor — get_card + search due/offset (+ loop chips)

**Files:**
- Modify: `src/lib/toolExecutor.js` (read-tools region, `search_cards` at ~line 1201), `src/lib/chatAgentLoop.js` (`describeActivity` + card-id collection)
- Test: `src/__tests__/chatGetCard.test.js` (new)

**Interfaces:**
- Produces: `executeTool('get_card', { card_title, board? })` and the extended `search_cards`. Task 6 ships the matching schemas.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatGetCard.test.js`:

```js
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { executeTool } from '../lib/toolExecutor'
import { useBoardStore } from '../store/boardStore'

const seed = () => {
  useBoardStore.setState({
    boards: { b1: { id: 'b1', name: 'Launch' }, b2: { id: 'b2', name: 'Backlog' } },
    columns: { col1: { id: 'col1', board_id: 'b1', title: 'To do', position: 0 } },
    cards: {
      c1: {
        id: 'c1', board_id: 'b1', column_id: 'col1', title: 'Fix header',
        description: 'A long untruncated description of the header fix work.',
        checklist: [{ text: 'step one', done: true }, { text: 'step two', done: false }],
        due_date: '2026-07-10', updated_at: '2026-07-20',
      },
      c2: { id: 'c2', board_id: 'b2', column_id: 'col1', title: 'Fix header', updated_at: '2026-07-19' },
      c3: { id: 'c3', board_id: 'b1', column_id: 'col1', title: 'Ship page', due_date: '2026-07-15', updated_at: '2026-07-18' },
      c4: { id: 'c4', board_id: 'b1', column_id: 'col1', title: 'Later thing', due_date: '2026-07-22', updated_at: '2026-07-17' },
      c5: { id: 'c5', board_id: 'b1', column_id: 'col1', title: 'No due', updated_at: '2026-07-16' },
      c6: { id: 'c6', board_id: 'b1', column_id: 'col1', title: 'Done old', due_date: '2026-07-01', completed: true, updated_at: '2026-07-15' },
    },
    labels: {},
    cardLabels: {},
    _tempIdMap: {},
  })
}

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0)) // July 15 2026, local noon
})
afterAll(() => vi.useRealTimers())
beforeEach(seed)

describe('get_card', () => {
  test('ambiguous titles return candidates, never a guess', async () => {
    const res = await executeTool('get_card', { card_title: 'Fix header' })
    expect(res.ok).toBe(true)
    expect(res.ambiguous).toBe(true)
    expect(res.candidates).toHaveLength(2)
    expect(res.candidates[0]).toEqual({ title: 'Fix header', board: 'Launch', column: 'To do' })
  })

  test('board scoping disambiguates and returns full detail', async () => {
    const res = await executeTool('get_card', { card_title: 'Fix header', board: 'Launch' })
    expect(res.ok).toBe(true)
    expect(res.found).toBe(true)
    expect(res.card.description).toBe('A long untruncated description of the header fix work.')
    expect(res.card.checklist).toEqual([
      { text: 'step one', done: true },
      { text: 'step two', done: false },
    ])
    expect(res.card.board).toBe('Launch')
  })

  test('no match reports found:false', async () => {
    const res = await executeTool('get_card', { card_title: 'Nonexistent' })
    expect(res).toEqual({ ok: true, found: false })
  })

  test('exact title match beats substring matches', async () => {
    useBoardStore.setState((s) => ({
      cards: { ...s.cards, c7: { id: 'c7', board_id: 'b1', column_id: 'col1', title: 'Ship', updated_at: '2026-07-14' } },
    }))
    const res = await executeTool('get_card', { card_title: 'Ship' })
    expect(res.found).toBe(true)
    expect(res.card.id).toBe('c7')
  })
})

describe('search_cards due/offset', () => {
  test('due-only queries work without text', async () => {
    const res = await executeTool('search_cards', { due: 'overdue' })
    expect(res.ok).toBe(true)
    expect(res.cards.map((c) => c.id)).toEqual(['c1'])
  })

  test('completed cards never match overdue even when included', async () => {
    const res = await executeTool('search_cards', { due: 'overdue', include_completed: true })
    expect(res.cards.map((c) => c.id)).toEqual(['c1'])
  })

  test('today / week / none buckets', async () => {
    expect((await executeTool('search_cards', { due: 'today' })).cards.map((c) => c.id)).toEqual(['c3'])
    expect((await executeTool('search_cards', { due: 'week' })).cards.map((c) => c.id)).toEqual(['c4'])
    expect((await executeTool('search_cards', { due: 'none' })).cards.map((c) => c.id)).toEqual(['c5'])
  })

  test('offset pages past ranked results and is echoed', async () => {
    const res = await executeTool('search_cards', { query: 'fix header', offset: 1 })
    expect(res.total).toBe(2)
    expect(res.offset).toBe(1)
    expect(res.count).toBe(1)
    expect(res.cards[0].id).toBe('c2')
  })

  test('neither query nor due is an error', async () => {
    const res = await executeTool('search_cards', {})
    expect(res.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- chatGetCard`
Expected: FAIL (unknown tool get_card; due/offset unsupported).

- [ ] **Step 3: Implement in `toolExecutor.js`**

Replace the opening of the `search_cards` branch (query validation + match loop + slice) with:

```js
  if (action === 'search_cards') {
    const query = String(params.query || '').trim().toLowerCase()
    const due = params.due || null
    if (!query && !due) return { ok: false, error: 'query or due is required' }
    let boardFilter = null
    if (params.board) {
      boardFilter = findBoardByName(params.board)
      if (!boardFilter) return { ok: false, error: `Board "${params.board}" not found` }
    }
    // Local-midnight due buckets — same math as the card rail's grouping.
    const dueBucketOf = (card) => {
      if (!card.due_date) return 'none'
      const d = parseDueDate(card.due_date)
      if (!d || Number.isNaN(d.getTime())) return 'none'
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8)
      if (d < todayStart) return 'overdue'
      if (d < tomorrowStart) return 'today'
      if (d < weekEnd) return 'week'
      return 'later'
    }
    const matches = []
    for (const card of Object.values(store.cards)) {
      if (card.archived) continue
      if (boardFilter && card.board_id !== boardFilter.id) continue
      if (card.completed && !params.include_completed) continue
      if (due) {
        // A completed card is never "overdue" — mirrors summarize_board.
        if (due === 'overdue' && card.completed) continue
        if (dueBucketOf(card) !== due) continue
      }
      const labels = getCardLabelTexts(store, card.id)
      let primary = false
      if (query) {
        // Tier 1: title or label (a label query is exact intent, not an
        // incidental text hit). Tier 2: description / assignee names.
        primary = (card.title || '').toLowerCase().includes(query)
          || labels.some((t) => t.toLowerCase().includes(query))
        const secondary = (card.description || '').toLowerCase().includes(query)
          || (card.assignees || []).join(' ').toLowerCase().includes(query)
        if (!primary && !secondary) continue
      }
      matches.push({ card, labels, primary })
    }
    matches.sort((a, b) =>
      (b.primary === true) - (a.primary === true)
      || String(b.card.updated_at || '').localeCompare(String(a.card.updated_at || ''))
    )
    const offset = Math.max(0, Number(params.offset) || 0)
    const cards = matches.slice(offset, offset + 20).map(({ card, labels }) => ({
```

(The mapping object body and its fields stay EXACTLY as they are today.) The return becomes:

```js
    return { ok: true, count: cards.length, total: matches.length, offset, cards }
```

Add the `get_card` branch directly after the `search_cards` branch:

```js
  if (action === 'get_card') {
    const title = String(params.card_title || '').trim()
    if (!title) return { ok: false, error: 'card_title is required' }
    let boardFilter = null
    if (params.board) {
      boardFilter = findBoardByName(params.board)
      if (!boardFilter) return { ok: false, error: `Board "${params.board}" not found` }
    }
    const lower = title.toLowerCase()
    const pool = Object.values(store.cards).filter((c) =>
      !c.archived && (!boardFilter || c.board_id === boardFilter.id))
    // Exact (case-insensitive) matches beat substring matches; ambiguity is
    // surfaced, never guessed away.
    let found = pool.filter((c) => (c.title || '').toLowerCase() === lower)
    if (found.length === 0) {
      found = pool.filter((c) => (c.title || '').toLowerCase().includes(lower))
    }
    if (found.length === 0) return { ok: true, found: false }
    if (found.length > 1) {
      return {
        ok: true,
        ambiguous: true,
        candidates: found.slice(0, 10).map((c) => ({
          title: c.title,
          board: store.boards[c.board_id]?.name || null,
          column: store.columns[c.column_id]?.title || null,
        })),
      }
    }
    const c = found[0]
    return {
      ok: true,
      found: true,
      card: {
        id: c.id,
        title: c.title,
        board: store.boards[c.board_id]?.name || null,
        column: store.columns[c.column_id]?.title || null,
        priority: c.priority || null,
        due_date: c.due_date || null,
        completed: !!c.completed,
        task_number: c.task_number ?? null,
        labels: getCardLabelTexts(store, c.id),
        assignees: c.assignees || [],
        ...(Array.isArray(c.checklist) && c.checklist.length > 0
          ? { checklist: c.checklist.map((i) => ({ text: i.text, done: !!i.done })) }
          : {}),
        ...((c.description || '').trim() ? { description: c.description.trim() } : {}),
        created_at: c.created_at || null,
        updated_at: c.updated_at || null,
      },
    }
  }
```

- [ ] **Step 4: Wire chips + rail ids in `chatAgentLoop.js`**

In `describeActivity`, add before the fallback return:

```js
  if (action === 'get_card') {
    if (!result?.ok) return { icon: 'search', label: 'Card lookup failed' }
    if (result.ambiguous) return { icon: 'search', label: `Looked up card · ${result.candidates.length} matches` }
    if (result.found === false) return { icon: 'search', label: 'Card not found' }
    return { icon: 'search', label: `Looked up ${result.card.title}` }
  }
```

In the tool-result collection (next to the `result.cards` / `result.columns` blocks), add:

```js
      if (result?.ok && result.card?.id) toolCardIds.add(result.card.id)
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- chatGetCard`, then `npm run test -- chatReadTools` (existing search/summarize suite must stay green — the only observable change is the added `offset: 0` field, which its assertions don't pin; if one does, extend that assertion with `offset: 0` rather than weakening it).
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/toolExecutor.js src/lib/chatAgentLoop.js src/__tests__/chatGetCard.test.js
git commit -m "feat(chat): get_card executor + due/offset search filters"
```

---

### Task 6: Edge — schemas, allowlists, prompt bullets

**Files:**
- Modify: `supabase/functions/chat/tools.ts`, `supabase/functions/chat/tier.ts`, `supabase/functions/chat/context.ts`
- Test: `supabase/functions/chat/tier.test.ts` (extend)

**Interfaces:**
- Consumes: executor behavior from Task 5 (schemas must match `card_title`/`board`/`due`/`offset` exactly).

- [ ] **Step 1: Extend the deno tests**

In `supabase/functions/chat/tier.test.ts`:
1. In the "chat mode gets exactly the read tools" test, `withRead` gains `{ name: "get_card" }` and both expected arrays become `["search_cards", "summarize_board", "get_card"]`.
2. In the "pill mode excludes the chat read tools" test, `withRead` gains `{ name: "get_card" }` and the leak check adds `|| names.includes("get_card")`.

Run: `~/.deno/bin/deno test supabase/functions/chat/tier.test.ts` — expect the chat test to FAIL (get_card not yet in CHAT_READ_TOOLS).

- [ ] **Step 2: tools.ts**

Add after the `summarize_board` entry:

```ts
  {
    name: "get_card",
    description: "Read-only: full detail for ONE card — complete description, checklist items with done flags, labels, assignees, priority, due date, board and column. Use it after identifying the card. If multiple cards share the title, candidates are returned instead — call again with the board name to disambiguate. Never modifies anything.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to fetch (case-insensitive; exact match preferred)" },
        board: { type: "string", description: "Optional: board name to disambiguate duplicate titles" },
      },
      required: ["card_title"],
    },
  },
```

Update the `search_cards` entry: description gains the sentence `Returns at most 20 ranked matches plus the true total; page with offset.`; properties gain:

```ts
        due: { type: "string", enum: ["overdue", "today", "week", "none"], description: "Optional: only cards in this due-date bucket ('week' = due within the next 7 days, 'none' = no due date). query is optional when due is given." },
        offset: { type: "integer", description: "Optional: skip this many ranked results (default 0) — use to page when total exceeds the returned count" },
```

and `required: ["query"]` becomes `required: []`.

`CHAT_READ_TOOLS` becomes `["search_cards", "summarize_board", "get_card"]`.

- [ ] **Step 3: tier.ts**

`PILL_DISALLOWED_TOOLS` gains `"get_card",` after `"summarize_board",` (same comment covers it).

Run: `~/.deno/bin/deno test supabase/functions/chat/tier.test.ts` — expect all PASS.

- [ ] **Step 4: context.ts prompt bullets**

In `chatRulesSection`'s `## Tools (read-only)` block, after the `- Use summarize_board for ...` bullet, insert:

```
- get_card: full detail for one card — complete description, checklist items, labels, assignees. Use it for "what is <card> about?", checklist status, or anything search's 160-char snippet can't answer.
- search_cards can filter by due bucket (due: overdue | today | week | none — query optional then) and page with offset when total exceeds the returned count.
```

(These lines are inside the template literal — plain text, matching the surrounding bullet style. The pill branches are untouched.)

- [ ] **Step 5: Verify**

Run: `~/.deno/bin/deno check supabase/functions/chat/index.ts` — clean.
Run: `~/.deno/bin/deno test supabase/functions/chat/tier.test.ts` — all pass.
Then `git checkout -- deno.lock` if modified. Also run `npm run test` + `npm run lint` (client unaffected but confirm).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/chat/tools.ts supabase/functions/chat/tier.ts supabase/functions/chat/context.ts supabase/functions/chat/tier.test.ts
git commit -m "feat(ai): get_card schema + due/offset search params for chat"
```

Deployment (controller, after final review): `deploy_edge_function` via Supabase MCP — expect v52.
