# Gambit Kanban Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal Kanban task management web app with SnowUI-inspired sidebar, drag-and-drop boards, and productivity pages (dashboard, calendar, notes, analytics, settings).

**Architecture:** React SPA with Vite, Zustand for state (persisted to localStorage), @dnd-kit for drag-and-drop, React Router v6 for navigation. Flat card storage with column cardIds arrays for efficient DnD state updates.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, Zustand, @dnd-kit, React Router DOM v6, Lucide React, Recharts, date-fns, nanoid

**Design doc:** `docs/plans/2026-02-28-kanban-dashboard-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`

**Step 1: Scaffold Vite React project**

```bash
npm create vite@latest . -- --template react
```

Select React + JavaScript when prompted. This creates the base structure.

**Step 2: Install all dependencies**

```bash
npm install react-router-dom zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities lucide-react recharts date-fns nanoid
npm install -D tailwindcss @tailwindcss/vite
```

**Step 3: Configure Tailwind CSS v4**

Replace `src/index.css` with:

```css
@import "tailwindcss";

@theme {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;
}
```

**Step 4: Configure Vite with Tailwind plugin**

Update `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

**Step 5: Add Inter font to index.html**

Add to `<head>` in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<title>Gambit</title>
```

**Step 6: Create minimal App.jsx**

```jsx
function App() {
  return (
    <div className="font-sans text-gray-900 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold p-8">Gambit</h1>
    </div>
  )
}

export default App
```

**Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: App renders at localhost:5173 with "Gambit" heading in Inter font on gray-50 background.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + Tailwind project"
```

---

### Task 2: Zustand Store — Board & Card State

**Files:**
- Create: `src/store/boardStore.js`
- Create: `src/store/settingsStore.js`

**Step 1: Create the board store with persist middleware**

Create `src/store/boardStore.js`:

```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

const createDefaultBoard = () => {
  const boardId = nanoid()
  return {
    id: boardId,
    name: 'My Tasks',
    columns: [
      { id: nanoid(), title: 'To Do', cardIds: [] },
      { id: nanoid(), title: 'In Progress', cardIds: [] },
      { id: nanoid(), title: 'Review', cardIds: [] },
      { id: nanoid(), title: 'Done', cardIds: [] },
    ],
  }
}

const defaultBoard = createDefaultBoard()

export const useBoardStore = create(
  persist(
    (set, get) => ({
      boards: { [defaultBoard.id]: defaultBoard },
      cards: {},
      activeBoardId: defaultBoard.id,

      // Board actions
      setActiveBoard: (boardId) => set({ activeBoardId: boardId }),

      addBoard: (name) => {
        const board = {
          id: nanoid(),
          name,
          columns: [
            { id: nanoid(), title: 'To Do', cardIds: [] },
            { id: nanoid(), title: 'In Progress', cardIds: [] },
            { id: nanoid(), title: 'Done', cardIds: [] },
          ],
        }
        set((state) => ({
          boards: { ...state.boards, [board.id]: board },
          activeBoardId: board.id,
        }))
        return board.id
      },

      renameBoard: (boardId, name) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [boardId]: { ...state.boards[boardId], name },
          },
        })),

      deleteBoard: (boardId) =>
        set((state) => {
          const { [boardId]: deleted, ...rest } = state.boards
          // Remove all cards belonging to this board
          const cards = { ...state.cards }
          Object.keys(cards).forEach((cardId) => {
            if (cards[cardId].boardId === boardId) delete cards[cardId]
          })
          const remainingIds = Object.keys(rest)
          return {
            boards: rest,
            cards,
            activeBoardId:
              state.activeBoardId === boardId
                ? remainingIds[0] || null
                : state.activeBoardId,
          }
        }),

      // Column actions
      addColumn: (boardId, title) =>
        set((state) => {
          const board = state.boards[boardId]
          return {
            boards: {
              ...state.boards,
              [boardId]: {
                ...board,
                columns: [...board.columns, { id: nanoid(), title, cardIds: [] }],
              },
            },
          }
        }),

      renameColumn: (boardId, columnId, title) =>
        set((state) => {
          const board = state.boards[boardId]
          return {
            boards: {
              ...state.boards,
              [boardId]: {
                ...board,
                columns: board.columns.map((col) =>
                  col.id === columnId ? { ...col, title } : col
                ),
              },
            },
          }
        }),

      deleteColumn: (boardId, columnId) =>
        set((state) => {
          const board = state.boards[boardId]
          const column = board.columns.find((c) => c.id === columnId)
          const cards = { ...state.cards }
          // Remove cards in this column
          column.cardIds.forEach((cardId) => delete cards[cardId])
          return {
            boards: {
              ...state.boards,
              [boardId]: {
                ...board,
                columns: board.columns.filter((col) => col.id !== columnId),
              },
            },
            cards,
          }
        }),

      // Card actions
      addCard: (boardId, columnId, cardData) => {
        const card = {
          id: nanoid(),
          boardId,
          title: cardData.title,
          description: cardData.description || '',
          labels: cardData.labels || [],
          dueDate: cardData.dueDate || null,
          priority: cardData.priority || 'medium',
          checklist: cardData.checklist || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => {
          const board = state.boards[boardId]
          return {
            cards: { ...state.cards, [card.id]: card },
            boards: {
              ...state.boards,
              [boardId]: {
                ...board,
                columns: board.columns.map((col) =>
                  col.id === columnId
                    ? { ...col, cardIds: [...col.cardIds, card.id] }
                    : col
                ),
              },
            },
          }
        })
        return card.id
      },

      updateCard: (cardId, updates) =>
        set((state) => ({
          cards: {
            ...state.cards,
            [cardId]: {
              ...state.cards[cardId],
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      deleteCard: (cardId) =>
        set((state) => {
          const card = state.cards[cardId]
          const { [cardId]: deleted, ...restCards } = state.cards
          const board = state.boards[card.boardId]
          return {
            cards: restCards,
            boards: {
              ...state.boards,
              [card.boardId]: {
                ...board,
                columns: board.columns.map((col) => ({
                  ...col,
                  cardIds: col.cardIds.filter((id) => id !== cardId),
                })),
              },
            },
          }
        }),

      // Drag-and-drop: move card between/within columns
      moveCard: (boardId, fromColumnId, toColumnId, fromIndex, toIndex) =>
        set((state) => {
          const board = state.boards[boardId]
          const columns = board.columns.map((col) => ({ ...col, cardIds: [...col.cardIds] }))

          const fromCol = columns.find((c) => c.id === fromColumnId)
          const toCol = columns.find((c) => c.id === toColumnId)

          const [movedCardId] = fromCol.cardIds.splice(fromIndex, 1)
          toCol.cardIds.splice(toIndex, 0, movedCardId)

          return {
            boards: {
              ...state.boards,
              [boardId]: { ...board, columns },
            },
          }
        }),

      // Selectors
      getActiveBoard: () => {
        const state = get()
        return state.boards[state.activeBoardId] || null
      },

      getBoardCards: (boardId) => {
        const state = get()
        const board = state.boards[boardId]
        if (!board) return []
        return board.columns.flatMap((col) =>
          col.cardIds.map((id) => state.cards[id]).filter(Boolean)
        )
      },

      getAllCards: () => Object.values(get().cards),
    }),
    {
      name: 'gambit-boards',
    }
  )
)
```

**Step 2: Create the settings store**

Create `src/store/settingsStore.js`:

```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'gambit-settings',
    }
  )
)
```

**Step 3: Verify stores work**

Import and log in App.jsx temporarily:

```jsx
import { useBoardStore } from './store/boardStore'

