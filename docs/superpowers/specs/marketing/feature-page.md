# Feature page (template) — marketing page spec

> Source crawled: https://claude.com/claude-in-chrome and https://claude.com/product/tag (Claude in Slack, now "@Claude") on 2026-09-02. Screenshots + metrics in the crawl harness `out/` dir (`feature-chrome.*`, `feature-slack.*`).
> Kolumn route: `/features/<slug>` · Priority: P1 · Template family: feature
> Instances fully written below: `/features/pill` and `/features/chat`.

## 1. Purpose and SEO target
- **Job of this page**: explain one feature deeply enough that a reader can picture using it tomorrow, state exactly what Free and Pro get, and send them to signup.
- **Primary keyword / query intent** (per instance):
  - `/features/pill` — "add tasks with AI kanban" · secondary: "natural language task creation", "paste list into kanban", "AI move cards kanban board".
  - `/features/chat` — "ask AI about my kanban board" · secondary: "project status chat", "kanban summary AI", "what is overdue on my board".
- **`<title>` / meta / OG** (per instance):
  - pill: `<title>` `The pill — Kolumn` (17) · meta `Type what you need on any board and the AI creates, moves, updates, or completes the cards. Paste a list and it becomes cards instantly. Free tier included.` (153) · OG title `The pill` · OG description = meta.
  - chat: `<title>` `Chat — Kolumn` (13) · meta `Ask questions about your boards and get answers from your own cards: what is overdue, what shipped, what is still open. Read-only, so nothing moves by accident.` (152) · OG title `Chat` · OG description = meta.
- **Structured data**: `BreadcrumbList` (Home → Features → <Feature>) and `FAQPage` with the page's 4–5 questions — the source Chrome page emits one `Question` JSON-LD block per FAQ item, so this is directly modelled. No `Product`.
- **Internal links in**: `/features` hub caption buttons, `/pricing` feature rows, landing demo captions, in-app upsell (`Settings → Plan`) may deep-link to `/features/pill#plans`. **Links out**: the sibling feature page (pill ↔ chat), `/pricing`, `/signup`, `/security` (chat page: "read-only" claim links to security).

## 2. Source page anatomy (what Anthropic does)

Both feature pages share one template. Chrome: 12,410px, 11 blocks. Slack: 10,643px, 11 blocks. Container 1312px (64px gutters). Numbers below are Chrome's unless noted.

`## 1. Hero (centered)` — 1,421px (Slack 240 spacer + hero to ~2,136) · 1312 container · text centered in a 935px column · eyebrow 17/27 sans muted (`Claude in Chrome`) — on Slack it is a bordered pill tag (`@Claude beta`, h=28, radius 8) · h1 72/79 serif 500, two lines · subhead 23/35 muted, max-width ~700px · CTAs: one ink button (h=40, radius 12, `Add to Chrome` / `Add to Slack`), Slack adds a second secondary sand button (`Read documentation`) · availability note 12/19 muted with an underlined link (`Available on all paid plans. Not on a paid plan? Upgrade now`) · then the **hero media**: 1088×612 panel (radius 32, 1px border), a real product screenshot with a centered 80×80 play button. Floating announcement toast bottom-right (380×210). Why: name the feature, one sentence of what it does, install button, proof it is real.

`## 2. Social proof carousel (Slack only)` — ~600px · three quote cards in a 3-col grid with 1px left rules · logo 28px tall · quote 17/27 · attribution 12px · prev/next arrows + dots below. Chrome has none. Why: enterprise trust; optional for the template.

`## 3. Sibling / coming-soon banner (Slack only)` — 1312×204 white card (radius 32) · 20px icon · h3 25 serif + 17/27 body left · sand secondary button right (`Join the waitlist`). Why: a cross-link to a related surface.

`## 4. Sticky-scroll rows` — 2,313px (Slack, 3 rows) / 2,784px (Chrome, 3 rows) · `section_contain` with 128px spacers above and below · **2 cols: text 590px at x=64, media ~658px on the right** (the media column is sticky; it was blank in the crawl because the videos lazy-load, so media size is inferred: ~658×~500). Each row ≈ 630–645px tall: h3 25/38 serif (`Tag it in`, `Reach the web that has no API`) + body 17/27 (Chrome uses 20/32 for the first row). Why: the "how it works" narrative — three beats, media changes as you scroll.

`## 5. Tabbed use-case showcase` — 1,455px · bg white · 4–5 tab pills (h=40, radius 12, x=176) → media panel 1088×612 (radius 32, tinted background, dark "Prompt" card inset at top-left or right, 296px wide) → caption row inside 864px column: h3 25/38 left at x=288, body 15/24 right at x=736 (w≈400). Why: one concrete prompt per tab; the prompt card is the hero of the panel.

