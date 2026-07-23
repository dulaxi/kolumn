import { useNavigate } from 'react-router-dom'
import { CheckCircle, X } from '@phosphor-icons/react'

import { useAuthStore } from '../../store/authStore'
import { ONBOARDING_STEPS, shouldShowChecklist } from '../../constants/onboarding'
import { triggerCreateBoard } from '../../utils/createBoardEvent'

// New-user "Get started" card (claude.ai-style): three core-loop steps with
// live completion, a progress bar, and a hover-revealed permanent dismiss.
// Steps complete themselves via markOnboardingStep calls inside the store
// actions — clicking a row just navigates to where the action happens.
export default function SidebarChecklist() {
  const profile = useAuthStore((s) => s.profile)
  const markOnboardingStep = useAuthStore((s) => s.markOnboardingStep)
  const navigate = useNavigate()

  if (!shouldShowChecklist(profile)) return null

  const steps = profile.onboarding_steps || {}
  const doneCount = ONBOARDING_STEPS.filter((s) => steps[s.key]).length

  const go = (key) => {
    navigate('/boards')
    if (key === 'board') triggerCreateBoard()
  }

  return (
    <div className="px-2 pb-2">
      <div className="group relative rounded-xl border border-[var(--color-sand)] bg-[var(--surface-card)] shadow-[0_4px_24px_rgba(27,27,24,0.10)] p-3 select-none">
        <button
          type="button"
          onClick={() => markOnboardingStep('dismissed')}
          aria-label="Dismiss checklist"
          className="absolute top-2 right-2 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 pr-5">
          <h2 className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">Get started</h2>
          <span aria-hidden="true" className="font-mono text-xs text-[var(--text-muted)] whitespace-nowrap group-hover:opacity-0 transition-opacity">
            {doneCount} / {ONBOARDING_STEPS.length}
          </span>
          <span className="sr-only">{doneCount} of {ONBOARDING_STEPS.length} steps complete</span>
        </div>

        <div aria-hidden="true" className="mt-2 mb-1 p-0.5 rounded-full bg-[var(--surface-raised)] w-full">
          <div
            className="h-1 min-w-1 rounded-full bg-[var(--label-blue-text)] transition-[width] duration-300 ease-out"
            style={{ width: `${(doneCount / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>

        <ul className="flex flex-col gap-0.5 pt-1">
          {ONBOARDING_STEPS.map((step) => {
            const done = !!steps[step.key]
            return (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => !done && go(step.key)}
                  disabled={done}
                  className={`flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors ${
                    done ? 'cursor-default' : 'hover:bg-[var(--surface-raised)]/50 cursor-pointer'
                  }`}
                >
                  {done ? (
                    <CheckCircle size={16} weight="fill" className="shrink-0 mt-px text-[var(--label-blue-text)]" />
                  ) : (
                    <span aria-hidden="true" className="shrink-0 mt-px w-4 h-4 rounded-full border border-[var(--border-default)]" />
                  )}
                  <span className="flex flex-col min-w-0 leading-[1.4]">
                    <span className={`text-[13px] ${done ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                      {done && <span className="sr-only">Completed: </span>}
                      {step.title}
                    </span>
                    {!done && (
                      <span className="text-xs text-[var(--text-secondary)]">{step.subtitle}</span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
