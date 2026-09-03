// FieldError — micro tier of the error grammar: mono 11px line + 13px icon,
// no box. Pairs with Input's own error border. Self-guards on falsy children.
import { Input, FieldError } from 'kolumn'

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', maxWidth: 280 }
const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 }

export const WithInput = () => (
  <div style={field}>
    <Input error defaultValue="taken-workspace-slug" />
    <FieldError>That workspace slug is already taken.</FieldError>
  </div>
)

export const Messages = () => (
  <div style={stack}>
    <FieldError>Card title can&apos;t be empty.</FieldError>
    <FieldError>Enter a valid email address.</FieldError>
    <FieldError>Due date must be after the start date.</FieldError>
  </div>
)

export const EmptyGuard = () => (
  <div style={field}>
    <Input defaultValue="Design review checklist" />
    <FieldError>{null}</FieldError>
  </div>
)
