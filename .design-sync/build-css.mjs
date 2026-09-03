// Design-sync CSS build (cfg.buildCmd): compile Tailwind v4 from src/index.css,
// then append the Phosphor icon-font glyph classes (@phosphor-icons/web
// regular + fill — DynamicIcon renders <i class="ph ph-…">, so board-card
// icons are invisible without them). Their @font-face blocks are stripped
// here: the Phosphor woff2s + @font-face ship via cfg.extraFonts into
// fonts/fonts.css, and a second copy with unresolvable relative urls would
// only produce [FONT_DANGLING] warns.
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const OUT = '.design-sync/.cache/tailwind.css'
mkdirSync('.design-sync/.cache', { recursive: true })
execSync(`npx -y @tailwindcss/cli@4 -i src/index.css -o ${OUT}`, { stdio: 'inherit' })

const stripFontFace = (css) => css.replace(/@font-face\s*\{[^}]*\}/g, '')
const phosphor = ['regular', 'fill']
  .map((w) => stripFontFace(readFileSync(`node_modules/@phosphor-icons/web/src/${w}/style.css`, 'utf8')))
  .join('\n')
writeFileSync(OUT, readFileSync(OUT, 'utf8') + '\n/* @phosphor-icons/web glyph classes (fonts ship via extraFonts) */\n' + phosphor)
console.error(`build-css: wrote ${OUT} (+ phosphor glyph classes)`)