function App() {
  const boards = useBoardStore((s) => s.boards)
  console.log('boards', boards)
  return <div className="font-sans">Store works: {Object.keys(boards).length} boards</div>
}
```

Run `npm run dev`, check console shows boards object and page shows "Store works: 1 boards".

**Step 4: Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand board and settings stores with localStorage persistence"
```

---

### Task 3: Layout Shell — Sidebar + Header

**Files:**
- Create: `src/components/layout/Sidebar.jsx`
- Create: `src/components/layout/Header.jsx`
- Create: `src/components/layout/AppLayout.jsx`
- Modify: `src/App.jsx`

**Step 1: Create the Sidebar component**

Create `src/components/layout/Sidebar.jsx`:

```jsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  Calendar,
  StickyNote,
  BarChart3,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Swords,
} from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/boards', icon: Kanban, label: 'Boards' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
]

export default function Sidebar() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const toggle = useSettingsStore((s) => s.toggleSidebar)

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-200 z-30 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-200">
        <Swords className="w-7 h-7 text-primary-600 shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            Gambit
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-200 py-4 px-2 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : ''}`
          }
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <button
          onClick={toggle}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? (
            <ChevronsRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronsLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
```

**Step 2: Create the Header component**

Create `src/components/layout/Header.jsx`:

```jsx
import { Search, User } from 'lucide-react'
import { useState } from 'react'

export default function Header({ title }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks, notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
        <User className="w-5 h-5 text-primary-600" />
      </div>
    </header>
  )
}
```

**Step 3: Create the AppLayout component**

Create `src/components/layout/AppLayout.jsx`:

```jsx
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSettingsStore } from '../../store/settingsStore'

