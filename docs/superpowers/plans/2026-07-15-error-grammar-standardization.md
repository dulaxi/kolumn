# Error Grammar Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize every persistent error surface on the toast grammar (mono 12px, 18px Phosphor icon, 1px border, 10px radius) in three weights — wash banner, micro field error, and the existing solid toast — plus red destructive semantics and an offline-as-persistent-toast rework.

**Architecture:** Extend the existing `InlineNotice` primitive (wash tier) with proper wash fills, default icons, `warn`/`danger` variants, and an `action` slot; add a new `FieldError` primitive (micro tier); migrate seven hand-rolled auth banners, two field errors, the Settings destructive confirm, the chat stream-error rendering, and `InlineErrorBoundary` onto them. `Button variant="destructive"` migrates copper→red app-wide. `OfflineBanner` becomes a headless watcher driving a new persistent `showToast.offline` toast.

**Tech Stack:** React 19, Tailwind v4 (`@theme` tokens in `src/index.css`), `@phosphor-icons/react`, `react-hot-toast`, Vitest + Testing Library.

**Design decisions (locked with user, 2026-07-15):** mockups `docs/design-mockups/error-style-decisions.html` (round 1: picks 1C, 2C, 4C, 5B, surface 7 unchanged) and `error-style-decisions-2.html` (round 2: picks 3:R2, 6:O2).

## Global Constraints

- **Colors: tokens only.** No new hex codes outside `src/index.css`. Red comes from `--label-red-*` (exists) plus new `--color-red` / `--color-red-dark` / `--notice-error-text` / `--notice-warn-text` tokens added in Task 1.
- **Icons: Phosphor only** (`@phosphor-icons/react` in components; `ph ph-*` webfont classes inside `src/utils/toast.js`, matching its existing pattern).
- **Toasts always via `showToast.*`** from `src/utils/toast.js`.
- **Grammar spec (wash tier):** `font-mono text-[12px]`, 1px solid border, `rounded-[10px]`, 18px icon, `role="alert"` for error/danger. **Micro tier:** `font-mono text-[11px]`, 13px icon, no box.
- **The full-page `ErrorBoundary.jsx` is intentionally NOT touched** (locked decision: page states keep their layout).
- **Do not touch** `supabase/functions/**` or `src/lib/aiClient.js` in this plan — backend error-shape fixes are a separate backlog item.
- Commits: conventional with scope, e.g. `feat(ui):`, `style(ui):`, `refactor(chat):`.
- Verify: `npm run test` (Vitest single run), `npm run build`, `npm run lint`.

---

### Task 1: Tokens + keyframes in `src/index.css`

**Files:**
- Modify: `src/index.css` (three places: `@theme` raw palette block near line 24; light `:root` block near line 92; dark block near line 156; keyframes near line 272)

**Interfaces:**
- Produces CSS custom properties consumed by later tasks: `--color-red`, `--color-red-dark` (theme-stable, like `--color-copper`), `--notice-error-text`, `--notice-warn-text` (theme-switched), and class `toast-pulse-dot`.

- [ ] **Step 1: Add raw red palette tokens to the `@theme` block**

Locate the raw palette block (contains `--color-copper: #C27A4A;` around line 24) and add directly after `--color-copper-wash`:

```css
  --color-red: #B53333;
  --color-red-dark: #9C2929;
```

These are deliberately NOT overridden in dark mode — same policy as `--color-copper` (see the existing comment near line 199 about saturated tones that read on both surfaces).

- [ ] **Step 2: Add notice text tokens to the light block**

In the light `:root` / `[data-theme="light"]` section, next to the `--label-red-*` line (~line 92), add:

```css
  --notice-error-text: #A86434;  /* copper-dark: AA-safe on copper-wash + card */
  --notice-warn-text: #8A6B1F;   /* dark honey: readable on honey-wash */
```

- [ ] **Step 3: Add notice text tokens to the dark block**

In the dark section, next to the dark `--label-red-*` line (~line 156), add:

```css
  --notice-error-text: #D89A6E;
  --notice-warn-text: #D4B86A;
```

- [ ] **Step 4: Add the offline pulse dot**

Next to the existing `@keyframes` cluster (~line 272), add:

```css
@keyframes toast-pulse {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 0.25; }
}
.toast-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  animation: toast-pulse 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .toast-pulse-dot { animation: none; }
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: builds with no CSS errors.

- [ ] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "feat(ui): red + notice-text tokens and offline pulse keyframe"
```

