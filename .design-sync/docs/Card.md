---
category: Board
---

Card — the kanban card. 16px radius (a deliberate exception to the 8–12px rule — don't "fix" it), card surface, 1px border, hover states, and a completion toggle.

## Props

- `card`: the card record, DB snake_case fields:
  - `title` (string), `description` (string), `icon` (Phosphor icon name string), `completed` (bool)
  - `priority`: `'low' | 'medium' | 'high'` — renders the colored dot (lime/honey/copper)
  - `due_date`: `'YYYY-MM-DD'` — renders a due chip; overdue/today get warning hues
  - `checklist`: `[{ text, done }]` — renders "n/total" progress and an expandable list
  - `assignees`: `string[]` (falls back to legacy `assignee_name`) — renders stacked Avatars
- `onClick`: open the detail view. `onComplete`: completion toggle handler.
- `isSelected`: selection ring. `ghost`: drag-placeholder styling. `iconOverride`: replace the card's icon.

## Usage

```jsx
<Card
  card={{
    id: 'c1', title: 'Fix onboarding drop-off',
    description: 'Step 3 loses 40% of signups',
    priority: 'high', due_date: '2026-08-12',
    checklist: [{ text: 'Reproduce', done: true }, { text: 'Fix', done: false }],
    assignees: ['Amara Okafor'], completed: false,
  }}
  onClick={openDetail}
/>
```

Labels come from the board store (not the card prop) — in isolated compositions cards simply render without label chips.

## Rules

- Field names are snake_case (`due_date`, `assignee_name`) — never camelCase.
- Cards live inside 8px-gapped column lists on the page surface.
