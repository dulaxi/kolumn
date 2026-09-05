import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TemplatesPage from '../pages/marketing/TemplatesPage'
import TemplatePage from '../pages/marketing/TemplatePage'
import ConnectorsPage from '../pages/marketing/ConnectorsPage'
import { TEMPLATES, getTemplate } from '../content/templates'
import { SOURCES, INTEGRATIONS } from '../content/connectors'

function renderTemplate(slug) {
  return render(
    <MemoryRouter initialEntries={[`/templates/${slug}`]}>
      <Routes>
        <Route path="/templates/:slug" element={<TemplatePage />} />
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

describe('TemplatesPage (gallery)', () => {
  test('has exactly one h1 and renders all 12 templates as tiles', () => {
    render(<MemoryRouter><TemplatesPage /></MemoryRouter>)
    expect(TEMPLATES).toHaveLength(12)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    for (const template of TEMPLATES) {
      const link = screen.getByRole('link', { name: new RegExp(template.name) })
      expect(link).toHaveAttribute('href', `/templates/${template.slug}`)
    }
  })

  test('filtering by use narrows the grid without breaking links', async () => {
    const { container } = render(<MemoryRouter><TemplatesPage /></MemoryRouter>)
    const personalCount = TEMPLATES.filter((t) => t.use === 'personal').length
    const personalChip = screen.getByRole('radio', { name: 'Personal' })
    personalChip.click()
    for (const template of TEMPLATES.filter((t) => t.use === 'personal')) {
      expect(screen.getByRole('link', { name: new RegExp(template.name) })).toBeInTheDocument()
    }
    expect(container.querySelectorAll('a[href^="/templates/"]').length).toBeGreaterThanOrEqual(personalCount)
  })

  test('no heading-level skips and no lime-filled buttons', () => {
    const { container } = render(<MemoryRouter><TemplatesPage /></MemoryRouter>)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })

  test('CTA links point at plain /onboarding, never a ?template= flow', () => {
    render(<MemoryRouter><TemplatesPage /></MemoryRouter>)
    const onboardingLinks = screen.getAllByRole('link', { name: /create a free account/i })
    for (const link of onboardingLinks) {
      expect(link.getAttribute('href')).toBe('/onboarding')
    }
  })
})

describe('TemplatePage (detail)', () => {
  test('shows the template name, its columns, and its starter cards', () => {
    const template = getTemplate('sprint-board')
    renderTemplate('sprint-board')
    expect(screen.getByRole('heading', { level: 1, name: new RegExp(template.name) })).toBeInTheDocument()
    for (const col of template.columns) {
      expect(screen.getAllByText(col.title).length).toBeGreaterThan(0)
    }
    for (const col of template.columns) {
      for (const card of col.cards) {
        expect(screen.getAllByText(card.title).length).toBeGreaterThan(0)
      }
    }
  })

  test('renders correctly for every template slug (all 12)', () => {
    for (const template of TEMPLATES) {
      const { unmount } = renderTemplate(template.slug)
      expect(screen.getByRole('heading', { level: 1, name: new RegExp(template.name) })).toBeInTheDocument()
      unmount()
    }
  })

  test('"Use this template" links to plain /onboarding, not a ?template= URL', () => {
    renderTemplate('job-hunt')
    const cta = screen.getByRole('link', { name: /use this template/i })
    expect(cta).toHaveAttribute('href', '/onboarding')
  })

  test('unknown slug shows a not-found state instead of crashing', () => {
    renderTemplate('does-not-exist')
    expect(screen.getByRole('heading', { level: 1, name: /template not found/i })).toBeInTheDocument()
  })

  test('no heading-level skips and no lime-filled buttons', () => {
    const { container } = renderTemplate('bug-triage')
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })
})

describe('ConnectorsPage', () => {
  test('renders all four sources honestly (paste/type copy, no OAuth claim)', () => {
    render(<MemoryRouter><ConnectorsPage /></MemoryRouter>)
    expect(SOURCES).toHaveLength(4)
    for (const source of SOURCES) {
      expect(screen.getByRole('heading', { level: 3, name: source.title })).toBeInTheDocument()
    }
    const bodyText = document.body.textContent
    // The only permitted Slack/Gmail mention is the honest disclosure in the
    // Integrations panel — never a claim that a live connection exists.
    expect(bodyText).not.toMatch(/slack integration|gmail integration|connect your (slack|gmail)/i)
    expect(bodyText).toMatch(/does not connect to slack, gmail/i)
    expect(bodyText).toMatch(/paste/i)
  })

  test('shows the honest "not yet" integrations panel, no third-party logos or waitlist copy', () => {
    render(<MemoryRouter><ConnectorsPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 2, name: 'Integrations' })).toBeInTheDocument()
    expect(screen.getByText(INTEGRATIONS.eyebrow)).toBeInTheDocument()
    expect(screen.getByText(INTEGRATIONS.body)).toBeInTheDocument()
    const bodyText = document.body.textContent
    expect(bodyText).not.toMatch(/coming soon/i)
    expect(bodyText).not.toMatch(/waitlist/i)
    expect(document.querySelectorAll('img')).toHaveLength(0)
  })

  test('does not claim the pill adds columns on the free tier', () => {
    render(<MemoryRouter><ConnectorsPage /></MemoryRouter>)
    const bodyText = document.body.textContent
    expect(bodyText).not.toMatch(/free[^.]*adds? columns/i)
  })

  test('no heading-level skips and no lime-filled buttons', () => {
    const { container } = render(<MemoryRouter><ConnectorsPage /></MemoryRouter>)
    checkNoLevelSkips(container)
    checkNoLimeButtons(container)
  })
})
