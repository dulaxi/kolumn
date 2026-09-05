// @vitest-environment node
import { describe, test, expect } from 'vitest'
import { renderRoute } from '../prerender-entry'

describe('renderRoute', () => {
  test('renders /pricing to fully resolved static HTML, not a Suspense fallback', async () => {
    const html = await renderRoute('/pricing')
    expect(html.startsWith('<div id="root">')).toBe(true)
    expect(html).toContain('aria-label="Main"')
    expect(html).toMatch(/<h1[^>]*>Pricing<\/h1>/)
    expect(html).toContain('Compare plans')
    expect(html).toContain('Frequently asked questions')
    expect(html).toContain('<footer')
  })

  test('never pulls the env-validating auth path into the SSR graph', async () => {
    const html = await renderRoute('/pricing')
    expect(html).toContain('Get started')
    expect(html).not.toContain('Open Kolumn')
  })
})
