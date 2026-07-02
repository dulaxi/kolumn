# Kolumn

AI-powered Kanban project management. Manage cards and boards with classic
drag-and-drop, or type intent into the AI pill and let Claude operate the same
data model through tools.

**Stack:** React 19 · Vite 7 · Tailwind v4 · Zustand · Supabase (Postgres,
Auth, Realtime, Edge Functions) · Anthropic Claude API

## Getting started

Prerequisites: Node 20+, npm, a [Supabase](https://supabase.com) project.

1. **Install dependencies**

   ```bash
   npm ci
   ```

2. **Set up Supabase**

   - Create a project at supabase.com and disable email confirmation in
     Auth settings (or keep it on and configure SMTP).
   - Apply the schema: run `supabase/schema.sql` in the SQL Editor, or link
     the CLI and run `supabase db push` (migrations live in
     `supabase/migrations/`).

3. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (required).
   `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, and `VITE_POSTHOG_HOST` are
   optional (error tracking / analytics).

4. **Deploy the AI edge function** (needed for the chat + AI pill surfaces)

   ```bash
   supabase functions deploy chat
   supabase functions deploy check-email
   ```

   Set `ANTHROPIC_API_KEY` in Supabase → Edge Functions → Secrets.

5. **Run**

   ```bash
   npm run dev          # dev server on http://localhost:5173
   ```

## Commands

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build (port 4173)
npm run lint         # ESLint
npm run test         # Vitest, single run
npm run test:watch   # Vitest, watch mode
```

## Deploying

- **Vercel** — `vercel.json` is included (SPA rewrites + security headers
  incl. CSP). Set the `VITE_*` env vars in the project settings.
- **Railway** — `railway.json` builds and serves `dist/` with `serve`.

Database changes ship as SQL files in `supabase/migrations/`; apply them with
`supabase db push` (or paste into the SQL Editor) before deploying frontend
code that depends on them.

## Project layout

See `CLAUDE.md` for the full architecture map, design-system rules, and data
shapes. In short: `src/store/` holds Zustand stores backed by Supabase,
`src/components/ui/` is the design-system layer, `supabase/functions/chat/`
is the single AI entry point, and design-decision mockups live in
`docs/design-mockups/`.
