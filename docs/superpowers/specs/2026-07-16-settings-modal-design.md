# Settings Modal — Design Spec

**Date:** 2026-07-16
**Status:** Approved (brainstorm complete)
**Replaces:** `src/pages/SettingsPage.jsx` (full-page settings)

## Summary

Replace the full-page `/settings` route with a claude.ai-style settings **modal**:
a centered two-pane dialog — left nav (search + section list), right content pane
built from a label-left / control-right row grammar with hairline dividers instead
of bordered cards. Opened from the sidebar profile block.

Reference: claude.ai settings dialog (user-provided DOM paste, 2026-07-16),
translated into Kolumn tokens and coherency rules — not copied verbatim.

## Shell

- New `SettingsModal` in `src/components/settings/`, built on the existing
  `Modal` primitive (portal, focus trap, body scroll lock, stacked-modal aware).
  `Modal` is extended to allow a custom two-pane body (no default padding/header).
- Sizing: `w-[calc(100vw-2rem)] max-w-[960px] h-[calc(100dvh-2rem)] max-h-[720px]`.
- 12px radius, standard dimmed ink overlay `rgba(27,27,24,0.45)`, **no backdrop
  blur** (coherency rule). Raised shadow token.
- Left pane: 192px fixed width, `--surface-sidebar` background, 1px right border
  (`--border-default`).
- Right pane: `--surface-card` background, `px-8`, vertically scrollable content,
  ghost close button (Phosphor `X`) pinned top-right.
- Closes on Escape and overlay click (Modal defaults).

## Left nav

- Top: search field (existing `Input` primitive, `MagnifyingGlass` leading icon,
  placeholder "Search").
- Below: caption label "Settings" (`text-xs`, `--text-muted`), then four items:

| Item    | Phosphor icon        |
|---------|----------------------|
| General | `Sliders`            |
| Profile | `User`               |
| Account | `IdentificationCard` |
| Data    | `Download`           |

- Item: 32px height, icon + label, 8px radius. Active item uses the same
  subtle-fill active treatment as the app sidebar. Inactive: `--text-secondary`,
  hover `--surface-hover`.
- **Search behavior (v1):** each section declares a keyword list (section title +
  row titles). Typing dims nav items whose keyword list has no substring match
  and auto-selects the first matching section. No cross-section row results.

## Row grammar (shared components)

Two small layout components, colocated in `src/components/settings/`:

- `SettingsSection` — section heading (`text-sm font-semibold`) + children
  wrapped in `divide-y` using `--border-subtle`. No card borders, no boxes.
- `SettingsRow` — flex row, `py-3`+: left column = title (`text-sm`,
  `--text-primary`) and optional description (`text-xs`, `--text-secondary`);
  right column = the control, shrink-0.

## Sections & rows

### General
- **Appearance** — 3-state `SegmentedControl`: System / Light / Dark.
- **Font** — 2-state `SegmentedControl`: Mona Sans / SF Mono (existing card
  typeface setting, unchanged semantics).

### Profile
- **Avatar** — preview circle (icon + color as today); clicking opens the
  existing `IconPicker`.
- **Display name** — `Input`, `w-56`, updates `profiles.display_name`.
- **Color** — existing `PROFILE_COLORS` swatch row.

### Account
- **Email** — read-only text from the auth user.
- **Plan** — capitalized `profile.tier` (`free | pro | team`).
- **Change password** — secondary button → existing update-password flow.
- **Sign out** — secondary button → `authStore` sign-out.

### Data
- **Export your data** — button; downloads boards/columns/cards JSON from live
  store state. Notes are **excluded** (feature unwired).
- **Import** and **Clear all data** are **deleted** — they operate on legacy
  localStorage keys the app no longer reads; Clear in particular looks
  destructive but leaves Supabase data untouched.

## New primitive: `SegmentedControl`

`src/components/ui/SegmentedControl.jsx`:

- Radiogroup semantics (`role="radiogroup"`, arrow-key navigation, one tab stop).
- Sliding thumb (translate transition; respect `prefers-reduced-motion`).
- Options: `{ value, label, icon? }`. Sizes: default (32px control height).
- Tokens only — track uses a subtle fill, thumb uses `--surface-card` with 1px
  `--border-default`; no lime fill (lime is a state color, not a control fill).
- Unit-tested like the other primitives.

## Theme store change

`settingsStore`:

- `theme: 'system' | 'light' | 'dark'` (was `'default' | 'dark'`).
- Migration: persisted `'default'` → `'light'` on load.
- `'system'` resolves via `matchMedia('(prefers-color-scheme: dark)')` with a
  live change listener; resolved value drives the existing `data-theme`
  attribute. Listener attaches once (store init or App effect) and detaches
  appropriately.

## Entry points & routing

- Sidebar bottom-left profile block (`display_name` + tier) opens the modal.
- The existing Settings nav item is **removed**.
- `/settings` route becomes a redirect: navigate to `/dashboard` with the modal
  open (navigation state or query flag), so old links don't 404.
- `SettingsPage.jsx` is deleted. Open/closed state lives in `AppLayout` (or a
  minimal UI slice) — not persisted.

## Testing

- Unit: `SegmentedControl` (selection, keyboard, a11y roles), theme migration
  (`'default'` → `'light'`, system resolution), `SettingsModal` (sections render,
  nav switches panes, search dims/auto-selects, export builds correct payload).
- Manual: dev server pass in light and dark themes; Escape/overlay close;
  `/settings` redirect; sign-out; profile edits reflected on cards.

## Out of scope

- Notifications / AI-preferences sections (nav scales later without redesign).
- Cross-section search results (needs a settings registry).
- Real "Clear all data" against Supabase.
- Billing/upgrade actions beyond displaying the tier.
