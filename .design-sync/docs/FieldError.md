---
category: Primitives
---

FieldError — the micro tier of the error grammar: a single-input validation line. Mono 11px + 13px warning icon, no box. Pairs with `Input`'s `error` prop (copper border).

## Props

- `children`: the message. Renders nothing when falsy — safe to always include below a field.
- Spreads native props/className onto the `<p role="alert">`.

## Usage

```jsx
<Input error={!!emailError} value={email} onChange={...} />
<FieldError>{emailError}</FieldError>
```

## Rules

- One field, one line — a boxed banner under a single field outweighs the field (that's `InlineNotice`'s job, for form-level errors).
