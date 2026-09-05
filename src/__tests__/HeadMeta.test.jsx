import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import HeadMeta from '../components/marketing/HeadMeta'

// The landing page is a registry route but renders outside MarketingLayout, so
// when the head-meta effect lived in that layout it never fired for '/': going
// from /pricing to home left the tab reading "Pricing — Kolumn". HeadMeta sits
// at the router level instead. These tests navigate by clicking rather than
// rendering at a path, because the title only goes stale on a second
// navigation — rendering once would pass even with the bug present.

function renderJourney() {
  return render(
    <MemoryRouter initialEntries={['/pricing']}>
      <HeadMeta />
      <Routes>
        <Route
          path="*"
          element={
            <>
              <Link to="/">home</Link>
              <Link to="/features">features</Link>
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.title = ''
})

describe('HeadMeta', () => {
  test('the title follows navigation to the landing page', async () => {
    renderJourney()
    expect(document.title).toBe('Pricing — Kolumn')

    await userEvent.click(screen.getByRole('link', { name: 'home' }))
    expect(document.title).not.toBe('Pricing — Kolumn')
    expect(document.title).toMatch(/Kolumn/)

    await userEvent.click(screen.getByRole('link', { name: 'features' }))
    expect(document.title).toMatch(/Features/)
  })

  test('the canonical link follows too, not just the title', async () => {
    renderJourney()
    await userEvent.click(screen.getByRole('link', { name: 'home' }))
    const canonical = document.querySelector('link[rel="canonical"]')
    expect(canonical?.getAttribute('href')).toBe('https://kolumn.app')
  })

  test('one title and one canonical survive repeated navigation', async () => {
    renderJourney()
    for (let i = 0; i < 3; i += 1) {
      await userEvent.click(screen.getByRole('link', { name: 'home' }))
      await userEvent.click(screen.getByRole('link', { name: 'features' }))
    }
    expect(document.querySelectorAll('title')).toHaveLength(1)
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  })
})
