// Single source of truth for plan definitions. Consumed by:
//   - LandingPage pricing section (displays + CTA to /onboarding)
//   - OnboardingPage plan-picker step (post-signup tier selection)
//
// Edit prices/taglines/bullets here ONCE and both surfaces update.
//
// Field semantics:
//   id           — matches profiles.tier values: 'free' | 'pro' | 'team'
//   name         — display name in headings
//   tagline      — short positioning line under the name
//   price        — display price; '$0' for free
//   period       — qualifier after the price ('forever', 'per month', …)
//   cta          — text on the landing-page CTA button (ignored in picker mode)
//   ghost        — true = transparent bg blending into page (Free only)
//   primaryCta   — true = the "recommended" tier; gets heavier border + ink CTA
//   topIcon      — Phosphor icon component for the card header
//   topIconClass — Tailwind classes for the top icon's color
//   inheritsFrom — name of the prior tier whose features are inherited
//                  (renders an "Everything in X, plus:" preamble)
//   bullets      — feature list rendered as checkmarked items

import { Cheers, Champagne, Popcorn } from '@phosphor-icons/react'

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For getting started',
    price: '$0',
    period: 'forever',
    cta: 'Use Kolumn for free',
    ghost: true,
    primaryCta: false,
    topIcon: Popcorn,
    topIconClass: 'text-[var(--text-primary)]',
    bullets: [
      'Unlimited boards & cards',
      'Drag-and-drop, labels, due dates, checklists',
      'Real-time team collaboration',
      'AI card creation — 20 messages per day',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For daily productivity',
    price: '$8',
    period: 'per month',
    cta: 'Try Pro plan',
    ghost: false,
    primaryCta: true,
    topIcon: Champagne,
    // Lime-tinted icon (vs ink on Free/Team) puts brand accent color
    // exactly where the eye first lands — signals "this one matters."
    topIconClass: 'text-[var(--color-logo)]',
    inheritsFrom: 'Free',
    bullets: [
      'Unlimited AI messages',
      'The AI can move, update, and reorganize cards across your boards',
      'Priority support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For team workspaces',
    price: '$24',
    period: 'per month',
    cta: 'Get in touch',
    ghost: false,
    primaryCta: false,
    topIcon: Cheers,
    topIconClass: 'text-[var(--text-primary)]',
    inheritsFrom: 'Pro',
    bullets: [
      'Multiple workspaces with shared boards',
      'Member roles & admin controls',
      'Priority onboarding',
    ],
  },
]

export function getPlan(id) {
  return PLANS.find((p) => p.id === id) || null
}
