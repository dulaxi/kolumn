import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockSetTier = vi.fn()
const mockUpdateProfile = vi.fn()
const mockNavigate = vi.fn()

// vi.hoisted guarantees these exist by the time the vi.mock factories
// below (which are hoisted above all imports) run — plain top-level
// consts aren't reliably hoisted alongside them.
const { mockSeedStarterBoard, mockSetActiveBoard, getMockUser, setMockUser } = vi.hoisted(() => {
  let user = null
  return {
    mockSeedStarterBoard: vi.fn(),
    mockSetActiveBoard: vi.fn(),
    getMockUser: () => user,
    setMockUser: (u) => { user = u },
  }
})

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    signIn: mockSignIn,
    signUp: mockSignUp,
    setTier: mockSetTier,
    updateProfile: mockUpdateProfile,
    user: getMockUser(),
    profile: null,
  })),
}))
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={typeof to === 'string' ? to : '#'}>{children}</a>,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null, pathname: '/onboarding' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))
vi.mock('../lib/seedStarterBoard', () => ({
  seedStarterBoard: mockSeedStarterBoard,
}))
vi.mock('../store/boardStore', () => ({
  useBoardStore: vi.fn((sel) => sel({ setActiveBoard: mockSetActiveBoard })),
}))

import OnboardingPage from '../pages/OnboardingPage'

beforeEach(() => {
  mockSignIn.mockReset()
  mockSignUp.mockReset()
  mockSetTier.mockReset()
  mockUpdateProfile.mockReset()
  mockNavigate.mockReset()
  mockSeedStarterBoard.mockReset()
  mockSeedStarterBoard.mockResolvedValue('board-1')
  mockSetActiveBoard.mockReset()
  setMockUser(null)
  // Default resolved value so the new fire-and-forget
  // `updateProfile(...).catch()` calls (post-signup terms acceptance,
  // finishOnboarding's onboarded_at write) don't throw on a bare mock
  // that otherwise returns `undefined`. Individual tests can still
  // override with mockResolvedValueOnce/mockRejectedValueOnce for the
  // specific call they're asserting on.
  mockUpdateProfile.mockResolvedValue({})
})

// Terms is now the first onboarding step. Most tests target the details
// step, so this helper accepts terms and advances to the form fields.
async function passTermsStep() {
  await userEvent.click(screen.getByRole('checkbox'))
  screen.getByRole('button', { name: /agree and continue/i }).click()
  await screen.findByPlaceholderText('you@example.com')
}

describe('OnboardingPage — terms step', () => {
  test('blocks advance when terms not accepted', async () => {
    render(<OnboardingPage />)
    screen.getByRole('button', { name: /agree and continue/i }).click()
    await waitFor(() => {
      expect(screen.getByText('Please accept the terms to continue')).toBeInTheDocument()
    })
    expect(screen.queryByPlaceholderText('you@example.com')).not.toBeInTheDocument()
  })
})

describe('OnboardingPage — details step', () => {
  test('renders email, password, and confirm password after accepting terms', async () => {
    render(<OnboardingPage />)
    await passTermsStep()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('At least 6 characters')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your password again')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('How should we greet you?')).not.toBeInTheDocument()
  })

  test('shows error for short password', async () => {
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'abc')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'abc')
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  test('blocks submit when passwords do not match', async () => {
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password124')
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  test('signs up using the email prefix as display name', async () => {
    mockSignUp.mockResolvedValueOnce({})
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'test')
    })
  })
})

describe('OnboardingPage — plan step', () => {
  test('after signup, shows plan picker with one CTA per plan', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Choose your plan/i })).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Use Kolumn for free/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Try Pro plan/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Get in touch/i })).toBeInTheDocument()
  })

  test('Free plan CTA: shows the Pro trial upsell without writing tier or navigating', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    const freeCta = await screen.findByRole('button', { name: /Use Kolumn for free/i })
    freeCta.click()

    // Lands on the upsell step — no nav yet, no tier write.
    await screen.findByRole('heading', { name: /Get more out of Kolumn with Pro/i })
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockSetTier).not.toHaveBeenCalled()
  })

  test('Upsell Skip: routes to the disclaimer step (not dashboard yet)', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    const freeCta = await screen.findByRole('button', { name: /Use Kolumn for free/i })
    freeCta.click()

    const skipCta = await screen.findByRole('button', { name: /^Skip$/i })
    skipCta.click()

    // Lands on the disclaimer — no /dashboard nav yet.
    await screen.findByRole('heading', { name: /Before your first board/i })
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockSetTier).not.toHaveBeenCalled()
  })

  test('Disclaimer Continue: advances to the name step (not dashboard yet)', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    const freeCta = await screen.findByRole('button', { name: /Use Kolumn for free/i })
    freeCta.click()

    const skipCta = await screen.findByRole('button', { name: /^Skip$/i })
    skipCta.click()

    const continueCta = await screen.findByRole('button', { name: /^Continue$/i })
    continueCta.click()

    await screen.findByRole('heading', { name: /What.+your name/i })
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockSetTier).not.toHaveBeenCalled()
  })
})

