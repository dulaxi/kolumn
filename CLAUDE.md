# Gambit — Project Context

## Overview

Gambit is a multi-user Kanban project management dashboard inspired by Asana's UI patterns. Built with React 19 + Vite + Tailwind CSS v4 + Supabase (Postgres + Auth).

## Tech Stack

- **Framework**: React 19 with Vite 7
- **Styling**: Tailwind CSS v4 (uses `@theme` and `@utility` blocks in `src/index.css`)
- **State**: Zustand (no persist — data lives in Supabase)
- **Backend**: Supabase (Postgres, Auth, Realtime)
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

## Environment Setup

1. Create a Supabase project at supabase.com
2. Disable email confirmation (Auth > Settings)
3. Run `supabase/schema.sql` in the SQL Editor
4. Copy `.env.example` to `.env.local` and fill in credentials:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Architecture

```
src/
├── main.jsx                    # Entry point, imports Mona Sans font, initializes auth
├── App.jsx                     # Router setup (auth routes + protected routes)
├── index.css                   # Tailwind theme tokens, scrollbar styles
├── lib/
│   ├── supabase.js             # Supabase client singleton
│   └── migrateLocalData.js     # One-time localStorage → Supabase migration
├── store/
│   ├── authStore.js            # Auth state: user, session, profile, signUp/signIn/signOut
│   ├── boardStore.js           # Boards, columns, cards (Supabase CRUD + realtime)
│   ├── noteStore.js            # Notes (Supabase CRUD, private per user)
│   └── settingsStore.js        # Local settings: sidebarCollapsed, theme, font
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.jsx  # Redirects to /login if no session
│   ├── layout/
│   │   ├── AppLayout.jsx       # Main layout shell, data fetch, subscriptions, migration
│   │   ├── Sidebar.jsx         # Left nav with board list, icons, board icon picker
│   │   └── Header.jsx          # Top bar with search, user menu, sign out
│   └── board/
│       ├── BoardView.jsx       # DndContext, columns, drag handlers, add-column
│       ├── BoardSelector.jsx   # Board switcher + Share button
│       ├── BoardShareModal.jsx # Invite users by email, manage members
│       ├── Column.jsx          # Droppable column with card list, rename, delete
│       ├── Card.jsx            # Card display (icon, title, checkmark, priority dot, labels, assignee)
│       ├── SortableCard.jsx    # Wraps Card with useSortable
│       ├── CardDetailPanel.jsx # Right-side detail panel (420px fixed)
│       ├── InlineCardEditor.jsx# Inline expanded card editor for NEW tasks
│       ├── AllBoardsView.jsx   # "All Tasks" view across all boards
│       ├── DynamicIcon.jsx     # Renders any lucide-react icon by string name
│       └── IconPicker.jsx      # Full-screen categorized icon picker modal
└── pages/
    ├── LoginPage.jsx           # Email/password login
    ├── SignupPage.jsx          # Email/password/display name signup
    ├── BoardsPage.jsx          # Main board page
    ├── DashboardPage.jsx       # Stats overview
    ├── CalendarPage.jsx        # Calendar view
    ├── NotesPage.jsx           # Notes editor
    └── SettingsPage.jsx        # Profile, theme, font, export/import
```

## Key Patterns

### Authentication
- Email/password auth via Supabase (no email confirmation)
- `authStore.initialize()` called before render in main.jsx
- `ProtectedRoute` wraps all app routes, redirects to /login
- Profile stored in Supabase `profiles` table, read via `authStore.profile`

### Board Store Shape (Supabase-backed)
```js
{
  boards: { [id]: { id, name, icon, owner_id, next_task_number } },
  columns: { [id]: { id, board_id, title, position } },
  cards: { [id]: { id, board_id, column_id, position, task_number, global_task_number, title, description, assignee_name, priority, due_date, icon, completed, labels, checklist } },
  activeBoardId, loading
}
```

### Card Field Names (DB columns use snake_case)
- `assignee_name` (not `assignee`)
- `due_date` (not `dueDate`)
- `task_number` (not `taskNumber`)
- `global_task_number` (not `globalTaskNumber`)
- `board_id`, `column_id`, `updated_at`, `created_at`

### Card Creation vs Editing
- **New task**: Creates card in Supabase, shows `InlineCardEditor` inline
- **Existing task**: Click opens `CardDetailPanel` (420px fixed right panel)

### Drag and Drop
- Custom collision detection: `pointerWithin` + `rectIntersection` fallback
- Position-based ordering (integer `position` field on cards/columns)
- Optimistic updates + async Supabase persistence

### Real-Time Subscriptions
- `subscribeToBoards()` in boardStore subscribes to postgres_changes on boards, columns, cards tables
- Set up in AppLayout after auth, torn down on unmount
- Last-write-wins merge strategy

### Board Sharing
- Board owners can invite by email via `BoardShareModal`
- Existing users added directly to `board_members`
- Non-existing users get `board_invitations` (auto-accepted on signup)
- RLS ensures users only see boards they're members of

### localStorage Migration
- `migrateLocalData.js` detects old localStorage data after first login
- Banner in AppLayout offers to import boards/cards/notes into Supabase
- Clears localStorage after successful migration

## Database Schema

Tables: `profiles`, `boards`, `board_members`, `columns`, `cards`, `notes`, `board_invitations`

Triggers:
- Auto-create profile on signup
- Auto-add owner to board_members on board creation
- Auto-accept pending invitations on new user signup
- Auto-update `updated_at` on cards and notes

RLS: Users can only access boards they're members of. Notes are private per user.

## Design System

### Colors
- **Background**: `bg-gray-50`
- **Cards**: `bg-white` with `border-gray-200`, `shadow-sm`, `rounded-xl`
- **Label palette** (GitHub brand colors):
  - Red: `bg-[#FFE0DB] text-[#CF222E]`
  - Blue: `bg-[#DAF0FF] text-[#3094FF]`
  - Green: `bg-[#D1FDE0] text-[#08872B]`
  - Yellow: `bg-[#FFF4D4] text-[#9A6700]`
  - Purple: `bg-[#EDD8FD] text-[#8534F3]`
  - Pink: `bg-[#FFD6EA] text-[#BF3989]`
  - Gray: `bg-[#E4EBE6] text-[#909692]`
- **Priority dots**: `bg-emerald-400` (low), `bg-amber-400` (medium), `bg-rose-400` (high)

## Important Notes

- Tailwind v4 uses `@theme {}` blocks (not `tailwind.config.js`) for theme tokens
- No test suite — verify changes with `npm run build`
- `settingsStore` still uses localStorage persist (sidebar, theme, font only)
- All other state lives in Supabase (boards, columns, cards, notes, profiles)
