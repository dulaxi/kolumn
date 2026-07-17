import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import SettingsSection from '../components/settings/SettingsSection'
import SettingsRow from '../components/settings/SettingsRow'

afterEach(() => cleanup())

describe('SettingsSection + SettingsRow', () => {
  test('section renders a heading and its rows', () => {
    render(
      <SettingsSection title="General">
        <SettingsRow title="Appearance">
          <button type="button">control</button>
        </SettingsRow>
      </SettingsSection>,
    )
    expect(screen.getByRole('heading', { name: 'General' })).toBeTruthy()
    expect(screen.getByText('Appearance')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'control' })).toBeTruthy()
  })

  test('row renders an optional description', () => {
    render(
      <SettingsRow title="Font" description="Typeface used on cards.">
        <span>x</span>
      </SettingsRow>,
    )
    expect(screen.getByText('Typeface used on cards.')).toBeTruthy()
  })

  test('htmlFor links the title label to a control', () => {
    render(
      <SettingsRow title="Display name" htmlFor="dn">
        <input id="dn" />
      </SettingsRow>,
    )
    expect(screen.getByLabelText('Display name')).toBeTruthy()
  })
})
