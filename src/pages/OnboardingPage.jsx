import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { trySeedOnboardingBoard } from '../lib/seedOnboardingBoard'
import { resolveStepRedirect, STEPS } from '../lib/onboardingSteps'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Tooltip from '../components/ui/Tooltip'
import InlineNotice from '../components/ui/InlineNotice'
import FieldError from '../components/ui/FieldError'
import PlanPicker from '../components/PlanPicker'
import KolumnLockup from '../components/layout/KolumnLockup'
import UpsellStep from '../components/UpsellStep'
import { PLANS } from '../data/plans'

import {
  EyeSlash,
  ArrowCounterClockwise,
  CaretDown,
  GraduationCap,
} from '@phosphor-icons/react'
import Menu from '../components/ui/Menu'
import LetterWave from '../components/ui/LetterWave'
import { ROLES, STARTER_PROMPTS } from '../data/starterPrompts'
import { getStarterBoard } from '../data/starterBoards'
import { seedStarterBoard } from '../lib/seedStarterBoard'
import { useBoardStore } from '../store/boardStore'
import { showToast } from '../utils/toast'

export default function OnboardingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialEmail = location.state?.email || ''
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  // ?step=X lets you jump straight to a step (handy for design review).
  // Anything outside the known set falls back to the start of the flow.
  const stepFromUrl = searchParams.get('step')
  const initialStep = STEPS.includes(stepFromUrl) ? stepFromUrl : 'terms'
  const [step, setStep] = useState(initialStep) // 'terms' | 'details' | 'plan' | 'upsell' | 'disclaimer' | 'name' | 'role'

  // Keep the URL in sync as the user advances, so refresh stays put and
  // the dev step-picker (below) reflects the current page.
  useEffect(() => {
    if (searchParams.get('step') === step) return
    const next = new URLSearchParams(searchParams)
    next.set('step', step)
    setSearchParams(next, { replace: true })
  }, [step, searchParams, setSearchParams])

  // Step guard — prod only, so the DEV picker and design-review deep links
  // keep working. Pure logic lives in lib/onboardingSteps (unit-tested).
  useEffect(() => {
    if (import.meta.env.DEV) return
    const redirect = resolveStepRedirect(step, { user, profile })
    if (!redirect) return
    if (redirect === 'done') {
      navigate('/dashboard', { replace: true })
      return
    }
    setStep(redirect)
  }, [step, user, profile, navigate])

  // ── terms step ────────────────────────────────────────────────────
  const [agreed, setAgreed] = useState(false)
  const [termsError, setTermsError] = useState('')

  // ── account-details step ──────────────────────────────────────────
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const slowTimer = useRef(null)
  const signUp = useAuthStore((s) => s.signUp)
  const setTier = useAuthStore((s) => s.setTier)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  // ── plan-picker step ──────────────────────────────────────────────
  const [committingPlan, setCommittingPlan] = useState(null)

  useEffect(() => () => clearTimeout(slowTimer.current), [])

  const handleAcceptTerms = async (e) => {
    e.preventDefault()
    setTermsError('')
    if (!agreed) {
      setTermsError('Please accept the terms to continue')
      return
    }
    if (user) {
      // OAuth path — the account already exists, so accepting terms here
      // records acceptance directly and skips straight to plan picking.
      try {
        await updateProfile({ terms_accepted_at: new Date().toISOString() })
        setStep('plan')
      } catch (err) {
        setTermsError(err.message)
      }
      return
    }
    setStep('details')
  }

  const handleSubmitDetails = async (e) => {
    e.preventDefault()
    setError('')
    setErrorCode(null)
    if (!email) { setError('Enter your email to continue'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    setSlow(false)
    slowTimer.current = setTimeout(() => setSlow(true), 3000)
    try {
      const result = await signUp(email, password, email.split('@')[0])
      // Fire-and-forget seed of the welcome tour board so it exists by
      // the time the user finishes plan → upsell → disclaimer → name →
      // role. useAppData has its own trigger as a safety net (existing
      // users, repeat logins). Both calls dedupe via the in-flight
      // promise map and the DB unique index on boards(owner_id) where
      // is_tour = true.
      const newUserId = result?.user?.id || result?.session?.user?.id
      if (newUserId) trySeedOnboardingBoard(newUserId)
      // Fire-and-forget acceptance record; the profile row exists via the
      // signup trigger by the time this lands.
      updateProfile({ terms_accepted_at: new Date().toISOString() }).catch(() => {})
      setStep('plan')
    } catch (err) {
      setError(err.message)
      setErrorCode(err.code || null)
    } finally {
      clearTimeout(slowTimer.current)
      setLoading(false)
      setSlow(false)
    }
  }

  // Marks onboarding complete before leaving the flow. Non-blocking: a
  // failed write here shouldn't trap the user on /onboarding — they land
  // in the app either way and remain onboarded_at: null until the next
  // successful write (AppLayout will just bounce them back here again).
  const finishOnboarding = async (to, state) => {
    try { await updateProfile({ onboarded_at: new Date().toISOString() }) } catch { /* non-blocking */ }
    navigate(to, { replace: true, ...(state ? { state } : {}) })
  }

  const handlePickPlan = async (planId) => {
    setError('')
    if (planId === 'pro') {
      navigate('/upgrade/pro', { state: { from: 'onboarding' } })
      return
    }
    if (planId === 'free') {
      // Free users see a Pro trial upsell before landing in the app.
      setStep('upsell')
      return
    }
    setCommittingPlan(planId)
    try {
      await setTier(planId)
      if (planId === 'team') {
        // Team is a sales-assist tier — still walks the rest of the flow
        // (disclaimer → name → role) rather than exiting straight to the
        // dashboard.
        setStep('disclaimer')
        return
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
      setCommittingPlan(null)
    }
  }

  const handleTryProTrial = () => navigate('/upgrade/pro', { state: { trial: true, from: 'onboarding' } })
  const handleSkipUpsell = () => setStep('disclaimer')

  const handleFinishDisclaimer = () => setStep('name')

  // Display-name step. signUp earlier defaulted to the email prefix; the
  // user's chosen name overrides it here via updateProfile.
  const [displayName, setDisplayName] = useState('')
  const [nameError, setNameError] = useState('')
  const [savingName, setSavingName] = useState(false)
  // OAuth users arrive with a profile.display_name already set (from
  // Google) — prefill it once it shows up, but never clobber what the
  // user is actively typing.
  useEffect(() => {
    if (!displayName && profile?.display_name) setDisplayName(profile.display_name)
  }, [profile?.display_name])
  const handleSubmitName = async (e) => {
    e.preventDefault()
    setNameError('')
    const trimmed = displayName.trim()
    if (!trimmed) {
      setNameError('Please enter a name')
      return
    }
    setSavingName(true)
    try {
      await updateProfile({ display_name: trimmed })
      setStep('role')
    } catch (err) {
      setNameError(err.message)
    } finally {
      setSavingName(false)
    }
  }

  // Role step. Picking a role persists to profiles.role (non-blocking)
  // and reveals tailored starter prompts. The user commits by clicking a
  // starter — which seeds a real board from src/data/starterBoards.js and
  // lands on /boards with it active — or "I have my own topic" to skip
  // straight to /dashboard.
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const [role, setRole] = useState(null)
  const [seedingStarter, setSeedingStarter] = useState(null)
  const handlePickRole = (roleId) => {
    setRole(roleId)
    updateProfile({ role: roleId }).catch(() => {}) // non-blocking
  }
  const handlePickStarter = async (starterId) => {
    const template = getStarterBoard(role, starterId)
    if (!template || !user) { handleSkipRole(); return }
    setSeedingStarter(starterId)
    try {
      const boardId = await seedStarterBoard(user.id, template)
      setActiveBoard(boardId)
      await finishOnboarding('/boards')
    } catch (err) {
      showToast.error(err?.message || "Couldn't create your starter board")
      setSeedingStarter(null)
    }
  }
  const handleSkipRole = () => finishOnboarding('/dashboard')

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex flex-col">
      <div className="flex justify-center pt-10" aria-hidden="true">
        <div className="flex items-center">
          <KolumnLockup text={22} />
        </div>
      </div>

      {step === 'terms' && (
        <TermsStep
          email={initialEmail}
          agreed={agreed}
          setAgreed={setAgreed}
          error={termsError}
          onSubmit={handleAcceptTerms}
        />
      )}

      {step === 'details' && (
        <DetailsStep
          email={email}
          setEmail={setEmail}
          initialEmail={initialEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          error={error}
          errorCode={errorCode}
          loading={loading}
          slow={slow}
          onSubmit={handleSubmitDetails}
        />
      )}

      {step === 'plan' && (
        <PlanPicker
          plans={PLANS}
          committingPlan={committingPlan}
          error={error}
          onPick={handlePickPlan}
        />
      )}

      {step === 'upsell' && (
        <UpsellStep onTryPro={handleTryProTrial} onSkip={handleSkipUpsell} />
      )}

      {step === 'disclaimer' && (
        <DisclaimerStep onContinue={handleFinishDisclaimer} />
      )}

      {step === 'name' && (
        <NameStep
          displayName={displayName}
          setDisplayName={setDisplayName}
          error={nameError}
          loading={savingName}
          onSubmit={handleSubmitName}
        />
      )}

      {step === 'role' && (
        <RoleStep
          role={role}
          onPick={handlePickRole}
          onPickStarter={handlePickStarter}
          onSkip={handleSkipRole}
          seedingStarter={seedingStarter}
        />
      )}

      {import.meta.env.DEV && <DevStepPicker step={step} setStep={setStep} />}
    </div>
  )
}

function DevStepPicker({ step, setStep }) {
  const [collapsed, setCollapsed] = useState(false)
  if (collapsed) {
    return (
      <Tooltip content="Show onboarding step picker">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="fixed bottom-3 right-3 z-50 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-card)] border border-[var(--color-sand)] rounded-md px-2 py-1 shadow-sm hover:text-[var(--text-secondary)]"
        >
          dev · {step}
        </button>
      </Tooltip>
    )
  }
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 bg-[var(--surface-card)] border border-[var(--color-sand)] rounded-xl shadow-[0_4px_24px_rgba(27,27,24,0.12)]">
      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] px-2">dev</span>
      {STEPS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setStep(s)}
          className={`text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
            s === step
              ? 'bg-[var(--text-primary)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
          }`}
        >
          {s}
        </button>
      ))}
      <Tooltip content="Hide">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="ml-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-1.5 py-0.5 rounded text-[12px]"
        >
          ×
        </button>
      </Tooltip>
    </div>
  )
}

