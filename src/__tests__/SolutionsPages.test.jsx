import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SolutionPage from '../pages/marketing/SolutionPage'
import SolutionsPage from '../pages/marketing/SolutionsPage'
import { SOLUTIONS, SOLUTION_SLUGS, SOLUTIONS_LIST, GROUPS } from '../content/solutions'

describe('solutions content', () => {
  test('index exposes all 8 slugs in the spec order, hub and registry agree', () => {
    expect(SOLUTION_SLUGS).toEqual([
      'startups',
      'small-business',
      'nonprofits',
      'students',
      'legal',
      'healthcare',
      'customer-support',
      'engineering',
    ])
    expect(Object.keys(SOLUTIONS).sort()).toEqual([...SOLUTION_SLUGS].sort())
    expect(SOLUTIONS_LIST).toHaveLength(8)
    // Every group slug resolves to a real vertical, and every vertical is in exactly one group.
    const grouped = GROUPS.flatMap((g) => g.slugs)
    expect(grouped.sort()).toEqual([...SOLUTION_SLUGS].sort())
  })

  test.each(SOLUTION_SLUGS)('%s has every required field with non-empty copy', (slug) => {
    const s = SOLUTIONS[slug]
    expect(s.slug).toBe(slug)
    expect(s.name.length).toBeGreaterThan(0)
    expect(s.icon.length).toBeGreaterThan(0)
    expect(['team', 'work']).toContain(s.group)
    expect(s.blurb.length).toBeGreaterThan(0)

    expect(s.seo.title.length).toBeGreaterThan(0)
    expect(s.seo.description.length).toBeGreaterThan(0)

    expect(s.hero.eyebrow.length).toBeGreaterThan(0)
    expect(s.hero.h1.length).toBeGreaterThan(0)
    expect(s.hero.subhead.length).toBeGreaterThan(0)
    expect(s.hero.subhead.length).toBeLessThanOrEqual(260)

    expect(Array.isArray(s.testimonials)).toBe(true)

    expect(s.pains).toHaveLength(3)
    for (const pain of s.pains) {
      expect(pain.icon.length).toBeGreaterThan(0)
      expect(pain.title.length).toBeGreaterThan(0)
      expect(pain.body.length).toBeGreaterThan(0)
    }

    expect(s.helpIntro.length).toBeGreaterThan(0)
    expect(s.helps).toHaveLength(3)
    for (const help of s.helps) {
      expect(help.tab.length).toBeGreaterThan(0)
      expect(help.icon.length).toBeGreaterThan(0)
      expect(['pill', 'chat', 'info']).toContain(help.kind)
      expect(help.title.length).toBeGreaterThan(0)
      expect(help.body.length).toBeGreaterThan(0)
      if (help.kind !== 'info') {
        expect(help.prompt?.length).toBeGreaterThan(0)
      }
    }
    // No two tabs collide (SegmentedControl keys on `value`).
    expect(new Set(s.helps.map((h) => h.tab)).size).toBe(3)

    expect(s.board.name.length).toBeGreaterThan(0)
    expect(s.board.columns.length).toBeGreaterThan(0)
    for (const col of s.board.columns) {
      expect(col.title.length).toBeGreaterThan(0)
      expect(Array.isArray(col.cards)).toBe(true)
      for (const card of col.cards) {
        expect(card.title.length).toBeGreaterThan(0)
      }
    }
    const totalCards = s.board.columns.reduce((n, c) => n + c.cards.length, 0)
    expect(totalCards).toBe(4)

    expect(s.faq.length).toBeGreaterThanOrEqual(1)
    for (const item of s.faq) {
      expect(item.q.length).toBeGreaterThan(0)
      expect(item.a.length).toBeGreaterThan(0)
    }

    expect(s.cta.heading.length).toBeGreaterThan(0)
  })
})

