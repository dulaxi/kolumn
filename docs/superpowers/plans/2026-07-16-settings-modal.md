# Settings Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-page `/settings` route with a claude.ai-style two-pane settings modal (left nav + row-grammar content), opened from the sidebar user menu.

**Architecture:** A new `SettingsModal` component tree under `src/components/settings/` built on the existing `Modal` primitive, with a new `SegmentedControl` ui primitive and a `system | light | dark` theme migration in `settingsStore`. `/settings` becomes a redirect that opens the modal over the dashboard; `SettingsPage.jsx` is deleted.

**Tech Stack:** React 19, Zustand (persist middleware), Tailwind v4 tokens, Phosphor icons, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-16-settings-modal-design.md`

## Global Constraints

- Colors: `var(--token)` only — no new hex codes anywhere.
- Icons: Phosphor only (`@phosphor-icons/react`).
- No backdrop blur on modals; overlay is `rgba(27,27,24,0.45)` (Modal default).
- Border radius: 8px small controls, 10–12px raised surfaces.
- Toasts: always `showToast.*` from `src/utils/toast.js`.
- Buttons: ink for affirmative, red for destructive; lime is never a button fill.
- Test command: `npm run test -- <file>` (Vitest single run); lint `npm run lint`; build `npm run build`.
- Commits: conventional with scope, e.g. `feat(settings): …`, `feat(ui): …`.

**Known deviation from spec (approved reality):** there is no sidebar "Settings" nav item today. Settings is reached via the `UserMenu` popover (bottom-left profile block → menu with Settings / Keyboard shortcuts / Sign out). The menu stays (it hosts shortcuts + sign-out); its **Settings item opens the modal** instead of navigating. `MobileUserMenu.jsx` gets the same change.

---

### Task 1: `SegmentedControl` ui primitive

**Files:**
- Create: `src/components/ui/SegmentedControl.jsx`
- Test: `src/__tests__/SegmentedControl.test.jsx`

**Interfaces:**
- Produces: `SegmentedControl({ options, value, onChange, ariaLabel, className })` — default export. `options: Array<{ value: string, label?: string, icon?: ReactNode, ariaLabel?: string }>`. Radiogroup semantics; `onChange(value)` called with the option's `value` string.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/SegmentedControl.test.jsx`:

```jsx
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SegmentedControl from '../components/ui/SegmentedControl'

afterEach(() => cleanup())

const OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

describe('SegmentedControl', () => {
  test('renders a radiogroup with one radio per option', () => {
    render(<SegmentedControl options={OPTIONS} value="light" onChange={() => {}} ariaLabel="Appearance" />)
    expect(screen.getByRole('radiogroup', { name: 'Appearance' })).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  test('marks the selected option aria-checked and gives it the only tab stop', () => {
    render(<SegmentedControl options={OPTIONS} value="light" onChange={() => {}} ariaLabel="Appearance" />)
    const radios = screen.getAllByRole('radio')
    expect(radios[1].getAttribute('aria-checked')).toBe('true')
    expect(radios[1].tabIndex).toBe(0)
    expect(radios[0].getAttribute('aria-checked')).toBe('false')
    expect(radios[0].tabIndex).toBe(-1)
  })

  test('click selects an option', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="light" onChange={onChange} ariaLabel="Appearance" />)
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(onChange).toHaveBeenCalledWith('dark')
  })

  test('arrow keys move the selection and wrap', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="dark" onChange={onChange} ariaLabel="Appearance" />)
    screen.getByRole('radio', { name: 'Dark' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('system') // wraps past the end
    onChange.mockClear()
    await userEvent.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith('light')
  })

  test('icon-only options use ariaLabel for the accessible name', () => {
    render(
      <SegmentedControl
        options={[{ value: 'a', icon: <svg data-testid="ic" />, ariaLabel: 'Alpha' }, { value: 'b', label: 'Beta' }]}
        value="a"
        onChange={() => {}}
        ariaLabel="Test"
      />,
    )
    expect(screen.getByRole('radio', { name: 'Alpha' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/SegmentedControl.test.jsx`
Expected: FAIL — cannot resolve `../components/ui/SegmentedControl`.

- [ ] **Step 3: Write the implementation**

Create `src/components/ui/SegmentedControl.jsx`:

