// Motion preference resolution for the 'system' | 'full' | 'reduced'
// setting — the motion twin of utils/theme.js.
//
// 'system' removes the data-motion attribute entirely so the CSS
// prefers-reduced-motion media query in index.css live-follows the OS
// with no JS listener. Explicit values stamp data-motion, which the
// same CSS block reads to force ('reduced') or exempt ('full').

export function resolveMotion(motion) {
  return motion === 'full' || motion === 'reduced' ? motion : 'system'
}

export function applyMotion(motion) {
  const resolved = resolveMotion(motion)
  if (resolved === 'system') {
    document.documentElement.removeAttribute('data-motion')
  } else {
    document.documentElement.setAttribute('data-motion', resolved)
  }
}
