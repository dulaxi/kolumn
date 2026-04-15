import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    signIn: mockSignIn,
    signUp: mockSignUp,
  })),
}))
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
}))

import LoginPage from '../pages/LoginPage'
import SignupPage from '../pages/SignupPage'

beforeEach(() => {
  mockSignIn.mockReset()
  mockSignUp.mockReset()
  mockNavigate.mockReset()
})

describe('LoginPage', () => {
  test('renders email and password inputs', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  test('shows error on failed login', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'))
    render(<LoginPage />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrong')
    screen.getByRole('button', { name: /sign in/i }).click()

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  test('navigates to dashboard on success', async () => {
    mockSignIn.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<LoginPage />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'correct')
    screen.getByRole('button', { name: /sign in/i }).click()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  test('has link to signup', () => {
    render(<LoginPage />)
    expect(screen.getByText('Sign up').closest('a')).toHaveAttribute('href', '/signup')
  })
})

describe('SignupPage', () => {
  test('renders display name, email, password fields', () => {
    render(<SignupPage />)
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('At least 6 characters')).toBeInTheDocument()
  })

  test('shows error for short password', async () => {
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'abc')
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  test('falls back to email prefix when no display name', async () => {
    mockSignUp.mockResolvedValueOnce({})
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'test')
    })
  })

  test('navigates on success', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('Your name'), 'Alice')
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })
})