```jsx
import { useLayoutEffect, useRef, useState } from 'react'

// Radiogroup-semantics segmented control (claude.ai-style): subtle track,
// sliding 1px-bordered thumb, one tab stop, arrow-key navigation with wrap.
// Note: the arrow-key handler SELECTS as it moves (roving selection), the
// standard radiogroup pattern.
export default function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}) {
  const itemRefs = useRef({})
  const [thumb, setThumb] = useState(null) // { left, width } in px

  // Position the sliding thumb under the selected item. jsdom reports 0s
  // here, which is fine — the thumb is aria-hidden decoration.
  useLayoutEffect(() => {
    const el = itemRefs.current[value]
    if (!el) return
    setThumb({ left: el.offsetLeft, width: el.offsetWidth })
  }, [value, options])

  const selectedIndex = options.findIndex((o) => o.value === value)

  const moveSelection = (delta) => {
    const next = options[(selectedIndex + delta + options.length) % options.length]
    onChange(next.value)
    requestAnimationFrame(() => itemRefs.current[next.value]?.focus())
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      moveSelection(1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      moveSelection(-1)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`relative inline-flex h-8 items-stretch rounded-lg bg-[var(--surface-hover)] p-0.5 ${className}`}
    >
      {thumb && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 bottom-0.5 rounded-[6px] bg-[var(--surface-card)] border border-[var(--border-default)] shadow-sm transition-[left,width] duration-150 motion-reduce:transition-none"
          style={{ left: thumb.left, width: thumb.width }}
        />
      )}
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            ref={(el) => {
              itemRefs.current[opt.value] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.ariaLabel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={`relative z-[1] flex cursor-pointer items-center gap-1.5 rounded-[6px] px-3 text-sm transition-colors ${
              selected
                ? 'font-medium text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/SegmentedControl.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/SegmentedControl.jsx src/__tests__/SegmentedControl.test.jsx
git commit -m "feat(ui): SegmentedControl primitive — radiogroup semantics, sliding thumb"
```

---

### Task 2: Theme system — `system | light | dark`

**Files:**
- Create: `src/utils/theme.js`
- Modify: `src/store/settingsStore.js` (theme default, `setTheme`, persist `version` + `migrate`)
- Modify: `src/main.jsx:42-44` (pre-paint block)
- Modify: `src/components/layout/AppLayout.jsx:41-49` (theme effect)
- Test: `src/__tests__/theme.test.js`

**Interfaces:**
- Produces: `resolveTheme(theme: 'system'|'light'|'dark') => 'light'|'dark'` and `applyTheme(theme) => void` (sets `data-theme` on `<html>`), both named exports of `src/utils/theme.js`. Also `migrateSettingsState(persistedState) => persistedState` named export of `src/store/settingsStore.js`. Store `theme` values are now `'system' | 'light' | 'dark'` (was `'default' | 'dark'`).

**Check first:** `src/__tests__/setup.js` mocks `window.matchMedia`. Read it; if the mock lacks `matches`/`addEventListener`/`removeEventListener`, extend the mock rather than working around it in tests.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/theme.test.js`:

```js
import { describe, test, expect, vi, afterEach } from 'vitest'
import { resolveTheme, applyTheme } from '../utils/theme'
import { migrateSettingsState } from '../store/settingsStore'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
})

function mockPrefersDark(matches) {
  vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

describe('resolveTheme', () => {
  test('light and dark pass through', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  test('system resolves via prefers-color-scheme', () => {
    mockPrefersDark(true)
    expect(resolveTheme('system')).toBe('dark')
    mockPrefersDark(false)
    expect(resolveTheme('system')).toBe('light')
  })

  test('legacy/unknown values resolve to light', () => {
    expect(resolveTheme('default')).toBe('light')
    expect(resolveTheme(undefined)).toBe('light')
  })
})

describe('applyTheme', () => {
  test('sets the data-theme attribute to the resolved value', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})

describe('migrateSettingsState', () => {
  test("maps persisted 'default' theme to 'light'", () => {
    expect(migrateSettingsState({ theme: 'default', font: 'mona-sans' })).toEqual({
      theme: 'light',
      font: 'mona-sans',
    })
  })

  test('leaves other themes untouched', () => {
    expect(migrateSettingsState({ theme: 'dark' }).theme).toBe('dark')
    expect(migrateSettingsState({ theme: 'system' }).theme).toBe('system')
  })

  test('tolerates missing state', () => {
    expect(migrateSettingsState(undefined)).toEqual(undefined)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/theme.test.js`
Expected: FAIL — cannot resolve `../utils/theme`; `migrateSettingsState` not exported.

- [ ] **Step 3: Create `src/utils/theme.js`**

```js
// Theme resolution for the 'system' | 'light' | 'dark' setting.
// 'system' follows the OS via prefers-color-scheme; anything unrecognized
// (including the legacy persisted 'default') resolves to light.

export function resolveTheme(theme) {
  if (theme === 'dark' || theme === 'light') return theme
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', resolveTheme(theme))
}
```

- [ ] **Step 4: Update `src/store/settingsStore.js`**

Add the import at the top:

```js
import { applyTheme } from '../utils/theme'
```

Change the `theme` default (line 8) from `'default'` to `'system'`.

Replace `setTheme` (lines 41–44) with:

```js
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
```

Export the migration above the store and wire it into persist. Replace the persist options object (lines 70–72) with:

```js
    {
      name: 'kolumn-settings',
      version: 1,
      migrate: migrateSettingsState,
    }
```

And above `export const useSettingsStore` add:

```js
// v0 → v1: the theme setting used 'default' to mean light; it is now an
// explicit 'system' | 'light' | 'dark'. Persisted 'default' becomes 'light'
// (preserving the user's effective theme rather than switching them to
// system-following behavior they never chose).
export function migrateSettingsState(persistedState) {
  if (persistedState?.theme === 'default') {
    return { ...persistedState, theme: 'light' }
  }
  return persistedState
}
```

- [ ] **Step 5: Update the pre-paint block in `src/main.jsx`**

Add the import near the other imports:

```js
import { applyTheme } from './utils/theme'
```

Replace lines 42–44:

```js
// Apply persisted theme before first paint to avoid flash
const savedTheme = JSON.parse(localStorage.getItem('kolumn-settings') || '{}')?.state?.theme
document.documentElement.setAttribute('data-theme', savedTheme === 'dark' ? 'dark' : 'light')
```

with:

```js
// Apply persisted theme before first paint to avoid flash. Runs before the
// zustand persist migration, so resolveTheme's legacy-'default'→light
// fallback covers un-migrated values.
const savedTheme = JSON.parse(localStorage.getItem('kolumn-settings') || '{}')?.state?.theme
applyTheme(savedTheme || 'system')
```

- [ ] **Step 6: Update the theme effect in `src/components/layout/AppLayout.jsx`**

Add the import:

```js
import { applyTheme } from '../../utils/theme'
```

Replace the effect at lines 41–49:

```js
  // Apply the data-theme attribute for non-default themes
  useEffect(() => {
    if (theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    return () => document.documentElement.removeAttribute('data-theme')
  }, [theme])
```

with:

```js
  // Apply the resolved theme; while set to 'system', follow OS changes live.
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [theme])
```

- [ ] **Step 7: Run the tests**

Run: `npm run test -- src/__tests__/theme.test.js`
Expected: PASS. Then run the full suite (`npm run test`) — no regressions (watch for tests that asserted `theme: 'default'`; update them to the new values if any exist).

- [ ] **Step 8: Commit**

```bash
git add src/utils/theme.js src/store/settingsStore.js src/main.jsx src/components/layout/AppLayout.jsx src/__tests__/theme.test.js
git commit -m "feat(settings): system|light|dark theme with OS-follow and legacy 'default' migration"
```

---

### Task 3: Settings row grammar — `SettingsSection` + `SettingsRow`

**Files:**
- Create: `src/components/settings/SettingsSection.jsx`
- Create: `src/components/settings/SettingsRow.jsx`
- Test: `src/__tests__/SettingsRow.test.jsx`

**Interfaces:**
- Produces: `SettingsSection({ title, children })` — heading + `divide-y` hairline wrapper. `SettingsRow({ title, description?, htmlFor?, children })` — label-left / control-right row. Both default exports.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/SettingsRow.test.jsx`:

```jsx
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import SettingsSection from '../components/settings/SettingsSection'
import SettingsRow from '../components/settings/SettingsRow'

afterEach(() => cleanup())

describe('SettingsSection + SettingsRow', () => {
  test('section renders a heading and its rows', () => {
    render(
      <SettingsSection title="General">
        <SettingsRow title="Appearance">
          <button type="button">control</button>
        </SettingsRow>
      </SettingsSection>,
    )
    expect(screen.getByRole('heading', { name: 'General' })).toBeTruthy()
    expect(screen.getByText('Appearance')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'control' })).toBeTruthy()
  })

  test('row renders an optional description', () => {
    render(
      <SettingsRow title="Font" description="Typeface used on cards.">
        <span>x</span>
      </SettingsRow>,
    )
    expect(screen.getByText('Typeface used on cards.')).toBeTruthy()
  })

  test('htmlFor links the title label to a control', () => {
    render(
      <SettingsRow title="Display name" htmlFor="dn">
        <input id="dn" />
      </SettingsRow>,
    )
    expect(screen.getByLabelText('Display name')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/SettingsRow.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement both components**

Create `src/components/settings/SettingsSection.jsx`:

```jsx
// Section of the settings modal: serif-free small heading + hairline-divided
// rows. No card borders — the row grammar carries the structure.
export default function SettingsSection({ title, children }) {
  return (
    <section className="mb-8 last:mb-0">
      <h3 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <div className="divide-y divide-[var(--border-subtle)]">{children}</div>
    </section>
  )
}
```

Create `src/components/settings/SettingsRow.jsx`:

```jsx
// One settings row: title (+ optional muted description) on the left,
// control on the right. Pass htmlFor when the control is a labelable input.
export default function SettingsRow({ title, description, htmlFor, children }) {
  const Title = htmlFor ? 'label' : 'span'
  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div className="min-w-0 flex-1">
        <Title htmlFor={htmlFor} className="block text-sm text-[var(--text-primary)]">
          {title}
        </Title>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/SettingsRow.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/SettingsSection.jsx src/components/settings/SettingsRow.jsx src/__tests__/SettingsRow.test.jsx
git commit -m "feat(settings): SettingsSection + SettingsRow row grammar"
```

---

### Task 4: General + Profile sections

**Files:**
- Create: `src/components/settings/GeneralSection.jsx`
- Create: `src/components/settings/ProfileSection.jsx`
- Test: `src/__tests__/settingsSections.test.jsx`

**Interfaces:**
- Consumes: `SegmentedControl` (Task 1), `SettingsSection`/`SettingsRow` (Task 3), `useSettingsStore` theme values (Task 2).
- Produces: `GeneralSection()` and `ProfileSection()` — no-prop default exports rendered by the modal (Task 6).

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/settingsSections.test.jsx`:

```jsx
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GeneralSection from '../components/settings/GeneralSection'
import ProfileSection from '../components/settings/ProfileSection'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'

afterEach(() => cleanup())

describe('GeneralSection', () => {
  beforeEach(() => {
    useSettingsStore.setState({ theme: 'light', font: 'mona-sans' })
  })

  test('appearance control reflects and updates the theme', async () => {
    render(<GeneralSection />)
    const dark = screen.getByRole('radio', { name: 'Dark' })
    expect(dark.getAttribute('aria-checked')).toBe('false')
    await userEvent.click(dark)
    expect(useSettingsStore.getState().theme).toBe('dark')
  })

  test('font control updates the font', async () => {
    render(<GeneralSection />)
    await userEvent.click(screen.getByRole('radio', { name: 'SF Mono' }))
    expect(useSettingsStore.getState().font).toBe('sf-mono')
  })
})

describe('ProfileSection', () => {
  beforeEach(() => {
    useAuthStore.setState({
      profile: { display_name: 'Dula', icon: null, color: null, tier: 'free' },
      updateProfile: vi.fn(),
    })
  })

  test('renders the current display name', () => {
    render(<ProfileSection />)
    expect(screen.getByLabelText('Display name').value).toBe('Dula')
  })

  test('committing a new display name calls updateProfile on blur', async () => {
    render(<ProfileSection />)
    const input = screen.getByLabelText('Display name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Abdullah')
    await userEvent.tab()
    expect(useAuthStore.getState().updateProfile).toHaveBeenCalledWith({ display_name: 'Abdullah' })
  })

  test('picking a color calls updateProfile', async () => {
    render(<ProfileSection />)
    const swatches = screen.getAllByRole('button', { name: /^Profile color/ })
    expect(swatches.length).toBeGreaterThan(0)
    await userEvent.click(swatches[0])
    expect(useAuthStore.getState().updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ color: expect.any(String) }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/settingsSections.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `GeneralSection`**

Create `src/components/settings/GeneralSection.jsx`:

```jsx
import { Desktop, Moon, Sun } from '@phosphor-icons/react'
import { useSettingsStore } from '../../store/settingsStore'
import SegmentedControl from '../ui/SegmentedControl'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function GeneralSection() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const font = useSettingsStore((s) => s.font)
  const setFont = useSettingsStore((s) => s.setFont)

  return (
    <SettingsSection title="General">
      <SettingsRow title="Appearance" description="System follows your OS preference.">
        <SegmentedControl
          ariaLabel="Appearance"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', icon: <Desktop size={16} />, ariaLabel: 'System' },
            { value: 'light', icon: <Sun size={16} />, ariaLabel: 'Light' },
            { value: 'dark', icon: <Moon size={16} />, ariaLabel: 'Dark' },
          ]}
        />
      </SettingsRow>
      <SettingsRow title="Font" description="Typeface used on cards.">
        <SegmentedControl
          ariaLabel="Font"
          value={font}
          onChange={setFont}
          options={[
            { value: 'mona-sans', label: 'Mona Sans' },
            { value: 'sf-mono', label: 'SF Mono' },
          ]}
        />
      </SettingsRow>
    </SettingsSection>
  )
}
```

- [ ] **Step 4: Implement `ProfileSection`**

Create `src/components/settings/ProfileSection.jsx`:

```jsx
import { useState } from 'react'
import { User } from '@phosphor-icons/react'
import { useAuthStore } from '../../store/authStore'
import { PROFILE_COLORS, resolveProfileColor } from '../../constants/colors'
import { showToast } from '../../utils/toast'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'
import Input from '../ui/Input'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function ProfileSection() {
  const profile = useAuthStore((s) => s.profile)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [pickerOpen, setPickerOpen] = useState(false)

  const update = (updates) => {
    updateProfile(updates)
    showToast.success('Profile updated')
  }

  const { style: avatarStyle, fallbackClass } = resolveProfileColor(profile?.color)

  return (
    <SettingsSection title="Profile">
      <SettingsRow title="Avatar" description="Shown on cards assigned to you.">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-label="Change avatar icon"
            aria-expanded={pickerOpen}
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-80 ${
              profile?.icon ? fallbackClass : 'bg-[var(--surface-hover)]'
            }`}
            style={profile?.icon ? avatarStyle : undefined}
          >
            {profile?.icon ? (
              <DynamicIcon name={profile.icon} className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5 text-[var(--text-secondary)]" />
            )}
          </button>
          {pickerOpen && (
            <IconPicker
              value={profile?.icon}
              onChange={(iconName) => {
                update({ icon: iconName })
                setPickerOpen(false)
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      </SettingsRow>
      <SettingsRow title="Display name" htmlFor="settings-display-name">
        <Input
          id="settings-display-name"
          key={profile?.display_name || ''}
          defaultValue={profile?.display_name || ''}
          placeholder="Your name…"
          wrapperClassName="w-56"
          onBlur={(e) => {
            const next = e.target.value.trim()
            if (next && next !== profile?.display_name) update({ display_name: next })
          }}
        />
      </SettingsRow>
      <SettingsRow title="Color" description="Avatar background color.">
        <div className="flex max-w-64 flex-wrap justify-end gap-2">
          {PROFILE_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={`Profile color ${c.hex}`}
              onClick={() => update({ color: c.value })}
              className={`h-6 w-6 rounded-full transition-transform ${
                profile?.color === c.value
                  ? 'ring-2 ring-[var(--accent-lime-soft)] ring-offset-2'
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
```

Note: the old page updated the profile on every keystroke (a toast per keystroke). This version commits on blur — deliberate improvement, matches the reference.

Note: `PROFILE_COLORS` hexes via `style={{ backgroundColor: c.hex }}` mirrors the existing swatch row on the old page and `resolveProfileColor` — these are the sanctioned profile-palette constants, not new hex codes.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/__tests__/settingsSections.test.jsx`
Expected: PASS. If `Input` does not forward `id`/`onBlur`/`defaultValue`, check `src/components/ui/Input.jsx` — it spreads rest props; fix the test usage, not the primitive.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/GeneralSection.jsx src/components/settings/ProfileSection.jsx src/__tests__/settingsSections.test.jsx
git commit -m "feat(settings): General and Profile sections"
```

---

### Task 5: Account + Data sections

**Files:**
- Create: `src/components/settings/AccountSection.jsx`
- Create: `src/components/settings/DataSection.jsx`
- Test: `src/__tests__/settingsAccountData.test.jsx`

**Interfaces:**
- Consumes: `SettingsSection`/`SettingsRow` (Task 3), `useAuthStore` (`profile`, `signOut`), `useBoardStore.getState()`.
- Produces: `AccountSection({ onClose })` — `onClose` closes the modal before navigation. `DataSection()`. Also named export `buildExportPayload(boardState) => { boards, columns, cards, exported_at }` from `DataSection.jsx`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/settingsAccountData.test.jsx`:

```jsx
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AccountSection from '../components/settings/AccountSection'
import { buildExportPayload } from '../components/settings/DataSection'
import { useAuthStore } from '../store/authStore'

afterEach(() => cleanup())

describe('AccountSection', () => {
  beforeEach(() => {
    useAuthStore.setState({
      profile: { display_name: 'Dula', email: 'dula@example.com', tier: 'pro' },
      user: { email: 'dula@example.com' },
      signOut: vi.fn(),
    })
  })

  test('shows email and capitalized plan', () => {
    render(<MemoryRouter><AccountSection onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByText('dula@example.com')).toBeTruthy()
    expect(screen.getByText('Pro')).toBeTruthy()
  })

  test('sign out calls authStore.signOut and closes the modal', async () => {
    const onClose = vi.fn()
    render(<MemoryRouter><AccountSection onClose={onClose} /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(useAuthStore.getState().signOut).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('buildExportPayload', () => {
  test('includes boards/columns/cards and a timestamp, excludes notes', () => {
    const state = {
      boards: { b1: { id: 'b1', name: 'Board' } },
      columns: { c1: { id: 'c1', board_id: 'b1' } },
      cards: { k1: { id: 'k1', column_id: 'c1' } },
      notes: { n1: { id: 'n1' } },
    }
    const payload = buildExportPayload(state)
    expect(payload.boards).toEqual(state.boards)
    expect(payload.columns).toEqual(state.columns)
    expect(payload.cards).toEqual(state.cards)
    expect(payload.notes).toBeUndefined()
    expect(typeof payload.exported_at).toBe('string')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/settingsAccountData.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `AccountSection`**

Create `src/components/settings/AccountSection.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Button from '../ui/Button'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function AccountSection({ onClose }) {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  const email = profile?.email || user?.email || ''
  const tier = profile?.tier || 'free'
  const plan = tier.charAt(0).toUpperCase() + tier.slice(1)

  const handleChangePassword = () => {
    onClose()
    navigate('/update-password')
  }

  const handleSignOut = async () => {
    onClose()
    await signOut()
    navigate('/')
  }

  return (
    <SettingsSection title="Account">
      <SettingsRow title="Email">
        <span className="text-sm text-[var(--text-secondary)]">{email}</span>
      </SettingsRow>
      <SettingsRow title="Plan">
        <span className="text-sm text-[var(--text-secondary)]">{plan}</span>
      </SettingsRow>
      <SettingsRow title="Password" description="Set a new password for your account.">
        <Button variant="secondary" size="sm" onClick={handleChangePassword}>
          Change password
        </Button>
      </SettingsRow>
      <SettingsRow title="Sign out" description="Sign out of Kolumn on this device.">
        <Button variant="secondary" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </SettingsRow>
    </SettingsSection>
  )
}
```

- [ ] **Step 4: Implement `DataSection`**

Create `src/components/settings/DataSection.jsx`:

```jsx
import { useBoardStore } from '../../store/boardStore'
import { showToast } from '../../utils/toast'
import Button from '../ui/Button'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

// Exported for tests. Boards/columns/cards only — notes are excluded (the
// notes feature is unwired; see CLAUDE.md "Removed pages").
export function buildExportPayload({ boards, columns, cards }) {
  return {
    boards,
    columns,
    cards,
    exported_at: new Date().toISOString(),
  }
}

export default function DataSection() {
  const handleExport = () => {
    const payload = buildExportPayload(useBoardStore.getState())
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kolumn-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast.success('Data exported')
  }

  return (
    <SettingsSection title="Data">
      <SettingsRow
        title="Export your data"
        description="Download all boards, columns, and cards as a JSON backup."
      >
        <Button variant="secondary" size="sm" onClick={handleExport}>
          Export
        </Button>
      </SettingsRow>
    </SettingsSection>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/__tests__/settingsAccountData.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/AccountSection.jsx src/components/settings/DataSection.jsx src/__tests__/settingsAccountData.test.jsx
git commit -m "feat(settings): Account and Data sections — export only, import/clear retired"
```

---

### Task 6: `SettingsModal` shell — two panes, nav, search

**Files:**
- Create: `src/components/settings/SettingsModal.jsx`
- Test: `src/__tests__/SettingsModal.test.jsx`

**Interfaces:**
- Consumes: `Modal` primitive, all four section components, `Input`, `Button`.
- Produces: `SettingsModal({ open, onClose })` — default export, rendered by `AppLayout` (Task 7).

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/SettingsModal.test.jsx`:

```jsx
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SettingsModal from '../components/settings/SettingsModal'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'

afterEach(() => cleanup())

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <SettingsModal open onClose={() => {}} {...props} />
    </MemoryRouter>,
  )
}

describe('SettingsModal', () => {
  beforeEach(() => {
    useSettingsStore.setState({ theme: 'light', font: 'mona-sans' })
    useAuthStore.setState({
      profile: { display_name: 'Dula', email: 'dula@example.com', tier: 'free' },
      user: { email: 'dula@example.com' },
      updateProfile: vi.fn(),
      signOut: vi.fn(),
    })
  })

  test('renders nav items and the General section by default', () => {
    renderModal()
    for (const item of ['General', 'Profile', 'Account', 'Data']) {
      expect(screen.getByRole('button', { name: item })).toBeTruthy()
    }
    expect(screen.getByRole('heading', { name: 'General' })).toBeTruthy()
  })

  test('clicking a nav item switches sections', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Account' }))
    expect(screen.getByRole('heading', { name: 'Account' })).toBeTruthy()
    expect(screen.getByText('dula@example.com')).toBeTruthy()
  })

  test('search auto-selects the first matching section and dims the rest', async () => {
    renderModal()
    await userEvent.type(screen.getByLabelText('Search settings'), 'export')
    expect(screen.getByRole('heading', { name: 'Data' })).toBeTruthy()
    const general = screen.getByRole('button', { name: 'General' })
    expect(general.className).toContain('opacity-40')
  })

  test('close button calls onClose', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    await userEvent.click(screen.getByRole('button', { name: 'Close settings' }))
    expect(onClose).toHaveBeenCalled()
  })

  test('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <SettingsModal open={false} onClose={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/SettingsModal.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SettingsModal`**

Create `src/components/settings/SettingsModal.jsx`:

```jsx
import { useState } from 'react'
import {
  Download,
  IdentificationCard,
  MagnifyingGlass,
  Sliders,
  User,
  X,
} from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import GeneralSection from './GeneralSection'
import ProfileSection from './ProfileSection'
import AccountSection from './AccountSection'
import DataSection from './DataSection'

// Nav registry. `keywords` powers the v1 search: substring match dims
// non-matching nav items and auto-selects the first match.
const SECTIONS = [
  {
    id: 'general',
    label: 'General',
    icon: Sliders,
    keywords: ['general', 'appearance', 'theme', 'system', 'light', 'dark', 'font', 'mona sans', 'sf mono'],
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    keywords: ['profile', 'avatar', 'icon', 'display name', 'color'],
  },
  {
    id: 'account',
    label: 'Account',
    icon: IdentificationCard,
    keywords: ['account', 'email', 'plan', 'tier', 'password', 'sign out'],
  },
  {
    id: 'data',
    label: 'Data',
    icon: Download,
    keywords: ['data', 'export', 'backup', 'json'],
  },
]

function sectionMatches(section, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return section.keywords.some((k) => k.includes(q))
}

export default function SettingsModal({ open, onClose }) {
  const [activeId, setActiveId] = useState('general')
  const [query, setQuery] = useState('')

  const handleQueryChange = (e) => {
    const next = e.target.value
    setQuery(next)
    const matches = SECTIONS.filter((s) => sectionMatches(s, next))
    if (matches.length > 0 && !matches.some((s) => s.id === activeId)) {
      setActiveId(matches[0].id)
    }
  }

  const handleClose = () => {
    setQuery('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} ariaLabel="Settings">
      <div className="flex h-[calc(100dvh-2rem)] max-h-[720px] w-[calc(100vw-2rem)] max-w-[960px] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[0_4px_24px_rgba(27,27,24,0.10)]">
        {/* Left nav */}
        <nav
          aria-label="Settings sections"
          className="flex w-48 shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--surface-sidebar)]"
        >
          <div className="shrink-0 p-3 pb-1">
            <Input
              aria-label="Search settings"
              placeholder="Search"
              value={query}
              onChange={handleQueryChange}
              leadingIcon={<MagnifyingGlass size={14} />}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-1">
            <p className="px-2 pb-1 pt-2 text-xs text-[var(--text-muted)]">Settings</p>
            <ul className="flex flex-col gap-px">
              {SECTIONS.map((section) => {
                const ActiveIcon = section.icon
                const active = section.id === activeId
                const dimmed = !sectionMatches(section, query)
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(section.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-[var(--surface-hover)] font-medium text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                      } ${dimmed ? 'opacity-40' : ''}`}
                    >
                      <ActiveIcon size={16} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{section.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        {/* Content pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-end px-3 pt-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              aria-label="Close settings"
            >
              <X size={16} />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-6 pt-1">
            {activeId === 'general' && <GeneralSection />}
            {activeId === 'profile' && <ProfileSection />}
            {activeId === 'account' && <AccountSection onClose={handleClose} />}
            {activeId === 'data' && <DataSection />}
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

If `Input` doesn't accept `aria-label`/`value`/`onChange` pass-through or the `leadingIcon` prop looks different, read `src/components/ui/Input.jsx` and adapt the call site (the primitive is the source of truth). Same for `Button` `size="icon-sm"` — check `src/components/ui/Button.jsx` size names before inventing one.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/SettingsModal.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/SettingsModal.jsx src/__tests__/SettingsModal.test.jsx
git commit -m "feat(settings): SettingsModal shell — two-pane dialog with nav search"
```

---

### Task 7: Wire entry points, redirect `/settings`, delete the old page

**Files:**
- Modify: `src/components/layout/AppLayout.jsx` (state + event listener + render modal)
- Modify: `src/components/layout/UserMenu.jsx:49-51` (Settings item)
- Modify: `src/components/layout/MobileUserMenu.jsx:31` (Settings item)
- Create: `src/components/settings/SettingsRedirect.jsx`
- Modify: `src/App.jsx:21,101` (route + lazy import)
- Delete: `src/pages/SettingsPage.jsx`
- Test: extend `src/__tests__/SettingsModal.test.jsx` is NOT needed; manual verification below.

**Interfaces:**
- Consumes: `SettingsModal` (Task 6).
- Produces: global window event `kolumn:open-settings` (CustomEvent, no detail) — the one way to open the modal; matches the existing `kolumn:open-shortcuts` pattern.

- [ ] **Step 1: Wire the modal into `AppLayout`**

In `src/components/layout/AppLayout.jsx`:

Add the import:

```js
import SettingsModal from '../settings/SettingsModal'
```

Add state next to `searchOpen`/`shortcutsOpen` (line ~37):

```js
  const [settingsOpen, setSettingsOpen] = useState(false)
```

Extend the global-events effect (lines 56–65) with the settings listener:

```js
  useEffect(() => {
    const openSearch = () => setSearchOpen(true)
    const openShortcuts = () => setShortcutsOpen(true)
    const openSettings = () => setSettingsOpen(true)
    window.addEventListener('kolumn:focus-search', openSearch)
    window.addEventListener('kolumn:open-shortcuts', openShortcuts)
    window.addEventListener('kolumn:open-settings', openSettings)
    return () => {
      window.removeEventListener('kolumn:focus-search', openSearch)
      window.removeEventListener('kolumn:open-shortcuts', openShortcuts)
      window.removeEventListener('kolumn:open-settings', openSettings)
    }
  }, [])
```

Include `settingsOpen` in the dialog-suppression flag (line ~79):

```js
  const aDialogIsOpen = searchOpen || shortcutsOpen || settingsOpen
```

Render the modal next to `<SearchDialog … />` / `<ShortcutsSheet … />` in the JSX:

```jsx
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

Remove the `'/settings': 'Settings'` entry from `pageTitles` (line 24).

- [ ] **Step 2: Point both user menus at the modal**

`src/components/layout/UserMenu.jsx` lines 49–51 — replace:

```jsx
      <Menu.Item icon={<Gear size={16} />} onSelect={() => { setOpen(false); navigate('/settings') }}>
        Settings
      </Menu.Item>
```

with:

```jsx
      <Menu.Item icon={<Gear size={16} />} onSelect={() => { setOpen(false); window.dispatchEvent(new CustomEvent('kolumn:open-settings')) }}>
        Settings
      </Menu.Item>
```

`src/components/layout/MobileUserMenu.jsx` line 31 — same replacement pattern (`navigate('/settings')` → `window.dispatchEvent(new CustomEvent('kolumn:open-settings'))`). If `navigate` becomes unused in either file after this, remove the unused import/variable (lint will catch it).

- [ ] **Step 3: Create the `/settings` redirect**

Create `src/components/settings/SettingsRedirect.jsx`:

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// /settings is now a modal, not a page. Old links/bookmarks land here:
// bounce to the dashboard and pop the modal via the same global event the
// user menu uses (the listener lives in AppLayout, which wraps this route).
export default function SettingsRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/dashboard', { replace: true })
    window.dispatchEvent(new CustomEvent('kolumn:open-settings'))
  }, [navigate])

  return null
}
```

- [ ] **Step 4: Swap the route and delete the page**

In `src/App.jsx`:

Replace line 21:

```js
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
```

with:

```js
const SettingsRedirect = lazy(() => import('./components/settings/SettingsRedirect'))
```

Replace line 101:

```jsx
            <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
```

with:

```jsx
            <Route path="settings" element={<SettingsRedirect />} />
```

Delete the old page:

```bash
git rm src/pages/SettingsPage.jsx
```

Then check for orphans: `grep -rn "SettingsPage" src/` must return nothing. Also run `grep -rn "ActionCard" src/ --include="*.jsx" | grep -v __tests__` — if `ActionCard.jsx` has no remaining consumers, leave the file in place (out of scope to remove) but note it in the commit body.

- [ ] **Step 5: Full verification**

```bash
npm run lint
npm run test
npm run build
```

Expected: all pass, no unused-import warnings from the touched files.

Manual pass (dev server, `npm run dev`, http://localhost:5173):

1. Sidebar user menu → Settings opens the modal (not a route change).
2. All four sections render; nav switching works; search for "export" jumps to Data and dims others.
3. Appearance: System/Light/Dark — flip OS theme while on System and watch the app follow; Light/Dark override.
4. Font toggle still changes card typeface.
5. Profile: rename (blur commits + toast), icon picker, color swatch — check the sidebar avatar updates.
6. Account: email + plan correct; Change password navigates; Sign out returns to landing.
7. Data: export downloads a JSON containing boards/columns/cards, no notes key.
8. Visit `/settings` directly → lands on dashboard with modal open.
9. Escape and overlay click close the modal. Repeat spot checks in dark theme.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(settings): open settings as a modal; /settings redirects; delete SettingsPage"
```

---

## Post-plan checks

- The spec's "Import and Clear all data are deleted" is satisfied by deleting `SettingsPage.jsx` (they lived only there).
- `noteStore` remains untouched (still unwired, per CLAUDE.md) — the deleted page was its last importer besides `NotesPage`; do not remove the store.
- `RouteLoadingShell.jsx` mentions `/settings` in a comment only — leave it.
