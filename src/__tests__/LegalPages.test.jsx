import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LegalDocPage from '../pages/marketing/LegalDocPage'
import { USAGE_POLICY } from '../content/legal/usage-policy'
import { RESPONSIBLE_DISCLOSURE } from '../content/legal/responsible-disclosure'
import { PRIVACY_CHOICES } from '../content/legal/privacy-choices'

const DOCS = [
  ['usage policy', USAGE_POLICY],
  ['responsible disclosure', RESPONSIBLE_DISCLOSURE],
  ['privacy choices', PRIVACY_CHOICES],
]

describe('LegalDocPage', () => {
  for (const [name, doc] of DOCS) {
    describe(name, () => {
      test('renders the title', () => {
        render(<LegalDocPage doc={doc} />)
        expect(screen.getByRole('heading', { level: 1, name: doc.title })).toBeInTheDocument()
      })

      test('renders every section, in order', () => {
        render(<LegalDocPage doc={doc} />)
        const headings = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent)
        expect(headings).toEqual(doc.sections.map((s) => s.heading))
      })

      test('renders the draft-pending-legal-review notice', () => {
        render(<LegalDocPage doc={doc} />)
        expect(screen.getByText(/pending legal review/i)).toBeInTheDocument()
      })

      test('renders a table of contents linking to every section', () => {
        render(<LegalDocPage doc={doc} />)
        const toc = screen.getByRole('navigation', { name: /table of contents/i })
        for (const section of doc.sections) {
          expect(
            screen.getAllByRole('link', { name: section.heading }).some((el) => toc.contains(el))
          ).toBe(true)
        }
      })

      test('heading outline has no level skips and a single h1', () => {
        render(<LegalDocPage doc={doc} />)
        const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) => Number(el.tagName[1]))
        expect(levels.filter((l) => l === 1).length).toBe(1)
        expect(levels[0]).toBe(1)
        for (let i = 1; i < levels.length; i += 1) {
          expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
        }
      })

      test('no button or link is lime-filled', () => {
        render(<LegalDocPage doc={doc} />)
        for (const el of document.querySelectorAll('a, button')) {
          expect(el.className, el.textContent).not.toMatch(/bg-\[var\(--(accent-lime|color-lime)/)
        }
      })
    })
  }
})
