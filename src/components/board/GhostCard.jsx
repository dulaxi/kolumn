import Card from './Card'
import { formatDistanceToNowStrict } from 'date-fns'

const noop = () => {}

// A ghost is the real card, unchanged in colour and layout, rendered at its
// previous slot. The only differences (both inside Card, behind its `ghost`
// prop): its border becomes dotted, and one attribution line is appended —
// the mover's avatar + "<name> moved <when>". Inert: aria-hidden +
// pointer-events none, never in the DnD context.
export default function GhostCard({ card, moverName, moverColor, movedAt }) {
  if (!card) return null
  const when = movedAt ? formatDistanceToNowStrict(new Date(movedAt), { addSuffix: true }) : ''

  return (
    <div aria-hidden="true" style={{ pointerEvents: 'none' }} className="select-none">
      <Card card={card} onClick={noop} onComplete={noop} ghost={{ moverName, moverColor, when }} />
    </div>
  )
}
