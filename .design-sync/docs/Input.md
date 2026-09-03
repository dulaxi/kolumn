---
category: Primitives
---

Input — bordered text field: 1px default border, ink border on focus (no lime ring, no glow), copper border in error state.

## Props

- `error`: boolean — copper border on all states; pair with `<FieldError>` below the field.
- `leadingIcon`: node — a Phosphor icon rendered inside the field's left edge (input gets `pl-9`). Wrap sizing/positioning is handled; pass `size={16}` icons.
- `wrapperClassName`: class for the relative wrapper (only rendered when `leadingIcon` is set).
- All native input props (`placeholder`, `value`, `onChange`, `type`, `disabled`, …). `forwardRef` to the `<input>`.

## Usage

```jsx
<Input placeholder="Board name" value={name} onChange={(e) => setName(e.target.value)} />
<Input leadingIcon={<MagnifyingGlass size={16} />} placeholder="Search cards…" />
<Input error value={email} onChange={...} />
<FieldError>Enter a valid email address.</FieldError>
```

## Rules

- Focus is always the 1px ink border — never add a lime focus ring.
- Height is fixed at 36px (`h-9`); don't restyle per-surface.
