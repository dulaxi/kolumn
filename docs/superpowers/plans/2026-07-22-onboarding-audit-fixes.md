# Onboarding Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 18 ranked findings + actionable gaps from the 2026-07-22 onboarding audit so every promise the flow makes is kept by the code.

**Architecture:** Data/copy fixes land first (no schema), then one additive `profiles` migration (`role`, `onboarded_at`, `terms_accepted_at`, `trial_ends_at`) unlocks the behavioral work: trial-aware checkout, a completion state machine that covers Pro/Team/OAuth paths, and real starter-board seeding. The tour board and starter boards stay pure data files instantiated by client-side seeders (existing RLS-aware no-`.select()` insert pattern).

**Tech Stack:** React 19, Zustand, Supabase (Postgres + RLS), Vitest + Testing Library, Tailwind v4 tokens.

## Global Constraints

- Icons: Phosphor only; kebab-case icon names in data files (rendered via `DynamicIcon`).
- Colors: `var(--token)` only — no new hex codes.
- Toasts: `showToast.*` from `src/utils/toast.js` only.
- Buttons: ink for affirmative, red for destructive; no lime fills.
- Card/DB field names are snake_case; checklist items are `{ text, done }`.
- Commits: conventional with scope (`fix(onboarding):`, `feat(onboarding):`, `docs:`).
- Verify: `npm run test` after each task; `npm run lint && npm run build` at the end.
- Product decisions (user-confirmed): never-train policy wins (remove opt-in toggle); honor the 7-day Pro trial ($0 due today + `trial_ends_at`); full starter templates (columns + cards); integrations card stays with a "Coming soon" tag.
- Non-goals: trial expiry enforcement (billing is stubbed), real Stripe flow, resend-confirmation-email UI.

---

### Task 1: Fix seeded checklist key (`completed` → `done`) — F01

**Files:**
- Modify: `src/data/onboardingBoard.js`
- Modify: `src/pages/OnboardingBoardSandbox.jsx` (checklist rendering, if it reads `completed`)
- Test: `src/__tests__/onboardingBoardData.test.js` (create)

**Interfaces:**
- Produces: `ONBOARDING_BOARD` with checklist items shaped `{ text, done }` — matches `Card.jsx:42` (`item.done`) and `toolExecutor.js:176`.

- [ ] **Step 1: Write the failing data-shape test**

```js
// src/__tests__/onboardingBoardData.test.js
import { describe, test, expect } from 'vitest'
import { ONBOARDING_BOARD } from '../data/onboardingBoard'

const allCards = ONBOARDING_BOARD.columns.flatMap((c) => c.cards)

describe('onboarding board data shape', () => {
  test('checklist items use { text, done } — the shape Card.jsx counts', () => {
    for (const card of allCards) {
      for (const item of card.checklist || []) {
        expect(item).toHaveProperty('text')
        expect(item).toHaveProperty('done')
        expect(item).not.toHaveProperty('completed')
      }
    }
  })

  test('welcome card ships with its first checklist item pre-checked', () => {
    const welcome = allCards.find((c) => c.id === 'welcome')
    expect(welcome.checklist[0].done).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npm run test -- onboardingBoardData` → FAIL (`completed` present, `done` missing).

- [ ] **Step 3: Fix the data file** — in `src/data/onboardingBoard.js`, rename every checklist item key `completed:` → `done:` (6 checklist blocks). Card-level `completed: true` on the `ready` card **stays** — that key is correct for cards. Example (welcome card):

```js
checklist: [
  { text: 'Read this card',         done: true  },
  { text: 'Drag me to In progress', done: false },
],
```

- [ ] **Step 4: Check the sandbox** — grep `OnboardingBoardSandbox.jsx` for `\.completed` on checklist items; if its `CardPreview` counts `item.completed`, switch to `item.done`.

- [ ] **Step 5: Run tests** — `npm run test -- onboardingBoardData` → PASS; full `npm run test` stays green.

- [ ] **Step 6: Commit** — `fix(onboarding): seed tour checklists with the app's {text, done} shape`

---

### Task 2: Tour board content — truthful AI card, coherent columns, live description — F09, F15, F16

**Files:**
- Modify: `src/data/onboardingBoard.js`
- Test: `src/__tests__/onboardingBoardData.test.js` (extend)

**Interfaces:**
- Produces: `ONBOARDING_BOARD` where the Done column contains only completed cards and the AI card describes the real surfaces (board pill + `/chat` page; ⌘K = search).

- [ ] **Step 1: Extend the failing test**

```js
test('Done column only contains completed cards', () => {
  const done = ONBOARDING_BOARD.columns.find((c) => c.id === 'done')
  for (const card of done.cards) expect(card.completed).toBe(true)
})

test('the AI card does not promise a chat panel or ⌘K chat', () => {
  const chat = allCards.find((c) => c.id === 'chat')
  expect(chat.description).not.toMatch(/panel on the right/i)
  expect(chat.description).not.toMatch(/⌘K/)
})
```

- [ ] **Step 2: Run to verify both fail** — `npm run test -- onboardingBoardData`.

- [ ] **Step 3: Restructure the data file**

Move `chat` card into the `todo` column (after `checklist` card) and `customize` into `doing` (after `label-style`). `done` column keeps only `ready`. Rewrite two descriptions:

```js
// chat card (now in the To do column)
{
  id: 'chat',
  icon: 'chat-circle-dots',
  title: 'Ask Claude for help',
  priority: 'high',
  labels: ['pro'],
  description:
    'Two ways to work with Claude: type into the pill at the bottom of ' +
    'any board ("add a card for tomorrow\'s standup") and it happens, or ' +
    'open Chat from the sidebar to ask questions about your boards.',
},
```

```js
// welcome card — absorb the board description (boards have no description column)
{
  id: 'welcome',
  icon: 'hand-waving',
  title: 'Welcome to Kolumn',
  priority: 'medium',
  labels: ['welcome'],
  description:
    'Kolumn is a kanban-first project tool with Claude as a teammate. ' +
    'This board is a sandbox — drag, click, and edit anything; every ' +
    'card teaches one thing. Delete the board from its menu when ' +
    'you\'re done. Start by dragging this card to "In progress".',
  checklist: [
    { text: 'Read this card',         done: true  },
    { text: 'Drag me to In progress', done: false },
  ],
},
```

Keep the top-level `description` field on `ONBOARDING_BOARD` with a comment: `// sandbox-preview only — boards have no description column; user-facing copy lives in the welcome card`.

- [ ] **Step 4: Run tests** — `npm run test -- onboardingBoardData` → PASS.

- [ ] **Step 5: Commit** — `fix(onboarding): make tour board truthful — real AI surfaces, coherent Done column`

---

