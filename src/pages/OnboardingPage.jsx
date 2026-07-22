import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { trySeedOnboardingBoard } from '../lib/seedOnboardingBoard'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Tooltip from '../components/ui/Tooltip'
import InlineNotice from '../components/ui/InlineNotice'
import FieldError from '../components/ui/FieldError'
import PlanPicker from '../components/PlanPicker'
import { PLANS } from '../data/plans'
import { addDays, format } from 'date-fns'

import {
  Kanban,
  ChatCircleDots,
  Lightning,
  PuzzlePiece,
  GoogleLogo,
  SlackLogo,
  NotionLogo,
  Code,
  ArrowRight,
  EyeSlash,
  ArrowCounterClockwise,
  CaretDown,
  Bug,
  RocketLaunch,
  PenNib,
  SquaresFour,
  Users,
  Compass,
  ListChecks,
  CheckSquare,
  Megaphone,
  CalendarBlank,
  PaperPlaneTilt,
  Handshake,
  WarningCircle,
  Target,
  Funnel,
  MagnifyingGlass,
  Bank,
  UserPlus,
  Books,
  GraduationCap,
  BookOpen,
  CheckCircle,
  BookBookmark,
  ListBullets,
  X,
} from '@phosphor-icons/react'
import Menu from '../components/ui/Menu'

const STEPS = ['terms', 'details', 'plan', 'upsell', 'disclaimer', 'name', 'role']

