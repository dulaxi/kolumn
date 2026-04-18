# AI Prompt Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the AI system prompt for clarity and context awareness, add 14 new tools for full app coverage, and wire up client-side handlers.

**Architecture:** Server-side changes in `supabase/functions/chat/` (system prompt, tool schemas, tier config). Client-side changes in `src/lib/toolExecutor.js` (handlers that compose existing store methods). No new store methods needed.

**Tech Stack:** Deno/TypeScript (Edge Functions), React/Zustand (client), Claude API tool use

---

### Task 1: Rewrite system prompt (`context.ts`)

**Files:**
- Modify: `supabase/functions/chat/context.ts`

- [ ] **Step 1: Rewrite the board summary to include card titles**

Replace the `boardSummary` construction (lines 50–58) with a version that lists card titles per column:

```typescript
  const boardSummary = boards.map((b: any) => {
    const bCols = columns.filter((c: any) => c.board_id === b.id)
    const bCards = cards.filter((c: any) => c.board_id === b.id)
    const colSummary = bCols.map((col: any) => {
      const colCards = bCards.filter((c: any) => c.column_id === col.id && !c.completed)
      const titles = colCards.slice(0, 10).map((c: any) => `"${c.title}"`)
      const extra = colCards.length > 10 ? ` + ${colCards.length - 10} more` : ""
      if (titles.length > 0) {
        return `${col.title} (${colCards.length}: ${titles.join(", ")}${extra})`
      }
      return `${col.title} (0)`
    }).join(" | ")
    return `- ${b.name}: ${colSummary}`
  }).join("\n")
```

- [ ] **Step 2: Replace the alerts section**

Replace the separate `dueTodayList` and `overdueList` variables (lines 60–68) with a combined alerts block:

```typescript
  const alertsSummary = (() => {
    const parts: string[] = []
    if (overdue.length > 0) {
      parts.push("Overdue:\n" + overdue.map((c: any) => `- "${c.title}" (due ${c.due_date})`).join("\n"))
    }
    if (dueToday.length > 0) {
      parts.push("Due today:\n" + dueToday.map((c: any) => `- "${c.title}"`).join("\n"))
    }
    return parts.length > 0 ? parts.join("\n") : "None"
  })()
```

- [ ] **Step 3: Rewrite the system prompt string**

Replace the entire `systemPrompt` template literal (lines 74–118) with:

```typescript
  const systemPrompt = `You are Kolumn, a sharp project management assistant. You manage boards, cards, and workflow. Be direct — act on clear intent, ask only when genuinely ambiguous.

User: ${profile.display_name}
Today: ${today}
Team: ${memberList || "None"}
Workspaces: ${workspaceList.length > 0 ? workspaceList.join(", ") : "None"}

## Your boards
${boardSummary || "No boards yet"}

## Alerts
${alertsSummary}

## Recent activity (7 days)
- Created: ${recentCreated.length} cards
- Completed: ${recentCompleted.length} cards

## Notes
${notesSummary}

## Available icons (use ONLY these exact names, kebab-case)
house, star, heart, bookmark, tag, flag, target, trophy, gift, briefcase, buildings, user, users, users-three, graduation-cap, code, terminal, bug, cpu, monitor, device-mobile, laptop, database, gear, file-text, folder, clipboard, note, notepad, article, envelope, chat-circle, megaphone, bell, phone, calendar-blank, clock, hourglass, timer, camera, image, credit-card, currency-dollar, money, receipt, shopping-cart, airplane, car, rocket, truck, sun, moon, cloud, lightning, fire, leaf, tree, coffee, fork-knife, cake, pencil-simple, paint-brush, wrench, hammer, toolbox, key, lock, shield, check-circle, warning, sparkle, kanban, list, table, chart-bar, chart-pie, squares-four, columns, presentation, broom, person, hand-grabbing, magnifying-glass, paper-plane-tilt, robot, brain, lightbulb

