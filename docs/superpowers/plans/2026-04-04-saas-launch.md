# SaaS Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Kolumn as a publicly accessible free product on `kolumn.app` with invisible infrastructure for future monetization.

**Architecture:** Add a thin plan/usage-tracking layer in Supabase (DB triggers, no app logic), integrate Sentry for error visibility and PostHog for product analytics, harden env var handling, and reposition the landing page for a real product launch. All changes are additive — no existing behavior changes.

**Tech Stack:** Supabase (Postgres triggers, RLS), @sentry/react, posthog-js, Vite env vars, React 19

---

## File Structure

| File | Role |
|------|------|
| `supabase/migrations/saas-foundation.sql` | New — plans table, usage_metrics table, tracking triggers |
| `src/lib/env.js` | New — env var validation + typed exports |
| `src/lib/analytics.js` | New — PostHog wrapper (init, identify, capture, reset) |
| `src/lib/supabase.js` | Modify — import from env.js instead of raw import.meta.env |
| `src/main.jsx` | Modify — init Sentry + analytics, wire error boundary |
| `src/store/authStore.js` | Modify — PostHog identify on sign-in, reset on sign-out, capture signup |
| `src/store/boardStore.js` | Modify — PostHog capture for board_created, card_created |
| `src/components/board/BoardShareModal.jsx` | Modify — PostHog capture for member_invited |
| `src/components/ErrorBoundary.jsx` | Modify — report to Sentry in componentDidCatch |
| `src/pages/CalendarPage.jsx` | Modify — PostHog capture feature_used |
| `src/pages/NotesPage.jsx` | Modify — PostHog capture feature_used |
| `src/pages/DashboardPage.jsx` | Modify — PostHog capture feature_used |
| `src/pages/LandingPageV2.jsx` | New — duplicate of LandingPage with SaaS positioning |
| `src/App.jsx` | Modify — add /landing-v2 route |
| `.env.example` | Modify — add new optional env vars |
| `package.json` | Modify — add @sentry/react, posthog-js |

---

### Task 1: Database Migration — Plans & Usage Tracking

**Files:**
- Create: `supabase/migrations/saas-foundation.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- =============================================================
-- SaaS Foundation: Plans + Usage Tracking
-- =============================================================

-- Plans table — one row per pricing tier (just 'free' for now)
CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  limits jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Seed the free plan
INSERT INTO plans (id, name, limits) VALUES
  ('free', 'Free', '{"boards": null, "members_per_board": null}')
ON CONFLICT (id) DO NOTHING;

-- Add plan reference to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan_id text DEFAULT 'free' REFERENCES plans(id);
  END IF;
END $$;

-- RLS for plans (public read, no write from client)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans"
  ON plans FOR SELECT
  USING (true);

-- =============================================================
-- Usage Metrics
-- =============================================================

CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL,
  value bigint NOT NULL DEFAULT 0,
  period text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, metric, period)
);

ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own metrics"
  ON usage_metrics FOR SELECT
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_period
  ON usage_metrics(user_id, period);

-- =============================================================
-- Tracking Triggers
-- =============================================================

-- Helper: upsert a usage metric (increment by 1)
CREATE OR REPLACE FUNCTION increment_usage_metric(
  p_user_id uuid,
  p_metric text,
  p_period text
) RETURNS void AS $$
BEGIN
  INSERT INTO usage_metrics (user_id, metric, value, period, updated_at)
  VALUES (p_user_id, p_metric, 1, p_period, now())
  ON CONFLICT (user_id, metric, period)
  DO UPDATE SET value = usage_metrics.value + 1, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track boards_created
CREATE OR REPLACE FUNCTION track_board_created() RETURNS trigger AS $$
BEGIN
  PERFORM increment_usage_metric(
    NEW.owner_id,
    'boards_created',
    to_char(now(), 'YYYY-MM')
  );
  PERFORM increment_usage_metric(
    NEW.owner_id,
    'total_boards',
    'lifetime'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_track_board_created ON boards;
CREATE TRIGGER trg_track_board_created
  AFTER INSERT ON boards
  FOR EACH ROW EXECUTE FUNCTION track_board_created();

-- Track cards_created (use the board's owner_id via join)
CREATE OR REPLACE FUNCTION track_card_created() RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id FROM boards WHERE id = NEW.board_id;
  IF v_owner_id IS NOT NULL THEN
    PERFORM increment_usage_metric(
      v_owner_id,
      'cards_created',
      to_char(now(), 'YYYY-MM')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_track_card_created ON cards;
CREATE TRIGGER trg_track_card_created
  AFTER INSERT ON cards
  FOR EACH ROW EXECUTE FUNCTION track_card_created();

-- Track members_invited
CREATE OR REPLACE FUNCTION track_member_invited() RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id FROM boards WHERE id = NEW.board_id;
  IF v_owner_id IS NOT NULL THEN
    PERFORM increment_usage_metric(
      v_owner_id,
      'members_invited',
      to_char(now(), 'YYYY-MM')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_track_member_invited ON board_invitations;
CREATE TRIGGER trg_track_member_invited
  AFTER INSERT ON board_invitations
  FOR EACH ROW EXECUTE FUNCTION track_member_invited();
```

