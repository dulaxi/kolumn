# AI Frontend Wiring Implementation Plan (Plan B of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock streaming with real Claude API calls via the deployed Edge Function. Parse SSE events, stream text into chat messages, and execute tool-call instructions (create_card, move_card, etc.) through existing boardStore actions.

**Architecture:** New `aiClient.js` utility handles the SSE fetch + event parsing. New `toolExecutor.js` maps tool-call actions to boardStore/noteStore methods. `chatStore.sendMessage` replaces `mockRespond` — calls the Edge Function, streams the response, and executes tool calls. ChatPage wires up to the real flow with no changes needed (it already reads from the same store shape).

**Tech Stack:** Supabase auth (JWT for Edge Function auth), fetch + ReadableStream (SSE client), existing Zustand stores.

**Spec:** `docs/superpowers/specs/2026-04-16-ai-capabilities-design.md`

---

## File Structure

**Create:**
- `src/lib/aiClient.js` — SSE fetch client for the chat Edge Function
- `src/lib/toolExecutor.js` — maps tool-call actions to boardStore methods

**Modify:**
- `src/store/chatStore.js` — replace `mockRespond` with `sendMessage` using aiClient
- `src/pages/ChatPage.jsx` — swap `mockRespond` reference to `sendMessage`
- `src/pages/DashboardPage.jsx` — swap `mockRespond` reference to `sendMessage`

---

### Task 1: Create SSE client (`aiClient.js`)

**Files:**
- Create: `src/lib/aiClient.js`

- [ ] **Step 1: Write aiClient**

Create `src/lib/aiClient.js`:

```javascript
import { supabase } from './supabase'
import { env } from './env'

export async function streamChat({ message, history = [] }, { onText, onToolCall, onDone, onError }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    onError('Not authenticated')
    return
  }

  const response = await fetch(`${env.supabaseUrl}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': env.supabaseAnonKey,
    },
    body: JSON.stringify({ message, history }),
  })

  if (!response.ok) {
    const text = await response.text()
    onError(`Error ${response.status}: ${text}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError('No response stream')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue

        try {
          const event = JSON.parse(raw)
          if (event.type === 'text') {
            onText(event.content)
          } else if (event.type === 'tool_call') {
            onToolCall(event.action, event.params)
          } else if (event.type === 'done') {
            onDone()
            return
          } else if (event.type === 'error') {
            onError(event.content)
            return
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
    onDone()
  } catch (err) {
    onError(err.message)
  }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/lib/aiClient.js
git commit -m "feat(ai): add SSE client for chat Edge Function"
```

---

### Task 2: Create tool executor (`toolExecutor.js`)

**Files:**
- Create: `src/lib/toolExecutor.js`

- [ ] **Step 1: Write toolExecutor**

Create `src/lib/toolExecutor.js`:

```javascript
import { useBoardStore } from '../store/boardStore'

function findBoardByName(name) {
  const boards = useBoardStore.getState().boards
  const lower = name.toLowerCase()
  return Object.values(boards).find((b) => b.name.toLowerCase() === lower)
}

function findColumnByName(boardId, name) {
  const columns = useBoardStore.getState().columns
  const lower = name.toLowerCase()
  return Object.values(columns).find(
    (c) => c.board_id === boardId && c.title.toLowerCase() === lower
  )
}

function findCardByTitle(title) {
  const cards = useBoardStore.getState().cards
  const lower = title.toLowerCase()
  return Object.values(cards).find((c) => c.title.toLowerCase() === lower)
}

function firstColumnOf(boardId) {
  const columns = useBoardStore.getState().columns
  return Object.values(columns)
    .filter((c) => c.board_id === boardId)
    .sort((a, b) => a.position - b.position)[0]
}

export async function executeTool(action, params) {
  const store = useBoardStore.getState()

  if (action === 'create_card') {
    const board = params.board ? findBoardByName(params.board) : Object.values(store.boards)[0]
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    const column = params.column
      ? findColumnByName(board.id, params.column)
      : firstColumnOf(board.id)
    if (!column) return { ok: false, error: `Column "${params.column}" not found` }

    const checklist = (params.checklist || []).map((text) => ({ text, done: false }))

    const cardId = await store.addCard(board.id, column.id, {
      title: params.title,
      description: params.description || '',
      priority: params.priority || 'medium',
      icon: params.icon || null,
      labels: params.labels || [],
      checklist,
      assignee_name: params.assignee || null,
      due_date: params.due_date || null,
    })

    return { ok: true, cardId }
  }

  if (action === 'move_card') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }

    const targetBoardId = params.to_board
      ? findBoardByName(params.to_board)?.id
      : card.board_id
    if (!targetBoardId) return { ok: false, error: `Board "${params.to_board}" not found` }

    const column = findColumnByName(targetBoardId, params.to_column)
    if (!column) return { ok: false, error: `Column "${params.to_column}" not found` }

    await store.updateCard(card.id, { column_id: column.id, board_id: targetBoardId })
    return { ok: true }
  }

  if (action === 'update_card') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }

    const updates = { ...params.updates }
    if (updates.checklist) {
      updates.checklist = updates.checklist.map((text) =>
        typeof text === 'string' ? { text, done: false } : text
      )
    }
    if (updates.assignee) {
      updates.assignee_name = updates.assignee
      delete updates.assignee
    }

    await store.updateCard(card.id, updates)
    return { ok: true }
  }

  if (action === 'delete_card') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }
    await store.deleteCard(card.id)
    return { ok: true }
  }

  if (action === 'create_board') {
    const columns = params.columns || ['To Do', 'In Progress', 'Done']
    const boardId = await store.addBoard(params.name, params.icon || null, columns)
    return { ok: true, boardId }
  }

  if (action === 'search_cards' || action === 'summarize_board') {
    return { ok: true, readOnly: true }
  }

  return { ok: false, error: `Unknown action: ${action}` }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/lib/toolExecutor.js
git commit -m "feat(ai): add tool executor mapping Claude actions to boardStore"
```

---

### Task 3: Replace mockRespond with sendMessage in chatStore

**Files:**
- Modify: `src/store/chatStore.js`

- [ ] **Step 1: Replace mockRespond**

In `src/store/chatStore.js`:

Add imports at top:
```javascript
import { streamChat } from '../lib/aiClient'
import { executeTool } from '../lib/toolExecutor'
```

Remove the entire `mockRespond` action (lines 72-109).

Add this `sendMessage` action in its place:

```javascript
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
```

- [ ] **Step 2: Build + tests**

Run: `npm run build && npm test`

Expected: build succeeds. chatStore tests pass (they don't test mockRespond/sendMessage — those are async integration).

Note: the `mockRespond` tests (if any) should be removed or renamed to `sendMessage`. Check `src/__tests__/chatStore.test.js` — the existing 7 tests don't reference mockRespond so they should all pass unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/store/chatStore.js
git commit -m "feat(ai): replace mockRespond with real sendMessage via Edge Function"
```

---

### Task 4: Update ChatPage and DashboardPage references

**Files:**
- Modify: `src/pages/ChatPage.jsx`
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Update ChatPage**

In `src/pages/ChatPage.jsx`, change line 14:

```javascript
// Old:
const mockRespond = useChatStore((s) => s.mockRespond)

// New:
const sendMessage = useChatStore((s) => s.sendMessage)
```

Update `handleSend` (line 36):

```javascript
// Old:
const handleSend = (text) => {
  addMessage(id, { role: 'user', text })
  mockRespond(id, text)
}

// New:
const handleSend = (text) => {
  addMessage(id, { role: 'user', text })
  sendMessage(id, text)
}
```

- [ ] **Step 2: Update DashboardPage**

In `src/pages/DashboardPage.jsx`, find:

```javascript
const mockRespond = useChatStore((s) => s.mockRespond)
```

Replace with:

```javascript
const sendMessage = useChatStore((s) => s.sendMessage)
```

And in `handleSubmit`:

```javascript
// Old:
mockRespond(convId, text)

// New:
sendMessage(convId, text)
```

- [ ] **Step 3: Build + tests**

Run: `npm run build && npm test`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ChatPage.jsx src/pages/DashboardPage.jsx
git commit -m "feat(ai): wire ChatPage and DashboardPage to real sendMessage"
```

---

### Task 5: End-to-end test

- [ ] **Step 1: Build + all tests**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 2: Smoke test in browser**

Start `npm run dev`. Log in to Kolumn.

1. **Home → type "What boards do I have?"** → press Enter → navigates to `/chat/:id`. User message in mauve bubble. After ~1-2s, real Claude response streams in (Clash Grotesk, 15px) with actual board data.

2. **Type "Create a card called Fix login bug with high priority"** → Claude responds with text + a `create_card` tool call. The card appears in your board AND renders inline in the chat via Card.jsx.

3. **Type "Plan my week"** → Claude reads your due dates and activity, gives a real summary with headings and lists.

4. **Check sidebar** → conversation title auto-generated from first message.

5. **Open the board** → the card "Fix login bug" should exist with high priority set.

6. **Error handling** → if the Edge Function is down, the message should show an error in italics, not crash the page.

- [ ] **Step 3: Commit any fixes**

If smoke testing reveals issues, fix and commit.

---

## Self-Review

**Spec coverage:**
- SSE client (fetch + stream parsing) → Task 1 ✓
- Tool executor (action → boardStore) → Task 2 ✓
- Real streaming replaces mock → Task 3 ✓
- ChatPage + DashboardPage wiring → Task 4 ✓
- Conversation history sent to Edge Function → Task 3 (history slice in sendMessage) ✓
- Card embeds via cardIds after tool execution → Task 3 (collectedCardIds) ✓
- Error handling (stream errors shown in chat) → Task 3 (onError) ✓
- Confirmation flow for delete → deferred (requires UI changes in ChatMessage — can be added as follow-up)

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:**
- `streamChat({ message, history }, callbacks)` — consistent between aiClient and chatStore caller
- `executeTool(action, params)` — returns `{ ok, cardId?, error? }` — consistent across all action branches
- `sendMessage(conversationId, userText)` — replaces `mockRespond` with same signature, called identically from ChatPage and DashboardPage

**Note:** Delete confirmation UI is deferred — right now `delete_card` executes immediately via the tool executor. The spec says Claude's tool description tells it to "always ask for confirmation first" (in natural language), but there's no hard UI gate. This can be added as a follow-up task that modifies ChatMessage to render confirm/cancel buttons when a `delete_card` tool call arrives.
