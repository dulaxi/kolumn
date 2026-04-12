# Card Redesign — "Refined Kanban" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the kanban card component to match Claude.ai's minimal design language — hairline borders, Claude-style icon container, quieter labels, plain-text metadata — while preserving all existing functionality.

**Architecture:** Pure styling changes to Card.jsx and a new label map export in formatting.js. No logic, props, or data shape changes. The card keeps its flex-row layout (icon-left, content-right) but every visual element gets quieter.

**Tech Stack:** React, Tailwind CSS v4, lucide-react icons

---

### Task 1: Add LABEL_BG_QUIET to formatting.js

**Files:**
- Modify: `src/utils/formatting.js`

- [ ] **Step 1: Add the LABEL_BG_QUIET export**

Add this after the existing `LABEL_BG` object (around line 9):

```js
export const LABEL_BG_QUIET = {
  red: 'bg-[var(--label-red-bg)]/60 text-[var(--label-red-text)]',
  blue: 'bg-[var(--label-blue-bg)]/60 text-[var(--label-blue-text)]',
  green: 'bg-[var(--label-green-bg)]/60 text-[var(--label-green-text)]',
  yellow: 'bg-[var(--label-yellow-bg)]/60 text-[var(--label-yellow-text)]',
  purple: 'bg-[var(--label-purple-bg)]/60 text-[var(--label-purple-text)]',
  pink: 'bg-[var(--label-pink-bg)]/60 text-[var(--label-pink-text)]',
  gray: 'bg-[var(--label-gray-bg)]/60 text-[var(--label-gray-text)]',
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/formatting.js
git commit -m "feat: add LABEL_BG_QUIET map with 60% opacity label backgrounds"
```

---

### Task 2: Restyle Card.jsx — container, icon, labels

**Files:**
- Modify: `src/components/board/Card.jsx`

This task covers the outer container, icon column, and labels row. We'll update the import, then restyle top-to-bottom.

- [ ] **Step 1: Update the import from formatting.js**

In `Card.jsx` line 8, change:

```js
import { LABEL_BG, PRIORITY_DOT, getAvatarColor, getInitials } from '../../utils/formatting'
```

to:

```js
import { LABEL_BG_QUIET, PRIORITY_DOT, getAvatarColor, getInitials } from '../../utils/formatting'
```

- [ ] **Step 2: Remove the AlignLeft import**

In `Card.jsx` line 3, change:

```js
import { Calendar, CheckSquare, AlignLeft, CheckCircle2, FileText } from 'lucide-react'
```

to:

```js
import { Calendar, CheckSquare, CheckCircle2, FileText } from 'lucide-react'
```

- [ ] **Step 3: Restyle the outer button container**

Replace the existing `<button>` className (lines 42-46):

```jsx
className={`w-full rounded-xl border shadow-sm transition-all text-left cursor-pointer flex focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 ${
  isSelected
    ? 'bg-[var(--accent-lime-wash)]/60 border-[var(--accent-lime-wash)]'
    : 'bg-[var(--surface-card)] border-[var(--border-default)] hover:shadow-md'
}`}
```

with:

```jsx
className={`w-full rounded-xl border-[0.5px] transition-all text-left cursor-pointer flex focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 group ${
  isSelected
    ? 'bg-[var(--accent-lime-wash)]/40 border-[var(--accent-lime)]'
    : 'bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]'
}`}
```

Key changes: `border-[0.5px]` hairline, no `shadow-sm` default, hover uses subtle shadow instead of `shadow-md`, added `group` class for child hover states, selected uses `border-[var(--accent-lime)]`.

- [ ] **Step 4: Restyle the icon column**

Replace the icon section (lines 49-57):

```jsx
<div className="flex items-center pl-3 shrink-0">
  <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-muted)]">
    {displayIcon ? (
      <DynamicIcon name={displayIcon} className="w-4 h-4" />
    ) : (
      <FileText className="w-4 h-4" />
    )}
  </div>
</div>
```

with:

```jsx
<div className="flex items-center pl-3 shrink-0">
  <div className="w-6 h-6 rounded-[6.48px] border-0.5 border-[var(--border-default)] bg-[var(--surface-card)] shadow-sm flex items-center justify-center">
    <div className="w-4 h-4 flex items-center justify-center">
      {displayIcon ? (
        <DynamicIcon name={displayIcon} className="w-4 h-4 text-[var(--text-muted)]" />
      ) : (
        <FileText className="w-4 h-4 text-[var(--text-faint)]" />
      )}
    </div>
  </div>
</div>
```

Key changes: `w-7 h-7` → `w-6 h-6`, gray background box → Claude-style container with `border-0.5 border-default shadow-sm`, 16px inner wrapper.

- [ ] **Step 5: Restyle the labels row**