- [ ] **Step 2: Run the migration in Supabase SQL Editor**

Copy the contents of `supabase/migrations/saas-foundation.sql` and execute in your Supabase project's SQL Editor. Verify:
- `plans` table exists with one row (`free`)
- `profiles` table has `plan_id` column defaulting to `'free'`
- `usage_metrics` table exists and is empty
- All three triggers exist: `trg_track_board_created`, `trg_track_card_created`, `trg_track_member_invited`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/saas-foundation.sql
git commit -m "db: add plans table, usage_metrics, and tracking triggers"
```

---

### Task 2: Environment Validation

**Files:**
- Create: `src/lib/env.js`
- Modify: `src/lib/supabase.js`
- Modify: `.env.example`

- [ ] **Step 1: Create env.js**

```js
// Environment variable validation — imported before anything else in main.jsx.
// Required vars throw at startup; optional vars degrade gracefully.

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

for (const key of required) {
  if (!import.meta.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}. Check .env.local or your hosting provider's env settings.`
    )
  }
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || null,
  posthogKey: import.meta.env.VITE_POSTHOG_KEY || null,
  posthogHost: import.meta.env.VITE_POSTHOG_HOST || null,
}
```

- [ ] **Step 2: Update supabase.js to use env.js**

Replace the full contents of `src/lib/supabase.js` with:

```js
import { createClient } from '@supabase/supabase-js'
import { env } from './env'

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey)
```

- [ ] **Step 3: Update .env.example**

Replace the full contents of `.env.example` with:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Optional — error tracking (https://sentry.io)
VITE_SENTRY_DSN=

# Optional — product analytics (https://posthog.com)
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
```

- [ ] **Step 4: Verify the build still works**

Run: `npm run build`
Expected: Build succeeds (env validation only throws at runtime, not build time, because Vite injects env vars at build)

- [ ] **Step 5: Commit**

```bash
git add src/lib/env.js src/lib/supabase.js .env.example
git commit -m "feat: add env var validation and typed env exports"
```

---

### Task 3: Sentry Error Tracking

**Files:**
- Modify: `package.json` (install @sentry/react)
- Modify: `src/main.jsx`
- Modify: `src/components/ErrorBoundary.jsx`
- Modify: `src/store/authStore.js`

- [ ] **Step 1: Install @sentry/react**

Run: `npm install @sentry/react`

- [ ] **Step 2: Initialize Sentry in main.jsx**

In `src/main.jsx`, add after the existing imports (before the `window.addEventListener` lines):

```js
import * as Sentry from '@sentry/react'
import { env } from './lib/env'
```

Replace the two global error handlers (lines 18-24) and add Sentry init before them:

```js
// Initialize Sentry (no-op if DSN not configured)
if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: import.meta.env.MODE,
    sampleRate: 1.0,
  })
}

// Global error handlers — catch unhandled errors and rejections
window.addEventListener('error', (event) => {
  console.error('[Kolumn] Unhandled error:', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Kolumn] Unhandled promise rejection:', event.reason)
})
```

- [ ] **Step 3: Add Sentry reporting to ErrorBoundary**

In `src/components/ErrorBoundary.jsx`, add the import at the top:

```js
import * as Sentry from '@sentry/react'
```

In the `componentDidCatch` method (line 15-17), add Sentry reporting:

```js
  componentDidCatch(error, errorInfo) {
    logError('ErrorBoundary caught:', error, errorInfo)
    Sentry.captureException(error, { extra: { componentStack: errorInfo?.componentStack } })
  }
```

- [ ] **Step 4: Set Sentry user context on auth**

In `src/store/authStore.js`, add the import at the top:

```js
import * as Sentry from '@sentry/react'
```

In the `signUp` method, after `set({ user: data.session.user, session: data.session })` (line 96), add:

```js
    Sentry.setUser({ id: data.session.user.id, email })
```

In the `signIn` method, after `set({ user: data.session.user, session: data.session })` (line 106), add:

```js
    Sentry.setUser({ id: data.session.user.id, email })
```

In the `signOut` method, after `set({ user: null, session: null, profile: null })` (line 111), add:

```js
    Sentry.setUser(null)
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: Build succeeds. Sentry is tree-shaken to near-zero if DSN is not set at runtime.

- [ ] **Step 6: Run existing tests**

Run: `npm test`
Expected: All existing tests pass. Sentry calls are no-ops in test environment (no DSN configured).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/main.jsx src/components/ErrorBoundary.jsx src/store/authStore.js
git commit -m "feat: integrate Sentry error tracking"
```

---

### Task 4: PostHog Analytics

**Files:**
- Modify: `package.json` (install posthog-js)
- Create: `src/lib/analytics.js`
- Modify: `src/main.jsx`
- Modify: `src/store/authStore.js`
- Modify: `src/store/boardStore.js`
- Modify: `src/components/board/BoardShareModal.jsx`
- Modify: `src/pages/CalendarPage.jsx`
- Modify: `src/pages/NotesPage.jsx`
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Install posthog-js**

Run: `npm install posthog-js`

- [ ] **Step 2: Create analytics.js wrapper**

Create `src/lib/analytics.js`:

```js
import posthog from 'posthog-js'
import { env } from './env'

let initialized = false

export function initAnalytics() {
  if (!env.posthogKey || !env.posthogHost) return
  posthog.init(env.posthogKey, {
    api_host: env.posthogHost,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
  })
  initialized = true
}

export function identifyUser(userId, properties = {}) {
  if (!initialized) return
  posthog.identify(userId, properties)
}

export function resetUser() {
  if (!initialized) return
  posthog.reset()
}

export function capture(event, properties = {}) {
  if (!initialized) return
  posthog.capture(event, properties)
}
```

- [ ] **Step 3: Initialize analytics in main.jsx**

In `src/main.jsx`, add after the Sentry import:

```js
import { initAnalytics } from './lib/analytics'
```

Add after the Sentry init block (before the global error handlers):

```js
// Initialize product analytics (no-op if keys not configured)
initAnalytics()
```

- [ ] **Step 4: Add PostHog identify/reset to authStore**

In `src/store/authStore.js`, add the import at the top (alongside the existing Sentry import from Task 3):

```js
import { identifyUser, resetUser, capture } from '../lib/analytics'
```

In the `signUp` method, after the `Sentry.setUser(...)` line added in Task 3, add:

```js
    identifyUser(data.session.user.id, { email, display_name: displayName })
    capture('user_signed_up')
```

In the `signIn` method, after the `Sentry.setUser(...)` line added in Task 3, add:

```js
    identifyUser(data.session.user.id, { email })
    capture('user_signed_in')
```

In the `signOut` method, after the `Sentry.setUser(null)` line added in Task 3, add:

```js
    resetUser()
```

- [ ] **Step 5: Add PostHog capture to boardStore**

In `src/store/boardStore.js`, add the import at the top:

```js
import { capture } from '../lib/analytics'
```

In the `addBoard` method, after `const board = boardRes.data` (line 210), add:

```js
    if (board) capture('board_created', { template: customColumns ? 'custom' : 'default' })
```

In the `addCard` method, inside the try block after the `const [cardRes, numRes] = await Promise.all(...)` call (around line 431), add after the Promise.all result is checked:

Find the line where `cardRes.data` is used successfully and add nearby:

```js
      if (cardRes.data) capture('card_created', { board_id: boardId })
```

- [ ] **Step 6: Add PostHog capture to BoardShareModal**

In `src/components/board/BoardShareModal.jsx`, add the import at the top:

```js
import { capture } from '../../lib/analytics'
```

In the `handleInvite` function, after `showToast.success('Invitation sent')` (line 79), add:

```js
      capture('member_invited')
```

- [ ] **Step 7: Add feature_used tracking to page components**

In `src/pages/CalendarPage.jsx`, add the import at the top:

```js
import { useEffect } from 'react'
import { capture } from '../lib/analytics'
```

Note: `useEffect` may already be imported — just add `capture`. Then add at the top of the component function body (inside the component, before any existing hooks):

```js
  useEffect(() => { capture('feature_used', { feature: 'calendar' }) }, [])
```

In `src/pages/NotesPage.jsx`, add the import at the top:

```js
import { capture } from '../lib/analytics'
```

Then add at the top of the `NotesPage` component body:

```js
  useEffect(() => { capture('feature_used', { feature: 'notes' }) }, [])
```

Note: `useEffect` is already imported in NotesPage.

In `src/pages/DashboardPage.jsx`, add the import at the top:

```js
import { capture } from '../lib/analytics'
```

Then add at the top of the component body (the DashboardPage function, after the existing hooks):

```js
  useEffect(() => { capture('feature_used', { feature: 'dashboard' }) }, [])
```

Note: `useEffect` is already imported in DashboardPage.

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 9: Run existing tests**

