# Landing Page: Slack Thread Demo Section

**Date**: 2026-04-08
**Branch**: landing
**Status**: Approved (amended 2026-04-08 after reading existing demo code)
**Replaces**: Tools Strip section (`src/pages/LandingPage.jsx:1205-1238`)

## Amendment history

**2026-04-08 (initial)**: Approved with simple opacity/shimmer animation model.

**2026-04-08 (amended, same day)**: After reading the existing `EveryDetailDemo` code in detail during implementation plan writing, discovered three things that forced spec changes:

1. The existing demo uses a sophisticated phase-based animation timeline (~10 named constants, character-by-character typing, mirror transition, per-card sweep) rather than simple percentage blocks. The new demo must reach similar craftsmanship to avoid visual asymmetry on the landing page. → **Added `SLACK_*` phase constants and compute helpers in §4.**
2. The existing `AI_CARDS` array (lines 403-437) already contains the exact cards described for the new section. Reusing `AI_CARDS` + `AICard` creates a stronger "same output from different inputs" narrative and halves implementation work. → **Right panel rewritten to reuse existing components in §3.**
3. The original "Labels from channel names" bullet was inaccurate — the existing card labels are topic-based (Frontend/Backend), not channel-based. → **Corrected to "Labels from topic cues" in §6.**

Messages were then reverse-engineered from `AI_CARDS` so each message's extractable signals map to a specific card's existing fields (assignee initial, label text, priority level, due date). This also forced Message 2 to have no `@mention` so that Card 2's existing `assignee: null` value is honest.

## Summary

Add a second dual-panel showcase section to the landing page that demonstrates Kolumn's ability to extract structured tasks from a team Slack thread. The new section mirrors the architecture of the existing `EveryDetailDemo` component but tells a different input→output story: **team chat → assigned kanban cards**.

**Design-defining decision: the right panel reuses the existing `AI_CARDS` data and the existing `AICard` component as-is.** The two demos show the *same* final cards but arrived at via *different* input sources (scratchpad notes vs. Slack messages). This creates an unmissable narrative payoff: "different inputs, same clean output" — which is a stronger product claim than two independent scenarios.

The Slack messages are reverse-engineered from the existing `AI_CARDS` so that each extractable signal in the text maps to a specific field on one of the three cards.

The new section replaces the Tools Strip, which is currently redundant with the Features Grid directly above it — both enumerate Kolumn's features in a tile-grid format, competing for the same conversion job.

## Background

The landing page currently contains one dual-panel showcase: `EveryDetailDemo` at `src/pages/LandingPage.jsx:689`, rendered inside the "AI Card Generation Showcase" section at ~line 1146. It animates a left panel of freeform notes becoming a right panel of kanban cards — the "Notes in, kanban out" metaphor.

**Current page structure:**

```
Nav → Hero → Stats Bar → Notes→Kanban Showcase → Features Grid → Tools Strip → CTA → Footer
```

**Problem**: Tools Strip (1205-1238) and Features Grid (1183-1203) both enumerate Kolumn's features as icon-tile grids. They compete for the same reader attention and split it. Tools Strip occupies the prime position immediately before the CTA — a slot where a "wow moment" belongs but the current content doesn't deliver one.

**Solution**: Replace Tools Strip with a second dual-panel showcase that demonstrates a different Kolumn superpower using the same visual language as `EveryDetailDemo`.

**New page structure:**

```
Nav → Hero → Stats Bar → Notes→Kanban Showcase → Features Grid → Slack→Cards Showcase → CTA → Footer
```

The two showcases are separated by Features Grid, preventing visual clash. The new showcase lands immediately before the CTA, so the last thing visitors see before the signup button is a wow moment.

## Goals

1. Create a new `SlackThreadDemo` component that follows the architectural pattern of `EveryDetailDemo` — shared `elapsed` clock, two `CreamWindow` panels, synchronized animation
2. Replace the Tools Strip section with the new showcase
3. Reinforce the fictional team narrative (Aisha, Marcus) already used in `DEMO_CARDS_INIT` to create invisible continuity between the two showcases
4. Visually distinguish the new showcase from the existing one via a different container color and a non-parallel headline

## Non-goals (YAGNI)