export default function OnboardingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialEmail = location.state?.email || ''

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

  const handleAcceptTerms = (e) => {
    e.preventDefault()
    setTermsError('')
    if (!agreed) {
      setTermsError('Please accept the terms to continue')
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

  // Role step. Held locally for now — wire to a profiles column when one
  // lands, then use it to seed starter boards on first dashboard load.
  // Picking a role no longer navigates; it reveals tailored starter
  // prompts. The user commits by clicking a starter or "I have my own
  // topic".
  const [role, setRole] = useState(null)
  const handlePickRole = (roleId) => setRole(roleId)
  const handlePickStarter = (starterId) =>
    navigate('/dashboard', { replace: true, state: { role, starter: starterId } })
  const handleSkipRole = () => navigate('/dashboard', { replace: true })

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex flex-col">
      <div className="flex justify-center pt-10" aria-hidden="true">
        <div className="flex items-center">
          <Kanban size={28} weight="fill" className="text-[var(--color-logo)]" />
          <span className="text-[22px] font-[500] text-[var(--text-primary)] tracking-tight leading-none ml-1.5 font-logo">
            Kolumn
          </span>
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
            <h1 className="text-[32px] font-light text-[var(--text-primary)] font-logo mb-2 leading-[1.15] tracking-tight">
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
            <h1 className="text-[32px] font-light text-[var(--text-primary)] font-logo mb-2 leading-[1.15] tracking-tight">
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

function UpsellStep({ onTryPro, onSkip }) {
  const trialEnd = format(addDays(new Date(), 7), 'MMMM d')

  const features = [
    {
      tag: 'For thinking',
      title: 'Chat with your boards',
      body: 'Plan sprints, draft cards, break goals into checklists.',
      visual: <ChatVisual />,
    },
    {
      tag: 'For complex work',
      title: 'Agentic moves',
      body: 'Move, complete, and update columns in one sentence.',
      visual: <AgentVisual />,
    },
    {
      tag: 'For your stack',
      comingSoon: true,
      title: 'Connect your tools',
      body: 'Google Calendar, Slack, Notion, and your code.',
      visual: <IntegrationsVisual />,
    },
  ]

  return (
    <>
      <div className="flex w-full flex-1 flex-col items-center gap-9 px-4 py-10">
        <header className="flex flex-col gap-2 text-center max-w-2xl">
          <h1 className="text-[32px] font-light text-[var(--text-primary)] font-logo leading-[1.15] tracking-tight">
            Get more out of Kolumn with Pro
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Claude on every board, automations, and your tools — connected.
          </p>
        </header>

        <div className="w-full max-w-[900px]">
          <ul
            role="list"
            className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--color-sand)] border border-[var(--color-sand)] bg-[var(--surface-card)] rounded-3xl overflow-hidden shadow-sm list-none p-0 m-0"
          >
            {features.map((f) => (
              <li key={f.title} className="flex flex-col overflow-hidden">
                <div className="flex flex-col p-6 pb-0">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-xs font-medium border border-[var(--color-sand)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
                      {f.tag}
                    </span>
                    {f.comingSoon && (
                      <span className="inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide border border-[var(--color-sand)] text-[var(--text-muted)]">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <h2 className="text-[var(--text-primary)] mt-4 text-base font-semibold">{f.title}</h2>
                  <p className="text-[var(--text-secondary)] mt-2 text-sm leading-normal">{f.body}</p>
                </div>
                <div className="relative h-[170px] w-full overflow-hidden mt-2" aria-hidden="true">
                  {f.visual}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto flex w-full max-w-[450px] flex-col items-center gap-3">
          <Button
            type="button"
            size="xl"
            onClick={onTryPro}
            className="w-full"
          >
            <Lightning size={16} weight="fill" className="mr-2 shrink-0" />
            Get Pro free for 1 week
            <ArrowRight size={16} className="ml-2 shrink-0" />
          </Button>
          <p className="text-xs text-[var(--text-muted)]">
            Free until {trialEnd}. Cancel anytime.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="xl"
            onClick={onSkip}
            className="w-full"
          >
            Skip
          </Button>
        </div>
      </div>
    </>
  )
}

// Shared frame: dot-grid background, top fade, and a small footnote at
// the bottom. Each visual fills the middle with its own arrangement.
function VisualFrame({ footnoteIcon: FootnoteIcon, footnote, children }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, color-mix(in srgb, var(--text-primary) 12%, transparent) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, var(--surface-card) 0%, transparent 40%)',
        }}
      />
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 pb-2">
        <div className="flex-1 w-full flex items-center justify-center">{children}</div>
        {footnote && (
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] pb-1">
            {FootnoteIcon && <FootnoteIcon size={11} weight="fill" />}
            {footnote}
          </div>
        )}
      </div>
    </>
  )
}

// Chat: a tiny conversation thread. User bubble right-aligned (lime
// wash), assistant bubbles left-aligned — mirrors how chat actually
// looks, makes the column feel like a transcript.
function ChatVisual() {
  return (
    <VisualFrame footnoteIcon={ChatCircleDots} footnote="Ask anything">
      <div className="flex w-full max-w-[220px] flex-col gap-1.5">
        <div className="self-end max-w-[80%] bg-[var(--accent-lime-wash)] border border-[var(--accent-lime)]/40 rounded-xl rounded-br-sm px-2.5 py-1.5">
          <p className="text-[11px] text-[var(--text-primary)] leading-snug">Plan a Q3 launch</p>
        </div>
        <div className="self-start max-w-[80%] bg-[var(--surface-card)] border border-[var(--color-sand)] rounded-xl rounded-bl-sm px-2.5 py-1.5 shadow-[0_2px_8px_rgba(27,27,24,0.04)]">
          <p className="text-[11px] text-[var(--text-secondary)] leading-snug flex items-center gap-1.5">
            <ListChecks size={11} weight="duotone" className="text-[var(--text-primary)]" />
            Sprint board
          </p>
        </div>
        <div className="self-start max-w-[80%] bg-[var(--surface-card)] border border-[var(--color-sand)] rounded-xl rounded-bl-sm px-2.5 py-1.5 shadow-[0_2px_8px_rgba(27,27,24,0.04)]">
          <p className="text-[11px] text-[var(--text-secondary)] leading-snug flex items-center gap-1.5">
            <CheckSquare size={11} weight="duotone" className="text-[var(--text-primary)]" />
            Launch checklist
          </p>
        </div>
      </div>
    </VisualFrame>
  )
}

// Agent: a one-line command turning into a batch action. Top chip is
// the prompt, lime chip below shows the result — same chip language as
// the others, vertical flow keeps the "input → output" read.
function AgentVisual() {
  return (
    <VisualFrame footnoteIcon={Lightning} footnote="One command">
      <div className="flex flex-col items-center gap-2 w-full max-w-[240px]">
        <div className="bg-[var(--surface-card)] border border-[var(--color-sand)] rounded-full px-3.5 py-1.5 shadow-[0_2px_8px_rgba(27,27,24,0.04)]">
          <p className="text-[11px] text-[var(--text-primary)] text-center leading-snug">
            &ldquo;Move shipped cards to Done&rdquo;
          </p>
        </div>
        <CaretDown size={12} className="text-[var(--text-muted)]" />
        {/* Exact same vocabulary as showToast.success in src/utils/toast.js:
            lime fill, 1px ink border, 10px radius, mono message, X
            dismiss on the right. */}
        <div
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] border bg-[var(--accent-lime)] text-[var(--text-primary)] border-[var(--text-primary)] shadow-[0_4px_24px_rgba(27,27,24,0.10)] font-mono text-[11px]"
        >
          <CheckCircle size={16} weight="fill" className="shrink-0" />
          <span className="flex-1 text-left">6 cards moved to Done</span>
          <X size={12} weight="bold" className="shrink-0 opacity-70" />
        </div>
      </div>
    </VisualFrame>
  )
}

