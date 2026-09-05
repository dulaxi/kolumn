// Button — ink for affirmative, red for destructive; no lime button fill.
import { Button } from 'kolumn'
import { Plus, PencilSimple, Trash } from '@phosphor-icons/react'

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }

export const Variants = () => (
  <div style={row}>
    <Button variant="primary">New board</Button>
    <Button variant="secondary">Cancel</Button>
    <Button variant="ghost">Skip for now</Button>
    <Button variant="destructive">Delete card</Button>
  </div>
)

export const Sizes = () => (
  <div style={row}>
    <Button size="sm">Add column</Button>
    <Button size="md">Save changes</Button>
    <Button size="lg">Create workspace</Button>
  </div>
)

export const IconButtons = () => (
  <div style={row}>
    <Button variant="secondary" size="icon-sm" aria-label="Add">
      <Plus size={14} />
    </Button>
    <Button variant="secondary" size="icon-md" aria-label="Edit">
      <PencilSimple size={16} />
    </Button>
    <Button variant="destructive" size="icon-lg" aria-label="Delete">
      <Trash size={18} />
    </Button>
  </div>
)

export const States = () => (
  <div style={row}>
    <Button disabled>Save changes</Button>
    <Button loading>Saving</Button>
    <Button variant="secondary" loading loadingText="Inviting">
      Invite member
    </Button>
  </div>
)
