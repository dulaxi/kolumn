---
category: Primitives
---

InlineNotice — the persistent ("wash") tier of the error grammar: mono 12px text, 18px Phosphor icon, 1px border, 10px radius, quiet wash fill. Sits in the layout until resolved; transient messages use toasts instead.

## Props

- `variant`: `'info' | 'error' | 'warn' | 'danger' | 'success'` (default `info`). Hue = meaning: copper wash = failure, honey wash = warning/time, red wash = destructive consequence, lime wash = success. `error`/`danger` get `role="alert"`.
- `icon`: node to replace the default variant icon, or `false` for none.
- `action`: node rendered after the text — typically a small ghost Button ("Retry").
- `onDismiss`: shows a trailing X.

## Usage

```jsx
<InlineNotice variant="error" action={<Button variant="ghost" size="sm" onClick={retry}>Retry</Button>}>
  Couldn't sync your board — check your connection.
</InlineNotice>
<InlineNotice variant="warn">3 cards are overdue on this board.</InlineNotice>
```

## Rules

- Solid fills are reserved for transient toasts; a notice always uses the wash tier.
- For a single input's validation message use `FieldError` (the micro tier), not a notice.