const pageTitles = {
  '/': 'Dashboard',
  '/boards': 'Boards',
  '/calendar': 'Calendar',
  '/notes': 'Notes',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const location = useLocation()

  // Match the base path for title
  const basePath = '/' + (location.pathname.split('/')[1] || '')
  const title = pageTitles[basePath] || 'Gambit'

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div
        className={`transition-all duration-200 ${
          collapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <Header title={title} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

**Step 4: Set up routing in App.jsx**

Update `src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

// Placeholder pages
function DashboardPage() {
  return <div className="text-gray-500">Dashboard — coming soon</div>
}
function BoardsPage() {
  return <div className="text-gray-500">Boards — coming soon</div>
}
function CalendarPage() {
  return <div className="text-gray-500">Calendar — coming soon</div>
}
function NotesPage() {
  return <div className="text-gray-500">Notes — coming soon</div>
}
function AnalyticsPage() {
  return <div className="text-gray-500">Analytics — coming soon</div>
}
function SettingsPage() {
  return <div className="text-gray-500">Settings — coming soon</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="boards/*" element={<BoardsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

**Step 5: Clean up default Vite files**

Delete `src/App.css` (we use Tailwind, not CSS modules). Remove the logo import and any default Vite content from `src/main.jsx` — just keep:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Delete `src/assets/react.svg` and `public/vite.svg` if present.

**Step 6: Verify layout**

Run `npm run dev`. Expected: sidebar on left with Gambit logo, nav items, collapsible. Header with page title, search, avatar. Content area shows placeholder. Clicking nav items changes the route and header title. Collapsing sidebar animates to 64px icon-only mode.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add app layout with collapsible sidebar, header, and routing"
```

---

### Task 4: Kanban Board — Static Rendering

**Files:**
- Create: `src/pages/BoardsPage.jsx`
- Create: `src/components/board/BoardView.jsx`
- Create: `src/components/board/Column.jsx`
- Create: `src/components/board/Card.jsx`
- Create: `src/components/board/BoardSelector.jsx`
- Modify: `src/App.jsx` (swap placeholder for real page)

**Step 1: Create the Card component**

Create `src/components/board/Card.jsx`:

```jsx
import { Calendar, CheckSquare } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'

const priorityColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
}

const labelColors = {
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
  gray: 'bg-gray-100 text-gray-700',
}

export default function Card({ card, onClick }) {
  const checklistTotal = card.checklist?.length || 0
  const checklistDone = card.checklist?.filter((item) => item.done).length || 0
  const isOverdue = card.dueDate && isPast(new Date(card.dueDate)) && !isToday(new Date(card.dueDate))

  return (
    <div
      onClick={() => onClick?.(card.id)}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      {/* Labels */}
      {card.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((label, i) => (
            <span
              key={i}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                labelColors[label.color] || labelColors.gray
              }`}
            >
              {label.text}
            </span>
          ))}
        </div>
      )}

      {/* Title + priority */}
      <div className="flex items-start gap-2">
        <div
          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
            priorityColors[card.priority] || priorityColors.medium
          }`}
        />
        <p className="text-sm font-medium text-gray-900 leading-snug">
          {card.title}
        </p>
      </div>

      {/* Footer: due date + checklist */}
      {(card.dueDate || checklistTotal > 0) && (
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          {card.dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(card.dueDate), 'MMM d')}
            </span>
          )}
          {checklistTotal > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create the Column component**

Create `src/components/board/Column.jsx`:

```jsx
import { Plus, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import Card from './Card'
import { useBoardStore } from '../../store/boardStore'

export default function Column({ column, boardId, onCardClick }) {
  const [showAddCard, setShowAddCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const cards = useBoardStore((s) => s.cards)
  const addCard = useBoardStore((s) => s.addCard)

  const columnCards = column.cardIds
    .map((id) => cards[id])
    .filter(Boolean)

  const handleAddCard = () => {
    if (!newCardTitle.trim()) return
    addCard(boardId, column.id, { title: newCardTitle.trim() })
    setNewCardTitle('')
    setShowAddCard(false)
  }

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between px-2 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">
            {column.title}
          </h3>
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {columnCards.length}
          </span>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1 min-h-[100px]">
        {columnCards.map((card) => (
          <Card key={card.id} card={card} onClick={onCardClick} />
        ))}
      </div>

      {/* Add card */}
      {showAddCard ? (
        <div className="mt-2">
          <input
            autoFocus
            type="text"
            placeholder="Card title..."
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCard()
              if (e.key === 'Escape') setShowAddCard(false)
            }}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddCard}
              className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddCard(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddCard(true)}
          className="flex items-center gap-1 mt-2 px-2 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add card
        </button>
      )}
    </div>
  )
}
```

**Step 3: Create the BoardSelector component**

Create `src/components/board/BoardSelector.jsx`:

```jsx
import { Plus, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useBoardStore } from '../../store/boardStore'

export default function BoardSelector() {
  const boards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const addBoard = useBoardStore((s) => s.addBoard)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef(null)

  const activeBoard = boards[activeBoardId]

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCreate = () => {
    if (!newName.trim()) return
    addBoard(newName.trim())
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
      >
        {activeBoard?.name || 'Select Board'}
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
          {Object.values(boards).map((board) => (
            <button
              key={board.id}
              onClick={() => {
                setActiveBoard(board.id)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                board.id === activeBoardId
                  ? 'text-primary-600 font-medium'
                  : 'text-gray-700'
              }`}
            >
              {board.name}
            </button>
          ))}

          <div className="border-t border-gray-100 mt-1 pt-1">
            {creating ? (
              <div className="px-3 py-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Board name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') setCreating(false)
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New board
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create the BoardView component**

Create `src/components/board/BoardView.jsx`:

```jsx
import { Plus } from 'lucide-react'
import { useState } from 'react'
import Column from './Column'
import { useBoardStore } from '../../store/boardStore'

export default function BoardView({ boardId, onCardClick }) {
  const board = useBoardStore((s) => s.boards[boardId])
  const addColumn = useBoardStore((s) => s.addColumn)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  if (!board) return null

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return
    addColumn(boardId, newColumnTitle.trim())
    setNewColumnTitle('')
    setAddingColumn(false)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-10rem)]">
      {board.columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          boardId={boardId}
          onCardClick={onCardClick}
        />
      ))}

      {/* Add column */}
      {addingColumn ? (
        <div className="w-72 shrink-0">
          <input
            autoFocus
            type="text"
            placeholder="Column title..."
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddColumn()
              if (e.key === 'Escape') setAddingColumn(false)
            }}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddColumn}
              className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Add
            </button>
            <button
              onClick={() => setAddingColumn(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingColumn(true)}
          className="flex items-center gap-1 w-72 shrink-0 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100/50 hover:bg-gray-100 rounded-lg transition-colors h-fit"
        >
          <Plus className="w-4 h-4" />
          Add column
        </button>
      )}
    </div>
  )
}
```

**Step 5: Create the BoardsPage**

Create `src/pages/BoardsPage.jsx`:

```jsx
import { useState } from 'react'
import BoardSelector from '../components/board/BoardSelector'
import BoardView from '../components/board/BoardView'
import CardModal from '../components/board/CardModal'
import { useBoardStore } from '../store/boardStore'

export default function BoardsPage() {
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const [editingCardId, setEditingCardId] = useState(null)

  return (
    <div>
      <div className="mb-4">
        <BoardSelector />
      </div>

      {activeBoardId ? (
        <BoardView
          boardId={activeBoardId}
          onCardClick={setEditingCardId}
        />
      ) : (
        <p className="text-gray-500 text-sm">No boards yet. Create one to get started.</p>
      )}

      {editingCardId && (
        <CardModal
          cardId={editingCardId}
          onClose={() => setEditingCardId(null)}
        />
      )}
    </div>
  )
}
```

Note: `CardModal` is created in Task 6. For now, comment out the CardModal import and rendering so this compiles. We'll add it back in Task 6.

**Step 6: Wire BoardsPage into App.jsx**

Replace the placeholder `BoardsPage` in `src/App.jsx` with:

```jsx
import BoardsPage from './pages/BoardsPage'
```

And update the route: `<Route path="boards/*" element={<BoardsPage />} />`

**Step 7: Verify board rendering**

Run `npm run dev`, navigate to `/boards`. Expected: board selector dropdown, 4 default columns (To Do, In Progress, Review, Done), "Add card" button at bottom of each column, "Add column" button on the right. Adding a card via the inline form should work.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Kanban board with columns, cards, and board selector"
```

---

### Task 5: Card Modal — View/Edit/Delete

**Files:**
- Create: `src/components/board/CardModal.jsx`
- Modify: `src/pages/BoardsPage.jsx` (uncomment CardModal)

**Step 1: Create the CardModal component**

Create `src/components/board/CardModal.jsx`:

```jsx
import { useState, useEffect } from 'react'
import {
  X,
  Trash2,
  Calendar as CalendarIcon,
  Tag,
  CheckSquare,
  Plus,
  AlertCircle,
} from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'

const labelColorOptions = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gray']

const labelColors = {
  red: 'bg-red-100 text-red-700 border-red-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
}

export default function CardModal({ cardId, onClose }) {
  const card = useBoardStore((s) => s.cards[cardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [labels, setLabels] = useState([])
  const [checklist, setChecklist] = useState([])
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [showAddLabel, setShowAddLabel] = useState(false)

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description || '')
      setDueDate(card.dueDate || '')
      setPriority(card.priority || 'medium')
      setLabels(card.labels || [])
      setChecklist(card.checklist || [])
    }
  }, [card])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!card) return null

  const handleSave = () => {
    updateCard(cardId, {
      title: title.trim() || 'Untitled',
      description,
      dueDate: dueDate || null,
      priority,
      labels,
      checklist,
    })
    onClose()
  }

  const handleDelete = () => {
    deleteCard(cardId)
    onClose()
  }

  const handleAddLabel = () => {
    if (!newLabelText.trim()) return
    setLabels([...labels, { text: newLabelText.trim(), color: newLabelColor }])
    setNewLabelText('')
    setShowAddLabel(false)
  }

  const handleRemoveLabel = (index) => {
    setLabels(labels.filter((_, i) => i !== index))
  }

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    setChecklist([
      ...checklist,
      { id: Date.now().toString(), text: newChecklistItem.trim(), done: false },
    ])
    setNewChecklistItem('')
  }

  const handleToggleChecklistItem = (id) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    )
  }

  const handleRemoveChecklistItem = (id) => {
    setChecklist(checklist.filter((item) => item.id !== id))
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSave()
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold text-gray-900 flex-1 outline-none bg-transparent"
            placeholder="Card title"
          />
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Add a description..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Priority
            </label>
            <div className="flex gap-2 mt-2">
              {['low', 'medium', 'high'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize ${
                    priority === p
                      ? p === 'low'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : p === 'medium'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              Labels
            </label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {labels.map((label, i) => (
                <span
                  key={i}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-75 ${
                    labelColors[label.color] || labelColors.gray
                  }`}
                  onClick={() => handleRemoveLabel(i)}
                  title="Click to remove"
                >
                  {label.text} &times;
                </span>
              ))}
              {showAddLabel ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLabel()
                      if (e.key === 'Escape') setShowAddLabel(false)
                    }}
                    placeholder="Label..."
                    className="px-2 py-1 text-xs border border-gray-200 rounded w-24 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <select
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    className="px-1 py-1 text-xs border border-gray-200 rounded"
                  >
                    {labelColorOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddLabel}
                    className="text-xs text-primary-600 font-medium"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddLabel(true)}
                  className="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5" />
              Checklist
            </label>
            <div className="mt-2 space-y-1.5">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleToggleChecklistItem(item.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span
                    className={`text-sm flex-1 ${
                      item.done ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="text-gray-400 hover:text-red-500 text-xs"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddChecklistItem()
                  }}
                  placeholder="Add checklist item..."
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={handleAddChecklistItem}
                  className="px-2 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Uncomment CardModal in BoardsPage**

Ensure `src/pages/BoardsPage.jsx` imports and renders `CardModal` (see Task 4 step 5 — just uncomment the import and JSX).

**Step 3: Verify**

Run `npm run dev`, go to `/boards`, add a card, click it. Expected: modal opens with editable title, description, priority buttons, due date, labels, checklist. Save/close/delete all work. Escape key closes modal.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add card detail modal with edit, labels, checklist, priority, due date"
```

---

### Task 6: Kanban Drag-and-Drop

**Files:**
- Modify: `src/components/board/BoardView.jsx`
- Modify: `src/components/board/Column.jsx`
- Modify: `src/components/board/Card.jsx`

**Step 1: Add DnD context to BoardView**

Update `src/components/board/BoardView.jsx` to wrap columns in a DndContext and handle drag events:

```jsx
import { Plus } from 'lucide-react'
import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import Column from './Column'
import Card from './Card'
import { useBoardStore } from '../../store/boardStore'

export default function BoardView({ boardId, onCardClick }) {
  const board = useBoardStore((s) => s.boards[boardId])
  const cards = useBoardStore((s) => s.cards)
  const moveCard = useBoardStore((s) => s.moveCard)
  const addColumn = useBoardStore((s) => s.addColumn)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [activeCardId, setActiveCardId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  if (!board) return null

  // Find which column a card belongs to
  const findColumnByCardId = (cardId) => {
    return board.columns.find((col) => col.cardIds.includes(cardId))
  }

  const handleDragStart = (event) => {
    setActiveCardId(event.active.id)
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    const fromCol = findColumnByCardId(activeId)
    // over could be a card or a column
    let toCol = findColumnByCardId(overId)
    if (!toCol) {
      // overId is a column id
      toCol = board.columns.find((c) => c.id === overId)
    }

    if (!fromCol || !toCol || fromCol.id === toCol.id) return

    const fromIndex = fromCol.cardIds.indexOf(activeId)
    const toIndex = toCol.cardIds.indexOf(overId)

    moveCard(
      boardId,
      fromCol.id,
      toCol.id,
      fromIndex,
      toIndex === -1 ? toCol.cardIds.length : toIndex
    )
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveCardId(null)
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const col = findColumnByCardId(activeId)
    if (!col) return

    const overCol = findColumnByCardId(overId)
    if (!overCol || col.id !== overCol.id) return

    // Reorder within same column
    const fromIndex = col.cardIds.indexOf(activeId)
    const toIndex = col.cardIds.indexOf(overId)

    if (fromIndex !== toIndex) {
      moveCard(boardId, col.id, col.id, fromIndex, toIndex)
    }
  }

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return
    addColumn(boardId, newColumnTitle.trim())
    setNewColumnTitle('')
    setAddingColumn(false)
  }

  const activeCard = activeCardId ? cards[activeCardId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-10rem)]">
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            boardId={boardId}
            onCardClick={onCardClick}
          />
        ))}

        {/* Add column */}
        {addingColumn ? (
          <div className="w-72 shrink-0">
            <input
              autoFocus
              type="text"
              placeholder="Column title..."
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddColumn()
                if (e.key === 'Escape') setAddingColumn(false)
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddColumn}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Add
              </button>
              <button
                onClick={() => setAddingColumn(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingColumn(true)}
            className="flex items-center gap-1 w-72 shrink-0 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100/50 hover:bg-gray-100 rounded-lg transition-colors h-fit"
          >
            <Plus className="w-4 h-4" />
            Add column
          </button>
        )}
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="rotate-3 opacity-90">
            <Card card={activeCard} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
```

**Step 2: Make Column a droppable**

Update `src/components/board/Column.jsx` — wrap the cards area with `useDroppable` and wrap each card with `SortableContext`:

```jsx
import { Plus, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableCard from './SortableCard'
import { useBoardStore } from '../../store/boardStore'

export default function Column({ column, boardId, onCardClick }) {
  const [showAddCard, setShowAddCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const cards = useBoardStore((s) => s.cards)
  const addCard = useBoardStore((s) => s.addCard)

  const { setNodeRef } = useDroppable({ id: column.id })

  const columnCards = column.cardIds
    .map((id) => cards[id])
    .filter(Boolean)

  const handleAddCard = () => {
    if (!newCardTitle.trim()) return
    addCard(boardId, column.id, { title: newCardTitle.trim() })
    setNewCardTitle('')
    setShowAddCard(false)
  }

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between px-2 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">
            {column.title}
          </h3>
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {columnCards.length}
          </span>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Cards */}
      <SortableContext
        items={column.cardIds}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="flex flex-col gap-2 flex-1 min-h-[100px] p-1 rounded-lg"
        >
          {columnCards.map((card) => (
            <SortableCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </div>
      </SortableContext>

      {/* Add card */}
      {showAddCard ? (
        <div className="mt-2">
          <input
            autoFocus
            type="text"
            placeholder="Card title..."
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCard()
              if (e.key === 'Escape') setShowAddCard(false)
            }}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddCard}
              className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddCard(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddCard(true)}
          className="flex items-center gap-1 mt-2 px-2 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add card
        </button>
      )}
    </div>
  )
}
```

**Step 3: Create SortableCard wrapper**

Create `src/components/board/SortableCard.jsx`:

```jsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Card from './Card'

export default function SortableCard({ card, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card card={card} onClick={onClick} />
    </div>
  )
}
```

**Step 4: Verify drag-and-drop**

Run `npm run dev`, go to `/boards`, add several cards across columns. Drag a card from one column to another. Drag to reorder within a column. Expected: smooth drag with overlay, cards snap into place, state persists on refresh.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add drag-and-drop for Kanban cards with @dnd-kit"
```

---

### Task 7: Dashboard Page

**Files:**
- Create: `src/pages/DashboardPage.jsx`
- Modify: `src/App.jsx` (swap placeholder)

**Step 1: Create the DashboardPage**

Create `src/pages/DashboardPage.jsx`:

```jsx
import { useBoardStore } from '../store/boardStore'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo,
  ArrowRight,
} from 'lucide-react'
import { isToday, isPast, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const cards = useBoardStore((s) => s.cards)
  const boards = useBoardStore((s) => s.boards)
  const navigate = useNavigate()

  const allCards = Object.values(cards)
  const totalTasks = allCards.length

  // "Completed" = cards in any column titled "Done" (case-insensitive)
  const doneCardIds = new Set()
  Object.values(boards).forEach((board) => {
    board.columns.forEach((col) => {
      if (col.title.toLowerCase() === 'done') {
        col.cardIds.forEach((id) => doneCardIds.add(id))
      }
    })
  })

  const completedToday = allCards.filter(
    (c) => doneCardIds.has(c.id) && c.updatedAt && isToday(new Date(c.updatedAt))
  ).length

  const overdue = allCards.filter(
    (c) =>
      c.dueDate &&
      isPast(new Date(c.dueDate)) &&
      !isToday(new Date(c.dueDate)) &&
      !doneCardIds.has(c.id)
  ).length

  const inProgress = allCards.filter((c) => !doneCardIds.has(c.id)).length

  const recentCards = [...allCards]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 8)

  const statCards = [
    {
      label: 'Total Tasks',
      value: totalTasks,
      icon: ListTodo,
      color: 'text-primary-600 bg-primary-50',
    },
    {
      label: 'In Progress',
      value: inProgress,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      label: 'Completed Today',
      value: completedToday,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Overdue',
      value: overdue,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Recent Activity
          </h2>
          <button
            onClick={() => navigate('/boards')}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View boards <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {recentCards.length === 0 ? (
          <p className="text-sm text-gray-500">
            No tasks yet. Go to Boards to create your first task.
          </p>
        ) : (
          <div className="space-y-3">
            {recentCards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      card.priority === 'high'
                        ? 'bg-red-500'
                        : card.priority === 'low'
                        ? 'bg-green-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                  <span className="text-sm text-gray-700">{card.title}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {format(new Date(card.updatedAt), 'MMM d, h:mm a')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Wire into App.jsx**

Import and use `DashboardPage` in the route.

**Step 3: Verify and commit**

```bash
git add -A
git commit -m "feat: add dashboard page with stats cards and recent activity"
```

---

### Task 8: Calendar Page

**Files:**
- Create: `src/pages/CalendarPage.jsx`
- Modify: `src/App.jsx`

**Step 1: Create CalendarPage**

Create `src/pages/CalendarPage.jsx`:

```jsx
import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useBoardStore } from '../store/boardStore'

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const cards = useBoardStore((s) => s.cards)
  const [selectedDate, setSelectedDate] = useState(null)

  const allCards = Object.values(cards)
  const cardsWithDates = allCards.filter((c) => c.dueDate)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getCardsForDay = (day) =>
    cardsWithDates.filter((c) => isSameDay(new Date(c.dueDate), day))

  const selectedDayCards = selectedDate ? getCardsForDay(selectedDate) : []

  return (
    <div className="flex gap-6">
      {/* Calendar grid */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5">
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
          {days.map((day) => {
            const dayCards = getCardsForDay(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`bg-white p-2 min-h-[80px] text-left hover:bg-gray-50 transition-colors ${
                  !isSameMonth(day, currentMonth) ? 'opacity-40' : ''
                } ${isSelected ? 'ring-2 ring-primary-500 ring-inset' : ''}`}
              >
                <span
                  className={`text-sm font-medium ${
                    isToday(day)
                      ? 'bg-primary-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                      : 'text-gray-700'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayCards.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayCards.slice(0, 2).map((card) => (
                      <div
                        key={card.id}
                        className="text-xs text-gray-600 truncate bg-primary-50 px-1.5 py-0.5 rounded"
                      >
                        {card.title}
                      </div>
                    ))}
                    {dayCards.length > 2 && (
                      <div className="text-xs text-gray-400">
                        +{dayCards.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <div className="w-72 bg-white rounded-xl border border-gray-200 p-5 h-fit">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {format(selectedDate, 'EEEE, MMM d')}
          </h3>
          {selectedDayCards.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks due</p>
          ) : (
            <div className="space-y-2">
              {selectedDayCards.map((card) => (
                <div
                  key={card.id}
                  className="p-2.5 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        card.priority === 'high'
                          ? 'bg-red-500'
                          : card.priority === 'low'
                          ? 'bg-green-500'
                          : 'bg-yellow-500'
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {card.title}
                    </span>
                  </div>
                  {card.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {card.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Wire into App.jsx, verify, commit**

```bash
git add -A
git commit -m "feat: add calendar page with month grid and task display"
```

---

### Task 9: Notes Page + Store

**Files:**
- Create: `src/store/noteStore.js`
- Create: `src/pages/NotesPage.jsx`
- Modify: `src/App.jsx`

**Step 1: Create the note store**

Create `src/store/noteStore.js`:

```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

export const useNoteStore = create(
  persist(
    (set, get) => ({
      notes: {},

      addNote: (title) => {
        const note = {
          id: nanoid(),
          title: title || 'Untitled',
          content: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({
          notes: { ...state.notes, [note.id]: note },
        }))
        return note.id
      },

      updateNote: (noteId, updates) =>
        set((state) => ({
          notes: {
            ...state.notes,
            [noteId]: {
              ...state.notes[noteId],
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      deleteNote: (noteId) =>
        set((state) => {
          const { [noteId]: _, ...rest } = state.notes
          return { notes: rest }
        }),

      getAllNotes: () => Object.values(get().notes),
    }),
    { name: 'gambit-notes' }
  )
)
```

**Step 2: Create the NotesPage**

Create `src/pages/NotesPage.jsx`:

```jsx
import { useState } from 'react'
import { Plus, Trash2, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useNoteStore } from '../store/noteStore'

export default function NotesPage() {
  const notes = useNoteStore((s) => s.notes)
  const addNote = useNoteStore((s) => s.addNote)
  const updateNote = useNoteStore((s) => s.updateNote)
  const deleteNote = useNoteStore((s) => s.deleteNote)
  const [activeNoteId, setActiveNoteId] = useState(null)

  const noteList = Object.values(notes).sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  )

  const activeNote = activeNoteId ? notes[activeNoteId] : null

  const handleNewNote = () => {
    const id = addNote('Untitled Note')
    setActiveNoteId(id)
  }

  const handleDelete = (id) => {
    deleteNote(id)
    if (activeNoteId === id) setActiveNoteId(null)
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-10rem)]">
      {/* Notes list */}
      <div className="w-72 bg-white rounded-xl border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
          <button
            onClick={handleNewNote}
            className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {noteList.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No notes yet</p>
          ) : (
            noteList.map((note) => (
              <button
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${
                  activeNoteId === note.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {note.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(note.id)
                    }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      {activeNote ? (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) =>
                updateNote(activeNoteId, { title: e.target.value })
              }
              className="text-lg font-semibold text-gray-900 outline-none w-full bg-transparent"
              placeholder="Note title"
            />
            <p className="text-xs text-gray-400 mt-1">
              Last edited {format(new Date(activeNote.updatedAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          <textarea
            value={activeNote.content}
            onChange={(e) =>
              updateNote(activeNoteId, { content: e.target.value })
            }
            className="flex-1 p-4 text-sm text-gray-700 outline-none resize-none leading-relaxed"
            placeholder="Start writing..."
          />
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Select a note or create a new one
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Wire into App.jsx, verify, commit**

```bash
git add -A
git commit -m "feat: add notes page with create, edit, delete"
```

---

### Task 10: Analytics Page

**Files:**
- Create: `src/pages/AnalyticsPage.jsx`
- Modify: `src/App.jsx`

**Step 1: Create the AnalyticsPage**

Create `src/pages/AnalyticsPage.jsx`:

```jsx
import { useBoardStore } from '../store/boardStore'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { format, subDays, isSameDay } from 'date-fns'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280']

export default function AnalyticsPage() {
  const cards = useBoardStore((s) => s.cards)
  const boards = useBoardStore((s) => s.boards)

  const allCards = Object.values(cards)

  // Tasks by board
  const tasksByBoard = Object.values(boards).map((board) => ({
    name: board.name,
    value: board.columns.reduce((sum, col) => sum + col.cardIds.length, 0),
  }))

  // Tasks by label
  const labelCounts = {}
  allCards.forEach((card) => {
    card.labels?.forEach((label) => {
      labelCounts[label.text] = (labelCounts[label.text] || 0) + 1
    })
  })
  const tasksByLabel = Object.entries(labelCounts).map(([name, value]) => ({
    name,
    value,
  }))

  // Tasks by priority
  const priorityCounts = { low: 0, medium: 0, high: 0 }
  allCards.forEach((card) => {
    priorityCounts[card.priority || 'medium']++
  })
  const tasksByPriority = Object.entries(priorityCounts).map(
    ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })
  )

  // Tasks created over last 14 days
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(new Date(), 13 - i)
    const count = allCards.filter((c) =>
      isSameDay(new Date(c.createdAt), day)
    ).length
    return { date: format(day, 'MMM d'), tasks: count }
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks over time */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Tasks Created (Last 14 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={last14Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="tasks"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks by board */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Tasks by Board
          </h3>
          {tasksByBoard.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={tasksByBoard}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {tasksByBoard.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tasks by priority */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Tasks by Priority
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tasksByPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {tasksByPriority.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.name === 'High'
                        ? '#ef4444'
                        : entry.name === 'Medium'
                        ? '#f59e0b'
                        : '#10b981'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks by label */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Tasks by Label
          </h3>
          {tasksByLabel.length === 0 ? (
            <p className="text-sm text-gray-500">No labels yet. Add labels to your cards to see stats.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tasksByLabel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Wire into App.jsx, verify, commit**

```bash
git add -A
git commit -m "feat: add analytics page with charts for tasks, priorities, labels"
```

---

### Task 11: Settings Page

**Files:**
- Create: `src/pages/SettingsPage.jsx`
- Modify: `src/App.jsx`

**Step 1: Create the SettingsPage**

Create `src/pages/SettingsPage.jsx`:

```jsx
import { useState } from 'react'
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import { useNoteStore } from '../store/noteStore'
import { useSettingsStore } from '../store/settingsStore'

export default function SettingsPage() {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState(null)

  const handleExport = () => {
    const data = {
      boards: localStorage.getItem('gambit-boards'),
      notes: localStorage.getItem('gambit-notes'),
      settings: localStorage.getItem('gambit-settings'),
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gambit-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        if (data.boards) localStorage.setItem('gambit-boards', data.boards)
        if (data.notes) localStorage.setItem('gambit-notes', data.notes)
        if (data.settings)
          localStorage.setItem('gambit-settings', data.settings)
        setImportStatus('success')
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        setImportStatus('error')
      }
    }
    reader.readAsText(file)
  }

  const handleClearAll = () => {
    localStorage.removeItem('gambit-boards')
    localStorage.removeItem('gambit-notes')
    localStorage.removeItem('gambit-settings')
    window.location.reload()
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Export Data
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Download all your boards, cards, and notes as a JSON file.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          <Download className="w-4 h-4" />
          Export Backup
        </button>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Import Data
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Restore from a previously exported backup file. This will replace all
          current data.
        </p>
        <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 cursor-pointer w-fit">
          <Upload className="w-4 h-4" />
          Import Backup
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
        {importStatus === 'success' && (
          <p className="text-sm text-green-600 mt-2">
            Import successful! Reloading...
          </p>
        )}
        {importStatus === 'error' && (
          <p className="text-sm text-red-600 mt-2">
            Failed to import. Invalid file format.
          </p>
        )}
      </div>

      {/* Clear data */}
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <h3 className="text-sm font-semibold text-red-600 mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete all boards, cards, notes, and settings. This cannot
          be undone.
        </p>
        {showClearConfirm ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Yes, delete everything
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Wire into App.jsx, verify, commit**

```bash
git add -A
git commit -m "feat: add settings page with export, import, and clear data"
```

---

### Task 12: Final App.jsx Wiring + Polish

**Files:**
- Modify: `src/App.jsx` (final version with all real page imports)

**Step 1: Final App.jsx**

Update `src/App.jsx` with all real page imports, removing all placeholder components:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import BoardsPage from './pages/BoardsPage'
import CalendarPage from './pages/CalendarPage'
import NotesPage from './pages/NotesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="boards/*" element={<BoardsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

**Step 2: Full end-to-end verification**

Run `npm run dev` and verify all pages:

1. **Dashboard** (`/`): Stats cards show, recent activity works
2. **Boards** (`/boards`): Board selector, columns, add card, card modal, drag-and-drop
3. **Calendar** (`/calendar`): Month grid, task dots, day selection panel
4. **Notes** (`/notes`): Create/edit/delete notes, editor works
5. **Analytics** (`/analytics`): Charts render (may be empty until data exists)
6. **Settings** (`/settings`): Export/import/clear buttons work
7. **Sidebar**: Collapse/expand works, active states highlight correctly
8. **Persistence**: Refresh page — all data persists

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: wire all pages into final app routing"
```

---

## Summary

| Task | Description | Est. Steps |
|------|------------|-----------|
| 1 | Project scaffolding (Vite + React + Tailwind) | 8 |
| 2 | Zustand stores (boards, cards, settings) | 4 |
| 3 | Layout shell (sidebar, header, app layout, routing) | 7 |
| 4 | Kanban board static rendering (columns, cards, board selector) | 8 |
| 5 | Card modal (view/edit/delete) | 4 |
| 6 | Drag-and-drop (@dnd-kit integration) | 5 |
| 7 | Dashboard page | 3 |
| 8 | Calendar page | 2 |
| 9 | Notes page + store | 3 |
| 10 | Analytics page | 2 |
| 11 | Settings page | 2 |
| 12 | Final wiring + verification | 3 |
