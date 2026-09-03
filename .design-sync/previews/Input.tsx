// Input — bordered field, leading-icon + error states. 1px ink focus border
// (not statically renderable), sand→mist hover, copper error border.
import { Input } from 'kolumn'
import { MagnifyingGlass, Tag, EnvelopeSimple } from '@phosphor-icons/react'

const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 }

export const Basic = () => (
  <div style={stack}>
    <Input placeholder="Board name" defaultValue="Q3 Product Launch" />
    <Input placeholder="Card title" />
  </div>
)

export const WithLeadingIcon = () => (
  <div style={stack}>
    <Input leadingIcon={<MagnifyingGlass size={16} />} placeholder="Search cards, boards, and chats" />
    <Input leadingIcon={<Tag size={16} />} placeholder="Add a label" defaultValue="design-review" />
    <Input leadingIcon={<EnvelopeSimple size={16} />} placeholder="teammate@kolumn.app" />
  </div>
)

export const ErrorAndDisabled = () => (
  <div style={stack}>
    <Input error defaultValue="taken-workspace-slug" />
    <Input disabled defaultValue="marcus.webb@kolumn.app" />
  </div>
)
