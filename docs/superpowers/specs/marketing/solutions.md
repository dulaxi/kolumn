# Solutions hub — marketing page spec (`/solutions`) + vertical copy blocks

> Source crawled: https://claude.com/solutions/small-business, https://claude.com/solutions/nonprofits,
> https://claude.com/solutions/education on 2026-09-02 (crawl harness `out/sol-*`). **claude.com has no
> `/solutions` hub page** — the URL redirects to claude.ai and 403s; the "hub" is the nav mega-menu
> (groups: Use cases · Company size · Departments · Industries, ~20 leaves). The hub layout below is
> therefore built from the card grid measured on the education page (§7 of `solution-page.md`) and
> the mega-menu grouping, not from a crawled hub.
> Kolumn route: `/solutions` · Priority: P2 · Template family: hub
> Per-page template: `solution-page.md`. This file adds the hub and the copy for all 8 verticals.

## 1. Purpose and SEO target
- **Job of this page**: let a visitor find "the page for teams like mine" in one glance, and show
  that every vertical is the same product with a different example board.
- **Primary query intent**: `kanban board for teams` / `kolumn solutions`. Secondary: `kanban for
  small teams`, `ai kanban use cases`, `project board examples`, `kanban templates by industry`.
- **`<title>`**: `Kolumn for every kind of team` (30) · **meta description**: `One AI kanban, eight
  example boards. Startups, small business, nonprofits, students, legal, healthcare, support and
  engineering teams.` (141) · OG same.
- **Structured data**: `BreadcrumbList` (Home › Solutions) and `ItemList` of the 8 solution URLs.
  No `FAQPage` (the hub has no FAQ).
- **Internal links in**: landing nav/footer "Solutions" (chrome spec), every solution page's breadcrumb
  + "Also for" row. **Out**: the 8 `/solutions/<slug>` pages, `/onboarding`, `/pricing`, `/`.

## 2. Source page anatomy (what Anthropic does)
Because no hub exists, the two source elements the hub borrows are:

`## A. Mega-menu grouping` — the nav "Solutions" panel lists leaves under four labelled groups; each
leaf is a plain 15px link, no icons, no descriptions. *Why:* a flat tree the reader scans by group.

`## B. Card grid (education §7)` — 3 × 2 grid across the 1,312 container, cards 437 × ≈340, 1px
vertical hairlines between cards (no outer border, no radius, no fill), row gap 64; each card: 32px
padding, icon 24, ≈72px gap, h3 19/23 serif 500, body 15/24 muted, "Learn more" secondary button
30px tall radius 6. Title-first cards with a small icon and one paragraph. *Why:* the same
"pick your door" job a hub does.

`## C. Hero (two-column, §1)` and `## D. CTA band (§10)` as measured in `solution-page.md`.

Type scale, container, palette, mobile: identical to `solution-page.md` §2.

## 3. Kolumn version

Container `max-w-6xl px-6 sm:px-10`, `landing-font`, `py-20` sections, tokens only.

### 0. Breadcrumb bar — **keep**: `Solutions` only, no dropdown (this is the top of the tree).

### 1. Hero — **adapt** (single column, no illustration)
- Eyebrow `Solutions` (mono 12 uppercase muted).
- h1: **One kanban. Eight ways to use it.** — `font-heading font-normal text-5xl sm:text-6xl tracking-tight leading-[1.08] max-w-[40rem]`.
- Subhead: **Kolumn doesn't change by industry — the board does. Pick the team that looks like yours
  and start from a board built for its work.** — `text-xl leading-8 text-[var(--text-secondary)] max-w-[44rem]`.
- CTAs: `Button primary lg` **Start free** → `/onboarding`; `Button secondary lg` **See pricing** → `/pricing`.
- Height ≈ 420.

### 2. Tile grid — **adapt** the education card grid
- Two labelled groups, each an h2 `font-heading font-[425] text-3xl tracking-tight` with a mono
  12px group caption above it:
  - `BY TEAM` → **Teams** — Startups · Small business · Nonprofits · Students & educators
  - `BY WORK` → **Work** — Legal · Healthcare · Customer support · Engineering
