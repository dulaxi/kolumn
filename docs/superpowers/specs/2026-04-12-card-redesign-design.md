# Card Redesign — "Refined Kanban"

Date: 2026-04-12
Branch: `card-style`
Scope: `src/components/board/Card.jsx` (primary), `src/pages/CardCompare.jsx` (temporary comparison, to be removed)

## Goal

Redesign the kanban card component to match Claude.ai's minimal design language while preserving kanban scannability. The card should feel quiet and refined — hairline borders, no heavy shadows, muted metadata — but still surface all the information needed at a glance on a busy board.

## Design Decisions (from brainstorming)

| Decision | Choice |
|----------|--------|
| Icon treatment | Keep icon, remove gray background box, use Claude-style container (border + shadow) |
| Card container | Hairline border, solid bg, subtle hover (no shadow jump) |
| Metadata style | Plain text with icons, color through text only (no pill backgrounds) |
| Labels | Keep colored pills but smaller, lighter (reduced opacity backgrounds) |
| Description indicator | Remove AlignLeft icon entirely |

## Specification

### Container (outer `<button>`)

**Default state:**
```
rounded-xl
border-[0.5px] border-[var(--border-subtle)]
bg-[var(--surface-card)]
transition-all
text-left cursor-pointer flex
```

**Hover:**
```
hover:border-[var(--border-default)]
hover:shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]
```

**Selected:**
```
border-[var(--accent-lime)]
bg-[var(--accent-lime-wash)]/40
```

**Focus:**
```
focus:outline-none
focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1
```

### Icon (left column)

Container: `w-6 h-6 rounded-[6.48px] border-0.5 border-[var(--border-default)] bg-[var(--surface-card)] shadow-sm flex items-center justify-center`

Inner icon wrapper: `w-4 h-4 flex items-center justify-center` (16px display container)
Icon color: `text-[var(--text-muted)]`

Fallback (no custom icon): `FileText` at same size, `text-[var(--text-faint)]`

Positioned with `pl-3 shrink-0`, vertically centered.

### Labels row

```
text-[9px] font-medium px-1.5 py-px rounded-md
```

Background colors use existing palette from `formatting.js` but at `/60` opacity:
- `bg-[var(--label-red-bg)]/60 text-[var(--label-red-text)]`
- Same pattern for all colors

Gap: `gap-1`, margin below: `mb-1.5`

### Title area

**Check circle:**
- Always visible (not hover-only)
- Default: `w-3.5 h-3.5 text-[var(--text-faint)]`
- Card hover: `group-hover:text-[var(--text-muted)]` with `transition-colors`
- Completed state: `text-[#A8BA32]`
- Hover on circle itself: `hover:text-[#C2D64A]`

**Task number:**
- `text-[10px] font-medium text-[var(--text-faint)]`
- Format: `#42` (drop the "Task " prefix)

**Priority dot:**
- `w-1.5 h-1.5 rounded-full` (down from w-2 h-2)
- Same color mapping: low=#A8BA32, medium=#D4A843, high=#C27A4A

**Title text:**
- `text-[13px] font-medium leading-snug text-[var(--text-primary)]`
- Completed: `text-[var(--text-muted)] line-through`

### Description preview

```
text-[11px] text-[var(--text-muted)] leading-relaxed mt-1 line-clamp-2
```

Down from 12px. Only shown when description exists and is non-empty.

### Bottom metadata row

No pill backgrounds. Plain text with small icons.

**Due date:**
- `Calendar` icon (w-3 h-3) + date text
- `text-[10px]` base size
- Overdue/yesterday: `text-[#C27A4A]` (copper)
- Today: `text-[#D4A843]` (honey)
- Tomorrow/future: `text-[var(--text-muted)]`

**Checklist counter:**
- `CheckSquare` icon (w-3 h-3) + `done/total`
- `text-[10px] text-[var(--text-muted)]`
- All complete: `text-[var(--accent-lime-dark)]`

**Description indicator:** Removed. No AlignLeft icon.

Gap between metadata items: `gap-2`

### Assignee avatar

- `w-5 h-5 rounded-full` (down from w-6 h-6)
- Text: `text-[9px] font-bold text-white`
- Same avatar color mapping from `formatting.js`
- Profile icon variant: same sizing, `w-3 h-3` icon inside

### Expandable checklist

No changes to behavior. Visual tweaks:
- Progress bar height stays `h-1`
- Same lime colors for completion state

## What's NOT changing

- Card data shape / props interface
- Drag and drop behavior (SortableCard wrapper)
- Checklist expand/toggle logic
- Click handlers (onClick, onComplete)
- Font override for sf-mono setting
- All business logic in Card.jsx

## Files to modify

1. `src/components/board/Card.jsx` — apply all styling changes
2. `src/utils/formatting.js` — add `LABEL_BG_QUIET` export with `/60` opacity variants

## Cleanup

- Remove `src/pages/CardCompare.jsx` after redesign is confirmed
- Remove `/card-compare` route from `App.jsx`
