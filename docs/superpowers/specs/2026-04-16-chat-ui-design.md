# Kolumn Chat UI — Design Spec

## Goal

Add an AI chat interface to Kolumn. Users can converse with an AI assistant that understands their boards, cards, and workflow. The chat lives on a dedicated route (`/chat/:id`), launched from the Home page input. Conversations persist in the sidebar under the Chat nav item.

This spec covers **frontend only** — the UI shell, store, message rendering, and mock streaming. Real AI backend (Supabase Edge Function + Claude API) is a separate future spec.

---

## Architecture

- **Route:** `/chat/:id` for active conversations. Home (`/dashboard`) stays as the launcher with the greeting + input + pills + templates.
- **Store:** New `chatStore.js` (Zustand) manages conversations and messages. Persisted to Supabase `chat_conversations` + `chat_messages` tables.
- **Components:** `ChatPage.jsx` (route page), `ChatMessage.jsx` (single message renderer), `ChatInput.jsx` (bottom-pinned input bar), `ChatSidebar.jsx` (conversation list in sidebar).
- **Markdown:** `react-markdown` for AI response rendering (headings, lists, code blocks, tables, links).
- **Rich embeds:** AI messages can include `cardIds` array — rendered as inline `Card.jsx` components below the markdown text.

---

## Data Shape

### Chat Store (`chatStore.js`)

```js
{
  conversations: {
    [id]: {
      id,            // uuid
      title,         // string — AI-generated or first-message truncation
      created_at,    // ISO string
      updated_at,    // ISO string
    }
  },
  messages: {
    [conversationId]: [
      {
        id,            // uuid
        role,          // 'user' | 'assistant'
        text,          // string (markdown for assistant, plain for user)
        cardIds,       // string[] | null — card IDs to embed below text
        created_at,    // ISO string
      }
    ]
  },
  activeConversationId: null,
}
```

### Supabase Tables (migration)

**`chat_conversations`**
- `id` uuid PK
- `user_id` uuid FK → auth.users
- `title` text
- `created_at` timestamptz
- `updated_at` timestamptz

**`chat_messages`**
- `id` uuid PK
- `conversation_id` uuid FK → chat_conversations
- `role` text CHECK ('user', 'assistant')
- `text` text
- `card_ids` jsonb DEFAULT '[]'
- `created_at` timestamptz

RLS: users can only access their own conversations and messages.

---

## Routes

| Path | Component | Description |
|---|---|---|
| `/dashboard` | `DashboardPage` (existing) | Home — greeting, AI input, action pills, templates. Submitting creates a conversation and navigates to `/chat/:id`. |
| `/chat/:id` | `ChatPage` | Active conversation. Messages scroll above, input pinned at bottom. |

### App.jsx changes

Add inside the `<ProtectedRoute>` block:
```jsx
<Route path="chat/:id" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
```

---

## Components

### ChatPage (`src/pages/ChatPage.jsx`)

- Reads `id` from URL params via `useParams()`.
- Loads conversation + messages from `chatStore`.
- Scrolls to bottom on new messages.
- Layout: full-height flex column. Messages area `flex-1 overflow-y-auto`, `ChatInput` at bottom.
- If conversation not found, show "Conversation not found" with link back to Home.

### ChatMessage (`src/components/chat/ChatMessage.jsx`)

**User message:**
- Right-aligned mauve wash (`#E8DDE2`) bubble.
- `border-radius: 18px`, bottom-right `4px`.
- Font: system sans, 14px, `--text-primary` color.
- Max width 75%.

**AI message:**
- Left-aligned, full width, no bubble/background.
- Label: Phosphor Kanban icon (fill, 16px, `#8BA32E`). No text label.
- Body: Clash Grotesk 400, 15px, `--text-secondary` color.
- Bold text: Clash Grotesk 600, `--text-primary` color.
- Rendered via `react-markdown` with custom component overrides for styling.
- If `cardIds` is non-empty, render `Card.jsx` components below the markdown text. Each card pulls from `boardStore.cards[id]`. Clicking navigates to the card's board and opens detail panel.

**Typing indicator (AI thinking):**
- Kanban icon with a broken/glitchy pulse animation (stepped keyframes, not smooth sine).
- Shown while `isStreaming` is true for the conversation.
- No text, just the icon pulsing.

### ChatInput (`src/components/chat/ChatInput.jsx`)

- Reuse the same input design from DashboardPage (rounded-[20px] card, shadow, textarea, Plus button, send/voice toggle).
- Bottom-pinned: `fixed bottom-0` with max-width matching the message area.
- Auto-growing textarea.
- Enter sends (shift+Enter for newline).
- When `input.trim()` is non-empty: dark send button (ArrowUp). Otherwise: voice icon.

