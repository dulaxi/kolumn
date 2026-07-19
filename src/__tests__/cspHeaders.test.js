import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

function cspFrom(relPath) {
  const json = JSON.parse(readFileSync(resolve(here, relPath), 'utf8'))
  const rule = json.headers[0].headers.find((h) => h.key === 'Content-Security-Policy')
  return rule.value
}

function directive(csp, name) {
  return csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(name + ' '))
}

// Regression guard for the Firefox/Safari post-login white screen: connect-src
// listed only https://*.supabase.co, so those browsers blocked the wss://
// Supabase Realtime socket and the uncaught "WebSocket not available" throw
// crashed React. Chrome leniently accepts wss under an https source; Firefox
// and Safari require the wss:// scheme to be listed explicitly.
describe('CSP connect-src allows the Supabase Realtime WebSocket', () => {
  for (const file of ['../../public/serve.json', '../../vercel.json']) {
    it(`${file} whitelists wss://*.supabase.co`, () => {
      const connectSrc = directive(cspFrom(file), 'connect-src')
      expect(connectSrc).toBeDefined()
      expect(connectSrc).toContain('wss://*.supabase.co')
    })
  }
})
