# Settings Phase 2 — Account Security, Privacy, Billing — Design Spec

**Date:** 2026-07-17
**Status:** Approved (brainstorm complete)
**Builds on:** `2026-07-16-settings-modal-design.md` (shipped: two-pane settings modal)

## Summary

Expand the settings modal: the Account pane gains active-session management,
a sign-out split (this device vs everywhere), and account deletion; a new
Privacy pane absorbs data export plus data-protection copy; a new Billing
pane shows plan + limits + upgrade. The Data pane is removed. One new edge
function (`account`) provides the admin-powered operations the browser
cannot do (session listing/revocation, user deletion).

## Nav

General / **Account** / **Privacy** / **Billing** — Data removed.
Icons: `Sliders` / `IdentificationCard` / `ShieldCheck` / `CreditCard`.
Keyword registry updated accordingly (privacy: export, backup, policy, data;
billing: plan, upgrade, tier, limits; account gains: sessions, devices,
delete).

## Account pane (stacked sections)

### Account
- Email (read-only), Change password (unchanged).
- Plan row MOVES to Billing.

### Active sessions
- One row per session from the `account` edge function:
  - **Device** — parsed from `user_agent` (browser + OS, e.g. "Chrome ·
    Windows"; raw UA in a tooltip; "Unknown device" fallback).
  - **Location** — city + country from server-side IP geolocation
    (ip-api.com free endpoint, cached per request; fallback: bare IP;
    private/empty IP → "—").
  - **Created** and **Last active** (`created_at`, `refreshed_at ||
    updated_at`), formatted with date-fns.
  - Current session (JWT `session_id` claim) is tagged **"This device"**
    and has no revoke action.
  - Other rows: red **Revoke** button → `POST /revoke` → row removed on
    success (toast on failure).
- List loads when the Account pane mounts; skeleton rows while loading;
  `InlineNotice` variant=error with Retry on failure.

### Sign out
- **Sign out** — this device only (`supabase.auth.signOut({ scope: 'local' })`).
- **Log out of all devices** — `scope: 'global'`, then local cleanup +
  navigate to landing.
- ⚠️ Behavior change: `authStore.signOut` is currently global-scope. It
  becomes **local** by default; a new `signOutEverywhere()` covers global.
  The UserMenu/MobileUserMenu sign-out items use the local variant.
  Store-reset + navigation behavior otherwise unchanged.

### Danger zone
- **Delete account** (destructive red button) → confirm modal (red chrome,
  consistent with existing destructive ConfirmModal patterns): explains
  permanence, requires typing the account email exactly, then calls
  `POST /delete-account`.
- **Block-if-shared policy:** deletion is refused (HTTP 409) while the user
  owns workspaces or boards that have OTHER members. The 409 payload lists
  the blocking items (name + type); the modal renders them with guidance
  ("transfer or delete these first"). No transfer flow in this phase.
- On success: edge function deletes the auth user (`auth.admin.deleteUser`);
  FK cascades remove profile, owned boards/columns/cards, memberships, etc.
  (verified: `profiles.id`, `boards.owner_id`, `board_members`, `cards`,
  invitations all reference `auth.users`/parents with `on delete cascade`;
  implementer must verify the `workspaces` owner FK cascades too and add
  explicit deletes if any table lacks one). Client then clears local state
  (same path as sign-out) and navigates to the landing page.

## Privacy pane

Rows (static copy, house voice, no new hex/tokens):
1. **Where your data lives** — Supabase (Postgres), encrypted in transit
   and at rest.
2. **Your content is yours** — never sold, never used to train AI models.
3. **Privacy Policy** — link (same target the landing page footer uses).
4. **Export your data** — button; moves from the removed Data pane.
   `buildExportPayload` relocates to `src/utils/exportData.js` (also
   resolves the standing react-refresh lint warning in DataSection).

`DataSection.jsx` is deleted.

## Billing pane

- **Plan** — capitalized `profile.tier` (free | pro | team).
- **Includes** — per-tier limits copy (single source:
  `src/constants/tiers.js`, new; numbers taken from `tier.ts` — e.g. free =
  20 AI messages/day, 3 AI create tools; pro/team = all 18 AI tools,
  unlimited messages — implementer copies the real values, no invention).
- **Upgrade** — free tier: primary (ink) Button → `/upgrade/pro`.
  Paid tiers: "Downgrade to Free" secondary action using the same
  tier-write stub the upgrade page uses today. No payment method, no
  invoices (Stripe integration is explicitly out of scope).

## Edge function: `supabase/functions/account/`

Follows the `chat` function's structure (JWT auth first, CORS, JSON errors).
Uses the service-role key (already available to functions) for admin ops.
Routes (single function, path-based: `/account/sessions`, `/account/revoke`,
`/account/delete-account`):

| Route | Does |
|-------|------|
| `GET  /sessions` | Verify JWT → query `auth.sessions` where `user_id = caller` → parse UA, geolocate IPs (batched, per-request cache, 2s timeout, fallback to raw IP) → return rows + `current_session_id` from the JWT claim. |
| `POST /revoke` | Body `{ session_id }`. Refuses the caller's current session. Deletes that row from `auth.sessions` (refresh token dies immediately; access token expires naturally within the hour). |
| `POST /delete-account` | Ownership check (owned workspaces/boards having members ≠ caller) → 409 + blocking list, or `auth.admin.deleteUser(caller)` → 200. |

Notes:
- Never trust client-supplied user ids — caller identity comes from the
  verified JWT only.
- Deploy via `supabase functions deploy account`; `deno check` before
  deploy.

## Client plumbing

- `src/lib/accountClient.js` — `listSessions()`, `revokeSession(id)`,
  `deleteAccount()` fetch wrappers (auth header from current session, JSON
  errors surfaced with friendly copy).
- `authStore`: `signOut({ scope: 'local' })` default; new
  `signOutEverywhere()`; `deleteAccountCleanup()` shares the reset path.
- New components: `PrivacySection.jsx`, `BillingSection.jsx`,
  `SessionsList.jsx` (part of Account pane), `DeleteAccountModal.jsx`.
- `src/constants/tiers.js` — tier display copy/limits.

## Testing

- Unit: sections render per tier; sessions list states (loading, error,
  rows, revoke success/failure — fetch mocked); delete modal email-match
  gate; export payload unchanged; signOut scope split.
- Edge: `deno check`; after deploy, curl the three routes (valid JWT, bad
  JWT, revoke-current-session refusal, delete-account 409 path).
- Browser pass: two browser contexts → two sessions visible; revoke one
  from the other and watch it die; log-out-all from context A kills B;
  delete a throwaway account end-to-end (fresh account with no shared
  ownership); blocked-delete path exercised with a shared board.

## Out of scope

- Ownership transfer flows (blocked deletions just list the blockers).
- Stripe/payment methods/invoices.
- Session revocation push (revoked device finds out on next token refresh).
- Geolocation caching table (per-request cache only).
