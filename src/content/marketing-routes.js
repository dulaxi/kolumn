import { lazy } from 'react'
import { PRICING, pricingJsonLd } from './pricing'

// Canonical origin for canonical/OG URLs and the sitemap. No trailing slash.
export const SITE_URL = 'https://kolumn.app'

// Public routes that exist outside this registry and may be linked from the
// marketing chrome. Anything else must be a MARKETING_ROUTES path.
export const KNOWN_ROUTES = ['/', '/onboarding', '/terms', '/privacy', '/#sign-in']

// One entry per prerendered marketing page. This list drives App.jsx routes,
// head meta (title/description/canonical/OG/JSON-LD), the nav dead-link test,
// scripts/prerender.mjs, sitemap.xml and robots.txt.
export const MARKETING_ROUTES = [
  {
    path: '/pricing',
    title: PRICING.meta.title,
    description: PRICING.meta.description,
    ogTitle: PRICING.meta.ogTitle,
    ogDescription: PRICING.meta.ogDescription,
    jsonLd: pricingJsonLd,
    Component: lazy(() => import('../pages/marketing/PricingPage')),
  },
]

export function findMarketingRoute(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return MARKETING_ROUTES.find((r) => r.path === clean) || null
}
