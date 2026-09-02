// Head tags for marketing routes. Two consumers share one description of
// the tags: scripts/prerender.mjs serializes them into dist/<path>/index.html
// (headTagsToHtml), and MarketingLayout upserts them on client-side
// navigation (applyHeadMeta). Keep this file free of React and browser-only
// globals at module scope — it runs in Node during the build.
import { SITE_URL } from '../content/marketing-routes'

export const ROBOTS = 'index, follow, max-image-preview:large'

export const MANAGED_HEAD_SELECTOR = [
  'title',
  'meta[name="description"]',
  'meta[name="robots"]',
  'link[rel="canonical"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'script[data-kolumn-jsonld]',
].join(',')

export function routeMeta(route) {
  return {
    title: route.title,
    description: route.description,
    canonical: `${SITE_URL}${route.path === '/' ? '' : route.path}`,
    ogTitle: route.ogTitle || route.title,
    ogDescription: route.ogDescription || route.description,
    robots: ROBOTS,
    jsonLd: typeof route.jsonLd === 'function' ? route.jsonLd() : route.jsonLd || [],
  }
}

export function buildHeadTags(meta) {
  const tags = [
    { tag: 'title', attrs: {}, text: meta.title },
    { tag: 'meta', attrs: { name: 'description', content: meta.description } },
    { tag: 'meta', attrs: { name: 'robots', content: meta.robots } },
    { tag: 'link', attrs: { rel: 'canonical', href: meta.canonical } },
    { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: 'Kolumn' } },
    { tag: 'meta', attrs: { property: 'og:title', content: meta.ogTitle } },
    { tag: 'meta', attrs: { property: 'og:description', content: meta.ogDescription } },
    { tag: 'meta', attrs: { property: 'og:url', content: meta.canonical } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: meta.ogTitle } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: meta.ogDescription } },
  ]
  for (const obj of meta.jsonLd) {
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json', 'data-kolumn-jsonld': '' }, text: JSON.stringify(obj) })
  }
  return tags
}

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeText(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function headTagsToHtml(tags) {
  return tags
    .map(({ tag, attrs, text }) => {
      const attrString = Object.entries(attrs)
        .map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${escapeAttr(v)}"`))
        .join('')
      if (tag === 'script') return `<script${attrString}>${String(text).replaceAll('</', '<\\/')}</script>`
      if (tag === 'title') return `<title>${escapeText(text)}</title>`
      return `<${tag}${attrString}>`
    })
    .join('\n    ')
}

export function applyHeadMeta(doc, meta) {
  const head = doc.head
  for (const el of head.querySelectorAll(MANAGED_HEAD_SELECTOR)) el.remove()
  for (const { tag, attrs, text } of buildHeadTags(meta)) {
    const el = doc.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    if (text != null) el.textContent = text
    head.appendChild(el)
  }
}
