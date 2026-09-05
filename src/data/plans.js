// In-app plan list (landing grid, onboarding plan step, /plans picker).
// Prices, bullets, and copy come from src/content/pricing.js; this file only
// adds the presentation-only fields the picker needs:
//   ghost        — true = transparent bg blending into page (Free only)
//   primaryCta   — true = the "recommended" tier; heavier border + ink CTA
//   topIcon      — Phosphor icon component for the card header
//   topIconClass — Tailwind classes for the top icon's color

import { Cheers, Champagne, Popcorn } from '@phosphor-icons/react'
import { PRICING } from '../content/pricing'

const PRESENTATION = {
  free: { ghost: true, primaryCta: false, topIcon: Popcorn, topIconClass: 'text-[var(--text-primary)]' },
  // Lime-tinted icon (vs ink on Free/Team) puts brand accent color
  // exactly where the eye first lands — signals "this one matters."
  pro: { ghost: false, primaryCta: true, topIcon: Champagne, topIconClass: 'text-[var(--color-logo)]' },
  team: { ghost: false, primaryCta: false, topIcon: Cheers, topIconClass: 'text-[var(--text-primary)]' },
}

export const PLANS = PRICING.tiers.map((tier) => {
  const pres = PRESENTATION[tier.id]
  return {
    id: tier.id,
    name: tier.name,
    tagline: tier.tagline,
    price: tier.price,
    period: tier.period,
    caption: tier.caption,
    badge: tier.badge,
    comingSoon: tier.comingSoon,
    cta: tier.cta.label,
    ctaTo: tier.cta.to,
    inheritsFrom: tier.inheritsFrom,
    bullets: tier.bullets,
    ghost: pres.ghost,
    primaryCta: pres.primaryCta,
    topIcon: pres.topIcon,
    topIconClass: pres.topIconClass,
  }
})

export function getPlan(id) {
  return PLANS.find((p) => p.id === id) || null
}