describe('OnboardingPage — name step', () => {
  // Helper: drive the page all the way to the name step.
  async function reachNameStep() {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    const freeCta = await screen.findByRole('button', { name: /Use Kolumn for free/i })
    freeCta.click()
    const skipCta = await screen.findByRole('button', { name: /^Skip$/i })
    skipCta.click()
    const disclaimerContinue = await screen.findByRole('button', { name: /^Continue$/i })
    disclaimerContinue.click()
    await screen.findByPlaceholderText('Enter your name')
  }

  test('Continue is disabled until a name is entered', async () => {
    await reachNameStep()
    expect(screen.getByRole('button', { name: /^Continue$/i })).toBeDisabled()
    await userEvent.type(screen.getByPlaceholderText('Enter your name'), 'Alice')
    expect(screen.getByRole('button', { name: /^Continue$/i })).not.toBeDisabled()
  })

  test('Submitting updates the profile display_name then advances to the role step', async () => {
    mockUpdateProfile.mockResolvedValueOnce({})
    await reachNameStep()

    await userEvent.type(screen.getByPlaceholderText('Enter your name'), '  Alice Liddell  ')
    screen.getByRole('button', { name: /^Continue$/i }).click()

    await waitFor(() => {
      // Whitespace-trimmed before write.
      expect(mockUpdateProfile).toHaveBeenCalledWith({ display_name: 'Alice Liddell' })
    })
    // Lands on the role step — no /dashboard nav yet.
    await screen.findByRole('heading', { name: /What kind of work do you do/i })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

describe('OnboardingPage — role step', () => {
  async function reachRoleStep() {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    mockUpdateProfile.mockResolvedValueOnce({})
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    const freeCta = await screen.findByRole('button', { name: /Use Kolumn for free/i })
    freeCta.click()
    const skipCta = await screen.findByRole('button', { name: /^Skip$/i })
    skipCta.click()
    const disclaimerContinue = await screen.findByRole('button', { name: /^Continue$/i })
    disclaimerContinue.click()
    await userEvent.type(await screen.findByPlaceholderText('Enter your name'), 'Alice')
    screen.getByRole('button', { name: /^Continue$/i }).click()
    await screen.findByRole('heading', { name: /What kind of work do you do/i })
  }

  test('"I have my own topic" routes to /dashboard', async () => {
    await reachRoleStep()
    screen.getByRole('button', { name: /I have my own topic/i }).click()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  test('Opening the role dropdown reveals selectable options', async () => {
    await reachRoleStep()
    expect(screen.queryByRole('button', { name: /^Engineering$/i })).not.toBeInTheDocument()
    screen.getByTestId('role-selector-dropdown').click()
    expect(await screen.findByRole('button', { name: /^Engineering$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Design$/i })).toBeInTheDocument()
  })

  test('Selecting a role reveals tailored starter prompts without navigating, and persists the role', async () => {
    await reachRoleStep()
    screen.getByTestId('role-selector-dropdown').click()
    const sales = await screen.findByRole('button', { name: /^Sales$/i })
    sales.click()

    // The 3 Sales starter prompts now appear.
    await screen.findByRole('button', { name: /Build a deal pipeline/i })
    expect(screen.getByRole('button', { name: /Plan an outreach queue/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Prep for a discovery call/i })).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
    // Role picked is persisted (non-blocking) via updateProfile.
    expect(mockUpdateProfile).toHaveBeenCalledWith({ role: 'sales' })
  })

  test('Clicking a starter prompt seeds a real board and routes to /boards with it active', async () => {
    await reachRoleStep()
    // handlePickStarter needs a signed-in user (the mock authStore is
    // unauthenticated by default so the terms/details flow above takes
    // the pre-signup path); set it now that we're past that step.
    setMockUser({ id: 'u1' })

    screen.getByTestId('role-selector-dropdown').click()
    const eng = await screen.findByRole('button', { name: /^Engineering$/i })
    eng.click()

    const sprint = await screen.findByRole('button', { name: /Plan a sprint board/i })
    sprint.click()

    await waitFor(() => {
      expect(mockSeedStarterBoard).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ name: 'Sprint board' }),
      )
    })
    expect(mockSetActiveBoard).toHaveBeenCalledWith('board-1')
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/boards', { replace: true })
    })
  })

  test('Starter click without a signed-in user falls back to skipping to /dashboard', async () => {
    await reachRoleStep()
    // mockUser stays null here — handlePickStarter should fall into the
    // handleSkipRole() branch rather than throw.
    screen.getByTestId('role-selector-dropdown').click()
    const eng = await screen.findByRole('button', { name: /^Engineering$/i })
    eng.click()

    const sprint = await screen.findByRole('button', { name: /Plan a sprint board/i })
    sprint.click()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
    expect(mockSeedStarterBoard).not.toHaveBeenCalled()
  })

  test('Upsell "Get Pro free for 1 week": routes to /upgrade/pro with trial state', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    const freeCta = await screen.findByRole('button', { name: /Use Kolumn for free/i })
    freeCta.click()

    const trialCta = await screen.findByRole('button', { name: /Get Pro free for 1 week/i })
    trialCta.click()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/upgrade/pro', { state: { trial: true, from: 'onboarding' } })
    })
    expect(mockSetTier).not.toHaveBeenCalled()
  })

  test('Pro plan CTA: routes to /upgrade/pro without writing tier yet', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<OnboardingPage />)
    await passTermsStep()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    const proCta = await screen.findByRole('button', { name: /Try Pro plan/i })
    proCta.click()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/upgrade/pro', { state: { from: 'onboarding' } })
    })
    expect(mockSetTier).not.toHaveBeenCalled()
  })
})
