import { describe, test, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import TutorialsPage from '../pages/marketing/TutorialsPage'
import TutorialPage from '../pages/marketing/TutorialPage'
import BlogPage from '../pages/marketing/BlogPage'
import BlogPostPage from '../pages/marketing/BlogPostPage'
import ChangelogPage from '../pages/marketing/ChangelogPage'
import CustomersPage from '../pages/marketing/CustomersPage'
import CustomerStoryPage from '../pages/marketing/CustomerStoryPage'

import { TUTORIALS, getTutorial } from '../content/tutorials'
import { BLOG_POSTS, getPost } from '../content/blog'
import { CHANGELOG_ENTRIES } from '../content/changelog'
import { CUSTOMER_STORIES, getStory } from '../content/customers'

// Same helpers as src/__tests__/TemplatesConnectors.test.jsx — kept local
// rather than shared to avoid coupling an unrelated marketing page's test
// file to this one.
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

function renderRoute(path, routePath, Component) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={<Component />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tutorials
// ---------------------------------------------------------------------------

describe('TutorialsPage (hub)', () => {
  test('lists every tutorial with a link to its article', () => {
    render(<MemoryRouter><TutorialsPage /></MemoryRouter>)
    expect(TUTORIALS).toHaveLength(8)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    for (const t of TUTORIALS) {
      const link = screen.getByRole('link', { name: new RegExp(t.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      expect(link).toHaveAttribute('href', `/tutorials/${t.slug}`)
    }
  })

  test('no heading-level skips and no lime-filled buttons', () => {
    const { container } = render(<MemoryRouter><TutorialsPage /></MemoryRouter>)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })
})

describe('TutorialPage (article)', () => {
  test('the pill tutorial renders its full body, matching QuickAddBar behavior', () => {
    renderRoute('/tutorials/list-to-cards-with-the-pill', '/tutorials/:slug', TutorialPage)
    expect(screen.getByRole('heading', { level: 1, name: /turn a list into cards with the pill/i })).toBeInTheDocument()
    expect(screen.getByText(/type a task or paste notes/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /step 1 — paste a list, one item per line/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /step 3 — or just say what you want/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /limits worth knowing/i })).toBeInTheDocument()
    expect(screen.getByText(/20 messages a day/i)).toBeInTheDocument()
  })

  // Every tutorial now has a markdown body, so this cannot pin a real slug —
  // writing one would break the test. The coming-soon path is still live for
  // any future entry added to tutorials.js before its .md file exists, so
  // exercise it against a synthetic body-less tutorial instead.
  test('a tutorial without a body renders a coming-soon state, not an empty page', async () => {
    vi.resetModules()
    vi.doMock('../content/tutorials', async () => {
      const actual = await vi.importActual('../content/tutorials')
      const stub = { slug: 'zz-unwritten', title: 'An unwritten tutorial', summary: 'Placeholder.', body: null }
      return { ...actual, getTutorial: (slug) => (slug === stub.slug ? stub : actual.getTutorial(slug)) }
    })
    const { default: Page } = await import('../pages/marketing/TutorialPage')
    render(
      <MemoryRouter initialEntries={['/tutorials/zz-unwritten']}>
        <Routes><Route path="/tutorials/:slug" element={<Page />} /></Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'An unwritten tutorial' })).toBeInTheDocument()
    expect(screen.getByText(/being written/i)).toBeInTheDocument()
    vi.doUnmock('../content/tutorials')
    vi.resetModules()
  })

  test('unknown slug shows a not-found state instead of crashing', () => {
    renderRoute('/tutorials/does-not-exist', '/tutorials/:slug', TutorialPage)
    expect(screen.getByRole('heading', { level: 1, name: /tutorial not found/i })).toBeInTheDocument()
  })

  test('renders correctly for every tutorial slug (all 8)', () => {
    for (const tutorial of TUTORIALS) {
      const { unmount } = renderRoute(`/tutorials/${tutorial.slug}`, '/tutorials/:slug', TutorialPage)
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      unmount()
    }
  })

  test('no heading-level skips and no lime-filled buttons', () => {
    const { container } = renderRoute('/tutorials/list-to-cards-with-the-pill', '/tutorials/:slug', TutorialPage)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })
})

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

describe('BlogPage (index)', () => {
  test('lists every post with a link to its article, undated', () => {
    render(<MemoryRouter><BlogPage /></MemoryRouter>)
    expect(BLOG_POSTS).toHaveLength(3)
    for (const post of BLOG_POSTS) {
      const link = screen.getByRole('link', { name: new RegExp(post.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      expect(link).toHaveAttribute('href', `/blog/${post.slug}`)
    }
    // No fabricated author names or dates anywhere on the index.
    expect(document.body.textContent).not.toMatch(/\bby\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/)
  })

  test('no heading-level skips and no lime-filled buttons', () => {
    const { container } = render(<MemoryRouter><BlogPage /></MemoryRouter>)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })
})

describe('BlogPostPage (article)', () => {
  test('every post renders its body', () => {
    for (const post of BLOG_POSTS) {
      expect(post.body.length).toBeGreaterThan(0)
      const { unmount } = renderRoute(`/blog/${post.slug}`, '/blog/:slug', BlogPostPage)
      expect(screen.getByRole('heading', { level: 1, name: new RegExp(post.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeInTheDocument()
      expect(screen.getByText(post.body[0].text)).toBeInTheDocument()
      unmount()
    }
  })

  test('the SOC 2 / compliance post stays vague, never claims a certification', () => {
    renderRoute('/blog/what-we-dont-do-with-your-boards', '/blog/:slug', BlogPostPage)
    expect(document.body.textContent).not.toMatch(/soc\s*2 certified|we are soc\s*2/i)
  })

  test('unknown slug shows a not-found state instead of crashing', () => {
    renderRoute('/blog/does-not-exist', '/blog/:slug', BlogPostPage)
    expect(screen.getByRole('heading', { level: 1, name: /post not found/i })).toBeInTheDocument()
  })

  test('no heading-level skips and no lime-filled buttons', () => {
    const { container } = renderRoute('/blog/why-kolumn-stayed-a-kanban', '/blog/:slug', BlogPostPage)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })
})

// ---------------------------------------------------------------------------
// Changelog
// ---------------------------------------------------------------------------

describe('ChangelogPage', () => {
  test('lists all six verified entries, tagged and dated', () => {
    render(<MemoryRouter><ChangelogPage /></MemoryRouter>)
    expect(CHANGELOG_ENTRIES).toHaveLength(6)
    for (const entry of CHANGELOG_ENTRIES) {
      expect(screen.getAllByText(entry.title).length).toBeGreaterThan(0)
      expect(['new', 'improved', 'fixed']).toContain(entry.tag)
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  test('every linked tutorial slug exists', () => {
    for (const entry of CHANGELOG_ENTRIES) {
      if (entry.links?.tutorial) {
        expect(getTutorial(entry.links.tutorial)).not.toBeNull()
      }
    }
  })

  test('no version numbers anywhere on the page', () => {
    render(<MemoryRouter><ChangelogPage /></MemoryRouter>)
    expect(document.body.textContent).not.toMatch(/\bv\d+\.\d+(\.\d+)?\b/)
  })

  test('no heading-level skips and no lime-filled buttons', () => {
    const { container } = render(<MemoryRouter><ChangelogPage /></MemoryRouter>)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })
})

// ---------------------------------------------------------------------------
// Customers — the accuracy-critical surface: Kolumn has no real customers,
// so every story must be visibly labelled a scenario in both places it can
// be discovered.
// ---------------------------------------------------------------------------

describe('CustomersPage (hub) — scenario labelling', () => {
  test('lists all four scenarios with links to their story pages', () => {
    render(<MemoryRouter><CustomersPage /></MemoryRouter>)
    expect(CUSTOMER_STORIES).toHaveLength(4)
    expect(CUSTOMER_STORIES.every((s) => s.kind === 'scenario')).toBe(true)
    for (const story of CUSTOMER_STORIES) {
      const link = screen.getByRole('link', { name: new RegExp(story.headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      expect(link).toHaveAttribute('href', `/customers/${story.slug}`)
    }
  })

  test('every story tile is visibly labelled "Scenario", including the featured one', () => {
    render(<MemoryRouter><CustomersPage /></MemoryRouter>)
    const labels = screen.getAllByText('Scenario')
    expect(labels.length).toBeGreaterThanOrEqual(CUSTOMER_STORIES.length)
    for (const story of CUSTOMER_STORIES) {
      const link = screen.getByRole('link', { name: new RegExp(story.headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      expect(within(link).getByText('Scenario')).toBeInTheDocument()
    }
    // Honesty disclosure must be present, not just the tag.
    expect(screen.getByText(/scenarios are illustrative/i)).toBeInTheDocument()
    expect(screen.getByText(/we don.t have customer logos/i)).toBeInTheDocument()
  })

  test('no invented company names or fabricated metrics on the hub', () => {
    render(<MemoryRouter><CustomersPage /></MemoryRouter>)
    const bodyText = document.body.textContent
    expect(bodyText).not.toMatch(/\b\d+%\s*(faster|increase|reduction)/i)
  })

  test('no heading-level skips and no lime-filled buttons', () => {
    const { container } = render(<MemoryRouter><CustomersPage /></MemoryRouter>)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })
})

describe('CustomerStoryPage — scenario labelling and body', () => {
  test('every scenario visibly labels itself in the hero, with a plain-language disclosure', () => {
    for (const story of CUSTOMER_STORIES) {
      const { unmount } = renderRoute(`/customers/${story.slug}`, '/customers/:slug', CustomerStoryPage)
      expect(screen.getByRole('heading', { level: 1, name: new RegExp(story.headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeInTheDocument()
      expect(screen.getAllByText('Scenario').length).toBeGreaterThan(0)
      expect(screen.getByText(/illustrative scenario/i)).toBeInTheDocument()
      expect(screen.getByText(/not a named customer/i)).toBeInTheDocument()
      unmount()
    }
  })

  test('quote attribution is always marked (composite), never a real-sounding name alone', () => {
    for (const story of CUSTOMER_STORIES) {
      expect(story.quoteBy).toMatch(/\(composite\)$/)
    }
  })

  test('renders the full narrative body for every story', () => {
    for (const story of CUSTOMER_STORIES) {
      expect(story.body.length).toBeGreaterThan(0)
      const { unmount } = renderRoute(`/customers/${story.slug}`, '/customers/:slug', CustomerStoryPage)
      expect(screen.getByText(story.body[0].text)).toBeInTheDocument()
      unmount()
    }
  })

  test('renders no fabricated metrics — metrics fields stay absent from every scenario', () => {
    for (const story of CUSTOMER_STORIES) {
      expect(story.metrics).toBeUndefined()
    }
  })

  test('unknown slug shows a not-found state instead of crashing', () => {
    renderRoute('/customers/does-not-exist', '/customers/:slug', CustomerStoryPage)
    expect(screen.getByRole('heading', { level: 1, name: /story not found/i })).toBeInTheDocument()
  })

  test('no heading-level skips and no lime-filled buttons', () => {
    const { container } = renderRoute('/customers/two-person-studio', '/customers/:slug', CustomerStoryPage)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })
})

describe('content integrity', () => {
  test('getStory / getTutorial / getPost return null for unknown slugs', () => {
    expect(getStory('nope')).toBeNull()
    expect(getTutorial('nope')).toBeNull()
    expect(getPost('nope')).toBeNull()
  })
})
