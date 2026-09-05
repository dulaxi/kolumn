// Reference-measurement harness for marketing-page specs (see ../SKILL.md §1).
// Loads a real page and extracts computed styles + full-page screenshots so
// a spec can record source numbers beside the Kolumn mapping.
//
// Setup (not vendored into the repo — install where you run this):
//   npm install --no-save playwright-core   (in a scratch dir, not gambit-kanban)
// Node's ESM resolver looks for node_modules starting from THIS file's own
// directory, not your cwd — copy this script alongside that node_modules
// (or run it from that scratch dir) rather than invoking it in place.
// Needs a real Chrome at /Applications/Google Chrome.app — no browser binary
// ships with playwright-core, and `channel: 'chrome'` below points at it.
//
// Usage: node measure.mjs <url> <slug>
// Writes out/<slug>.png (full page, 1440w), out/<slug>-mobile.png (390w),
// out/<slug>.json (computed metrics), out/<slug>.txt (visible text outline).
import { chromium } from 'playwright-core'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [url, slug] = process.argv.slice(2)
if (!url || !slug) { console.error('usage: node measure.mjs <url> <slug>'); process.exit(1) }
const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'out')
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36' })
const page = await ctx.newPage()
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.error('goto:', e.message))
await page.waitForTimeout(1500)
// dismiss cookie banners if present
for (const sel of ['button:has-text("Accept")', 'button:has-text("Accept all")', 'button:has-text("Got it")']) {
  const b = page.locator(sel).first(); if (await b.count()) { await b.click().catch(() => {}); break }
}
// scroll to trigger lazy content
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)) } window.scrollTo(0, 0) })
await page.waitForTimeout(800)

const metrics = await page.evaluate(() => {
  const cs = (el) => getComputedStyle(el)
  const px = (v) => Math.round(parseFloat(v) || 0)
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) } }
  const typo = (el) => { const s = cs(el); return { font: s.fontFamily.split(',')[0].replace(/"/g, ''), size: px(s.fontSize), weight: s.fontWeight, lh: px(s.lineHeight), ls: s.letterSpacing, color: s.color, text: (el.innerText || '').trim().slice(0, 120) } }
  const pick = (sel, n = 6) => [...document.querySelectorAll(sel)].filter(e => e.getBoundingClientRect().height > 0).slice(0, n)

  const body = cs(document.body)
  const headings = {}
  for (const tag of ['h1', 'h2', 'h3', 'h4']) headings[tag] = pick(tag, 5).map(e => ({ ...typo(e), ...rect(e) }))
  const paragraphs = pick('main p, article p, section p, p', 6).map(e => ({ ...typo(e), w: rect(e).w }))
  const buttons = pick('a[class*="button"], a[class*="btn"], button, a[href*="signup"], a[href*="login"], a[href*="try"], a[href*="download"]', 8).map(e => { const s = cs(e); return { text: (e.innerText || '').trim().slice(0, 40), h: rect(e).h, padX: px(s.paddingLeft), padY: px(s.paddingTop), radius: s.borderRadius, bg: s.backgroundColor, color: s.color, size: px(s.fontSize), weight: s.fontWeight, border: s.border } })

  // Sections: top-level blocks inside main (or body) with meaningful height
  const root = document.querySelector('main') || document.body
  const kids = [...root.children].filter(e => rect(e).h > 40)
  const sections = kids.flatMap(k => (k.children.length > 1 && rect(k).h > 2000 ? [...k.children] : [k])).filter(e => rect(e).h > 40).slice(0, 30).map(e => {
    const s = cs(e); const r = rect(e)
    // first inner container narrower than viewport
    let cont = null
    const walker = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT)
    let n; let i = 0
    while ((n = walker.nextNode()) && i++ < 200) { const w = n.getBoundingClientRect().width; if (w > 300 && w < window.innerWidth - 40) { const c = cs(n); cont = { w: Math.round(w), maxWidth: c.maxWidth, padX: px(c.paddingLeft) }; break } }
    const h = e.querySelector('h1,h2,h3')
    return { tag: e.tagName.toLowerCase(), cls: (e.className || '').toString().slice(0, 60), y: r.y, h: r.h, padTop: px(s.paddingTop), padBottom: px(s.paddingBottom), bg: s.backgroundColor, container: cont, heading: h ? (h.innerText || '').trim().slice(0, 80) : null }
  })

  const nav = document.querySelector('header, nav')
  const navInfo = nav ? { h: rect(nav).h, bg: cs(nav).backgroundColor, position: cs(nav).position, links: [...nav.querySelectorAll('a')].map(a => (a.innerText || '').trim()).filter(Boolean).slice(0, 40) } : null
  const footer = document.querySelector('footer')
  const footerInfo = footer ? { h: rect(footer).h, bg: cs(footer).backgroundColor, cols: [...footer.querySelectorAll('ul, nav > div, [class*="col"]')].length, links: [...footer.querySelectorAll('a')].map(a => (a.innerText || '').trim()).filter(Boolean).slice(0, 120) } : null

  const colors = {}
  for (const el of [...document.querySelectorAll('*')].slice(0, 3000)) { const s = cs(el); for (const k of [s.backgroundColor, s.color]) if (k && k !== 'rgba(0, 0, 0, 0)') colors[k] = (colors[k] || 0) + 1 }
  const palette = Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([c, n]) => `${c} ×${n}`)

  const meta = {}
  for (const m of document.querySelectorAll('meta[name], meta[property]')) meta[m.getAttribute('name') || m.getAttribute('property')] = (m.getAttribute('content') || '').slice(0, 200)
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent.slice(0, 600))

  return { url: location.href, title: document.title, pageHeight: document.body.scrollHeight, body: { font: body.fontFamily.split(',')[0], size: px(body.fontSize), lh: px(body.lineHeight), color: body.color, bg: body.backgroundColor }, headings, paragraphs, buttons, sections, nav: navInfo, footer: footerInfo, palette, meta, jsonld: ld, fonts: [...document.fonts].map(f => `${f.family} ${f.weight} ${f.style}`).filter((v, i, a) => a.indexOf(v) === i).slice(0, 20) }
})
writeFileSync(join(out, `${slug}.json`), JSON.stringify(metrics, null, 2))

const outline = await page.evaluate(() => {
  const lines = []
  const walk = (el, depth) => {
    for (const c of el.children) {
      const t = c.tagName.toLowerCase()
      if (/^h[1-6]$/.test(t)) lines.push(`${'  '.repeat(depth)}${t.toUpperCase()}: ${(c.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 160)}`)
      else if (t === 'p' || t === 'li' || t === 'blockquote') { const s = (c.innerText || '').trim().replace(/\s+/g, ' '); if (s) lines.push(`${'  '.repeat(depth)}${t}: ${s.slice(0, 240)}`) }
      else if (t === 'a' || t === 'button') { const s = (c.innerText || '').trim().replace(/\s+/g, ' '); if (s && s.length < 60) lines.push(`${'  '.repeat(depth)}[${t}] ${s}${c.href ? ' → ' + c.getAttribute('href') : ''}`) }
      else if (!['script', 'style', 'svg', 'noscript'].includes(t)) walk(c, depth)
    }
  }
  walk(document.body, 0)
  return lines.join('\n')
})
writeFileSync(join(out, `${slug}.txt`), outline)

await page.screenshot({ path: join(out, `${slug}.png`), fullPage: true })
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(500)
await page.screenshot({ path: join(out, `${slug}-mobile.png`), fullPage: true })
await browser.close()
console.log(`ok ${slug}: ${metrics.title} (${metrics.pageHeight}px, ${metrics.sections.length} sections)`)
