// Generates one Open Graph share image per marketing page and writes it to
// public/og/<slug>.png. Run via `npm run og`.
//
// Why this exists rather than a build-time renderer: Railway builds this
// app, and shipping headless Chrome into that build would make it slow and
// fragile. Instead this is a local, one-off step — generate the PNGs here,
// commit them, and the production build never touches a browser (see
// scripts/prerender.mjs, which is a pure Node/JSDOM-free HTML serializer).
//
// How it works:
//   1. Boots a throwaway Vite dev server on its own port.
//   2. For each entry in src/content/marketing-routes.js, works out which
//      of the three approved OG layouts it uses (src/lib/ogMeta.js) and
//      opens /sandbox/asset-preview on the dev server with that layout's
//      copy as query params (see src/pages/AssetPreviewSandbox.jsx's
//      single-card render mode).
//   3. Screenshots the exact 1200×630 card and writes public/og/<slug>.png.
//
// MARKETING_ROUTES itself has extensionless relative imports (fine for
// Vite, not resolvable by plain Node ESM) — rather than reimplement Vite's
// resolver, the route list is read out of the *browser*, via the dev
// server's own module graph, exactly like any other ESM import during dev.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ogLayoutForPath, ogSectionForPath, ogSlugForPath, ogHeadlineForTitle } from '../src/lib/ogMeta.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT_DIR = join(ROOT, 'public', 'og')
const PORT = 5183
const BASE_URL = `http://127.0.0.1:${PORT}`

function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url)
        if (res.ok || res.status === 404) return resolve()
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) return reject(new Error(`dev server did not come up at ${url}`))
      setTimeout(tick, 300)
    }
    tick()
  })
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  console.log(`[og] starting dev server on port ${PORT}…`)
  const vite = spawn(join(ROOT, 'node_modules', '.bin', 'vite'), ['--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'pipe',
  })
  let viteError = ''
  vite.stderr.on('data', (d) => { viteError += d.toString() })
  const killServer = () => { vite.kill('SIGTERM') }
  process.on('exit', killServer)

  try {
    await waitForServer(`${BASE_URL}/sandbox/asset-preview`)
  } catch (err) {
    console.error(viteError)
    throw err
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 730 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()

  // Pull the route registry out of the dev server's own module graph — see
  // header comment for why this runs in-browser rather than in Node.
  await page.goto(`${BASE_URL}/sandbox/asset-preview`, { waitUntil: 'networkidle' })
  const routes = await page.evaluate(async () => {
    const mod = await import('/src/content/marketing-routes.js')
    return mod.MARKETING_ROUTES.map((r) => ({ path: r.path, title: r.title, description: r.description }))
  })
  console.log(`[og] ${routes.length} routes in the registry`)

  let count = 0
  for (const route of routes) {
    const layout = ogLayoutForPath(route.path)
    const title = ogHeadlineForTitle(route.title)
    const params = new URLSearchParams({ layout, title })
    if (layout === 'A' || layout === 'C') params.set('eyebrow', ogSectionForPath(route.path))
    if (layout === 'B') params.set('subhead', route.description)

    const url = `${BASE_URL}/sandbox/asset-preview?${params.toString()}`
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

    const slug = ogSlugForPath(route.path)
    const file = join(OUT_DIR, `${slug}.png`)
    await page.locator('[data-og-card]').screenshot({ path: file })
    count++
    console.log(`[og] ${route.path} (${layout}) → public/og/${slug}.png`)
  }

  await browser.close()
  killServer()
  process.off('exit', killServer)

  // Remove stale images for routes that no longer exist.
  const expected = new Set(routes.map((r) => `${ogSlugForPath(r.path)}.png`))
  for (const file of readdirSync(OUT_DIR)) {
    if (file.endsWith('.png') && !expected.has(file)) {
      unlinkSync(join(OUT_DIR, file))
      console.log(`[og] removed stale public/og/${file}`)
    }
  }

  console.log(`[og] done — ${count} images written to public/og/`)
}

main().catch((err) => {
  console.error('[og] failed:', err)
  process.exitCode = 1
})