---

### Task 2: Upgrade `InlineNotice` — wash fills, default icons, warn/danger variants, action slot

**Files:**
- Modify: `src/components/ui/InlineNotice.jsx` (whole file, 47 lines)
- Test: `src/__tests__/InlineNotice.test.jsx` (extend existing)

**Interfaces:**
- Produces: `InlineNotice({ variant: 'info'|'error'|'warn'|'danger'|'success', icon?: ReactNode|false, action?: ReactNode, onDismiss?: fn, children, className })`. Default export unchanged. Existing consumers (`QuickAddBar` error/info, `AppLayout` success) keep working — `error` just gains the wash fill + default icon.

- [ ] **Step 1: Write failing tests** (append to `src/__tests__/InlineNotice.test.jsx`, keeping existing tests)

```jsx
describe('InlineNotice grammar upgrade', () => {
  it('error variant uses copper wash + default icon + role=alert', () => {
    const { container } = render(<InlineNotice variant="error">Nope</InlineNotice>)
    const notice = screen.getByRole('alert')
    expect(notice.className).toContain('bg-[var(--color-copper-wash)]')
    expect(notice.className).toContain('text-[var(--notice-error-text)]')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('danger variant uses label-red tokens and role=alert', () => {
    render(<InlineNotice variant="danger">Careful</InlineNotice>)
    const notice = screen.getByRole('alert')
    expect(notice.className).toContain('bg-[var(--label-red-bg)]')
    expect(notice.className).toContain('border-[var(--label-red-text)]')
  })

  it('warn variant uses honey wash and role=status', () => {
    render(<InlineNotice variant="warn">Heads up</InlineNotice>)
    const notice = screen.getByRole('status')
    expect(notice.className).toContain('bg-[var(--color-honey-wash)]')
  })

  it('icon={false} suppresses the default icon', () => {
    const { container } = render(<InlineNotice variant="error" icon={false}>Nope</InlineNotice>)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders an action node after the message', () => {
    render(<InlineNotice variant="error" action={<button>Retry</button>}>Nope</InlineNotice>)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests, verify the new ones fail**

Run: `npx vitest run src/__tests__/InlineNotice.test.jsx`
Expected: new tests FAIL (wash classes / icons / action not present); pre-existing tests PASS.

- [ ] **Step 3: Replace `src/components/ui/InlineNotice.jsx` with:**

```jsx
import { X, WarningCircle, Warning, Info, CheckCircle } from '@phosphor-icons/react'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

const VARIANTS = {
  info: 'border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--surface-card)]',
  error: 'border-[var(--color-copper)] text-[var(--notice-error-text)] bg-[var(--color-copper-wash)]',
  warn: 'border-[var(--color-honey)] text-[var(--notice-warn-text)] bg-[var(--color-honey-wash)]',
  danger: 'border-[var(--label-red-text)] text-[var(--label-red-text)] bg-[var(--label-red-bg)]',
  success: 'border-[var(--color-lime)] bg-[var(--accent-lime-wash)] text-[var(--text-primary)]',
}

const DEFAULT_ICONS = {
  info: Info,
  error: WarningCircle,
  warn: Warning,
  danger: Warning,
  success: CheckCircle,
}

/**
 * InlineNotice — the persistent ("wash") tier of the app-wide error
 * grammar (see docs/design-mockups/error-style-decisions.html). Shares
 * the showToast.* anatomy — mono 12px, 18px Phosphor icon, 1px border,
 * 10px radius — with a quieter wash fill because it sits in the layout
 * until resolved. Solid fills stay exclusive to transient toasts.
 *
 * <InlineNotice variant="error" onDismiss={() => setError(null)}>
 *   Something went wrong.
 * </InlineNotice>
 */