### Task 3: OnboardingPage copy & honesty — F12, F13, F08, F18, F07, gap-7

**Files:**
- Modify: `src/pages/OnboardingPage.jsx`
- Modify: `src/store/authStore.js` (typed confirm-email error)
- Modify: `src/__tests__/validation.test.jsx` (button-name regex)

**Interfaces:**
- Produces: `DisclaimerStep({ onContinue })` — no more `shareTrainingData`/`setShareTrainingData` props. `signUp` throws `err.code = 'confirm_email'` when no session returns.

- [ ] **Step 1: Terms button** — in `TermsStep`, change the submit `Button` text `Create account` → `Agree and continue` (the details step keeps the real "Create account").

- [ ] **Step 2: "Email verified as"** — in `TermsStep` footer, change `Email verified as{' '}` → `Continuing as{' '}`.

- [ ] **Step 3: Remove the training toggle** — delete `shareTrainingData` state + handler from `OnboardingPage`, drop both props from `<DisclaimerStep …>`, and replace the third `<li>` (the toggle) in `DisclaimerStep` with a consistent-with-settings info item:

```jsx
<li className="flex gap-4 items-start">
  <div
    aria-hidden="true"
    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[var(--label-blue-bg)] text-[var(--label-blue-text)]"
  >
    <GraduationCap size={18} weight="duotone" />
  </div>
  <p className="text-[var(--text-primary)] text-sm leading-relaxed">
    <span className="font-semibold">Not training data.</span>{' '}
    <span className="text-[var(--text-secondary)]">
      We never use your boards, cards, or chats to train AI models. Full details in our{' '}
      <Link to="/privacy" className="underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-secondary)]">
        Privacy Policy
      </Link>.
    </span>
  </p>
</li>
```

(`GraduationCap` is already imported. Update the `DisclaimerStep` signature to `({ onContinue })`.)

- [ ] **Step 4: Honest undo copy** — replace the second `<li>` body:

```jsx
<span className="font-semibold">Deletes are undoable.</span>{' '}
<span className="text-[var(--text-secondary)]">
  Anything Claude deletes comes with a one-click undo, and destructive
  actions ask for your approval before they run.
</span>
```

- [ ] **Step 5: "Coming soon" on integrations** — in `UpsellStep`, mark the third feature and render the tag next to its `tag` chip:

```js
{
  tag: 'For your stack',
  comingSoon: true,
  title: 'Connect your tools',
  body: 'Google Calendar, Slack, Notion, and your code.',
  visual: <IntegrationsVisual />,
},
```

```jsx
<div className="flex items-center gap-1.5">
  <span className="inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-xs font-medium border border-[var(--color-sand)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
    {f.tag}
  </span>
  {f.comingSoon && (
    <span className="inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide border border-[var(--color-sand)] text-[var(--text-muted)]">
      Coming soon
    </span>
  )}
</div>
```

- [ ] **Step 6: Typed confirm-email error** — in `authStore.signUp`:

```js
if (!data.session) {
  const err = new Error('Check your inbox to confirm your account, then sign in.')
  err.code = 'confirm_email'
  throw err
}
```

