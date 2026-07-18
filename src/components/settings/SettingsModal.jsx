import { useState, useEffect } from 'react'
import {
  IdentificationCard,
  MagnifyingGlass,
  ShieldCheck,
  CreditCard,
  Sliders,
  X,
} from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import GeneralSection from './GeneralSection'
import ProfileSection from './ProfileSection'
import AccountSection from './AccountSection'
import PrivacySection from './PrivacySection'
import BillingSection from './BillingSection'

// Nav registry. `keywords` powers the v1 search: substring match dims
// non-matching nav items and auto-selects the first match.
const SECTIONS = [
  {
    id: 'general',
    label: 'General',
    icon: Sliders,
    keywords: [
      'general', 'appearance', 'theme', 'system', 'light', 'dark', 'font', 'mona sans', 'sf mono',
      'profile', 'avatar', 'icon', 'display name', 'full name', 'color',
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: IdentificationCard,
    keywords: [
      'account', 'email', 'password', 'sign out', 'log out', 'sessions', 'devices',
      'delete account', 'danger',
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: ShieldCheck,
    keywords: ['privacy', 'data protection', 'policy', 'export', 'backup', 'json', 'data'],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    keywords: ['billing', 'plan', 'upgrade', 'downgrade', 'tier', 'pro', 'free', 'limits', 'payment', 'invoices', 'cancel'],
  },
]

function sectionMatches(section, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return section.keywords.some((k) => k.includes(q))
}

export default function SettingsModal({ open, onClose, initialSection = 'general' }) {
  const [activeId, setActiveId] = useState('general')
  const [query, setQuery] = useState('')

  // When the modal opens, jump to the requested pane (e.g. reopened on
  // Billing after returning from the /plans page). Only fires on the
  // open transition, so clicking between panes while open is unaffected.
  useEffect(() => {
    if (open) setActiveId(initialSection)
  }, [open, initialSection])

  const handleQueryChange = (e) => {
    const next = e.target.value
    setQuery(next)
    const matches = SECTIONS.filter((s) => sectionMatches(s, next))
    if (matches.length > 0 && !matches.some((s) => s.id === activeId)) {
      setActiveId(matches[0].id)
    }
  }

  const handleClose = () => {
    setQuery('')
    setActiveId('general')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} ariaLabel="Settings">
      <div className="flex h-[calc(100dvh-2rem)] max-h-[720px] w-[calc(100vw-2rem)] max-w-[960px] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[0_4px_24px_rgba(27,27,24,0.10)]">
        {/* Left nav */}
        <nav
          aria-label="Settings sections"
          className="flex w-48 shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--surface-sidebar)]"
        >
          <div className="shrink-0 p-3 pb-1">
            <Input
              aria-label="Search settings"
              placeholder="Search"
              value={query}
              onChange={handleQueryChange}
              leadingIcon={<MagnifyingGlass size={14} />}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-1">
            <p className="px-2 pb-1 pt-2 text-xs text-[var(--text-muted)]">Settings</p>
            <ul className="flex flex-col gap-px">
              {SECTIONS.map((section) => {
                const ActiveIcon = section.icon
                const active = section.id === activeId
                const dimmed = !sectionMatches(section, query)
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(section.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-[var(--surface-hover)] font-medium text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                      } ${dimmed ? 'opacity-40' : ''}`}
                    >
                      <ActiveIcon size={16} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{section.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        {/* Content pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-end px-3 pt-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              aria-label="Close settings"
            >
              <X size={16} />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-6 pt-1">
            {activeId === 'general' && (
              <>
                <ProfileSection />
                <GeneralSection />
              </>
            )}
            {activeId === 'account' && <AccountSection onClose={handleClose} />}
            {activeId === 'privacy' && <PrivacySection />}
            {activeId === 'billing' && <BillingSection onClose={handleClose} />}
          </div>
        </div>
      </div>
    </Modal>
  )
}