## Always
- Act on clear intent. "Move all to Done" = move them. Don't ask which board if only one was discussed.
- Track the active board from conversation history. If the user just created or discussed a board, follow-up messages about "it" or "that board" refer to that board.
- Answer questions about boards, cards, tasks, and notes from the context above. You already have all the data.
- Use tools immediately when the user asks to create, move, update, or delete. Text alone does nothing.
- For card creation: always include title, priority, icon (from the list above), assignee (default ${profile.display_name}). Add description, labels, checklist only when they add value.
- For batch operations: use batch tools (move_cards, update_cards, complete_cards) instead of calling single-card tools repeatedly.
- When creating a board, call create_board AND multiple create_card tools in the same response. Create at least 5 cards. Every card goes in the first column unless the user explicitly says otherwise.
- Only modify the specific card(s) the user mentions.
- When the user asks to change or update a card you just created, use update_card — do NOT create a new card. Match by the card title you used when creating it.
- Parse natural language dates relative to Today.
- Infer priority from language: "urgent"/"ASAP" = high, "whenever"/"low priority" = low, default = medium.
- Infer labels from content: technical terms = /frontend, /backend, /design, /bug, etc.
- Default assignee is ${profile.display_name} unless specified.
- Always respond with text alongside tool calls.
- Use markdown: **bold** for names, lists for multiple items.

## Never
- Ask clarifying questions when conversation context makes the answer obvious.
- Use tools for read queries ("show me", "what's on", "how many", "list", "summarize") — answer from context.
- Use emojis.
- Create empty boards.
- Include workspace/board names in card titles when they're just contextual references.
- Execute destructive actions (delete board, delete column, remove member) without asking for confirmation first.`
```

- [ ] **Step 4: Verify the edge function compiles**

Run: `cd supabase/functions/chat && deno check index.ts 2>/dev/null; echo "done"`

If Deno is not installed locally, just review for syntax errors visually. The function will be tested on deploy.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/context.ts
git commit -m "feat(ai): rewrite system prompt — card titles, today's date, always/never rules"
```

---

### Task 2: Add 14 new tool definitions (`tools.ts`) and update tier config (`tier.ts`)

**Files:**
- Modify: `supabase/functions/chat/tools.ts`
- Modify: `supabase/functions/chat/tier.ts`

- [ ] **Step 1: Fix existing icon description and add batch card tools**

In `tools.ts`, fix the create_card icon description from PascalCase to kebab-case, then append the three batch tools after the existing `create_board` tool:

Change the icon description in `create_card` (line 10):
```typescript
icon: { type: "string", description: "Phosphor icon name in kebab-case (e.g. rocket, credit-card, bug)" },
```

Then append after the `create_board` tool object (after line 103, before the closing `] as const`):

```typescript
  {
    name: "move_cards",
    description: "Move multiple cards to a different column. Requires at least one filter (from_column or card_titles).",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name" },
        from_column: { type: "string", description: "Source column name (moves all cards from this column)" },
        card_titles: { type: "array", items: { type: "string" }, description: "Specific card titles to move" },
        to_column: { type: "string", description: "Destination column name" },
      },
      required: ["board", "to_column"],
    },
  },
  {
    name: "update_cards",
    description: "Batch update fields on multiple cards. Requires at least one filter (board, column, or card_titles).",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Filter by board name" },
        column: { type: "string", description: "Filter by column name" },
        card_titles: { type: "array", items: { type: "string" }, description: "Specific card titles to update" },
        updates: {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["low", "medium", "high"] },
            assignee_name: { type: "string", description: "Display name of assignee" },
            labels: { type: "array", items: { type: "object", properties: { text: { type: "string" }, color: { type: "string" } }, required: ["text", "color"] } },
            due_date: { type: "string", description: "Due date as YYYY-MM-DD" },
            icon: { type: "string", description: "Phosphor icon name in kebab-case" },
          },
          description: "Fields to update on all matching cards",
        },
      },
      required: ["updates"],
    },
  },
  {
    name: "complete_cards",
    description: "Mark multiple cards as completed and move them to the last column. Requires at least one filter.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Filter by board name" },
        column: { type: "string", description: "Filter by column name" },
        card_titles: { type: "array", items: { type: "string" }, description: "Specific card titles to complete" },
      },
    },
  },
