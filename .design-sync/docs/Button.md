---
category: Primitives
---

Button — every affirmative action is ink, every destructive action is red; there is deliberately no lime button.

## Props

- `variant`: `'primary' | 'secondary' | 'ghost' | 'destructive'` (default `primary`). Primary = ink fill; secondary = cream fill + 1px sand border; ghost = transparent; destructive = red fill (reserve for delete/remove/leave).
- `size`: `'sm' | 'md' | 'lg' | 'xl' | 'icon-sm' | 'icon-md' | 'icon-lg'` (default `md`). `icon-*` are square; pass a single Phosphor icon as the child and an `aria-label`.
- `loading`: replaces the label with a letter-wave animation; the button stays full-strength and non-interactive. `loadingText` swaps the label while loading (e.g. "Saving").
- `disabled`, `asChild` (Slot pattern — style an `<a>`/`<Link>` child as a button), plus all native button props. Defaults to `type="button"`.

## Usage

```jsx
<Button onClick={save}>Save changes</Button>
<Button variant="secondary" onClick={close}>Cancel</Button>
<Button variant="destructive" loading={deleting} loadingText="Deleting">Delete board</Button>
<Button variant="secondary" size="icon-md" aria-label="Edit"><PencilSimple size={16} /></Button>
```

## Rules

- Never fill a button with lime — lime is a state color (selection, success), not an action color.
- Copper means failure, red means destructive intent; don't swap them.