`## 6. Six-up grid` — 1,344px (Chrome) / 1,102px (Slack) · bg page · 3 cols × 2 rows, 373px columns with 1px left rules, no card background · 24px line icon → h3 19/23 serif → body 15/24 → optional secondary button `Learn more` (h=28, radius 8, 1px border) · rows ~360px, 64px row gap. Why: breadth — six things it can do, scannable.

`## 7. Connectors / integrations` (Slack) — 841px · 2 cols: illustration left, h2 32/35 serif + 20/32 body + `Read more` right. `## 7'. Safety` (Chrome) — 1,024px · centered h2 36 serif `What we built` · two-column definition list (h4 left 20 serif with check icon, body 17/27 right, 1px rule between rows) · side card carousel ("Guide", 216×256, radius 16) with related articles. Why: the trust section; content differs per feature but the definition-list layout is reusable.

`## 8. FAQ` (Chrome) — inside the 1,024px section · h3 questions 19 serif, `p` answers 17/27, accordion. Why: long-tail SEO; emits `Question` JSON-LD.

`## 9. Related articles carousel` — 3 cards (radius 16, 1px border) with a 12px label, 15px title, `Read more` button. Both pages. Why: support-doc links.

`## 10. Closing band` — 602px (Chrome) / 529px (Slack) · bg ink · centered h2 ~52 serif on light text + the same ink-on-light button as the hero (`Add to Chrome` / `Add to Slack` + `Join Teams waitlist`) · 12px legal note. Why: repeat the install CTA after the trust section.

`## Footer` — 1,029px, shared.

Shared numbers:
- **Type scale**: h1 72/79/500 serif · h2 52/62/500 serif (section intros) and 32–36 serif (subsection) · h3 25/38/500 serif (rows, captions) and 19/23/500 serif (grid) · h4 20 serif (definition list) · body 23/35 (hero subhead), 20/32 (row lead), 17/27 (row body, FAQ), 15/24 (grid, captions), 12/19 +0.12px tracking (notes) · button 15/400 sans.
- **Container + rhythm**: 1312px; text column in rows 590px; media 1088×612 (16:9) for hero and showcase; caption column 864px; 128px section spacers; row pitch ~640px. Radius 32 (media/banner), 16 (cards/toast), 12 (buttons/tabs), 8 (small buttons/tags). 1px borders at ~8% ink. Shadow only on floating toasts and the 80px play button.
- **Palette roles**: page bg warm off-white; white surface for the showcase section; ink for the closing band; muted text ~55% ink; accent terracotta only in the logo mark and the hero's tinted media backdrop (Slack: pale teal; showcase: terracotta/lavender tints); ink buttons; sand secondary buttons.
- **Mobile (390w)**: Chrome 14,686px, Slack 11,985px. Hero text stays centered, h1 drops to ~44px, buttons stack full-width, media panel goes to 358px wide at ~4:3 crop; sticky rows become stacked text-then-media; tab strips scroll horizontally; the six-up grid becomes one column with 1px top rules; safety definition list stacks label over body; the side "Guide" carousel moves below; closing band keeps height. Floating toast hidden.
- **Nav / footer**: shared chrome plus the 52px sub-nav strip (`Claude in Chrome · Explore here ▾`) used as breadcrumb + jump menu.

## 3. Kolumn version

Template order for every `/features/<slug>`: **Hero → How it works (3 rows) → Try it (tabbed prompts) → What it can do (six-up) → Plans (Free / Pro) → FAQ → Sibling banner → Closing band.** Drop social proof (no customers to quote), related-articles carousel (no help center yet), and the safety definition list as a standalone section (its layout is reused for Plans). Target ≈ 6,000px at 1440w.

