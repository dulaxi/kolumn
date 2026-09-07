import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Auth surfaces used to rely on `type="email"` + `required` and nothing else,
// so a malformed address produced the BROWSER's native tooltip — a grey system
// bubble anchored off the field, in a font we don't control, gone on the next
// keystroke — instead of Kolumn's own error styling. And where a page did
// validate (UpdatePasswordPage), the message went into a form-level banner
// above the whole form, leaving you to work out which of two password boxes it
// meant.
//
// These pin the split that fixes both: a message about ONE field renders under
// that field with the field bordered red, and a message about the form as a
// whole stays a form-level notice.

const mockSignIn = vi.fn()
const mockResetPassword = vi.fn()
const mockUpdatePassword = vi.fn()
const mockCheckEmailExists = vi.fn()

vi.mock('../store/authStore', () => ({
  useAuthStore: Object.assign(
    (sel) => sel({
      user: null,
      signIn: mockSignIn,
      signInWithGoogle: vi.fn(),
      checkEmailExists: mockCheckEmailExists,
      resetPassword: mockResetPassword,
      updatePassword: mockUpdatePassword,
    }),
    { getState: () => ({ user: null }), subscribe: () => () => {} },
  ),
}))

import LandingPage from '../pages/LandingPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import UpdatePasswordPage from '../pages/UpdatePasswordPage'
import { EMAIL_INVALID_MESSAGE, PASSWORD_TOO_SHORT_MESSAGE, PASSWORD_MISMATCH_MESSAGE } from '../utils/validation'

const renderAt = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

// The message must sit under the field it blames, not merely somewhere on the
// page — that placement is the whole point of the change.
function fieldErrorFor(input) {
  const alert = screen.getByRole('alert')
  expect(input.closest('div').contains(alert) || input.parentElement.parentElement.contains(alert)).toBe(true)
  return alert
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('field-level validation errors', () => {
  test('landing page: a malformed email is caught before any network call', async () => {
    const user = userEvent.setup()
    renderAt(<LandingPage />)

    const email = screen.getByPlaceholderText('Enter your email')
    await user.type(email, 'sfgv')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))

    expect(screen.getByText(EMAIL_INVALID_MESSAGE)).toBeInTheDocument()
    // The point of validating client-side: no round-trip for an obvious typo.
    expect(mockCheckEmailExists).not.toHaveBeenCalled()
  })

  test('landing page: the field itself is marked invalid, not just the text', async () => {
    const user = userEvent.setup()
    renderAt(<LandingPage />)
    const email = screen.getByPlaceholderText('Enter your email')
    await user.type(email, 'sfgv')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))
    expect(email).toHaveAttribute('aria-invalid', 'true')
    fieldErrorFor(email)
  })

  test('landing page: typing again clears the error', async () => {
    const user = userEvent.setup()
    renderAt(<LandingPage />)
    const email = screen.getByPlaceholderText('Enter your email')
    await user.type(email, 'sfgv')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))
    expect(screen.getByText(EMAIL_INVALID_MESSAGE)).toBeInTheDocument()

    await user.type(email, '@example.com')
    expect(screen.queryByText(EMAIL_INVALID_MESSAGE)).toBeNull()
  })

  test('landing page: a valid email passes straight through', async () => {
    const user = userEvent.setup()
    mockCheckEmailExists.mockResolvedValue(false)
    renderAt(<LandingPage />)
    await user.type(screen.getByPlaceholderText('Enter your email'), 'someone@example.com')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))
    expect(screen.queryByText(EMAIL_INVALID_MESSAGE)).toBeNull()
    expect(mockCheckEmailExists).toHaveBeenCalledWith('someone@example.com')
  })

  test('forgot password: a malformed email never reaches the API', async () => {
    const user = userEvent.setup()
    renderAt(<ForgotPasswordPage />)
    await user.type(screen.getByPlaceholderText('you@example.com'), 'nope')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(screen.getByText(EMAIL_INVALID_MESSAGE)).toBeInTheDocument()
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  test('update password: a short password blames the password field', async () => {
    const user = userEvent.setup()
    renderAt(<UpdatePasswordPage />)
    const pw = screen.getByPlaceholderText(/^At least/)
    await user.type(pw, '123')
    await user.type(screen.getByPlaceholderText('Repeat your password'), '123')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    expect(screen.getByText(PASSWORD_TOO_SHORT_MESSAGE)).toBeInTheDocument()
    expect(pw).toHaveAttribute('aria-invalid', 'true')
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  test('update password: a mismatch blames the CONFIRM field, not the first one', async () => {
    const user = userEvent.setup()
    renderAt(<UpdatePasswordPage />)
    const pw = screen.getByPlaceholderText(/^At least/)
    const confirm = screen.getByPlaceholderText('Repeat your password')
    await user.type(pw, 'longenough')
    await user.type(confirm, 'different')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    expect(screen.getByText(PASSWORD_MISMATCH_MESSAGE)).toBeInTheDocument()
    // This is the bit a form-level banner got wrong: it must point at the box
    // that disagrees, not at the one above it.
    expect(confirm).toHaveAttribute('aria-invalid', 'true')
    expect(pw).not.toHaveAttribute('aria-invalid', 'true')
  })
})
