import { describe, test, expect } from 'vitest'
import { MARKETING_ROUTES, KNOWN_ROUTES, SITE_URL, findMarketingRoute } from '../content/marketing-routes'
import { NAV_LINKS, NAV_MENUS, FOOTER_GROUPS, PRIMARY_CTA, SIGN_IN } from '../content/marketing-nav'

const allNavTargets = () => [
  ...NAV_LINKS.map((l) => l.to),
  ...NAV_MENUS.flatMap((m) => m.columns.flat().map((l) => l.to)),
  ...FOOTER_GROUPS.flatMap((g) => g.links.map((l) => l.to)),
  PRIMARY_CTA.to,
  SIGN_IN.to,
]

describe('marketing routes', () => {
  test('site url has no trailing slash', () => {
    expect(SITE_URL).toMatch(/^https:\/\/[^/]+$/)
  })

  test('every route has a path, title, description and component', () => {
    for (const r of MARKETING_ROUTES) {
      expect(r.path).toMatch(/^\/[a-z0-9-/]*$/)
      expect(r.title.length).toBeLessThanOrEqual(60)
      expect(r.description.length).toBeLessThanOrEqual(155)
      expect(r.Component).toBeTruthy()
    }
  })

  test('findMarketingRoute resolves registered paths only', () => {
    expect(findMarketingRoute('/pricing')?.path).toBe('/pricing')
    expect(findMarketingRoute('/pricing/')?.path).toBe('/pricing')
    expect(findMarketingRoute('/nope')).toBeNull()
  })

  test('nav and footer never link to an unbuilt page', () => {
    const valid = new Set([...MARKETING_ROUTES.map((r) => r.path), ...KNOWN_ROUTES])
    for (const to of allNavTargets()) {
      if (to.startsWith('mailto:')) continue
      expect(valid.has(to), `dead link: ${to}`).toBe(true)
    }
  })
})