In `DetailsStep`, render that case as info, not failure. Thread a new `errorCode` prop (set from `err.code` in `handleSubmitDetails`'s catch: `setErrorCode(err.code || null)`):

```jsx
{error && (
  <InlineNotice variant={errorCode === 'confirm_email' ? 'info' : 'error'}>{error}</InlineNotice>
)}
```

- [ ] **Step 7: Update tests** — in `validation.test.jsx`'s `passTermsStep`, change the regex to `/agree and continue/i`. Run `npm run test` → PASS.

- [ ] **Step 8: Commit** — `fix(onboarding): honest copy — terms CTA, no fake verification, never-train disclaimer, scoped undo claim, coming-soon integrations`

---

### Task 4: Design-system repairs — F14

**Files:**
- Modify: `src/components/ui/Button.jsx` (add `xl` size)
- Modify: `src/__tests__/Button.test.jsx` (xl case)
- Modify: `src/pages/OnboardingPage.jsx`, `src/components/PlanCard.jsx`, `src/pages/UpgradeProPage.jsx`

**Interfaces:**
- Produces: `Button size="xl"` → `h-11 px-5 text-base gap-2` (radius stays the system's `rounded-lg`; the 0.6rem radius was the incoherence, not the convention).

- [ ] **Step 1: Failing test**

```js
test('renders xl size for full-width flow CTAs', () => {
  render(<Button size="xl">Continue</Button>)
  expect(screen.getByRole('button')).toHaveClass('h-11', 'text-base')
})
```

- [ ] **Step 2: Run to verify fail**, then add to `SIZES` in `Button.jsx`:

```js
xl: 'h-11 px-5 text-base gap-2',
```

- [ ] **Step 3: Sweep the overrides** — in `OnboardingPage.jsx`, replace every `size="lg" … className="w-full !text-base !rounded-[0.6rem]"` with `size="xl" className="w-full"` (7 call sites: terms, details, upsell ×2, disclaimer, name, role-skip). In `PlanCard.jsx`, change the `<h3 style={{ fontFamily: 'var(--font-logo)' }}>` to `className="… font-logo"` (drop the inline style). In `UpgradeProPage.jsx`, fix the stray indentation on the subscribe `<Button size="lg"`.

- [ ] **Step 4: Document the one deliberate exception** — `NameStep`'s centered hero input stays bespoke; add above it:

```jsx
{/* Deliberate design-system exception: oversized centered hero input
    (like the kanban cards' 16px radius). Uses Input's focus tokens. */}
```

- [ ] **Step 5: Run** `npm run test` → PASS. Visually spot-check `/onboarding?step=terms` in the dev server.

- [ ] **Step 6: Commit** — `refactor(onboarding): Button xl size replaces !important overrides; PlanCard uses font-logo class`

---

### Task 5: Typography coherence — F11

**Files:**
- Modify: `src/pages/ForgotPasswordPage.jsx`, `src/pages/UpdatePasswordPage.jsx`, `src/pages/UpgradeProPage.jsx`
- Modify: `src/fonts.css` (comment), `CLAUDE.md` (typography table + pages list)

**Interfaces:**
- Produces: the rule "pre-auth/checkout pages use `font-logo font-light`; in-app pages use `font-heading font-[425]`" applied everywhere.

- [ ] **Step 1: Auth utility pages** — `ForgotPasswordPage.jsx:35` and `UpdatePasswordPage.jsx:46`, h1 className →

```jsx
className="text-[26px] font-light tracking-tight text-[var(--text-primary)] font-logo"
```

- [ ] **Step 2: Checkout page** — `UpgradeProPage.jsx:65` h1 →

```jsx
<h1 className="text-[32px] font-light font-logo tracking-tight leading-[1.15] mb-6">Pro plan</h1>
```

- [ ] **Step 3: Fix the stale comment** — `src/fonts.css:8` → `*   Clash Grotesk variable, wght 200–700 (--font-logo + --font-heading; app titles at 425, pre-auth display at 300)`

- [ ] **Step 4: Fix CLAUDE.md drift** — typography table row `--font-heading` → `Clash Grotesk | Page titles (weight 425)`; note Sentient is landing-only (`.landing-font`). In the `pages/` tree, replace `LoginPage / SignupPage` with `OnboardingPage.jsx  # 7-step signup flow (terms → details → plan → upsell → disclaimer → name → role)` and add `PlanPickerPage.jsx + UpgradeProPage.jsx`.

- [ ] **Step 5: Run** `npm run build` (sanity) and commit — `style(onboarding): one pre-auth display type rule; fix font docs drift`

---

### Task 6: Terms of Service + Privacy Policy pages — F04

**Files:**
- Create: `src/pages/LegalPage.jsx` (shared shell), `src/pages/TermsPage.jsx`, `src/pages/PrivacyPage.jsx`
- Modify: `src/App.jsx` (routes)

**Interfaces:**
- Produces: public routes `/terms` and `/privacy`. `LegalPage({ title, updated, children })` renders the shell.

- [ ] **Step 1: Shared shell**

```jsx
// src/pages/LegalPage.jsx
import { Link } from 'react-router-dom'
import { Kanban } from '@phosphor-icons/react'

// Shell for static legal pages (/terms, /privacy). Public, light-only
// like the landing page. Content is written to be protective but plain;
// not a substitute for counsel review.
export default function LegalPage({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <Link to="/" className="inline-flex items-center gap-1.5 mb-10">
          <Kanban size={24} weight="fill" className="text-[var(--color-logo)]" />
          <span className="text-lg font-[500] text-[var(--text-primary)] tracking-tight font-logo">Kolumn</span>
        </Link>
        <h1 className="text-[32px] font-light font-logo tracking-tight leading-[1.15] text-[var(--text-primary)] mb-1">{title}</h1>
        <p className="text-xs font-mono text-[var(--text-muted)] mb-10">Last updated {updated}</p>
        <div className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary)] [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--text-primary)] [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Terms page** — protective essentials: acceptance + 18+, account responsibility, acceptable use, user content ownership + limited license to operate the service, AI-output disclaimer, as-is warranty disclaimer, limitation of liability, termination, changes-to-terms, contact.

```jsx
// src/pages/TermsPage.jsx
import LegalPage from './LegalPage'

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 22, 2026">
      <section>
        <h2>1. Agreement</h2>
        <p>By creating an account or using Kolumn, you agree to these Terms and confirm you are at least 18 years old. If you use Kolumn on behalf of an organization, you represent that you can bind that organization.</p>
      </section>
      <section>
        <h2>2. Your account</h2>
        <p>You are responsible for your credentials and for activity under your account. Keep your password safe and tell us promptly about any unauthorized use.</p>
      </section>
      <section>
        <h2>3. Your content</h2>
        <p>Boards, cards, and messages you create are yours. You grant us a limited license to store, process, and display that content solely to operate and improve the service infrastructure — we do not sell it and do not use it to train AI models.</p>
      </section>
      <section>
        <h2>4. Acceptable use</h2>
        <ul>
          <li>No unlawful, infringing, or abusive content or activity.</li>
          <li>No attempts to probe, disrupt, or overload the service.</li>
          <li>No reselling or scraping the service without written permission.</li>
        </ul>
      </section>
      <section>
        <h2>5. AI features</h2>
        <p>Kolumn's assistant is powered by third-party AI models. AI output can be wrong or incomplete; review it before relying on it. Destructive AI actions ask for confirmation, and deletes offer an undo, but you remain responsible for changes made in your workspace.</p>
      </section>
      <section>
        <h2>6. Plans and billing</h2>
        <p>Paid plans renew until cancelled. Where a trial is offered, you can cancel before it ends without charge. We will notify you before billing begins on any early-access plan.</p>
      </section>
      <section>
        <h2>7. Disclaimer and liability</h2>
        <p>Kolumn is provided "as is" without warranties of any kind, to the maximum extent permitted by law. To the same extent, our total liability for any claim is limited to the amount you paid us in the twelve months before the claim arose.</p>
      </section>
      <section>
        <h2>8. Termination</h2>
        <p>You can delete your account at any time in Settings. We may suspend or terminate accounts that violate these Terms. On deletion, your content is removed per the Privacy Policy.</p>
      </section>
      <section>
        <h2>9. Changes</h2>
        <p>We may update these Terms; material changes will be announced in-app or by email. Continued use after changes take effect means you accept them.</p>
      </section>
      <section>
        <h2>10. Contact</h2>
        <p>Questions: support@kolumn.app.</p>
      </section>
    </LegalPage>
  )
}
```

- [ ] **Step 3: Privacy page**

```jsx
// src/pages/PrivacyPage.jsx
import LegalPage from './LegalPage'

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 22, 2026">
      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li><strong>Account data</strong> — email, display name, tier.</li>
          <li><strong>Your content</strong> — boards, columns, cards, chat messages.</li>
          <li><strong>Usage data</strong> — product analytics events and error reports, tied to your account id.</li>
        </ul>
      </section>
      <section>
        <h2>2. How we use it</h2>
        <p>To run Kolumn: storing your boards, syncing them in realtime, powering AI features you invoke, sending the emails you request, and understanding aggregate product usage. We do not sell your data and we do not use your content to train AI models.</p>
      </section>
      <section>
        <h2>3. Processors</h2>
        <p>Your data is handled by the infrastructure we run on: Supabase (database, auth — encrypted in transit and at rest), Anthropic (processes the messages and board context you send to the assistant), Sentry (error reports), and PostHog (product analytics).</p>
      </section>
      <section>
        <h2>4. AI requests</h2>
        <p>When you use the assistant, the message you type and relevant board context are sent to Anthropic's API to generate the response. We send only what the feature needs.</p>
      </section>
      <section>
        <h2>5. Your controls</h2>
        <ul>
          <li>Export all boards and cards as JSON from Settings → Privacy.</li>
          <li>Delete your account from Settings → Account; content is removed from the live database.</li>
          <li>Revoke active sessions from Settings → Account.</li>
        </ul>
      </section>
      <section>
        <h2>6. Retention</h2>
        <p>Content is kept while your account exists. Deleted accounts are purged from the live database; residual copies in encrypted backups expire on the backup rotation schedule.</p>
      </section>
      <section>
        <h2>7. Changes and contact</h2>
        <p>Material changes to this policy will be announced in-app or by email. Questions: support@kolumn.app.</p>
      </section>
    </LegalPage>
  )
}
```

- [ ] **Step 4: Routes** — in `App.jsx`, add lazy imports and public routes next to the landing route:

```jsx
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
…
<Route path="/terms" element={<ErrorBoundary><TermsPage /></ErrorBoundary>} />
<Route path="/privacy" element={<ErrorBoundary><PrivacyPage /></ErrorBoundary>} />
```

- [ ] **Step 5: Verify** — dev server: `/terms`, `/privacy` render; TermsStep links open them in a new tab. Run `npm run build`.

- [ ] **Step 6: Commit** — `feat(onboarding): real /terms and /privacy pages`

---

### Task 7: Migration — profiles onboarding columns

**Files:**
- Create: `supabase/migrations/2026-07-22-onboarding-completeness.sql`
- Modify: `supabase/schema.sql` (profiles block)

**Interfaces:**
- Produces: `profiles.role text`, `profiles.onboarded_at timestamptz`, `profiles.terms_accepted_at timestamptz`, `profiles.trial_ends_at timestamptz`. Existing profiles backfilled as onboarded/accepted.

- [ ] **Step 1: Write the migration**

```sql
-- Onboarding completeness (2026-07-22 audit fixes):
--   role              — chosen at the onboarding role step; used to tailor starters.
--   onboarded_at      — null = must (re-)enter /onboarding; AppLayout redirects on null.
--   terms_accepted_at — recorded at terms acceptance (email flow: at signup; OAuth: at the authed terms step).
--   trial_ends_at     — set when a Pro trial starts at checkout. Not yet enforced (billing is stubbed).
alter table public.profiles
  add column if not exists role text,
  add column if not exists onboarded_at timestamptz,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists trial_ends_at timestamptz;

