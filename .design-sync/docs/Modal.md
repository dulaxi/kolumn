---
category: Primitives
---

Modal — portal dialog with focus trap, body scroll lock, and stacked-modal awareness (only the topmost responds to Escape). No backdrop blur — just the dimmed ink overlay.

## Props

- `open`, `onClose` — controlled visibility. Exit animates; unmount is deferred.
- `contentClassName` — layout of the centering wrapper (default `flex items-center justify-center`). Put the panel itself as `children`: a `bg-[var(--surface-card)]` rounded-xl panel is the house style (10–12px radius, minimal shadow).
- `ariaLabel` / `ariaLabelledBy` / `ariaDescribedBy`, `role` (default `dialog`).
- Behavior switches: `lockScroll`, `trapFocus`, `dismissOnEscape`, `dismissOnOutside` (all default true), `initialFocusRef`, `disableInitialFocus`, `zIndex` (default 40 — pass 60+ only for a modal deliberately stacked on another), `animated`.

## Usage

```jsx
<Modal open={open} onClose={() => setOpen(false)} ariaLabel="Rename board">
  <div className="bg-[var(--surface-card)] rounded-xl p-5 w-[420px]">
    <h2 className="font-heading text-lg mb-3">Rename board</h2>
    <Input value={name} onChange={(e) => setName(e.target.value)} />
    <div className="flex justify-end gap-2 mt-4">
      <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={save}>Save</Button>
    </div>
  </div>
</Modal>
```

## Rules

- Backdrop is `rgba(27,27,24,0.45)` — never add blur.
- Popovers/menus/tooltips inside a modal already out-rank it (z-50 vs 40); don't bump z-indexes.