```

- [ ] **Step 2: Add single card tools (duplicate_card, toggle_checklist)**

Append after the batch tools:

```typescript
  {
    name: "duplicate_card",
    description: "Duplicate an existing card, optionally to a different board or column.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to duplicate" },
        to_board: { type: "string", description: "Destination board name (defaults to same board)" },
        to_column: { type: "string", description: "Destination column name (defaults to first column)" },
      },
      required: ["card_title"],
    },
  },
  {
    name: "toggle_checklist",
    description: "Check or uncheck specific checklist items on a card by index (0-based).",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card" },
        items: { type: "array", items: { type: "number" }, description: "Indices of checklist items to toggle (0-based)" },
        done: { type: "boolean", description: "true = check items, false = uncheck items" },
      },
      required: ["card_title", "items", "done"],
    },
  },
```

- [ ] **Step 3: Add board management tools (update_board, delete_board, add_column, delete_column)**

Append:

```typescript
  {
    name: "update_board",
    description: "Rename a board or change its icon.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Current board name" },
        name: { type: "string", description: "New board name" },
        icon: { type: "string", description: "New Phosphor icon name in kebab-case" },
      },
      required: ["board"],
    },
  },
  {
    name: "delete_board",
    description: "Delete a board and all its columns and cards. Always ask the user for confirmation before executing.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name to delete" },
      },
      required: ["board"],
    },
  },
  {
    name: "add_column",
    description: "Add a new column to a board.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name" },
        title: { type: "string", description: "Column title" },
        position: { type: "number", description: "Insert position (0-based index). Defaults to end." },
      },
      required: ["board", "title"],
    },
  },
  {
    name: "delete_column",
    description: "Delete a column and all its cards. Always ask the user for confirmation before executing.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name" },
        column: { type: "string", description: "Column title to delete" },
      },
      required: ["board", "column"],
    },
  },
```

- [ ] **Step 4: Add member and notes tools**

Append:

```typescript
  {
    name: "invite_member",
    description: "Invite a user by email to a workspace.",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to invite" },
        workspace: { type: "string", description: "Workspace name" },
      },
      required: ["email", "workspace"],
    },
  },
  {
    name: "remove_member",
    description: "Remove a member from a workspace. Always ask the user for confirmation before executing.",
    input_schema: {
      type: "object",
      properties: {
        display_name: { type: "string", description: "Display name of the member to remove" },
        workspace: { type: "string", description: "Workspace name" },
      },
      required: ["display_name", "workspace"],
    },
  },
  {
    name: "create_note",
    description: "Create a new note with optional markdown content.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Note title" },
        content: { type: "string", description: "Note content (markdown)" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_note",
    description: "Update an existing note. Use 'content' to replace or 'append' to add to the end.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the note to update (matched case-insensitively)" },
        content: { type: "string", description: "New full content (replaces existing)" },
        append: { type: "string", description: "Text to append to existing content" },
      },
      required: ["title"],
    },
  },
```

- [ ] **Step 5: Update PRO_ONLY_TOOLS in tier.ts**

In `supabase/functions/chat/tier.ts`, replace line 5:

```typescript
const PRO_ONLY_TOOLS = ["move_card", "update_card", "delete_card"]
```

With:

```typescript
const PRO_ONLY_TOOLS = [
  "move_card", "update_card", "delete_card",
  "move_cards", "update_cards", "complete_cards",
  "duplicate_card", "toggle_checklist",
  "update_board", "delete_board", "add_column", "delete_column",
  "invite_member", "remove_member",
  "update_note",
]
```

Note: `create_note` is free (follows the pattern where `create_card` and `create_board` are free).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/chat/tools.ts supabase/functions/chat/tier.ts
git commit -m "feat(ai): add 14 new tool definitions + update pro-only tier list"
```

