// Guards against a page shipping with no Open Graph share image: every
// route in MARKETING_ROUTES must have a generated public/og/<slug>.png
// (see scripts/og-generate.mjs and src/lib/ogMeta.js). Add a page without
// running `npm run og` afterward, and this test goes red.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, test, expect } from 'vitest'
import { MARKETING_ROUTES } from '../content/marketing-routes'
import { ogSlugForPath } from '../lib/ogMeta'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')

describe('Open Graph share images', () => {
  test('every marketing route has a generated public/og/<slug>.png', () => {
    const missing = MARKETING_ROUTES.map((r) => r.path)
      .filter((path) => !existsSync(resolve(repoRoot, 'public', 'og', `${ogSlugForPath(path)}.png`)))
    expect(missing, `missing OG image(s) — run "npm run og" to generate them: ${missing.join(', ')}`).toEqual([])
  })

  test('slugs are unique (no two routes collide on the same filename)', () => {
    const slugs = MARKETING_ROUTES.map((r) => ogSlugForPath(r.path))
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
