// Validates src/content/* against the shared contract in
// src/content/_schema.js. Walks every page-content module (including
// src/content/solutions/ and src/content/legal/) and, wherever a value's
// *key name* signals one of the shared shapes (a `meta`/`seo` object, a
// `cta`-ish object, a `*FAQ*` array, a `hero` object), validates it against
// that shape's schema. Detection is key-based, not shape-based, so a page
// that removes a required field (not just mis-sizes it) still fails here —
// see collectContentItems below.
//
// Deliberately excluded from the walk:
//  - src/content/marketing-nav.js and marketing-routes.js: chrome + the
//    route registry, not a page's content module. Their title/description
//    and link-target integrity are already covered by
//    src/__tests__/marketingRoutes.test.js.
//  - src/content/_schema.js / _TEMPLATE.example.js: the contract itself.
import { describe, test, expect } from 'vitest'
import { pageMeta, cta, faqEntry, pageHero, sectionHero, validateContent } from '../content/_schema'

import * as about from '../content/about'
import * as blog from '../content/blog'
import * as careers from '../content/careers'
import * as changelog from '../content/changelog'
import * as connectors from '../content/connectors'
import * as customers from '../content/customers'
import * as features from '../content/features'
import * as pricing from '../content/pricing'
import * as security from '../content/security'
import * as status from '../content/status'
import * as support from '../content/support'
import * as templates from '../content/templates'
import * as tutorials from '../content/tutorials'

import * as solutionsShared from '../content/solutions/_shared'
import * as solutionsIndex from '../content/solutions/index'
import * as solStartups from '../content/solutions/startups'
import * as solSmallBusiness from '../content/solutions/small-business'
import * as solNonprofits from '../content/solutions/nonprofits'
import * as solStudents from '../content/solutions/students'
import * as solLegal from '../content/solutions/legal'
import * as solHealthcare from '../content/solutions/healthcare'
import * as solCustomerSupport from '../content/solutions/customer-support'
import * as solEngineering from '../content/solutions/engineering'

import * as legalUsagePolicy from '../content/legal/usage-policy'
import * as legalResponsibleDisclosure from '../content/legal/responsible-disclosure'
import * as legalPrivacyChoices from '../content/legal/privacy-choices'

const MODULES = [
  ['src/content/about.js', about],
  ['src/content/blog.js', blog],
  ['src/content/careers.js', careers],
  ['src/content/changelog.js', changelog],
  ['src/content/connectors.js', connectors],
  ['src/content/customers.js', customers],
  ['src/content/features.js', features],
  ['src/content/pricing.js', pricing],
  ['src/content/security.js', security],
  ['src/content/status.js', status],
  ['src/content/support.js', support],
  ['src/content/templates.js', templates],
  ['src/content/tutorials.js', tutorials],
  ['src/content/solutions/_shared.js', solutionsShared],
  ['src/content/solutions/index.js', solutionsIndex],
  ['src/content/solutions/startups.js', solStartups],
  ['src/content/solutions/small-business.js', solSmallBusiness],
  ['src/content/solutions/nonprofits.js', solNonprofits],
  ['src/content/solutions/students.js', solStudents],
  ['src/content/solutions/legal.js', solLegal],
  ['src/content/solutions/healthcare.js', solHealthcare],
  ['src/content/solutions/customer-support.js', solCustomerSupport],
  ['src/content/solutions/engineering.js', solEngineering],
  ['src/content/legal/usage-policy.js', legalUsagePolicy],
  ['src/content/legal/responsible-disclosure.js', legalResponsibleDisclosure],
  ['src/content/legal/privacy-choices.js', legalPrivacyChoices],
]

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v) && v.constructor === Object
}

