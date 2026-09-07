import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../store/authStore', () => ({
  useAuthStore: Object.assign(() => null, { getState: () => ({ user: null }), subscribe: () => () => {} }),
}))

import MarketingLayout from '../components/marketing/MarketingLayout'
import { marketingRouteElements } from '../components/marketing/MarketingRoutes'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<MarketingLayout />}>{marketingRouteElements()}</Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('MarketingLayout', () => {
  test('renders skip link, nav, main, footer and the pricing page', async () => {
    renderAt('/pricing')
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('navigation', { name: /main/i })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Pricing' })).toBeInTheDocument()
  })

  // Head tags used to be this layout's job, which silently skipped the landing
  // page because it renders outside the layout. That moved to the router-level
  // HeadMeta component; its coverage lives in HeadMeta.test.jsx. What remains
  // this layout's own responsibility is pinning the theme.
  test('pins the light theme even when arriving from the dark app shell', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    renderAt('/pricing')
    await screen.findByRole('heading', { level: 1, name: 'Pricing' })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
