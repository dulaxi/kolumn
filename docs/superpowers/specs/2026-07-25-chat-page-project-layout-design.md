# Chat Page — claude.ai Project-Page Layout

**Date:** 2026-07-25
**Status:** Approved
**Scope:** `/chat/:id` (ChatPage) only. ChatListPage gets one small touch (starred-first sort). No backend/edge-function changes.

## Summary

Rebuild `/chat/:id` from a classic bottom-docked chat into a claude.ai
project-page layout: title header with actions, composer at the top,
conversation below it (newest exchange first), and a right rail that renders
the **exact board `Card` component** for every card the conversation mentions.

Reference: claude.ai's project page DOM (pasted 2026-07-25). Per the
established workflow, the structure is translated into Kolumn's own tokens —
not copied verbatim.

## Layout

- Centered `max-w-7xl` page, normal scroll flow (drop the `h-full` flex +
  bottom dock).
- Grid: 7 columns, 12 on `xl`. Left column `col-span-7`; right rail
  `xl:col-span-5`, stacking **below** the conversation on smaller screens
  (`col-span-7 mt-4 xl:mt-0`, left padding on xl).
- Horizontal padding `px-4 md:px-8`, top margin `mt-4 lg:mt-6`.

## Left column

### Header

- Conversation title in `font-heading` (weight 425), `line-clamp-2`,
  min-w-0 so long titles wrap not overflow.
- Right-aligned action cluster:
  - `⋯` — `Menu` (existing primitive) with **Rename** and **Delete**
    (destructive). Rename swaps the title for an inline input (Enter/blur
    commits, Escape cancels). Delete uses the existing `ConfirmModal`
    pattern, then `deleteConversation(id)` + navigate to `/chat`.
  - **Star** — Phosphor `Star` (regular ↔ fill when starred), toggles
    `starred` on the conversation.
- Below the title row: first user message as a `line-clamp-2` excerpt in
  `--text-secondary`. Hidden when the conversation has no user message yet.

### Composer

- Existing `ChatInput` with `docked={false}`, directly under the header.
- Behavior unchanged: Enter sends, `busy` blocks sends while streaming.

### Conversation

- Messages grouped into **exchanges**: a user message plus the assistant
  messages that follow it (up to the next user message).
- Rendered **newest exchange first**, so the reply to what you just typed
  is always visible under the composer without scrolling.
- Subtle divider (`--border-subtle`) between exchanges.
- `TypingIndicator` and the streaming reply render inside the top exchange.
- `ChatMessage` is reused untouched (it has unrelated uncommitted changes
  in the working tree — leave them alone).
- Error states on messages render exactly as today.

## Right rail — CardRail (new component)

`src/components/chat/CardRail.jsx`

- Panel: 1px `--border-subtle` border, **12px radius** (coherency rule for
  raised panels — the reference's `rounded-2xl` stays reserved for card
  surfaces), small `Cards` heading in `--text-secondary`.
- Content: the exact `Card` component (`src/components/board/Card.jsx`)
  for each mentioned card. `Card` renders standalone from a `card` prop —
  no DnD context needed.
- Order: most recently mentioned first, deduped across the conversation.
- Cap at 6 visible; a ghost "Show all N" button expands.
- Card click → navigate to the card's board (`/boards`, with the board
  activated via `boardStore.setActiveBoard` before navigating).
- Cards whose IDs no longer resolve in `boardStore` (deleted since the
  mention) are silently skipped.
- Empty state: centered muted copy in the panel body — "Cards Claude
  mentions will show up here."

## Mention resolver (Approach A — title scan)

`src/lib/cardMentions.js` — pure function:

```
findMentionedCardIds(text, cards) -> string[]
```

- Case-insensitive whole-substring match of each card title against the text.
- Longest-title-first so overlapping titles resolve to the more specific card.
- Guard: titles shorter than 4 characters are only matched as whole words
  (word-boundary check) to keep a card titled "Fix" from matching everything.
- Dedup within a single message.

Wiring: in `chatStore.sendMessage`'s `onDone`, run the resolver over the
finished assistant text against `useBoardStore.getState().cards` and stamp
the result onto a **new `mentionedCardIds` field** on the message. (Planning
revision: the spec originally reused the existing `cardIds` field, but
`ChatMessage` already renders inline embedded cards from `cardIds` — reusing
it would double-render every mention. `cardIds` stays untouched; the rail
reads both fields.) User messages are scanned too, at `addMessage` time from
ChatPage's `handleSend`. Mentions persist with the conversation
(localStorage).

Post-review revisions (final whole-branch review, 2026-07-25): user-message
stamping was centralized into `chatStore.addMessage` (auto-stamps `role:
'user'` messages when no explicit `mentionedCardIds` is passed) so the
dashboard composer entry point is covered too; ChatPage mounts
`ensureAllCardsLoaded()` so the resolver and rail see every board's cards,
not just the active board's; errored streams stamp mentions from the partial
text; and manual renames set `titleEdited`, which `generateTitle` respects so
auto-titling can't clobber a rename.

## Store changes (`chatStore.js`)

- `renameConversation(id, title)` — trims, ignores empty.
- `toggleStarred(id)` — flips a `starred` boolean on the conversation
  (absent = false for existing conversations).
- `sendMessage` `onDone`: stamp `cardIds` via the resolver.

## ChatListPage touch

- Sort: starred conversations first, then `updated_at` desc (existing order).
- No other changes to the list page this pass.

## Out of scope

- Any edge-function / system-prompt change (Approach B markers) — rejected.
- ChatListPage redesign, Instructions/Files features, chat persistence
  (backlog T1-#4).
- New Card variants — the rail renders the stock component.

## Testing

- Unit (Vitest): `cardMentions` matching rules (case-insensitivity,
  longest-first overlap, short-title word-boundary guard, dedup);
  `chatStore.renameConversation` / `toggleStarred`; exchange grouping if
  extracted as a helper.
- Manual browser pass: send flow with streaming, newest-first ordering,
  rename/star/delete, rail population + dedup + deleted-card skip, empty
  state, xl vs stacked responsive behavior, dark mode.
- `npm run build`, `npm run test`, `npm run lint` before claiming done.
