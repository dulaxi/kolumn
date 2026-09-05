// InlineNotice — the persistent ("wash") tier of the error grammar.
// Mono 12px, 18px Phosphor icon, 1px border, 10px radius.
import { InlineNotice, Button } from 'kolumn'

const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460 }

export const Variants = () => (
  <div style={stack}>
    <InlineNotice variant="info">Drag cards between columns to update their status.</InlineNotice>
    <InlineNotice variant="error">Couldn&apos;t sync your board — check your connection.</InlineNotice>
    <InlineNotice variant="warn">3 cards are overdue on this board.</InlineNotice>
    <InlineNotice variant="danger">Deleting this board removes all 24 cards for every member.</InlineNotice>
    <InlineNotice variant="success">Board imported — 18 cards across 4 columns.</InlineNotice>
  </div>
)

export const WithAction = () => (
  <div style={stack}>
    <InlineNotice
      variant="error"
      action={
        <Button variant="ghost" size="sm">
          Retry
        </Button>
      }
    >
      Invitation failed to send.
    </InlineNotice>
  </div>
)

export const Dismissible = () => (
  <div style={stack}>
    <InlineNotice variant="info" onDismiss={() => {}}>
      Tip: press ⌘K to search cards, boards, and chats.
    </InlineNotice>
  </div>
)
