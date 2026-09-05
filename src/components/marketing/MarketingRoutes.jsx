import { Route } from 'react-router-dom'
import ErrorBoundary from '../ErrorBoundary'
import { MARKETING_ROUTES } from '../../content/marketing-routes'

// The <Route> children for the marketing layout route. Used by App.jsx
// (BrowserRouter) and src/prerender-entry.jsx (StaticRouter) so both render
// the identical tree — a requirement for hydration to match.
//
// '/' is excluded: it's registered in MARKETING_ROUTES (for prerendering,
// the sitemap, and its own head meta) but App.jsx routes it to LandingPage
// directly, outside MarketingLayout — LandingPage has its own nav/footer.
// Rendering it here too would register a second, unreachable "/" route.
export function marketingRouteElements() {
  return MARKETING_ROUTES.filter(({ path }) => path !== '/').map(({ path, Component, props }) => (
    <Route
      key={path}
      path={path}
      element={
        <ErrorBoundary>
          <Component {...props} />
        </ErrorBoundary>
      }
    />
  ))
}
