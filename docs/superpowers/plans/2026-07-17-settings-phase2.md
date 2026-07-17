# Settings Phase 2 Implementation Plan — Account Security, Privacy, Billing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add active-session management, sign-out split, and account deletion to the Account pane; add Privacy (with export) and Billing panes; remove the Data pane.

**Architecture:** One new edge function (`supabase/functions/account/`) provides the admin operations the browser cannot do — session listing/revocation via security-definer RPCs over `auth.sessions`, account deletion via `auth.admin.deleteUser` with a block-if-shared ownership check. The client gets `accountClient.js`, a `signOut` scope split in `authStore`, and three new/changed section components.

**Tech Stack:** Deno edge function (supabase-js v2 via esm.sh), Postgres security-definer RPCs, React 19 + Zustand + Vitest.

**Spec:** `docs/superpowers/specs/2026-07-17-settings-phase2-account-privacy-billing-design.md`

## Global Constraints

- Colors: `var(--token)` only; Phosphor icons only; toasts via `showToast.*`; ink affirmative / red destructive; 8px small / 10–12px raised radii.
- Caller identity in the edge function comes ONLY from the verified JWT — never from a client-supplied user id.
- Test command: `npm run test -- <file>`; lint `npm run lint`; build `npm run build`; edge type-check `deno check supabase/functions/account/index.ts`; deploy `supabase functions deploy account`.
- Commits: conventional with scope; append this trailer to every commit:

```
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01U81NzK7DXqknkPgzozrtVq
```

- Stage named files only — never `git add -A` (unrelated untracked files exist in the repo).
- Verified facts (do not re-derive): `workspaces.owner_id` / `boards.owner_id` / `profiles.id` all reference `auth.users` with ON DELETE CASCADE; the `auth` schema is NOT exposed to PostgREST (hence the RPCs); edge functions receive `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env automatically; the Supabase management-API token lives at `~/.supabase/access-token` and SQL can be applied with:
  `curl -s -X POST "https://api.supabase.com/v1/projects/fiqyuppcqwtvlykxxsni/database/query" -H "Authorization: Bearer $(cat ~/.supabase/access-token)" -H "Content-Type: application/json" -d '{"query":"<SQL>"}'`
- A throwaway test account exists: `claude-verify-0717@example.com` / password `Verify!2026settings` (mint a JWT with the password grant against `$VITE_SUPABASE_URL/auth/v1/token?grant_type=password` using the anon key from `.env.local`).

---

### Task 1: Admin RPCs + `account` edge function

**Files:**
- Create: `supabase/migrations/account_admin_rpcs.sql`
- Create: `supabase/functions/account/index.ts`
- Modify: `supabase/config.toml` (only if it has per-function `verify_jwt` blocks — mirror whatever the `chat` function uses)

**Interfaces:**
- Produces HTTP API consumed by Task 2:
  - `GET  /functions/v1/account/sessions` → `200 { sessions: [{ id, device, location, ip, created_at, last_active_at, current }], }`
  - `POST /functions/v1/account/revoke` body `{ session_id }` → `200 { ok: true }` | `400 { error: "cannot_revoke_current" }` | `404 { error: "not_found" }`
  - `POST /functions/v1/account/delete-account` → `200 { ok: true }` | `409 { error: "owned_shared_resources", blockers: [{ type: 'workspace'|'board', name }] }`
  - All routes: `401 { error: "unauthorized" }` on bad/missing JWT; `405` on wrong method.

- [ ] **Step 1: Write the RPC migration**

Create `supabase/migrations/account_admin_rpcs.sql`:

```sql
-- Security-definer RPCs for the `account` edge function. The auth schema is
-- not exposed to PostgREST, so session rows are read/deleted through these.
-- EXECUTE is revoked from client roles — only service_role may call them.

create or replace function public.admin_list_sessions(p_user_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  refreshed_at timestamptz,
  user_agent text,
  ip text
)
language sql
security definer
set search_path = auth, public
as $$
  select s.id, s.created_at, s.updated_at, s.refreshed_at,
         s.user_agent, host(s.ip) as ip
  from auth.sessions s
  where s.user_id = p_user_id
  order by coalesce(s.refreshed_at, s.updated_at, s.created_at) desc
$$;

create or replace function public.admin_revoke_session(p_user_id uuid, p_session_id uuid)
returns boolean
language sql
security definer
set search_path = auth, public
as $$
  with del as (
    delete from auth.sessions
    where id = p_session_id and user_id = p_user_id
    returning 1
  )
  select exists (select 1 from del)
$$;

revoke all on function public.admin_list_sessions(uuid) from public, anon, authenticated;
revoke all on function public.admin_revoke_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_list_sessions(uuid) to service_role;
grant execute on function public.admin_revoke_session(uuid, uuid) to service_role;
```

- [ ] **Step 2: Apply the migration to the hosted project**

Run the management-API curl from Global Constraints with the file's SQL (send it as one `query` string; JSON-escape it, e.g. build the body with `node -e` or `jq -Rs`). Then verify:

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/fiqyuppcqwtvlykxxsni/database/query" \
  -H "Authorization: Bearer $(cat ~/.supabase/access-token)" -H "Content-Type: application/json" \
  -d '{"query":"select proname from pg_proc where proname like '\''admin_%session%'\'';"}'
```

Expected: both function names returned.

- [ ] **Step 3: Write the edge function**

Create `supabase/functions/account/index.ts`:

