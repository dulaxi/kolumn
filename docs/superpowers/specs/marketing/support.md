# Support — marketing page spec

> Source crawled: https://support.claude.com (hub), https://support.claude.com/en/articles/9797557-usage-limit-best-practices (article), https://www.anthropic.com/supported-countries (availability) on 2026-09-02. Screenshots + metrics in the crawl harness `out/support*`, `out/support-article*`, `out/availability*`, `out/probe-help.txt` (HUB block).
> Kolumn route: `/support` (hub) · `/support/<category>/<slug>` (article) · Priority: P1 · Template family: hub (+ article)

## 1. Purpose and SEO target
- **Job of this page**: let a stuck user find the answer in one click, and give people evaluating Kolumn a truthful picture of what it does and doesn't do.
- **Primary query intent**: `kolumn help` / `kolumn support`. Secondary: `kolumn daily limit`, `kolumn export data`, `kolumn delete account`, `kolumn share board`, `kolumn ai pill`.
- **`<title>`**: hub `Kolumn support` (14 chars); article `<Article title> · Kolumn support` (≤60 — truncate the article title, never the suffix) · **meta description**: hub `Answers about boards, cards, the AI pill and chat, workspaces, billing, and your data. Search or browse by topic.` (113 chars); article: the article's `summary` frontmatter (≤155) · **OG title/description**: same as `<title>` / description; `og:type` `website` for the hub, `article` for articles.
- **Structured data**: hub emits `WebSite` with a `SearchAction` (the source does; ours targets `/support?q={search_term_string}` which the client-side filter reads). Articles emit `BreadcrumbList` (Support › Category › Article) and `Article` (`headline`, `dateModified`, `publisher: Kolumn`). Articles in the Privacy & data category also emit `FAQPage` only if written as Q/A — the two full articles below are not, so no `FAQPage`.
- **Internal links in**: shared footer "Support", landing FAQ ("More questions → Support"), Settings modal ("Help" link, open question), in-app `InlineNotice` on the daily-limit error (link to the limit article — open question). **Links out**: `/status`, `/privacy`, `/terms`, `/upgrade/pro`, `/onboarding`, and a contact email/link (open question).

## 2. Source page anatomy (what Anthropic does)

### Hub (support.claude.com, 2,505px tall)

## 1. Header — 60px fixed · full width · bg page · left "Claude Support" wordmark (212×32 link), right three 14px text links (API Docs / Release Notes / How to Get Support) with 8/12 padding + language switcher + a 30px-tall "Search ⌘K" pill (12px radius, 1px 15%-alpha border, 5%-alpha fill). Exists as the help-centre chrome — deliberately *not* the marketing nav.

## 2. Left sidebar — 243px column, sticky, 16px from the left edge, top 84px · one 36px row per collection (16 rows): 20px icon + 14px/20 weight-600 label, 8px padding, 12px radius on hover, chevron right. Same 16 items as the card grid. Exists so a reader can jump collections from any article without going back to the hub.

## 3. Hero — starts y=92 · main column 812px at x=324 (page left 324, gutter to sidebar ~65px) · height 189px · h1 48px/54 weight 500 serif "Search for answers or browse by topic" (623px wide, wraps to two lines) · search field 420×49 (12px radius, 1px 15%-alpha border, 12/16 padding, 15px placeholder, `⌘K` kbd 31×20 5px radius at the right) 32px below the h1. Exists because search is the fastest path; the h1 is just a label for it.

## 4. Popular articles — 812px · six rows, each ~38px tall (14px/20 weight-600 title left, 20px doc icon right) with 1px dividers · no heading · 48px under the search. Exists to short-circuit the six questions everyone asks.

## 5. Collections grid — h2 22px/29 weight 600 serif "Collections" at y=609, then a **3-column grid, 24px gap, cards ≈254×215px**, 16 cards (six rows, last row has one). Card: 1px border, 12px radius, bg slightly lighter than page; a 60px icon band (20px icon, 20px padding) separated by a 1px rule; then title 16px weight 600 serif, description 13px/20 muted (205px measure, 2–3 lines), and an article count ("79 articles") that the DOM has but the render hides. Exists as the browse path; counts signal depth.

