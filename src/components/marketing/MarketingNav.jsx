import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { CaretDown, List, Minus, Plus, X } from '@phosphor-icons/react'
import KolumnLockup from '../layout/KolumnLockup'
import Popover from '../ui/Popover'
import { lockBodyScroll, unlockBodyScroll } from '../ui/Modal'
import { NAV_LINKS, NAV_MENUS, PRIMARY_CTA, SIGN_IN } from '../../content/marketing-nav'
import useMarketingUser from './useMarketingUser'

// Chrome spec §3.1: 84px sticky bar (72px mobile), 1312px container at 1440,
// flat links + hover menus, Sign in (secondary) + Get started (ink), and a
// full-viewport overlay menu under 640px.

const CONTAINER = 'max-w-[90rem] mx-auto'
const CONTAINER_STYLE = { width: 'calc(100% - (2 * clamp(2rem, 1.43rem + 2.86vw, 4rem)))' }
const LINK = 'inline-flex items-center h-10 text-[15px] font-normal text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors'
const SECONDARY = 'inline-flex items-center justify-center h-9 px-5 min-w-[5rem] whitespace-nowrap text-[15px] font-normal text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[0.5px] border-[var(--color-sand)] rounded-lg transition-colors'
const PRIMARY = 'inline-flex items-center justify-center h-9 px-5 min-w-[5rem] whitespace-nowrap text-[15px] font-normal bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] rounded-lg transition-colors'

function NavMenu({ menu }) {
  const [open, setOpen] = useState(false)
  const width = menu.columns.length > 1 ? 'w-[26rem]' : 'w-[14rem]'
  return (
    // pb-2/-mb-2 extends the hover region down over the 6px gap between the
    // trigger and the Popover panel without shifting the nav's layout. Without
    // it, moving the cursor from the button toward the menu crosses dead space
    // that belongs to neither, firing onMouseLeave and closing the menu before
    // it can be reached.
    <div
      className="relative pb-2 -mb-2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="bottom-start"
        panelClassName={`${width} p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)]`}
        panel={
          <div className={`grid gap-2 ${menu.columns.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {menu.columns.map((column, i) => (
              <ul key={i} className="flex flex-col">
                {column.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className="flex items-center h-9 px-3 rounded-lg text-[15px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        }
      >
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          onFocus={() => setOpen(true)}
          className={`${LINK} gap-1.5 cursor-pointer`}
        >
          {menu.label}
          <CaretDown size={12} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </Popover>
    </div>
  )
}

function MobileAccordion({ menu }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="border-b border-[var(--border-subtle)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between h-14 text-[17px] text-[var(--text-primary)] cursor-pointer"
      >
        {menu.label}
        {open ? <Minus size={20} weight="light" /> : <Plus size={20} weight="light" />}
      </button>
      {open && (
        <ul className="pb-2">
          {menu.columns.flat().map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="flex items-center h-11 text-[15px] text-[var(--text-secondary)]">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export default function MarketingNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const user = useMarketingUser()

  // Close the overlay on navigation and release the scroll lock on unmount.
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    if (!menuOpen) return undefined
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [menuOpen])

  // The single Open/Close toggle. While the menu is open it is rendered via
  // the portal below (fixed at the same on-screen spot) instead of inline
  // in the mobile bar — see the note on the portal for why: lockBodyScroll
  // makes #root (and everything left inside it, this button included)
  // inert, so a click-to-close control has to live outside #root too.
  const toggleButton = (
    <button
      type="button"
      onClick={() => setMenuOpen((v) => !v)}
      aria-expanded={menuOpen}
      aria-controls="marketing-mobile-menu"
      aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      className={`w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer${menuOpen ? ' fixed top-[18px] right-5 z-[70] bg-[var(--surface-page)]' : ''}`}
    >
      {menuOpen ? <X size={20} /> : <List size={20} />}
    </button>
  )

  const authControls = user ? (
    <Link to="/dashboard" className={PRIMARY}>Open Kolumn</Link>
  ) : (
    <>
      <a href={SIGN_IN.to} className={SECONDARY}>{SIGN_IN.label}</a>
      <Link to={PRIMARY_CTA.to} className={PRIMARY}>{PRIMARY_CTA.label}</Link>
    </>
  )

  return (
    <nav aria-label="Main" className="sticky top-0 z-50 bg-[var(--surface-page)]">
      {/* Desktop bar — 84px: py-6 + h-9 controls */}
      <div className={`hidden sm:flex items-center justify-between py-6 ${CONTAINER}`} style={CONTAINER_STYLE}>
        <Link to="/" aria-label="Kolumn — home" className="flex items-center hover:opacity-90 transition-opacity">
          <KolumnLockup text={28} />
        </Link>
        <div className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={LINK}>{link.label}</Link>
          ))}
          {NAV_MENUS.map((menu) => (
            <NavMenu key={menu.label} menu={menu} />
          ))}
          <div className="flex items-center gap-3 ml-0.5">{authControls}</div>
        </div>
      </div>

      {/* Mobile bar — 72px */}
      <div className="flex sm:hidden items-center justify-between px-5 py-[18px]">
        <Link to="/" aria-label="Kolumn — home" className="flex items-center">
          <KolumnLockup text={28} />
        </Link>
        {!menuOpen && toggleButton}
      </div>

      {/* Portaled to document.body — lockBodyScroll() (below) sets `inert`
          + aria-hidden on #root while this is open (same mechanism Modal
          uses to hide the background), and this overlay (plus the toggle
          button, fixed in the same on-screen spot it occupies when inline)
          lives inside #root in the component tree. Without the portal,
          both would inert themselves: the overlay's own links and the
          close button would be unclickable and invisible to assistive
          tech. Never reached during a Node/server render — it's inside the
          `menuOpen &&` guard and menuOpen starts false, so keep the portal
          call under that guard and never reference document at module
          scope. */}
      {menuOpen &&
        createPortal(
          <>
            {toggleButton}
            <div
              id="marketing-mobile-menu"
              role="dialog"
              aria-label="Menu"
              className="sm:hidden fixed inset-x-0 top-[72px] bottom-0 z-50 bg-[var(--surface-page)] px-5 flex flex-col animate-dropdown"
            >
              <ul className="flex-1 overflow-y-auto">
                {NAV_LINKS.map((link) => (
                  <li key={link.to} className="border-b border-[var(--border-subtle)]">
                    <Link to={link.to} className="flex items-center h-14 text-[17px] text-[var(--text-primary)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
                {NAV_MENUS.map((menu) => (
                  <MobileAccordion key={menu.label} menu={menu} />
                ))}
                {!user && (
                  <li className="border-b border-[var(--border-subtle)]">
                    <a href={SIGN_IN.to} className="flex items-center h-14 text-[17px] text-[var(--text-primary)]">
                      {SIGN_IN.label}
                    </a>
                  </li>
                )}
              </ul>
              <div className="flex gap-3 py-4">
                {user ? (
                  <Link to="/dashboard" className={`${PRIMARY} flex-1 h-11`}>Open Kolumn</Link>
                ) : (
                  <>
                    <a href={SIGN_IN.to} className={`${SECONDARY} flex-1 h-11`}>{SIGN_IN.label}</a>
                    <Link to={PRIMARY_CTA.to} className={`${PRIMARY} flex-1 h-11`}>{PRIMARY_CTA.label}</Link>
                  </>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </nav>
  )
}
