// Skeleton — variants block/line/circle/pill, tones default (surface-raised
// pulse) / ai (lime shimmer). Compositions mirror BoardSkeleton.jsx (ghost
// kanban column) and the AI streaming placeholder used while a chat reply
// is still generating.
import { Skeleton } from 'kolumn'

const column: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  width: 240,
}

const columnsRow: React.CSSProperties = {
  display: 'flex',
  gap: 20,
}

const cardStack: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const aiRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
}

const aiLines: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  flex: 1,
}

export const BoardGhost = () => (
  <div style={columnsRow}>
    <div style={column}>
      <Skeleton variant="line" width={72} />
      <div style={cardStack}>
        <Skeleton variant="block" height={64} style={{ borderRadius: 16 }} />
        <Skeleton variant="block" height={88} style={{ borderRadius: 16 }} />
        <Skeleton variant="block" height={52} style={{ borderRadius: 16 }} />
      </div>
    </div>
    <div style={column}>
      <Skeleton variant="line" width={96} />
      <div style={cardStack}>
        <Skeleton variant="block" height={72} style={{ borderRadius: 16 }} />
        <Skeleton variant="block" height={56} style={{ borderRadius: 16 }} />
      </div>
    </div>
  </div>
)

export const AiReplyShimmer = () => (
  <div style={aiRow}>
    <Skeleton variant="circle" width={28} height={28} tone="ai" />
    <div style={aiLines}>
      <Skeleton variant="line" width="88%" tone="ai" />
      <Skeleton variant="line" width="72%" tone="ai" />
      <Skeleton variant="line" width="45%" tone="ai" />
    </div>
  </div>
)

export const ProfileRow = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <Skeleton variant="circle" width={32} height={32} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Skeleton variant="line" width={120} />
      <Skeleton variant="pill" width={64} />
    </div>
  </div>
)
