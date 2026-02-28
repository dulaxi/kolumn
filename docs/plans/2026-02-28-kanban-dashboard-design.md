# Gambit — Personal Kanban Dashboard Design

## Overview

Gambit is a personal Kanban-style task management web app inspired by the [SnowUI Dashboard UI Kit](https://www.figma.com/community/file/1210542873091115123/dashboard-ui-kit-dashboard-free-admin-dashboard). It features a clean sidebar navigation, drag-and-drop Kanban boards, and additional productivity pages (calendar, notes, analytics).

## Requirements

- **Use case:** Personal task management (single user)
- **Storage:** Local-first (localStorage), designed for optional cloud sync later
- **Theme:** Light mode only, SnowUI-inspired aesthetic
- **Drag-and-drop:** Full card dragging between columns and reordering within columns

## Tech Stack

| Dependency | Purpose |
|-----------|---------|
| React + React DOM | UI framework |
| Vite | Build tool / dev server |
| React Router DOM v6 | Client-side routing |
| Zustand | State management with persist middleware |
| @dnd-kit/core + sortable + utilities | Drag-and-drop |
| Lucide React | Icons |
| Recharts | Analytics charts |
| Tailwind CSS | Utility-first styling |
| date-fns | Date formatting/manipulation |
| nanoid | ID generation |

## Architecture

**Approach:** Monolith SPA with Zustand state management.

- Zustand with `persist` middleware stores all state in localStorage
- The persistence layer is designed so a future sync adapter just swaps the storage engine
- React Router v6 with nested routes under a shared layout component
- @dnd-kit handles all drag-and-drop interactions

## Layout & Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│ Gambit                                                          │
├──────────┬──────────────────────────────────────────────────────┤
│          │  Header: Page Title + Search + Profile Avatar        │
│ SIDEBAR  ├──────────────────────────────────────────────────────┤
│          │                                                      │
│ Dashboard│         MAIN CONTENT AREA                            │
│ Boards   │         (changes per page)                           │
│ Calendar │                                                      │
│ Notes    │                                                      │
│ Analytics│                                                      │
│ ──────── │                                                      │
│ Settings │                                                      │
│          │                                                      │
│ [<<]     │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### Sidebar

- Fixed left panel, ~240px wide
- Collapsible to icon-only mode (~64px) with toggle button
- Logo/app name "Gambit" at top
- Navigation items with Lucide icons:
  - Dashboard, Boards, Calendar, Notes, Analytics
  - Settings (separated by divider, pushed to bottom)
- Active item: blue accent background
- Hover: gray-100 background

### Header Bar

- Page title on left
- Search bar in center (searches across tasks/notes)
- User avatar/initials on right (decorative, no auth)

## Kanban Board Design

### Board Features

- Multiple boards (e.g., "Work", "Personal", "Side Projects")
- Create, rename, delete boards
- Default columns: To Do, In Progress, Review, Done
- Add, rename, reorder, delete columns
- Horizontal scroll when columns exceed viewport width

### Card Features

- Title (required)
- Description (optional, shown in modal on click)
- Labels/tags with colors (e.g., "bug", "feature", "urgent")
- Due date (optional)
- Priority indicator (low/medium/high — color-coded dot)
- Checklist items (optional, shown as progress bar on card)

### Drag-and-Drop

- Drag cards between columns
- Reorder cards within a column
- Visual drag overlay showing the card being moved
- Drop zone highlighting

### Card Modal

- Full edit view with all fields
- Delete card button
- Close on Escape / click outside

## Data Model

```
boards: {
  [boardId]: {
    id, name, columns: [
      { id, title, cardIds: [] }
    ]
  }
}

cards: {
  [cardId]: {
    id, boardId, title, description,
    labels: [{ text, color }],
    dueDate, priority: 'low'|'medium'|'high',
    checklist: [{ id, text, done }],
    createdAt, updatedAt
  }
}

notes: {
  [noteId]: { id, title, content, createdAt, updatedAt }
}

settings: {
  sidebarCollapsed, defaultBoard, ...
}
```

### Key Design Decisions

- **Flat card storage:** Cards stored in a flat map, not nested inside columns. Makes drag-and-drop O(1).
- **Column cardIds:** Columns store only `cardIds` arrays. Moving a card = splicing arrays.
- **Timestamps:** `createdAt`/`updatedAt` on all entities for future sync conflict resolution.

## Pages

| Page | Description |
|------|------------|
| Dashboard | Summary cards (total tasks, completed today, overdue), recent activity, quick-add task |
| Boards | Board list + board view with Kanban columns |
| Calendar | Month grid showing tasks by due date. Click date to see/add tasks. |
| Notes | List of notes with basic markdown editor. Create/edit/delete. |
| Analytics | Task completion over time (line), tasks by label (bar), tasks by board (pie). Recharts. |
| Settings | Default board, sidebar preference, export/import data (JSON), clear all data |

## Visual Style (SnowUI-inspired)

- **Font:** Inter (Google Fonts)
- **Colors:** White/gray-50 backgrounds, gray-200 borders, blue-500 primary accent, subtle shadows
- **Cards:** White with subtle shadow, rounded-lg (8px), hover elevation
- **Sidebar:** White background, gray-100 hover, blue-500 active indicator
- **Spacing:** Consistent 4/8/16/24px scale via Tailwind