## 6. Footer — 388px · bg ink · 48px vertical padding · logo mark left, two link columns (Product/Research/Company/News/Careers; Terms ×2 / Privacy / Usage / Disclosure / Compliance) 14px/22 at x≈882 and x≈1016. A blue 48px Intercom bubble floats bottom-right.

### Article (Usage limit best practices, 4,216px tall)

## 1. Header + breadcrumb — same 60px header and 243px sidebar · breadcrumb row 13px muted at y≈96 ("All Collections › Claude › Usage and limits › Usage limit best practices") · h1 36px/40 weight 600 serif at y=128, 812px measure · date "June 2, 2026" 13px muted under it · "Copy for LLM" split button 30px tall, 1px border, right-aligned on the date row · header block padding-bottom 32px.

## 2. Body — 812px measure · body 15px/23 · h2 22px/28 weight 600 serif with ~44px above / 12px below · h3 17px/22 weight 600 sans · lists 15px/23 with 8px item gap and nested bullets · bold links, underlined · 1px `hr` rules separating logical parts. Right rail "On this page" TOC at x≈1200, 13px, sticky, active item marked with a 2px left bar.

## 3. Reactions — 107px tall, 32px padding-top, 1px rule above · "Did this answer your question?" 13px muted + three 32px emoji buttons (😞 😐 😃), 1px border, 8px radius.

## 4. Related articles — 234px · h2 22px serif "Related Articles" · five 38px rows identical to the hub's popular list.

## 5. Footer — same as hub.

### Availability (anthropic.com/supported-countries, 15,960px tall)
Two h2 sections (API, Claude.ai), each a 4-column list of ~230 country `li`s at 12px, 777px intro column, 1,272px list container. Pure legal disclosure — 457 list items, no design to borrow. **Decision: drop.** Kolumn has no geographic gating anywhere in code (no country check in auth, onboarding, or edge functions) and the Terms/Privacy pages already carry jurisdiction language. An "Availability" section would be an empty promise; a one-line article in Account & billing covers the real question ("Can I use Kolumn from anywhere?"), see §3.

Shared numbers:
- **Type scale (hub)**: h1 48/54/500 serif; h2 22/29/600 serif; card title 16/600 serif; card body 13/20/400; list rows 14/20/600; body 16/26. **Article**: h1 36/40/600; h2 22/28/600; h3 17/22/600; body + li 15/23; captions 13/20 muted. Sans throughout the body, serif for every heading.
- **Container + rhythm**: main column 812px at x=324 (sidebar 243 + 65 gutter); 32px main padding-top, 64px bottom; card radius 12px; 1px low-alpha borders; one 1px/2px shadow on the search field only.
- **Palette roles**: page warm off-white; surface a shade lighter for cards and the search field; text ink; muted grey for descriptions/breadcrumbs/dates; low-alpha ink borders; ink footer with off-white text; one blue accent (the Intercom bubble) — otherwise no accent colour on the whole page.
- **Mobile (390w)**: sidebar hidden behind a hamburger; header keeps wordmark + globe + search + menu icons; h1 drops to ~40px; search goes full-width 358×49; popular list unchanged; **collections grid becomes a single-column list** — title 16px, one-line clamped description, icon moves to the right edge, 1px dividers, no cards; footer stacks to two columns.
- **Nav / footer**: deviates from marketing chrome — help centre has its own thinner header (60px, no CTA) and the sidebar. Kolumn adapts this: see §3 header.

## 3. Kolumn version

Kolumn keeps the source's "search first, browse second" order, its 812px main measure and 3-column card grid, but collapses 16 collections to 6, and replaces Intercom with a plain contact row. No serif — headings are Clash Grotesk 425.

### Hub (`/support`)

### 1. Header — adapt
- Use the **shared marketing chrome** (see the chrome spec) rather than a separate help-centre header. Right side gains a **secondary `Button` (`size="sm"`) "Search ⌘K"** with a `<kbd>` (mono 11px, 1px border, 5px radius) that focuses the hero search; keyboard shortcut wired with `useKeyboardShortcuts`. Height stays whatever chrome defines (the 60px help-centre header is not adopted).

