# Tutorial Board — New User Experience

**Date:** 2026-04-02
**Status:** Approved

## Overview

Replace the current generic sample board with a tutorial-style "Getting Started with Kolumn" board that teaches features by doing them. New users land directly on this board after signup.

## What Changes

### 1. `src/store/boardStore.js` — `createSampleBoard()`

Replace current board content with:

- **Board name:** "Getting Started with Kolumn"
- **Board icon:** `Target` (lucide-react)
- **4 columns:** "Try These", "In Progress", "Almost There", "Done"
- **9 cards** with tutorial-style content (action-oriented titles that teach features)

#### Card content:

**Try These (4 cards):**
1. "Drag me to In Progress →" — teaches drag & drop. Label: `Start Here` (blue), priority: high.
2. "Click me to see the detail panel" — teaches detail panel. Label: `Explore` (purple). Description explains what's inside.
3. "Try checking off items below" — teaches checklists. Label: `Checklist` (green). Checklist: 3 items, 1 pre-checked.
4. "Create your own card" — teaches card creation. Label: `Your Turn` (yellow). Description mentions + button and N shortcut.

**In Progress (2 cards):**
5. "Invite a teammate" — teaches sharing. Label: `Collaborate` (pink), priority: medium. Description mentions Share button.
6. "Set a due date on this card" — teaches due dates. Label: `Your Turn` (yellow). No due_date set (user sets it themselves).

**Almost There (2 cards):**
7. "Visit the Dashboard" — teaches dashboard. Label: `Explore` (purple). Description mentions stats, calendar, streak.
8. "Add a label to any card" — teaches labels. Labels: `Feature` (blue), `Labels` (green), `Like These` (red). Shows multiple labels by example.

**Done (1 card):**
9. "Sign up for Kolumn" — pre-completed. Label: `Setup` (green). Shows what done state looks like.

#### Other details:
- Assign cards to the current user's `display_name` where appropriate (cards 1, 5, 6)
- Set `due_date` on card 1 (tomorrow) to populate the dashboard timeline
- `next_task_number` set to 10
- localStorage flag `kolumn_sample_board_created` unchanged (prevents re-creation)

### 2. `src/components/layout/AppLayout.jsx` — Navigate to board after creation

After `createSampleBoard()` returns a board ID, navigate to `/boards` so the user lands on the tutorial board instead of the dashboard.

Currently (line 68):
```js
createSampleBoard()
return
```

Change to:
```js
createSampleBoard().then((id) => {
  if (id) navigate('/boards')
})
```

## What does NOT change

- Board is a normal board — deletable, renamable, editable like any other
- No special dismiss UI, no tutorial overlay, no wizard
- Dashboard behavior unchanged (it naturally populates from board data)
- `createSampleBoard` guard logic unchanged (localStorage flag, user check)

## Files Modified

1. `src/store/boardStore.js` — `createSampleBoard()` content
2. `src/components/layout/AppLayout.jsx` — post-creation navigation