Replace the labels section (lines 62-75):

```jsx
{labels?.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mb-2">
    {labels.map((label) => (
      <span
        key={`${label.text}-${label.color}`}
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          LABEL_BG[label.color] || LABEL_BG.gray
        }`}
      >
        {label.text}
      </span>
    ))}
  </div>
)}
```

with:

```jsx
{labels?.length > 0 && (
  <div className="flex flex-wrap gap-1 mb-1.5">
    {labels.map((label) => (
      <span
        key={`${label.text}-${label.color}`}
        className={`text-[9px] font-medium px-1.5 py-px rounded-md ${
          LABEL_BG_QUIET[label.color] || LABEL_BG_QUIET.gray
        }`}
      >
        {label.text}
      </span>
    ))}
  </div>
)}
```

Key changes: `text-[10px]` → `text-[9px]`, `font-semibold` → `font-medium`, `px-2 py-0.5` → `px-1.5 py-px`, `rounded-full` → `rounded-md`, `gap-1.5` → `gap-1`, `mb-2` → `mb-1.5`, `LABEL_BG` → `LABEL_BG_QUIET`.

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/board/Card.jsx
git commit -m "style: restyle card container, icon, and labels to Claude-minimal design"
```

---

### Task 3: Restyle Card.jsx — title area, metadata, assignee

**Files:**
- Modify: `src/components/board/Card.jsx`

- [ ] **Step 1: Restyle the title row (check circle, task number, priority dot)**

Replace the title row section (lines 78-94):

```jsx
<div className="flex items-center gap-1.5 mb-0.5">
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      if (onComplete) onComplete(card.id)
    }}
    aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
    className="shrink-0"
  >
    <CheckCircle2 className={`w-4 h-4 transition-colors ${completed ? 'text-[#A8BA32]' : 'text-[var(--text-muted)] hover:text-[#C2D64A]'}`} />
  </button>
  {taskNumber && (
    <span className="text-[11px] font-medium text-[var(--text-secondary)]">Task #{taskNumber}</span>
  )}
  <span className={`w-2 h-2 rounded-full ${priDot}`} title={priority} />
</div>
```

with:

```jsx
<div className="flex items-center gap-1.5 mb-0.5">
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      if (onComplete) onComplete(card.id)
    }}
    aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
    className="shrink-0"
  >
    <CheckCircle2 className={`w-3.5 h-3.5 transition-colors ${completed ? 'text-[#A8BA32]' : 'text-[var(--text-faint)] group-hover:text-[var(--text-muted)] hover:text-[#C2D64A]'}`} />
  </button>
  {taskNumber && (
    <span className="text-[10px] font-medium text-[var(--text-faint)]">#{taskNumber}</span>
  )}
  <span className={`w-1.5 h-1.5 rounded-full ${priDot}`} title={priority} />
</div>
```

Key changes: CheckCircle2 `w-4 h-4` → `w-3.5 h-3.5`, default color `text-muted` → `text-faint` with `group-hover:text-muted`, task number `text-[11px] text-secondary` → `text-[10px] text-faint`, prefix `Task #` → just `#`, priority dot `w-2 h-2` → `w-1.5 h-1.5`.

- [ ] **Step 2: Restyle the description preview**

Replace the description section (lines 100-104):

```jsx
{hasDescription && (
  <p className="text-[12px] text-[var(--text-muted)] leading-relaxed mt-1 line-clamp-2">
    {description}
  </p>
)}
```

with:

```jsx
{hasDescription && (
  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-1 line-clamp-2">
    {description}
  </p>
)}
```

Key change: `text-[12px]` → `text-[11px]`.

- [ ] **Step 3: Restyle the bottom metadata row**

Replace the entire bottom row section (lines 107-149):