-- Existing users predate the completion flow — never bounce them into it.
update public.profiles
  set onboarded_at = coalesce(onboarded_at, now()),
      terms_accepted_at = coalesce(terms_accepted_at, now());
```

- [ ] **Step 2: Mirror in `schema.sql`** — add the same four columns to the `profiles` create block (schema.sql is authoritative).

- [ ] **Step 3: Apply** — Supabase MCP `apply_migration` with the file's contents (name: `onboarding_completeness`). Verify with `list_tables` that the columns exist.

- [ ] **Step 4: Commit** — `feat(onboarding): profiles columns for role, completion, terms acceptance, trial`

---

### Task 8: Trial-aware checkout — F03

**Files:**
- Modify: `src/pages/UpgradeProPage.jsx`
- Modify: `src/pages/OnboardingPage.jsx` (pass `from: 'onboarding'`)

**Interfaces:**
- Consumes: `location.state = { trial?: boolean, from?: 'onboarding' }`; `updateProfile` from Task 7's columns.
- Produces: after activation, navigates to `/onboarding?step=disclaimer` when `from === 'onboarding'`, else `/dashboard`.

- [ ] **Step 1: Read the state** — in `UpgradeProPage`:

```jsx
import { useLocation, useNavigate } from 'react-router-dom'
import { addDays } from 'date-fns'
…
const location = useLocation()
const trial = !!location.state?.trial
const fromOnboarding = location.state?.from === 'onboarding'
const updateProfile = useAuthStore((s) => s.updateProfile)
const trialEnd = useMemo(() => format(addDays(new Date(), 7), 'MMMM d'), [])
```

- [ ] **Step 2: Trial UI** — order summary rows show `$0` due today on trial; renewal banner and CTA change:

```jsx
<div className="flex justify-between w-full font-medium text-[var(--text-primary)]">
  <span>Total due today</span>
  <span className="tabular-nums">${trial ? 0 : price.amount}</span>
</div>
```

```jsx
<p className="leading-relaxed">
  {trial
    ? `Pro is free until ${trialEnd}. After that your subscription renews at ${price.label} unless you cancel — anytime, in settings.`
    : `Your subscription will auto renew on ${renewalDate}. You will be charged ${price.label}. You can cancel anytime in your account settings.`}
</p>
```

CTA: `{trial ? 'Start free trial' : 'Activate Pro'}` with `loadingText={trial ? 'Starting trial' : 'Activating'}`.

- [ ] **Step 3: Persist + route** — `handleSubscribe`:

```jsx
const handleSubscribe = async () => {
  setSubmitting(true)
  try {
    await setTier('pro')
    if (trial) await updateProfile({ trial_ends_at: addDays(new Date(), 7).toISOString() })
    showToast.success(trial ? 'Pro trial started' : 'Welcome to Pro')
    navigate(fromOnboarding ? '/onboarding?step=disclaimer' : '/dashboard', { replace: true })
  } catch (err) {
    showToast.error(err?.message || 'Could not activate Pro')
    setSubmitting(false)
  }
}
```

- [ ] **Step 4: Senders** — in `OnboardingPage`: `handleTryProTrial = () => navigate('/upgrade/pro', { state: { trial: true, from: 'onboarding' } })`; in `handlePickPlan`, the `'pro'` branch → `navigate('/upgrade/pro', { state: { from: 'onboarding' } })`.

- [ ] **Step 5: Verify in browser** — upsell → "Get Pro free for 1 week" shows $0 due today + "Free until …"; activating lands on the disclaimer step. Run `npm run test`.

- [ ] **Step 6: Commit** — `feat(onboarding): checkout honors the 7-day Pro trial and returns to the flow`

---

### Task 9: Completion state machine — F05, F06, F10, F07-acceptance

**Files:**
- Create: `src/lib/onboardingSteps.js` (pure step-guard logic)
- Modify: `src/pages/OnboardingPage.jsx`
- Modify: `src/components/layout/AppLayout.jsx` (redirect un-onboarded profiles)
- Test: `src/__tests__/onboardingSteps.test.js` (create)

**Interfaces:**
- Consumes: Task 7 columns; `useAuthStore` `user`/`profile`/`updateProfile`.
- Produces: `resolveStepRedirect(step, { user, profile })` → `null | stepName`; `finishOnboarding()` sets `onboarded_at` before leaving the flow; AppLayout `<Navigate to="/onboarding?step=…">` when `profile.onboarded_at` is null.

- [ ] **Step 1: Failing tests for the pure guard**

```js
// src/__tests__/onboardingSteps.test.js
import { describe, test, expect } from 'vitest'
import { resolveStepRedirect, resumeStep } from '../lib/onboardingSteps'

