import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// React Router keeps the window's scroll position across a client-side
// navigation, so following a link from halfway down /pricing lands you halfway
// down /about. Renders nothing; mounted once inside the router.
//
// Three cases it deliberately does NOT scroll:
//   - a hash link (`/#sign-in`), where the browser is jumping to an anchor
//   - back/forward ('POP'), where the browser restores the prior position and
//     overriding it loses the reader's place
//   - the app shell, whose scroll behaviour is its own concern — matches the
//     same route list pickBootTheme uses in src/utils/theme.js
const APP_PATH = /^\/(dashboard|boards|chat|build|workspace|settings)(\/|$)/

export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (hash) return
    if (navigationType === 'POP') return
    if (APP_PATH.test(pathname)) return
    // 'instant' so a long page doesn't animate its whole height on every
    // navigation; reduced-motion users would get that regardless.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash, navigationType])

  return null
}