```jsx
<div className="flex items-center justify-between gap-2 mt-2.5">
  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
    {dueDateObj && (
      <span
        className={`text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${
          isYesterday(dueDateObj) || (isPast(dueDateObj) && !isToday(dueDateObj))
            ? 'bg-[#F2D9C7] text-[#C27A4A]'
            : isToday(dueDateObj)
            ? 'bg-[#F5EDCF] text-[#D4A843]'
            : isTomorrow(dueDateObj)
            ? 'bg-[#EEF2D6] text-[#A8BA32]'
            : 'bg-[#EEF2D6] text-[#A8BA32]'
        }`}
      >
        <Calendar className="w-3 h-3" />
        {isToday(dueDateObj) ? 'Today' : isYesterday(dueDateObj) ? 'Yesterday' : isTomorrow(dueDateObj) ? 'Tomorrow' : format(dueDateObj, 'MMM d')}
      </span>
    )}

    {hasChecklist && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setChecklistOpen(!checklistOpen)
        }}
        className={`text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
          checkedCount === totalCount
            ? 'bg-[#EEF2D6] text-[#A8BA32]'
            : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:bg-[#E0DBD5]'
        }`}
      >
        <CheckSquare className="w-3 h-3" />
        {checkedCount}/{totalCount}
      </button>
    )}

    {hasDescription && (
      <span className="text-[10px] text-[var(--text-muted)] flex items-center">
        <AlignLeft className="w-3 h-3" />
      </span>
    )}
  </div>

  {/* Assignee avatar — bottom right */}
  {hasAssignee && (() => {
    const isMe = profile?.display_name && assignee.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
    const iconText = profile?.color === 'bg-[#8E8E89]' ? 'text-[#1B1B18]' : 'text-white'
    return isMe && profile.icon ? (
      <span
        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ${iconText} ${profile.color}`}
        title={assignee}
      >
        <DynamicIcon name={profile.icon} className="w-3.5 h-3.5" />
      </span>
    ) : (
      <span
        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(assignee)}`}
        title={assignee}
      >
        {getInitials(assignee)}
      </span>
    )
  })()}
</div>
```

with:

```jsx
<div className="flex items-center justify-between gap-2 mt-2">
  <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
    {dueDateObj && (
      <span
        className={`flex items-center gap-1 ${
          isYesterday(dueDateObj) || (isPast(dueDateObj) && !isToday(dueDateObj))
            ? 'text-[#C27A4A]'
            : isToday(dueDateObj)
            ? 'text-[#D4A843]'
            : ''
        }`}
      >
        <Calendar className="w-3 h-3" />
        {isToday(dueDateObj) ? 'Today' : isYesterday(dueDateObj) ? 'Yesterday' : isTomorrow(dueDateObj) ? 'Tomorrow' : format(dueDateObj, 'MMM d')}
      </span>
    )}

    {hasChecklist && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setChecklistOpen(!checklistOpen)
        }}
        className={`flex items-center gap-1 transition-colors ${
          checkedCount === totalCount
            ? 'text-[var(--accent-lime-dark)]'
            : 'hover:text-[var(--text-secondary)]'
        }`}
      >
        <CheckSquare className="w-3 h-3" />
        {checkedCount}/{totalCount}
      </button>
    )}
  </div>

  {/* Assignee avatar — bottom right */}
  {hasAssignee && (() => {
    const isMe = profile?.display_name && assignee.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
    const iconText = profile?.color === 'bg-[#8E8E89]' ? 'text-[#1B1B18]' : 'text-white'
    return isMe && profile.icon ? (
      <span
        className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${iconText} ${profile.color}`}
        title={assignee}
      >
        <DynamicIcon name={profile.icon} className="w-3 h-3" />
      </span>
    ) : (
      <span
        className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white ${getAvatarColor(assignee)}`}
        title={assignee}
      >
        {getInitials(assignee)}
      </span>
    )
  })()}
</div>
```

Key changes: All pill backgrounds removed — due dates and checklist are plain text with colored text only. AlignLeft description indicator removed. Assignee avatar `w-6 h-6` → `w-5 h-5`, text `text-[10px]` → `text-[9px]`, profile icon `w-3.5 h-3.5` → `w-3 h-3`. `mt-2.5` → `mt-2`.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Verify in browser**

Run the dev server (`npm run dev` if not running), navigate to a board with cards. Check:
- Cards render with hairline borders
- Icon shows in Claude-style container (border + shadow, no gray box)
- Labels are smaller, lighter
- Metadata has no colored pill backgrounds
- Hover shows subtle border darken + shadow
- Check circle is faint, brightens on card hover
- Completed cards show lime check + line-through title
- Expandable checklist still works

- [ ] **Step 6: Commit**

```bash
git add src/components/board/Card.jsx
git commit -m "style: restyle card title area, metadata, and assignee to Claude-minimal design"
```

---

### Task 4: Cleanup — remove comparison page and alternate spec

**Files:**
- Delete: `src/pages/CardCompare.jsx`
- Modify: `src/App.jsx` (remove route and import)
- Delete: `docs/superpowers/specs/2026-04-12-card-redesign-alt-design.md`

- [ ] **Step 1: Remove the CardCompare import and route from App.jsx**

In `src/App.jsx`, remove this line from the imports:

```js
const CardCompare = lazy(() => import('./pages/CardCompare'))
```

And remove this route:

```jsx
<Route path="/card-compare" element={<CardCompare />} />
```

- [ ] **Step 2: Delete the comparison page file**

```bash
rm src/pages/CardCompare.jsx
```

- [ ] **Step 3: Delete the alternate spec**

```bash
rm docs/superpowers/specs/2026-04-12-card-redesign-alt-design.md
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove card comparison page and alternate spec"
```
