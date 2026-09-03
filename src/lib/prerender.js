// Pure string helpers for scripts/prerender.mjs. No DOM, no React — these
// run in Node after `vite build` and are unit-tested under Vitest.

const MANAGED_TAG_PATTERNS = [
  /^\s*<title>.*<\/title>[ \t]*\n?/gm,
  /^\s*<meta name="description"[^>]*>[ \t]*\n?/gm,
  /^\s*<meta property="og:[^"]*"[^>]*>[ \t]*\n?/gm,
  /^\s*<meta name="twitter:[^"]*"[^>]*>[ \t]*\n?/gm,
]

export function stripManagedHeadTags(templateHtml) {
  return MANAGED_TAG_PATTERNS.reduce((html, pattern) => html.replace(pattern, ''), templateHtml)
}

export function injectIntoTemplate(templateHtml, { head, body }) {
  const rootTag = '<div id="root"></div>'
  if (!templateHtml.includes(rootTag)) {
    throw new Error('prerender: template has no empty <div id="root"></div> to replace')
  }
  const htmlTag = '<html lang="en">'
  if (!templateHtml.includes(htmlTag)) {
    // Stamping data-prerendered is what tells main.jsx to hydrateRoot
    // instead of createRoot. If this literal silently stops matching (a
    // lang change, an attribute reorder), the attribute never gets stamped,
    // hydration never happens, and nothing fails loudly — so fail loudly
    // here instead, the same way the missing-root-div check above does.
    throw new Error('prerender: template has no <html lang="en"> tag to mark as prerendered')
  }
  return stripManagedHeadTags(templateHtml)
    .replace(htmlTag, '<html lang="en" data-prerendered>')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace(rootTag, body)
}

export function buildSitemap(siteUrl, paths, lastmod) {
  const urls = paths
    .map((p) => {
      const loc = p === '/' ? `${siteUrl}/` : `${siteUrl}${p}`
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

// App shell routes are auth-gated and render nothing useful to a crawler.
const APP_PATHS = ['/dashboard', '/boards', '/chat', '/build', '/workspace', '/settings', '/plans', '/upgrade', '/sandbox']

export function buildRobots(siteUrl) {
  const disallow = APP_PATHS.map((p) => `Disallow: ${p}`).join('\n')
  return `User-agent: *\nAllow: /\n${disallow}\n\nSitemap: ${siteUrl}/sitemap.xml\n`
}