```ts
// Edge function: /functions/v1/account/{sessions|revoke|delete-account}
//
// Account-security operations the browser cannot perform:
//   GET  /sessions        — list the caller's auth sessions (device, geo, times)
//   POST /revoke          — kill one non-current session      { session_id }
//   POST /delete-account  — delete the caller's account (block-if-shared)
//
// Caller identity comes ONLY from the verified JWT. The service-role client
// is used for the admin RPCs and user deletion; it never acts on a
// client-supplied user id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

// --- user-agent → "Chrome · Windows" -----------------------------------
function parseDevice(ua: string | null): string {
  if (!ua) return "Unknown device"
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Browser"
  const os = /Windows NT/.test(ua) ? "Windows"
    : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Android/.test(ua) ? "Android"
    : /Linux/.test(ua) ? "Linux"
    : "Unknown OS"
  return `${browser} · ${os}`
}

// --- ip → "City, Country" (best effort) ---------------------------------
const PRIVATE_IP = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd)/

async function geolocate(ip: string | null, cache: Map<string, string>): Promise<string> {
  if (!ip || PRIVATE_IP.test(ip)) return "—"
  const hit = cache.get(ip)
  if (hit) return hit
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 2000)
    const res = await fetch(`https://ipwho.is/${ip}`, { signal: ctrl.signal })
    clearTimeout(timer)
    const data = await res.json()
    const loc = data?.success && data.city && data.country
      ? `${data.city}, ${data.country}`
      : ip
    cache.set(ip, loc)
    return loc
  } catch {
    return ip
  }
}

// --- JWT payload (already verified by getUser) --------------------------
function jwtClaims(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(b64))
  } catch {
    return {}
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json(500, { error: "missing_env" })
  }

  // Verify the caller
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "unauthorized" })
  const token = authHeader.slice(7)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json(401, { error: "unauthorized" })

  const admin = createClient(supabaseUrl, serviceKey)
  const url = new URL(req.url)
  // path is /account or /account/<route>
  const route = url.pathname.split("/").filter(Boolean).pop()

  // ---- GET /sessions ----------------------------------------------------
  if (route === "sessions" && req.method === "GET") {
    const { data, error } = await admin.rpc("admin_list_sessions", { p_user_id: user.id })
    if (error) return json(500, { error: "sessions_failed" })
    const currentSessionId = jwtClaims(token)["session_id"] ?? null
    const geoCache = new Map<string, string>()
    const sessions = await Promise.all((data ?? []).map(async (s: {
      id: string; created_at: string; updated_at: string | null
      refreshed_at: string | null; user_agent: string | null; ip: string | null
    }) => ({
      id: s.id,
      device: parseDevice(s.user_agent),
      user_agent: s.user_agent ?? "",
      ip: s.ip ?? "",
      location: await geolocate(s.ip, geoCache),
      created_at: s.created_at,
      last_active_at: s.refreshed_at ?? s.updated_at ?? s.created_at,
      current: s.id === currentSessionId,
    })))
    return json(200, { sessions })
  }

  // ---- POST /revoke -------------------------------------------------------
  if (route === "revoke" && req.method === "POST") {
    let body: { session_id?: string }
    try {
      body = await req.json()
    } catch {
      return json(400, { error: "invalid_body" })
    }
    const sessionId = body.session_id
    if (!sessionId) return json(400, { error: "invalid_body" })
    if (sessionId === jwtClaims(token)["session_id"]) {
      return json(400, { error: "cannot_revoke_current" })
    }
    const { data, error } = await admin.rpc("admin_revoke_session", {
      p_user_id: user.id,
      p_session_id: sessionId,
    })
    if (error) return json(500, { error: "revoke_failed" })
    if (!data) return json(404, { error: "not_found" })
    return json(200, { ok: true })
  }

  // ---- POST /delete-account ------------------------------------------------
  if (route === "delete-account" && req.method === "POST") {
    // Block while the caller owns workspaces/boards that other people belong to.
    const [ws, bd] = await Promise.all([
      admin.from("workspaces")
        .select("id, name, workspace_members!inner(user_id)")
        .eq("owner_id", user.id)
        .neq("workspace_members.user_id", user.id),
      admin.from("boards")
        .select("id, name, board_members!inner(user_id)")
        .eq("owner_id", user.id)
        .neq("board_members.user_id", user.id),
    ])
    if (ws.error || bd.error) return json(500, { error: "ownership_check_failed" })
    const blockers = [
      ...(ws.data ?? []).map((w: { name: string }) => ({ type: "workspace", name: w.name })),
      ...(bd.data ?? []).map((b: { name: string }) => ({ type: "board", name: b.name })),
    ]
    if (blockers.length > 0) {
      return json(409, { error: "owned_shared_resources", blockers })
    }
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return json(500, { error: "delete_failed" })
    return json(200, { ok: true })
  }

  return json(405, { error: "method_not_allowed" })
})
```

- [ ] **Step 4: Type-check**

Run: `deno check supabase/functions/account/index.ts`
Expected: no errors. (If `deno` isn't on PATH, note it and rely on deploy-time checking.)

- [ ] **Step 5: Check `supabase/config.toml`**

Look for `[functions.chat]`-style blocks. If `chat` declares `verify_jwt`, add a matching `[functions.account]` block with the same value. If there is no per-function block for `chat`, add nothing.

- [ ] **Step 6: Deploy and smoke-test**

```bash
supabase functions deploy account
```

Mint a JWT (anon key + throwaway creds from Global Constraints):

```bash
URL=$(grep VITE_SUPABASE_URL .env.local | cut -d= -f2 | tr -d '\r')
KEY=$(grep VITE_SUPABASE_ANON_KEY .env.local | cut -d= -f2 | tr -d '\r')
TOK=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"email":"claude-verify-0717@example.com","password":"Verify!2026settings"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).access_token))")