Shared layout rules (both instances):
- Container `max-w-[1312px] px-16`, collapsing to the landing's `max-w-6xl px-6 sm:px-10` under 1280.
- Hero centered; h1 `font-heading font-[300] text-6xl tracking-tight leading-[1.08]` (source 72/79 → 60/65); subhead `text-[21px] leading-8 text-[var(--text-secondary)] max-w-[700px]`; eyebrow as a bordered tag (`InlineNotice`-style chip: mono 12px, 1px `--border-default`, radius 8, h=28) not plain text; ink `Button size="lg"`; availability note `font-mono text-[12px] text-[var(--text-muted)]` with an underlined link to `/pricing`.
- Hero media 1088×612, radius 12, 1px `--border-default`, bg `--surface-raised`; content is the real component rendered from mocked store data, not a screenshot.
- How-it-works rows: 2 cols, text 590px left, media 658×460 right (sticky on ≥1024). h3 `font-heading font-[425] text-2xl`, body `text-[17px] leading-7 text-[var(--text-secondary)]`. Row pitch 560px (source 640 minus the illustration slack).
- Tabbed prompts: `SegmentedControl`-style tabs (h=40, radius 8) → 1088×612 panel → 864px caption row split 50/50 (h3 24/32 left, body 15/24 right). The dark "Prompt" card inset in the source becomes a **live pill/chat composer frame** at real size (max-w-2xl, radius 20 — the one place a 20px radius is allowed, because it *is* the component).
- Six-up grid: 3×2, 1px `--border-subtle` left rules, Phosphor 24px `regular` icon, h3 `font-heading font-[425] text-lg`, body 15/24, no buttons.
- Plans: two-row definition list, 864px column: label (h4 `font-heading font-[425] text-xl` with `Check` icon) left 288px, body right; 1px `--border-subtle` rule between rows; ink `Button` under the Pro row.
- FAQ: reuse landing `FaqItem` (accordion), questions h3 `text-lg font-[425]`, answers 17/27.
- Sibling banner: 1312×160 card, radius 12, `--surface-card`, icon + h3 + body left, secondary `Button` right.
- Closing band: bg `--surface-sidebar` (ink in light theme), 320px, centered h2 `font-heading font-[425] text-4xl` on `--surface-page`-colored text, ink-on-light `Button`. No lime anywhere; lime survives only as the `Check` icon color in the Plans list (`--accent-lime-dark`, state color).
- **Proportions kept**: 1312 container, 1088×612 media, 590/658 row split, 864 caption column, 3×373 grid, 128px section gaps, 40px tabs. **Changed**: radius 32/16 → 12, 12 → 8; serif → Clash Grotesk; 72 → 60 h1; 23 → 21 subhead; drop 600px illustration pauses; closing band 602 → 320.
- **Mobile**: as source — hero text stays centered and stacks its buttons; media 358px at 4:3 crop; rows stack text over media (media not sticky); tab strip scrolls; grid single-column with 1px top rules; plans stack label over body; banner stacks with the button full-width.

---

### Instance A — `/features/pill`

**1. Hero**
- Tag: `The pill`
- h1: `Say what should happen. The board does it.`
- Subhead: `The pill sits at the bottom of every board. Type a task, a change, or a whole list in plain words and the AI creates, moves, updates, or completes the cards — on this board, and only this board.`
- CTA: ink `Button` `Create a free board` → `/signup` · availability note: `Free accounts get 20 AI messages a day. Every action on Pro. See pricing →` (link → `/pricing`).
- Media: the real `QuickAddBar` in its expanded state over a dimmed board, input reading `Move the login bug to In review, assign Sam, due Friday`, with three progress rows beneath in the exact `QuickAddBar` mono style: `✓ Moved "Login bug" → In review` · `✓ Assigned Sam` · `✓ Due date set: Fri 5 Sep`.

**2. How it works** (three rows)
1. h3 `Plain words in, cards out` — body `Open the pill, write what you need, press Enter. "Add a card for the onboarding email, high priority, due Thursday." The AI reads the board it is on — its columns, its cards, its members — and makes the change. You watch each step land in a checklist under the input.` — media: pill expanded with a sentence and its progress rows.
2. h3 `Lists skip the AI entirely` — body `Paste anything with commas or line breaks — "Fix header, Update pricing page, Email the printer" — and the pill splits it into cards on the spot. No model call, no wait, no message counted against your day. It only sends prose to the AI when the text reads like a sentence.` — media: a pasted five-line list becoming five cards in the first column.
3. h3 `Scoped to the board you are looking at` — body `The pill never reaches across boards. Every action is pinned to the board it opened on, so "move the design review" cannot land somewhere you did not mean. Anything destructive asks first, and there is an undo on the toast.` — media: the board name pinned above the pill; a confirm dialog for a delete.

