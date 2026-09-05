---
category: Chat
---

ChatInput — the chat composer: auto-growing textarea with a circular ink send button (arrow up) that swaps to a stop button while streaming.

## Props

- `onSend(text)`: called with the trimmed draft on Enter or button press.
- `onStop`: shown/called while `busy` — stops the stream.
- `busy`: a reply is streaming. Typing stays enabled; sends are blocked with a transient hint.
- `autoFocus`: focus on mount. `docked`: bottom-docked styling (default true).

## Usage

```jsx
<ChatInput onSend={send} onStop={stop} busy={streaming} autoFocus />
```

Enter sends, Shift+Enter adds a newline.