// Integrations: 2×2 grid of tool chips. The "many tools, all connected"
// layout is what made this one read clean — keep it.
function IntegrationsVisual() {
  const logos = [
    { Logo: GoogleLogo, label: 'Calendar' },
    { Logo: SlackLogo,  label: 'Slack' },
    { Logo: NotionLogo, label: 'Notion' },
    { Logo: Code,       label: 'Code' },
  ]
  return (
    <VisualFrame footnoteIcon={PuzzlePiece} footnote="And more">
      <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
        {logos.map(({ Logo, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 bg-[var(--surface-card)] border border-[var(--color-sand)] rounded-lg px-2.5 py-1.5 shadow-[0_2px_8px_rgba(27,27,24,0.04)]"
          >
            <Logo size={14} weight="duotone" className="text-[var(--text-primary)] shrink-0" />
            <span className="text-[11px] text-[var(--text-secondary)] truncate">{label}</span>
          </div>
        ))}
      </div>
    </VisualFrame>
  )
}

const ROLES = [
  { id: 'engineering', label: 'Engineering' },
  { id: 'design', label: 'Design' },
  { id: 'product', label: 'Product management' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'operations', label: 'Operations' },
  { id: 'sales', label: 'Sales' },
  { id: 'founder', label: 'Founder / leadership' },
  { id: 'student', label: 'Student' },
  { id: 'other', label: 'Something else' },
]

// Starter prompts per role. Each one becomes a clickable card under the
// role dropdown — selecting one routes to /dashboard with state so the
// dashboard knows what kind of board to seed first.
const STARTER_PROMPTS = {
  engineering: [
    { id: 'sprint',       title: 'Plan a sprint board',        Icon: Lightning },
    { id: 'bug-triage',   title: 'Set up a bug triage flow',   Icon: Bug },
    { id: 'roadmap',      title: 'Map a release roadmap',      Icon: RocketLaunch },
  ],
  design: [
    { id: 'reviews',      title: 'Track design reviews',       Icon: PenNib },
    { id: 'library',      title: 'Build a component library',  Icon: SquaresFour },
    { id: 'research',     title: 'Run a research pipeline',    Icon: Users },
  ],
  product: [
    { id: 'roadmap',      title: 'Draft a product roadmap',    Icon: Compass },
    { id: 'backlog',      title: 'Organize a feature backlog', Icon: ListChecks },
    { id: 'launch',       title: 'Plan a launch checklist',    Icon: CheckSquare },
  ],
  marketing: [
    { id: 'campaign',     title: 'Build a campaign tracker',   Icon: Megaphone },
    { id: 'content',      title: 'Plan a content calendar',    Icon: CalendarBlank },
    { id: 'launch-comms', title: 'Coordinate launch comms',    Icon: PaperPlaneTilt },
  ],
  operations: [
    { id: 'vendors',      title: 'Track a vendor pipeline',    Icon: Handshake },
    { id: 'incidents',    title: 'Run an incident retro',      Icon: WarningCircle },
    { id: 'okrs',         title: 'Set up quarterly OKRs',      Icon: Target },
  ],
  sales: [
    { id: 'pipeline',     title: 'Build a deal pipeline',      Icon: Funnel },
    { id: 'outreach',     title: 'Plan an outreach queue',     Icon: PaperPlaneTilt },
    { id: 'discovery',    title: 'Prep for a discovery call',  Icon: MagnifyingGlass },
  ],
  founder: [
    { id: 'investors',    title: 'Track an investor pipeline', Icon: Bank },
    { id: 'hiring',       title: 'Build a hiring funnel',      Icon: UserPlus },
    { id: 'bets',         title: 'Plan your strategic bets',   Icon: Compass },
  ],
  student: [
    { id: 'coursework',   title: 'Organize coursework',        Icon: Books },
    { id: 'thesis',       title: 'Plan a thesis project',      Icon: GraduationCap },
    { id: 'reading',      title: 'Track a reading list',       Icon: BookOpen },
  ],
  other: [
    { id: 'todos',        title: 'Set up personal todos',      Icon: CheckCircle },
    { id: 'reading',      title: 'Track a reading queue',      Icon: BookBookmark },
    { id: 'review',       title: 'Plan a weekly review',       Icon: ListBullets },
  ],
}

function RoleStep({ role, onPick, onPickStarter, onSkip }) {
  const [open, setOpen] = useState(false)
  const selected = ROLES.find((r) => r.id === role)
  const starters = role ? STARTER_PROMPTS[role] : null

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-[32px] font-light text-[var(--text-primary)] font-logo leading-[1.15] tracking-tight">
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
                    className="w-full flex items-center gap-4 px-5 py-5 rounded-xl border border-[var(--color-sand)] bg-[var(--surface-card)] text-left text-base font-normal text-[var(--text-primary)] shadow-[0_2px_8px_rgba(27,27,24,0.03)] hover:border-[var(--text-muted)] hover:shadow-[0_4px_16px_rgba(27,27,24,0.06)] focus:outline-none focus-visible:border-[var(--text-primary)] transition-all"
                  >
                    <span
                      aria-hidden="true"
                      className="shrink-0 w-10 flex items-center justify-center text-[var(--text-primary)]"
                    >
                      <Icon size={22} weight="duotone" />
                    </span>
                    {title}
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
        <h1 className="text-[32px] font-light text-[var(--text-primary)] font-logo leading-[1.15] tracking-tight">
          What&rsquo;s your name?
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          So Claude knows what to call you.
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
            className="text-[32px] font-light text-[var(--text-primary)] font-logo mb-2 leading-[1.15] tracking-tight"
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
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[var(--accent-lime-wash)] text-[var(--accent-lime-dark)]"
            >
              <ArrowCounterClockwise size={18} weight="duotone" />
            </div>
            <p className="text-[var(--text-primary)] text-sm leading-relaxed">
              <span className="font-semibold">Deletes are undoable.</span>{' '}
              <span className="text-[var(--text-secondary)]">
                Anything Claude deletes comes with a one-click undo, and destructive
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