**3. Try it** — tabs: `Create` · `Move` · `Update` · `Complete` · `Paste a list`
- Create — prompt card `Add three cards to Backlog: write release notes, record the demo, update the changelog` · caption h3 `Three cards, one sentence` · body `Each card gets a title and lands in the column you named. Priority, due date, and assignee are filled in when you mention them.`
- Move — prompt `Move everything marked "urgent" to In progress` · h3 `Batch moves` · body `The AI matches cards by what you said — title, label, priority — and moves them together. Pro.`
- Update — prompt `Give the checkout bug to Priya and make it high priority` · h3 `Edit without opening the card` · body `Assignee, priority, labels, due date, description. Say it and it is set. Pro.`
- Complete — prompt `Mark the three onboarding tasks done` · h3 `Close out a batch` · body `Completed cards keep their history and get the check. Pro.`
- Paste a list — prompt (multi-line) `Book venue\nSend invites\nOrder lanyards` · h3 `No AI, no wait` · body `Line breaks and commas split into cards instantly. Free on every plan and never counted as a message.`
- Tokens: prompt card = the real pill frame (`--surface-card`, radius 20, `--chat-input-shadow`), panel bg `--surface-raised`.

**4. What it can do** (six-up)
1. `Plus` **Create cards** — `Title, column, priority, due date, assignee, labels — whatever you mention, filled in.`
2. `ArrowsLeftRight` **Move cards** — `One card or a batch, matched by title, label, or priority. Pro.`
3. `PencilSimple` **Update fields** — `Change any field on any card without opening it. Pro.`
4. `CheckCircle` **Complete and duplicate** — `Close out work or clone a card as a starting point. Pro.`
5. `ListChecks` **Checklists** — `Tick items off a card's checklist by name. Pro.`
6. `Columns` **Columns and members** — `Add or remove columns, invite or remove members from the board. Pro.`

**5. Plans** (definition list)
- Free — `Create actions. Twenty AI messages a day. Pasted lists are unlimited and never count.`
- Pro — `Every write action: move, update, complete, duplicate, checklists, columns, members. $8 a month, seven-day trial.` · ink `Button` `Start Pro trial` → `/signup?plan=pro`.

**6. FAQ**
- *Does the pill work on every board?* — `Yes. It is mounted on every board you can open, including boards shared with you. It acts on that board only.`
- *What counts as a message?* — `Each time the pill sends text to the AI. Pasted lists split locally and do not count. Free accounts get 20 a day; Pro is uncapped.`
- *Can it delete things?* — `On Pro, yes — after a confirmation. Every delete puts an Undo on the toast.`
- *What if it gets a card wrong?* — `The progress list under the pill shows each step, and the AI's last line tells you what it did after seeing the results. Fix it by hand or type the correction.`
- *Is there a voice mode?* — `Not yet. The microphone button is a placeholder for a later release.`

**7. Sibling banner** — `ChatCircle` · h3 `Want answers instead of actions?` · body `Chat reads your boards and replies in words. It never edits a card.` · secondary `Button` `Explore chat →` → `/features/chat`.

**8. Closing band** — h2 `Open a board and start typing.` · `Button` `Create a free account` → `/signup`.

---

### Instance B — `/features/chat`

**1. Hero**
- Tag: `Chat`
- h1: `Ask your boards a question`
- Subhead: `Chat is the conversation side of Kolumn. It reads your boards and answers in words — what is overdue, what shipped this week, what is still waiting on someone. It never moves a card.`
- CTA: ink `Button` `Start free` → `/signup` · availability note: `Text answers on Free, 20 messages a day. Board-reading tools on Pro. See pricing →`.
- Media: the real `ChatPage` frame — a user bubble `What is overdue on the launch board?`, the assistant reply in markdown with a three-item list and a `CardRail` of the three cards it cited.

**2. How it works**
1. h3 `It already knows your boards` — body `Every message is answered with your boards, columns, cards, due dates, and members in context. Ask "what is overdue" and the answer names the cards. Ask "what did we finish this week" and it reads the activity, not a guess.` — media: chat reply next to a faded board showing the cards it named.
2. h3 `Read-only by design` — body `Chat has no write tools. Nothing you say here creates, moves, or deletes a card, so you can think out loud without side effects. When you are ready to act, the pill is one click away on the board.` — media: the chat composer with a subtle `read-only` mono badge, and the pill's board link.
3. h3 `Threads that stay` — body `Every conversation is saved to your account, named, and searchable. Star the ones you come back to. Cards mentioned in a reply show up in a rail on the right so you can open them without leaving the thread.` — media: `ChatListPage` with starred threads and the card rail.

