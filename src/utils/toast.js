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

function make(iconName, bg, color, duration) {
  const colors = { color }
  return (message, opts) =>
    toast((t) => render(message, iconName, colors, t), {
      duration,
      ...opts,
      style: { ...BASE, background: bg, color },
    })
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
        phIcon('wifi-slash', '#1B1B18'),
        createElement('span', { style: { flex: 1, textAlign: 'left' } }, message),
      ),
    {
      duration: Infinity,
      style: { ...BASE, background: '#D4A843', color: '#1B1B18' },
    },
  )
}

export const showToast = {
  success: make('check-circle', '#C2D64A', '#1B1B18', 3000),
  error:   make('warning-circle', '#C27A4A', '#FAF8F6', 4000),
  delete:  make('trash',          '#C27A4A', '#FAF8F6', 5000),
  archive: make('archive',        '#A8969E', '#E8DDE2', 3000),
  restore: make('arrow-counter-clockwise', '#C2D64A', '#1B1B18', 3000),
  info:    make('info',            '#FAF8F6', '#5C5C57', 3000),
  warn:    make('warning',         '#D4A843', '#1B1B18', 4000),
  overdue: make('alarm',           '#C27A4A', '#FAF8F6', 5000),
  offline: offlineToast,
  dismiss: (id) => toast.dismiss(id),
}