---

### Task 3: Tool executor — helpers and imports (`toolExecutor.js`)

**Files:**
- Modify: `src/lib/toolExecutor.js`

- [ ] **Step 1: Add store imports**

At the top of `toolExecutor.js`, add imports for `noteStore` and `workspacesStore` alongside the existing `boardStore` import (line 1):

```javascript
import { useBoardStore } from '../store/boardStore'
import { useNoteStore } from '../store/noteStore'
import { useWorkspacesStore } from '../store/workspacesStore'
```

- [ ] **Step 2: Add helper functions**

After the existing `firstColumnOf` function (line 28), add these helpers:

```javascript
function lastColumnOf(boardId) {
  const columns = useBoardStore.getState().columns
  return Object.values(columns)
    .filter((c) => c.board_id === boardId)
    .sort((a, b) => a.position - b.position)
    .at(-1)
}

function findCards({ board, column, card_titles }) {
  const store = useBoardStore.getState()
  let cards = Object.values(store.cards)

  if (board) {
    const b = findBoardByName(board)
    if (!b) return []
    cards = cards.filter((c) => c.board_id === b.id)
  }

  if (column) {
    const boardId = board ? findBoardByName(board)?.id : null
    const cols = Object.values(store.columns)
    const lower = column.toLowerCase()
    const matchCol = cols.find(
      (c) => c.title.toLowerCase() === lower && (!boardId || c.board_id === boardId)
    )
    if (!matchCol) return []
    cards = cards.filter((c) => c.column_id === matchCol.id)
  }

  if (card_titles && card_titles.length > 0) {
    const lowerTitles = card_titles.map((t) => t.toLowerCase())
    cards = cards.filter((c) => lowerTitles.includes(c.title.toLowerCase()))
  }

  return cards
}

function findNoteByTitle(title) {
  const notes = useNoteStore.getState().notes
  const lower = title.toLowerCase()
  return Object.values(notes).find((n) => n.title.toLowerCase() === lower)
}

function findWorkspaceByName(name) {
  const workspaces = useWorkspacesStore.getState().workspaces
  const lower = name.toLowerCase()
  return Object.values(workspaces).find((w) => w.name.toLowerCase() === lower)
}
```

- [ ] **Step 3: Update DESTRUCTIVE_ACTIONS**

Replace line 30 (`const DESTRUCTIVE_ACTIONS = ['delete_card']`):

```javascript
const DESTRUCTIVE_ACTIONS = ['delete_card', 'delete_board', 'delete_column', 'remove_member']
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds. New imports and helpers don't break anything since they're only referenced by handlers added in later tasks.

- [ ] **Step 5: Commit**

```bash
git add src/lib/toolExecutor.js
git commit -m "feat(ai): add executor helpers — findCards, lastColumnOf, note/workspace lookups"
```

---

### Task 4: Tool executor — batch card handlers

**Files:**
- Modify: `src/lib/toolExecutor.js`

- [ ] **Step 1: Add move_cards handler**

After the existing `create_board` handler block (before the final `return { ok: false, error: ... }`), add:

```javascript
  if (action === 'move_cards') {
    if (!params.from_column && (!params.card_titles || params.card_titles.length === 0)) {
      return { ok: false, error: 'Provide from_column or card_titles to filter which cards to move' }
    }
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    const toCol = findColumnByName(board.id, params.to_column)
    if (!toCol) return { ok: false, error: `Column "${params.to_column}" not found` }

    const cards = findCards({ board: params.board, column: params.from_column, card_titles: params.card_titles })
    if (cards.length === 0) return { ok: false, error: 'No matching cards found' }

    for (const card of cards) {
      await store.updateCard(card.id, { column_id: toCol.id })
    }
    return { ok: true, moved: cards.length }
  }