describe('SolutionsPage (hub)', () => {
  test('links to all 8 verticals', () => {
    render(
      <MemoryRouter>
        <SolutionsPage />
      </MemoryRouter>,
    )
    for (const slug of SOLUTION_SLUGS) {
      const solution = SOLUTIONS[slug]
      const link = screen.getByRole('link', { name: new RegExp(solution.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      expect(link).toHaveAttribute('href', `/solutions/${slug}`)
    }
  })

  test('exactly one h1, no heading-level skips', () => {
    render(
      <MemoryRouter>
        <SolutionsPage />
      </MemoryRouter>,
    )
    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    const levels = headings.map((el) => Number(el.tagName[1]))
    expect(levels.filter((l) => l === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
    }
  })

  test('no button or link is lime-filled', () => {
    render(
      <MemoryRouter>
        <SolutionsPage />
      </MemoryRouter>,
    )
    for (const el of document.querySelectorAll('a, button')) {
      expect(el.className, el.textContent).not.toMatch(/bg-\[var\(--(accent-lime|color-lime)/)
    }
  })
})

describe('SolutionPage (vertical) — startups', () => {
  const solution = SOLUTIONS.startups

  test('renders the hero heading, pains, helps and example board', () => {
    render(
      <MemoryRouter>
        <SolutionPage solution={solution} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: solution.hero.h1 })).toBeInTheDocument()
    expect(screen.getByText(solution.hero.subhead)).toBeInTheDocument()

    for (const pain of solution.pains) {
      expect(screen.getByRole('heading', { name: pain.title })).toBeInTheDocument()
      expect(screen.getByText(pain.body)).toBeInTheDocument()
    }

    // Every help tab is selectable, and the first tab's copy renders by default.
    for (const help of solution.helps) {
      expect(screen.getByRole('radio', { name: help.tab })).toBeInTheDocument()
    }
    expect(screen.getByText(solution.helps[0].title)).toBeInTheDocument()
    expect(screen.getByText(solution.helps[0].body)).toBeInTheDocument()

    // Example board: heading + every card title across every column.
    const boardHeading = screen.getByRole('heading', { name: solution.board.name })
    expect(boardHeading).toBeInTheDocument()
    for (const col of solution.board.columns) {
      for (const card of col.cards) {
        expect(screen.getAllByText(card.title).length).toBeGreaterThan(0)
      }
    }
  })

  test('FAQ includes the shared pool plus the vertical extra', () => {
    render(
      <MemoryRouter>
        <SolutionPage solution={solution} />
      </MemoryRouter>,
    )
    for (const item of solution.faq) {
      expect(screen.getByRole('button', { name: item.q })).toBeInTheDocument()
    }
  })

  test('CTA band shows the vertical heading and links to onboarding + pricing', () => {
    render(
      <MemoryRouter>
        <SolutionPage solution={solution} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: solution.cta.heading })).toBeInTheDocument()
    const startLinks = screen.getAllByRole('link', { name: /start free|start with this board/i })
    expect(startLinks.some((l) => l.getAttribute('href') === `/onboarding?board=${solution.slug}`)).toBe(true)
    expect(screen.getAllByRole('link', { name: 'See pricing' })[0]).toHaveAttribute('href', '/pricing')
  })

  test('exactly one h1, no heading-level skips', () => {
    render(
      <MemoryRouter>
        <SolutionPage solution={solution} />
      </MemoryRouter>,
    )
    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    const levels = headings.map((el) => Number(el.tagName[1]))
    expect(levels.filter((l) => l === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
    }
  })

  test('no button or link is lime-filled', () => {
    render(
      <MemoryRouter>
        <SolutionPage solution={solution} />
      </MemoryRouter>,
    )
    for (const el of document.querySelectorAll('a, button')) {
      expect(el.className, el.textContent).not.toMatch(/bg-\[var\(--(accent-lime|color-lime)/)
    }
  })
})

describe('SolutionPage renders every vertical without crashing', () => {
  test.each(SOLUTION_SLUGS)('%s', (slug) => {
    render(
      <MemoryRouter>
        <SolutionPage solution={SOLUTIONS[slug]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(SOLUTIONS[slug].hero.h1)
  })
})
