import { readFileSync } from 'node:fs'
import { describe, test, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
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
    expect(typeof getPlan('team').topIcon).toBe('function')
    expect(getPlan('team').comingSoon).toBe(true)
  })
})
