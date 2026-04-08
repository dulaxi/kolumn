# Slack Thread Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second dual-panel showcase section to the landing page (`SlackThreadDemo`) that animates a Slack thread on the left becoming extracted kanban cards on the right, reusing the existing `AI_CARDS` data and `AICard` component. Replace the Tools Strip section with it.

**Architecture:** New component lives inline in `src/pages/LandingPage.jsx` alongside the existing `EveryDetailDemo`. Has its own independent timeline (`SLACK_*` constants) and compute helper functions that drive per-message opacity/translate animations on the left and re-use the existing `AICard` sweep animation on the right. The right panel reads from the same `AI_CARDS` array used by the existing demo — "different inputs, same outputs" narrative continuity.

**Tech Stack:** React 19, Vite 7, Tailwind CSS v4, lucide-react, @phosphor-icons/react. No test suite — verification is `npm run build` + manual visual check via dev server HMR.

**Spec reference:** `docs/superpowers/specs/2026-04-08-slack-thread-demo-design.md` (committed as `f12ef2a`).

**Verification pattern (adapted from TDD for a no-test-suite project):**

Each task has a verification step that either runs `npm run build` for syntax/import correctness or visually checks the dev server for rendered output. The dev server should be running in the background at http://localhost:5173/ throughout implementation; if not, start it with `npm run dev` before Task 1.

---

## File structure

Only one file is modified: `src/pages/LandingPage.jsx`. No new files. Edits are grouped into six logical regions:

| Region | Line area (pre-implementation) | What changes |
|---|---|---|
| Imports | 4-11 | Add 3 Lucide icons |
| Data constants | 179, ~437 | Delete `tools` array; add `SLACK_MESSAGES` after `AI_CARDS` |
| Timeline constants | ~456 (after `TIMELINE_TOTAL`) | Add `SLACK_*` phase constants |
| Compute helpers | ~482 (after `computeCardState`) | Add 3 `computeSlack*` helpers |
| Component definitions | ~714 (after `EveryDetailDemo`) | Add `SlackThread`, `SlackExtractedCards`, `SlackThreadDemo` |
| JSX (Tools Strip) | 1205-1238 | Replace with Slack Thread Showcase section |

---

## Task 1: Add Lucide icon imports

**Files:**
- Modify: `src/pages/LandingPage.jsx:4-10`

**Context:** The new section's feature bullets use four Lucide icons: `AtSign`, `Clock`, `AlertCircle`, `Hash`. `Clock` is already imported (line 6). The other three need to be added to the existing lucide-react import block.

- [ ] **Step 1: Read the current imports block**

Run: Read `src/pages/LandingPage.jsx` lines 4-11 to confirm the current state before editing.

Expected shape:

```jsx
import {
  ArrowRight, Columns3, Users, Zap, Calendar, StickyNote,
  Share2, BarChart3, GripVertical, Tag, CheckSquare, Clock,
  Shield, Sparkles, MousePointerClick, ArrowUpRight,
  Check, Square, AlignLeft, User, Plus, FileText, CheckCircle2,
  LayoutDashboard, Settings, ChevronsRight, SquareKanban, Kanban as LucideKanban,
} from 'lucide-react'
```

- [ ] **Step 2: Add AtSign, AlertCircle, Hash to the imports**

Edit the imports to add the three new icons at a natural position in the existing list (keeping alphabetical-ish order is fine). Final state:

```jsx
import {
  ArrowRight, Columns3, Users, Zap, Calendar, StickyNote,
  Share2, BarChart3, GripVertical, Tag, CheckSquare, Clock,
  Shield, Sparkles, MousePointerClick, ArrowUpRight,
  Check, Square, AlignLeft, User, Plus, FileText, CheckCircle2,
  LayoutDashboard, Settings, ChevronsRight, SquareKanban, Kanban as LucideKanban,
  AtSign, AlertCircle, Hash,
} from 'lucide-react'
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Exit code 0, no errors about unknown imports.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LandingPage.jsx
git commit -m "$(cat <<'EOF'
feat(landing): import AtSign, AlertCircle, Hash icons for new demo

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `SLACK_MESSAGES` data constant

**Files:**
- Modify: `src/pages/LandingPage.jsx` — insert after the `AI_CARDS` array closing bracket (~line 437)

**Context:** The three Slack messages are defined as a constant array so they can be rendered by the `SlackThread` component and so the content is easy to tweak without touching component logic. Each message has `sender`, `avatar`, `timestamp`, `text`, and `mentions` (an array of the @-mentions in the text, used for highlighting).

Message content is reverse-engineered from `AI_CARDS` — see spec §2 for the mapping rationale.

- [ ] **Step 1: Locate the insertion point**

Find the closing `]` of the `AI_CARDS` array (approximately line 437). The new constant goes immediately after.

- [ ] **Step 2: Add the `SLACK_MESSAGES` constant**

Insert the following immediately after the `AI_CARDS` closing bracket:

```jsx
// Slack thread demo — messages reverse-engineered from AI_CARDS above
// so each message's extractable signals map to AI_CARDS[i]'s fields.
const SLACK_MESSAGES = [
  {
    sender: 'Priya',
    avatar: 'P',
    timestamp: '2:14 PM',
    text: '@aisha hero section feels plain — sarah flagged it on the call, can you redo it? high prio',
    mentions: ['@aisha'],
  },
  {
    sender: 'Priya',
    avatar: 'P',
    timestamp: '2:15 PM',
    text: "also pricing page needs building — 3 tiers with monthly/annual toggle, founder's call",
    mentions: [],
  },
  {
    sender: 'Priya',
    avatar: 'P',
    timestamp: '2:16 PM',
    text: '@marcus stripe integration by fri — checkout, webhooks, customer portal. high prio, legal flagged it',
    mentions: ['@marcus'],
  },
]
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Exit code 0. No errors — the constant is unused at this point, which is fine (Vite's prod build tolerates unused const declarations).

- [ ] **Step 4: Commit**

```bash
git add src/pages/LandingPage.jsx
git commit -m "$(cat <<'EOF'
feat(landing): define SLACK_MESSAGES for new thread demo

Messages are reverse-engineered from AI_CARDS so each maps to a specific
card's fields. Message 2 intentionally has no @mention, which preserves
AI_CARDS[1].assignee === null as an honesty signal.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add `SLACK_*` timeline phase constants

**Files:**
- Modify: `src/pages/LandingPage.jsx` — insert after the existing `TIMELINE_TOTAL` line (~line 456)

**Context:** The new demo has its own independent timeline with named phase constants. This mirrors the architectural pattern of the existing demo (lines 439-456) and keeps the two demos decoupled so they can be tuned independently. Naming is prefixed `SLACK_` throughout to avoid any collision with the existing constants.

- [ ] **Step 1: Locate the insertion point**

Find `const TIMELINE_TOTAL = CARDS_END + FINAL_HOLD` at approximately line 456. The new constants go on the lines immediately after.

- [ ] **Step 2: Add the SLACK timeline phase constants**

Insert the following block immediately after `const TIMELINE_TOTAL = CARDS_END + FINAL_HOLD`:

```jsx
// Slack demo timeline — independent phases mirroring the existing demo's structure
const SLACK_LOOP_CARRY = 300         // initial "carry-over" showing prev loop's cards
const SLACK_MSG_LAND_DUR = 400       // per-message slide + fade duration
const SLACK_MSG_GAP = 350            // gap between messages landing
const SLACK_MSG_1_START = SLACK_LOOP_CARRY
const SLACK_MSG_1_END = SLACK_MSG_1_START + SLACK_MSG_LAND_DUR
const SLACK_MSG_2_START = SLACK_MSG_1_END + SLACK_MSG_GAP
const SLACK_MSG_2_END = SLACK_MSG_2_START + SLACK_MSG_LAND_DUR
const SLACK_MSG_3_START = SLACK_MSG_2_END + SLACK_MSG_GAP
const SLACK_MSG_3_END = SLACK_MSG_3_START + SLACK_MSG_LAND_DUR
const SLACK_CARDS_FADE_OUT_DUR = 200 // cards from prev loop fade out as first msg lands
const SLACK_CARDS_GAP = 400          // pause after last message before cards start
const SLACK_CARDS_START = SLACK_MSG_3_END + SLACK_CARDS_GAP
const SLACK_CARD_SWEEP = 750         // intentionally matches existing CARD_SWEEP
const SLACK_CARD_STAGGER = 600       // intentionally matches existing CARD_STAGGER
const SLACK_CARDS_END = SLACK_CARDS_START + (AI_CARDS.length - 1) * SLACK_CARD_STAGGER + SLACK_CARD_SWEEP
const SLACK_HOLD_DUR = 1800          // hold with both panels visible
const SLACK_MSG_FADE_OUT_DUR = 400   // messages fade out near end of timeline
const SLACK_MSG_FADE_OUT_START = SLACK_CARDS_END + SLACK_HOLD_DUR
const SLACK_FINAL_HOLD = SLACK_HOLD_DUR + SLACK_MSG_FADE_OUT_DUR
const SLACK_TIMELINE_TOTAL = SLACK_CARDS_END + SLACK_FINAL_HOLD
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Exit code 0. Constants are unused at this point.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LandingPage.jsx
git commit -m "$(cat <<'EOF'
feat(landing): add SLACK_* timeline phase constants

Independent timeline for SlackThreadDemo with named phase constants.
Card sweep/stagger values intentionally match existing demo to keep
visual rhythm consistent between the two showcases.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add timeline compute helper functions

**Files:**
- Modify: `src/pages/LandingPage.jsx` — insert after the existing `computeCardState` function (~line 482)

**Context:** Three helper functions compute per-frame state from `elapsed` for the new demo. They mirror the structure of the existing `computeMirrorLayerOpacity`, `computeMirrorLineOpacity`, `computeCardsLayerOpacity`, `computeCardState` functions.

The loop-carry pattern (returning "visible" state when `elapsed < SLACK_MSG_1_START`) matches the existing demo's behavior where cards from the previous loop remain visible briefly after the timeline wraps.

- [ ] **Step 1: Locate the insertion point**

Find the closing brace `}` of the existing `computeCardState` function (approximately line 482). The new functions go immediately after.

- [ ] **Step 2: Add the three compute helpers**

Insert the following immediately after `computeCardState`'s closing brace:

```jsx
function computeSlackMessageState(elapsed, msgIdx) {
  const starts = [SLACK_MSG_1_START, SLACK_MSG_2_START, SLACK_MSG_3_START]
  const msgStart = starts[msgIdx]

  // Fade-out phase near end of timeline (all messages fade together)
  if (elapsed >= SLACK_MSG_FADE_OUT_START) {
    const fadeElapsed = elapsed - SLACK_MSG_FADE_OUT_START
    const t = Math.min(1, fadeElapsed / SLACK_MSG_FADE_OUT_DUR)
    return { opacity: 1 - t, translateY: 0 }
  }

  // Hidden during loop-carry / before this message's turn
  if (elapsed < msgStart) return { opacity: 0, translateY: 20 }

  // Landing phase: slide up + fade in
  const msgElapsed = elapsed - msgStart
  if (msgElapsed < SLACK_MSG_LAND_DUR) {
    const t = msgElapsed / SLACK_MSG_LAND_DUR
    return { opacity: t, translateY: 20 * (1 - t) }
  }

  // Fully landed
  return { opacity: 1, translateY: 0 }
}

function computeSlackCardsLayerOpacity(elapsed) {
  // Loop-carry: cards from previous cycle still visible before messages start
  if (elapsed < SLACK_MSG_1_START) return 1
  // Cards fade out as first message lands
  const fadeElapsed = elapsed - SLACK_MSG_1_START
  if (fadeElapsed < SLACK_CARDS_FADE_OUT_DUR) {
    return 1 - fadeElapsed / SLACK_CARDS_FADE_OUT_DUR
  }
  // Hidden during message phase
  if (elapsed < SLACK_CARDS_START) return 0
  // Visible during card sweep and hold
  return 1
}

function computeSlackCardState(elapsed, cardIdx) {
  // Loop-carry: show cards from prev cycle at full
  if (elapsed < SLACK_MSG_1_START) return { opacity: 1, sweepProgress: 1 }
  // Before this card's sweep start
  const cardShowStart = SLACK_CARDS_START + cardIdx * SLACK_CARD_STAGGER
  if (elapsed < cardShowStart) return { opacity: 0, sweepProgress: 0 }
  // Sweep in progress
  const cardElapsed = elapsed - cardShowStart
  return { opacity: 1, sweepProgress: Math.min(1, cardElapsed / SLACK_CARD_SWEEP) }
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Exit code 0. Functions are unused at this point.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LandingPage.jsx
git commit -m "$(cat <<'EOF'
feat(landing): add timeline compute helpers for SlackThreadDemo

Three helpers for per-frame state: message slide/fade, cards layer
fade-out, and per-card sweep. Mirrors structure of existing compute
functions with loop-carry pattern at the start of each cycle.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Build the `SlackThread` sub-component

**Files:**
- Modify: `src/pages/LandingPage.jsx` — insert after `EveryDetailDemo` closing brace (~line 714)

**Context:** `SlackThread` renders the left panel — channel header plus 3 messages. Each message is wrapped in a div whose `opacity` and `transform: translateY(...)` come from `computeSlackMessageState(elapsed, msgIdx)`. The channel header (`# launch-prep`) is always visible. `@mentions` are highlighted in accent green by wrapping them with a span when rendering message text.

- [ ] **Step 1: Locate the insertion point**

Find the closing brace `}` of `EveryDetailDemo` function (approximately line 714). The new component goes immediately after, in a region that already holds other demo sub-components.

- [ ] **Step 2: Add the `SlackThread` component and a helper for mention highlighting**

Insert the following immediately after `EveryDetailDemo`'s closing brace:

```jsx
/* ── Slack Thread Demo ── */

// Renders message text with @mentions wrapped in an accent-colored span
function renderMessageText(text, mentions) {
  if (!mentions || mentions.length === 0) return text
  // Build a regex that matches any of the mentions literally
  const escaped = mentions.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = text.split(regex)
  return parts.map((part, idx) =>
    mentions.includes(part)
      ? <span key={idx} className="text-[#8BA32E] font-medium">{part}</span>
      : <span key={idx}>{part}</span>
  )
}

function SlackThread({ elapsed }) {
  const messageStates = SLACK_MESSAGES.map((_, idx) => computeSlackMessageState(elapsed, idx))
  return (
    <div className="px-5 sm:px-6 pt-4 sm:pt-5 flex flex-col gap-2 select-none h-full">
      {/* Channel header */}
      <div className="flex items-center gap-1.5 pb-2 border-b border-[#E0DBD5]">
        <Hash className="w-3.5 h-3.5 text-[#8E8E89]" />
        <span className="text-[13px] font-semibold text-[#1B1B18]">launch-prep</span>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 pt-1">
        {SLACK_MESSAGES.map((msg, idx) => {
          const state = messageStates[idx]
          return (
            <div
              key={idx}
              className="flex gap-2.5"
              style={{
                opacity: state.opacity,
                transform: `translateY(${state.translateY}px)`,
              }}
            >
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white bg-[#1B1B18]">
                {msg.avatar}
              </div>
              {/* Message body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[13px] font-semibold text-[#1B1B18]">{msg.sender}</span>
                  <span className="text-[10px] text-[#8E8E89]">{msg.timestamp}</span>
                </div>
                <p className="text-[12px] text-[#5C5C57] leading-relaxed break-words">
                  {renderMessageText(msg.text, msg.mentions)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Exit code 0. Component is defined but not yet rendered — no visual change.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LandingPage.jsx
git commit -m "$(cat <<'EOF'
feat(landing): add SlackThread sub-component with message animation

Renders channel header + 3 messages with per-message opacity/translate
derived from computeSlackMessageState. Helper renderMessageText wraps
@mentions in an accent-green span for visual highlighting.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Build the `SlackExtractedCards` sub-component

**Files:**
- Modify: `src/pages/LandingPage.jsx` — insert after `SlackThread` closing brace

**Context:** `SlackExtractedCards` wraps the existing `AICard` rendering in a new timeline context. It reads `computeSlackCardsLayerOpacity(elapsed)` for the outer layer opacity and `computeSlackCardState(elapsed, idx)` per card, then passes the resulting `opacity` and `sweepProgress` values to `<AICard>`. The structure mirrors the existing `RightContent` → `AIGeneratedCards` → `AICard` chain but with Slack-specific timeline helpers.

Uses `AI_CARDS` directly — no new card data.

- [ ] **Step 1: Locate the insertion point**

Immediately after the `SlackThread` function's closing brace (from Task 5).

- [ ] **Step 2: Add the `SlackExtractedCards` component**

```jsx
function SlackExtractedCards({ elapsed }) {
  const layerOpacity = computeSlackCardsLayerOpacity(elapsed)
  const cardStates = AI_CARDS.map((_, idx) => computeSlackCardState(elapsed, idx))
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: layerOpacity }}
    >
      <div className="pt-5 px-4 flex justify-center select-none">
        <div className="flex flex-col w-full max-w-[290px]">
          <div className="flex items-baseline gap-2 px-0.5 pb-3">
            <h3 className="text-sm font-semibold text-[#1B1B18]">to do</h3>
            <span className="text-xs text-[#8E8E89]">{AI_CARDS.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {AI_CARDS.map((card, idx) => (
              <AICard
                key={card.taskNumber}
                card={card}
                opacity={cardStates[idx].opacity}
                sweepProgress={cardStates[idx].sweepProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Exit code 0. Component is defined but not yet rendered.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LandingPage.jsx
git commit -m "$(cat <<'EOF'
feat(landing): add SlackExtractedCards sub-component

Renders AI_CARDS via the existing AICard component using Slack-specific
timeline helpers for layer opacity and per-card sweep progress.
Structurally parallels the existing RightContent → AIGeneratedCards
chain but with independent Slack timing.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Build the `SlackThreadDemo` wrapper component

**Files:**
- Modify: `src/pages/LandingPage.jsx` — insert after `SlackExtractedCards` closing brace

**Context:** `SlackThreadDemo` is the top-level component that will be rendered in the new landing page section. It owns the shared `elapsed` state driven by `setInterval`, wraps both sub-components in `CreamWindow` containers, and applies the soft-blue container background that visually distinguishes it from the existing lilac showcase.

- [ ] **Step 1: Locate the insertion point**

Immediately after the `SlackExtractedCards` function's closing brace (from Task 6).

- [ ] **Step 2: Add the `SlackThreadDemo` component**

```jsx
function SlackThreadDemo() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((prev) => (prev + 50 >= SLACK_TIMELINE_TOTAL ? 0 : prev + 50))
    }, 50)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="w-full max-w-5xl">
      <div
        className="relative overflow-hidden w-full rounded-2xl bg-[#DAE0F0]"
        style={{ boxShadow: 'inset 0 0 0 1px #E0DBD5' }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-8">
          <CreamWindow className="aspect-[4/3] md:aspect-[4/4.5]">
            <SlackThread elapsed={elapsed} />
          </CreamWindow>
          <CreamWindow className="aspect-[4/5]">
            <SlackExtractedCards elapsed={elapsed} />
          </CreamWindow>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Exit code 0. Component is defined but not yet rendered in the page tree.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LandingPage.jsx
git commit -m "$(cat <<'EOF'
feat(landing): add SlackThreadDemo wrapper component

Top-level component owning the shared elapsed clock and rendering both
sub-components in CreamWindow containers inside a soft-blue (#DAE0F0)
outer container that distinguishes it from the existing lilac showcase.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Replace Tools Strip section with new Slack Thread Showcase

**Files:**
- Modify: `src/pages/LandingPage.jsx:1205-1238` (the existing Tools Strip section)

**Context:** This is the first task where anything visible changes. The current Tools Strip section is removed in its entirety and replaced with a new section that mirrors the structure of the existing "AI Card Generation Showcase" section (lines 1147-1181) — centered heading + 4-bullet row + full-width demo. The new demo component (`<SlackThreadDemo />`) renders in the same position.

Make sure to use **Lucide** icons (`AtSign`, `Clock`, `AlertCircle`, `Hash`) for the feature bullets, consistent with the existing section's `Sparkles`, `Clock`, `Tag`, `CheckSquare` Lucide bullets.

- [ ] **Step 1: Read the current Tools Strip section**

Run: Read `src/pages/LandingPage.jsx` lines 1205-1239 to confirm the exact block to be replaced.

Expected shape:

```jsx
{/* ─── Tools Strip ─── */}
<section className="px-6 sm:px-10 py-14 max-w-5xl mx-auto">
  <div className="bg-white border border-[#E0DBD5]/80 rounded-2xl p-6 sm:p-8 shadow-sm">
    {/* ... content including tools.map ... */}
  </div>
</section>
```

- [ ] **Step 2: Replace the Tools Strip section with the new Slack Thread Showcase**

Replace the entire Tools Strip `<section>` block (from `{/* ─── Tools Strip ─── */}` through its closing `</section>`) with:

```jsx
{/* ─── Slack Thread Showcase ─── */}
<section className="px-6 sm:px-10 py-14 max-w-6xl mx-auto">
  {/* Heading + intro centered */}
  <div className="text-center mb-8 max-w-2xl mx-auto">
    <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-3">
      We read the{' '}
      <span className="text-[#8BA32E] font-heading">room</span>
    </h2>
    <p className="text-sm text-[#5C5C57] leading-relaxed">
      Your team already talks in Slack. Kolumn listens, picks out the asks,
      and drops them on the board.
    </p>
  </div>

  {/* Feature bullets — horizontal row */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10 max-w-4xl mx-auto">
    {[
      { icon: AtSign, text: 'Assignees from @mentions' },
      { icon: Clock, text: 'Deadlines from casual phrases' },
      { icon: AlertCircle, text: 'Priority from urgency cues' },
      { icon: Hash, text: 'Labels from topic cues' },
    ].map((item) => (
      <div key={item.text} className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-[#C2D64A]/20 flex items-center justify-center shrink-0 mt-0.5">
          <item.icon className="w-3.5 h-3.5 text-[#1B1B18]" />
        </div>
        <p className="text-[12px] text-[#5C5C57] leading-relaxed">{item.text}</p>
      </div>
    ))}
  </div>

  {/* Full-width animated demo */}
  <div className="flex justify-center">
    <SlackThreadDemo />
  </div>
</section>
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Exit code 0. The `tools` const is now an orphan (defined at line 179 but never referenced) — the build should still succeed because unused module-level constants are not errors in JavaScript. The cleanup happens in Task 9.

- [ ] **Step 4: Visual verification via dev server**

Open http://localhost:5173/ in a browser, scroll to just above the CTA section. The new "We read the room" showcase should be visible between the Features Grid and the CTA.

Confirm:
- Heading reads "We read the room" with "room" in accent green
- Four bullets render with their icons
- The dual-panel demo container has a soft blue background (`#DAE0F0`)
- Left panel shows the `# launch-prep` channel header and Slack messages animating in sequence
- Right panel shows the three cards sweeping in after the messages
- Card 2 (Build pricing page) has NO assignee avatar visible
- Animation loops continuously

If any of these fails, debug before committing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LandingPage.jsx
git commit -m "$(cat <<'EOF'
feat(landing): replace Tools Strip with Slack Thread Showcase section

The new section renders SlackThreadDemo between Features Grid and CTA,
where a "wow moment" belongs. Uses the "We read the room" headline and
four feature bullets matching the existing showcase's layout pattern.

The removed Tools Strip section was redundant with the Features Grid
directly above it — both enumerated Kolumn's capabilities as icon tiles.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Remove the unused `tools` constant

**Files:**
- Modify: `src/pages/LandingPage.jsx:179` (the `tools` array declaration)

**Context:** With Tools Strip removed, the `tools` constant at line 179 is unused. Clean it up so the file doesn't carry orphan data.

- [ ] **Step 1: Confirm `tools` has no remaining references in code**

Run: Grep for the whole-word pattern `\btools\b` in `src/pages/LandingPage.jsx`.

Expected: The only match should be the declaration at line 179 (`const tools = [`). The earlier text-content matches on lines 1187 and 1211 are no longer present (the first was in the "Built for how teams actually work" subtitle which was unchanged; the second was in the Tools Strip copy which has been removed in Task 8 — re-verify this).

If any code reference other than the declaration still exists, stop and investigate before deleting.

- [ ] **Step 2: Read the current `tools` array to know its extent**

Run: Read lines ~179-220 of `src/pages/LandingPage.jsx` to find the full declaration and its closing `]`.

- [ ] **Step 3: Delete the entire `tools` array declaration**

Remove from `const tools = [` through the closing `]` (inclusive). Preserve the blank line separator between surrounding constants.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LandingPage.jsx
git commit -m "$(cat <<'EOF'
chore(landing): remove unused tools constant

The tools array was only referenced by the Tools Strip section, which
was removed in the previous commit. Orphan constant cleanup.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final verification pass

**Files:** None modified — this is a verification gate, not a code change.

**Context:** Walk through every success criterion from the spec to confirm the implementation is correct and no regression was introduced in the existing `EveryDetailDemo`.

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Exit code 0 with no warnings about unused imports, unused variables, or React key issues.

- [ ] **Step 2: Verify both showcases render correctly on the dev server**

Open http://localhost:5173/ and scroll top-to-bottom. Confirm:

| Check | Expected |
|---|---|
| Page loads without console errors | No red in DevTools console |
| "Notes in, kanban out" section (existing) | Still animates correctly — types notes on left, mirrors to right, cards sweep in |
| "We read the room" section (new) | Animates correctly — messages land on left, cards sweep in on right after a pause |
| Card 2 on new demo | Has NO assignee avatar visible (honesty signal) |
| Card 2 on existing demo | Still has NO assignee avatar (regression check — should be unchanged) |
| Container colors | Existing demo is lilac (`#E8DDE2`), new demo is soft blue (`#DAE0F0`) |
| New section position | Between Features Grid ("Built for how teams actually work") and CTA |
| Tools Strip | Completely absent from the page |

- [ ] **Step 3: Verify responsive layout**

Resize the browser to a narrow width (~375px). Confirm:
- New section's two panels stack vertically (left above right)
- Messages text still wraps cleanly within the left panel width
- Cards remain readable in the right panel
- No horizontal scrollbar appears

Resize to a wide width (~1200px). Confirm:
- Panels sit side-by-side
- Heading remains centered
- Feature bullets row stays in a single row on `lg:` and up

- [ ] **Step 4: Verify animation loop continuity**

Watch a full animation cycle (should take ~6-7 seconds) and then the loop restart. Confirm:
- At the end of the cycle, cards remain visible during the ~1.8s hold
- Messages fade out over ~400ms at the tail of the timeline
- At loop wrap, cards are still visible for ~300ms before Message 1 begins landing (the loop-carry phase)
- The transition feels smooth, not abrupt
- Watch 2-3 full loops to confirm consistency

- [ ] **Step 5: Verify no regression in other landing page sections**

Scroll through Hero, Stats Bar, existing "Notes in, kanban out" showcase, Features Grid, new Slack showcase, CTA, Footer. Confirm no layout issues, no missing content, no broken images or icons, no unexpected spacing changes.

- [ ] **Step 6: (Optional) Commit any cleanup if needed**

If step 5 uncovered any small fix (e.g., an extra blank line left behind from Task 9), commit it as a minor chore commit. Otherwise, no commit for this task — it's verification only.

---

## Self-review checklist (for plan author)

After writing this plan, run the spec self-review:

1. **Spec coverage:** Every section of the spec has a task that implements it.
   - §1 Section placement → Task 8 (replaces Tools Strip)
   - §2 Story & scenario, left panel contents → Task 2 (SLACK_MESSAGES), Task 5 (SlackThread renders them)
   - §3 Right panel → Task 6 (SlackExtractedCards reuses AI_CARDS + AICard)
   - §4 Animation timeline → Task 3 (SLACK_* constants), Task 4 (compute helpers)
   - §5 Visual container styling → Task 7 (SlackThreadDemo wrapper with `#DAE0F0` background)
   - §6 Section heading + copy → Task 8 (heading, subtitle, feature bullets)
   - §7 Component architecture → Tasks 5, 6, 7 build the components
   - §8 Section JSX placement → Task 8
   - Files affected → Tasks 1-9 cover all listed changes
   - Success criteria → Task 10 verifies all 13

2. **Placeholder scan:** No TBDs, no "add appropriate error handling", no "similar to Task N" without repeating the code, no references to helpers that aren't defined in an earlier task.

3. **Type consistency:** Function names, constant names, and prop names are consistent across tasks:
   - `SlackThreadDemo`, `SlackThread`, `SlackExtractedCards` appear consistently
   - `SLACK_TIMELINE_TOTAL`, `SLACK_MSG_1_START`, etc. appear consistently
   - `computeSlackMessageState`, `computeSlackCardsLayerOpacity`, `computeSlackCardState` appear consistently
   - `SLACK_MESSAGES` with fields `sender`, `avatar`, `timestamp`, `text`, `mentions`
   - `AI_CARDS` (reused, unchanged)
   - `AICard` component props: `card`, `opacity`, `sweepProgress` (unchanged from existing)

Self-review passes.

---

## After-plan next steps

Once Task 10 passes, the work is ready to:
1. Push `landing` to origin (`git push origin landing`) if desired
2. Merge `landing` into `master` and push (if the new section is ready to ship)
3. Consider writing a short blog post or tweet about the two-showcase narrative pattern — it's a teachable moment about landing page design
