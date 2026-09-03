import { readFileSync } from 'node:fs'
import { describe, test, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { Cheers, Champagne, Popcorn } from '@phosphor-icons/react'
import { PRICING, pricingJsonLd } from '../content/pricing'
import { PLANS, getPlan } from '../data/plans'

const here = dirname(fileURLToPath(import.meta.url))

describe('PRICING', () => {
  test('free daily limit matches the edge function', () => {
    const tier = readFileSync(resolve(here, '../../supabase/functions/chat/tier.ts'), 'utf8')
    const match = tier.match(/const FREE_DAILY_LIMIT = (\d+)/)
    expect(match).not.toBeNull()
    expect(Number(match[1])).toBe(PRICING.limits.freeMessagesPerDay)
  })

  test('meta lengths fit search snippets', () => {
    expect(PRICING.meta.title.length).toBeLessThanOrEqual(60)
    expect(PRICING.meta.description.length).toBeLessThanOrEqual(155)
  })

  test('tiers are free, pro, team in order and team has no price', () => {
    expect(PRICING.tiers.map((t) => t.id)).toEqual(['free', 'pro', 'team'])
    expect(PRICING.tiers[2].period).toBeNull()
    expect(PRICING.tiers[2].comingSoon).toBe(true)
  })

  test('comparison rows have one cell per column', () => {
    for (const row of PRICING.comparison.rows) {
      expect(row.cells, row.label).toHaveLength(PRICING.comparison.columns.length)
    }
  })

  test('json-ld has Product with two offers and a FAQPage with every question', () => {
    const [product, faq] = pricingJsonLd()
    expect(product['@type']).toBe('Product')
    expect(product.offers).toHaveLength(2)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(PRICING.faq.length)
  })
})

describe('UpgradeProPage has no hardcoded prices', () => {
  test('no literal dollar amount — every price must come from PRICING.limits', () => {
    // Regression guard: UpgradeProPage.jsx once derived its order summary
    // from PRICING.limits but hardcoded the period selector's prices as
    // literal `$8.00` / `$80.00` strings, so changing PRICING.limits alone
    // silently desynced the two — the selector and the total disagreed on
    // screen. Read the file as plain text (not by importing/rendering it)
    // so this catches any hardcoded `$<digits>.00` literal wherever it
    // appears, not just the two spots this bug happened to hit.
    const source = readFileSync(resolve(here, '../pages/UpgradeProPage.jsx'), 'utf8')
    expect(source).not.toMatch(/\$\d+\.00/)
  })
})

describe('PLANS derives from PRICING', () => {
  test('same ids, prices and bullets', () => {
    expect(PLANS.map((p) => p.id)).toEqual(PRICING.tiers.map((t) => t.id))
    PLANS.forEach((p, i) => {
      expect(p.price).toBe(PRICING.tiers[i].price)
      expect(p.bullets).toEqual(PRICING.tiers[i].bullets)
      expect(p.cta).toBe(PRICING.tiers[i].cta.label)
    })
  })

  test('picker-only fields are present', () => {
    expect(getPlan('pro').primaryCta).toBe(true)
    expect(getPlan('free').ghost).toBe(true)
    expect(getPlan('team').comingSoon).toBe(true)
  })

  test('topIcon is the Phosphor component itself, not a wrapper', () => {
    // Phosphor v2 icons are forwardRef objects, not plain functions. Store
    // the component as-is; PlanCard renders it directly as <TopIcon />.
    expect(getPlan('free').topIcon).toBe(Popcorn)
    expect(getPlan('pro').topIcon).toBe(Champagne)
    expect(getPlan('team').topIcon).toBe(Cheers)
  })
})