const user = { id: 'u1' }
describe('resolveStepRedirect', () => {
  test('unauthenticated visitors cannot reach post-signup steps', () => {
    for (const s of ['plan', 'upsell', 'disclaimer', 'name', 'role'])
      expect(resolveStepRedirect(s, { user: null, profile: null })).toBe('terms')
  })
  test('signed-in users skip account creation', () => {
    expect(resolveStepRedirect('details', { user, profile: {} })).toBe('plan')
  })
  test('signed-in users who accepted terms skip the terms step', () => {
    expect(resolveStepRedirect('terms', { user, profile: { terms_accepted_at: 'x' } })).toBe('plan')
  })
  test('OAuth users (no acceptance) still see terms', () => {
    expect(resolveStepRedirect('terms', { user, profile: { terms_accepted_at: null } })).toBe(null)
  })
  test('valid states pass through', () => {
    expect(resolveStepRedirect('terms', { user: null, profile: null })).toBe(null)
    expect(resolveStepRedirect('name', { user, profile: {} })).toBe(null)
  })
})

describe('resumeStep', () => {
  test('no acceptance → terms; accepted → plan', () => {
    expect(resumeStep({ terms_accepted_at: null })).toBe('terms')
    expect(resumeStep({ terms_accepted_at: 'x' })).toBe('plan')
  })
})
```

- [ ] **Step 2: Run to verify fail**, then implement:

```js
// src/lib/onboardingSteps.js
// Pure step-flow rules for /onboarding. Kept out of the component so the
// guard logic is unit-testable without router/auth mocks.

export const STEPS = ['terms', 'details', 'plan', 'upsell', 'disclaimer', 'name', 'role']

// Steps that only make sense with a signed-in user.
const AUTH_STEPS = new Set(['plan', 'upsell', 'disclaimer', 'name', 'role'])

// Where should this visitor actually be? null = current step is fine.
export function resolveStepRedirect(step, { user, profile }) {
  if (!user) return AUTH_STEPS.has(step) ? 'terms' : null
  // Signed in: no account creation, and terms only if not yet accepted
  // (OAuth signups skip the pre-signup flow entirely).
  if (step === 'details') return 'plan'
  if (step === 'terms' && profile?.terms_accepted_at) return 'plan'
  return null
}

// Entry point for users bounced into the flow by AppLayout.
export function resumeStep(profile) {
  return profile?.terms_accepted_at ? 'terms_accepted_marker' : 'terms' // placeholder replaced below
}
```

**Correction (self-review):** `resumeStep` returns `'plan'` when accepted:

```js
export function resumeStep(profile) {
  return profile?.terms_accepted_at ? 'plan' : 'terms'
}
```

- [ ] **Step 3: Wire into OnboardingPage**

```jsx
import { resolveStepRedirect, STEPS } from '../lib/onboardingSteps'
…
const user = useAuthStore((s) => s.user)
const profile = useAuthStore((s) => s.profile)
…
// Step guard — prod only, so the DEV picker and design-review deep links
// keep working. Pure logic lives in lib/onboardingSteps (unit-tested).
useEffect(() => {
  if (import.meta.env.DEV) return
  const redirect = resolveStepRedirect(step, { user, profile })
  if (redirect) setStep(redirect)
}, [step, user, profile])
```

Delete the local `const STEPS = […]` (now imported).

- [ ] **Step 4: Record acceptance + completion**
  - `handleSubmitDetails`, after successful `signUp`: `updateProfile({ terms_accepted_at: new Date().toISOString() }).catch(() => {})` (fire-and-forget; the row exists via the signup trigger).
  - `handleAcceptTerms`: when `user` exists (OAuth path), `await updateProfile({ terms_accepted_at: new Date().toISOString() })` then `setStep('plan')`; unauthenticated keeps `setStep('details')`.
  - New helper inside the component:

```jsx
const finishOnboarding = async (to, state) => {
  try { await updateProfile({ onboarded_at: new Date().toISOString() }) } catch { /* non-blocking */ }
  navigate(to, { replace: true, ...(state ? { state } : {}) })
}
```

  - `handlePickPlan` `'team'` branch: `await setTier('team'); setStep('disclaimer')` (no more direct dashboard exit).
  - `handleSkipRole = () => finishOnboarding('/dashboard')`.
  - `NameStep` prefill: `useState(profile?.display_name || '')` — OAuth users see their Google name pre-filled. Initialize via `useEffect` when profile arrives if state is empty: `useEffect(() => { if (!displayName && profile?.display_name) setDisplayName(profile.display_name) }, [profile?.display_name])`.

- [ ] **Step 5: AppLayout redirect** — top of `AppLayout()` render, after hooks:

```jsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { resumeStep } from '../../lib/onboardingSteps'
…
const profile = useAuthStore((s) => s.profile)
// Un-onboarded profiles (new OAuth signups, abandoned flows) finish
// onboarding before seeing the shell. Existing users are backfilled.
if (profile && !profile.onboarded_at) {
  return <Navigate to={`/onboarding?step=${resumeStep(profile)}`} replace />
}
```

- [ ] **Step 6: Run** `npm run test` (onboardingSteps + validation suites) → PASS. Browser: sign-out/in flows still work; DEV picker unaffected.

- [ ] **Step 7: Commit** — `feat(onboarding): completion state machine — OAuth terms, team/pro paths finish the flow, prod step guards`

---

### Task 10: Starter boards — real templates + role persistence — F02

**Files:**
- Create: `src/data/starterBoards.js`
- Create: `src/lib/seedStarterBoard.js`
- Modify: `src/pages/OnboardingPage.jsx` (RoleStep wiring)
- Test: `src/__tests__/starterBoards.test.js` (create)

**Interfaces:**
- Consumes: `STARTER_PROMPTS` role/starter ids from `OnboardingPage.jsx`; `finishOnboarding` from Task 9; `useBoardStore.setActiveBoard`.
- Produces: `getStarterBoard(role, starterId)` → template or null; `seedStarterBoard(userId, template)` → new board id.

- [ ] **Step 1: Failing coverage test**

```js
// src/__tests__/starterBoards.test.js
import { describe, test, expect } from 'vitest'
import { STARTER_BOARDS, getStarterBoard } from '../data/starterBoards'
import { STARTER_PROMPTS } from '../data/starterPrompts'

describe('starter boards', () => {
  test('every starter prompt has a template — no dead-end clicks', () => {
    for (const [role, starters] of Object.entries(STARTER_PROMPTS)) {
      for (const s of starters) {
        expect(getStarterBoard(role, s.id), `${role}/${s.id}`).toBeTruthy()
      }
    }
  })
  test('templates are well-formed', () => {
    for (const [key, t] of Object.entries(STARTER_BOARDS)) {
      expect(t.name, key).toBeTruthy()
      expect(t.columns.length, key).toBeGreaterThanOrEqual(3)
      for (const col of t.columns)
        for (const card of col.cards)
          for (const item of card.checklist || []) {
            expect(item).toHaveProperty('done')
            expect(item).not.toHaveProperty('completed')
          }
    }
  })
})
```

This requires extracting `ROLES` + `STARTER_PROMPTS` from `OnboardingPage.jsx` into `src/data/starterPrompts.js` (same content, plus exports) so both the page and tests import it. Move them verbatim; `OnboardingPage` imports `{ ROLES, STARTER_PROMPTS }`.

- [ ] **Step 2: Run to verify fail**, then create the data file (all 27 templates; icons are Phosphor kebab names; priorities sparse; checklists use `{ text, done }`):

```js
// src/data/starterBoards.js
// Starter-board templates behind the onboarding role step. Keyed
// `${role}/${starterId}` to match STARTER_PROMPTS. Instantiated by
// src/lib/seedStarterBoard.js. Card shape mirrors onboardingBoard.js.

