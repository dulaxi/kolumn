# Kolumn — Project Context (development branch)

> **Branch-scoped CLAUDE.md.** This file is tuned for the `development` branch
> and its current focus: polishing and re-architecting the AI workflow. The
> `master` branch has its own broader CLAUDE.md. If you're starting a session
> on a different branch, the contents below may not reflect that branch's
> priorities.

## What this is

Kolumn is a Kanban-first project management app with an AI agent layered on top.
Users manage cards/boards via classic drag-and-drop, OR via a chat sidebar where
Claude operates the same data model through tools.

Stack: **React 19 + Vite 7 + Tailwind v4 + Supabase (Postgres, Auth, Realtime,
Edge Functions) + Anthropic Claude API**.

## Active focus (May 2026, development branch)

**Board Builder.** A new top-level feature being scoped on this branch. Known
shape so far:

- Sidebar tab labeled **"Builder"** using the Phosphor `Blueprint` icon
- Standalone page at the route `/build`
- Sibling to the existing top-level tabs (Search, Chats, Workspace dropdown)

**What it *does* is not yet designed.** Start with a brainstorming pass
(`superpowers:brainstorming`) before touching code — the name "Board Builder"
hints at a structured way to compose a board (templates? AI-assisted
generation? Visual wireframing of columns + card types?), but those are
guesses, not requirements. Get the user to nail down the actual feature
before scaffolding the route or sidebar slot.

