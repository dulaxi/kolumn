# Onboarding Checklist Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A claude.ai-style "Get started" checklist card in the sidebar that teaches new users the core loop (board → card → AI) and disappears when done or dismissed.

**Architecture:** Pure visibility/step logic in `src/constants/onboarding.js`; persistence via a new `profiles.onboarding_steps` jsonb column written through a new `authStore.markOnboardingStep` action; completion hooks are one-liners inside the existing store actions (`addBoard`, `addCard`) and the pill's LLM submit path; presentation is a single `SidebarChecklist.jsx` mounted in `Sidebar.jsx`.

**Tech Stack:** React 19, Zustand, Supabase (Postgres), Tailwind v4 tokens, Phosphor icons, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-23-onboarding-checklist-design.md`

## Global Constraints

- Colors only via `var(--token)` from `src/index.css`; no new hex codes.
- Icons: `@phosphor-icons/react` only.
- Card field names snake_case; profile column is `onboarding_steps`.
- Steps stored as ISO timestamps, not booleans.
- `SHIP_DATE` lives in `src/constants/onboarding.js` only — no copies.
- Commits: conventional with scope (`feat(onboarding):`, `test(onboarding):`).
- Verify with `npm run test`, `npm run build`, `npm run lint`.

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/2026-07-23-onboarding-steps.sql`
- Modify: `supabase/schema.sql` (profiles table block, after `trial_ends_at timestamptz,`)

**Interfaces:**
- Produces: `profiles.onboarding_steps jsonb not null default '{}'` — shape `{ board?: iso, card?: iso, ai?: iso, dismissed?: iso }`. Tasks 3–5 read/write it via `authStore`.

- [ ] **Step 1: Write the migration file**

```sql
-- Onboarding checklist (2026-07-23): per-step completion timestamps for
-- the sidebar "Get started" card. Shape:
--   { board?: iso, card?: iso, ai?: iso, dismissed?: iso }
alter table public.profiles
  add column if not exists onboarding_steps jsonb not null default '{}'::jsonb;
```

- [ ] **Step 2: Mirror it in `supabase/schema.sql`**

In the `create table public.profiles` block, directly after the line `trial_ends_at timestamptz,` add:

```sql
  -- onboarding checklist step timestamps (2026-07-23): { board, card, ai, dismissed }
  onboarding_steps jsonb not null default '{}'::jsonb,
```

- [ ] **Step 3: Apply the migration to the Supabase project**

Run it via the Supabase MCP `apply_migration` tool (name: `onboarding_steps`), or paste the SQL into the Supabase SQL editor. Verify with:

```sql
select column_name, data_type from information_schema.columns
where table_name = 'profiles' and column_name = 'onboarding_steps';
```

Expected: one row, `onboarding_steps | jsonb`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-07-23-onboarding-steps.sql supabase/schema.sql
git commit -m "feat(onboarding): add profiles.onboarding_steps jsonb column"
```

---

### Task 2: Step definitions + visibility logic

**Files:**
- Create: `src/constants/onboarding.js`
- Test: `src/__tests__/onboardingSteps.test.js`

**Interfaces:**
- Produces:
  - `SHIP_DATE: Date` — accounts created before this never see/write steps
  - `ONBOARDING_STEPS: [{ key: 'board'|'card'|'ai', title: string, subtitle: string }]`
  - `isNewAccount(profile) => boolean`
  - `shouldShowChecklist(profile) => boolean`

- [ ] **Step 1: Write the failing tests**

```js
// src/__tests__/onboardingSteps.test.js
import { describe, it, expect } from 'vitest'
import {
  SHIP_DATE,
  ONBOARDING_STEPS,
  isNewAccount,
  shouldShowChecklist,
} from '../constants/onboarding'

const AFTER = new Date(SHIP_DATE.getTime() + 86400000).toISOString()
const BEFORE = new Date(SHIP_DATE.getTime() - 86400000).toISOString()

const newProfile = (steps = {}) => ({ created_at: AFTER, onboarding_steps: steps })

