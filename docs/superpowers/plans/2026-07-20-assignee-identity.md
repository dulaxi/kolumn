# Assignee Identity (per-entry name+id) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Attach a stable user id to each member assignment so renames and "is-me" matching survive display-name changes with zero namesake collisions.

**Architecture:** Add a canonical `cards.assignee_refs jsonb` = `[{name, id}]` (id null for free-text non-members). Keep the existing `assignees text[]` + `assignee_name text` as a **derived name mirror** so every current reader (filters, AI executor, AI context, Avatar rendering) keeps working untouched. The store resolves names→ids at write time using board/workspace membership; display "is-me" and the rename/leaver triggers operate on `assignee_refs` by id, then re-derive the mirror.

**Tech Stack:** Supabase Postgres (jsonb), Zustand store, React, Vitest.

## Global Constraints

- `assignees text[]` and `assignee_name text` remain the derived mirror; never drop them.
- Invariant after any write: `assignees = [r.name for r in assignee_refs]`, `assignee_name = assignees[0] or ''`.
- Do not modify `supabase/functions/chat/**` or `tools.ts` (paused AI surface). AI writes flow through `boardStore` and inherit refs for free.
- Free-text assignees (non-members) are allowed and stored with `id: null`.

---

### Task 1: Schema + backfill + triggers (DB)

**Files:**
- Create: `supabase/migrations/2026-07-20-assignee-refs.sql`

**Interfaces:**
- Produces: `cards.assignee_refs jsonb not null default '[]'`; helper `public.cards_mirror_from_refs(refs jsonb) returns text[]`; rewritten trigger `on_profile_rename_update_cards`; updated leaver purge.

- [ ] **Step 1:** Add column + backfill from current data (member id where a board member's display_name matches, else null), then rewrite the rename trigger to rename by id inside `assignee_refs` and re-mirror `assignees`/`assignee_name`; update the leaver-purge to prune refs by id/name and re-mirror.
- [ ] **Step 2:** Verify red→green on the live DB with a rolled-back rename probe (namesake case): two refs with different ids but same name → only the renamer's entry changes.
- [ ] **Step 3:** `get_advisors(security)` clean for new objects.

### Task 2: Store resolves + writes refs

**Files:**
- Modify: `src/store/boardStore.js` (addCard ~525, updateCard ~660)

**Interfaces:**
- Consumes: `updates.assigneeRefs?: [{name,id}]` OR `updates.assignees?: string[]` OR legacy `updates.assignee`.
- Produces: writes `assignee_refs` (canonical) + `assignees`/`assignee_name` mirror. Adds `resolveAssigneeRefs(boardId, input)`.

- [ ] Build `resolveAssigneeRefs`: for each entry, if a ref with id → keep; if a name → match against board_members+workspace members (existing notification lookup generalized) → `{name, id|null}`. Write refs + mirror in addCard/updateCard.

### Task 3: Members-with-ids hook

**Files:**
- Modify: `src/hooks/useBoardMemberNames.js` → add `useBoardMembers` returning `[{id, display_name}]`; keep `useBoardMemberNames` as a names-only wrapper.

### Task 4: Edit state + pickers carry refs

**Files:**
- Modify: `src/hooks/useCardEditState.js` (assignees as refs), `src/components/board/cardDetail/AssigneePicker.jsx`, `src/components/board/CardDetailPanel.jsx`, `src/components/board/InlineCardEditor.jsx`, `src/components/board/Card.jsx`

**Interfaces:**
- is-me: `refs.some(r => r.id && r.id === profile.id)` with name fallback.
- Picker member row → `{name, id}`; free-text → `{name, id:null}`.

### Task 5: Verify

- [ ] `npm run build`, `npm run lint`, `npm run test`; DB red/green; manual rename in dev server shows pfp persists.

## Self-Review
- Spec coverage: caveat 1 (historical→id-backed, rename-proof going forward) ✓; caveat 2 (namesake, per-entry id) ✓.
- Mirror keeps filters/AI/context/Avatar unchanged ✓.
- Residual: cards orphaned by a *past* rename (old name lost, matches no current member) can't be auto-linked in backfill — one-off only. Documented.