Run: `npm test`
Expected: All tests pass. Analytics calls are no-ops (no PostHog key in test env).

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/lib/analytics.js src/main.jsx src/store/authStore.js src/store/boardStore.js src/components/board/BoardShareModal.jsx src/pages/CalendarPage.jsx src/pages/NotesPage.jsx src/pages/DashboardPage.jsx
git commit -m "feat: integrate PostHog product analytics"
```

---

### Task 5: Landing Page V2

**Files:**
- Create: `src/pages/LandingPageV2.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Duplicate the landing page**

Copy `src/pages/LandingPage.jsx` to `src/pages/LandingPageV2.jsx`. Change the default export name from `LandingPage` to `LandingPageV2`.

- [ ] **Step 2: Update hero section**

In `LandingPageV2.jsx`, find the hero heading and update the tagline to explicitly mention "free". Update the subtitle to reinforce that there's no catch. The exact text should be:

- Heading: Change to include "Free" prominently — e.g., "The free kanban board for teams that ship"
- Subtitle: Something like "Real-time collaboration, drag-and-drop, zero setup. No credit card, no limits, no catch."
- Keep the existing CTA buttons ("Start for free" → "Get started free", "Sign in" stays)

- [ ] **Step 3: Add "100% Free" badge**

Add a small pill/badge above the hero heading:

```jsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2D6] text-[#6B7A12] text-xs font-medium mb-4">
  <Sparkles className="w-3.5 h-3.5" />
  100% free — no credit card required
</span>
```

- [ ] **Step 4: Add social proof placeholder**

Add a line below the hero CTAs showing early traction (hardcoded for now, updated manually as users sign up):

```jsx
<p className="mt-6 text-sm text-[#8E8E89]">
  Trusted by early adopters · launching 2026
</p>
```

- [ ] **Step 5: Add footer**

Add a minimal footer at the bottom of the page (after the final CTA section):

```jsx
<footer className="border-t border-[#E8E2DB] py-8 px-6 text-center text-sm text-[#8E8E89]">
  <p>&copy; {new Date().getFullYear()} Kolumn. All rights reserved.</p>
  <p className="mt-1">
    Questions? <a href="mailto:hello@kolumn.app" className="underline hover:text-[#5C5C57]">hello@kolumn.app</a>
  </p>
</footer>
```

- [ ] **Step 6: Add the /landing-v2 route**

In `src/App.jsx`, add the lazy import after the existing LandingPage import:

```js
const LandingPageV2 = lazy(() => import('./pages/LandingPageV2'))
```

Add the route inside the `<Routes>` block, after the existing `/` route:

```jsx
<Route path="/landing-v2" element={<LandingPageV2 />} />
```

- [ ] **Step 7: Test in browser**

Run: `npm run dev`

Visit `http://localhost:5173/landing-v2` and compare with `http://localhost:5173/`. Verify:
- "100% free" badge appears
- Updated hero copy
- Social proof line visible
- Footer with email link
- All existing sections (features, tools, board preview) still render correctly

- [ ] **Step 8: Commit**

```bash
git add src/pages/LandingPageV2.jsx src/App.jsx
git commit -m "feat: add landing page v2 with SaaS positioning for review"
```

---

### Task 6: Final Verification & Cleanup

**Files:** None (verification only)

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: Build succeeds with no warnings related to new code.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All existing tests pass.

- [ ] **Step 3: Check bundle impact**

Run: `npm run build` and check the output size. The additions should be minimal:
- `@sentry/react` adds ~30KB gzipped (lazy-loaded)
- `posthog-js` adds ~20KB gzipped (lazy-loaded)
- `env.js` and `analytics.js` are tiny

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

1. Visit `/` — original landing page works
2. Visit `/landing-v2` — new landing page renders with updates
3. Visit `/login` — sign in works
4. Visit `/dashboard` — loads correctly
5. Visit `/boards` — boards load, can create/edit cards
6. Open browser console — no errors related to Sentry/PostHog (both are no-ops without keys)

- [ ] **Step 5: Commit any final fixes**

If any issues were found, fix and commit:

```bash
git add -A
git commit -m "fix: address issues found during final verification"
```

---

## Post-Plan: What's Next

After this plan is complete:

1. **Set up Sentry project** at sentry.io, get DSN, add `VITE_SENTRY_DSN` to Railway env vars
2. **Set up PostHog project** at posthog.com, get API key, add `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` to Railway env vars
3. **Run the SQL migration** in Supabase SQL Editor
4. **Review Landing Page V2** at `/landing-v2` — once approved, swap it to replace the original `/` route
5. **Point kolumn.app** to Railway in DNS settings + Railway dashboard
6. **Deploy** — push to main, Railway auto-deploys