describe('onboarding step definitions', () => {
  it('defines exactly three steps: board, card, ai', () => {
    expect(ONBOARDING_STEPS.map((s) => s.key)).toEqual(['board', 'card', 'ai'])
    ONBOARDING_STEPS.forEach((s) => {
      expect(s.title).toBeTruthy()
      expect(s.subtitle).toBeTruthy()
    })
  })
})

describe('isNewAccount', () => {
  it('true for accounts created on/after SHIP_DATE', () => {
    expect(isNewAccount({ created_at: AFTER })).toBe(true)
  })
  it('false for older accounts, null, or missing created_at', () => {
    expect(isNewAccount({ created_at: BEFORE })).toBe(false)
    expect(isNewAccount(null)).toBe(false)
    expect(isNewAccount({})).toBe(false)
  })
})

describe('shouldShowChecklist', () => {
  it('shows for a new account with no steps done', () => {
    expect(shouldShowChecklist(newProfile())).toBe(true)
  })
  it('shows while any step is incomplete', () => {
    expect(shouldShowChecklist(newProfile({ board: AFTER, card: AFTER }))).toBe(true)
  })
  it('hides when all three steps are done', () => {
    expect(shouldShowChecklist(newProfile({ board: AFTER, card: AFTER, ai: AFTER }))).toBe(false)
  })
  it('hides when dismissed', () => {
    expect(shouldShowChecklist(newProfile({ dismissed: AFTER }))).toBe(false)
  })
  it('hides for old accounts and missing profiles', () => {
    expect(shouldShowChecklist({ created_at: BEFORE, onboarding_steps: {} })).toBe(false)
    expect(shouldShowChecklist(null)).toBe(false)
  })
  it('tolerates a profile without the onboarding_steps column', () => {
    expect(shouldShowChecklist({ created_at: AFTER })).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/onboardingSteps.test.js`
Expected: FAIL — cannot resolve `../constants/onboarding`.

- [ ] **Step 3: Write the implementation**

```js
// src/constants/onboarding.js
// Sidebar "Get started" checklist for new users. SHIP_DATE gates the whole
// feature: accounts created before it never see the card and never write
// onboarding_steps. Bump to the real deploy date when this ships.
export const SHIP_DATE = new Date('2026-07-23T00:00:00Z')

export const ONBOARDING_STEPS = [
  {
    key: 'board',
    title: 'Create your first board',
    subtitle: 'Or poke at the Welcome board we made you',
  },
  {
    key: 'card',
    title: 'Add a card',
    subtitle: 'Click + New task in any column',
  },
  {
    key: 'ai',
    title: 'Ask the AI',
    subtitle: 'Type what you want done into the bar on any board',
  },
]

export function isNewAccount(profile) {
  if (!profile?.created_at) return false
  return new Date(profile.created_at) >= SHIP_DATE
}

export function shouldShowChecklist(profile) {
  if (!isNewAccount(profile)) return false
  const steps = profile.onboarding_steps || {}
  if (steps.dismissed) return false
  return ONBOARDING_STEPS.some((s) => !steps[s.key])
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/onboardingSteps.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/constants/onboarding.js src/__tests__/onboardingSteps.test.js
git commit -m "feat(onboarding): step definitions and checklist visibility logic"
```

---

### Task 3: `authStore.markOnboardingStep`

**Files:**
- Modify: `src/store/authStore.js` (add action after `updateProfile`, ~line 263)
- Test: `src/__tests__/markOnboardingStep.test.js`

**Interfaces:**
- Consumes: `isNewAccount` from `src/constants/onboarding.js` (Task 2); existing `updateProfile(updates)` on the same store.
- Produces: `markOnboardingStep(key: 'board'|'card'|'ai'|'dismissed') => Promise<void>` — optimistic local merge + persisted write; silently no-ops per the guard rules. Tasks 4–5 call it via `useAuthStore.getState().markOnboardingStep(...)`.

- [ ] **Step 1: Write the failing tests**

Zustand actions are plain state properties, so the test stubs `updateProfile` with `setState` and inspects calls — no Supabase mock needed.

```js
// src/__tests__/markOnboardingStep.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../store/authStore'
import { SHIP_DATE } from '../constants/onboarding'

const AFTER = new Date(SHIP_DATE.getTime() + 86400000).toISOString()
const BEFORE = new Date(SHIP_DATE.getTime() - 86400000).toISOString()

function arrange(profile) {
  const updateProfile = vi.fn().mockResolvedValue({})
  useAuthStore.setState({ profile, updateProfile })
  return updateProfile
}

describe('markOnboardingStep', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: null })
  })

  it('records a step with an ISO timestamp and persists it', async () => {
    const spy = arrange({ created_at: AFTER, onboarding_steps: {} })
    await useAuthStore.getState().markOnboardingStep('board')
    const sent = spy.mock.calls[0][0].onboarding_steps
    expect(Date.parse(sent.board)).not.toBeNaN()
    // optimistic local merge happened before persist resolved
    expect(useAuthStore.getState().profile.onboarding_steps.board).toBe(sent.board)
  })

  it('no-ops when the key is already set', async () => {
    const spy = arrange({ created_at: AFTER, onboarding_steps: { board: AFTER } })
    await useAuthStore.getState().markOnboardingStep('board')
    expect(spy).not.toHaveBeenCalled()
  })

  it('no-ops for step keys when dismissed, but still allows dismissing', async () => {
    const spy = arrange({ created_at: AFTER, onboarding_steps: { dismissed: AFTER } })
    await useAuthStore.getState().markOnboardingStep('card')
    expect(spy).not.toHaveBeenCalled()

    const spy2 = arrange({ created_at: AFTER, onboarding_steps: {} })
    await useAuthStore.getState().markOnboardingStep('dismissed')
    expect(spy2).toHaveBeenCalledOnce()
  })

  it('no-ops for accounts created before SHIP_DATE', async () => {
    const spy = arrange({ created_at: BEFORE, onboarding_steps: {} })
    await useAuthStore.getState().markOnboardingStep('board')
    expect(spy).not.toHaveBeenCalled()
  })

  it('no-ops with no profile', async () => {
    const spy = arrange(null)
    await useAuthStore.getState().markOnboardingStep('board')
    expect(spy).not.toHaveBeenCalled()
  })

  it('keeps the optimistic merge and does not throw when persist fails', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new Error('offline'))
    useAuthStore.setState({ profile: { created_at: AFTER, onboarding_steps: {} }, updateProfile })
    await expect(useAuthStore.getState().markOnboardingStep('ai')).resolves.toBeUndefined()
    expect(useAuthStore.getState().profile.onboarding_steps.ai).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/markOnboardingStep.test.js`
Expected: FAIL — `markOnboardingStep is not a function`.

- [ ] **Step 3: Implement the action**

In `src/store/authStore.js`, add to the imports at the top of the file:

```js
import { isNewAccount } from '../constants/onboarding'
```

Then add this action directly after the `updateProfile` action (keep the trailing comma structure):

```js
  // Onboarding checklist step tracker. Guards make it safe to call from hot
  // paths (addBoard/addCard/pill submit) — it no-ops for old accounts,
  // already-set keys, and post-dismissal step writes.
  markOnboardingStep: async (key) => {
    const { profile } = get()
    if (!isNewAccount(profile)) return
    const steps = profile.onboarding_steps || {}
    if (steps[key]) return
    if (key !== 'dismissed' && steps.dismissed) return
    const next = { ...steps, [key]: new Date().toISOString() }
    set({ profile: { ...profile, onboarding_steps: next } })
    try {
      await get().updateProfile({ onboarding_steps: next })
    } catch (err) {
      // Keep the optimistic merge; a lost write only risks re-showing a
      // completed step on another device.
      logError('markOnboardingStep persist failed:', err)
    }
  },
```

Note: `logError` is already imported in `authStore.js` (used by the profile fetch). If the import is missing, add `import { logError } from '../utils/logger'`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/markOnboardingStep.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/authStore.js src/__tests__/markOnboardingStep.test.js
git commit -m "feat(onboarding): markOnboardingStep action with guard rules"
```

---

### Task 4: `SidebarChecklist` component + sidebar mount

**Files:**
- Create: `src/components/layout/SidebarChecklist.jsx`
- Create: `src/utils/createBoardEvent.js` (extracted from `DashboardPage.jsx`)
- Modify: `src/pages/DashboardPage.jsx` (delete local `triggerCreateBoard`, import the util)
- Modify: `src/components/layout/Sidebar.jsx` (mount above `<SidebarBottom>`, ~line 361)
- Test: `src/__tests__/SidebarChecklist.test.jsx`

**Interfaces:**
- Consumes: `ONBOARDING_STEPS`, `shouldShowChecklist` (Task 2); `markOnboardingStep` (Task 3); `triggerCreateBoard()` from the new util.
- Produces: `<SidebarChecklist />` (no props); `triggerCreateBoard()` exported from `src/utils/createBoardEvent.js`.

- [ ] **Step 1: Extract `triggerCreateBoard` into a util**

Create `src/utils/createBoardEvent.js` with the function currently defined at `src/pages/DashboardPage.jsx:42-53`, verbatim plus export:

```js
// Fire the global "open create-board modal" event with retry, because the
// boards page may still be mounting when the caller navigates to it.
export function triggerCreateBoard() {
  let attempts = 0
  let handled = false
  const onHandled = () => { handled = true }
  window.addEventListener('kolumn:create-board-ack', onHandled, { once: true })
  const dispatch = () => {
    if (handled) { window.removeEventListener('kolumn:create-board-ack', onHandled); return }
    window.dispatchEvent(new CustomEvent('kolumn:create-board'))
    if (++attempts < 10) setTimeout(dispatch, 100)
  }
  setTimeout(dispatch, 50)
}
```

In `src/pages/DashboardPage.jsx`: delete the local `triggerCreateBoard` function (lines 42–53) and add `import { triggerCreateBoard } from '../utils/createBoardEvent'`.

- [ ] **Step 2: Write the failing component tests**

```jsx
// src/__tests__/SidebarChecklist.test.jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SidebarChecklist from '../components/layout/SidebarChecklist'
import { useAuthStore } from '../store/authStore'
import { SHIP_DATE } from '../constants/onboarding'

const AFTER = new Date(SHIP_DATE.getTime() + 86400000).toISOString()
const BEFORE = new Date(SHIP_DATE.getTime() - 86400000).toISOString()

const renderCard = () =>
  render(
    <MemoryRouter>
      <SidebarChecklist />
    </MemoryRouter>,
  )

describe('SidebarChecklist', () => {
  beforeEach(() => useAuthStore.setState({ profile: null }))

  it('renders nothing for old accounts', () => {
    useAuthStore.setState({ profile: { created_at: BEFORE, onboarding_steps: {} } })
    const { container } = renderCard()
    expect(container.firstChild).toBeNull()
  })

  it('renders three steps and a 0 / 3 counter for a fresh account', () => {
    useAuthStore.setState({ profile: { created_at: AFTER, onboarding_steps: {} } })
    renderCard()
    expect(screen.getByText('Get started')).toBeInTheDocument()
    expect(screen.getByText('0 / 3')).toBeInTheDocument()
    expect(screen.getByText('Create your first board')).toBeInTheDocument()
    expect(screen.getByText('Add a card')).toBeInTheDocument()
    expect(screen.getByText('Ask the AI')).toBeInTheDocument()
  })

  it('counts completed steps and hides when all are done', () => {
    useAuthStore.setState({ profile: { created_at: AFTER, onboarding_steps: { board: AFTER } } })
    renderCard()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    useAuthStore.setState({
      profile: { created_at: AFTER, onboarding_steps: { board: AFTER, card: AFTER, ai: AFTER } },
    })
    const { container } = renderCard()
    expect(container.firstChild).toBeNull()
  })

  it('has an accessible dismiss button', () => {
    useAuthStore.setState({ profile: { created_at: AFTER, onboarding_steps: {} } })
    renderCard()
    expect(screen.getByRole('button', { name: 'Dismiss checklist' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/SidebarChecklist.test.jsx`
Expected: FAIL — cannot resolve `../components/layout/SidebarChecklist`.

- [ ] **Step 4: Implement the component**

```jsx
// src/components/layout/SidebarChecklist.jsx
import { useNavigate } from 'react-router-dom'
import { CheckCircle, X } from '@phosphor-icons/react'

import { useAuthStore } from '../../store/authStore'
import { ONBOARDING_STEPS, shouldShowChecklist } from '../../constants/onboarding'
import { triggerCreateBoard } from '../../utils/createBoardEvent'

// New-user "Get started" card (claude.ai-style): three core-loop steps with
// live completion, a progress bar, and a hover-revealed permanent dismiss.
// Steps complete themselves via markOnboardingStep calls inside the store
// actions — clicking a row just navigates to where the action happens.
export default function SidebarChecklist() {
  const profile = useAuthStore((s) => s.profile)
  const markOnboardingStep = useAuthStore((s) => s.markOnboardingStep)
  const navigate = useNavigate()

  if (!shouldShowChecklist(profile)) return null

  const steps = profile.onboarding_steps || {}
  const doneCount = ONBOARDING_STEPS.filter((s) => steps[s.key]).length

  const go = (key) => {
    navigate('/boards')
    if (key === 'board') triggerCreateBoard()
  }

  return (
    <div className="px-2 pb-2">
      <div className="group relative rounded-xl border border-[var(--color-sand)] bg-[var(--surface-card)] shadow-[0_4px_24px_rgba(27,27,24,0.10)] p-3 select-none">
        <button
          type="button"
          onClick={() => markOnboardingStep('dismissed')}
          aria-label="Dismiss checklist"
          className="absolute top-2 right-2 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 pr-5">
          <h2 className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">Get started</h2>
          <span aria-hidden="true" className="font-mono text-xs text-[var(--text-muted)] whitespace-nowrap group-hover:opacity-0 transition-opacity">
            {doneCount} / {ONBOARDING_STEPS.length}
          </span>
          <span className="sr-only">{doneCount} of {ONBOARDING_STEPS.length} steps complete</span>
        </div>

        <div aria-hidden="true" className="mt-2 mb-1 h-1 rounded-full bg-[var(--surface-raised)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent-lime-dark)] transition-[width] duration-300 ease-out"
            style={{ width: `${(doneCount / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>

        <ul className="flex flex-col gap-0.5 pt-1">
          {ONBOARDING_STEPS.map((step) => {
            const done = !!steps[step.key]
            return (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => !done && go(step.key)}
                  className={`flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors ${
                    done ? 'cursor-default' : 'hover:bg-[var(--surface-raised)] cursor-pointer'
                  }`}
                >
                  {done ? (
                    <CheckCircle size={16} weight="fill" className="shrink-0 mt-px text-[var(--accent-lime-dark)]" />
                  ) : (
                    <span aria-hidden="true" className="shrink-0 mt-px w-4 h-4 rounded-full border border-[var(--border-default)]" />
                  )}
                  <span className="flex flex-col min-w-0 leading-[1.4]">
                    <span className={`text-[13px] ${done ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                      {step.title}
                    </span>
                    {!done && (
                      <span className="text-xs text-[var(--text-secondary)]">{step.subtitle}</span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Mount it in the sidebar**

In `src/components/layout/Sidebar.jsx`, add the import:

```js
import SidebarChecklist from './SidebarChecklist'
```

Then directly above the existing `{isDesktop && (\n  <SidebarBottom` block (~line 361), add:

```jsx
        {isDesktop && !showCollapsed && <SidebarChecklist />}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/SidebarChecklist.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 7: Run the full suite + build**

Run: `npm run test` then `npm run build`
Expected: all green (DashboardPage still compiles after the util extraction).

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/SidebarChecklist.jsx src/utils/createBoardEvent.js src/pages/DashboardPage.jsx src/components/layout/Sidebar.jsx src/__tests__/SidebarChecklist.test.jsx
git commit -m "feat(onboarding): sidebar Get started checklist card"
```

---

### Task 5: Completion hooks

**Files:**
- Modify: `src/store/boardStore/slices/boardsSlice.js` (`addBoard` success path, ~line 271)
- Modify: `src/store/boardStore/slices/cardsSlice.js` (`addCard` optimistic success, ~line 74)
- Modify: `src/components/board/QuickAddBar.jsx` (LLM branch of `handleSubmit`, ~line 86)

**Interfaces:**
- Consumes: `useAuthStore.getState().markOnboardingStep(key)` (Task 3). All three call sites use the `getState()` form — no hook wiring.

- [ ] **Step 1: Hook `addBoard`**

In `boardsSlice.js`, `addBoard` already imports `useAuthStore` (it reads `user` from it). In the success path, directly after `capture('board_created', ...)` and before `return board.id`, add:

```js
    useAuthStore.getState().markOnboardingStep('board')
```

- [ ] **Step 2: Hook `addCard`**

In `cardsSlice.js`, directly after the optimistic `set(...)` call that inserts the temp card (the block ending `next_task_number: localTaskNumber + 1 } },\n    }))`, ~line 74) and before the `// Persist in background` comment, add:

```js
    useAuthStore.getState().markOnboardingStep('card')
```

If `cardsSlice.js` does not already import `useAuthStore`, add at the top:

```js
import { useAuthStore } from '../../authStore'
```

(Match the relative path used by `boardsSlice.js` for the same import.)

- [ ] **Step 3: Hook the pill's LLM path**

In `QuickAddBar.jsx`, inside `handleSubmit`'s `else` branch (the non-fast-path), directly before the `const { finalText, rows, error } = await runPillLoop(` call, add:

```js
        // "Asked the AI" = submitted an intent to the LLM path (the comma/
        // newline fast-path never talks to the model, so it doesn't count).
        useAuthStore.getState().markOnboardingStep('ai')
```

Add the import if missing (check the file's existing imports first):

```js
import { useAuthStore } from '../../store/authStore'
```

- [ ] **Step 4: Run the full suite, build, lint**

Run: `npm run test && npm run build && npm run lint`
Expected: all green; lint may show the two pre-existing OnboardingPage warnings only.

- [ ] **Step 5: Commit**

```bash
git add src/store/boardStore/slices/boardsSlice.js src/store/boardStore/slices/cardsSlice.js src/components/board/QuickAddBar.jsx
git commit -m "feat(onboarding): mark checklist steps from addBoard, addCard, and pill submit"
```

---

### Task 6: Manual verification pass

**Files:** none (browser verification)

- [ ] **Step 1: Fresh-account walkthrough**

With `npm run dev` running:
1. Sign up a brand-new account (or set your test profile's `created_at` to now and `onboarding_steps` to `{}` in SQL).
2. Dashboard → sidebar shows "Get started 0 / 3" above the profile block.
3. Click "Create your first board" → lands on /boards with the create-board modal open; create one → card shows "1 / 3", board row checked lime.
4. Add a card via + New task → "2 / 3".
5. Type "add a card called test tomorrow" into the pill → "3 / 3" → card disappears.
6. Reload → card stays gone (steps persisted).
7. Second fresh account: click the X → card gone; reload → still gone (`dismissed` persisted).
8. Sign into a pre-existing account → no card.
9. Collapse the sidebar → no card on the rail.

- [ ] **Step 2: Fix anything found, re-run `npm run test`, commit fixes**

```bash
git add -A && git commit -m "fix(onboarding): manual verification fixes"
```

(Skip the commit if nothing needed fixing.)