- **No real Slack OAuth integration** — this is pure visual animation, all content is hardcoded
- **No hover/interactive state** on messages — purely presentational, same as existing demo
- **No dark mode styling** — stays in the cream/warm palette of the rest of the page
- **No new card data or new card component** — reuse the existing `AI_CARDS` array and `AICard` component as-is
- **No new component files** — `SlackThreadDemo` lives inline in `LandingPage.jsx` alongside `EveryDetailDemo`
- **No mirror/transition phase** — Slack messages and cards don't occupy comparable visual positions, so there's no equivalent to the existing `MirrorNotes` phase. The new timeline goes directly from "messages land" to "cards sweep in" with a brief gap.
- **No unit tests** — project has no test suite (per CLAUDE.md); verification is manual

## Design Decisions

### 1. Story & scenario

A short Slack thread in `#launch-prep` where a PM named **Priya** drops three messages asking the team for various things. The scenario deliberately overlaps with the existing `EveryDetailDemo` product-launch fiction — same fictional team, different input source.

**Cast**: Priya (sender), Aisha and Marcus (mentioned, will become card assignees). Aisha and Marcus are already used as card assignees in `DEMO_CARDS_INIT` at `src/pages/LandingPage.jsx:741` and `:746`, so reusing them creates cross-section narrative continuity.

### 2. Left panel: Slack thread contents

**Channel header**: `# launch-prep`

The messages are reverse-engineered from the existing `AI_CARDS` (at `LandingPage.jsx:403-437`) so that each one's extractable signals map cleanly to a specific card's fields.

**Message 1** (Priya) — maps to `AI_CARDS[0]` (Redo hero section / Frontend / high / assignee A)
> @aisha hero section feels plain — sarah flagged it on the call, can you redo it? high prio

**Message 2** (Priya) — maps to `AI_CARDS[1]` (Build pricing page / Frontend / medium / 0/3 checklist / no assignee)
> also pricing page needs building — 3 tiers with monthly/annual toggle, founder's call

**Message 3** (Priya) — maps to `AI_CARDS[2]` (Stripe integration / Backend / high / Fri / assignee M)
> @marcus stripe integration by fri — checkout, webhooks, customer portal. high prio, legal flagged it

**Mapping of signals → fields**:

| Message text | Extracted field |
|---|---|
| `@aisha` (Msg 1) | `assignee: 'A'` on Card 1 |
| `@marcus` (Msg 3) | `assignee: 'M'` on Card 3 |
| No mention (Msg 2) | `assignee: null` on Card 2 (honesty: unassigned because nobody was named) |
| "high prio" (Msg 1, Msg 3) | `priority: 'high'` on Cards 1, 3 |
| No priority cue (Msg 2) | `priority: 'medium'` on Card 2 (default) |
| "by fri" (Msg 3) | `dueDate: 'Fri'` on Card 3 |
| "3 tiers with monthly/annual toggle" (Msg 2) | `checklist: { done: 0, total: 3 }` on Card 2 |
| "hero section" (Msg 1) | `labels: [{ text: 'Frontend' }]` on Card 1 |
| "pricing page" (Msg 2) | `labels: [{ text: 'Frontend' }]` on Card 2 |
| "stripe integration" (Msg 3) | `labels: [{ text: 'Backend' }]` on Card 3 |

**Visual treatment per message**:
- Rounded avatar circle with initial letter ("P") on dark background (`bg-[#1B1B18] text-white`)
- Sender name: `text-[13px] font-semibold text-[#1B1B18]`
- Timestamp: `text-[11px] text-[#8E8E89]` (e.g., "2:14 PM")
- Body text: `text-[12px] text-[#5C5C57] leading-relaxed`
- `@mentions` styled in accent green (`text-[#8BA32E] font-medium`)

### 3. Right panel: Extracted cards

**The right panel reuses `AI_CARDS` (`LandingPage.jsx:403`) and the `AICard` component (`LandingPage.jsx:570`) as-is.** No new card data, no new card component. The new demo's right panel renders the same three cards as the existing `EveryDetailDemo`:

1. **Redo hero section** — Frontend label, high priority, assignee A (Aisha), Browser icon
2. **Build pricing page** — Frontend label, medium priority, 0/3 checklist, **no assignee**, Tag icon
3. **Stripe integration** — Backend label, high priority, Fri deadline, assignee M (Marcus), CreditCard icon

**Why Card 2 has no assignee is load-bearing**: the corresponding Slack message has no `@mention`, so the AI has nothing to extract. Adding an assignee "to look more impressive" would invent a field, which breaks the demo's honesty. Since we're reusing `AI_CARDS` as-is, this constraint is enforced automatically — do not modify `AI_CARDS` during implementation.