The [AI Workflow](#ai-workflow-paused--backlog-preserved) section below is
**paused, not abandoned.** Everything in that backlog (closing the tool-result
loop, prompt caching split, persisting conversations, model ID consolidation,
`classifyModel()` resolution, telemetry) is still real work to do — just not
the active surface. Don't touch AI files except in passing.

**Recent context** (just landed before the focus shift):

- The Workspace dropdown was redesigned into a three-state selector with a
  tight icon vocabulary that future workspace-adjacent work should respect.
  See [Coherency Rules](#coherency-rules) → "Workspace icon vocabulary."
- Bottom-left of the sidebar now shows `display_name` + capitalized `tier` in
  a two-line block (replaces the prior single-line name + caret). The
  `profile.tier` field is the source of truth (`'free' | 'pro' | 'team'`).

UI coherency rules (claude.ai-style: restrained, lime accent, Mona Sans + serif,
1px borders, 8–12px radius) still apply. If Builder introduces new icons,
prefer extending the existing Phosphor vocabulary already in use over importing
new symbols.

Bias: prefer extending an existing pattern over inventing a new one.

## Commands

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build (port 4173)
npm run lint         # ESLint
npm run test         # Vitest, single run
npm run test:watch   # Vitest, watch mode
```

## Tech stack

- **React 19** + react-router-dom v7
- **Vite 7** + `@tailwindcss/vite` (Tailwind v4)
- **Zustand** for state — most stores hit Supabase, only `settingsStore` persists locally
- **Supabase** — Postgres + Auth + Realtime + Edge Functions
- **@dnd-kit/core + @dnd-kit/sortable** — drag-and-drop
- **react-hot-toast** — toast system (see Design System → Toasts)
- **@phosphor-icons/react** — primary icon library (see Coherency Rules)
- **react-markdown + remark-gfm** — chat message rendering
- **zod** — runtime validation
- **motion** — selective animation
- **date-fns**, **nanoid**
- **@sentry/react** — error tracking
- **posthog-js** — product analytics
- **Vitest + @testing-library/react + jsdom** — test infrastructure (~25 test files in `src/__tests__/`)

## Architecture

```
src/
├── main.jsx                        # Entry, font imports, auth init
├── App.jsx                         # Router + global Toaster (top-center) + UndoListener
├── index.css                       # @theme tokens, light/dark CSS vars, scrollbar, animations
├── lib/
│   ├── supabase.js                 # Supabase client singleton
│   └── migrateLocalData.js         # Legacy localStorage → Supabase migration
├── store/                          # Zustand stores
│   ├── authStore.js                # User, session, profile
│   ├── boardStore.js               # Boards, columns, cards + realtime subscriptions
│   ├── boardSharingStore.js        # Per-board members + invitations
│   ├── workspacesStore.js          # Multi-tenant workspaces + members + invitations
│   ├── chatStore.js                # AI chat threads + messages + tool calls
│   ├── noteStore.js                # Private notes — ⚠️ unwired from UI (see "Removed pages")
│   ├── notificationStore.js        # In-app notifications
│   ├── templateStore.js            # Board/card templates
│   ├── settingsStore.js            # Local-only: sidebar, theme, font
│   └── selectors.js                # Cross-store derived selectors
├── components/
│   ├── ui/                         # Design-system primitives — see Design System → Primitives
│   │   ├── Avatar.jsx              # Initials avatar, hash-derived color, 4 sizes
│   │   ├── Button.jsx              # 5 variants × 6 sizes, loading + asChild support
│   │   ├── Input.jsx + Textarea.jsx # Bordered fields, leading-icon + error states
│   │   ├── Modal.jsx               # Portal, focus trap, body scroll lock, stacked-modal aware
│   │   ├── Popover.jsx             # Anchored overlay with click-outside + escape
│   │   ├── Menu.jsx                # Popover + Item/Divider/Label sub-components
│   │   ├── Tooltip.jsx             # Hover/focus tip — replaces title= attributes
│   │   └── Skeleton.jsx            # Default + ai-shimmer tones
│   ├── auth/ProtectedRoute.jsx
│   ├── chat/                       # Chat UI (message list, composer, tool-call cards)
│   ├── workspace/                  # Workspace switcher, settings, member list
│   ├── layout/                     # AppLayout, Sidebar, Header, OfflineBanner
│   ├── board/                      # Board, columns, cards, detail panel, modals
│   ├── ActionCard.jsx              # AI-suggested action card
│   ├── SearchDialog.jsx            # ⌘K search
│   ├── ErrorBoundary.jsx + InlineErrorBoundary.jsx
│   └── ...
├── pages/
│   ├── LandingPage.jsx             # Marketing / public landing
│   ├── LoginPage / SignupPage / ForgotPasswordPage / UpdatePasswordPage
│   ├── DashboardPage.jsx
│   ├── BoardsPage.jsx              # Primary kanban view
│   ├── ChatPage.jsx + ChatListPage.jsx
│   ├── WorkspacePage.jsx
│   ├── SettingsPage.jsx
│   ├── NotFoundPage.jsx
│   └── CalendarPage.jsx + NotesPage.jsx  # ⚠️ unwired — see "Removed pages" note
├── utils/
│   ├── formatting.js               # LABEL_BG, PRIORITY_DOT, AVATAR_COLORS class strings
│   ├── toast.js                    # showToast.{success|error|delete|...} helpers
│   ├── logger.js                   # Sentry wrapper
│   └── ...
└── __tests__/                      # Vitest specs

supabase/
├── config.toml                     # Local Supabase CLI config
├── schema.sql                      # Tables, triggers, RLS
├── migrations/                     # Versioned SQL migrations
└── functions/
    └── chat/                       # AI agent edge function
        ├── index.ts                # Entry — auth, tier check, Claude API stream
        ├── context.ts              # Builds system prompt from user's boards/cards
        ├── tools.ts                # 18 tool definitions (create_card, move_card, …)
        ├── tier.ts                 # Free/Pro gating + per-tool access list + daily limit
        └── stream.ts               # SSE writer
```

### Removed pages (intentional, do not re-wire)

`CalendarPage.jsx`, `NotesPage.jsx`, and `noteStore.js` are unused from
the dashboard UI. They were removed deliberately to sharpen the product
focus to "AI-powered kanban" — every PM tool has notes/calendar; trying
to compete there meant being a worse Notion / worse Google Calendar.

The page files, store, and Supabase `notes` table are left in place so a
future revival is a one-line route restoration. Do **not** re-add Notes
to the sidebar or routes without explicit user confirmation.

If a calendar comes back, the right shape is a **board view toggle**
(month/week grid of cards with `due_date`) alongside the column view —
not a top-level Calendar nav item.

## AI Workflow (paused — backlog preserved)

> The Claude agent **was** the active rework target until the focus shifted to
> Board Builder (see [Active focus](#active-focus-may-2026-development-branch)).
> Everything below is still accurate and the backlog at the end is still real
> work — but touch these files only when Builder requires it. If you find
> yourself making non-trivial changes here without an explicit request,
> stop and re-read the active focus section.

### Two AI surfaces, not one

Kolumn has **two** distinct AI surfaces with different jobs. This is the most
important architectural rule on this branch — conflating them is the source of
most past confusion.

| Surface | Where | Job | Tools? |
|---------|-------|-----|--------|
| **Pill** (`QuickAddBar.jsx`) | Mounted on board pages, takes `boardId` prop | The **action** surface. Type intent → AI fires write tools scoped to **this** board. The pill forces `board: boardName` into every tool call. | Yes — write tools, per tier. |
| **Chat** (`ChatPage.jsx`, `/chat`) | Standalone chat route | The **conversation** surface. Discuss what exists, ask questions, get summaries. | **None for free.** Read-only (`search_cards`, `summarize_board`) for paid tiers. |

Single Anthropic endpoint serves both. Backend distinguishes callers via a
`mode` parameter on the request (`'pill' | 'chat'`) and computes the effective
tool list from `(mode × tier)` **server-side**. The client identifies itself;
the server enforces. Never trust the client to filter tools.

Pills on other pages (dashboard, workspace, etc.) are out of scope for now.

### Where AI lives — the complete surface

There is **exactly one** Claude API call in the codebase, and it lives in a
Supabase Edge Function. Everything else is plumbing around it.

| Layer | File | Lines | Role |
|-------|------|-------|------|
| Edge — handler | `supabase/functions/chat/index.ts` | ~180 | Auth → tier check → context build → Claude API stream → SSE re-emit. **Only file that talks to Anthropic.** |
| Edge — system prompt | `supabase/functions/chat/context.ts` | ~130 | Fetches user's boards/columns/cards/notes/members via 6 parallel Supabase queries and assembles a ~1,500-word system prompt. **One template today; needs to branch by `mode`.** |
| Edge — tools | `supabase/functions/chat/tools.ts` | ~280 | 18 tool definitions (schema only; execution happens in the browser). |
| Edge — tier/model | `supabase/functions/chat/tier.ts` | ~80 | Rate limit, per-tool gating, model selection. Hardcodes the model ID in four places. **Needs to extend gating to the `(mode × tier)` matrix.** |
| Edge — SSE infra | `supabase/functions/chat/stream.ts` | ~40 | `SSEWriter` wrapper around a `ReadableStream`. |
| Frontend — pill | `src/components/board/QuickAddBar.jsx` | ~155 | **The action surface.** Mounted per board, forces `board: boardName` into every tool call. Has a fast path that splits comma/newline input and skips the LLM. |
| Frontend — chat page | `src/pages/ChatPage.jsx`, `ChatListPage.jsx`, `src/components/chat/*` | ~350 total | The conversation surface. Bubbles, composer, markdown rendering. **Currently shares the tool-execution path with the pill — needs to stop firing write tools.** |
| Frontend — client | `src/lib/aiClient.js` | ~95 | `fetch` to `/functions/v1/chat`; SSE parser; dispatches `onText / onTier / onToolCall / onDone / onError`. **Needs to forward a `mode` parameter.** |
| Frontend — store | `src/store/chatStore.js` | ~190 | Zustand: conversations, messages, tierInfo, streaming state. **Conversations live in localStorage only.** Used by ChatPage; pill bypasses it. |
| Frontend — tool executor | `src/lib/toolExecutor.js` | ~380 | Fuzzy title→ID resolver, calls boardStore/noteStore. Has a **4-second polling loop** waiting for backend to confirm temp IDs. `search_cards` and `summarize_board` exist as no-op placeholders (lines 372–374). |

Not AI despite the names: `src/components/ActionCard.jsx` (presentational only),
`supabase/functions/check-email/` (signup email validation).

### The Claude call (current state)

- **Model:** `claude-haiku-4-5-20251001` — hardcoded in `tier.ts` four times. **No central constant yet** (T2-#5 below).
- **Streaming:** native Anthropic SSE → parsed in `index.ts` → re-emitted as our own SSE protocol (`type: text|tier|tool_call|done|error`).
- **Caching:** `cache_control: { type: "ephemeral" }` on the full system prompt. Tools array and message history are uncached. **No cache-hit telemetry** (T2-#7).
- **Not in use:** extended thinking, batch API, files API, vision, retries, fallback model.
- **History window:** last 20 messages, sliced naively in `chatStore.sendMessage` — can orphan a `tool_use` from its `tool_result` (T3-#8).

### System prompt anatomy (`context.ts`)

Built fresh on every message. Concatenated in this order:

1. Static persona (`"You are Kolumn, a sharp project management assistant…"`)
2. User name, today's date, workspace + team member list
3. Every board → its columns → first 10 card titles per column
4. Overdue + due-today alerts
5. Activity counts (last 7 days)
6. All notes (first 200 chars each) — **note: notes UI is unwired, see Removed pages**
7. Hardcoded Phosphor icon allow-list (~80 names)
8. 18 hand-written instruction rules

**Cacheability rule when editing this file:** keep static text (persona, rules,
icon list, anything user-agnostic) at the top, volatile data (boards, alerts,
activity) at the bottom. The split exists conceptually but is not yet enforced
with separate `cache_control` blocks (T2-#4).

### Tools (18 total — schema in `tools.ts`)

| Group | Tools |
|-------|-------|
| Cards | `create_card`, `move_card`, `update_card`, `delete_card`, `duplicate_card` |
| Batch cards | `move_cards`, `update_cards`, `complete_cards` |
| Card details | `toggle_checklist` |
| Boards | `create_board`, `update_board`, `delete_board` |
| Columns | `add_column`, `delete_column` |
| Members | `invite_member`, `remove_member` |
| Notes ⚠️ | `create_note`, `update_note` — UI is unwired; tools still exposed (T3-#11) |

**Critical:** the tool-call loop is **not closed**. When Claude emits a `tool_use`,
the edge function streams it to the browser, the browser executes it against
Zustand + Supabase, and the result is **never reported back to the model**. Multi-step
requests ("create a board then add 5 cards") can desync silently. Don't add a new
tool without a plan for how its outcome reaches the model on the next turn (T1-#1).

### Tier & gating (`tier.ts`)

Tier names below are placeholders — the tier system is being redesigned (see
the `Tier system` note in this file). The principle is what matters: tools are
gated by **(surface × tier)**, not just tier.

| Surface × tier | Free | Pro / Teams |
|----------------|------|-------------|
| **Pill** (write side) | 3 create_* tools | All 18 write tools |
| **Chat** (read side) | None — pure text Q&A | `search_cards`, `summarize_board` (read-only) |

- Daily message limit (currently 20 for free) lives in `tier.ts` and increments via the `increment_chat_usage` RPC. If that RPC errors, the function 500s with no fallback.
- `classifyModel(message, tier)` exists and returns Haiku in **both** branches — dead code that pretends to route by intent. Decide: actually branch (Sonnet for complex writes, Haiku for reads) or delete the path (T2-#6).
- **Destructive vs Pro-only drift:** the frontend's destructive-confirmation list (`isDestructive()` in `toolExecutor.js`) and the backend's `PRO_ONLY_TOOLS` list don't match. Free users can't even reach the confirmation UI for deletes (already blocked server-side), but Pro users get an in-chat approval. Pick one source of truth (T3-#10).
- **Read-only tools are no-op placeholders today** — `search_cards` and `summarize_board` return `{ ok: true, readOnly: true }` and do nothing. They need real implementations before the chat surface ships its read-tools feature.

### Rework backlog (ranked — read before changing AI code)

Full details: `docs/superpowers/specs/2026-05-13-ai-workflow-rework-backlog.md`.

**T1 — architecture & correctness:**
1. **Implement the `mode` parameter** end-to-end (`aiClient.js` → `index.ts` → `tier.ts`). Backend computes effective tool list from `(mode × tier)`. Without this, the pill/chat split is policy, not enforcement.
2. **Strip write tools from the chat path.** ChatPage must not be able to mutate state via the model. Belt-and-suspenders with T1-#1.
3. **Close the tool-result loop.** After the browser executes a tool, follow up with a `tool_result` content block so the model can react to failures and chain steps reliably.
4. **Persist conversations to Supabase.** Tables `chat_threads` and `chat_messages` already exist in `supabase/schema.sql`. Current localStorage-only history dies when the user clears cookies or switches devices.
5. **Replace the 4s temp-ID polling in `toolExecutor.js`** with the existing realtime subscription in `boardStore`.

**T2 — cost, latency, instrumentation:**
6. **Branch the system prompt by `mode`.** Pill prompt: short, action-focused, board context pinned. Chat prompt: full read-only context with Q&A framing. Today one prompt serves both.
7. **Split each prompt** into a cached static prefix and an uncached dynamic tail. Today any card edit invalidates the entire cache.
8. **Centralize the model ID** into one `MODEL` constant at the top of `tier.ts` (or a new `model.ts`).
9. **Resolve `classifyModel()`** — branch it for real or delete it.
10. **Log Anthropic usage fields** (`input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens`) so we can see whether caching actually fires.

**T3 — UX, cleanup, parity:**
11. **Implement `search_cards` and `summarize_board`** as real read-only tools for the chat surface (currently no-op placeholders).
12. **Verify pill fast-path parity.** QuickAddBar's comma/newline split path bypasses the LLM — make sure it applies the same defaults the LLM path produces.
13. **Token-budget history** instead of "last 20 messages"; never trim a `tool_use` away from its paired `tool_result`.
14. **Resolve cards by ID** for cross-card lookups (move, update). Pill writes are already board-pinned, but card titles within a board can still collide.
15. **Reconcile destructive vs pro-only** so the two lists don't drift (see Tier & gating above).
16. **Drop unwired note tools** until the notes UI returns. They bloat the prompt and tempt the model into dead-end actions.

### AI-specific conventions

- **One Claude entry point.** All Anthropic API calls live in `supabase/functions/chat/index.ts`. There is no `ANTHROPIC_API_KEY` in the frontend and there shouldn't be. If you find yourself wanting a second AI surface, propose it first.
- **Model IDs:** never hardcode in source files. Once T2-#5 lands, import the `MODEL` constant. Until then, if you touch a hardcoded model string, fix them all in the same change.
- **New tools require a result-reporting plan.** A tool that returns nothing to the model is a footgun. Document how the outcome reaches the next turn (via `tool_result`, refreshed context, or both).
- **System prompt ordering:** static prefix first, volatile tail last. Don't sprinkle dates, IDs, or counts into the static prefix.
- **Telemetry:** prefer `src/utils/logger.js` over ad-hoc `console.log` for anything you want to survive into production. The edge function logs go to Supabase function logs — readable via `supabase functions logs chat` or the MCP `get_logs` tool.
- **Schema source of truth:** the Anthropic API. When checking caching or extended-thinking behavior, use the `claude-api` skill (which fetches current docs) instead of going by memory.

## Subsystems

### Workspaces (`workspacesStore.js`)

Multi-tenant containers. Tables: `workspaces`, `workspace_members`,
`workspace_invitations`. Boards can be **workspace-scoped** (`workspace_id` set) or
**personal** (`workspace_id` null, optionally shared via `board_members`). The
two sharing systems coexist — `boardSharingStore` handles the lightweight per-board
flow, `workspacesStore` handles tenant-scoped membership.

### Realtime sync

`boardStore` subscribes to `postgres_changes` on `boards`, `columns`, `cards`
after auth, tears down on unmount. Last-write-wins merge.

### localStorage migration

`migrateLocalData.js` is wired into `AppLayout` and offers a banner to import
legacy localStorage data into Supabase on first sign-in. Likely vestigial — verify
before removing.

## Design System

### Tokens (source of truth: `src/index.css`)

All design tokens are CSS variables defined in `@theme {}` and `:root /
[data-theme="light"|"dark"]` blocks. **Never hardcode hex codes — always reference
the token.**

- Surfaces: `--surface-page`, `--surface-card`, `--surface-raised`, `--surface-hover`, `--surface-input`, `--surface-sidebar`
- Borders: `--border-default`, `--border-subtle`, `--border-focus`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`
- Accents: `--accent-lime`, `--accent-lime-dark`, `--accent-lime-wash`
- Buttons: `--btn-primary-bg`, `--btn-primary-text`, `--btn-primary-hover`
- Labels: `--label-{red|blue|green|yellow|purple|pink|gray}-{bg|text}`
- Phosphor palette (raw): `--color-{cream|sand|ink|charcoal|stone|mist|lime|copper|honey|mauve|...}`

Both light and dark variants are defined. Components use `var(--token)` via
Tailwind arbitrary values: `bg-[var(--surface-card)]`.

### Typography stack

| Token            | Font                  | Use                                |
|------------------|-----------------------|------------------------------------|
| `--font-sans`    | Mona Sans Variable    | Main app text                      |
| `--font-logo`    | Clash Grotesk         | "Kolumn" wordmark only             |
| `--font-heading` | Sentient (serif)      | Display headings, avatar initials  |
| `--font-mono`    | IBM Plex Mono         | Code, IDs, paths                   |
| `--font-pill`    | Google Sans Text      | Pill labels (PRO, BETA, NEW)       |
| `.landing-font`  | Plus Jakarta Sans     | Landing page only (scoped class)   |

### Primitives

`src/components/ui/` is the design-system layer. **Always reach for these
primitives before hand-rolling — they encode the coherency rules.** Tests live
in `src/__tests__/{Button,Input,Menu,Popover,Tooltip}.test.jsx`; design-decision
mockups live in `docs/design-mockups/{button,input,menu,ghost-buttons}-decisions.html`.

| Primitive  | API surface                                                       |
|------------|-------------------------------------------------------------------|
| `Avatar`   | `name`, `size` (xs/sm/md/lg), `ring`. Hash-derived color.         |
| `Button`   | `variant` (primary/accent/secondary/ghost/destructive), `size` (sm/md/lg + icon-{sm,md,lg}), `loading`, `loadingText`, `asChild` (Slot pattern). Defaults to `type="button"`. |
| `Input`    | `error`, `leadingIcon`, `wrapperClassName`. 1px ink focus border. |
| `Textarea` | `error`, `rows`. Same focus + error states as `Input`.            |
| `Modal`    | `open`, `onClose`, `contentClassName`. Portal, focus trap, body scroll lock, stacked-modal aware (only topmost responds to Escape). Suppresses stale `:focus-visible` on trigger after mouse-driven close. |
| `Popover`  | `open`, `onOpenChange`, `placement` (bottom-start/bottom-end/top-start/top-end), `panel`, `closeOnEscape`, `closeOnOutsideClick`. |
| `Menu`     | Wraps `Popover`. Sub-components: `Menu.Item` (with `icon`, `shortcut`, `destructive`, `selected`, `checkbox`), `Menu.Divider`, `Menu.Label`. |
| `Tooltip`  | `content`, `placement`, `delay` (default 300ms), `disabled`. Wraps a single child. |
| `Skeleton` | `variant` (block/line/circle/pill), `tone` (default/ai), `width`, `height`. |
| `InlineNotice` | The persistent ("wash") tier of the error grammar: mono 12px, 18px default Phosphor icon, 1px border, 10px radius. `variant` (info/error/warn/danger/success), `icon` (node or `false`), `action` (node, e.g. Retry), `onDismiss`. Errors/danger get `role="alert"`. |
| `FieldError`   | Micro tier: single-input validation line. Mono 11px + 13px icon, no box. Self-guards on falsy children. |

### Other shared helpers

- `src/utils/formatting.js` — `LABEL_BG`, `LABEL_BG_QUIET`, `PRIORITY_DOT`, `AVATAR_COLORS` exported as Tailwind class strings (not components). Use these instead of hand-coding label/priority colors.
- `src/utils/toast.js` — `showToast.{success|error|delete|archive|restore|info|warn|overdue}`. Powered by `react-hot-toast`. Configured globally as `<Toaster position="top-center">` in `App.jsx`. Style: 420px fixed width, 1px solid `#1B1B18` border, 10px radius, IBM Plex Mono / SF Mono 12px, Phosphor icon + message + dismiss button. Eight intents each with their own background color and duration (3-5s). **Never roll your own toast — always import this helper.** `showToast.offline(msg)` returns a persistent (duration ∞) honey toast with a pulse dot for connectivity state; pair with `showToast.dismiss(id)`. Solid toast fills are reserved for transient/floating messages — persistent inline errors use `InlineNotice` (wash) or `FieldError` (micro). Decision records: docs/design-mockups/error-style-decisions{,-2}.html.
- `src/hooks/useClickOutside.js`, `src/hooks/useKeyboardShortcuts.js`, `src/hooks/useAppData.js`, `src/hooks/useBoardDnd.js` — extracted hooks. Prefer these over reinventing.

## Coherency Rules

These are the rules that make the app feel like one app. Don't violate them
without a deliberate reason discussed with the user.

- **Icons: Phosphor only.** `@phosphor-icons/react` is canonical. `DynamicIcon` has a `LEGACY_ICON_REMAP` table that translates old lucide-style names persisted in DB rows — leave it in place, do not extend it.
- **Colors: tokens only.** Reference `var(--token)` from `src/index.css`. No new hex codes anywhere.
- **Inputs: 1px ink (`#1B1B18`) border on focus.** No lime focus ring, no glow. Hover bumps border from sand to mist.
- **Modals: no backdrop blur.** Just dimmed ink overlay (`rgba(27,27,24,0.45)`). Perf + visual win.
- **Toasts: always `showToast.*` from `src/utils/toast.js`.** Never roll inline. Pick the most specific intent (`delete` not `error`, `restore` not `success`).
- **Buttons: ink primary, lime accent for create/save/positive, red (`--color-red`) for destructive.** Copper means *failure* (errors); red means *destructive intent* (buttons, menu items, confirm dialogs). Legacy copper hover tints on small delete affordances (~12 components) are pending migration. Decision: docs/design-mockups/error-style-decisions-2.html (R2).
- **Border radius: 8px small (buttons, inputs), 10-12px raised (modals, panels, tiles).** Deliberate exception: kanban card surfaces (`Card`, `AICardSkeleton`, `InlineCardEditor`, `CardDetailPanel`) use 16px (`rounded-2xl`) — a product choice; don't "fix" them back to 12px.
- **Shadows: minimal.** Default raised shadow is `0 4px 24px rgba(27,27,24,0.10)` (matches toasts).
- **Card field names are snake_case** (DB columns). See Key Data Shapes.
- **Workspace icon vocabulary.** The workspace dropdown uses a tight three-icon typology — re-use it for any future workspace-adjacent surface so the visual language stays consistent:
  - `CubeFocus` (weight=light) → aggregate / "all workspaces" view (the `null` sentinel, default)
  - `Cube` (weight=light) → virtual / "Personal" (the `'personal'` sentinel; user's private boards + shared-with-me)
  - `Cube` (weight=fill, color via `resolveWorkspaceColor`) → a specific real workspace (UUID). Color comes from `WORKSPACE_COLORS` in `src/constants/colors.js`.
- **`activeWorkspaceId` sentinel encoding.** Three states: `null` = All (default, every section renders in Sidebar), `'personal'` = Personal only (personal + shared, no Spaces), UUID = that specific workspace. Anywhere you read this value as "is a real workspace" must explicitly check `value && value !== 'personal' && workspaces[value]` — naive `if (activeWorkspaceId)` will misread `'personal'` as a UUID.

## Key data shapes

### Card (`cards` table — DB uses snake_case)
```
id, board_id, column_id, position,
task_number, global_task_number,
title, description, icon, completed,
assignee_name, priority, due_date,
labels, checklist,
created_at, updated_at
```

Common pitfall: it's `assignee_name`, NOT `assignee`. It's `due_date`, NOT `dueDate`.

### Board store shape (Zustand)
```js
{
  boards:        { [id]: { id, name, icon, owner_id, workspace_id, next_task_number } },
  columns:       { [id]: { id, board_id, title, position } },
  cards:         { [id]: <Card> },
  activeBoardId,
  loading,
}
```

### Card creation vs editing
- **New task** → creates card in Supabase, shows `InlineCardEditor` inline.
- **Existing task** → click opens `CardDetailPanel` (centered modal, max-w-3xl, 50–90vh). The "Panel" name is historical — it used to be a right-side panel and was migrated to a modal; the filename was kept to avoid churn.

## Database

Tables: `profiles`, `workspaces`, `workspace_members`, `workspace_invitations`,
`boards`, `board_members`, `board_invitations`, `columns`, `cards`, `notes`,
plus chat tables (`chat_threads`, `chat_messages`, etc.).

Triggers:
- Auto-create profile on signup
- Auto-add owner to `board_members` on board creation
- Auto-accept pending invitations on new user signup
- Auto-update `updated_at` on cards / notes

RLS: users see boards they're members of. Notes are private per user. Workspaces
have member-based RLS.

Migrations live in `supabase/migrations/`; the canonical full schema is
`supabase/schema.sql`.

## Conventions

- **Commits**: conventional with scope — `feat(ai):`, `fix(chat):`, `style(ai):`, `refactor(board):`, `docs:`. On this branch most commits should use the `ai`, `chat`, or `prompt` scope.
- **Plans / specs**: `docs/superpowers/{plans,specs}/YYYY-MM-DD-<topic>.md`. Use the superpowers skills (`brainstorming` → `writing-plans` → `executing-plans`) for non-trivial work.
- **Verifying changes**: `npm run build` for type/syntax sanity, `npm run test` for behavior, `npm run lint` for style.
- **UI changes**: open the dev server in a browser and exercise the feature, including edge cases. Don't claim "done" without seeing it run.
- **Edge-function changes**: deploy with `supabase functions deploy chat` (or use the Supabase MCP `deploy_edge_function`) and tail logs with `supabase functions logs chat` while exercising the chat in a browser. Type-checking with `deno check supabase/functions/chat/index.ts` catches most edge-function bugs before deploy.
- **Anthropic API questions** (caching semantics, model IDs, tool-use protocol, extended thinking, batch): use the `claude-api` skill to fetch current docs. Don't go by memory — the API surface changes.

## Environment setup

1. Create a Supabase project at supabase.com, disable email confirmation in Auth settings.
2. Run `supabase/schema.sql` in the SQL Editor (or use `supabase db push` with the CLI).
3. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Edge Functions need `ANTHROPIC_API_KEY` set in Supabase → Edge Functions → Secrets.

## Important notes

- Tailwind v4 uses `@theme {}` blocks in CSS — there is no `tailwind.config.js`.
- `lucide-react` was removed; `@phosphor-icons/react` is the only icon library. Legacy lucide names persisted in DB are remapped at render time by `DynamicIcon`.
- `settingsStore` is the only store that persists locally (sidebar, theme, font). All other state lives in Supabase.
- Realtime is wired but uses last-write-wins; expect transient flicker on simultaneous edits.
- Sentry + PostHog are wired in production; check `src/utils/logger.js` before adding ad-hoc `console.error`.
