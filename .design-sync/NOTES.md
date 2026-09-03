# design-sync notes — Kolumn

- The repo is an app, not a packaged library: the bundle entry is the hand-curated `.design-sync/ds-entry.mjs` (passed via `--entry`), NOT a dist build. Add new synced components there AND in `cfg.componentSrcMap`.
- `src/lib/env.js` throws without Vite env. `.design-sync/embed-flag.js` (first import of ds-entry) sets `globalThis.__KOLUMN_EMBED__`, which env.js honors with inert placeholder Supabase values. Keep that import first — module init order is the whole mechanism.
- CSS is compiled Tailwind v4: `cfg.buildCmd` runs `@tailwindcss/cli` over `src/index.css` into `.design-sync/.cache/tailwind.css` (= `cfg.cssEntry`). Re-run before the converter whenever src styles/classes change. Preview glue classes in `.design-sync/previews/*.tsx` are scanned by Tailwind (repo cwd scan), so utilities used only in previews still compile.
- Fonts: `src/fonts.css` uses absolute `/fonts/...` URLs (public/); `.design-sync/fonts.css` is the converter-readable copy with relative paths — keep in step. Inter Variable + IBM Plex Mono come from fontsource via `cfg.extraFonts`.
- `ChatMessage` renders react-router `<Link>` → `cfg.provider` = `MemoryRouter` (re-exported from ds-entry).
- Card/ChatMessage pull zustand stores (board/auth/settings/presence) + supabase-js into the bundle (~2MB). Stores are global (no provider needed); supabase network calls dead-end at the placeholder host, which previews never exercise.

- Per-component docs live in `.design-sync/docs/<Name>.md` (wired via `cfg.docsDir`); frontmatter `category` sets the DS-pane group (Primitives / Board / Chat). Keep them in step with component API changes — they become the design agent's `.prompt.md`.

## Preview-authoring learnings (wave 1, 2026-08-05)

- Board-card icons come from the **Phosphor icon font** (`@phosphor-icons/web`, `<i class="ph ph-…">` via `DynamicIcon`), not `@phosphor-icons/react`. `.design-sync/build-css.mjs` (= `cfg.buildCmd`) appends the regular+fill glyph classes to the compiled CSS; the Phosphor woff2s ship via `cfg.extraFonts`. Without both, card icon tiles render empty.
- Flex-column glue in previews needs `alignItems: 'flex-start'` — the default stretch blows up inline-flex components (SegmentedControl rendered full-width before that fix).
- `Avatar`: boolean prop is `ringed` (+ `ringColor` class string), initials render lowercased.
- Modal's body-portal fixed-inset overlay stays contained in the capture cell — no `cfg.overrides.Modal` needed (revisit if the capture harness changes).
- `Tooltip` has no controlled `open`; the bubble is unreachable statically (300ms hover timer + portal). Preview shows trigger compositions only — deliberate, not a gap.
- `ChatMessage` embedded-card rails resolve `cardIds` against the (empty) board store → not renderable in previews. `ChatInput`'s `docked` is just an `mx-auto max-w-2xl` wrapper: give the docked cell a frame wider than 672px or docked/undocked render identically. Its `blockedHint`/draft-text states are internal-only, unreachable statically.
- Skeleton board-ghost blocks use 16px radius to honor the kanban-card radius exception.

## Bundle-size stubs (added after blank-tile incident, 2026-08-05)

- The store graph dragged zod (580KB), supabase-js (~470KB), and sentry (39KB) into `_ds_bundle.js` (2.0MB total); the claude.ai/design preview pane showed **blank tiles for every component** while registration (manifest/d.ts) worked — consistent with a serving cap on large files. Fix: `.design-sync/stubs/{zod,supabase,sentry}.js` mapped via `cfg.tsconfig` → `.design-sync/tsconfig.stubs.json` (esbuild paths). Bundle now 879KB, all 15 previews still render. **Confirmed fix**: tiles rendered in the app immediately after the slim re-upload — keep `_ds_bundle.js` under ~1MB.
- The stubs are inert proxies: previews never validate (zod), never touch the network (supabase), never report (sentry). If a synced component ever *renders* something zod/supabase-derived at module scope, revisit.
- If the app's serving limits change or tiles blank again: check file sizes first (`wc -c ds-bundle/_ds_bundle.js` — keep it under `_vendor/react.js`'s ~1.1MB, the format's proven-served size).

## Re-sync risks (watch-list for the next run)

- **`.design-sync/fonts.css` is a manual mirror of `src/fonts.css`** — a font added/removed in the app won't propagate until the mirror is updated. Same for `.design-sync/docs/*.md`: hand-written API docs that silently rot when component props change (they become the design agent's `.prompt.md` — check them when a synced component's API moves).
- **`ds-entry.mjs` + `componentSrcMap` are the component roster** — a new primitive in `src/components/ui/` does NOT auto-sync; add it to both.
- **`src/lib/env.js` carries the `__KOLUMN_EMBED__` escape** the bundle depends on. If someone refactors env.js and drops it, the whole bundle throws at load (Card/ChatMessage → stores → supabase → env).
- **Compiled-CSS coverage**: the shipped stylesheet has only classes used in app source (+ previews). New preview glue relying on unseen Tailwind utilities renders unstyled — the conventions header tells the design agent to use inline `var(--token)` styles for glue; keep that guidance true.
- **Phosphor versions**: glyph classes are appended from `node_modules/@phosphor-icons/web` at buildCmd time — a package bump changes glyph coverage; card icons are the canary.
- Only partially verified: Tooltip's bubble (hover-only, structurally unreachable in static capture — trigger compositions only); ChatMessage's embedded-card rail (needs seeded board store, skipped).
- Build assumptions: node 24 + npm; `npx -y @tailwindcss/cli@4` fetched at buildCmd time (network); Playwright chromium-headless-shell v1234 in ~/Library/Caches/ms-playwright.

## Known render warns

- `[FONT_MISSING] "Inter"` — the plain-Inter entry in `--font-sans` is a graceful-degradation fallback; the primary `Inter Variable` @font-face ships. Deliberate, matches the app.