```

- [ ] **Step 2: Add update_cards handler**

```javascript
  if (action === 'update_cards') {
    if (!params.board && !params.column && (!params.card_titles || params.card_titles.length === 0)) {
      return { ok: false, error: 'Provide at least one filter (board, column, or card_titles)' }
    }

    const cards = findCards({ board: params.board, column: params.column, card_titles: params.card_titles })
    if (cards.length === 0) return { ok: false, error: 'No matching cards found' }

    const updates = { ...params.updates }
    if (updates.assignee) {
      updates.assignee_name = updates.assignee
      delete updates.assignee
    }

    for (const card of cards) {
      await store.updateCard(card.id, updates)
    }
    return { ok: true, updated: cards.length }
  }
```

- [ ] **Step 3: Add complete_cards handler**

```javascript
  if (action === 'complete_cards') {
    if (!params.board && !params.column && (!params.card_titles || params.card_titles.length === 0)) {
      return { ok: false, error: 'Provide at least one filter (board, column, or card_titles)' }
    }

    const cards = findCards({ board: params.board, column: params.column, card_titles: params.card_titles })
    if (cards.length === 0) return { ok: false, error: 'No matching cards found' }

    for (const card of cards) {
      const lastCol = lastColumnOf(card.board_id)
      await store.updateCard(card.id, { completed: true, column_id: lastCol?.id || card.column_id })
    }
    return { ok: true, completed: cards.length }
  }
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/toolExecutor.js
git commit -m "feat(ai): add batch card handlers — move_cards, update_cards, complete_cards"
```

---

### Task 5: Tool executor — single card and board management handlers

**Files:**
- Modify: `src/lib/toolExecutor.js`

- [ ] **Step 1: Add duplicate_card handler**

```javascript
  if (action === 'duplicate_card') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }

    const newId = await store.duplicateCard(card.id)
    if (!newId) return { ok: false, error: 'Failed to duplicate card' }

    // If target board/column specified, move the duplicate
    if (params.to_board || params.to_column) {
      const targetBoardId = params.to_board ? findBoardByName(params.to_board)?.id : card.board_id
      if (!targetBoardId) return { ok: false, error: `Board "${params.to_board}" not found` }

      const targetCol = params.to_column
        ? findColumnByName(targetBoardId, params.to_column)
        : firstColumnOf(targetBoardId)
      if (targetCol) {
        await store.updateCard(newId, { column_id: targetCol.id, board_id: targetBoardId })
      }
    }

    return { ok: true, cardId: newId }
  }
```

- [ ] **Step 2: Add toggle_checklist handler**

```javascript
  if (action === 'toggle_checklist') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }
    if (!card.checklist || card.checklist.length === 0) {
      return { ok: false, error: `Card "${params.card_title}" has no checklist` }
    }

    const updated = card.checklist.map((item, i) =>
      params.items.includes(i) ? { ...item, done: params.done } : item
    )
    await store.updateCard(card.id, { checklist: updated })
    return { ok: true }
  }
```

- [ ] **Step 3: Add update_board handler**

```javascript
  if (action === 'update_board') {
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    if (params.name) await store.renameBoard(board.id, params.name)
    if (params.icon) await store.updateBoardIcon(board.id, params.icon)
    return { ok: true }
  }
```

- [ ] **Step 4: Add delete_board handler**

```javascript
  if (action === 'delete_board') {
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    await store.deleteBoard(board.id)
    return { ok: true }
  }
```

- [ ] **Step 5: Add add_column handler**

```javascript
  if (action === 'add_column') {
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    await store.addColumn(board.id, params.title)
    // Position reordering after insert is handled by the store if needed
    return { ok: true }
  }
