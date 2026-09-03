import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AboutPage from '../pages/marketing/AboutPage'
import CareersPage from '../pages/marketing/CareersPage'
import SecurityPage from '../pages/marketing/SecurityPage'
import { HERO as ABOUT_HERO, WHAT_IT_IS, VALUES, DETAILS } from '../content/about'
import { HERO as CAREERS_HERO, HOW_WE_BUILD, ROLES, OPEN_ROLES_EMPTY, FAQ as CAREERS_FAQ } from '../content/careers'
import { HERO as SECURITY_HERO, AT_A_GLANCE, CONTROLS, SUBPROCESSORS, FAQ as SECURITY_FAQ } from '../content/security'

function expectNoHeadingSkips() {
  const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) => Number(el.tagName[1]))
  expect(levels[0]).toBe(1)
  for (let i = 1; i < levels.length; i += 1) {
    expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
  }
}

function expectNoLimeButtons() {
  for (const el of document.querySelectorAll('a, button')) {
    expect(el.className, el.textContent).not.toMatch(/bg-\[var\(--(accent-lime|color-lime)/)
  }
}

describe('AboutPage', () => {
  test('renders the hero, what-it-is, values and details sections', () => {
    render(<MemoryRouter><AboutPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: ABOUT_HERO.heading })).toBeInTheDocument()
    expect(screen.getByText(ABOUT_HERO.subhead)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: WHAT_IT_IS.heading })).toBeInTheDocument()
    for (const item of WHAT_IT_IS.items) {
      expect(screen.getByRole('heading', { name: item.title })).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: VALUES.heading })).toBeInTheDocument()
    for (const item of VALUES.items) {
      expect(screen.getByRole('heading', { name: item.title })).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: DETAILS.heading })).toBeInTheDocument()
    for (const row of DETAILS.rows) {
      expect(screen.getByText(row.label)).toBeInTheDocument()
      expect(screen.getByText(row.value)).toBeInTheDocument()
    }
  })

  test('does not invent a team — ships the empty state, no names', () => {
    render(<MemoryRouter><AboutPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Who makes it' })).toBeInTheDocument()
    // No avatar/name grid rendered when TEAM.members is empty.
    expect(document.querySelectorAll('[class*="Avatar"]').length).toBe(0)
  })

  test('heading outline has no level skips and no lime buttons', () => {
    render(<MemoryRouter><AboutPage /></MemoryRouter>)
    expectNoHeadingSkips()
    expectNoLimeButtons()
  })
})

describe('CareersPage', () => {
  test('renders the hero and how-we-build sections', () => {
    render(<MemoryRouter><CareersPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: CAREERS_HERO.heading })).toBeInTheDocument()
    expect(screen.getByText(CAREERS_HERO.subhead)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: HOW_WE_BUILD.heading })).toBeInTheDocument()
    for (const item of HOW_WE_BUILD.items) {
      expect(screen.getByRole('heading', { name: item.title })).toBeInTheDocument()
    }
  })

  test('ships with no open roles and renders the honest empty state', () => {
    render(<MemoryRouter><CareersPage /></MemoryRouter>)
    expect(ROLES).toHaveLength(0)
    expect(screen.getByText(OPEN_ROLES_EMPTY.caption)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: OPEN_ROLES_EMPTY.title })).toBeInTheDocument()
    expect(screen.getByText(OPEN_ROLES_EMPTY.body)).toBeInTheDocument()
    // The empty-state CTA points at a real mailto address, not a fabricated ATS link.
    const links = screen.getAllByRole('link', { name: OPEN_ROLES_EMPTY.cta.label })
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^mailto:/)
    }
  })

  test('only renders FAQ rows with a real answer', () => {
    render(<MemoryRouter><CareersPage /></MemoryRouter>)
    const nullRows = CAREERS_FAQ.filter((item) => !item.a)
    expect(nullRows.length).toBeGreaterThan(0)
    for (const row of nullRows) {
      expect(screen.queryByText(row.q)).not.toBeInTheDocument()
    }
    for (const row of CAREERS_FAQ.filter((item) => item.a)) {
      expect(screen.getByRole('button', { name: row.q })).toBeInTheDocument()
    }
  })

  test('heading outline has no level skips and no lime buttons', () => {
    render(<MemoryRouter><CareersPage /></MemoryRouter>)
    expectNoHeadingSkips()
    expectNoLimeButtons()
  })
})

describe('SecurityPage', () => {
  test('renders the hero and at-a-glance facts', () => {
    render(<MemoryRouter><SecurityPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: SECURITY_HERO.heading })).toBeInTheDocument()
    expect(screen.getByText(SECURITY_HERO.subhead)).toBeInTheDocument()
    for (const item of AT_A_GLANCE.items) {
      expect(screen.getByText(item.label)).toBeInTheDocument()
      expect(screen.getByText(item.value)).toBeInTheDocument()
    }
  })

  test('renders every control with its title, body and in-app location', () => {
    render(<MemoryRouter><SecurityPage /></MemoryRouter>)
    expect(CONTROLS.items.length).toBeGreaterThan(0)
    for (const item of CONTROLS.items) {
      expect(screen.getByRole('heading', { name: item.title })).toBeInTheDocument()
      expect(screen.getByText(item.body)).toBeInTheDocument()
      expect(screen.getByText(new RegExp(item.inApp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()
    }
  })

  test('renders the subprocessor table and vulnerability-report CTA as mailto links', () => {
    render(<MemoryRouter><SecurityPage /></MemoryRouter>)
    expect(screen.getByRole('table')).toBeInTheDocument()
    for (const row of SUBPROCESSORS.rows) {
      expect(screen.getByText(row.service)).toBeInTheDocument()
    }
    const reportLinks = screen.getAllByRole('link', { name: SECURITY_HERO.primary.label })
    for (const link of reportLinks) {
      expect(link.getAttribute('href')).toMatch(/^mailto:/)
    }
  })

  test('does not claim certifications that are not shipped', () => {
    render(<MemoryRouter><SecurityPage /></MemoryRouter>)
    // No compliance badge section renders while CERTIFICATIONS is empty.
    expect(screen.queryByRole('heading', { name: 'Compliance' })).not.toBeInTheDocument()
    // The one FAQ row that touches certification says "not yet", truthfully,
    // rather than asserting SOC 2 / ISO 27001 as a fact.
    const certFaq = SECURITY_FAQ.find((item) => /SOC 2|ISO 27001/i.test(item.q))
    expect(certFaq.a).toMatch(/not yet/i)
  })

  test('heading outline has no level skips and no lime buttons', () => {
    render(<MemoryRouter><SecurityPage /></MemoryRouter>)
    expectNoHeadingSkips()
    expectNoLimeButtons()
  })
})
