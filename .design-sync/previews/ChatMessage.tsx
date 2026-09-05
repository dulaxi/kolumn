// ChatMessage — user bubble vs. assistant markdown stream. Assistant replies
// can interleave "activity" chips (search / board-summary) mid-text, and can
// end in an error state with an inline retry action.
//
// Not renderable statically: embedded cards. ChatMessage resolves
// message.cardIds against boardStore.cards, which is empty in this preview
// provider (no store seeding), so embeddedCards always comes back []. See
// .design-sync/learnings/wave1-c.md.
import { ChatMessage } from 'kolumn'

const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 480 }

export const UserMessage = () => (
  <div style={stack}>
    <ChatMessage message={{ role: 'user', text: 'Can you summarize what changed on the launch board this week?' }} />
  </div>
)

export const AssistantMarkdown = () => (
  <div style={stack}>
    <ChatMessage
      message={{
        role: 'assistant',
        text: "Here's the state of the **launch board**:\n\n- 3 cards moved to *Done*\n- 2 cards are overdue in *In Progress*\n- No new cards were added this week\n\nOverall the board is on track for Friday's review.",
      }}
    />
  </div>
)

const activityIntro = 'Let me check the board for anything overdue.\n\n'
const activityOutro = 'Found 2 cards that need attention:\n\n- **Fix onboarding drop-off** — due yesterday\n- **Migrate legacy webhook handlers** — due yesterday\n\nBoth are marked **high priority**.'

export const AssistantWithActivity = () => (
  <div style={stack}>
    <ChatMessage
      message={{
        role: 'assistant',
        text: activityIntro + activityOutro,
        activities: [{ atChar: activityIntro.length, icon: 'search', label: 'Searching cards' }],
      }}
    />
  </div>
)

export const ErrorWithRetry = () => (
  <div style={stack}>
    <ChatMessage
      message={{
        role: 'assistant',
        text: '',
        error: { message: "Couldn't reach the AI service. Check your connection and try again." },
      }}
      onRetry={() => {}}
    />
  </div>
)