**3. Try it** — tabs: `Status` · `Overdue` · `This week` · `Who has what` · `Summary`
- Status — prompt `Where are we on the website relaunch?` · h3 `A status line, not a spreadsheet` · body `Counts per column, what moved recently, and what is blocking — in a few sentences.`
- Overdue — prompt `What is overdue and who owns it?` · h3 `Overdue, by owner` · body `Cards past their due date, grouped by assignee, with the cards linked in the rail.`
- This week — prompt `What did the team finish this week?` · h3 `A week in review` · body `Completed cards from the last seven days, by board.`
- Who has what — prompt `What is Sam working on?` · h3 `One person's plate` · body `Open cards for one member across every board you share.`
- Summary — prompt `Summarize the Q3 planning board` · h3 `Board summaries` · body `On Pro, chat reads the whole board through a read tool and writes a short brief. On Free, it answers from the board snapshot in context.`

**4. What it can do** (six-up)
1. `Question` **Answer from your cards** — `Every reply is grounded in the boards you can see.`
2. `Clock` **Overdue and due today** — `Deadlines are in context on every message.`
3. `MagnifyingGlass` **Search cards** — `Find cards across boards by title, label, or assignee. Pro read tool.`
4. `ListBullets` **Summarize a board** — `A short brief of any board on request. Pro read tool.`
5. `Cards` **Card rail** — `Cards mentioned in a reply are listed beside it; click to open.`
6. `Star` **Saved threads** — `Rename, star, and return to any conversation.`

**5. Plans**
- Free — `Text answers from your board context. Twenty messages a day.`
- Pro — `Everything on Free plus read tools: search cards and summarize boards across your workspace. $8 a month, seven-day trial.` · ink `Button` `Start Pro trial` → `/signup?plan=pro`.

**6. FAQ**
- *Can chat create or move cards?* — `No. Chat is read-only on every plan. Use the pill on a board for actions.`
- *Which boards can it see?* — `The ones you can open: your own, boards shared with you, and boards in your workspaces. Nothing else.`
- *Are conversations saved?* — `Yes, to your account, with the same row-level security as your boards. Delete a thread and it is gone.`
- *Is my content used to train models?* — `No. See the security page.` (link → `/security`)
- *Does the daily limit include the pill?* — `Yes. Free accounts share 20 messages a day between chat and the pill.`

**7. Sibling banner** — `Sparkle` · h3 `Ready to change something?` · body `The pill on every board turns a sentence into cards, moves, and updates.` · secondary `Button` `Explore the pill →` → `/features/pill`.

**8. Closing band** — h2 `Ask the board. It answers.` · `Button` `Create a free account` → `/signup`.

## 4. Data and content sources
- **Copy**: `src/content/features.js` — the same `FEATURES` array the hub uses (`slug`, `title`, `tagline`, `hubHeading`, `hubBody`, `icon`, `mediaKey`), extended per entry with `page: { hero, rows[], tabs[], grid[], plans, faq[], sibling, closing }`. The `/features/:slug` route renders one `FeaturePage` component from that object; unknown slugs fall to `NotFoundPage`.
- **Plan facts**: `src/content/plans.js` (`FREE_DAILY_LIMIT` = mirror of `tier.ts`, `PRO_PRICE_MONTHLY` = mirror of `UpgradeProPage.jsx`, `PRO_TRIAL_DAYS` = 7). Copy above interpolates these; a Vitest asserts they equal the app sources. The "Pro" markers in the grid must derive from `PRO_ONLY_TOOLS` in `tier.ts` — export that list to a shared module or duplicate it into `plans.js` with a parity test.
- **Media**: `src/components/marketing/featureMedia.jsx` renders the real `QuickAddBar`, `ChatInput`, `ChatMessage`, `CardRail` components against a mocked store (`src/content/demoBoard.js`), reduced-motion aware via `useReducedMotion()`.
- **Structured data**: `BreadcrumbList` + `FAQPage` generated from `page.faq` at prerender. Canonical `https://kolumn.app/features/<slug>`.
- Nothing reads Supabase.

## 5. Open questions
- Does the Free daily limit apply per surface or shared across pill + chat? Code counts every `/chat` function call, so this spec says "shared" — confirm that is the intended message.
- The voice/microphone and "Add files" buttons in `QuickAddBar` are placeholders; the pill page FAQ says "not yet." Confirm we are comfortable naming them, or hide them in the marketing frame.
- `search_cards` / `summarize_board` are placeholder implementations (CLAUDE.md T3-#11). The chat page describes them as Pro read tools — this copy should not ship until they are real, or the "Summary" tab and grid items 3–4 need a "coming soon" tag.
- Free-tier phrasing: `tier.ts` allows `create_card` (and `create_note`, which has no UI) — "create actions" is used above; confirm we are not promising `create_board` from the pill (it is pill-disallowed).
- Sibling and hub slugs for the four non-AI pages are unconfirmed (see `features.md`).
