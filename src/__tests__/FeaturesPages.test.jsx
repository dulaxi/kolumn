import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import FeaturesPage from '../pages/marketing/FeaturesPage'
import FeaturePage from '../pages/marketing/FeaturePage'
import { FEATURES, FEATURE_PAGES } from '../content/features'

function renderFeaturePage(slug) {
  return render(
    <MemoryRouter initialEntries={[`/features/${slug}`]}>
      <Routes>
        <Route path="/features/:slug" element={<FeaturePage />} />
        <Route path="/features" element={<FeaturesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function headingLevels(container) {
  return [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) => Number(el.tagName[1]))
}

function assertNoHeadingSkips(container) {
  const levels = headingLevels(container)
  expect(levels[0]).toBe(1)
  for (let i = 1; i < levels.length; i += 1) {
    expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
  }
}

function assertNoLimeButtons(container) {
  for (const el of container.querySelectorAll('a, button')) {
    expect(el.className, el.textContent).not.toMatch(/bg-\[var\(--(accent-lime|color-lime)/)
  }
}

// Phrases the brief marks as unshipped (docs/superpowers/specs/marketing/
// _KOLUMN-BRIEF.md "Not shipped") or that would falsely claim chat's
// placeholder read tools (search_cards / summarize_board) work today.
const UNSHIPPED_CLAIMS = [
  /slack integration/i,
  /gmail integration/i,
  /native (?:mobile|desktop) app/i,
  /calendar view/i,
  /public api/i,
  /single sign-on|\bSSO\b|\bSAML\b/i,
  /search cards across/i,
  /searches? your (?:cards|boards) for you/i,
  /summarizes? (?:any|a) board/i,
  /reads the whole board through a read tool/i,
]

function assertNoUnshippedClaims(container) {
  const text = container.textContent
  for (const pattern of UNSHIPPED_CLAIMS) {
    expect(text, `matched ${pattern}`).not.toMatch(pattern)
  }
}

describe('FeaturesPage (hub)', () => {
  test('renders exactly one h1 and all six features by name and summary; only built pages link', () => {
    const { container } = render(
      <MemoryRouter>
        <FeaturesPage />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(FEATURES).toHaveLength(6)
    for (const feature of FEATURES) {
      const heading = screen.getByRole('heading', { level: 3, name: feature.name })
      expect(heading).toBeInTheDocument()
      expect(screen.getByText(feature.summary)).toBeInTheDocument()
      if (feature.to) {
        expect(container.querySelector(`a[href="${feature.to}"]`)).not.toBeNull()
      } else {
        // No detail page yet — the card must not be a link at all.
        expect(heading.closest('a')).toBeNull()
      }
    }
  })

  test('does not link to any of the four unbuilt feature pages', () => {
    render(
      <MemoryRouter>
        <FeaturesPage />
      </MemoryRouter>,
    )
    for (const slug of ['workspaces', 'templates', 'sync', 'search']) {
      expect(screen.queryByRole('link', { name: new RegExp(`^${slug}$`, 'i') })).toBeNull()
    }
  })

  test('heading outline has no level skips', () => {
    const { container } = render(
      <MemoryRouter>
        <FeaturesPage />
      </MemoryRouter>,
    )
    assertNoHeadingSkips(container)
  })

  test('no lime-filled buttons or links', () => {
    const { container } = render(
      <MemoryRouter>
        <FeaturesPage />
      </MemoryRouter>,
    )
    assertNoLimeButtons(container)
  })

  test('does not claim any unshipped feature', () => {
    const { container } = render(
      <MemoryRouter>
        <FeaturesPage />
      </MemoryRouter>,
    )
    assertNoUnshippedClaims(container)
  })
})

describe('FeaturePage — /features/pill', () => {
  test('renders the hero heading and how-it-works body copy', () => {
    renderFeaturePage('pill')
    const page = FEATURE_PAGES.pill
    expect(screen.getByRole('heading', { level: 1, name: page.hero.h1 })).toBeInTheDocument()
    expect(screen.getByText(page.hero.subhead)).toBeInTheDocument()
    for (const row of page.rows) {
      expect(screen.getByRole('heading', { name: row.h3 })).toBeInTheDocument()
      expect(screen.getByText(row.body)).toBeInTheDocument()
    }
    for (const item of page.faq) {
      expect(screen.getByRole('button', { name: item.q })).toBeInTheDocument()
    }
  })

  test('describes only tiered write actions Pro actually has (move/update/complete/duplicate/checklists/columns/members)', () => {
    renderFeaturePage('pill')
    expect(screen.getByText(/Create actions\./)).toBeInTheDocument()
    expect(screen.getByText(/Every write action: move, update, complete, duplicate, checklists, columns, members\./)).toBeInTheDocument()
  })

  test('heading outline has no level skips and no lime buttons', () => {
    const { container } = renderFeaturePage('pill')
    assertNoHeadingSkips(container)
    assertNoLimeButtons(container)
  })
})

describe('FeaturePage — /features/chat', () => {
  test('renders the hero heading and how-it-works body copy', () => {
    renderFeaturePage('chat')
    const page = FEATURE_PAGES.chat
    expect(screen.getByRole('heading', { level: 1, name: page.hero.h1 })).toBeInTheDocument()
    expect(screen.getByText(page.hero.subhead)).toBeInTheDocument()
    for (const row of page.rows) {
      expect(screen.getByRole('heading', { name: row.h3 })).toBeInTheDocument()
      expect(screen.getByText(row.body)).toBeInTheDocument()
    }
  })

  test('states chat is read-only on every plan and never claims search/summarize tools work', () => {
    const { container } = renderFeaturePage('chat')
    expect(screen.getByText(/Chat cannot create, move, or delete a card\. Ever\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Can chat create or move cards?' })).toBeInTheDocument()
    assertNoUnshippedClaims(container)
  })

  test('heading outline has no level skips and no lime buttons', () => {
    const { container } = renderFeaturePage('chat')
    assertNoHeadingSkips(container)
    assertNoLimeButtons(container)
  })
})

describe('FeaturePage — unknown slug', () => {
  test('redirects to the hub instead of rendering blank', () => {
    render(
      <MemoryRouter initialEntries={['/features/nope']}>
        <Routes>
          <Route path="/features/:slug" element={<FeaturePage />} />
          <Route path="/features" element={<FeaturesPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
