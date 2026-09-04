// Build-time markdown loader for article bodies (support articles,
// tutorials). Reads src/content/articles/{support,tutorials}/<slug>.md via
// Vite's import.meta.glob + `?raw`, so every markdown file is inlined as a
// plain string at build time — same behavior in dev, `vite build`, and the
// Node-based prerender pass (scripts/prerender.mjs / src/prerender-entry.jsx),
// no filesystem access at runtime.
//
// Deliberately NOT gray-matter: it pulls in a Buffer polyfill that bloats
// the client bundle for a few `key: value` lines. This is a minimal
// `---`-delimited frontmatter splitter instead — not real YAML, just one
// `key: value` pair per line.
//
// Metadata (title, summary, category, ordering, `updated`, `related`,
// `tags`, tier, minutes, ...) stays in src/content/support.js and
// src/content/tutorials.js — see CLAUDE.md. Frontmatter here exists only
// to self-document the file and give the parser something to validate;
// only the body markdown is consumed by the content modules.
//
// A malformed file fails the build loudly, naming the file path, rather
// than silently returning an empty body — an editorial typo should not
// quietly ship a "coming soon" page that should have had content.
//
// A body may reference `{{PRICING.limits.<field>}}` to pull a live number
// (e.g. the Pro price) from src/content/pricing.js instead of typing a
// literal figure — src/__tests__/marketingClaims.test.js forbids hardcoded
// "$<digit>" prices in every content file, markdown included. Any other
// `{{...}}` placeholder, or a `PRICING.limits` field that doesn't exist,
// fails the build loudly (naming the file) rather than shipping the
// literal `{{...}}` text.

import { PRICING } from '../content/pricing'

const TEMPLATE_VARS = { PRICING }

function resolveTemplatePath(path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), TEMPLATE_VARS)
}

function interpolate(body, filePath) {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path) => {
    const value = resolveTemplatePath(path)
    if (value === undefined) {
      throw new Error(`[content] ${filePath}: unknown template placeholder "${match}"`)
    }
    return String(value)
  })
}

const SUPPORT_MODULES = import.meta.glob('../content/articles/support/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const TUTORIAL_MODULES = import.meta.glob('../content/articles/tutorials/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function slugFromPath(path) {
  return path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '')
}

// Splits `---\nkey: value\n...\n---\n<body>` into { frontmatter, body }.
// Throws, naming `filePath`, on anything that doesn't match that shape.
function parseFrontmatter(raw, filePath) {
  const text = raw.replace(/^﻿/, '') // strip a BOM if the file has one

  if (!text.startsWith('---')) {
    throw new Error(`[content] ${filePath}: missing frontmatter — file must start with a "---" line`)
  }

  const closeIdx = text.indexOf('\n---', 3)
  if (closeIdx === -1) {
    throw new Error(`[content] ${filePath}: unterminated frontmatter — no closing "---" line found`)
  }

  const head = text.slice(3, closeIdx).trim()
  const body = text.slice(closeIdx + 4).replace(/^\r?\n/, '').trim()

  if (!head) {
    throw new Error(`[content] ${filePath}: empty frontmatter block — at least "title" is required`)
  }

  const frontmatter = {}
  for (const rawLine of head.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) {
      throw new Error(`[content] ${filePath}: malformed frontmatter line (expected "key: value") — "${line}"`)
    }
    const key = line.slice(0, colonIdx).trim()
    let value = line.slice(colonIdx + 1).trim()
    if (!key) {
      throw new Error(`[content] ${filePath}: malformed frontmatter line (empty key) — "${line}"`)
    }
    const quoted =
      (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) ||
      (value.length >= 2 && value.startsWith("'") && value.endsWith("'"))
    if (quoted) value = value.slice(1, -1)
    frontmatter[key] = value
  }

  if (!frontmatter.title) {
    throw new Error(`[content] ${filePath}: frontmatter is missing required "title" key`)
  }
  if (!body) {
    throw new Error(`[content] ${filePath}: body is empty after frontmatter — remove the file instead of shipping an empty article`)
  }

  return { frontmatter, body }
}

function buildIndex(modules) {
  const index = {}
  for (const [path, raw] of Object.entries(modules)) {
    const { frontmatter, body } = parseFrontmatter(raw, path)
    index[slugFromPath(path)] = { frontmatter, body: interpolate(body, path) }
  }
  return index
}

const SUPPORT_ARTICLES = buildIndex(SUPPORT_MODULES)
const TUTORIAL_ARTICLES = buildIndex(TUTORIAL_MODULES)

// Returns the article's markdown body, or `null` when no markdown file
// exists for that slug — the absence IS the "coming soon" / thin-page
// signal the route registry (src/content/marketing-routes.js) relies on.
export function getSupportArticleBody(slug) {
  return SUPPORT_ARTICLES[slug]?.body ?? null
}

export function getTutorialBody(slug) {
  return TUTORIAL_ARTICLES[slug]?.body ?? null
}