function TermsStep({ email, agreed, setAgreed, error, onSubmit }) {
  return (
    <>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
        <div className="flex w-full max-w-[450px] flex-col items-center gap-5">
          <header className="w-full max-w-md text-center mb-1">
            <h1 className="text-[32px] font-[425] text-[var(--text-primary)] font-logo mb-2 leading-[1.15] tracking-tight">
              Let&rsquo;s create your account
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">A few things for you to review</p>
          </header>

          <form onSubmit={onSubmit} className="mx-auto w-full">
            <div className="mx-auto grid gap-3">
              {error && (
                <InlineNotice variant="error">{error}</InlineNotice>
              )}

              <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--surface-card)] p-5 space-y-4 shadow-sm">
                <label className="flex flex-row gap-3 cursor-pointer text-left items-start select-none">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    data-testid="terms-acceptance"
                    className="sr-only peer"
                  />
                  <div className="shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center border rounded transition-colors duration-100 border-[var(--border-default)] peer-checked:border-[var(--text-primary)] peer-checked:bg-[var(--text-primary)] peer-focus-visible:ring-1 ring-offset-2 ring-offset-[var(--surface-page)] ring-[var(--text-primary)]/30">
                    {agreed && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-[var(--text-secondary)] leading-snug">
                    I agree to Kolumn&rsquo;s{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener"
                      className="underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-primary)]"
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener"
                      className="underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-primary)]"
                    >
                      Privacy Policy
                    </a>{' '}
                    and confirm that I am at least 18 years of age.
                  </span>
                </label>

                <Button
                  type="submit"
                  size="xl"
                  data-testid="continue"
                  className="w-full"
                >
                  Agree and continue
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col justify-end px-4 pb-10">
        <div className="text-center text-sm text-[var(--text-muted)]">
          {email ? (
            <>
              <div>
                Continuing as{' '}
                <span className="font-medium text-[var(--text-secondary)]">{email}</span>
              </div>
              <Link
                to="/"
                className="inline underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-secondary)]"
              >
                Use a different email
              </Link>
            </>
          ) : (
            <div>
              Already have an account?{' '}
              <Link
                to="/"
                className="inline underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-secondary)]"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function DetailsStep({
  email, setEmail, initialEmail,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  error, errorCode, loading, slow,
  onSubmit,
}) {
  return (
    <>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
        <div className="flex w-full max-w-[450px] flex-col items-center gap-5">
          <header className="w-full max-w-md text-center mb-1">
            <h1 className="text-[32px] font-[425] text-[var(--text-primary)] font-logo mb-2 leading-[1.15] tracking-tight">
              Set up your account
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">Just a few details to get started</p>
          </header>

          <form onSubmit={onSubmit} className="mx-auto w-full">
            <div className="mx-auto grid gap-3">
              {error && (
                <InlineNotice variant={errorCode === 'confirm_email' ? 'info' : 'error'}>{error}</InlineNotice>
              )}

              <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--surface-card)] p-5 space-y-4 shadow-sm">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus={!initialEmail}
                    className="!h-11 !rounded-[0.6rem] !text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    autoFocus={!!initialEmail}
                    className="!h-11 !rounded-[0.6rem] !text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Confirm password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Type your password again"
                    required
                    aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
                    className="!h-11 !rounded-[0.6rem] !text-base"
                  />
                  {confirmPassword.length > 0 && confirmPassword !== password && (
                    <FieldError>Passwords don&rsquo;t match yet.</FieldError>
                  )}
                </div>

                <Button
                  type="submit"
                  size="xl"
                  loading={loading}
                  loadingText={slow ? 'Setting up your workspace' : 'Creating account'}
                  className="w-full"
                >
                  Create account
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col justify-end px-4 pb-10">
        <div className="text-center text-sm text-[var(--text-muted)]">
          {initialEmail ? (
            <>
              <div>
                Continuing as <span className="font-medium text-[var(--text-secondary)]">{initialEmail}</span>
              </div>
              <Link to="/" className="inline underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-secondary)]">
                Use a different email
              </Link>
            </>
          ) : (
            <div>
              Already have an account?{' '}
              <Link to="/" className="inline underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-secondary)]">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function RoleStep({ role, onPick, onPickStarter, onSkip, seedingStarter }) {
  const [open, setOpen] = useState(false)
  const selected = ROLES.find((r) => r.id === role)
  const starters = role ? STARTER_PROMPTS[role] : null

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-[32px] font-[425] text-[var(--text-primary)] font-logo leading-[1.15] tracking-tight">
          What kind of work do you do?
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {selected ? 'Pick a starter board, or bring your own.' : 'Pick your role for tailored starter boards.'}
        </p>
      </header>

      <div className="flex w-full max-w-[450px] flex-col items-center gap-5">
        <fieldset className="flex w-full flex-col gap-3 border-0 p-0 m-0">
          <Menu
            open={open}
            onOpenChange={setOpen}
            placement="bottom-start"
            panelClassName="!w-full"
            className="w-full"
            panel={
              <div className="flex flex-col gap-0.5 max-h-[min(60vh,280px)] overflow-y-auto">
                {ROLES.map((r) => (
                  <Menu.Item
                    key={r.id}
                    selected={r.id === role}
                    onSelect={() => {
                      setOpen(false)
                      onPick(r.id)
                    }}
                  >
                    {r.label}
                  </Menu.Item>
                ))}
              </div>
            }
          >
            <button
              type="button"
              data-testid="role-selector-dropdown"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="h-16 w-full flex items-center justify-between px-6 bg-[var(--surface-card)] border border-[var(--color-sand)] rounded-2xl text-base font-normal hover:border-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
            >
              <span className={selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                {selected ? selected.label : 'Select your role'}
              </span>
              <CaretDown
                size={16}
                className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
          </Menu>

          {starters && (
            <ul
              role="list"
              aria-label="Starter board suggestions"
              className="flex w-full flex-col gap-3 list-none p-0 m-0 mt-2"
            >
              {starters.map(({ id, title, Icon }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onPickStarter(id)}
                    disabled={!!seedingStarter}
                    className="w-full flex items-center gap-4 px-5 py-5 rounded-xl border border-[var(--color-sand)] bg-[var(--surface-card)] text-left text-base font-normal text-[var(--text-primary)] shadow-[0_2px_8px_rgba(27,27,24,0.03)] hover:border-[var(--text-muted)] hover:shadow-[0_4px_16px_rgba(27,27,24,0.06)] focus:outline-none focus-visible:border-[var(--text-primary)] transition-all disabled:opacity-60 disabled:cursor-wait"
                  >
                    <span
                      aria-hidden="true"
                      className="shrink-0 w-10 flex items-center justify-center text-[var(--text-primary)]"
                    >
                      <Icon size={22} weight="duotone" />
                    </span>
                    {seedingStarter === id ? <LetterWave text="Setting up your board" /> : title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </div>

      <div className="mx-auto flex w-full max-w-[450px] flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="xl"
          onClick={onSkip}
          className="w-full"
        >
          I have my own topic
        </Button>
      </div>
    </div>
  )
}

function NameStep({ displayName, setDisplayName, error, loading, onSubmit }) {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-[32px] font-[425] text-[var(--text-primary)] font-logo leading-[1.15] tracking-tight">
          What&rsquo;s your name?
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          So the AI knows what to call you.
        </p>
      </header>

      <div className="flex w-full max-w-[450px] flex-col items-center gap-3">
        {error && (
          <InlineNotice variant="error" className="w-full">{error}</InlineNotice>
        )}

        <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
          {/* Deliberate design-system exception: oversized centered hero input
              (like the kanban cards' 16px radius). Uses Input's focus tokens. */}
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            autoCapitalize="words"
            autoFocus
            required
            aria-label="What's your name?"
            data-1p-ignore="true"
            className="w-full rounded-2xl border border-[var(--color-sand)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-4 text-center text-base shadow-[0_4px_20px_rgba(27,27,24,0.04)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
          />
          <Button
            type="submit"
            size="xl"
            loading={loading}
            loadingText="Saving"
            disabled={!displayName.trim()}
            className="w-full"
          >
            Continue
          </Button>
        </form>
      </div>
    </div>
  )
}

function DisclaimerStep({ onContinue }) {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-10">
      <div
        role="region"
        aria-labelledby="disclaimer-heading"
        className="flex w-full max-w-lg flex-col gap-6"
      >
        <header className="text-center">
          <h1
            id="disclaimer-heading"
            className="text-[32px] font-[425] text-[var(--text-primary)] font-logo mb-2 leading-[1.15] tracking-tight"
          >
            Before your first board
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            A few things to know, plus one setting to review.
          </p>
        </header>

        <ul
          role="list"
          className="bg-[var(--surface-card)] rounded-2xl p-6 space-y-5 border border-[var(--color-sand)] shadow-sm list-none m-0"
        >
          <li className="flex gap-4 items-start">
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[var(--label-purple-bg)] text-[var(--label-purple-text)]"
            >
              <EyeSlash size={18} weight="duotone" />
            </div>
            <p className="text-[var(--text-primary)] text-sm leading-relaxed">
              <span className="font-semibold">No ads, no selling.</span>{' '}
              <span className="text-[var(--text-secondary)]">
                Your boards and cards stay yours. We won&rsquo;t share them with advertisers or sell your data.
              </span>
            </p>
          </li>

          <li className="flex gap-4 items-start">
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[var(--accent-lime-wash)] text-[var(--accent-lime-text)]"
            >
              <ArrowCounterClockwise size={18} weight="duotone" />
            </div>
            <p className="text-[var(--text-primary)] text-sm leading-relaxed">
              <span className="font-semibold">Deletes are undoable.</span>{' '}
              <span className="text-[var(--text-secondary)]">
                Anything the AI deletes comes with a one-click undo, and destructive
                actions ask for your approval before they run.
              </span>
            </p>
          </li>

          <li className="flex gap-4 items-start">
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[var(--label-blue-bg)] text-[var(--label-blue-text)]"
            >
              <GraduationCap size={18} weight="duotone" />
            </div>
            <p className="text-[var(--text-primary)] text-sm leading-relaxed">
              <span className="font-semibold">Not training data.</span>{' '}
              <span className="text-[var(--text-secondary)]">
                We never use your boards, cards, or chats to train AI models. Full details in our{' '}
                <Link to="/privacy" className="underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-secondary)]">
                  Privacy Policy
                </Link>.
              </span>
            </p>
          </li>
        </ul>

        <Button
          type="button"
          size="xl"
          onClick={onContinue}
          className="w-full"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

