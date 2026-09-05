import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import ScrollToTop from '../components/marketing/ScrollToTop'

// React Router preserves window scroll across a client-side navigation, so
// following a link from halfway down one page lands you halfway down the next.
// ScrollToTop fixes that, with three deliberate exceptions: hash links, browser
// back/forward, and the app shell.
//
// Note these tests navigate by clicking a link rather than rendering at a path.
// A router's first render reports navigationType 'POP', which the component
// deliberately ignores, so rendering straight at a path proves nothing.

function renderWithLinkTo(to) {
  return render(
    <MemoryRouter initialEntries={['/start']}>
      <ScrollToTop />
      <Routes>
        <Route path="*" element={<Link to={to}>go</Link>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function navigateTo(to) {
  renderWithLinkTo(to)
  await userEvent.click(screen.getByRole('link', { name: 'go' }))
}

beforeEach(() => {
  window.scrollTo = vi.fn()
})

describe('ScrollToTop', () => {
  test('scrolls to the top when navigating to a marketing route', async () => {
    await navigateTo('/about')
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
  })

  test('leaves a hash link alone so the anchor can win', async () => {
    await navigateTo('/#sign-in')
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  test.each([
    '/dashboard',
    '/boards/abc',
    '/chat/1',
    '/build',
    '/workspace',
    '/settings',
  ])('leaves the app shell alone (%s)', async (path) => {
    await navigateTo(path)
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  test('a path merely starting with an app word is still a marketing route', async () => {
    // '/boardsomething' must not be mistaken for '/boards'
    await navigateTo('/boardsomething')
    expect(window.scrollTo).toHaveBeenCalled()
  })
})
