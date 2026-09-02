import { readFileSync } from 'node:fs'
import { describe, test, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { lockBodyScroll, unlockBodyScroll } from '../components/ui/Modal'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../index.css'), 'utf8')

describe('marketing tokens', () => {
  test('on-ink tokens are defined once and not overridden in dark', () => {
    for (const name of ['--text-on-ink', '--text-on-ink-muted', '--border-on-ink']) {
      const matches = css.match(new RegExp(`^\\s*${name}:`, 'gm')) || []
      expect(matches, name).toHaveLength(1)
    }
  })
})

describe('body scroll lock export', () => {
  test('lock and unlock toggle body overflow', () => {
    lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    unlockBodyScroll()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
