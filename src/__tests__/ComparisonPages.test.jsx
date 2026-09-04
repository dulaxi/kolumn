import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ComparisonPage from '../pages/marketing/ComparisonPage'
import ComparisonsPage from '../pages/marketing/ComparisonsPage'
import { COMPARISONS_LIST } from '../content/comparisons'
import { CHECKED_ON } from '../content/comparisons/_shared'

// Mirrors src/__tests__/PricingPage.test.jsx's structure (lime-button guard,
// heading-outline guard) and adds the checks the marketing-page task brief
// requires specifically for comparison pages: a real "choose them instead"
// section, a visible checked-on date, and — at the content-module level —
// that every competitor claim carries both a source URL and a date. See
// docs/superpowers/specs/marketing/_competitor-monday.md §3 for why those
// three things are the credibility anchor of this page type.

function renderPage(comparison) {
  return render(
    <MemoryRouter>
      <ComparisonPage comparison={comparison} />
    </MemoryRouter>,
  )
}

describe.each(COMPARISONS_LIST)('ComparisonPage: $COMPARISON.slug', ({ COMPARISON }) => {
  test('renders the h1, and no other h1', () => {
    renderPage(COMPARISON)
    expect(screen.getByRole('heading', { level: 1, name: COMPARISON.hero.h1 })).toBeInTheDocument()
    expect(document.querySelectorAll('h1')).toHaveLength(1)
  })

  test('renders a "choose them instead" section with real, specific content', () => {
    renderPage(COMPARISON)
    expect(screen.getByRole('heading', { name: `Choose ${COMPARISON.name} instead if` })).toBeInTheDocument()
    // Real content, not a stub: at least 3 named scenarios, each with a
    // non-trivial explanation (not a one-liner strawman).
    expect(COMPARISON.chooseThemInstead.length).toBeGreaterThanOrEqual(3)
    for (const item of COMPARISON.chooseThemInstead) {
      expect(item.title.length).toBeGreaterThan(5)
      expect(item.body.length).toBeGreaterThan(40)
      expect(screen.getByText(item.title)).toBeInTheDocument()
    }
  })

  test('renders a visible "checked on <date>" line', () => {
    renderPage(COMPARISON)
    expect(screen.getByText(new RegExp(`checked on ${COMPARISON.checkedOn}`, 'i'))).toBeInTheDocument()
    // The pricing section repeats the date next to the competitor's source.
    expect(screen.getAllByText(new RegExp(COMPARISON.checkedOn)).length).toBeGreaterThan(1)
  })

  test('renders every FAQ question and every sourced claim', () => {
    renderPage(COMPARISON)
    for (const item of COMPARISON.faq) {
      expect(screen.getByRole('button', { name: item.q })).toBeInTheDocument()
    }
    for (const claim of COMPARISON.competitorClaims) {
      expect(screen.getByText(claim.text)).toBeInTheDocument()
    }
  })

  test('no button or link is lime-filled', () => {
    renderPage(COMPARISON)
    for (const el of document.querySelectorAll('a, button')) {
      expect(el.className, el.textContent).not.toMatch(/bg-\[var\(--(accent-lime|color-lime)/)
    }
  })

  test('heading outline has no level skips', () => {
    renderPage(COMPARISON)
    const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) => Number(el.tagName[1]))
    expect(levels[0]).toBe(1)
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
    }
  })

  test('never states an absolute negative about the competitor (no bare "X cannot / has no / does not have")', () => {
    // A blunt heuristic, not a full NLP check: this codebase's own style for
    // an honest negative is to scope it (a plan name, a date, a source) —
    // see _competitor-monday.md's "never state an absolute negative" rule.
    // Flags the unscoped pattern "{Competitor} {cannot|has no|doesn't have}"
    // anywhere in the page's rendered text.
    renderPage(COMPARISON)
    const bodyText = document.body.textContent
    const re = new RegExp(`\\b${COMPARISON.name}\\b[^.]{0,40}\\b(cannot|can't|has no|doesn't have|does not have)\\b`, 'i')
    expect(bodyText).not.toMatch(re)
  })
})

describe('ComparisonsPage (/compare hub)', () => {
  test('renders the h1 and a tile per comparison', () => {
    render(
      <MemoryRouter>
        <ComparisonsPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'How Kolumn compares' })).toBeInTheDocument()
    for (const { COMPARISON } of COMPARISONS_LIST) {
      expect(screen.getByRole('link', { name: new RegExp(`Kolumn vs ${COMPARISON.name}`) })).toBeInTheDocument()
    }
  })

  test('renders a visible checked-on date', () => {
    render(
      <MemoryRouter>
        <ComparisonsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(new RegExp(CHECKED_ON))).toBeInTheDocument()
  })

  test('no button or link is lime-filled', () => {
    render(
      <MemoryRouter>
        <ComparisonsPage />
      </MemoryRouter>,
    )
    for (const el of document.querySelectorAll('a, button')) {
      expect(el.className, el.textContent).not.toMatch(/bg-\[var\(--(accent-lime|color-lime)/)
    }
  })
})

// ---------------------------------------------------------------------------
// Content-module level: every competitor claim must carry a source URL and a
// checked date, on all three comparison pages. This is a data-shape
// assertion (not a rendering one) so it still catches a claim added to
// COMPETITOR_CLAIMS or competitorPricing without a source, even before
// anyone wires it into JSX.
// ---------------------------------------------------------------------------
describe.each(COMPARISONS_LIST)('$COMPARISON.slug content module: every competitor claim is sourced and dated', ({ COMPARISON }) => {
  test('competitorClaims: every entry has a source URL and a checkedOn date', () => {
    expect(COMPARISON.competitorClaims.length).toBeGreaterThan(0)
    for (const claim of COMPARISON.competitorClaims) {
      expect(claim.text, 'claim missing text').toBeTruthy()
      expect(claim.source, `claim "${claim.text}" is missing a source URL`).toMatch(/^https:\/\//)
      expect(claim.checkedOn, `claim "${claim.text}" is missing a checkedOn date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  test('competitorPricing: carries its own source URL and checkedOn date, distinct from Kolumn pricing', () => {
    expect(COMPARISON.competitorPricing.source).toMatch(/^https:\/\//)
    expect(COMPARISON.competitorPricing.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(COMPARISON.competitorPricing.tiers.length).toBeGreaterThan(0)
    for (const tier of COMPARISON.competitorPricing.tiers) {
      expect(tier.name).toBeTruthy()
      expect(tier.price).toBeTruthy()
    }
  })

  test('page-level checkedOn matches the shared CHECKED_ON constant', () => {
    expect(COMPARISON.checkedOn).toBe(CHECKED_ON)
  })
})
