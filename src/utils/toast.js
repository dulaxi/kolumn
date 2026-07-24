import toast from 'react-hot-toast'
import { createElement } from 'react'

const BASE = {
  fontFamily: "'SF Mono', SFMono-Regular, Menlo, monospace",
  fontSize: '12px',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 4px 24px rgba(27,27,24,0.10)',
  width: '420px',
  maxWidth: '420px',
  border: '1px solid #1B1B18',
}

function phIcon(name, color) {
  return createElement('i', {
    className: `ph ph-${name}`,
    style: {
      fontSize: '18px',
      lineHeight: '18px',
      flexShrink: 0,
      color,
    },
  })
}

function dismissBtn(id, color) {
  return createElement('button', {
    onClick: () => toast.dismiss(id),
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      marginLeft: 'auto',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      opacity: 0.7,
    },
    onMouseEnter: (e) => { e.currentTarget.style.opacity = 1 },
    onMouseLeave: (e) => { e.currentTarget.style.opacity = 0.7 },
  }, phIcon('x', color))
}

function render(message, iconName, colors, t) {
  return createElement('div', {
    style: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%' },
  },
    phIcon(iconName, colors.color),
    createElement('span', { style: { flex: 1, textAlign: 'left' } }, message),
    dismissBtn(t.id, colors.color),
  )
}

function make(iconName, bg, color, duration, styleOverride) {
  const colors = { color }
  return (message, opts) =>
    toast((t) => render(message, iconName, colors, t), {
      duration,
      ...opts,
      style: { ...BASE, background: bg, color, ...styleOverride },
    })
}

// Inline SVG instead of the ph webfont: this toast renders while the
// network is down, so the CDN icon font may never have loaded (first
// glyph use triggers the font fetch — guaranteed to fail offline).
function wifiSlashIcon(color) {
  return createElement(
    'svg',
    {
      width: 18,
      height: 18,
      viewBox: '0 0 18 18',
      fill: 'none',
      stroke: color,
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      style: { flexShrink: 0 },
      'aria-hidden': true,
    },
    createElement('path', { d: 'M2.5 7.5a10 10 0 0 1 13 0' }),
    createElement('path', { d: 'M5 10.2a6.5 6.5 0 0 1 8 0' }),
    createElement('circle', { cx: 9, cy: 13.4, r: 1, fill: color, stroke: 'none' }),
    createElement('line', { x1: 3, y1: 2.5, x2: 15, y2: 15.5 }),
  )
}

// Offline is a *state*, not an event: a warn-styled toast that stays
// until connectivity returns (duration: Infinity, no dismiss button —
// the user can't dismiss being offline). The pulse dot encodes
// "ongoing". Dismissed programmatically via showToast.dismiss(id).
function offlineToast(message) {
  return toast(
    () =>
      createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%' } },
        createElement('span', { className: 'toast-pulse-dot' }),
        wifiSlashIcon('#1B1B18'),
        createElement('span', { style: { flex: 1, textAlign: 'left' } }, message),
      ),
    {
      duration: Infinity,
      style: { ...BASE, background: TOAST_AMBER, color: '#1B1B18' },
    },
  )
}

// Hue = meaning (decision: error-style-decisions-3.html, 1B):
// lime = positive, copper = failure, red = destructive receipt,
// honey = warning/time. Saturated fills are theme-stable with the ink
// border in both themes (the fill separates itself); the two pale fills
// (info, archive) theme via --toast-* tokens, incl. the brighter border
// they need to separate from a dark page. CSS vars resolve fine inside
// react-hot-toast's inline styles.
const PALE = { border: '1px solid var(--toast-pale-border)' }

// Toast warning fill: amber, deliberately brighter than the app-wide
// --color-honey (#D4A843) — the mustard read as muddy at toast size
// (user call, 2026-07-24). Honey remains the warning hue everywhere else.
const TOAST_AMBER = '#F2B33D'

export const showToast = {
  success: make('check-circle', '#C2D64A', '#1B1B18', 3000),
  error:   make('warning-circle', '#C27A4A', '#FAF8F6', 4000),
  delete:  make('trash',          '#B53333', '#FAF8F6', 5000),
  archive: make('archive', 'var(--toast-archive-bg)', 'var(--toast-archive-text)', 3000, PALE),
  restore: make('arrow-counter-clockwise', '#C2D64A', '#1B1B18', 3000),
  info:    make('info', 'var(--toast-info-bg)', 'var(--toast-info-text)', 3000, PALE),
  warn:    make('warning',         TOAST_AMBER, '#1B1B18', 4000),
  overdue: make('alarm',           TOAST_AMBER, '#1B1B18', 5000),
  offline: offlineToast,
  dismiss: (id) => toast.dismiss(id),
}