# sessions — expect 200 with >=1 row, exactly one row current:true
curl -s "$URL/functions/v1/account/sessions" -H "Authorization: Bearer $TOK" -H "apikey: $KEY"
# bad JWT — expect 401
curl -s "$URL/functions/v1/account/sessions" -H "Authorization: Bearer garbage" -H "apikey: $KEY" -o /dev/null -w "%{http_code}\n"
# revoke current — expect 400 cannot_revoke_current (get the current id from the sessions response)
curl -s -X POST "$URL/functions/v1/account/revoke" -H "Authorization: Bearer $TOK" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"session_id":"<current id>"}'
```

Do NOT smoke-test delete-account with this account (Tasks 4–5 tests need it); the browser pass at the end covers deletion with a fresh account.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/account_admin_rpcs.sql supabase/functions/account/index.ts supabase/config.toml
git commit -m "feat(account): account edge function — sessions list/revoke + guarded delete"
```

---

### Task 2: `accountClient.js`

**Files:**
- Create: `src/lib/accountClient.js`
- Test: `src/__tests__/accountClient.test.js`

**Interfaces:**
- Consumes: Task 1's HTTP API; `src/lib/supabase.js` client for the session token; the same env access pattern `src/lib/aiClient.js` uses (read that file first and mirror its env import exactly).
- Produces: `listSessions() => Promise<Session[]>`, `revokeSession(sessionId) => Promise<void>`, `deleteAccount() => Promise<void>`. Errors: throws `Error` with a friendly message; `deleteAccount` throws an error object with `.blockers` attached when the API returns 409.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/accountClient.test.js`:

```js
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { listSessions, revokeSession, deleteAccount } from '../lib/accountClient'
import { supabase } from '../lib/supabase'

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}))

beforeEach(() => {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'jwt-token' } },
  })
  global.fetch = vi.fn()
})

afterEach(() => vi.restoreAllMocks())

const okJson = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })

describe('accountClient', () => {
  test('listSessions returns rows and sends the bearer token', async () => {
    fetch.mockReturnValue(okJson({ sessions: [{ id: 's1', current: true }] }))
    const rows = await listSessions()
    expect(rows).toEqual([{ id: 's1', current: true }])
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('/functions/v1/account/sessions')
    expect(opts.headers.Authorization).toBe('Bearer jwt-token')
  })

  test('revokeSession posts the session id', async () => {
    fetch.mockReturnValue(okJson({ ok: true }))
    await revokeSession('s2')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('/functions/v1/account/revoke')
    expect(JSON.parse(opts.body)).toEqual({ session_id: 's2' })
  })

  test('deleteAccount attaches blockers on 409', async () => {
    fetch.mockReturnValue(okJson({ error: 'owned_shared_resources', blockers: [{ type: 'board', name: 'Roadmap' }] }, 409))
    await expect(deleteAccount()).rejects.toMatchObject({
      blockers: [{ type: 'board', name: 'Roadmap' }],
    })
  })

  test('throws a friendly error when signed out', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    await expect(listSessions()).rejects.toThrow(/signed in/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/accountClient.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/accountClient.js` (mirror `aiClient.js`'s env import for the functions base URL):

```js
import { supabase } from './supabase'
// Mirror aiClient.js's env source — read that file and import the same way.
import { env } from './env'

async function call(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You need to be signed in for this.')
  const res = await fetch(`${env.supabaseUrl}/functions/v1/account/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: env.supabaseAnonKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  let body = {}
  try {
    body = await res.json()
  } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const err = new Error(
      body.error === 'owned_shared_resources'
        ? 'You still own shared workspaces or boards.'
        : body.error === 'cannot_revoke_current'
          ? "You can't revoke the session you're using."
          : 'Something went wrong. Please try again.',
    )
    err.code = body.error
    if (body.blockers) err.blockers = body.blockers
    throw err
  }
  return body
}

export async function listSessions() {
  const { sessions } = await call('sessions', { method: 'GET' })
  return sessions
}

export async function revokeSession(sessionId) {
  await call('revoke', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) })
}

export async function deleteAccount() {
  await call('delete-account', { method: 'POST' })
}
```

If `src/lib/env.js` doesn't exist or exports differently, adapt to however `aiClient.js` actually resolves `supabaseUrl`/anon key (that file is the source of truth) and adjust the test only if an import breaks.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/accountClient.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/accountClient.js src/__tests__/accountClient.test.js
git commit -m "feat(account): accountClient — sessions, revoke, guarded delete"
```

---

### Task 3: `authStore` sign-out scope split

**Files:**
- Modify: `src/store/authStore.js` (the `signOut` action, ~line 184)
- Test: `src/__tests__/signOutScope.test.js`

**Interfaces:**
- Produces: `signOut()` — local-only (`supabase.auth.signOut({ scope: 'local' })`), same store-reset behavior as today; `signOutEverywhere()` — same resets but `scope: 'global'`. Consumed by Task 4's rows and by the (unchanged) UserMenu/MobileUserMenu `handleSignOut`, which keep calling `signOut()` and thereby become local-only — the intended behavior change.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/signOutScope.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

vi.mock('../lib/supabase', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    supabase: {
      ...mod.supabase,
      auth: { ...mod.supabase.auth, signOut: vi.fn().mockResolvedValue({ error: null }) },
    },
  }
})

describe('sign-out scopes', () => {
  beforeEach(() => vi.clearAllMocks())

  test('signOut is local-scope', () => {
    useAuthStore.getState().signOut()
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  test('signOutEverywhere is global-scope', () => {
    useAuthStore.getState().signOutEverywhere()
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' })
  })

  test('both clear the user from the store', () => {
    useAuthStore.setState({ user: { id: 'u1' }, session: {}, profile: {} })
    useAuthStore.getState().signOut()
    expect(useAuthStore.getState().user).toBeNull()
    useAuthStore.setState({ user: { id: 'u1' } })
    useAuthStore.getState().signOutEverywhere()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
```

If mocking `../lib/supabase` this way conflicts with how existing store tests mock it (check `src/__tests__/mocks/supabase.js` and other store tests first), follow the established idiom instead — the assertions stay the same.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/signOutScope.test.js`
Expected: FAIL — `signOutEverywhere` undefined, and today's `signOut` is called with `{ scope: 'global' }`.

- [ ] **Step 3: Implement the split**

In `src/store/authStore.js`, extract the shared reset into a private helper and expose the two actions. Replace the existing `signOut` (lines ~184–197) with:

```js
  // Shared local cleanup for every way of leaving the account.
  _resetLocalState: () => {
    set({ user: null, session: null, profile: null })
    Sentry.setUser(null)
    resetUser()
    // Lazy imports to avoid circular dependency (these stores import authStore)
    import('./boardStore').then(({ useBoardStore }) => useBoardStore.getState().resetStore())
    import('./noteStore').then(({ useNoteStore }) => useNoteStore.getState().resetStore())
    import('./workspacesStore').then(({ useWorkspacesStore }) => useWorkspacesStore.getState().resetStore())
    import('./boardSharingStore').then(({ useBoardSharingStore }) => useBoardSharingStore.getState().resetStore())
    localStorage.removeItem('kolumn_active_board')
  },

  // This device only. Other sessions keep working (see signOutEverywhere).
  signOut: () => {
    get()._resetLocalState()
    supabase.auth.signOut({ scope: 'local' }).catch((err) => {
      logError('Sign out error:', err)
    })
  },

  // Revokes every session for this user (all devices).
  signOutEverywhere: () => {
    get()._resetLocalState()
    supabase.auth.signOut({ scope: 'global' }).catch((err) => {
      logError('Sign out everywhere error:', err)
    })
  },
```

Do not change UserMenu/MobileUserMenu — they call `signOut()` and now correctly sign out this device only.

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/__tests__/signOutScope.test.js` → PASS.
Run the full suite (`npm run test`) — fix any existing test that asserted global scope.

- [ ] **Step 5: Commit**

```bash
git add src/store/authStore.js src/__tests__/signOutScope.test.js
git commit -m "feat(auth): split sign-out scope — local by default, signOutEverywhere for all devices"
```

---

### Task 4: Account pane — sessions list + sign-out rows

**Files:**
- Create: `src/components/settings/SessionsList.jsx`
- Modify: `src/components/settings/AccountSection.jsx`
- Test: `src/__tests__/sessionsList.test.jsx`

**Interfaces:**
- Consumes: `listSessions`/`revokeSession` (Task 2), `signOut`/`signOutEverywhere` (Task 3), `SettingsSection`/`SettingsRow`, `Button`, `Skeleton`, `InlineNotice`, `showToast`, date-fns `format`.
- Produces: `SessionsList()` default export; `AccountSection({ onClose })` keeps its signature. The Plan row is REMOVED from AccountSection (moves to Billing in Task 6b).

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/sessionsList.test.jsx`:

```jsx
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionsList from '../components/settings/SessionsList'
import { listSessions, revokeSession } from '../lib/accountClient'

vi.mock('../lib/accountClient', () => ({
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
}))

afterEach(() => cleanup())

const ROWS = [
  { id: 'cur', device: 'Chrome · Windows', location: 'Dubai, United Arab Emirates', ip: '1.2.3.4', created_at: '2026-07-01T10:00:00Z', last_active_at: '2026-07-17T09:00:00Z', current: true },
  { id: 'oth', device: 'Safari · iOS', location: 'London, United Kingdom', ip: '5.6.7.8', created_at: '2026-07-10T10:00:00Z', last_active_at: '2026-07-16T09:00:00Z', current: false },
]

describe('SessionsList', () => {
  beforeEach(() => vi.clearAllMocks())

  test('renders sessions with device, location, and This device tag', async () => {
    listSessions.mockResolvedValue(ROWS)
    render(<SessionsList />)
    expect(await screen.findByText('Chrome · Windows')).toBeTruthy()
    expect(screen.getByText('Safari · iOS')).toBeTruthy()
    expect(screen.getByText('This device')).toBeTruthy()
    expect(screen.getByText(/Dubai/)).toBeTruthy()
  })

  test('current session has no revoke button; others do', async () => {
    listSessions.mockResolvedValue(ROWS)
    render(<SessionsList />)
    await screen.findByText('Chrome · Windows')
    expect(screen.getAllByRole('button', { name: 'Revoke' })).toHaveLength(1)
  })

  test('revoke removes the row on success', async () => {
    listSessions.mockResolvedValue(ROWS)
    revokeSession.mockResolvedValue()
    render(<SessionsList />)
    await screen.findByText('Safari · iOS')
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    expect(revokeSession).toHaveBeenCalledWith('oth')
    await waitFor(() => expect(screen.queryByText('Safari · iOS')).toBeNull())
  })

  test('load failure shows an error notice with retry', async () => {
    listSessions.mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce(ROWS)
    render(<SessionsList />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByText('Chrome · Windows')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/sessionsList.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SessionsList`**

Create `src/components/settings/SessionsList.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { listSessions, revokeSession } from '../../lib/accountClient'
import { showToast } from '../../utils/toast'
import Button from '../ui/Button'
import Skeleton from '../ui/Skeleton'
import InlineNotice from '../ui/InlineNotice'
import Tooltip from '../ui/Tooltip'

// Active-session rows inside the Account pane. Load on mount; revoked rows
// drop out optimistically only after the server confirms.
export default function SessionsList() {
  const [sessions, setSessions] = useState(null) // null = loading
  const [error, setError] = useState(null)
  const [revoking, setRevoking] = useState(null) // session id in-flight

  const load = useCallback(async () => {
    setError(null)
    setSessions(null)
    try {
      setSessions(await listSessions())
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRevoke = async (id) => {
    setRevoking(id)
    try {
      await revokeSession(id)
      setSessions((rows) => rows.filter((r) => r.id !== id))
    } catch (err) {
      showToast.error(err.message)
    } finally {
      setRevoking(null)
    }
  }

  if (error) {
    return (
      <InlineNotice variant="error" action={<Button variant="secondary" size="sm" onClick={load}>Retry</Button>}>
        Couldn't load your sessions.
      </InlineNotice>
    )
  }

  if (!sessions) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <Skeleton variant="line" width="100%" />
        <Skeleton variant="line" width="80%" />
      </div>
    )
  }

  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {sessions.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-6 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Tooltip content={s.user_agent || undefined}>
                <span className="text-sm text-[var(--text-primary)]">{s.device}</span>
              </Tooltip>
              {s.current && (
                <span className="rounded-full bg-[var(--accent-lime-soft)] px-2 py-0.5 text-[11px] text-[var(--text-primary)]">
                  This device
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {s.location} · Created {format(new Date(s.created_at), 'd MMM yyyy')} · Active {format(new Date(s.last_active_at), 'd MMM yyyy, HH:mm')}
            </p>
          </div>
          {!s.current && (
            <Button
              variant="destructive"
              size="sm"
              loading={revoking === s.id}
              onClick={() => handleRevoke(s.id)}
            >
              Revoke
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
```

Check `Skeleton`'s actual props (`variant`, `width`) and `InlineNotice`'s `action` prop against the source before assuming; adapt call sites to the primitives.

- [ ] **Step 4: Rework `AccountSection`**

Modify `src/components/settings/AccountSection.jsx`: keep Email + Change password rows; REMOVE the Plan row; replace the single Sign out row; append the sessions block. The component becomes:

```jsx
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Button from '../ui/Button'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'
import SessionsList from './SessionsList'

export default function AccountSection({ onClose }) {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const signOutEverywhere = useAuthStore((s) => s.signOutEverywhere)

  const email = profile?.email || user?.email || ''

  const leave = async (fn) => {
    onClose()
    await fn()
    navigate('/')
  }

  return (
    <>
      <SettingsSection title="Account">
        <SettingsRow title="Email">
          <span className="text-sm text-[var(--text-secondary)]">{email}</span>
        </SettingsRow>
        <SettingsRow title="Password" description="Set a new password for your account.">
          <Button variant="secondary" size="sm" onClick={() => { onClose(); navigate('/update-password') }}>
            Change password
          </Button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Active sessions">
        <SessionsList />
      </SettingsSection>

      <SettingsSection title="Sign out">
        <SettingsRow title="Sign out" description="Sign out of Kolumn on this device.">
          <Button variant="secondary" size="sm" onClick={() => leave(signOut)}>
            Sign out
          </Button>
        </SettingsRow>
        <SettingsRow title="Log out of all devices" description="Ends every active session, including this one.">
          <Button variant="secondary" size="sm" onClick={() => leave(signOutEverywhere)}>
            Log out everywhere
          </Button>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
```

(The danger zone lands in Task 5; existing AccountSection tests in `src/__tests__/settingsAccountData.test.jsx` assert the Plan row — update them: Plan moves out, sign-out assertions target the local `signOut`, and add mocks for `../lib/accountClient` so SessionsList doesn't fire real fetches.)

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/__tests__/sessionsList.test.jsx src/__tests__/settingsAccountData.test.jsx` → PASS after updating the older file per Step 4's note. Then the full suite.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/SessionsList.jsx src/components/settings/AccountSection.jsx src/__tests__/sessionsList.test.jsx src/__tests__/settingsAccountData.test.jsx
git commit -m "feat(settings): active sessions list + sign-out split in Account pane"
```

---

### Task 5: Danger zone — delete account

**Files:**
- Create: `src/components/settings/DeleteAccountModal.jsx`
- Modify: `src/components/settings/AccountSection.jsx` (append danger-zone section)
- Test: `src/__tests__/deleteAccount.test.jsx`

**Interfaces:**
- Consumes: `deleteAccount` (Task 2, throws with `.blockers` on 409), `authStore._resetLocalState` via a thin public wrapper (add `clearAfterAccountDeletion: () => get()._resetLocalState()` to authStore), `Modal`, `Input`, `Button`, `InlineNotice`.
- Produces: `DeleteAccountModal({ open, onClose, onDeleted })`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/deleteAccount.test.jsx`:

```jsx
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeleteAccountModal from '../components/settings/DeleteAccountModal'
import { deleteAccount } from '../lib/accountClient'
import { useAuthStore } from '../store/authStore'

vi.mock('../lib/accountClient', () => ({ deleteAccount: vi.fn() }))

afterEach(() => cleanup())

describe('DeleteAccountModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      profile: { email: 'me@example.com' },
      user: { email: 'me@example.com' },
      clearAfterAccountDeletion: vi.fn(),
    })
  })

  test('delete button is disabled until the email matches exactly', async () => {
    render(<DeleteAccountModal open onClose={() => {}} onDeleted={() => {}} />)
    const btn = screen.getByRole('button', { name: /delete my account/i })
    expect(btn.disabled).toBe(true)
    await userEvent.type(screen.getByLabelText(/type your email/i), 'me@example.com')
    expect(btn.disabled).toBe(false)
  })

  test('successful delete calls onDeleted', async () => {
    deleteAccount.mockResolvedValue()
    const onDeleted = vi.fn()
    render(<DeleteAccountModal open onClose={() => {}} onDeleted={onDeleted} />)
    await userEvent.type(screen.getByLabelText(/type your email/i), 'me@example.com')
    await userEvent.click(screen.getByRole('button', { name: /delete my account/i }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  test('409 shows the blocking workspaces/boards', async () => {
    const err = new Error('You still own shared workspaces or boards.')
    err.blockers = [{ type: 'workspace', name: 'Design Team' }, { type: 'board', name: 'Roadmap' }]
    deleteAccount.mockRejectedValue(err)
    render(<DeleteAccountModal open onClose={() => {}} onDeleted={() => {}} />)
    await userEvent.type(screen.getByLabelText(/type your email/i), 'me@example.com')
    await userEvent.click(screen.getByRole('button', { name: /delete my account/i }))
    expect(await screen.findByText(/Design Team/)).toBeTruthy()
    expect(screen.getByText(/Roadmap/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/deleteAccount.test.jsx` → FAIL, module not found.

- [ ] **Step 3: Implement the modal**

Create `src/components/settings/DeleteAccountModal.jsx` (red chrome mirrors `ConfirmModal.jsx`'s ink/red styling, but with the typed-email gate; pass a higher `zIndex` than the settings modal's default 40 so it stacks — `zIndex={60}` per the Modal z-ledger):

```jsx
import { useState } from 'react'
import { Warning } from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import InlineNotice from '../ui/InlineNotice'
import { useAuthStore } from '../../store/authStore'
import { deleteAccount } from '../../lib/accountClient'

export default function DeleteAccountModal({ open, onClose, onDeleted }) {
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const email = profile?.email || user?.email || ''
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [blockers, setBlockers] = useState(null)
  const [error, setError] = useState(null)

  const reset = () => { setTyped(''); setBlockers(null); setError(null); setBusy(false) }

  const handleDelete = async () => {
    setBusy(true)
    setError(null)
    setBlockers(null)
    try {
      await deleteAccount()
      onDeleted()
    } catch (err) {
      if (err.blockers) setBlockers(err.blockers)
      else setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} role="alertdialog" ariaLabel="Delete account" zIndex={60}>
      <div className="w-full max-w-md mx-4 rounded-xl border border-[var(--label-red-text)] bg-[var(--surface-card)] p-5">
        <div className="mb-2 flex items-center gap-2">
          <Warning className="h-4 w-4 text-[var(--label-red-text)]" />
          <h3 className="text-sm font-semibold text-[var(--label-red-text)]">Delete account</h3>
        </div>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          This permanently deletes your account, boards, cards, and workspaces.
          There is no undo.
        </p>

        {blockers && (
          <InlineNotice variant="danger">
            <strong className="block font-semibold">Transfer or delete these first</strong>
            <span className="text-[var(--text-secondary)]">
              You still own shared items other people are using:{' '}
              {blockers.map((b) => `${b.name} (${b.type})`).join(', ')}
            </span>
          </InlineNotice>
        )}
        {error && <InlineNotice variant="error">{error}</InlineNotice>}

        <label htmlFor="delete-confirm-email" className="mb-1 mt-3 block text-xs text-[var(--text-secondary)]">
          Type your email to confirm
        </label>
        <Input
          id="delete-confirm-email"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={email}
        />
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="destructive"
            disabled={typed !== email || busy}
            loading={busy}
            onClick={handleDelete}
          >
            Delete my account
          </Button>
          <Button variant="ghost" onClick={() => { reset(); onClose() }}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Wire the danger zone into `AccountSection`**

Append after the Sign out section (inside the fragment):

```jsx
      <SettingsSection title="Danger zone">
        <SettingsRow title="Delete account" description="Permanently delete your account and all your data.">
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </SettingsRow>
      </SettingsSection>
      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
```

with, at the top of the component:

```jsx
  const [deleteOpen, setDeleteOpen] = useState(false)
  const clearAfterAccountDeletion = useAuthStore((s) => s.clearAfterAccountDeletion)

  const handleDeleted = () => {
    setDeleteOpen(false)
    onClose()
    clearAfterAccountDeletion()
    navigate('/')
  }
```

(plus the `useState` import and `DeleteAccountModal` import). In `src/store/authStore.js` add, next to `signOut`:

```js
  // The account row is already gone server-side; just drop local state.
  clearAfterAccountDeletion: () => get()._resetLocalState(),
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/__tests__/deleteAccount.test.jsx src/__tests__/settingsAccountData.test.jsx` → PASS (update the older file for the new danger-zone content if its assertions are position-sensitive). Full suite once green.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/DeleteAccountModal.jsx src/components/settings/AccountSection.jsx src/store/authStore.js src/__tests__/deleteAccount.test.jsx src/__tests__/settingsAccountData.test.jsx
git commit -m "feat(settings): delete account with typed-email confirm and block-if-shared"
```

---

### Task 6: Privacy pane (export moves) + Billing pane

**Files:**
- Create: `src/utils/exportData.js`
- Create: `src/components/settings/PrivacySection.jsx`
- Create: `src/components/settings/BillingSection.jsx`
- Create: `src/constants/tiers.js`
- Delete: `src/components/settings/DataSection.jsx`
- Test: `src/__tests__/privacyBilling.test.jsx`
- Modify: `src/__tests__/settingsAccountData.test.jsx` (its `buildExportPayload` import moves to `../utils/exportData`)

**Interfaces:**
- Consumes: `useBoardStore.getState()`, `useAuthStore` (`profile.tier`), `setTier` (existing authStore action), `showToast`, react-router `useNavigate`.
- Produces: `buildExportPayload(boardState)` named export from `src/utils/exportData.js` (same shape as before: `{ boards, columns, cards, exported_at }`); `PrivacySection()`; `BillingSection({ onClose })`; `TIERS` map from `src/constants/tiers.js`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/privacyBilling.test.jsx`:

```jsx
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PrivacySection from '../components/settings/PrivacySection'
import BillingSection from '../components/settings/BillingSection'
import { buildExportPayload } from '../utils/exportData'
import { useAuthStore } from '../store/authStore'

afterEach(() => cleanup())

describe('PrivacySection', () => {
  test('renders data-protection rows, policy link, and export', () => {
    render(<PrivacySection />)
    expect(screen.getByText(/where your data lives/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /privacy policy/i }).getAttribute('href')).toBe('/privacy')
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
  })
})

describe('buildExportPayload', () => {
  test('unchanged shape, still excludes notes', () => {
    const payload = buildExportPayload({ boards: { a: 1 }, columns: {}, cards: {}, notes: { n: 1 } })
    expect(payload.boards).toEqual({ a: 1 })
    expect(payload.notes).toBeUndefined()
    expect(typeof payload.exported_at).toBe('string')
  })
})

describe('BillingSection', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: { tier: 'free' }, setTier: vi.fn() })
  })

  test('free tier shows plan, limits, and Upgrade', () => {
    render(<MemoryRouter><BillingSection onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByText('Free')).toBeTruthy()
    expect(screen.getByText(/20 AI messages/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeTruthy()
  })

  test('pro tier shows Downgrade instead of Upgrade', async () => {
    useAuthStore.setState({ profile: { tier: 'pro' }, setTier: vi.fn().mockResolvedValue() })
    render(<MemoryRouter><BillingSection onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByText('Pro')).toBeTruthy()
    const btn = screen.getByRole('button', { name: /downgrade/i })
    await userEvent.click(btn)
    expect(useAuthStore.getState().setTier).toHaveBeenCalledWith('free')
  })
})
```

- [ ] **Step 2: Run test to verify it fails** → module not found.

- [ ] **Step 3: Create the export util and tier constants**

`src/utils/exportData.js` (verbatim move from DataSection — also clears the standing react-refresh lint warning):

```js
// Boards/columns/cards only — notes are excluded (the notes feature is
// unwired; see CLAUDE.md "Removed pages").
export function buildExportPayload({ boards, columns, cards }) {
  return {
    boards,
    columns,
    cards,
    exported_at: new Date().toISOString(),
  }
}

export function downloadExport(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kolumn-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

`src/constants/tiers.js` — copy the REAL limits: free daily message cap is `FREE_DAILY_LIMIT = 20` and free pill tools are the 3 `create_*` tools (verify both in `supabase/functions/chat/tier.ts` before writing); paid tiers get all 18 tools and no daily cap (same file). Also mirror any user-facing copy the upgrade page uses (`src/pages/UpgradeProPage.jsx`):

```js
// User-facing tier copy. Numbers mirror supabase/functions/chat/tier.ts —
// if that file changes, change this too.
export const TIERS = {
  free: {
    label: 'Free',
    includes: '20 AI messages/day · quick-add AI (create tools) · unlimited boards',
  },
  pro: {
    label: 'Pro',
    includes: 'Unlimited AI messages · all 18 AI tools · read tools in chat',
  },
  team: {
    label: 'Team',
    includes: 'Everything in Pro · shared workspaces · member management',
  },
}
```

(Adjust wording to match `tier.ts`/UpgradeProPage reality — the constraint is "no invented numbers", not this exact prose.)

- [ ] **Step 4: Implement `PrivacySection`**

Create `src/components/settings/PrivacySection.jsx`:

```jsx
import { useBoardStore } from '../../store/boardStore'
import { showToast } from '../../utils/toast'
import { buildExportPayload, downloadExport } from '../../utils/exportData'
import Button from '../ui/Button'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function PrivacySection() {
  const handleExport = () => {
    downloadExport(buildExportPayload(useBoardStore.getState()))
    showToast.success('Data exported')
  }

  return (
    <>
      <SettingsSection title="Privacy">
        <SettingsRow
          title="Where your data lives"
          description="Your boards and cards are stored in Supabase (Postgres), encrypted in transit and at rest."
        />
        <SettingsRow
          title="Your content is yours"
          description="We never sell your data and never use it to train AI models."
        />
        <SettingsRow title="Privacy Policy" description="How Kolumn handles your data.">
          <a
            href="/privacy"
            className="text-sm text-[var(--text-secondary)] underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)]"
          >
            Privacy Policy
          </a>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Your data">
        <SettingsRow
          title="Export your data"
          description="Download all boards, columns, and cards as a JSON backup."
        >
          <Button variant="secondary" size="sm" onClick={handleExport}>Export</Button>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
```

Note: `SettingsRow` currently requires `children`; the two copy-only rows pass none — check the component and, if needed, make `children` optional (render the right column only when children exist). That is an intended, tiny extension.

- [ ] **Step 5: Implement `BillingSection`**

Create `src/components/settings/BillingSection.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { TIERS } from '../../constants/tiers'
import { showToast } from '../../utils/toast'
import Button from '../ui/Button'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function BillingSection({ onClose }) {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const setTier = useAuthStore((s) => s.setTier)
  const [busy, setBusy] = useState(false)

  const tier = profile?.tier || 'free'
  const info = TIERS[tier] || TIERS.free

  const handleUpgrade = () => {
    onClose()
    navigate('/upgrade/pro')
  }

  const handleDowngrade = async () => {
    setBusy(true)
    try {
      // Same stub the upgrade page uses — real flow becomes a Stripe
      // subscription change once billing lands.
      await setTier('free')
      showToast.success('Moved to the Free plan')
    } catch (err) {
      showToast.error(err?.message || "Couldn't change your plan")
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsSection title="Billing">
      <SettingsRow title="Plan" description={info.includes}>
        <span className="text-sm font-medium text-[var(--text-primary)]">{info.label}</span>
      </SettingsRow>
      <SettingsRow
        title={tier === 'free' ? 'Upgrade' : 'Change plan'}
        description={tier === 'free' ? 'Unlock all AI tools and unlimited messages.' : 'Drop back to the Free plan.'}
      >
        {tier === 'free' ? (
          <Button variant="primary" size="sm" onClick={handleUpgrade}>Upgrade to Pro</Button>
        ) : (
          <Button variant="secondary" size="sm" loading={busy} onClick={handleDowngrade}>Downgrade to Free</Button>
        )}
      </SettingsRow>
    </SettingsSection>
  )
}
```

- [ ] **Step 6: Delete `DataSection`, fix the moved import**

```bash
git rm src/components/settings/DataSection.jsx
```

Update `src/__tests__/settingsAccountData.test.jsx`: import `buildExportPayload` from `../utils/exportData` instead of the deleted component. `grep -rn "DataSection" src/` must return nothing after this task (Task 7 removes the SettingsModal reference — if the grep still shows SettingsModal.jsx, that is Task 7's job; note it, don't fix it here unless the build breaks, in which case coordinate with Task 7 by removing the import and render line for DataSection only).

- [ ] **Step 7: Run tests** → the new file passes; full suite green (SettingsModal still imports DataSection at this point — if its import breaks the suite, apply the minimal Task-7 coordination from Step 6).

- [ ] **Step 8: Commit**

```bash
git add src/utils/exportData.js src/constants/tiers.js src/components/settings/PrivacySection.jsx src/components/settings/BillingSection.jsx src/components/settings/SettingsRow.jsx src/__tests__/privacyBilling.test.jsx src/__tests__/settingsAccountData.test.jsx
git rm -q src/components/settings/DataSection.jsx 2>/dev/null || true
git commit -m "feat(settings): Privacy pane (export moves in) and Billing pane; Data pane retired"
```

---

### Task 7: Rewire the modal nav + docs + full verification

**Files:**
- Modify: `src/components/settings/SettingsModal.jsx`
- Modify: `src/__tests__/SettingsModal.test.jsx`
- Modify: `CLAUDE.md` (settings one-liner)

**Interfaces:**
- Consumes: everything above. Nav becomes General / Account / Privacy / Billing.

- [ ] **Step 1: Update the registry and renders**

In `src/components/settings/SettingsModal.jsx`:
- Imports: drop `DataSection`, add `PrivacySection`, `BillingSection`; icon imports become `Sliders, IdentificationCard, ShieldCheck, CreditCard` (keep `MagnifyingGlass`, `X`; drop `Download`).
- `SECTIONS` becomes:

```jsx
const SECTIONS = [
  {
    id: 'general',
    label: 'General',
    icon: Sliders,
    keywords: [
      'general', 'appearance', 'theme', 'system', 'light', 'dark', 'font', 'mona sans', 'sf mono',
      'profile', 'avatar', 'icon', 'display name', 'full name', 'color',
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: IdentificationCard,
    keywords: [
      'account', 'email', 'password', 'sign out', 'log out', 'sessions', 'devices',
      'delete account', 'danger',
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: ShieldCheck,
    keywords: ['privacy', 'data protection', 'policy', 'export', 'backup', 'json', 'data'],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    keywords: ['billing', 'plan', 'upgrade', 'downgrade', 'tier', 'pro', 'free', 'limits'],
  },
]
```

- Content pane renders:

```jsx
            {activeId === 'general' && (
              <>
                <ProfileSection />
                <GeneralSection />
              </>
            )}
            {activeId === 'account' && <AccountSection onClose={handleClose} />}
            {activeId === 'privacy' && <PrivacySection />}
            {activeId === 'billing' && <BillingSection onClose={handleClose} />}
```

- [ ] **Step 2: Update `src/__tests__/SettingsModal.test.jsx`**

- Nav-items test: `['General', 'Account', 'Privacy', 'Billing']`; assert `queryByRole('button', { name: 'Data' })` is null.
- Search test: keep typing "export" — expectation changes to the **Privacy** heading appearing (export now lives there).
- Mock `../lib/accountClient` at the top of the file (`listSessions: vi.fn().mockResolvedValue([])`, `revokeSession: vi.fn()`, `deleteAccount: vi.fn()`) so switching to Account doesn't fire real fetches.

- [ ] **Step 3: Update `CLAUDE.md`**

The `components/settings/` one-liner becomes: settings modal — shell + panes (General = Profile + Preferences, Account = sessions/sign-out/danger zone, Privacy = data protection + export, Billing = plan) + SettingsRedirect. If CLAUDE.md's edge-functions tree lists only `chat`/`check-email`, add `account/` with a one-liner.

- [ ] **Step 4: Full verification**

```bash
npm run lint     # expect: zero warnings now (DataSection warning died with the file)
npm run test     # full suite green
npm run build    # clean
grep -rn "DataSection" src/   # nothing
```

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/SettingsModal.jsx src/__tests__/SettingsModal.test.jsx CLAUDE.md
git commit -m "feat(settings): nav becomes General/Account/Privacy/Billing; Data pane removed"
```

---

## Post-plan notes for the controller

- Browser pass after Task 7 (controller-driven, mirrors phase 1): two Playwright contexts signed into the same account → both sessions visible with device/location; revoke B from A → B's next refresh is signed out; "Log out everywhere" from A kills both; sign-out (plain) from one context leaves the other alive; delete-account happy path with a FRESH throwaway account (not `claude-verify-0717` until sessions testing is done); blocked-delete path by giving the throwaway a shared board first.
- The revoked-device UX (finds out on next token refresh, up to ~1h) is accepted in the spec.
- `ipwho.is` dependency: if it proves flaky during verification, rows fall back to bare IPs by design — not a failure.
