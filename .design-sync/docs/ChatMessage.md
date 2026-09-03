---
category: Chat
---

ChatMessage — one chat turn. User messages are right-aligned mauve-wash bubbles; assistant messages are full-width serif-ish text (Clash Grotesk 16px) with markdown rendering, optional activity chips, and an error state.

## Props

- `message`:
  - `role`: `'user' | 'assistant'`
  - `text`: string — user: plain; assistant: markdown (GFM)
  - `activities`: `[{ atChar, label, icon }]` — mono chips split into the text at `atChar` (tool/search activity)
  - `cardIds`: string[] — cards to embed as a rail under the message (resolved via the board store)
  - `error`: `{ message, isLimit? }` — renders an InlineNotice with Retry (unless a limit error)
  - `stopped`: bool — "Stopped" marker
- `onRetry`: retry handler for errored messages. `busy`: stream in progress (hides the copy button).

## Usage

```jsx
<ChatMessage message={{ role: 'user', text: 'What should I work on today?' }} />
<ChatMessage message={{ role: 'assistant', text: '**3 cards** are due this week:\n\n- Fix onboarding drop-off\n- Ship board templates' }} />
<ChatMessage message={{ role: 'assistant', text: 'Searching…', error: { message: 'Request failed' } }} onRetry={retry} />
```

Assistant text renders through MarkdownRenderer (react-markdown + GFM); embedded card rails need board-store data and are omitted in isolated compositions.
