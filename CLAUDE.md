# Gambit — Project Context

## Overview

Gambit is a Kanban project management dashboard inspired by Asana's UI patterns. Built with React 19 + Vite + Tailwind CSS v4.

## Tech Stack

- **Framework**: React 19 with Vite 7
- **Styling**: Tailwind CSS v4 (uses `@theme` and `@utility` blocks in `src/index.css`)
- **State**: Zustand with `persist` middleware (localStorage) — stores in `src/store/`
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable
- **Icons**: lucide-react (1688 icons, rendered dynamically by name via `DynamicIcon` component)
- **Font**: Mona Sans Variable (GitHub's font, via @fontsource-variable/mona-sans)
- **Router**: react-router-dom v7
- **Charts**: Recharts

## Commands

```bash
npm run dev      # Dev server (Vite)
npm run build    # Production build
npm run preview  # Preview production build
```

## Architecture

```
src/
├── main.jsx                    # Entry point, imports Mona Sans font
├── App.jsx                     # Router setup
├── index.css                   # Tailwind theme tokens, scrollbar styles
├── store/
│   ├── boardStore.js           # Boards, columns, cards state (Zustand + persist)
│   ├── noteStore.js            # Notes state
│   └── settingsStore.js        # App settings
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx       # Main layout shell (sidebar + header + content)
│   │   ├── Sidebar.jsx         # Left nav with board list, icons, board icon picker
│   │   └── Header.jsx          # Top bar with search
│   └── board/
│       ├── BoardView.jsx       # DndContext, columns, drag handlers, add-column
│       ├── BoardSelector.jsx   # Board switcher with icon picker for new boards
│       ├── Column.jsx          # Droppable column with card list, rename, delete
│       ├── Card.jsx            # Card display (icon, title, checkmark, priority dot, labels, assignee)
│       ├── SortableCard.jsx    # Wraps Card with useSortable
│       ├── CardDetailPanel.jsx # Right-side Asana-style detail panel (420px fixed)
│       ├── InlineCardEditor.jsx# Inline expanded card editor for NEW tasks in column
│       ├── DynamicIcon.jsx     # Renders any lucide-react icon by string name
│       └── IconPicker.jsx      # Full-screen categorized icon picker modal (createPortal)
└── pages/
    ├── BoardsPage.jsx          # Main board page (inline create + side panel edit)
    ├── DashboardPage.jsx       # Stats overview
    ├── CalendarPage.jsx        # Calendar view
    ├── NotesPage.jsx           # Notes editor
    ├── AnalyticsPage.jsx       # Charts
    └── SettingsPage.jsx        # Settings
```

## Key Patterns

### Card Creation vs Editing
- **New task**: "Add task" creates card with "Untitled task", shows `InlineCardEditor` inline in the column
- **Existing task**: Clicking a card opens `CardDetailPanel` as a fixed right-side panel (400px margin on board)

### Drag and Drop
- Custom collision detection: `pointerWithin` (for cards) + `rectIntersection` fallback (for columns)
- Handlers use `useBoardStore.getState()` for fresh state (avoids stale closures in useCallback)
- Card outer element is `<div role="button">` not `<button>` (native buttons capture pointer events)
- Empty columns have `min-h-[80px]` so they remain droppable targets

### Dynamic Icons
- `DynamicIcon` component takes a `name` string prop and looks up the icon from lucide-react's `icons` map at runtime
- `getAllIconNames()` returns all available icon names
- `IconPicker` uses `createPortal(…, document.body)` to escape stacking contexts

### Task Numbering
- `nextTaskNumber` counter in boardStore, incremented on each card creation
- Displayed as "Task 1", "Task 2", etc.

### Card Completion
- `completeCard(cardId)` marks card as `completed: true` AND moves it to the next column
- Grey `CheckCircle2` → green on click

## Design System

### Colors
- **Background**: `bg-[#f6f8f9]` (light gray)
- **Cards**: `bg-white` with `border-gray-100`, `shadow-sm`, `rounded-xl`
- **Label palette** (GitHub brand colors):
  - Red: `bg-[#FFE0DB] text-[#CF222E]`
  - Blue: `bg-[#DAF0FF] text-[#3094FF]`
  - Green: `bg-[#D1FDE0] text-[#08872B]`
  - Yellow: `bg-[#FFF4D4] text-[#9A6700]`
  - Purple: `bg-[#EDD8FD] text-[#8534F3]`
  - Pink: `bg-[#FFD6EA] text-[#BF3989]`
  - Gray: `bg-[#E4EBE6] text-[#909692]`
- **Priority dots**: `bg-emerald-400` (low), `bg-amber-400` (medium), `bg-rose-400` (high)
- **Selected card**: `bg-blue-50/60 border-blue-100`

### Typography
- Font: Mona Sans Variable (system font fallback stack)
- Card titles: `text-[13px] font-medium`
- Task numbers: `text-[11px] font-medium text-gray-500`
- Labels: `text-[10px] font-semibold`

## Board Store Shape

```js
{
  boards: { [id]: { id, title, icon, columns: [{ id, title, cardIds }], nextTaskNumber } },
  cards: { [id]: { id, boardId, title, icon, assignee, priority, dueDate, labels, description, checklist, taskNumber, completed } },
  activeBoardId: string
}
```

## Important Notes

- Tailwind v4 uses `@theme {}` blocks (not `tailwind.config.js`) for theme tokens
- No test suite currently — verify changes with `npm run build`
- State persists to localStorage via Zustand persist middleware
- The old `CardModal.jsx` was deleted and replaced by `CardDetailPanel.jsx`