```

- [ ] **Step 6: Add delete_column handler**

```javascript
  if (action === 'delete_column') {
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    const column = findColumnByName(board.id, params.column)
    if (!column) return { ok: false, error: `Column "${params.column}" not found in "${params.board}"` }

    await store.deleteColumn(board.id, column.id)
    return { ok: true }
  }
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/lib/toolExecutor.js
git commit -m "feat(ai): add single card + board management handlers"
```

---

### Task 6: Tool executor — member and notes handlers

**Files:**
- Modify: `src/lib/toolExecutor.js`

- [ ] **Step 1: Add invite_member handler**

```javascript
  if (action === 'invite_member') {
    const workspace = findWorkspaceByName(params.workspace)
    if (!workspace) return { ok: false, error: `Workspace "${params.workspace}" not found` }

    await useWorkspacesStore.getState().inviteToWorkspace(workspace.id, params.email)
    return { ok: true }
  }
```

- [ ] **Step 2: Add remove_member handler**

```javascript
  if (action === 'remove_member') {
    const workspace = findWorkspaceByName(params.workspace)
    if (!workspace) return { ok: false, error: `Workspace "${params.workspace}" not found` }

    // Fetch members if not already loaded
    const wsStore = useWorkspacesStore.getState()
    if (!wsStore.members[workspace.id]) {
      await wsStore.fetchMembers(workspace.id)
    }

    const members = useWorkspacesStore.getState().members[workspace.id] || []
    const lower = (params.display_name || '').toLowerCase()
    const member = members.find((m) => m.display_name.toLowerCase() === lower)
    if (!member) return { ok: false, error: `Member "${params.display_name}" not found in "${params.workspace}"` }

    await useWorkspacesStore.getState().removeMember(workspace.id, member.user_id)
    return { ok: true }
  }
```

- [ ] **Step 3: Add create_note handler**

```javascript
  if (action === 'create_note') {
    const noteStore = useNoteStore.getState()
    const noteId = await noteStore.addNote(params.title)
    if (!noteId) return { ok: false, error: 'Failed to create note' }

    if (params.content) {
      await useNoteStore.getState().updateNote(noteId, { content: params.content })
    }
    return { ok: true, noteId }
  }
```

- [ ] **Step 4: Add update_note handler**

```javascript
  if (action === 'update_note') {
    const note = findNoteByTitle(params.title)
    if (!note) return { ok: false, error: `Note "${params.title}" not found` }

    if (params.append) {
      const existing = note.content || ''
      const separator = existing.endsWith('\n') || existing === '' ? '' : '\n\n'
      await useNoteStore.getState().updateNote(note.id, { content: existing + separator + params.append })
    } else if (params.content !== undefined) {
      await useNoteStore.getState().updateNote(note.id, { content: params.content })
    }
    return { ok: true }
  }
```

- [ ] **Step 5: Update the search/summarize read-only handler**

Find the existing read-only handler (around line 139) and add the new read-only actions:

```javascript
  if (action === 'search_cards' || action === 'summarize_board') {
    return { ok: true, readOnly: true }
  }
```

No change needed here — these remain as-is.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/toolExecutor.js
git commit -m "feat(ai): add member + notes handlers — invite, remove, create/update note"
```

---

### Task 7: Final build verification and smoke test

**Files:** None (verification only)

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: Build succeeds with no errors and no warnings related to the changed files.

- [ ] **Step 2: Verify dev server starts**

Run: `npm run dev` (background)
Expected: Vite starts on `http://localhost:5173/` with no import errors.

- [ ] **Step 3: Review all changes**

Run: `git log --oneline ai..HEAD` to see all commits made during this plan.

Verify 6 commits:
1. `feat(ai): rewrite system prompt — card titles, today's date, always/never rules`
2. `feat(ai): add 14 new tool definitions + update pro-only tier list`
3. `feat(ai): add executor helpers — findCards, lastColumnOf, note/workspace lookups`
4. `feat(ai): add batch card handlers — move_cards, update_cards, complete_cards`
5. `feat(ai): add single card + board management handlers`
6. `feat(ai): add member + notes handlers — invite, remove, create/update note`