**Card rendering**: The new demo uses a thin wrapper around the existing `AIGeneratedCards` / `AICard` pipeline. The right panel's `CreamWindow` contains a `SlackExtractedCards` component that calls `computeSlackCardState(elapsed, idx)` for each card and passes `opacity` + `sweepProgress` to `<AICard>`. This is structurally parallel to the existing `RightContent` → `AIGeneratedCards` → `AICard` chain, but with Slack-specific timeline helpers.

### 4. Animation timeline

The new demo has its **own independent timeline** with named phase constants, mirroring the existing demo's architectural pattern (see `LandingPage.jsx:439-456`). Using its own constants (prefixed `SLACK_`) rather than reusing the existing ones keeps the two demos decoupled and independently tunable.

**Phase constants** (all in milliseconds):

```js
// Message landing phase — each Slack message slides up + fades in
const SLACK_LOOP_CARRY = 300        // initial "carry-over" showing prev loop's cards
const SLACK_MSG_LAND_DUR = 400      // per-message slide + fade duration
const SLACK_MSG_GAP = 350           // gap between messages landing
const SLACK_MSG_1_START = SLACK_LOOP_CARRY
const SLACK_MSG_1_END = SLACK_MSG_1_START + SLACK_MSG_LAND_DUR
const SLACK_MSG_2_START = SLACK_MSG_1_END + SLACK_MSG_GAP
const SLACK_MSG_2_END = SLACK_MSG_2_START + SLACK_MSG_LAND_DUR
const SLACK_MSG_3_START = SLACK_MSG_2_END + SLACK_MSG_GAP
const SLACK_MSG_3_END = SLACK_MSG_3_START + SLACK_MSG_LAND_DUR

// Cards layer fade-out as messages start landing (hides leftover cards from prev loop)
const SLACK_CARDS_FADE_OUT_DUR = 200

// Cards sweep-in phase — matches existing CARD_SWEEP / CARD_STAGGER values
const SLACK_CARDS_GAP = 400         // pause after last message before cards start
const SLACK_CARDS_START = SLACK_MSG_3_END + SLACK_CARDS_GAP
const SLACK_CARD_SWEEP = 750        // intentionally matches existing CARD_SWEEP
const SLACK_CARD_STAGGER = 600      // intentionally matches existing CARD_STAGGER
const SLACK_CARDS_END = SLACK_CARDS_START + (AI_CARDS.length - 1) * SLACK_CARD_STAGGER + SLACK_CARD_SWEEP

// Final hold with brief message fade-out at the tail
const SLACK_MSG_FADE_OUT_DUR = 400
const SLACK_HOLD_DUR = 1800         // hold with both panels visible
const SLACK_MSG_FADE_OUT_START = SLACK_CARDS_END + SLACK_HOLD_DUR
const SLACK_FINAL_HOLD = SLACK_HOLD_DUR + SLACK_MSG_FADE_OUT_DUR  // = 2200, matches existing
const SLACK_TIMELINE_TOTAL = SLACK_CARDS_END + SLACK_FINAL_HOLD
```

**Timeline walkthrough** (approximate ms values):

```
0     — 300   LOOP_CARRY     Cards from previous loop still visible, left panel blank
300   — 700   MSG_1_LANDING  Card layer starts fading out; Message 1 slides up + fades in
700   — 1050  GAP            Message 1 visible; pause before next message
1050  — 1450  MSG_2_LANDING  Message 2 slides up + fades in (cards fully hidden by now)
1450  — 1800  GAP            Messages 1-2 visible; pause
1800  — 2200  MSG_3_LANDING  Message 3 slides up + fades in
2200  — 2600  CARDS_GAP      All 3 messages visible; pause before cards
2600  — 3350  CARD_1_SWEEP   Card 1 sweeps in via ai-shimmer-reveal
3200  — 3950  CARD_2_SWEEP   (overlaps with Card 1 tail — CARD_STAGGER is 600, sweep is 750)
3800  — 4550  CARD_3_SWEEP
4550  — 6350  HOLD           All messages + all cards visible
6350  — 6750  MSG_FADE_OUT   Messages fade out (cards remain visible — they carry to next loop)
6750  → 0     Loop reset     Elapsed wraps, cards carry over (opacity 1), messages hidden
```

**Compute helper functions** (to be added inline in `LandingPage.jsx`, near existing compute helpers at lines 458-482):

```js
function computeSlackMessageState(elapsed, msgIdx) {
  const starts = [SLACK_MSG_1_START, SLACK_MSG_2_START, SLACK_MSG_3_START]
  const msgStart = starts[msgIdx]

  // Fade-out phase near end of timeline (same for all messages simultaneously)
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

**All animations use opacity and transform only** — no layout-affecting properties. GPU-composited, reflow-free.

### 5. Visual container styling

**Container background**: `#DAE0F0` (soft blue) — already in Kolumn's label palette at `src/utils/formatting.js`, so it stays on-brand. Distinguishes the new showcase from the existing lilac (`#E8DDE2`) container.

