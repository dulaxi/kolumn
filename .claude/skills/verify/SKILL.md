---
name: verify
description: Use when verifying a UI change in the running Kolumn app — how to boot the dev server, mint an authenticated throwaway Supabase user, and drive the app with Playwright.
---

# Verifying Kolumn changes in the running app

The surface is a browser at the Vite dev server. There is no seeded test
account — mint a throwaway user via the Supabase API and inject its session.

## Recipe

1. **Dev server**: `npm run dev` (background), wait for `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` → 200.

2. **Throwaway user** (Supabase URL + anon key are in `.env.local`):
   - `POST $URL/auth/v1/signup` with `{email, password, data:{display_name}}`
     → returns a full session JSON (email confirmation is disabled).
   - **Gate**: `AppLayout` bounces any profile without `onboarded_at` to
     `/onboarding`. Stamp it via REST:
     `PATCH $URL/rest/v1/profiles?id=eq.<user id>` with
     `{"onboarded_at": ..., "terms_accepted_at": ..., "role": "engineer"}`
     using the user's own `access_token` as Bearer (RLS allows self-update).
   - Workspaces can also be created via REST: `POST /rest/v1/workspaces`
     with `{name, owner_id}` — a trigger auto-adds the owner as member.

3. **Drive with Playwright**: no browsers are installed in the Playwright
   cache, but Chrome is at `/Applications/Google Chrome.app` — use
   `playwright-core` with `chromium.launch({ channel: 'chrome', headless: true })`
   (install `playwright-core` into a temp dir, not the repo).
   Inject the session before load:

   ```js
   ctx.addInitScript(([k, v]) => localStorage.setItem(k, v),
     ['sb-<project-ref>-auth-token', JSON.stringify(sessionJson)])
   ```

   The project ref is the subdomain of `VITE_SUPABASE_URL`.
   Allow ~4s after `goto` for auth hydrate + onboarding-board seeding.

## Gotchas

- `vite.config.js` pins `server.host: '127.0.0.1'` — without it, Node
  resolves `localhost` to `::1` first on this Mac and Vite listens on IPv6
  only, which Safari can't reach (it tries 127.0.0.1 per /etc/hosts order).
  Don't remove the pin.
- Safari blank page on localhost:5173 with dev server fine elsewhere =
  stale PWA service worker from a past prod build wedging module requests
  (main.jsx's dev-mode SW cleanup can't run if the SW breaks main.jsx
  itself). Fix: Safari → Settings → Privacy → Manage Website Data →
  remove localhost. A Private window loading fine confirms this diagnosis.
- Playwright's WebKit build segfaults on this macOS — reproduce
  Safari-side issues in real Safari (safaridriver needs "Allow remote
  automation" enabled) or by asking the user, not via Playwright webkit.
- `UID` is a readonly variable in zsh — don't use it in shell scripts.
- The onboarding checklist "Create your first board" step goes line-through
  and disabled once any board exists — test it before creating boards.
- Sidebar section "+" buttons are hover-revealed; `click({ force: true })`
  or hover the section header first.
- Pre-existing console warning: `inert=""` boolean-attribute complaint from
  `BoardSelector.jsx` — not a regression signal.
- Clean up: DELETE boards/workspaces via REST with the user token. The
  throwaway auth users themselves can't be deleted with the anon key —
  they accumulate; name them `verify-<timestamp>@example.com` so they're
  identifiable.

## Useful selectors

- Create-board modal: heading text `Create a new board`, name input
  placeholder `Untitled`, submit button `Create board`.
- Sidebar boards plus: `[aria-label="New board"]`; workspace plus:
  `[aria-label="New board in <name>"]`.