export const STARTER_BOARDS = {
  'engineering/sprint': {
    name: 'Sprint board', icon: 'lightning',
    columns: [
      { title: 'Backlog', cards: [
        { title: 'Define the sprint goal', icon: 'target', priority: 'high',
          checklist: [{ text: 'Write one sentence', done: false }, { text: 'Share with the team', done: false }] },
        { title: 'Groom the backlog', icon: 'list-checks', priority: 'medium' },
      ]},
      { title: 'In progress', cards: [
        { title: 'Your first sprint task goes here', icon: 'circle-dashed', priority: 'medium' },
      ]},
      { title: 'Review', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  'engineering/bug-triage': {
    name: 'Bug triage', icon: 'bug',
    columns: [
      { title: 'Reported', cards: [
        { title: 'Example: login button unresponsive', icon: 'bug', priority: 'high',
          description: 'Capture repro steps, expected vs actual, and environment.' },
        { title: 'Set up severity labels', icon: 'tag', priority: 'medium',
          checklist: [{ text: 'critical / major / minor', done: false }] },
      ]},
      { title: 'Triaged', cards: [] },
      { title: 'Fixing', cards: [] },
      { title: 'Resolved', cards: [] },
    ],
  },
  'engineering/roadmap': {
    name: 'Release roadmap', icon: 'rocket-launch',
    columns: [
      { title: 'Now', cards: [
        { title: 'Current release theme', icon: 'flag', priority: 'high' },
      ]},
      { title: 'Next', cards: [
        { title: 'Next release candidates', icon: 'stack', priority: 'medium' },
      ]},
      { title: 'Later', cards: [
        { title: 'Ideas parking lot', icon: 'lightbulb', priority: 'low' },
      ]},
      { title: 'Shipped', cards: [] },
    ],
  },
  'design/reviews': {
    name: 'Design reviews', icon: 'pen-nib',
    columns: [
      { title: 'Queued', cards: [
        { title: 'Add a design for review', icon: 'plus-circle', priority: 'medium',
          description: 'Link the file, name the reviewer, set a due date.' },
      ]},
      { title: 'In review', cards: [] },
      { title: 'Changes requested', cards: [] },
      { title: 'Approved', cards: [] },
    ],
  },
  'design/library': {
    name: 'Component library', icon: 'squares-four',
    columns: [
      { title: 'To spec', cards: [
        { title: 'Button', icon: 'cursor-click', priority: 'high',
          checklist: [{ text: 'Variants', done: false }, { text: 'States', done: false }, { text: 'Tokens', done: false }] },
        { title: 'Input', icon: 'textbox', priority: 'medium' },
      ]},
      { title: 'Building', cards: [] },
      { title: 'In review', cards: [] },
      { title: 'Shipped', cards: [] },
    ],
  },
  'design/research': {
    name: 'Research pipeline', icon: 'users',
    columns: [
      { title: 'Questions', cards: [
        { title: 'What do we need to learn?', icon: 'question', priority: 'high' },
      ]},
      { title: 'Recruiting', cards: [
        { title: 'Draft the screener', icon: 'funnel', priority: 'medium' },
      ]},
      { title: 'In session', cards: [] },
      { title: 'Synthesized', cards: [] },
    ],
  },
  'product/roadmap': {
    name: 'Product roadmap', icon: 'compass',
    columns: [
      { title: 'Now', cards: [
        { title: 'This quarter\'s bet', icon: 'flag', priority: 'high' },
      ]},
      { title: 'Next', cards: [] },
      { title: 'Later', cards: [
        { title: 'Ideas parking lot', icon: 'lightbulb', priority: 'low' },
      ]},
      { title: 'Shipped', cards: [] },
    ],
  },
  'product/backlog': {
    name: 'Feature backlog', icon: 'list-checks',
    columns: [
      { title: 'Inbox', cards: [
        { title: 'Capture every request here first', icon: 'tray', priority: 'medium',
          description: 'One card per request. Triage weekly into Prioritized.' },
      ]},
      { title: 'Prioritized', cards: [] },
      { title: 'In progress', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  'product/launch': {
    name: 'Launch checklist', icon: 'check-square',
    columns: [
      { title: 'Pre-launch', cards: [
        { title: 'Write the announcement', icon: 'megaphone', priority: 'high',
          checklist: [{ text: 'Draft', done: false }, { text: 'Review', done: false }, { text: 'Schedule', done: false }] },
        { title: 'QA pass on the release', icon: 'magnifying-glass', priority: 'high' },
      ]},
      { title: 'Launch week', cards: [] },
      { title: 'Post-launch', cards: [
        { title: 'Collect first-week feedback', icon: 'chat-circle-dots', priority: 'medium' },
      ]},
      { title: 'Done', cards: [] },
    ],
  },
  'marketing/campaign': {
    name: 'Campaign tracker', icon: 'megaphone',
    columns: [
      { title: 'Ideas', cards: [
        { title: 'Campaign concept', icon: 'lightbulb', priority: 'medium',
          checklist: [{ text: 'Audience', done: false }, { text: 'Channel', done: false }, { text: 'Budget', done: false }] },
      ]},
      { title: 'Planning', cards: [] },
      { title: 'Live', cards: [] },
      { title: 'Wrapped', cards: [] },
    ],
  },
  'marketing/content': {
    name: 'Content calendar', icon: 'calendar-blank',
    columns: [
      { title: 'Ideas', cards: [
        { title: 'Brainstorm this month\'s topics', icon: 'lightbulb', priority: 'medium' },
      ]},
      { title: 'Drafting', cards: [] },
      { title: 'Editing', cards: [] },
      { title: 'Published', cards: [] },
    ],
  },
  'marketing/launch-comms': {
    name: 'Launch comms', icon: 'paper-plane-tilt',
    columns: [
      { title: 'Drafts', cards: [
        { title: 'Announcement email', icon: 'envelope', priority: 'high' },
        { title: 'Social posts', icon: 'megaphone', priority: 'medium' },
      ]},
      { title: 'Scheduled', cards: [] },
      { title: 'Sent', cards: [] },
      { title: 'Follow-up', cards: [] },
    ],
  },
  'operations/vendors': {
    name: 'Vendor pipeline', icon: 'handshake',
    columns: [
      { title: 'Prospects', cards: [
        { title: 'Add a vendor to evaluate', icon: 'plus-circle', priority: 'medium',
          checklist: [{ text: 'Pricing', done: false }, { text: 'References', done: false }, { text: 'Security review', done: false }] },
      ]},
      { title: 'In talks', cards: [] },
      { title: 'Contracting', cards: [] },
      { title: 'Active', cards: [] },
    ],
  },
  'operations/incidents': {
    name: 'Incident retro', icon: 'warning-circle',
    columns: [
      { title: 'Timeline', cards: [
        { title: 'Reconstruct what happened', icon: 'clock', priority: 'high' },
      ]},
      { title: 'What went well', cards: [] },
      { title: 'What hurt', cards: [] },
      { title: 'Action items', cards: [
        { title: 'Assign owners and due dates', icon: 'user-check', priority: 'high' },
      ]},
    ],
  },
  'operations/okrs': {
    name: 'Quarterly OKRs', icon: 'target',
    columns: [
      { title: 'Objectives', cards: [
        { title: 'Objective 1', icon: 'target', priority: 'high',
          checklist: [{ text: 'Key result 1', done: false }, { text: 'Key result 2', done: false }] },
      ]},
      { title: 'On track', cards: [] },
      { title: 'At risk', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  'sales/pipeline': {
    name: 'Deal pipeline', icon: 'funnel',
    columns: [
      { title: 'Leads', cards: [
        { title: 'Example: Acme Corp', icon: 'buildings', priority: 'medium',
          description: 'Contact, deal size, next step — keep it on the card.' },
      ]},
      { title: 'Qualified', cards: [] },
      { title: 'Proposal', cards: [] },
      { title: 'Closed', cards: [] },
    ],
  },
  'sales/outreach': {
    name: 'Outreach queue', icon: 'paper-plane-tilt',
    columns: [
      { title: 'To contact', cards: [
        { title: 'Build this week\'s list', icon: 'list-plus', priority: 'high' },
      ]},
      { title: 'Contacted', cards: [] },
      { title: 'Replied', cards: [] },
      { title: 'Meeting booked', cards: [] },
    ],
  },
  'sales/discovery': {
    name: 'Discovery call prep', icon: 'magnifying-glass',
    columns: [
      { title: 'Research', cards: [
        { title: 'Company background', icon: 'buildings', priority: 'high',
          checklist: [{ text: 'Size + funding', done: false }, { text: 'Current tooling', done: false }] },
      ]},
      { title: 'Questions', cards: [
        { title: 'Top 5 discovery questions', icon: 'question', priority: 'high' },
      ]},
      { title: 'Call notes', cards: [] },
      { title: 'Next steps', cards: [] },
    ],
  },
  'founder/investors': {
    name: 'Investor pipeline', icon: 'bank',
    columns: [
      { title: 'Targets', cards: [
        { title: 'Build the target list', icon: 'list-plus', priority: 'high',
          checklist: [{ text: 'Stage fit', done: false }, { text: 'Check size', done: false }, { text: 'Warm paths', done: false }] },
      ]},
      { title: 'Intro made', cards: [] },
      { title: 'In diligence', cards: [] },
      { title: 'Committed', cards: [] },
    ],
  },
  'founder/hiring': {
    name: 'Hiring funnel', icon: 'user-plus',
    columns: [
      { title: 'Sourcing', cards: [
        { title: 'Write the job post', icon: 'note-pencil', priority: 'high' },
      ]},
      { title: 'Screening', cards: [] },
      { title: 'Interviewing', cards: [] },
      { title: 'Offer', cards: [] },
    ],
  },
  'founder/bets': {
    name: 'Strategic bets', icon: 'compass',
    columns: [
      { title: 'Ideas', cards: [
        { title: 'What could 10x the business?', icon: 'lightbulb', priority: 'medium' },
      ]},
      { title: 'Validating', cards: [] },
      { title: 'Betting', cards: [] },
      { title: 'Review', cards: [] },
    ],
  },
  'student/coursework': {
    name: 'Coursework', icon: 'books',
    columns: [
      { title: 'This week', cards: [
        { title: 'Add each assignment as a card', icon: 'plus-circle', priority: 'medium',
          description: 'Set due dates — overdue work turns copper so nothing slips.' },
      ]},
      { title: 'In progress', cards: [] },
      { title: 'Submitted', cards: [] },
      { title: 'Graded', cards: [] },
    ],
  },
  'student/thesis': {
    name: 'Thesis project', icon: 'graduation-cap',
    columns: [
      { title: 'Reading', cards: [
        { title: 'Literature review list', icon: 'book-open', priority: 'high' },
      ]},
      { title: 'Writing', cards: [
        { title: 'Chapter outline', icon: 'list-bullets', priority: 'high',
          checklist: [{ text: 'Intro', done: false }, { text: 'Method', done: false }, { text: 'Results', done: false }] },
      ]},
      { title: 'Review', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  'student/reading': {
    name: 'Reading list', icon: 'book-open',
    columns: [
      { title: 'To read', cards: [
        { title: 'Add a book or paper', icon: 'plus-circle', priority: 'low' },
      ]},
      { title: 'Reading', cards: [] },
      { title: 'Notes', cards: [] },
      { title: 'Finished', cards: [] },
    ],
  },
  'other/todos': {
    name: 'Personal todos', icon: 'check-circle',
    columns: [
      { title: 'Today', cards: [
        { title: 'Your most important task', icon: 'star', priority: 'high' },
      ]},
      { title: 'This week', cards: [] },
      { title: 'Someday', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  'other/reading': {
    name: 'Reading queue', icon: 'book-bookmark',
    columns: [
      { title: 'To read', cards: [
        { title: 'Add an article or book', icon: 'plus-circle', priority: 'low' },
      ]},
      { title: 'Reading', cards: [] },
      { title: 'Finished', cards: [] },
    ],
  },
  'other/review': {
    name: 'Weekly review', icon: 'list-bullets',
    columns: [
      { title: 'Inbox', cards: [
        { title: 'Everything on your mind — one card each', icon: 'tray', priority: 'medium' },
      ]},
      { title: 'This week', cards: [] },
      { title: 'Next week', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
}

export function getStarterBoard(role, starterId) {
  return STARTER_BOARDS[`${role}/${starterId}`] || null
}
```

- [ ] **Step 3: The seeder** (pattern mirrors `seedOnboardingBoard.js` — no labels, no tour flags; see that file for why inserts avoid `.select()`):

```js
// src/lib/seedStarterBoard.js
import { supabase } from './supabase'
import { useBoardStore } from '../store/boardStore'

// Instantiate a starter template (src/data/starterBoards.js) for a new
// user. Same RLS-aware insert pattern as seedOnboardingBoard.js: no
// .select() after insert (the boards SELECT policy snapshot predates the
// auto-add-owner trigger), client-owned UUIDs, store synced at the end.
export async function seedStarterBoard(userId, template) {
  const boardId = crypto.randomUUID()
  const board = {
    id: boardId,
    name: template.name,
    icon: template.icon || null,
    owner_id: userId,
    next_task_number: 1,
    created_at: new Date().toISOString(),
  }
  const { error: boardErr } = await supabase.from('boards').insert(board)
  if (boardErr) throw boardErr

  const columnInserts = template.columns.map((col, i) => ({
    id: crypto.randomUUID(),
    board_id: boardId,
    title: col.title,
    position: i,
  }))
  const { error: colErr } = await supabase.from('columns').insert(columnInserts)
  if (colErr) throw colErr

  let taskCounter = 1
  const cardInserts = []
  template.columns.forEach((colDef, colIdx) => {
    colDef.cards.forEach((cardDef, cardIdx) => {
      cardInserts.push({
        id: crypto.randomUUID(),
        board_id: boardId,
        column_id: columnInserts[colIdx].id,
        position: cardIdx,
        task_number: taskCounter,
        global_task_number: taskCounter, // ignored — DB trigger assigns atomically
        title: cardDef.title,
        description: cardDef.description || '',
        priority: cardDef.priority || 'medium',
        icon: cardDef.icon || null,
        completed: false,
        checklist: cardDef.checklist || [],
      })
      taskCounter++
    })
  })
  if (cardInserts.length > 0) {
    const { error: cardErr } = await supabase.from('cards').insert(cardInserts)
    if (cardErr) throw cardErr
  }

  await supabase.from('boards').update({ next_task_number: taskCounter }).eq('id', boardId)

  useBoardStore.setState((s) => ({
    boards: { ...s.boards, [boardId]: { ...board, next_task_number: taskCounter } },
    columns: { ...s.columns, ...Object.fromEntries(columnInserts.map((c) => [c.id, c])) },
    cards: { ...s.cards, ...Object.fromEntries(cardInserts.map((c) => [c.id, c])) },
  }))

  return boardId
}
```

- [ ] **Step 4: Wire RoleStep** — in `OnboardingPage`:

```jsx
import { getStarterBoard } from '../data/starterBoards'
import { seedStarterBoard } from '../lib/seedStarterBoard'
import { useBoardStore } from '../store/boardStore'
import { showToast } from '../utils/toast'
…
const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
const [seedingStarter, setSeedingStarter] = useState(null)

const handlePickRole = (roleId) => {
  setRole(roleId)
  updateProfile({ role: roleId }).catch(() => {}) // non-blocking
}

const handlePickStarter = async (starterId) => {
  const template = getStarterBoard(role, starterId)
  if (!template || !user) { handleSkipRole(); return }
  setSeedingStarter(starterId)
  try {
    const boardId = await seedStarterBoard(user.id, template)
    setActiveBoard(boardId)
    await finishOnboarding('/boards')
  } catch (err) {
    showToast.error(err?.message || "Couldn't create your starter board")
    setSeedingStarter(null)
  }
}
```

`RoleStep` gains `seedingStarter` prop; each starter button: `disabled={!!seedingStarter}`, and when `seedingStarter === id` swap the icon for the loading affordance the flow already uses (`LetterWave` on the title):

```jsx
<button
  type="button"
  onClick={() => onPickStarter(id)}
  disabled={!!seedingStarter}
  className="… disabled:opacity-60 disabled:cursor-wait"
>
  <span aria-hidden="true" className="shrink-0 w-10 flex items-center justify-center text-[var(--text-primary)]">
    <Icon size={22} weight="duotone" />
  </span>
  {seedingStarter === id ? <LetterWave text="Setting up your board" /> : title}
</button>
```

(`import LetterWave from '../components/ui/LetterWave'`.)

- [ ] **Step 5: Run** `npm run test -- starterBoards` → PASS; full suite green. Browser: pick Engineering → "Plan a sprint board" → lands on `/boards` with the seeded board active.

- [ ] **Step 6: Commit** — `feat(onboarding): 27 real starter-board templates seeded from the role step; role persisted`

---

### Task 11: Plans copy matches actual gating — F17

**Files:**
- Modify: `src/data/plans.js`

- [ ] **Step 1: Edit bullets**

```js
// Free
bullets: [
  'Unlimited boards & cards',
  'Drag-and-drop, labels, due dates, checklists',
  'Real-time team collaboration',
  'AI card creation — 20 messages per day',
],
// Pro
bullets: [
  'Unlimited AI messages',
  'Claude can move, update, and reorganize cards across your boards',
  'Priority support',
],
```

- [ ] **Step 2: Run** `npm run test`, spot-check landing pricing + picker. Commit — `fix(onboarding): plan bullets match (mode × tier) gating`

---

### Task 12: Final verification + docs

**Files:**
- Modify: `docs/superpowers/plans/2026-07-22-onboarding-audit-fixes.md` (check boxes)

- [ ] **Step 1:** `npm run lint` → clean; `npm run test` → all green; `npm run build` → succeeds.
- [ ] **Step 2:** Browser pass of the full flow: landing → email → terms → details → plan (all three picks) → trial checkout → disclaimer → name → role → starter → `/boards`. Verify `/terms`, `/privacy`, tour board checklists, Done column.
- [ ] **Step 3:** Commit any stragglers — `docs: onboarding audit fix plan`

## Self-Review Notes

- **Spec coverage:** F01→T1, F02→T10, F03→T8, F04→T6, F05/F06→T9, F07→T3+T9, F08→T3, F09/F15/F16→T2, F10→T9, F11→T5, F12/F13→T3, F14→T4, F17→T11, F18→T3; gaps: starter wiring→T10, toggle policy→T3, legal pages→T6, trial→T8, unified exits→T9, step guards→T9, confirm-email→T3. Trial expiry enforcement is an explicit non-goal.
- **Type consistency:** `resolveStepRedirect(step, { user, profile })`, `resumeStep(profile)`, `getStarterBoard(role, starterId)`, `seedStarterBoard(userId, template)`, `finishOnboarding(to, state?)` used consistently across T8–T10.
- **Test-mock caveat:** `validation.test.jsx` mocks `useAuthStore` with a fixed selector object; new selectors (`user`, `profile`) resolve `undefined` there, which reads as "unauthenticated" — safe because step guards are prod-only (`import.meta.env.DEV` short-circuit) and pure logic is tested directly in `onboardingSteps.test.js`.
