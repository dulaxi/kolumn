import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import GeneralSection from '../components/settings/GeneralSection'
import { useSettingsStore } from '../store/settingsStore'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-motion')
  useSettingsStore.setState({ motion: 'system' })
})

describe('GeneralSection — Accessibility', () => {
  test('renders the Motion control with the three options', () => {
    render(<GeneralSection />)
    expect(screen.getByText('Accessibility')).toBeInTheDocument()
    const group = screen.getByRole('radiogroup', { name: 'Motion' })
    expect(group).toBeInTheDocument()
    // Scoped to the Motion group: "System" also names a radio in the sibling
    // Appearance control, so an unscoped query would match two elements.
    expect(within(group).getByRole('radio', { name: 'System' })).toBeInTheDocument()
    expect(within(group).getByRole('radio', { name: 'Full' })).toBeInTheDocument()
    expect(within(group).getByRole('radio', { name: 'Reduced' })).toBeInTheDocument()
  })

  test('selecting Reduced updates the store and stamps data-motion', () => {
    render(<GeneralSection />)
    fireEvent.click(screen.getByRole('radio', { name: 'Reduced' }))
    expect(useSettingsStore.getState().motion).toBe('reduced')
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced')
  })
})
