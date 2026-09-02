import { describe, test, expect } from 'vitest'
import { routeMeta, buildHeadTags, headTagsToHtml, applyHeadMeta, MANAGED_HEAD_SELECTOR } from '../lib/headMeta'

const route = {
  path: '/pricing',
  title: 'Pricing — Kolumn',
  description: 'Desc & more',
  ogTitle: 'Kolumn pricing',
  ogDescription: 'OG desc',
  jsonLd: () => [{ '@type': 'Product', name: 'Kolumn' }],
}

describe('routeMeta', () => {
  test('builds canonical from SITE_URL and falls back og to title/description', () => {
    const m = routeMeta(route)
    expect(m.canonical).toBe('https://kolumn.app/pricing')
    expect(m.ogTitle).toBe('Kolumn pricing')
    expect(routeMeta({ ...route, ogTitle: undefined }).ogTitle).toBe('Pricing — Kolumn')
    expect(m.jsonLd).toHaveLength(1)
  })
})

describe('headTagsToHtml', () => {
  test('escapes attribute values and serializes json-ld', () => {
    const html = headTagsToHtml(buildHeadTags(routeMeta(route)))
    expect(html).toContain('<title>Pricing — Kolumn</title>')
    expect(html).toContain('<meta name="description" content="Desc &amp; more">')
    expect(html).toContain('<link rel="canonical" href="https://kolumn.app/pricing">')
    expect(html).toContain('<meta property="og:url" content="https://kolumn.app/pricing">')
    expect(html).toContain('<meta name="robots" content="index, follow, max-image-preview:large">')
    expect(html).toContain('<script type="application/ld+json" data-kolumn-jsonld>{"@type":"Product","name":"Kolumn"}</script>')
  })
})

describe('applyHeadMeta', () => {
  test('replaces existing managed tags instead of duplicating them', () => {
    document.head.innerHTML =
      '<meta charset="UTF-8"><title>Old</title><meta name="description" content="old"><meta property="og:title" content="old">'
    applyHeadMeta(document, routeMeta(route))
    expect(document.title).toBe('Pricing — Kolumn')
    expect(document.querySelectorAll('title')).toHaveLength(1)
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="description"]').content).toBe('Desc & more')
    expect(document.querySelector('link[rel="canonical"]').href).toBe('https://kolumn.app/pricing')
    expect(document.querySelectorAll('script[data-kolumn-jsonld]')).toHaveLength(1)
    expect(document.querySelector('meta[charset]')).not.toBeNull()

    applyHeadMeta(document, routeMeta({ ...route, title: 'Second — Kolumn' }))
    expect(document.querySelectorAll('title')).toHaveLength(1)
    expect(document.title).toBe('Second — Kolumn')
  })

  test('managed selector matches only owned tags', () => {
    document.head.innerHTML = '<meta charset="UTF-8"><link rel="icon" href="/x.ico"><title>T</title>'
    expect(document.head.querySelectorAll(MANAGED_HEAD_SELECTOR)).toHaveLength(1)
  })
})