export default function InlineNotice({
  variant = 'info',
  icon,
  action,
  onDismiss,
  children,
  className = '',
}) {
  const DefaultIcon = DEFAULT_ICONS[variant] || Info
  const iconNode = icon === false ? null : icon ?? <DefaultIcon size={18} className="shrink-0 mt-px" />
  const isAlert = variant === 'error' || variant === 'danger'

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      className={mergeClassNames(
        'rounded-[10px] border px-3.5 py-2.5 font-mono text-[12px] leading-relaxed flex items-start gap-2.5',
        VARIANTS[variant] || VARIANTS.info,
        className,
      )}
    >
      {iconNode}
      <span className="flex-1 whitespace-pre-wrap break-words">{children}</span>
      {action}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 -mr-1 -mt-0.5 p-0.5 leading-none opacity-70 hover:opacity-100 cursor-pointer"
        >
          <X size={13} weight="bold" />
        </button>
      )}
    </div>
  )
}
```

Note: the old `shadow-[var(--shadow-raised)]` is intentionally dropped — shadow implies "floating", which is the solid/transient tier's trait. If the removal visibly regresses QuickAddBar, re-add via that call site's `className`, not here.

- [ ] **Step 4: Run the full test file**

Run: `npx vitest run src/__tests__/InlineNotice.test.jsx`
Expected: ALL PASS. If a pre-existing test asserts the old `bg-[var(--surface-card)]` on `error` or the shadow class, update that assertion to the new wash classes — the visual change is the point of this task.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/InlineNotice.jsx src/__tests__/InlineNotice.test.jsx
git commit -m "feat(ui): InlineNotice wash grammar — icons, warn/danger variants, action slot"
```

---

### Task 3: New `FieldError` primitive (micro tier)

**Files:**
- Create: `src/components/ui/FieldError.jsx`
- Test: `src/__tests__/FieldError.test.jsx`

**Interfaces:**
- Produces: `FieldError({ children, className })` — default export. Renders `null` when `children` is falsy so call sites can write `<FieldError>{error}</FieldError>` without a guard.

- [ ] **Step 1: Write failing test** (`src/__tests__/FieldError.test.jsx`)

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FieldError from '../components/ui/FieldError'