**Container shape**: identical to existing demo — `rounded-2xl` with inset `1px #E0DBD5` shadow.

**CreamWindow aspect ratios** (matching existing demo):
- Left (`SlackThread`): `aspect-[4/3] md:aspect-[4/4.5]`
- Right (`ExtractedCards`): `aspect-[4/5]`

**Layout**: `flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-8` — stacks on mobile, side-by-side on `md:` and up. Same as existing demo.

### 6. Section heading and copy

**Headline**: `We read the <span class="font-heading text-[#8BA32E]">room</span>`
- Plays on two meanings of "read": parsing text + understanding social context
- Deliberately *not* "Slack in, cards out" — parallel construction with the adjacent "Notes in, kanban out" would read as template-filling rather than crafted copy

**Subtitle**: "Your team already talks in Slack. Kolumn listens, picks out the asks, and drops them on the board."

**Four feature bullets** (same `grid-cols-2 lg:grid-cols-4` row as existing showcase):

| Icon (Lucide) | Text |
|---|---|
| `AtSign` | Assignees from @mentions |
| `Clock` | Deadlines from casual phrases |
| `AlertCircle` | Priority from urgency cues |
| `Hash` | Labels from topic cues |

**Icon imports**: `Clock` is already imported from `lucide-react` on line 6. Add `AtSign`, `AlertCircle`, and `Hash` to the existing `lucide-react` import block (lines 4-10).

**Note on "Labels from topic cues"**: originally drafted as "Labels from channel names" but corrected because the existing `AI_CARDS` labels (`Frontend`, `Backend`) are topic-based, not channel-based. "Topic cues" is more honest about what the AI actually extracts from message content.

### 7. Component architecture

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

**New sub-components (both inline in `LandingPage.jsx`)**:

- `SlackThread({ elapsed })` — renders the channel header + 3 Slack messages. Each message reads its per-frame state from `computeSlackMessageState(elapsed, msgIdx)` and applies `opacity` + `transform: translateY(Npx)` as inline styles.
- `SlackExtractedCards({ elapsed })` — wraps the existing `AICard` rendering in a new timeline context. Reads `computeSlackCardsLayerOpacity(elapsed)` for the outer layer opacity and `computeSlackCardState(elapsed, idx)` per card, then passes `card={AI_CARDS[idx]}`, `opacity={cardStates[idx].opacity}`, `sweepProgress={cardStates[idx].sweepProgress}` to `<AICard>`. Structurally parallel to the existing `RightContent` → `AIGeneratedCards` → `AICard` chain, but with Slack-specific timeline helpers.

**New constants (all inline in `LandingPage.jsx`)**:
- `SLACK_MESSAGES` — array of 3 message objects (see §2 for content)
- All `SLACK_*` timeline phase constants (see §4)
- `computeSlackMessageState`, `computeSlackCardsLayerOpacity`, `computeSlackCardState` helper functions

**Reused from existing demo (unchanged)**:
- `CreamWindow` component
- `AICard` component (rendered with new opacity/sweepProgress values from Slack helpers)
- `AI_CARDS` data array (same 3 cards)
- `LANDING_PRIORITY_DOT`, `LANDING_LABEL_BG`, `PHOSPHOR_ICON_MAP` maps
- `ai-shimmer-reveal` CSS class and `--reveal` variable technique (flows through `AICard`)

### 8. Section JSX placement

Replace the current Tools Strip section (`src/pages/LandingPage.jsx:1205-1238`) with a new `<section>` that mirrors the structure of the existing "AI Card Generation Showcase" (lines 1147-1181):

```jsx
{/* ─── Slack Thread Showcase ─── */}
<section className="px-6 sm:px-10 py-14 max-w-6xl mx-auto">
  {/* Heading + intro centered */}
  <div className="text-center mb-8 max-w-2xl mx-auto">
    <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-3">
      We read the <span className="text-[#8BA32E] font-heading">room</span>
    </h2>
    <p className="text-sm text-[#5C5C57] leading-relaxed">
      Your team already talks in Slack. Kolumn listens, picks out the asks,
      and drops them on the board.
    </p>
  </div>

  {/* Feature bullets — horizontal row */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10 max-w-4xl mx-auto">
    {/* 4 bullets: AtSign, Clock, AlertCircle, Hash */}
  </div>

  {/* Full-width animated demo */}
  <div className="flex justify-center">
    <SlackThreadDemo />
  </div>
</section>
```