### 2. Left sidebar — adapt to a **category rail, desktop only**
- 240px sticky column (`top-24`), 6 rows × 36px: Phosphor icon 18px + `text-sm font-medium --text-primary`, 8px padding, `rounded-lg` hover `--surface-hover`, active row `bg --surface-raised`. Present on the hub and on every article; hidden below `lg` (mobile gets the in-page list instead).
- Icons (all already in the app's Phosphor vocabulary or the allow-list): Getting started `Sparkle`, Boards & cards `Kanban`, The AI pill & chat `ChatCircleDots`, Workspaces & sharing `Cube`, Account & billing `CreditCard`, Privacy & data `LockKey`.

### 3. Hero — keep
- h1: **"How can we help?"** — `font-heading font-[425] text-5xl tracking-tight leading-[1.08] --text-primary` (48px like the source), max-w 640px.
- Search: `Input` with `leadingIcon={MagnifyingGlass}`, `wrapperClassName="max-w-[420px]"`, height 48px (source 49 → our `lg` input), placeholder **"Search articles"**, `⌘K` kbd at the right (same kbd style as the header). It filters the article index client-side (title + summary + tags); results replace sections 4–5 in place as a flat list of rows; "No articles match — try a different word, or write to us." with the contact link when empty. 1px ink focus border, no glow (coherency rule). 32px below the h1.
- Section: `max-w-6xl px-6 sm:px-10`, main column 812px measure, `pt-14 pb-12`.

### 4. Popular articles — keep
- No heading (as source), 48px under the search. Six rows, 40px each, `text-sm font-medium --text-primary`, `FileText` 18px `--text-muted` on the right, 1px `--border-subtle` dividers, whole row is the link, hover `--surface-hover`:
  1. Why did the AI say I hit my daily limit?
  2. What can the pill do on Free vs Pro?
  3. How do I export or delete my data?
  4. How do I share a board with someone?
  5. Why isn't a teammate seeing my changes?
  6. How do I cancel or change my plan?

### 5. Categories grid — keep, 6 cards
- h2 **"Browse by topic"** `font-heading font-[425] text-2xl` (24px; source 22) 56px above the grid.
- **Grid: 3 columns × 2 rows, 24px gap, cards 254px wide** (812 − 48 = 764 / 3 ≈ 254 — same as source), min-height 200px. Card = `<a>` block: `bg --surface-card`, 1px `--border-default`, `rounded-xl` (12px), icon band 56px tall with 20px padding and a 1px `--border-subtle` rule under it, then 20px padding: title `text-base font-medium --text-primary`, description `text-[13px] leading-5 --text-secondary` (2 lines), count `font-mono text-xs --text-muted` "4 articles" (we *show* the count the source hides — it's honest about how thin each topic is). Hover: border → `--border-focus`? No — keep 1px `--border-default` and lift bg to `--surface-hover`; no shadow, no transform.
- Cards and their four articles (title — one-liner shown on the category page, drawn only from shipped features):

  **Getting started** — *Your first board, the pill, and where things live.*
  1. What is Kolumn? — A kanban that stayed a kanban, with an AI that runs the busywork.
  2. Your getting-started board — What the seeded board shows you and what to try first.
  3. Create a board from a template — Pick a board template, or start blank and add columns.
  4. Keyboard shortcuts and search — ⌘K search, and the shortcuts that move you around.

  **Boards & cards** — *Columns, cards, and the fields on them.*
  1. Anatomy of a card — Title, description, icon, priority, due date, labels, checklist, assignees, task number.
  2. Move, reorder, and complete cards — Drag between columns, sort within one, mark done.
  3. Add, rename, and delete columns — Column basics, and what happens to cards in a deleted column.
  4. Undo a delete — Deleted cards and columns get an Undo in the toast; here is how long you have.

  **The AI pill & chat** — *Plain-language actions on a board, and questions about all of them.*
  1. What the pill can do — Type intent on a board; the AI creates, moves, updates, and completes cards there.
  2. Add many cards at once — Comma- or newline-separated lists become cards instantly, no AI call.
  3. Why did the AI say I hit my daily limit? — The Free plan's 20-message day, what counts, and when it resets.
  4. Chat vs the pill — Chat answers questions about your boards; it never edits them.

  **Workspaces & sharing** — *Teams, invitations, and who can see what.*
  1. Share a single board — Invite by email; personal boards can be shared without a workspace.
  2. Create a workspace and invite members — A container for team boards, with its own member list.
  3. Why isn't a teammate seeing my changes? — Realtime sync, the offline toast, and what to check.
  4. Leave or remove someone from a board — Owners, members, and what leaving does to assigned cards.

  **Account & billing** — *Your plan, your sessions, your login.*
  1. Free vs Pro — 20 AI messages a day and create-only pill actions on Free; every AI tool on Pro at $8/month.
  2. Upgrade, cancel, or change your plan — Settings → Billing, and what cancelling does to your boards (nothing).
  3. Change your email or password — Settings → Account, and the reset-by-email path if you're locked out.
  4. Sign out everywhere and review sessions — See active sessions, revoke one, or end them all.

  **Privacy & data** — *Where your data lives and how to take it with you.*
  1. How do I export or delete my data? — A JSON backup from Settings → Privacy, and the delete-account flow.
  2. Where is my data stored? — Supabase Postgres, encrypted in transit and at rest, row-level security on every table.
  3. Does the AI train on my boards? — No. What the AI is sent per request, and what is never sent.
  4. Who can see my boards? — Members only; owners, board members, and workspace members explained.

### 6. Contact row — new (replaces the Intercom bubble and the source's "How to Get Support" link)
- 64px above the footer, full-width row inside the 812px measure: 1px `--border-default`, `rounded-xl`, `bg --surface-card`, padding 20px 24px, flex between. Left: `text-base font-medium` **"Didn't find it?"** + `text-sm --text-secondary` "Write to us and a person answers, usually within a day." Right: a **secondary `Button`** **"Email support"** → contact destination (open question). A second ghost link **"Check status"** → `/status`. No floating widget, no chat bubble.
- Copy caveat: "usually within a day" is a promise — keep only if the user commits to it; otherwise drop the clause.

### 7. Footer — keep shared chrome footer.

### Article (`/support/<category>/<slug>`)

- **Breadcrumb**: `font-mono text-xs --text-muted`, `CaretRight` 12px separators: Support › Category › Article title (current item `--text-secondary`, not a link). Emits `BreadcrumbList`.
- **h1**: `font-heading font-[425] text-[36px] leading-[1.1] tracking-tight` — 36px as source. Under it, one row: `font-mono text-xs --text-muted` "Updated <Mon D, YYYY>" left; no "Copy for LLM" (drop — Kolumn has no LLM-facing docs story yet).
- **Body**: 812px measure (`max-w-[812px]`), `text-[15px] leading-[23px] --text-secondary` — same as source; h2 `font-heading font-[425] text-[22px]` with `mt-10 mb-3`; h3 `text-base font-semibold --text-primary`; lists `list-disc pl-5 space-y-2`; links `--text-primary` underline `decoration-[var(--color-sand)]` hover `--text-secondary` (the pattern already used in `PrivacySection`); inline UI paths use `<kbd>`-style mono chips (`font-mono text-[13px] bg --surface-raised px-1.5 rounded-md`) for "Settings → Privacy". Callouts use `InlineNotice` (`info` / `warn`) — never a custom box. Reuse `LegalPage`'s prose class stack as the base, extended for h3 and code.
- **Right rail "On this page"**: only when an article has ≥3 h2s; 200px, sticky, `font-mono text-xs`, active item gets a 2px `--text-primary` left rule. Hidden below `xl`.
- **"Was this helpful?"**: 1px `--border-subtle` rule, `pt-8`, `text-sm --text-secondary` **"Did this answer your question?"** + two secondary `Button`s (`size="sm"`) **"Yes"** / **"No"** (`ThumbsUp` / `ThumbsDown` 16px) — not three emoji. Click → PostHog event `support_article_feedback {slug, helpful}` via the existing analytics wrapper; "No" reveals one line: "Sorry about that — [write to us](contact) and say what's missing." Prerendered pages must degrade: if JS hasn't loaded, the buttons do nothing visible; no form.
- **Related articles**: h2 **"Related"** `font-heading font-[425] text-xl`, then up to 4 rows in the popular-list style (40px, divider, `FileText` icon), chosen by the `related:` frontmatter list, falling back to the other articles in the same category.
- **Mobile (390w)**: rail hidden; breadcrumb collapses to "‹ Category"; h1 30px; body stays 15/23; feedback buttons full-width in a row.

#### Full article 1 — `src/content/support/ai-pill-and-chat/daily-limit.md`

```md
---
title: Why did the AI say I hit my daily limit?
slug: daily-limit
category: ai-pill-and-chat
summary: The Free plan includes 20 AI messages a day across the pill and chat. Here is what counts, what doesn't, and when the counter resets.
updated: 2026-09-02
related: [what-the-pill-can-do, add-many-cards-at-once, free-vs-pro]
tags: [limit, free, pro, pill, chat, 20 messages]
---

If you see **"You've reached your daily limit of 20 messages"** in the pill or in chat, you are on the Free plan and have sent 20 AI messages today. Nothing is broken, and nothing you did was lost.

## What counts as a message

Every time you press Enter in the pill or send a message in chat, and Kolumn asks the AI to respond, that is one message. Both surfaces draw from the same daily allowance of **20 on Free**.

Things that do **not** count:

- **Lists in the pill.** If you type several items separated by commas or new lines, Kolumn splits them into cards itself. The AI is never called, so nothing is deducted.
- **Follow-up steps inside one request.** When the AI creates a card, then moves it, then reports back, that is one message no matter how many steps it takes.
- **Chat titles.** The short title Kolumn writes for a new chat thread is housekeeping and is not billed against your day.
- **Drag-and-drop, editing cards by hand, search.** None of these touch the AI.

## When the counter resets

The count is kept per calendar day on the server, in UTC. It goes back to zero at **00:00 UTC**, which is 5 pm Pacific, 8 pm Eastern, or 1 am the next day in London. If it is late afternoon on the US west coast and you are out of messages, you are closer to a reset than it looks.

## What you can do right now

- **Keep working without the AI.** Boards, cards, drag-and-drop, and the pill's list splitting all keep working. Only AI responses pause.
- **Batch your asks.** One message like "add cards for the three follow-ups from today's call, all due Friday" costs the same as one word.
- **Upgrade to Pro.** Pro removes the daily limit and turns on every AI tool in the pill (move, update, complete, delete, and the batch versions). It is $8 a month plus tax, billed monthly. Open **Settings → Billing → Upgrade**, or go to [Upgrade to Pro](/upgrade/pro).

## If you see a different message

**"Something went wrong — try again."** means Kolumn could not read the usage counter at all. To be safe it refuses the request rather than guessing. Wait a moment and try again; if it keeps happening, check [status](/status) and then [write to us](CONTACT).

**"Claude is busy right now"** is on the AI provider's side, not your allowance. Your message was not counted. Try again in a minute.
```

#### Full article 2 — `src/content/support/privacy-and-data/export-or-delete-your-data.md`

```md
---
title: How do I export or delete my data?
slug: export-or-delete-your-data
category: privacy-and-data
summary: Download a JSON backup of every board, column, and card from Settings → Privacy, or delete your account and everything in it from Settings → Account.
updated: 2026-09-02
related: [where-is-my-data-stored, who-can-see-my-boards, upgrade-cancel-or-change-your-plan]
tags: [export, backup, json, delete account, gdpr, privacy]
---

Your boards are yours. You can take a copy at any time, and you can delete your account without asking anyone. Both live in Settings, and neither needs an email to support.

## Export a backup

1. Open **Settings** from the bottom-left of the sidebar.
2. Go to **Privacy**, then **Your data**.
3. Click **Export**. Your browser downloads a file named `kolumn-backup-YYYY-MM-DD.json`.

The file contains every **board, column, and card** you can see in Kolumn, including boards shared with you, plus an `exported_at` timestamp. Cards keep all their fields: title, description, icon, priority, due date, labels, checklist, assignees, and task number.

Not included:

- **Chat threads.** Your conversations with the AI are stored with your account but are not part of the backup yet.
- **Workspace membership and invitations.** People and permissions are not data you can carry to another tool, so they are left out.
- **Attachments.** Kolumn does not store files on cards.

The export is plain JSON. Nothing is encrypted inside it, so treat the file like any other document with your work in it.

## Delete your account

Deleting your account removes your profile, your boards, your cards, and any workspaces you own. **There is no undo**, and support cannot restore a deleted account.

1. Export a backup first if you want one (above).
2. Open **Settings → Account** and scroll to **Danger zone**.
3. Click **Delete account**.
4. Type your email address exactly as shown to confirm, then click **Delete my account**.

You are signed out immediately and the account is gone.

### "Transfer or delete these first"

If you still **own a board or workspace that other people are using**, Kolumn stops the deletion and lists them. Deleting your account would take their boards away with it. For each item, either hand ownership to another member or delete it yourself, then try again.

### What happens to your cards on other people's boards

Cards you were assigned on boards you do not own stay on those boards. Your name is removed from them.

## Related actions in Settings

- **Cancel a paid plan** without deleting anything: **Settings → Billing → Cancel plan**. You move to Free immediately and keep every board.
- **Sign out of every device**: **Settings → Account → Log out of all devices**. Useful if you have lost a laptop and do not want to delete anything.
- **Stop sharing a board** instead of deleting it: remove members from the board's share menu.

If you need a copy of something the export does not include, or you deleted your account and need to confirm it is gone, [write to us](CONTACT) from the email on the account.
```

Proportions kept from source: 812px main measure; 420×48 search; 3-col × 24px-gap grid with 254px cards; 40px list rows; 36px article h1, 15/23 body, 22px article h2; feedback block under the body; related list. Changed for Kolumn tokens: serif headings → Clash Grotesk 425; low-alpha borders → `--border-default/subtle`; 12px radius kept for cards, 8px for buttons/inputs; no Intercom bubble; six categories instead of sixteen; mono captions for breadcrumbs, dates, and counts.

## 4. Data and content sources

- **Articles**: markdown files at `src/content/support/<category>/<slug>.md` with frontmatter `{ title, slug, category, summary, updated, related[], tags[] }`. Categories are the six folder names: `getting-started`, `boards-and-cards`, `ai-pill-and-chat`, `workspaces-and-sharing`, `account-and-billing`, `privacy-and-data`. Loaded at build via `import.meta.glob('/src/content/support/**/*.md', { eager: true, query: '?raw' })` and parsed with a small frontmatter splitter + `react-markdown` + `remark-gfm` (already dependencies for chat). Each file becomes a prerendered route; the hub reads the same index for search, counts, and the popular list.
- **Category metadata** (label, icon, one-liner, order): `src/content/support/categories.js`. Popular list: `popular: [slug…]` in the same file — six slugs, hand-picked.
- **Search**: client-side over `title + summary + tags`; no external service. Index ships in the prerendered hub bundle (six categories × four articles is tiny).
- **Must stay in sync with app code**: the free daily limit (`FREE_DAILY_LIMIT` in `supabase/functions/chat/tier.ts`, currently 20) and the exact error string in `supabase/functions/chat/index.ts`; the Pro price ($8/month) from `src/data/plans.js` / `UpgradeProPage.jsx`; the export filename and payload shape from `src/utils/exportData.js`; the delete-account blocker copy from `DeleteAccountModal.jsx`; settings pane names (General / Account / Privacy / Billing). Add a Vitest that greps the two full articles for `20` and `$8` against those constants so a limit change fails loudly.
- **Feedback**: PostHog event only; no Supabase table, no form.
- **Contact**: single constant `SUPPORT_CONTACT` in `categories.js` (mailto or link), referenced as `CONTACT` in article markdown and replaced at render.

## 5. Open questions
- **Contact channel**: a support mailbox (which address?), a form, or nothing but the email link. Decides the contact row's CTA and the "usually within a day" promise.
- **Billing is not live** (`BillingSection` says "Managed manually until Kolumn billing launches"): the "Upgrade, cancel, or change your plan" article and the upgrade line in the limit article assume the `/upgrade/pro` flow works end to end. Confirm before publishing, or word it as "start a Pro trial".
- **Team tier**: exists in `profiles.tier` with no price or feature list in code — the Account & billing category deliberately says nothing about it. Add a fifth article when it is defined.
- **Reset timezone**: `increment_chat_usage` uses `CURRENT_DATE`, i.e. the database session timezone (UTC on Supabase by default). The article states 00:00 UTC — verify the project's `timezone` setting before publishing.
- **In-app link**: should the daily-limit `InlineNotice` in chat and the pill link to the article (`/support/ai-pill-and-chat/daily-limit`) in addition to `/upgrade/pro`? Cheap, but it touches `ChatMessage.jsx` / `QuickAddBar.jsx`, which the CLAUDE.md says to leave alone unless asked.
