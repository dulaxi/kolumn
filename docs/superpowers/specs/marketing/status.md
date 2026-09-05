# Status — marketing page spec

> Source crawled: https://status.claude.com (Atlassian Statuspage) on 2026-09-02. Screenshots + metrics in the crawl harness `out/status.{json,txt,png,-mobile.png}` and `out/probe-help.txt` (STATUS block).
> Kolumn route: `/status` · Priority: P2 · Template family: utility

## 1. Purpose and SEO target
- **Job of this page**: answer "is Kolumn down, or is it me?" in under two seconds, then show what broke recently and when it was fixed.
- **Primary query intent**: `kolumn status` / `is kolumn down`. Secondary: `kolumn outage`, `kolumn not syncing`, `kolumn ai not responding`, `kolumn incident history`.
- **`<title>`**: `Kolumn status` (13 chars) · **meta description**: `Live status for the Kolumn web app, realtime sync, AI assistant, sign-in, and email, with 90 days of uptime and incident history.` (131 chars) · **OG title**: `Kolumn status` · **OG description**: same as meta.
- **Structured data**: none. The source emits no JSON-LD; a status page has no schema type worth faking. Emit `<link rel="alternate" type="application/rss+xml">` for the incident feed only if the chosen provider exposes one (see §4).
- **Internal links in**: shared footer ("Status" under Resources), the in-app offline toast is *not* a link (it's a toast, keep it that way), `InlineNotice` on chat/pill 5xx errors may link here later (open question). **Links out**: `/support` ("Something else wrong?"), `/` via the lockup, provider subscribe/RSS if any.

## 2. Source page anatomy (what Anthropic does)

Statuspage renders a single 850px column; no site nav, no site footer, no sidebar. Page is 5,512px tall at 1440w because 15 days of incident history are inlined.

## 1. Masthead — height 118px · container 850px · padding 0 · bg page · no grid · logo (wordmark + mark, 18px tall link) left, one CTA right: "SUBSCRIBE TO UPDATES" ink pill, 12px caps. Exists to name the page and offer notifications; nothing else competes.

## 2. Overall banner — height 66px · 850px · padding 12/20 · bg solid green (operational) · h2 20px/29 weight 500 white "All Systems Operational" · radius 4px · 1px rgba border. The one thing people came for; it changes hue with the worst component state (green / yellow / orange / red / blue for maintenance).

## 3. Components list — height 814px · 850px · starts 70px below the banner · one muted 14px caption row ("Uptime over the past 90 days. View historical uptime.") right-aligned, then 6 stacked rows in one bordered group (1px border, 4px radius on the group only). Each row 127–128px: padding 18/20/16, name 16px/24 weight 500 left, status word 14px right in the status colour, then a 90-day uptime bar (SVG 808×34, 90 rects 5px wide on ~9px pitch, green / yellow / orange / red per day) and a legend row 24px tall: "90 days ago" · "99.42 % uptime" · "Today", 14px muted. Exists to let a user find *their* symptom (login vs API vs app) without reading prose.

## 4. Past incidents — h2 28px/38 weight 500, 850px, starts 70px under the components group · then one block per calendar day for 15 days. Day header 20px/29 weight 500 with a 1px bottom border and 3px padding-bottom; incident title 20px/29 weight 500 in amber (degraded) or red (outage), linked; each update is `strong` label ("Resolved", "Monitoring", "Investigating", "Identified") + 16px/24 body + 14px/21 muted UTC timestamp. Empty days show "No incidents reported." in 16px muted. Exists as the audit trail; also what people screenshot when filing a support ticket.

## 5. Page footer — 34px · 850px · 12px padding-top · 14px · "← Incident History" left, "Powered by Atlassian Statuspage" right. No global footer.

Shared numbers:
- **Type scale**: no h1. h2 (banner) 20/29/500; h2 (Past incidents) 28/38/500; day/incident title 20/29/500; body 16/24/400; caption 14/21–24/400 muted. Font: Atlassian Sans throughout.
- **Container + rhythm**: 850px fixed, 20px inner padding on the component rows, 70px between the three big blocks, 4px radius, 1px borders, no shadows anywhere.
- **Palette roles**: page bg warm off-white; text ink; muted grey for captions/timestamps; operational green used as *banner fill* (white text on it) and as *status text*; degraded amber, partial-outage orange, major-outage red, maintenance blue; day bars reuse the same four hues.
- **Mobile (390w)**: identical single column with ~16px side padding; masthead stacks logo over the subscribe button; the 90-rect bar squeezes to ~3px rects with the same three-item legend; everything else just narrows.
- **Nav / footer**: deviates from the shared chrome entirely — no site nav, no site footer. Kolumn keeps that (see §3).

## 3. Kolumn version

Kolumn keeps the source's single-column, no-chrome shape. This is the one marketing page that must load and read correctly during an outage, so it has no dependency on the app bundle, no auth, and no Supabase calls from the page itself.

### 1. Masthead — keep
- Left: `KolumnLockup` (`text={18}`) linking to `/`. Right: one **secondary** `Button` (`size="sm"`) — label **"Get updates"** — which opens the provider's subscribe UI (email / RSS) if the provider has one; hide the button if it doesn't (open question §5). No lime, no ink pill; the source's black caps pill becomes our secondary bordered button.
- Height 72px, `max-w-[850px] mx-auto px-6`, `pt-8`.

### 2. Overall banner — adapt
- Copy, one of five states (drive from data, never hardcode):
  - operational — **"All systems operational"**
  - degraded — **"Some things are slower than usual"**
  - partial — **"Part of Kolumn is unavailable"**
  - major — **"Kolumn is down"**
  - maintenance — **"Scheduled maintenance in progress"**
  - unknown (data fetch failed) — **"Status unavailable — try again in a minute"**
- Layout: 1px border `--border-default`, radius 10px, padding 14px 20px, flex row: 10px status dot + heading `font-heading font-[425] text-xl` (20px) `--text-primary` + right-aligned `font-mono text-xs --text-muted` "Updated 14:32 UTC".
- Colour is a **dot + wash**, not a filled block with white text (the source's white-on-green is 1.6:1 and lime-on-white would be worse). Backgrounds: `--accent-lime-wash` (operational), `--label-yellow-bg` (degraded / maintenance), `--label-red-bg` (partial / major), `--surface-card` (unknown). Dot colours: `--accent-lime`, `--color-honey`, `--color-copper` (partial), `--color-red` (major), `--text-muted` (maintenance / unknown).
- Renders with `role="status"` and `aria-live="polite"` so a screen reader gets the state on load.

### 3. Components list — keep, re-tokened
- Caption row above the group: "Uptime over the last 90 days." `font-mono text-xs --text-muted`, right-aligned, 8px above the group.
- Five rows, in this order, one bordered group (`border --border-default`, radius 12px, dividers `--border-subtle`, `bg --surface-card`):

  | Component | Description (shown as 13px `--text-secondary` under the name) | What it maps to |
  |---|---|---|
  | **Web app** | Boards, cards, drag-and-drop, settings. | Railway static host + Supabase Postgres/RLS |
  | **Realtime sync** | Changes appearing on teammates' screens. | Supabase Realtime (`boards`/`columns`/`cards` channels) |
  | **AI assistant** | The pill and chat. | `chat` edge function + Anthropic API |
  | **Sign-in** | Email + password, password reset, sessions. | Supabase Auth + `account` edge function |
  | **Email** | Invitations, password-reset and sign-up mail. | Supabase Auth SMTP |

- Row: padding 18px 20px 16px (same as source), name `text-base font-medium --text-primary`, status word right-aligned `font-mono text-xs` in the state colour ("Operational", "Degraded", "Partial outage", "Major outage", "Maintenance"). Then the 90-day bar: SVG 100% × 32px, 90 `<rect>`s width 5, rx 1, pitch computed from container width; day colours `--accent-lime` / `--color-honey` / `--color-copper` / `--color-red`, no-data days `--border-subtle`. Legend row: "90 days ago" · "99.9% uptime" · "Today", `font-mono text-xs --text-muted`. Each rect gets a `<title>` with the date and worst state for hover.
- New component: `StatusComponentRow` + `UptimeBar` (pure SVG, no chart lib). Reduced motion: no animation at all on this page, nothing to guard.

### 4. Past incidents — keep, shortened
- h2 **"Past incidents"** `font-heading font-[425] text-2xl` (24px), 56px above (source 70px — trimmed to our section rhythm).
- Show **7 days** inline (source shows 15) with a **"Older incidents →"** ghost `Button` that loads the next 30 days (or links to the provider's history page). Empty days: "No incidents." `text-sm --text-muted`.
- Day header `font-mono text-xs uppercase tracking-wide --text-muted` with 1px `--border-subtle` bottom rule (we demote the source's 20px day headers — dates are wayfinding, not content). Incident title `text-base font-medium` in the state colour, linked to the provider's incident page. Updates: `<strong>` label ("Resolved", "Monitoring", "Identified", "Investigating") `--text-primary`, body `text-sm --text-secondary`, timestamp `font-mono text-xs --text-muted` in UTC.
- Component: `IncidentDay` list rendered from the feed (see §4).

### 5. Page footer — adapt
- Single row, 14px, `--text-muted`, 1px `--border-subtle` top rule, 12px padding-top, 64px bottom margin: left **"Something else wrong? Visit support"** → `/support`; right **"Data from <provider>"** (name the provider honestly; source says "Powered by Atlassian Statuspage").
- Drop the full marketing footer: during an incident this page should carry nothing that can fail.

Proportions kept from source: 850px column, row padding 18/20/16, 90 rects × 5px, 70px→56px block spacing, legend triplet, day-grouped history. Changed for Kolumn tokens: 4px → 10–12px radii, Atlassian Sans → Inter body + Clash Grotesk headings + IBM Plex Mono for captions/timestamps, filled colour banner → dot + wash with ink text, colour words become mono chrome text.

**Empty / failure behaviour (non-negotiable).** The page is prerendered as a static shell that shows the masthead, the five component *names* and the footer with a neutral "Status unavailable" banner and empty grey bars. It may only flip to "All systems operational" after a successful fetch from the real data source. Never ship a hardcoded green state; a page that says "operational" while the provider is unreachable is worse than no page.

## 4. Data and content sources

- **Component names, descriptions, state copy**: hardcoded constants in `src/content/status.js` (`COMPONENTS`, `STATE_COPY`). Must stay in sync with what actually exists — if the AI surface or email provider changes, update here.
- **Live state, uptime days, incidents**: **external**, fetched client-side on load and every 60s. Two viable sources; recommendation below.
  1. **Hosted status provider** (recommended) — Instatus, Better Stack, or Atlassian Statuspage, each with public JSON (`/summary.json`, `/incidents.json`) and hosted subscribe + RSS. Kolumn *defines* the five components there and pushes state via the provider's monitors (HTTP checks on the app URL, the `chat` function, an auth ping) plus manual incidents. Pros: incident authoring UI, subscriptions, history, uptime math all done. Cons: a paid tier past a few monitors; the provider's own CSP origin has to be allowed in `public/serve.json`.
  2. **Supabase status embed** — `status.supabase.com` exposes the same Statuspage JSON. Pros: free, zero setup. Cons: it reports *Supabase's* regions, not Kolumn's five components; it says nothing about the Anthropic API, Railway, or our edge functions; it cannot carry a Kolumn incident. Acceptable only as a **secondary "Upstream" row** under the five components, never as the primary source.
- **Recommendation**: option 1 with the five components mapped one-to-one; add Supabase and Anthropic (status.claude.com) as two read-only "Upstream" rows below the group, each linking out. Until a provider is wired, the route ships in the neutral "Status unavailable" state described in §3, or is left out of the sitemap — never a fake green.
- Fetch through a tiny adapter (`src/lib/statusFeed.js`) that normalises the provider's JSON into `{ overall, updatedAt, components[], days[], incidents[] }` so the components can be provider-agnostic. CSP: add the provider origin to `connect-src` in `public/serve.json`.
- Prerender: static shell only; no data baked into HTML (it would be stale by definition).

## 5. Open questions
- Which provider (Instatus / Better Stack / Statuspage)? Decides cost, subscribe UI, and whether "Get updates" exists.
- Does Kolumn have any uptime monitors today? If not, the 90-day bars start empty (grey) and only fill from launch day — say so in the legend ("Tracking since <date>").
- Should the in-app chat/pill 5xx `InlineNotice` link to `/status`? Cheap win, but needs a copy decision in `friendlyChatError`.
- Show the two "Upstream" rows (Supabase, Anthropic) publicly, or keep the dependency list internal?
- Incident authoring: who writes updates, and in which voice? Suggest the same four labels as the source (Investigating / Identified / Monitoring / Resolved) and Kolumn's short-declarative voice.