- Each group is a **4-column** grid (`grid md:grid-cols-2 lg:grid-cols-4`), `divide-x divide-[var(--border-subtle)]`
  on lg, `border-t border-b border-[var(--border-subtle)]`, no radius, no fill (matches the source's
  divider-only grid). Tile: `p-8`, min-h 288; Phosphor icon 24 `text-[var(--text-secondary)]`; 40px gap
  (source 72, trimmed); h3 `font-heading font-[425] text-xl`; body `text-[15px] leading-6 text-[var(--text-secondary)]`
  (the tile's `blurb`, ≤110 chars); bottom: `Button variant="ghost" size="sm"` **See the board →**
  linking to `/solutions/<slug>`. Whole tile is the link (`asChild`), button is decorative focus target.
- Tile width at 1,152 container = 288, the same content width as the source's 292px card columns.
- Mobile: 2 columns at md, 1 column at sm with `divide-y` instead of `divide-x`.
- Content: `SOLUTIONS` registry (`name`, `icon`, `blurb`, `slug`, `group`).

### 3. "Every board, same pieces" — **new** (replaces the source's product-family grid)
- h2 **What every board comes with**. Six items in a `grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10`,
  each: Phosphor icon 20 + h3 `font-sans text-base font-semibold` + body 15/24 secondary. Final copy:
  - `Lightning` **The pill** — Type what you want on any board. The AI creates, moves, updates and
    completes cards. Lists split into cards instantly, no AI needed.
  - `ChatsCircle` **Chat** — Ask questions about your boards and get summaries. It reads; it doesn't edit.
  - `CubeFocus` **Workspaces** — Team containers with members and invitations. Personal boards can be
    shared one at a time.
  - `ArrowsClockwise` **Realtime** — Every member sees the same board. Moves land on everyone's screen as they happen.
  - `Copy` **Templates** — Board and card templates, plus a getting-started board on your first sign-in.
  - `LockKey` **Members-only access** — Row-level security on every table, export and account deletion
    in Settings, and we don't train on your content.
- Icon choices extend the existing Phosphor vocabulary; `CubeFocus` is reused from the workspace
  selector so "workspace" looks the same everywhere.

### 4. CTA band — **keep** (same component as the solution page)
- h2 **Not on the list? Start with a blank board.** · `Button secondary lg` **See pricing** →
  `/pricing` · `Button primary lg` **Start free** → `/onboarding`.

### Dropped from the source family
Proof strip, doodle openers, tabbed demo, connectors, pricing pair, FAQ — the hub is a directory,
≈2,000px tall at 1440w.

## 4. Data and content sources
- `src/content/solutions/index.js`:
  ```js
  import startups from './startups' // … ×8
  export const SOLUTIONS = [startups, smallBusiness, nonprofits, students, legal, healthcare, customerSupport, engineering]
  export const GROUPS = [
    { id: 'team', caption: 'BY TEAM', title: 'Teams', slugs: ['startups', 'small-business', 'nonprofits', 'students'] },
    { id: 'work', caption: 'BY WORK', title: 'Work',  slugs: ['legal', 'healthcare', 'customer-support', 'engineering'] },
  ]
  export const PIECES = [ /* the six "same pieces" items above */ ]
  ```
- Each vertical module (`src/content/solutions/<slug>.js`) carries the schema in `solution-page.md`
  §4 plus `blurb` (hub tile line). The copy blocks below are the source of truth for those files.
- Prerendered to `/solutions/index.html`; the build's route list is `['/solutions', ...SOLUTIONS.map(s => `/solutions/${s.slug}`)]`.
- Sync points: tier strings in PIECES/FAQ come from the shared tier constants, not literals.

## 5. Open questions
1. Group labels: "Teams / Work" vs "By size / By field" — the four "work" verticals mix departments
   (support, engineering) and industries (legal, healthcare); is a third group worth the noise?
2. Should the hub show a fifth tile per group linking to a blank "Start from scratch" board, or is the
   CTA band enough?
3. Ordering: alphabetical, or by expected traffic (startups/engineering first)?
4. Does the hub need its own OG image, or reuse the shared solutions image?

---

# Vertical copy blocks

Final-draft copy for the 8 `src/content/solutions/<slug>.js` files. Voice: short declaratives, sentence
case, no exclamation marks. Only shipped features are claimed (pill, chat, workspaces + sharing,
realtime, templates, search, RLS/export/delete, no-training). "Paste" always means pasting text into
the pill or chat — never an integration. `Pro` annotations follow `solution-page.md` §3.5.

Shared FAQ pool (4 items) is in `solution-page.md` §3.8; each vertical adds the one extra item listed.
Every board uses the DB card shape; `due` values are relative sentinels resolved at render
(`'fri'`, `'+3d'`, …) like `resolveDueDate` in `seedOnboardingBoard.js`.

## startups — `Rocket`
- **blurb**: The roadmap, the launch and this week's fires on one board that re-plans in a sentence.
- **seo.title**: Kolumn for startups — an AI kanban for launches (49)
- **seo.description**: Paste standup notes or a Slack thread and get cards with owners and dates. A
  kanban that keeps up with the pivot. Free to start; Pro is $8/month.
- **hero.h1**: A board that keeps up with the pivot
- **hero.subhead**: Plans change weekly. Kolumn turns whatever you already have — a founder's notes, a
  chat thread, a call transcript — into cards on a board the whole team can see. The AI does the sorting.
- **pains**
  1. `Files` **The roadmap lives in five places** — A doc, a spreadsheet, two chat channels and
     someone's head. None of them agree on what ships this week.
  2. `Gear` **Nobody wants to be the tool admin** — Custom fields, workflow rules, a setup call.
     Ten-person teams don't have a person for that.
  3. `ClockCounterClockwise` **Priorities move faster than the board** — By the time the board is
     updated it describes last Tuesday. So people stop looking at it.
- **helpIntro**: Three things a founding team does every week, done from the pill.
- **helps**
  1. tab **Capture** · `Notepad` · pill · prompt: *"turn these standup notes into cards — anything
     with a date goes to This week, the rest to Backlog"* · title **Paste, don't transcribe** ·
     body: Drop meeting notes into the pill. Titles, priorities and due dates land on cards without
     anyone retyping them. A comma-separated list becomes cards instantly, no AI round-trip.
     · result: 3 cards (`Pricing page copy` due fri · `Stripe webhook retries` high · `Investor update draft`).
  2. tab **Re-plan** · `ArrowsLeftRight` · pill · prompt: *"move everything labeled onboarding to
     next sprint and mark the pricing spike high priority"* · title **Re-plan in a sentence** ·
     body: When the plan changes, say so. Batch moves and priority changes happen in one line
     instead of twenty drags. `Pro`.
  3. tab **Ask** · `ChatsCircle` · chat · prompt: *"what's blocking the launch board this week?"* ·
     title **Ask the board what's going on** · body: Chat reads your boards and answers in plain
     text: what's due, what's overdue, what moved. Summaries for the investor update without a
     status meeting.
- **board** — name **Launch — v1** · columns: **Backlog · This week · In review · Shipped**
  - `Browser` **Pricing page copy** — This week · label `marketing` · due fri
  - `Lightning` **Stripe webhook retries** — This week · priority high · assignee Priya
  - `FileText` **Investor update draft** — Backlog · priority medium
  - `Envelope` **Onboarding email sequence** — In review · checklist 3/5
- **faq extra**: **Can the whole team use it free?** — Yes. Free has no seat limit; the 20 AI
  messages a day are per person. Pro is per person too, so upgrade the people who drive the board.
- **cta.heading**: Ship the next thing from one board.

## small-business — `Storefront`
- **blurb**: Orders, suppliers and the website fix you keep forgetting, on a board that fills itself in.
- **seo.title**: Kolumn for small business — a to-do board that runs itself (57)
- **seo.description**: Type what's on your mind and get cards with dates and owners. A kanban for
  shops, studios and services, with no setup. Free to start; Pro is $8/month.
- **hero.h1**: Run the week from one board
- **hero.subhead**: Orders, suppliers, payroll, the booking form that's still broken. Kolumn is a kanban
  that fills itself in: type what's on your mind and the AI turns it into cards with dates and owners.
- **pains**
  1. `Note` **Everything is a sticky note** — The counter, the phone, a group chat. Things get done
     because someone remembered, not because anything tracked them.
  2. `Buildings` **The software was built for enterprises** — Permissions, fields, a training video.
     You need a list your team will actually open.
  3. `DeviceMobile` **The team isn't at a desk** — People on the floor need to glance at what's next,
     not log into a system.
- **helpIntro**: The pill does the typing you don't have time for.
- **helps**
  1. tab **List** · `ListBullets` · pill · prompt: *"reorder oat milk, call the sign guy, fix the
     booking form, spring window display"* · title **Type the list, get the board** · body: Commas
     and new lines split into cards instantly, without waiting on the AI. Say more and the AI adds
     dates, owners and priorities.
     · result: 4 cards, all in To do.
  2. tab **Assign** · `UserCircle` · pill · prompt: *"give the Friday deliveries to Sam, due Thursday,
     and mark payroll high"* · title **Assign and date in plain words** · body: No dropdowns. Name
     the person and the day; the cards update. `Pro`.
  3. tab **Share** · `UsersThree` · — · title **Share only what each person needs** · body: Personal
     boards stay yours until you share them. Share a single board with the two people who run
     Saturdays; keep the accounts board to yourself. Everyone sees changes as they happen.
- **board** — name **Week of the 14th** · columns: **To do · Doing · Waiting on · Done**
  - `Package` **Reorder oat milk** — Waiting on · label `supplier`
  - `Globe` **Fix the online booking form** — Doing · priority high
  - `CurrencyDollar` **Payroll — Friday** — To do · due fri · priority high
  - `Storefront` **Spring window display** — To do · checklist 0/3 · assignee Sam
- **faq extra**: **We're three people. Is Pro worth it?** — Only if you want the AI to move and
  update cards for you. Free already creates cards from anything you type, and sharing is free.
- **cta.heading**: Put the week on a board tonight.

## nonprofits — `HandHeart`
- **blurb**: Grant deadlines, volunteers and board reports on one board a small team can keep up with.
- **seo.title**: Kolumn for nonprofits — a kanban for grants and programs (56)
- **seo.description**: Paste a funder's timeline and get cards with due dates. One workspace per
  program, boards volunteers can read in a minute. Free to start; Pro is $8/month.
- **hero.h1**: More time on the mission, less on the tracker
- **hero.subhead**: Grant cycles, volunteer shifts, the report for the board meeting. Kolumn keeps them
  on one board, and the AI handles the updating so a small team stays on top of a lot.
- **pains**
  1. `EnvelopeOpen` **Deadlines hide in email** — The LOI date is in a funder's PDF, the report date
     in a thread from March. Nothing surfaces them until the week they're due.
  2. `UsersThree` **Volunteers come and go** — Every new person has to learn the tool. If the tool
     takes a training session, they don't.
  3. `ChartBar` **Reporting eats the week before the board meeting** — Someone rebuilds the status of
     every program by hand, every quarter.
- **helpIntro**: The pill and chat, doing the admin a program manager does after hours.
- **helps**
  1. tab **Grants** · `CalendarBlank` · pill · prompt: *"paste: LOI due March 3, full proposal April
     14, site visit in May, report due Sept 30 — make cards with those dates"* · title **A grant
     calendar as cards** · body: Paste the funder's timeline. Each milestone becomes a card with its
     due date, and overdue cards show up in notifications before they're late.
     · result: 4 cards with due dates in Writing / Submitted.
  2. tab **Programs** · `CubeFocus` · — · title **One workspace per program** · body: Workspaces are
     team containers with members and invitations. Youth program volunteers see the youth board;
     the finance board is members-only. Everyone sees the same board in realtime.
  3. tab **Report** · `ChatsCircle` · chat · prompt: *"summarise the spring grant cycle board for
     the board meeting"* · title **Ask for the status, get the summary** · body: Chat reads the board
     and writes the paragraph. Paste it into the board packet and move on.
- **board** — name **Spring grant cycle** · columns: **Prospecting · Writing · Submitted · Awarded**
  - `FileText` **Community foundation LOI** — Writing · due `+5d` · priority high
  - `Calculator` **Youth program budget narrative** — Writing · checklist 2/4
  - `ChartBar` **Impact numbers from Q4** — Prospecting · label `reporting`
  - `Heart` **Thank-you letters to donors** — Submitted · assignee Dana
- **faq extra**: **Is there a nonprofit discount?** — Not yet. Free covers most volunteer boards;
  Pro is $8 per person per month for the people who run the pill.
- **cta.heading**: Start the next grant cycle on a board.

## students — `GraduationCap` (Students & educators)
- **blurb**: Paste the syllabus, get the semester as cards. Share a board with your group; free to start.
- **seo.title**: Kolumn for students and educators — a free kanban (52)
- **seo.description**: Paste a syllabus and get every assignment as a card with its due date. Share a
  board with your group; educators can template a board per course. Free to start.
- **hero.h1**: Assignments, group projects, one board
- **hero.subhead**: Kolumn is free to start and takes a minute to learn. Paste the syllabus and the
  semester becomes cards. Share a board with your group and watch it update while they work.
- **pains**
  1. `FilePdf` **The syllabus is a PDF and the deadlines are in your head** — Every course has its
     own schedule in its own format. Nobody merges them until midterms.
  2. `Users` **Group projects with no owner** — Four people, one doc, and a chat where "who's doing
     the intro?" gets asked three times.
  3. `Buildings` **Project tools designed for offices** — Sprints, story points, a billing page.
     Students need a list with dates.
- **helpIntro**: For students, for group work, and for the person running the course.
- **helps**
  1. tab **Syllabus** · `Notepad` · pill · prompt: *"paste the schedule section — make a card per
     assignment with its due date"* · title **Syllabus in, semester out** · body: Paste the schedule
     into the pill. Each reading response, lab and exam becomes a card with its date. Do it for every
     course; search (⌘K) finds anything.
     · result: 3 cards with due dates in Upcoming.
  2. tab **Group** · `UsersThree` · pill · prompt: *"split the lit review into four cards, one per
     source, and assign them round-robin"* · title **Split the work in one line** · body: Share the
     board with the group, then divide the work by sentence. Everyone sees their card; nobody asks
     who has the intro. `Pro`.
  3. tab **Course** · `Copy` · — · title **For educators: a template per course** · body: Build the
     course board once, save it as a template, and duplicate it for each section. Students share
     boards per group; you keep the master.
- **board** — name **PSYC 201 — Fall** · columns: **Upcoming · This week · Submitted · Graded**
  - `BookOpen` **Reading response 3 — ch. 5** — This week · due thu
  - `Presentation` **Group presentation slides** — This week · checklist 1/4 · assignee Maya
  - `Brain` **Midterm study plan** — Upcoming · priority medium
  - `Flask` **Lab report — data section** — Submitted · label `lab`
- **faq extra**: **Is there a student plan?** — Free is the student plan: boards, sharing and
  20 AI messages a day. Pro is $8/month if you want the AI to move and assign cards for you.
- **cta.heading**: Put the semester on a board before week two.

## legal — `Scales`
- **blurb**: Matters on a board, not in a mailbox. Deadlines, drafts and client follow-ups, members-only.
- **seo.title**: Kolumn for legal teams — a kanban for matters (46)
- **seo.description**: Paste a client email and get cards with deadlines. One members-only board per
  matter, row-level security, export any time. Free to start; Pro is $8/month.
- **hero.h1**: Matters on a board, not in a mailbox
- **hero.subhead**: Deadlines, drafts and client follow-ups on one kanban. Kolumn's AI turns an email
  thread or a call note into cards, and every board is readable only by its members.
- **pains**
  1. `Warning` **Deadlines are non-negotiable, trackers are optional** — The response window is in a
     letter; the reminder is in someone's calendar. One of them is wrong.
  2. `Briefcase` **Practice software is heavy, the to-do list is light** — The matter system holds
     documents. The actual next steps live in a notebook.
  3. `ShareNetwork` **Sharing means another portal** — Clients and co-counsel need to see progress,
     not learn a system.
- **helpIntro**: Intake, tracking and the status call, from one board per matter.
- **helps**
  1. tab **Intake** · `EnvelopeOpen` · pill · prompt: *"paste this client email — make cards for
     each request and add the 21-day response deadline"* · title **Intake by pasting** · body: A
     client's email becomes cards. Dates in the text become due dates; the rest becomes a checklist.
     · result: 3 cards in Intake, one with due `+21d` and priority high.
  2. tab **Matters** · `LockKey` · — · title **One board per matter, members-only** · body: Boards
     are visible to their members and no one else, enforced by row-level security in the database.
     Share a matter board with a client; keep the firm board internal. Export a board's data from
     Settings whenever you need a copy.
  3. tab **Status** · `ChatsCircle` · chat · prompt: *"what's due this week across all my matter
     boards?"* · title **Ask before the status call** · body: Chat reads every board you're a member
     of and answers in text. No spreadsheet of spreadsheets.
- **board** — name **Hartley — lease dispute** · columns: **Intake · Drafting · Client review · Filed**
  - `FileText` **Demand letter draft** — Drafting · priority high · assignee Ines
  - `Paperclip` **Collect lease amendments from client** — Client review · checklist 1/3
  - `Timer` **Response deadline — 21 days** — Intake · due `+21d` · priority high
  - `Phone` **Settlement call prep** — Intake · label `client`
- **faq extra**: **Where is the data stored and who can read it?** — In Postgres on Supabase, behind
  row-level security on every table; only board members can read a board. We don't train on your
  content. Export and account deletion are in Settings. (Compliance certifications: see open question 2
  in `solution-page.md`.)
- **cta.heading**: Open the next matter on a board.

## healthcare — `FirstAid`
- **blurb**: Credentialing, equipment, onboarding and audit prep on a board the whole practice can see.
- **seo.title**: Kolumn for healthcare teams — a kanban for clinic ops (54)
- **seo.description**: Operational work for clinics and practices on one realtime board: checklists on
  cards, templates for recurring audits, members-only access. Free to start; Pro is $8/month.
- **hero.h1**: Clinic operations, one board at a time
- **hero.subhead**: Credentialing, equipment service, staff onboarding, the audit prep nobody volunteered
  for. Kolumn keeps operational work on a kanban the whole team can see, and the AI keeps it current.
  Clinical records stay in your clinical system.
- **pains**
  1. `Stack` **Operational work falls between systems** — The EHR holds patients. Practice management
     holds billing. The autoclave service visit is on a whiteboard.
  2. `ChatCircleDots` **Every handoff is a message** — Shift changes pass work along by text. What
     wasn't mentioned wasn't done.
  3. `UserPlus` **New staff need the board on day one** — Onboarding a locum to a heavy tool takes
     longer than their contract.
- **helpIntro**: Recurring, checklist-shaped work is what a kanban is for.
- **helps**
  1. tab **Checklists** · `CheckSquare` · pill · prompt: *"add a card for the new locum's
     credentialing packet with a checklist: licence copy, DEA, malpractice certificate, references"* ·
     title **Checklists that live on the card** · body: Say the steps; they become a checklist on the
     card. Progress shows on the board without opening anything.
     · result: 1 card with checklist 0/4 in Requests.
  2. tab **Shifts** · `ArrowsClockwise` · — · title **Realtime for shift changes** · body: A card
     moved at 7am is moved on everyone's screen at 7am. The handoff is the board, not a text.
  3. tab **Audits** · `Copy` · — · title **Templates for recurring work** · body: Save the monthly
     audit board as a template. Duplicate it on the first of the month; assign in the pill. `Pro` for
     bulk assignment.
- **board** — name **Practice ops — March** · columns: **Requests · In progress · Blocked · Done**
  - `IdentificationCard` **Credentialing packet — new locum** — In progress · checklist 2/4 · assignee Rosa
  - `Wrench` **Autoclave service visit** — Blocked · label `equipment` · due `+3d`
  - `UserPlus` **Front-desk onboarding checklist** — Requests · checklist 0/6
  - `Thermometer` **Vaccine fridge log audit** — Requests · priority high · due fri
- **faq extra**: **Can we put patient information on cards?** — Kolumn is for operational work, not
  clinical records. Keep patient data in your clinical system. (If a BAA answer exists, replace this
  line — open question 2 in `solution-page.md`.)
- **cta.heading**: Give the practice one board for the month.

## customer-support — `Headset`
- **blurb**: Escalations, bug handoffs and macro rewrites — everything the ticket queue isn't for.
- **seo.title**: Kolumn for customer support — a kanban for escalations (55)
- **seo.description**: Paste a customer thread and get a card with a summary and priority. Track
  escalations and engineering handoffs on one board. Free to start; Pro is $8/month.
- **hero.h1**: Escalations that don't get lost
- **hero.subhead**: The ticket queue is for tickets. Kolumn is for everything around it: escalations,
  bug reports headed to engineering, the macros that need a rewrite. Paste a thread, get a card.
- **pains**
  1. `Ticket` **The helpdesk isn't a project tool** — A ticket is closed or it isn't. The follow-up
     work behind it has nowhere to live.
  2. `GitBranch` **Engineering handoffs vanish** — The bug goes into a channel, gets a thumbs-up, and
     nobody can say a week later whether it shipped.
  3. `ListMagnifyingGlass` **The weekly review is a scroll through chat** — Someone reconstructs
     the week from messages to write three bullet points.
- **helpIntro**: A board between the queue and the codebase.
- **helps**
  1. tab **Escalate** · `Notepad` · pill · prompt: *"paste this thread — make a card, summarise the
     issue in the description, priority high, label billing"* · title **Paste the thread, get the
     card** · body: A customer conversation becomes a card with a summary and priority. The thread
     stays where it was; the work is now visible.
     · result: 1 card in New, priority high, label `billing`.
  2. tab **Batch** · `ArrowsLeftRight` · pill · prompt: *"move everything labeled billing that's
     older than a week to With engineering and mark it high"* · title **Batch by sentence** ·
     body: Triage in one line instead of one drag per card. `Pro`.
  3. tab **Review** · `ChatsCircle` · chat · prompt: *"summarise what moved to Resolved on the
     escalations board this week"* · title **Chat for the weekly review** · body: Ask; paste the
     answer into the update. Chat reads the board, it doesn't edit it.
- **board** — name **Escalations** · columns: **New · Investigating · With engineering · Resolved**
  - `Export` **Export fails for large workspaces** — With engineering · priority high · label `bug`
  - `TextAa` **Refund policy macro rewrite** — Investigating · assignee Jo · checklist 1/2
  - `Browser` **Login loop on Safari — 3 reports** — New · priority high
  - `Handshake` **Enterprise trial follow-up** — Investigating · due `+2d` · label `sales`
- **faq extra**: **Does it connect to our helpdesk?** — No. There are no live integrations; you paste
  the thread. That's deliberate for now: nothing syncs somewhere you didn't intend.
- **cta.heading**: Give escalations a board of their own.

## engineering — `Code`
- **blurb**: A kanban you won't have to configure. Standups and PR threads become cards; bulk moves in a sentence.
- **seo.title**: Kolumn for engineering teams — a kanban, no config (52)
- **seo.description**: No workflows to design, no fields to enforce. Paste a standup or a PR discussion
  and the cards are there; move them in a sentence. Free to start; Pro is $8/month.
- **hero.h1**: A kanban you won't have to configure
- **hero.subhead**: No workflows to design, no fields to enforce, no admin. Kolumn is a plain board with
  an AI that files the work: paste a standup or a PR discussion and the cards are there.
- **pains**
  1. `SlidersHorizontal` **The tracker became the work** — Custom states, required fields, a
     grooming ritual to keep the tool happy. The tool was supposed to keep you happy.
  2. `Microphone` **Standup notes never reach the board** — Everyone says what they're doing. The
     board says what they were doing last week.
  3. `Columns` **Product and engineering keep two boards** — Same work, two sources of truth, one
     weekly reconciliation meeting.
- **helpIntro**: Capture, re-plan, and find things — from the keyboard.
- **helps**
  1. tab **Standup** · `Notepad` · pill · prompt: *"paste standup: Priya — rate limit the export
     endpoint; Sam — flaky realtime reconnect test; Lee — on-call runbook. Make cards, assign them"* ·
     title **Standup to cards** · body: Paste the notes. Cards with owners appear on the sprint board;
     nobody transcribes. Comma lists split instantly with no AI call.
     · result: 3 cards in In progress with assignees.
  2. tab **Re-plan** · `ArrowsLeftRight` · pill · prompt: *"move everything assigned to Sam to Priya
     and mark the auth bug high"* · title **Bulk moves in plain language** · body: Reassign, reprioritise
     and move in one line. The board updates for everyone in realtime. `Pro`.
  3. tab **Find** · `MagnifyingGlass` · chat · prompt: *"what's still in code review older than three
     days?"* · title **Search and ask** · body: ⌘K finds any card by title. Chat answers questions
     across boards: what's stale, what's blocked, what shipped. Read-only, by design.
- **board** — name **Sprint 14** · columns: **Backlog · In progress · Code review · Done**
  - `Gauge` **Rate-limit the export endpoint** — In progress · priority high · assignee Priya
  - `Bug` **Flaky test: realtime reconnect** — Code review · label `flaky` · due `+3d`
  - `Cloud` **Migrate avatar uploads to new bucket** — Backlog · checklist 0/3
  - `BookOpen` **Write runbook for on-call** — In progress · assignee Lee
- **faq extra**: **Is there an API or a Git integration?** — Not yet. Cards come from what you paste
  or type; there's no public API and no repository sync. If that changes it'll be on the pricing page
  before it's on this one.
- **cta.heading**: Run the next sprint from a board you didn't configure.
