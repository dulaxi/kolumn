import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SupportPage from '../pages/marketing/SupportPage'
import SupportArticlePage from '../pages/marketing/SupportArticlePage'
import StatusPage from '../pages/marketing/StatusPage'
import { SUPPORT_CATEGORIES, findArticle } from '../content/support'
import { STATUS_COMPONENTS } from '../content/status'

function renderArticle(slug) {
  return render(
    <MemoryRouter initialEntries={[`/support/${slug}`]}>
      <Routes>
        <Route path="/support/:slug" element={<SupportArticlePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function checkNoLevelSkips(container) {
  const levels = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) => Number(el.tagName[1]))
  expect(levels[0]).toBe(1)
  for (let i = 1; i < levels.length; i += 1) {
    expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
  }
}

function checkNoLimeButtons(container) {
  for (const el of container.querySelectorAll('a, button')) {
    expect(el.className, el.textContent).not.toMatch(/bg-\[var\(--(accent-lime|color-lime)/)
  }
}

describe('SupportPage (hub)', () => {
  test('renders all six categories and every article as a link', () => {
    render(<MemoryRouter><SupportPage /></MemoryRouter>)
    expect(SUPPORT_CATEGORIES).toHaveLength(6)
    for (const category of SUPPORT_CATEGORIES) {
      expect(screen.getAllByText(category.label).length).toBeGreaterThan(0)
      for (const article of category.articles) {
        const links = screen.getAllByRole('link', { name: article.title })
        expect(links.length).toBeGreaterThan(0)
        for (const link of links) {
          expect(link).toHaveAttribute('href', `/support/${article.slug}`)
        }
      }
    }
  })

  test('has exactly one h1, no heading-level skips, and no lime-filled buttons', () => {
    const { container } = render(<MemoryRouter><SupportPage /></MemoryRouter>)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })

  test('offers a contact route with no phone number or ticketing claim', () => {
    render(<MemoryRouter><SupportPage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /email support/i })).toHaveAttribute('href', 'mailto:hello@kolumn.app')
    const bodyText = document.body.textContent
    expect(bodyText).not.toMatch(/phone|ticket/i)
  })
})

describe('SupportArticlePage', () => {
  test('a full article renders its body', () => {
    renderArticle('daily-limit')
    const article = findArticle('daily-limit').article
    expect(screen.getByRole('heading', { level: 1, name: article.title })).toBeInTheDocument()
    expect(screen.getByText(/20 messages a day on free/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /what counts as a message/i })).toBeInTheDocument()
  })

  test('the second full article (export/delete) also renders its body', () => {
    renderArticle('export-or-delete-your-data')
    expect(screen.getByRole('heading', { level: 2, name: /export a backup/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /delete your account/i })).toBeInTheDocument()
  })

  test('a body-less article renders the coming-soon state, not an empty page', () => {
    renderArticle('what-is-kolumn')
    const article = findArticle('what-is-kolumn').article
    expect(article.body).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: article.title })).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  test('an unknown slug shows a not-found state instead of crashing', () => {
    renderArticle('does-not-exist')
    expect(screen.getByRole('heading', { level: 1, name: /article not found/i })).toBeInTheDocument()
  })

  test('no heading-level skips and no lime-filled buttons on a full article', () => {
    const { container } = renderArticle('daily-limit')
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })
})

describe('StatusPage', () => {
  test('renders every component with an explicitly unknown status, not a hardcoded green state', () => {
    render(<MemoryRouter><StatusPage /></MemoryRouter>)
    expect(STATUS_COMPONENTS).toHaveLength(5)
    for (const component of STATUS_COMPONENTS) {
      expect(screen.getByText(component.name)).toBeInTheDocument()
    }
    const bodyText = document.body.textContent
    expect(bodyText).not.toMatch(/all systems operational/i)
    expect(screen.getAllByText(/unknown/i).length).toBeGreaterThan(0)
  })

  test('has exactly one h1, no heading-level skips, and no lime-filled buttons', () => {
    const { container } = render(<MemoryRouter><StatusPage /></MemoryRouter>)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })

  test('links to /support for anything the status page cannot answer', () => {
    render(<MemoryRouter><StatusPage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /visit support/i })).toHaveAttribute('href', '/support')
  })
})