// Key-name based detection, not value-shape sniffing: a page that *removes*
// `to`/`href` from a cta, or `description` from a meta object, still gets
// caught, because detection doesn't depend on the field that broke.
const isMetaKey = (key) => /(^|_)meta$/i.test(key) || key === 'seo'
const isCtaKey = (key) => /cta/i.test(key) || key === 'primary' || key === 'secondary' || /link$/i.test(key)
const isFaqKey = (key) => /faq/i.test(key)
const isHeroKey = (key) => /^hero$/i.test(key)

function pushHero(items, path, value) {
  if ('heading' in value) items.push({ kind: 'pageHero', path, value })
  else if ('h1' in value) items.push({ kind: 'sectionHero', path, value })
}

// Walks one module's exports, collecting every value whose *key* signals a
// shape _schema.js covers. Returns [{ kind, path, value }].
function collectContentItems(mod) {
  const items = []
  const seen = new Set()

  function visit(value, path) {
    if (value == null || typeof value === 'function') return
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${path}[${i}]`))
      return
    }
    if (!isPlainObject(value) || seen.has(value)) return
    seen.add(value)

    for (const [key, val] of Object.entries(value)) {
      const childPath = `${path}.${key}`
      if (isMetaKey(key) && isPlainObject(val)) items.push({ kind: 'meta', path: childPath, value: val })
      if (isCtaKey(key) && isPlainObject(val) && typeof val.label === 'string') {
        items.push({ kind: 'cta', path: childPath, value: val })
      }
      if (isFaqKey(key) && Array.isArray(val)) {
        val.forEach((entry, i) => {
          if (isPlainObject(entry)) items.push({ kind: 'faq', path: `${childPath}[${i}]`, value: entry })
        })
      }
      if (isHeroKey(key) && isPlainObject(val)) pushHero(items, childPath, val)
      visit(val, childPath)
    }
  }

  for (const [exportName, exportValue] of Object.entries(mod)) {
    if (typeof exportValue === 'function') continue
    if (isMetaKey(exportName) && isPlainObject(exportValue)) items.push({ kind: 'meta', path: exportName, value: exportValue })
    if (isHeroKey(exportName) && isPlainObject(exportValue)) pushHero(items, exportName, exportValue)
    if (isFaqKey(exportName) && Array.isArray(exportValue)) {
      exportValue.forEach((entry, i) => {
        if (isPlainObject(entry)) items.push({ kind: 'faq', path: `${exportName}[${i}]`, value: entry })
      })
    }
    visit(exportValue, exportName)
  }

  return items
}

const SCHEMAS = { meta: pageMeta, cta, faq: faqEntry, pageHero, sectionHero }

describe('content schema', () => {
  const allItems = MODULES.flatMap(([file, mod]) => collectContentItems(mod).map((item) => ({ file, ...item })))
  const countOf = (kind) => allItems.filter((i) => i.kind === kind).length

  // Sanity check on the walker itself: if it silently stopped finding
  // anything (a refactor breaks the key-name heuristics, an import path
  // changes silently, etc.) every test below would vacuously pass. These
  // floors are well under the real counts read out of src/content/ when
  // this test was written (about a dozen meta objects, 40+ ctas, 60+ FAQ
  // entries, a dozen heroes across both families) — they exist to catch a
  // regression in collectContentItems, not to pin exact counts.
  test('the walker found a plausible number of each shape', () => {
    expect(countOf('meta')).toBeGreaterThanOrEqual(8)
    expect(countOf('cta')).toBeGreaterThanOrEqual(15)
    expect(countOf('faq')).toBeGreaterThanOrEqual(10)
    expect(countOf('pageHero') + countOf('sectionHero')).toBeGreaterThanOrEqual(8)
  })

  for (const [file, mod] of MODULES) {
    const items = collectContentItems(mod)
    if (items.length === 0) continue // e.g. solutions/index.js: registry data, no meta/cta/faq/hero

    describe(file, () => {
      for (const item of items) {
        test(`${item.kind} at ${item.path} matches its schema`, () => {
          expect(() => validateContent(item.value, SCHEMAS[item.kind], `${file} → ${item.path}`)).not.toThrow()
        })
      }
    })
  }
})
