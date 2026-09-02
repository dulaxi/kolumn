import { describe, test, expect } from 'vitest'
import { stripManagedHeadTags, injectIntoTemplate, buildSitemap, buildRobots } from '../lib/prerender'

const template = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Kolumn — Project Management</title>
    <meta name="description" content="A modern Kanban." />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Kolumn — Project Management" />
    <meta name="twitter:card" content="summary" />
    <link rel="icon" href="/favicon.ico" />
  </head>
  <body style="margin:0">
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`

describe('stripManagedHeadTags', () => {
  test('removes title, description, og and twitter tags but keeps the rest', () => {
    const out = stripManagedHeadTags(template)
    expect(out).not.toMatch(/<title>/)
    expect(out).not.toMatch(/name="description"/)
    expect(out).not.toMatch(/property="og:/)
    expect(out).not.toMatch(/name="twitter:/)
    expect(out).toMatch(/charset="UTF-8"/)
    expect(out).toMatch(/rel="icon"/)
  })
})

describe('injectIntoTemplate', () => {
  test('inserts head tags, replaces the root div, marks html as prerendered', () => {
    const out = injectIntoTemplate(template, { head: '<title>Pricing — Kolumn</title>', body: '<div id="root"><h1>Pricing</h1></div>' })
    expect(out).toContain('<title>Pricing — Kolumn</title>\n  </head>')
    expect(out).toContain('<div id="root"><h1>Pricing</h1></div>')
    expect(out).not.toContain('<div id="root"></div>')
    expect(out).toContain('<html lang="en" data-prerendered>')
    expect(out).toContain('src="/assets/index.js"')
    expect(out.match(/<title>/g)).toHaveLength(1)
  })

  test('throws when the root div is missing', () => {
    expect(() => injectIntoTemplate('<html><head></head><body></body></html>', { head: '', body: 'x' })).toThrow(/root/)
  })
})

describe('sitemap and robots', () => {
  test('sitemap lists every path with the site url', () => {
    const xml = buildSitemap('https://kolumn.app', ['/', '/pricing'], '2026-09-02')
    expect(xml).toContain('<loc>https://kolumn.app/</loc>')
    expect(xml).toContain('<loc>https://kolumn.app/pricing</loc>')
    expect(xml).toContain('<lastmod>2026-09-02</lastmod>')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  test('robots allows crawling public routes, disallows app routes, points at the sitemap', () => {
    const txt = buildRobots('https://kolumn.app')
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Disallow: /dashboard')
    expect(txt).toContain('Disallow: /boards')
    expect(txt).toContain('Sitemap: https://kolumn.app/sitemap.xml')
  })
})