## Files affected

| File | Change |
|---|---|
| `src/pages/LandingPage.jsx` | (1) Add `AtSign`, `AlertCircle`, `Hash` to lucide-react imports (lines 4-10). (2) Add `SLACK_MESSAGES` constant near `AI_CARDS` (~line 437). (3) Add all `SLACK_*` timeline constants after existing timeline constants (~line 456). (4) Add `computeSlackMessageState`, `computeSlackCardsLayerOpacity`, `computeSlackCardState` helper functions near existing compute helpers (~line 482). (5) Add `SlackThread`, `SlackExtractedCards`, `SlackThreadDemo` component definitions after `EveryDetailDemo` (~line 713). (6) Replace Tools Strip section (1205-1238) with new Slack Thread Showcase section. (7) Delete unused `tools` array constant (line 179) — verified to be referenced only at line 1222 (`tools.map`) which will be removed. |

**No new files created.**

**Note**: The existing `tools` array constant should be removed in the same commit as the Tools Strip section removal so the repo doesn't have an orphaned unused constant sitting in between edits. Pre-verified via grep that `tools` is only referenced once in code (`LandingPage.jsx:1222`); other matches on lines 1187 and 1211 are prose containing the English word "tools" in feature-description sentences, unrelated to the array.

## Success criteria

1. New section renders on the landing page between Features Grid and CTA
2. Animation loops smoothly with left and right panels synchronized via shared `elapsed` clock driven by `SLACK_TIMELINE_TOTAL`
3. Three Slack messages appear in sequence on the left, each sliding up with `translateY` and fading in over `SLACK_MSG_LAND_DUR`
4. After all 3 messages land, a `SLACK_CARDS_GAP` pause occurs, then the three cards sweep in via `AICard`'s existing sweep mechanism (per-card stagger matching existing demo's `CARD_STAGGER`)
5. **Card 2 (Build pricing page) visibly has no assignee avatar** — the `@mention`-less Message 2 produces an assigneeless card (honesty signal preserved via `AI_CARDS[1].assignee === null`)
6. Container background is `#DAE0F0` (soft blue), visually distinct from the existing lilac showcase
7. Headline renders as "We read the room" with "room" in accent green using the heading font (same pattern as existing "Notes in, kanban out" heading)
8. Responsive: stacks vertically on mobile, side-by-side on `md:` breakpoint and up
9. Loop restart is smooth: at `elapsed` wrap to 0, cards remain visible from the previous loop's final state (via `computeSlackCardState` returning full opacity for `elapsed < SLACK_MSG_1_START`), then cards fade out as Message 1 begins landing, matching the "loop-carry" pattern used by the existing `EveryDetailDemo`
10. No console errors or warnings during the animation loop
11. `npm run build` succeeds without errors
12. Tools Strip section fully removed from rendered output; `tools` array constant deleted from the file
13. The existing `EveryDetailDemo` section continues to work unchanged (regression check)

## Testing approach

Manual verification on the dev server (`npm run dev`, http://localhost:5173/):

- Scroll to the new section; observe at least one full animation loop
- Confirm the three messages land in sequence on the left
- Confirm cards trail messages on the right by the intended timing
- Confirm Card 3 is visibly sparser than Cards 1 and 2 (no avatar, no deadline)
- Resize browser to mobile width; confirm panels stack vertically
- Resize to desktop width; confirm panels sit side-by-side
- Open devtools console; confirm no errors or warnings during the loop
- Run `npm run build` locally and confirm clean exit

Project has no unit test suite (per CLAUDE.md), so this is the full verification path.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| `CreamWindow` or `TIMELINE_TOTAL` turn out to be named differently in the actual code than assumed | Implementation plan's first step should be reading `EveryDetailDemo` in full to confirm exact names before writing new code |
| The ai-shimmer-reveal technique only works on text, not card backgrounds, and behaves unexpectedly for card mocks | Implementation plan should verify by testing the first card's reveal in isolation before building all three |
| Removing the `tools` array breaks some other section that imports it | Before deletion, grep for `tools` usage across `LandingPage.jsx` and confirm it is only referenced in the Tools Strip block |
| Visitors find the two back-to-back showcases monotonous despite the separator section | The blue vs lilac container colors, different headline construction, and different input metaphor are the mitigation; post-launch, monitor scroll-depth analytics if available |
