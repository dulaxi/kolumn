import { Route } from 'react-router-dom'
import ErrorBoundary from '../ErrorBoundary'
import { MARKETING_ROUTES } from '../../content/marketing-routes'

// The <Route> children for the marketing layout route. Used by App.jsx
// (BrowserRouter) and src/prerender-entry.jsx (StaticRouter) so both render
// the identical tree — a requirement for hydration to match.
export function marketingRouteElements() {
  return MARKETING_ROUTES.map(({ path, Component, props }) => (
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
