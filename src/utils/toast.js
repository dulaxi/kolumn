import toast from 'react-hot-toast'
import { createElement } from 'react'

const BASE = {
  fontFamily: "'SF Mono', SFMono-Regular, Menlo, monospace",
  fontSize: '12px',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 4px 24px rgba(27,27,24,0.10)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  maxWidth: '380px',
  border: '1px solid #1B1B18',
}

function icon(name) {
  return createElement('span', {
    className: 'material-symbols-outlined',
    style: {
      fontSize: '18px',
      lineHeight: '18px',
      fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24",
    },
  }, name)
}

export const showToast = {
  success: (message, opts) =>
    toast(message, {
      duration: 3000,
      ...opts,
      icon: icon('check_circle'),
      style: { ...BASE, background: '#C2D64A', color: '#1B1B18' },
    }),

  error: (message, opts) =>
    toast(message, {
      duration: 4000,
      ...opts,
      icon: icon('error'),
      style: { ...BASE, background: '#C27A4A', color: '#FAF8F6' },
    }),

  delete: (message, opts) =>
    toast(message, {
      duration: 5000,
      ...opts,
      icon: icon('delete'),
      style: { ...BASE, background: '#C27A4A', color: '#FAF8F6' },
    }),

  archive: (message, opts) =>
    toast(message, {
      duration: 3000,
      ...opts,
      icon: icon('archive'),
      style: { ...BASE, background: '#A8969E', color: '#E8DDE2' },
    }),

  restore: (message, opts) =>
    toast(message, {
      duration: 3000,
      ...opts,
      icon: icon('undo'),
      style: { ...BASE, background: '#C2D64A', color: '#1B1B18' },
    }),

  info: (message, opts) =>
    toast(message, {
      duration: 3000,
      ...opts,
      icon: icon('info'),
      style: { ...BASE, background: '#FAF8F6', color: '#5C5C57' },
    }),

  warn: (message, opts) =>
    toast(message, {
      duration: 4000,
      ...opts,
      icon: icon('warning'),
      style: { ...BASE, background: '#D4A843', color: '#1B1B18' },
    }),

  overdue: (message, opts) =>
    toast(message, {
      duration: 5000,
      ...opts,
      icon: icon('alarm'),
      style: { ...BASE, background: '#C27A4A', color: '#FAF8F6' },
    }),
}
