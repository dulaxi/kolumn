# Kolumn conventions (read before building)

Kolumn is a kanban + AI-chat app. Restrained, claude.ai-style surfaces: cream/ink palette, lime as a *state* accent, 1px borders, 8–12px radii, minimal shadows.

## Setup

- No global provider is required — tokens, fonts, and component styles all come from `styles.css`.
- **`ChatMessage` must be wrapped in `MemoryRouter`** (exported from the bundle) — it renders router `<Link>`s and throws without one: `<MemoryRouter><ChatMessage message={…} /></MemoryRouter>`. Nothing else needs wrapping.

## Styling idiom

- Components style themselves via their props — prefer props over custom classes.
- For your own layout glue, use **inline styles with the design tokens**: `style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 12 }}`. The shipped stylesheet is compiled Tailwind that contains **only the utility classes the app itself uses** — an arbitrary Tailwind class you invent may silently not exist, so don't rely on utility classes you haven't seen in the shipped CSS.
- Token families (all defined in `styles.css`): surfaces `--surface-{page,card,raised,hover,sidebar}`; borders `--border-{default,subtle,focus}`; text `--text-{primary,secondary,muted,faint}`; accents `--accent-lime`, `--accent-lime-wash`; palette `--color-{cream,sand,ink,stone,mist,lime,copper,honey,red,mauve-wash,…}`; fonts `--font-{sans,heading,mono,logo}` (Inter / Clash Grotesk / IBM Plex Mono).
- **Icons**: use the bundled Phosphor icon font — `<i className="ph ph-plus" />` (regular) or `<i className="ph-fill ph-cube" />` (fill), kebab-case names, sized via `fontSize`. There are no icon component exports.

## Color rules (the ones that make it look like Kolumn)

- Affirmative buttons are **ink** (`variant="primary"`), destructive are **red** (`variant="destructive"`). There is deliberately **no lime button** — lime marks state: selection, success washes, badges.
- Copper = failure (errors), honey = warning/time (overdue), red = destructive intent. Don't swap them.
- Radii: 8px controls, 10–12px panels/modals — except kanban `Card`, which is deliberately 16px.

## Data shapes

- `Card` takes DB snake_case fields: `due_date`, `assignee_name`, `assignees`, `checklist: [{text, done}]`, `priority: 'low'|'medium'|'high'` — never camelCase.

## Where the truth lives

- `styles.css` (imports the compiled app CSS + fonts) — read it before inventing any class or token.
- Each component's `.prompt.md` carries its API, a usage snippet, and its do/don't rules.

## Idiomatic example

```jsx
const { Button, Input, FieldError, Card } = window.Kolumn
<div style={{ background: 'var(--surface-page)', padding: 24, fontFamily: 'var(--font-sans)' }}>
  <Input error={!!err} placeholder="Board name" leadingIcon={<i className="ph ph-magnifying-glass" />} />
  <FieldError>{err}</FieldError>
  <Button onClick={create}>New board</Button>
  <Card card={{ id: 'c1', title: 'Fix onboarding drop-off', priority: 'high', due_date: '2026-08-12', checklist: [{ text: 'Reproduce', done: true }] }} onClick={open} />
</div>
```