describe('FieldError', () => {
  it('renders message with alert role, mono micro styling, and icon', () => {
    const { container } = render(<FieldError>Already invited</FieldError>)
    const el = screen.getByRole('alert')
    expect(el).toHaveTextContent('Already invited')
    expect(el.className).toContain('font-mono')
    expect(el.className).toContain('text-[11px]')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders nothing when children is falsy', () => {
    const { container } = render(<FieldError>{''}</FieldError>)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/__tests__/FieldError.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/ui/FieldError.jsx`**

```jsx
import { WarningCircle } from '@phosphor-icons/react'

/**
 * FieldError — the micro tier of the error grammar: a single-input
 * validation message. Mono 11px + 13px icon, no box (a boxed banner
 * under one field outweighs the field itself). Pairs with the input's
 * own error border (Input error prop / copper border).
 */
export default function FieldError({ children, className = '' }) {
  if (!children) return null
  return (
    <p
      role="alert"
      className={`flex items-center gap-1.5 font-mono text-[11px] text-[var(--notice-error-text)] mt-1.5 ${className}`}
    >
      <WarningCircle size={13} className="shrink-0" />
      <span>{children}</span>
    </p>
  )
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run src/__tests__/FieldError.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/FieldError.jsx src/__tests__/FieldError.test.jsx
git commit -m "feat(ui): FieldError — micro tier of the error grammar"
```

---

### Task 4: Button destructive variant copper → red

**Files:**
- Modify: `src/components/ui/Button.jsx:28-29`
- Modify: `CLAUDE.md` (Coherency Rules → button colors line)
- Test: `src/__tests__/Button.test.jsx` (extend)

**Interfaces:**
- Consumes: `--color-red` / `--color-red-dark` from Task 1.
- No API change. All three call sites (`SettingsPage.jsx:319`, `src/components/board/ConfirmModal.jsx:27`, `src/components/workspace/WorkspaceDangerZone.jsx:27`) pick the new color up automatically.

- [ ] **Step 1: Write failing test** (append to `src/__tests__/Button.test.jsx`)

```jsx
it('destructive variant uses red, not copper', () => {
  render(<Button variant="destructive">Delete</Button>)
  const btn = screen.getByRole('button', { name: 'Delete' })
  expect(btn.className).toContain('bg-[var(--color-red)]')
  expect(btn.className).not.toContain('copper')
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/__tests__/Button.test.jsx`
Expected: the new test FAILS (still copper).

- [ ] **Step 3: Edit `src/components/ui/Button.jsx`** — replace the destructive entry:

```js
  destructive:
    'bg-[var(--color-red)] text-white hover:bg-[var(--color-red-dark)]',
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/__tests__/Button.test.jsx`
Expected: ALL PASS.

- [ ] **Step 5: Update the coherency rule in `CLAUDE.md`**

Find the line under Coherency Rules:

```
- **Buttons: ink primary, lime accent for create/save/positive, copper for destructive.**
```

Replace with:

```
- **Buttons: ink primary, lime accent for create/save/positive, red (`--color-red`) for destructive.** Copper now exclusively means *failure* (errors); red means *destructive intent* (deletes, irreversible actions). Decision: docs/design-mockups/error-style-decisions-2.html (R2).
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Button.jsx src/__tests__/Button.test.jsx CLAUDE.md
git commit -m "feat(ui): destructive buttons go red — copper now means failure only"
```

---

### Task 5: Migrate the seven auth banners to `InlineNotice`

**Files:**
- Modify: `src/pages/LandingPage.jsx:1373`
- Modify: `src/pages/OnboardingPage.jsx:343, 454, 922, 1068`
- Modify: `src/pages/ForgotPasswordPage.jsx:59`
- Modify: `src/pages/UpdatePasswordPage.jsx:51`

**Interfaces:**
- Consumes: `InlineNotice` from Task 2. Import path from `src/pages/*`: `../components/ui/InlineNotice`.

No new unit tests — these are 1:1 markup swaps; behavior is covered visually in Step 4 and by the build.

- [ ] **Step 1: LandingPage + Onboarding translucent banners (5 sites)**

Each site wraps `{error}` (or equivalent state) in a div with this exact class string:

```
text-sm text-[var(--color-copper)] bg-[var(--color-copper-wash)]/60 border border-[var(--color-copper)]/30 rounded-xl px-3 py-2.5
```

(Onboarding:922 adds `w-full … text-center`; Onboarding:1068 adds `max-w-md w-full`.)

For each, replace the whole div with:

```jsx
<InlineNotice variant="error">{error}</InlineNotice>
```

carrying over layout-only classes via `className` where present: Onboarding:922 → `className="w-full"` (drop `text-center` — icon + left-aligned text is the grammar), Onboarding:1068 → `className="max-w-md w-full"`. Add `import InlineNotice from '../components/ui/InlineNotice'` to both files.

- [ ] **Step 2: ForgotPasswordPage:59 and UpdatePasswordPage:51 (2 sites)**

Both use:

```jsx
<div className="text-sm text-[var(--color-copper)] bg-[var(--color-copper-wash)] rounded-xl px-3 py-2">
  {error}
</div>
```

Replace with:

```jsx
<InlineNotice variant="error">{error}</InlineNotice>
```

and add the import to both files.

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: clean. Lint will flag any now-unused imports — remove them.

- [ ] **Step 4: Visual check**

Run `npm run dev`, open `http://localhost:5173`. Trigger a failed sign-in on the landing page (wrong password) and the reset-password validation ("Passwords do not match") and confirm the wash banner with icon renders in both light and dark themes.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LandingPage.jsx src/pages/OnboardingPage.jsx src/pages/ForgotPasswordPage.jsx src/pages/UpdatePasswordPage.jsx
git commit -m "style(auth): auth error banners adopt the InlineNotice wash grammar"
```

---

### Task 6: Field-level errors → `FieldError`

**Files:**
- Modify: `src/components/board/BoardShareModal.jsx:218-220`
- Modify: `src/pages/OnboardingPage.jsx:498`

**Interfaces:**
- Consumes: `FieldError` from Task 3. Import paths: `../ui/FieldError` (from `components/board/`), `../components/ui/FieldError` (from `pages/`).

- [ ] **Step 1: BoardShareModal** — replace

```jsx
{error && (
  <p className="text-xs text-[var(--color-copper)] mt-1.5">{error}</p>
)}
```

with

```jsx
<FieldError>{error}</FieldError>
```

(FieldError self-guards on falsy children.) Add the import.

- [ ] **Step 2: OnboardingPage:498** — replace

```jsx
<p className="text-xs text-[var(--color-copper)] mt-1.5">Passwords don&rsquo;t match yet.</p>
```

with

```jsx
<FieldError>Passwords don&rsquo;t match yet.</FieldError>
```

Add the import (file already imports InlineNotice from Task 5 — keep both).

- [ ] **Step 3: Build + visual check**

Run: `npm run build`, then in the dev server open a board → Share, submit a duplicate invite email, confirm the mono micro error with 13px icon under the input.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/BoardShareModal.jsx src/pages/OnboardingPage.jsx
git commit -m "style(ui): field-level errors adopt the FieldError micro grammar"
```

---

### Task 7: Settings destructive confirm → `danger` InlineNotice

**Files:**
- Modify: `src/pages/SettingsPage.jsx:309-327`

**Interfaces:**
- Consumes: `InlineNotice` (`danger` variant, Task 2); red destructive Button (Task 4, no code change here).

- [ ] **Step 1: Replace the confirm block.** Current code (SettingsPage.jsx:309-327):

```jsx
{confirmingClear && (
  <div className="bg-[var(--color-copper-wash)]/40 border border-[var(--color-copper)]/40 rounded-xl p-5 mb-4">
    <div className="flex items-center gap-2 mb-2">
      <Warning className="w-4 h-4 text-[var(--color-copper)]" />
      <h2 className="text-sm font-semibold text-[var(--color-copper)]">Confirm — this cannot be undone</h2>
    </div>
    <p className="text-sm text-[var(--text-secondary)] mb-4">
      Permanently delete all your boards, notes, and settings.
    </p>
    <div className="flex items-center gap-2">
      <Button variant="destructive" onClick={handleClearData}>
        Yes, delete everything
      </Button>
      <Button variant="secondary" onClick={() => setConfirmingClear(false)}>
        Cancel
      </Button>
    </div>
  </div>
)}
```

Replace with:

```jsx
{confirmingClear && (
  <div className="mb-4 flex flex-col gap-3">
    <InlineNotice variant="danger">
      <strong className="block font-semibold">Confirm — this cannot be undone</strong>
      <span className="text-[var(--text-secondary)]">
        Permanently delete all your boards, notes, and settings.
      </span>
    </InlineNotice>
    <div className="flex items-center gap-2">
      <Button variant="destructive" onClick={handleClearData}>
        Yes, delete everything
      </Button>
      <Button variant="secondary" onClick={() => setConfirmingClear(false)}>
        Cancel
      </Button>
    </div>
  </div>
)}
```

Add `import InlineNotice from '../components/ui/InlineNotice'`. If `Warning` from `@phosphor-icons/react` is now unused in this file, remove it from the import list (lint will confirm).

- [ ] **Step 2: Build + visual check**

Run: `npm run build`, then Settings → Clear all data. Confirm: red wash banner (label-red tokens), red "Yes, delete everything" button, both themes.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SettingsPage.jsx
git commit -m "style(settings): clear-data confirm adopts the danger grammar (red)"
```

---

### Task 8: Chat stream errors → structured error + InlineNotice

**Files:**
- Modify: `src/store/chatStore.js:117-134` (onError) + add `friendlyChatError` export near the top of the file
- Modify: `src/components/chat/ChatMessage.jsx` (render the error block)
- Test: `src/__tests__/chatStore.test.js` (extend)

**Interfaces:**
- Produces: `friendlyChatError(raw: unknown) → { message: string, isLimit: boolean }` (named export from `chatStore.js`); message objects gain an optional `error: { message, isLimit }` field (persisted — plain JSON, safe for the zustand `persist` partialize).
- Consumes: `InlineNotice` from Task 2, `logError` from `src/utils/logger.js`.

> **Learn-by-Doing checkpoint:** the executor should implement the plumbing below but leave `friendlyChatError`'s bucketing as a `TODO(human)` and ask the user to write the raw-error → copy mapping (which raw strings get which friendly copy). Raw inputs that can reach it from `aiClient.js`: the rate-limit message (contains "daily limit"), `Not authenticated`, `No response stream`, `Error <status>: <body>`, `Claude API error: <status> <body>`, `Stream error: <msg>`, network `err.message`.

- [ ] **Step 1: Write failing tests** (append to `src/__tests__/chatStore.test.js`, following that file's existing setup/mocks)

```js
import { friendlyChatError } from '../store/chatStore'

describe('friendlyChatError', () => {
  it('flags daily-limit errors and keeps the server copy', () => {
    const res = friendlyChatError("You've reached your daily limit of 20 messages. Upgrade to Pro for unlimited access.")
    expect(res.isLimit).toBe(true)
    expect(res.message).toMatch(/daily limit/i)
  })

  it('never passes raw wire errors through', () => {
    const res = friendlyChatError('Claude API error: 529 {"type":"error","error":{"type":"overloaded_error"}}')
    expect(res.isLimit).toBe(false)
    expect(res.message).not.toContain('529')
    expect(res.message).not.toContain('{')
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/__tests__/chatStore.test.js`
Expected: FAIL — `friendlyChatError` not exported.

- [ ] **Step 3: Add `friendlyChatError` to `src/store/chatStore.js`** (top level, before the store; add `import { logError } from '../utils/logger'` to the imports)

```js
/**
 * Maps a raw stream/HTTP error string to user-facing copy.
 * Raw detail must never reach the UI — it goes to logError instead.
 */
export function friendlyChatError(raw) {
  const s = String(raw)
  if (/daily limit/i.test(s)) return { message: s, isLimit: true }
  // TODO(human): bucket the remaining raw errors (auth, overloaded/5xx,
  // network) into friendly copy; fall through to a generic line.
  return { message: 'Claude hit a snag — try sending that again.', isLimit: false }
}
```

- [ ] **Step 4: Learn-by-Doing — pause and request the human mapping** for the TODO(human) body, then incorporate it.

- [ ] **Step 5: Rewire `onError` in `sendMessage`** (currently chatStore.js:117-134). Replace with:

```js
onError: (error) => {
  logError('[chatStore] stream error:', error)
  const friendly = friendlyChatError(error)
  set((s) => ({
    streamingConversationId: null,
    messages: {
      ...s.messages,
      [conversationId]: s.messages[conversationId].map((m) =>
        m.id === msgId ? { ...m, error: friendly } : m
      ),
    },
  }))
},
```

(The old behavior appended `*Error: …*` markdown to `m.text`; messages persisted with that legacy text still render fine as markdown — no migration needed.)

- [ ] **Step 6: Render the error in `ChatMessage.jsx`.** After the `<MarkdownRenderer>` wrapper div (line 42) and before the embedded-cards block, add:

```jsx
{message.error && (
  <InlineNotice variant="error" className="mt-3 max-w-md">
    {message.error.message}
    {message.error.isLimit && (
      <>
        {' '}
        <Link to="/upgrade/pro" className="underline underline-offset-2">
          Upgrade to Pro
        </Link>
      </>
    )}
  </InlineNotice>
)}
```

Add imports: `import { Link, useNavigate } from 'react-router-dom'` (the file already imports `useNavigate` — merge into one line) and `import InlineNotice from '../ui/InlineNotice'`.

- [ ] **Step 7: Run tests + build**

Run: `npx vitest run src/__tests__/chatStore.test.js && npm run build`
Expected: ALL PASS, clean build. Also run `npx vitest run src/__tests__/chatStoreMode.test.js` — it exercises `sendMessage` and must still pass.

- [ ] **Step 8: Visual check**

Dev server → `/chat` → send a message with the edge function unreachable (e.g. stop local Supabase or block the network in devtools). Confirm the wash error block renders under the assistant message instead of italic raw text.

- [ ] **Step 9: Commit**

```bash
git add src/store/chatStore.js src/components/chat/ChatMessage.jsx src/__tests__/chatStore.test.js
git commit -m "refactor(chat): structured stream errors — friendly copy in an InlineNotice, raw detail to Sentry"
```

---

### Task 9: `InlineErrorBoundary` fallback → wash grammar with retry action

**Files:**
- Modify: `src/components/InlineErrorBoundary.jsx:33-48` (render method)
- Test: `src/__tests__/errorBoundary.test.jsx` (extend/adjust)

**Interfaces:**
- Consumes: `InlineNotice` (`action` slot, Task 2). Props of the boundary unchanged.

- [ ] **Step 1: Adjust/extend the test.** In `src/__tests__/errorBoundary.test.jsx`, find the InlineErrorBoundary assertions (they check the fallback text and Retry button). Add:

```jsx
it('inline fallback uses the error wash grammar', () => {
  const Boom = () => { throw new Error('boom') }
  render(
    <InlineErrorBoundary name="comments">
      <Boom />
    </InlineErrorBoundary>
  )
  const alert = screen.getByRole('alert')
  expect(alert.className).toContain('bg-[var(--color-copper-wash)]')
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run, verify the new test fails**

Run: `npx vitest run src/__tests__/errorBoundary.test.jsx`
Expected: new test FAILS (fallback is the old gray pill).

- [ ] **Step 3: Replace the fallback JSX** in `InlineErrorBoundary.jsx`. Add `import InlineNotice from './ui/InlineNotice'` and change the `render()` error branch to:

```jsx
if (this.state.hasError) {
  return (
    <InlineNotice
      variant="error"
      className="items-center py-2"
      icon={<WarningCircle size={16} className="shrink-0" />}
      action={
        <button
          onClick={this.handleRetry}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] bg-[var(--surface-card)] rounded-md border border-[var(--color-copper)] hover:opacity-80 transition-opacity cursor-pointer"
        >
          <ArrowsClockwise className="w-3 h-3" />
          Retry
        </button>
      }
    >
      Couldn&apos;t load {this.props.name}
    </InlineNotice>
  )
}
```

Update the phosphor import to `import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react'`. Note the Retry button loses its `aria-label="Retry"` because its visible text now suffices — keep the visible "Retry" text.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/errorBoundary.test.jsx`
Expected: ALL PASS (fix any old assertions that pinned the gray-pill classes).

- [ ] **Step 5: Commit**

```bash
git add src/components/InlineErrorBoundary.jsx src/__tests__/errorBoundary.test.jsx
git commit -m "style(ui): InlineErrorBoundary joins the copper error grammar"
```

---

### Task 10: Offline → persistent toast (O2)

**Files:**
- Modify: `src/utils/toast.js` (add `offline` + `dismiss`)
- Modify: `src/components/layout/OfflineBanner.jsx` (becomes headless)
- Test: `src/__tests__/errorStates.test.js` (or a new `offlineToast.test.jsx` if that file's setup doesn't fit — check it first)

**Interfaces:**
- Produces: `showToast.offline(message) → toastId` (duration `Infinity`, honey solid, pulse dot, no dismiss button) and `showToast.dismiss(toastId)`.
- Consumes: `.toast-pulse-dot` class from Task 1.

- [ ] **Step 1: Write failing test.** Check `src/__tests__/errorStates.test.js` first; if it already mocks `react-hot-toast`, extend there, otherwise create `src/__tests__/offlineToast.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'

vi.mock('react-hot-toast', () => {
  const toast = vi.fn(() => 'toast-id-1')
  toast.dismiss = vi.fn()
  return { default: toast }
})

import toast from 'react-hot-toast'
import { showToast } from '../utils/toast'

describe('showToast.offline', () => {
  it('creates a persistent (Infinity) toast and returns its id', () => {
    const id = showToast.offline("You're offline")
    expect(id).toBe('toast-id-1')
    const opts = toast.mock.calls.at(-1)[1]
    expect(opts.duration).toBe(Infinity)
  })

  it('dismiss proxies to react-hot-toast', () => {
    showToast.dismiss('toast-id-1')
    expect(toast.dismiss).toHaveBeenCalledWith('toast-id-1')
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/__tests__/offlineToast.test.js`
Expected: FAIL — `showToast.offline is not a function`.

- [ ] **Step 3: Add to `src/utils/toast.js`.** Below the `make` function, add:

```js
// Offline is a *state*, not an event: a warn-styled toast that stays
// until connectivity returns (duration: Infinity, no dismiss button —
// the user can't dismiss being offline). The pulse dot encodes
// "ongoing". Dismissed programmatically via showToast.dismiss(id).
function offlineToast(message) {
  return toast(
    () =>
      createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%' } },
        createElement('span', { className: 'toast-pulse-dot' }),
        phIcon('wifi-slash', '#1B1B18'),
        createElement('span', { style: { flex: 1, textAlign: 'left' } }, message),
      ),
    {
      duration: Infinity,
      style: { ...BASE, background: '#D4A843', color: '#1B1B18' },
    },
  )
}
```

and extend the export:

```js
export const showToast = {
  success: make('check-circle', '#C2D64A', '#1B1B18', 3000),
  error:   make('warning-circle', '#C27A4A', '#FAF8F6', 4000),
  delete:  make('trash',          '#C27A4A', '#FAF8F6', 5000),
  archive: make('archive',        '#A8969E', '#E8DDE2', 3000),
  restore: make('arrow-counter-clockwise', '#C2D64A', '#1B1B18', 3000),
  info:    make('info',            '#FAF8F6', '#5C5C57', 3000),
  warn:    make('warning',         '#D4A843', '#1B1B18', 4000),
  overdue: make('alarm',           '#C27A4A', '#FAF8F6', 5000),
  offline: offlineToast,
  dismiss: (id) => toast.dismiss(id),
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/__tests__/offlineToast.test.js`
Expected: PASS.

- [ ] **Step 5: Make `OfflineBanner` headless.** Replace the whole component body of `src/components/layout/OfflineBanner.jsx` with:

```jsx
import { useEffect, useRef } from 'react'
import { showToast } from '../../utils/toast'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useBoardStore } from '../../store/boardStore'
import { useNoteStore } from '../../store/noteStore'

/**
 * Headless offline watcher. Offline state renders as a persistent
 * showToast.offline (top-center, where every toast lands) instead of a
 * layout-shifting banner; reconnecting swaps it for the lime success
 * toast and refetches. Decision: error-style-decisions-2.html (O2).
 */
export default function OfflineBanner() {
  const online = useOnlineStatus()
  const toastId = useRef(null)
  const fetchBoards = useBoardStore((s) => s.fetchBoards)
  const fetchNotes = useNoteStore((s) => s.fetchNotes)

  useEffect(() => {
    if (!online) {
      if (!toastId.current) {
        toastId.current = showToast.offline("You're offline — changes may not be saved")
      }
    } else if (toastId.current) {
      showToast.dismiss(toastId.current)
      toastId.current = null
      showToast.success('Back online — syncing data')
      fetchBoards()
      fetchNotes()
    }
  }, [online, fetchBoards, fetchNotes])

  return null
}
```

(Keeps the existing `fetchNotes` call for parity — noteStore is unwired from nav but harmless here. `WifiSlash` import is gone; the toast uses the `ph ph-wifi-slash` webfont like every other toast icon.)

- [ ] **Step 6: Full test run + build**

Run: `npm run test && npm run build`
Expected: ALL PASS. Fix any test that asserted the old banner markup (search tests for `You're offline`).

- [ ] **Step 7: Visual check**

Dev server → devtools Network tab → set Offline. Confirm: honey toast with pulsing dot appears top-center and stays; no layout shift. Set back Online: toast swaps for lime "Back online — syncing data".

- [ ] **Step 8: Commit**

```bash
git add src/utils/toast.js src/components/layout/OfflineBanner.jsx src/__tests__/offlineToast.test.js
git commit -m "feat(ui): offline state becomes a persistent pulse toast (O2)"
```

---

### Task 11: Sweep, docs, final verification

**Files:**
- Modify: `CLAUDE.md` (Design System → Primitives table + toast description)

- [ ] **Step 1: Confirm no orphaned hand-rolled error styles remain**

Run: `grep -rn "copper-wash)]/60\|copper-wash)] rounded-xl\|text-xs text-\[var(--color-copper)\]" src`
Expected: no matches (all migrated). Any hit = a missed call site; migrate it with the matching tier before proceeding.

- [ ] **Step 2: Update `CLAUDE.md` Design System.** In the Primitives table, replace/add rows:

```
| `InlineNotice` | The persistent ("wash") tier of the error grammar: mono 12px, 18px default Phosphor icon, 1px border, 10px radius. `variant` (info/error/warn/danger/success), `icon` (node or `false`), `action` (node, e.g. Retry), `onDismiss`. Errors/danger get `role="alert"`. |
| `FieldError`   | Micro tier: single-input validation line. Mono 11px + 13px icon, no box. Self-guards on falsy children. |
```

And under the toast bullet in Design System → Other shared helpers, extend with:

```
`showToast.offline(msg)` returns a persistent (duration ∞) honey toast with a pulse dot for connectivity state; pair with `showToast.dismiss(id)`. Solid toast fills are reserved for transient/floating messages — persistent inline errors use `InlineNotice` (wash) or `FieldError` (micro). Decision records: docs/design-mockups/error-style-decisions{,-2}.html.
```

- [ ] **Step 3: Full gate**

Run: `npm run lint && npm run test && npm run build`
Expected: all clean.

- [ ] **Step 4: Full visual pass** (dev server, light + dark): landing sign-in error, reset-password validation, share-modal duplicate invite, Settings clear-data confirm, chat stream error, a forced InlineErrorBoundary (temporarily throw in a section component, then revert), offline toggle.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: error grammar — InlineNotice/FieldError tiers, red destructive, offline toast"
```

---

## Out of scope (tracked elsewhere)

The audit's backend/store findings — fail-open rate limiter, unchecked commit deletes, tool-executor false `ok:true`, raw Anthropic bodies in SSE, `logError` stringifying PostgrestError, silent rollback toasts — are correctness work, not styling, and belong to separate plans. This plan only changes how errors *look* once surfaced (plus the chat raw-copy leak, which is fixed here because the rendering path owns it).
