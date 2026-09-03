// Avatar — initials avatar, hash-derived color, 4 sizes, optional ring.
import { Avatar } from 'kolumn'

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }
const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }
const label: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }

export const Sizes = () => (
  <div style={row}>
    <div style={stack}>
      <Avatar name="Priya Chandran" size="xs" />
      <span style={label}>xs</span>
    </div>
    <div style={stack}>
      <Avatar name="Priya Chandran" size="sm" />
      <span style={label}>sm</span>
    </div>
    <div style={stack}>
      <Avatar name="Priya Chandran" size="md" />
      <span style={label}>md</span>
    </div>
    <div style={stack}>
      <Avatar name="Priya Chandran" size="lg" />
      <span style={label}>lg</span>
    </div>
  </div>
)

export const HashColors = () => (
  <div style={row}>
    <Avatar name="Priya Chandran" size="lg" />
    <Avatar name="Marcus Webb" size="lg" />
    <Avatar name="Sofia Ibarra" size="lg" />
    <Avatar name="Devon Okafor" size="lg" />
    <Avatar name="Lena Marsh" size="lg" />
    <Avatar name="Tomas Reyes" size="lg" />
  </div>
)

export const RingedStack = () => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <Avatar name="Priya Chandran" size="md" ringed className="-mr-2" />
    <Avatar name="Marcus Webb" size="md" ringed className="-mr-2" />
    <Avatar name="Sofia Ibarra" size="md" ringed />
  </div>
)
