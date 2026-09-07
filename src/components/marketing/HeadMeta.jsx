import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { findMarketingRoute } from '../../content/marketing-routes'
import { applyHeadMeta, routeMeta } from '../../lib/headMeta'

// Applies a route's <head> tags on client-side navigation. Renders nothing;
// mounted once inside the router alongside ScrollToTop.
//
// This deliberately lives at the router level rather than inside
// MarketingLayout. The landing page is a registry route but renders OUTSIDE
// that layout (it has its own hero and needs no <Outlet />), so a layout-owned
// effect never fired for it: navigating /pricing → / left the tab reading
// "Pricing — Kolumn". Any future route registered but rendered outside the
// layout would have inherited the same bug.
//
// A hard load needs no help — every registry route is prerendered with its
// tags already in the HTML. This is only for navigations that never hit the
// server.
export default function HeadMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const route = findMarketingRoute(pathname)
    if (route) applyHeadMeta(document, routeMeta(route))
  }, [pathname])

  return null
}