### ChatSidebar section (`src/components/layout/Sidebar.jsx` modification)

- Below the existing "Chat" NavLink, render an expandable list of conversations.
- Each row: conversation title (truncated), clicking navigates to `/chat/:id`.
- Sorted by `updated_at` desc (most recent first).
- "New chat" button at the top of the list → navigates to `/dashboard`.
- Collapsed sidebar: only the Chat icon shows, no sub-list.
- Pattern matches existing "Boards" expandable section.

---

## Flows

### New conversation (from Home)

1. User types in the Home page input and presses Enter (or clicks send).
2. `handleSubmit()` creates a new conversation in `chatStore` with a UUID.
3. Adds the user message to that conversation.
4. Navigates to `/chat/:id`.
5. Mock AI response streams in after a short delay (token-by-token reveal).
6. Title is generated: truncate first message to ~40 chars (mock). Real AI-generated title comes later.

### Continue conversation

1. User clicks a conversation in the sidebar → navigates to `/chat/:id`.
2. Messages load from store (and eventually from Supabase on first load).
3. User types and sends → message appended, mock AI responds.

### Action pill click (from Home)

1. Clicking a pill prefills the input with a prompt template.
2. User edits or sends directly.
3. Same flow as new conversation.

---

## Mock Streaming

For the frontend-only phase, AI responses are mocked:

1. User sends a message.
2. After 500ms delay, a typing indicator appears (glitchy Kanban icon pulse).
3. After 1-2s, the indicator is replaced by a canned response.
4. The response text is revealed token-by-token (~30ms per token) to simulate streaming.
5. Mock responses are contextual to the prompt (hardcoded map of prompt patterns → responses).

Mock response examples:
- "Create a card: ..." → "Done — created **{title}** in your **{board}** board." + `cardIds` if a real card was created.
- "Find tasks where ..." → "Here are the matching cards:" + list.
- Default fallback → "I'll be able to help with that once my AI is connected. For now, try creating cards or boards from the templates below!"

---

## Markdown Rendering

Using `react-markdown` with these custom component overrides (all in Clash Grotesk unless specified):

| Element | Style |
|---|---|
| `h3` | 16px, weight 600, `--text-primary`, 16px top margin |
| `strong` | Clash Grotesk 600, `--text-primary` |
| `ul/ol` | 20px left padding, 8px vertical margin |
| `li` | 4px vertical margin |
| `code` (inline) | `--surface-raised` bg, 4px radius, 13px mono |
| `pre` (block) | `--text-primary` bg, light text, 10px radius, 13px mono |
| `table` | Full width, collapse, `--border-default` row borders |
| `th` | Weight 600, `--text-primary` |
| `a` | `#8BA32E` color, underlined |

---

## Card Embeds

When `message.cardIds` is a non-empty array:

1. After the markdown text, render a vertical stack of `Card.jsx` components.
2. Each card is fetched from `useBoardStore((s) => s.cards[id])`.
3. If the card doesn't exist in the store (deleted since), show a muted "Card not found" placeholder.
4. Cards are clickable — same `onClick` behavior as in BoardView: `setActiveBoard(card.board_id)`, navigate to `/boards`, dispatch `kolumn:open-card` event.
5. Cards render at full message width (not constrained to 75% like user bubbles).

---

## Files to Create

| File | Purpose |
|---|---|
| `src/store/chatStore.js` | Zustand store — conversations, messages, CRUD, mock streaming |
| `src/pages/ChatPage.jsx` | Route page — message list + pinned input |
| `src/components/chat/ChatMessage.jsx` | Single message renderer (user bubble / AI minimal + markdown + card embeds) |
| `src/components/chat/ChatInput.jsx` | Bottom-pinned input bar (extracted from DashboardPage pattern) |
| `src/components/chat/TypingIndicator.jsx` | Glitchy Kanban icon pulse animation |
| `src/components/chat/MarkdownRenderer.jsx` | react-markdown wrapper with Kolumn-styled component overrides |

## Files to Modify

| File | Change |
|---|---|
| `src/App.jsx` | Add `/chat/:id` route |
| `src/pages/DashboardPage.jsx` | Wire `handleSubmit` to create conversation + navigate |
| `src/components/layout/Sidebar.jsx` | Add conversation list under Chat nav item |
| `package.json` | Add `react-markdown` + `remark-gfm` dependencies |

---

## Out of Scope

- Real AI backend (Claude API / Supabase Edge Function)
- AI-generated conversation titles (mock with truncation for now)
- Voice input
- File/image attachments in chat
- Chat search
- Conversation deletion
- Mobile-specific chat layout (reflows naturally, no special treatment)
