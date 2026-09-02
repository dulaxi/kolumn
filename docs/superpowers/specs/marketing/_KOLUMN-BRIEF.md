# Kolumn ground truth for marketing specs

Read this before writing any Kolumn copy. Do not invent features, numbers, or customers.

## What Kolumn is
An AI-powered kanban. Boards, columns, cards with classic drag-and-drop, plus an AI layer that
operates the same boards through tools. Positioning (from the landing FAQ): "a kanban that stayed a
kanban" — no setup, no rituals, no custom-field discipline; the AI runs the busywork.
Competitors named on the landing page: Asana, Trello, Notion.

## Real features (safe to claim)
- Boards, columns, cards. Cards have: title, description, Phosphor icon, priority, due date, labels,
  checklist, assignees, task number. Card detail opens as a centered modal.
- **The pill** (QuickAddBar) on every board: type intent in plain language → AI creates / moves /
  updates / completes cards on *that* board. Comma/newline lists are split into cards instantly without AI.
- **Chat** (`/chat`): conversational surface over your boards — ask questions, get summaries. Read-only.
- **Workspaces**: multi-tenant team containers with members + invitations. Personal boards can also be
  shared per-board.
- **Realtime sync** across members (Supabase Realtime).
- **Templates** for boards and cards (`templateStore`), a getting-started board seeded for new users.
- **Search** (⌘K), notifications, undo on destructive actions, light/dark/system theme, reduced-motion.
- **Security**: Supabase Postgres with row-level security on every table; members-only board access;
  data export + account deletion in Settings → Privacy/Account; "we don't train on your content."
- Sessions list/revoke and delete-account in Settings → Account.
- Landing demos show cards being extracted from **notes, Slack threads, meeting transcripts, Gmail**.
  Treat these as *the product story* (capture from anywhere → cards), not as shipped integrations.
  Do not claim "Slack integration" as a live feature; phrase as "paste a thread / drop in notes."

## Not shipped (do NOT claim as live; may appear as "coming soon" only if the spec says so)
- Board Builder (`/build`) — being scoped. Native mobile/desktop apps. Calendar view. Public API.
  Slack/Gmail OAuth integrations. Enterprise SSO/SAML. SOC 2 (unknown — mark as open question).

## Tiers and prices (source of truth: `profiles.tier`, `tier.ts`, `UpgradeProPage.jsx`)
- **Free**: 20 AI messages/day; pill limited to create-type actions; chat is text-only Q&A.
- **Pro**: $8/month (+tax), billed monthly; trial exists. All AI write tools in the pill; read tools in chat.
- **Team**: exists as a tier value; pricing not defined in code → mark as open question, don't invent.

## Voice
Short declaratives. Concrete over grand. No "revolutionize," no "supercharge," no exclamation marks.
Sentence-case headings. Product name is "Kolumn" (never "KOLUMN"). The AI is just "the AI" or "Kolumn"
— no mascot name in marketing copy (Klay is the pixel mascot, may appear as illustration only).

## Design system (must respect)
- Fonts: Inter Variable (body), Clash Grotesk (`--font-heading`, weight 425 for titles; 300 for pre-auth
  display), IBM Plex Mono (code/IDs/small caps chrome). No serif.
- Tokens only: `--surface-page/card/raised/hover/sidebar`, `--border-default/subtle`,
  `--text-primary/secondary/muted/faint`, `--accent-lime*`, label + Phosphor palette. Never hex.
- 1px borders, 8px radius small (buttons/inputs), 10–12px raised (cards/panels/tiles). Minimal shadow.
- Buttons: ink for affirmative, red for destructive. **No lime button.** Lime is a state color only.
- Icons: Phosphor only. Motion: transform/opacity, token durations, reduced-motion aware.
- Existing landing: `src/pages/LandingPage.jsx` — hero h1 is `font-heading text-5xl/6xl tracking-tight
  leading-[1.08]`, section h2 is `font-heading font-[425] text-3xl`, container `max-w-6xl px-6 sm:px-10`.
  Existing legal pages: `src/pages/LegalPage.jsx` shell used by `TermsPage.jsx` / `PrivacyPage.jsx`.
- Primitives in `src/components/ui/`: Avatar, Button, Input, Modal, Popover, Menu, Tooltip, Skeleton,
  SegmentedControl, InlineNotice, FieldError. Logo lockup: `KolumnLockup`.

## Delivery constraints (affects section 4 of each spec)
- Vite SPA; marketing routes will be **prerendered to static HTML at build** with a sitemap. No server.
- Content should live in plain data (JS constants or `src/content/*.json|md`), not Supabase, unless the
  page is inherently dynamic (status).
- Every page needs `<title>`, meta description, canonical, OG tags — proposed in section 1.
