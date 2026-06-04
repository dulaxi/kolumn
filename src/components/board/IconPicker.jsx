import { useState, useRef, useMemo, useEffect } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useIsMobile } from '../../hooks/useMediaQuery'
import DynamicIcon from './DynamicIcon'
import {
  PHOSPHOR_CATEGORIES,
  ALL_PHOSPHOR_ICONS,
  searchPhosphor,
} from '../../data/phosphorIcons'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

// Each category gets a representative phosphor glyph for its bottom-tab.
// Mirrors iOS emoji-picker tabs (Recents 🕒 / Smileys 😀 / etc.) where
// each tab is a single iconographic hint at what's inside.
const CATEGORY_TAB_GLYPH = {
  popular: 'star',
  arrows: 'arrows-out-cardinal',
  system: 'gear',
  communications: 'chat-circle',
  office: 'briefcase',
  editor: 'pencil-simple',
  design: 'palette',
  media: 'play-circle',
  people: 'users',
  objects: 'package',
  commerce: 'shopping-cart',
  finances: 'currency-dollar',
  'maps & travel': 'map-pin',
  nature: 'leaf',
  weather: 'cloud-sun',
  'health & wellness': 'heart',
  'technology & development': 'code',
  games: 'game-controller',
  brands: 'shapes',
}

// Recents storage. Skipping store/zustand for this — picker state is
// purely UI and localStorage is fine. Tracks the last 24 picks so the
// "Recent" tab feels like an iOS recents row.
const RECENTS_KEY = 'kolumn:icon-picker:recents'
const RECENTS_LIMIT = 24

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
function pushRecent(name) {
  if (!name) return
  try {
    const next = [name, ...loadRecents().filter((n) => n !== name)].slice(0, RECENTS_LIMIT)
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  } catch { /* localStorage unavailable — non-fatal */ }
}

function IconGrid({ icons: iconList, value, onPick }) {
  return (
    <div className="grid grid-cols-7 sm:grid-cols-9 gap-1">
      {iconList.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onPick(name)}
          title={name}
          className={`aspect-square flex items-center justify-center rounded-xl transition-all duration-75 cursor-pointer active:scale-90 ${
            value === name
              ? 'bg-[var(--accent-lime-soft)] text-[var(--text-primary)]'
              : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
          }`}
        >
          <DynamicIcon name={name} className="w-5 h-5" />
        </button>
      ))}
    </div>
  )
}

export default function IconPicker({ value, onChange, onClose }) {
  const isMobile = useIsMobile()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('popular')
  const [recents, setRecents] = useState(() => loadRecents())
  const inputRef = useRef(null)
  const gridScrollRef = useRef(null)

  // Reset grid scroll on tab/search change so users always see the top
  // of a new list (iOS pickers do the same).
  useEffect(() => {
    gridScrollRef.current?.scrollTo({ top: 0 })
  }, [activeCategory, search])

  const handlePick = (name) => {
    pushRecent(name)
    setRecents(loadRecents())
    onChange(name)
    onClose()
  }

  const searchResults = useMemo(() => {
    return search.trim() ? searchPhosphor(search) : null
  }, [search])

  // Build the display list. Recents goes FIRST (only when populated, so
  // a brand-new user doesn't see an empty tab).
  const tabs = useMemo(() => {
    const list = []
    if (recents.length) list.push({ key: 'recent', label: 'Recent', icons: recents, glyph: 'clock-counter-clockwise' })
    for (const cat of PHOSPHOR_CATEGORIES) {
      list.push({ ...cat, glyph: CATEGORY_TAB_GLYPH[cat.key] || 'circle' })
    }
    return list
  }, [recents])

  const currentTab = tabs.find((t) => t.key === activeCategory) || tabs[0]
  const displayIcons = currentTab?.icons || []

  return (
    <Modal
      open
      onClose={onClose}
      contentClassName="flex items-center justify-center"
      initialFocusRef={inputRef}
    >
      <div
        data-icon-picker
        className={`bg-[var(--surface-card)] shadow-2xl flex flex-col overflow-hidden ${
          isMobile
            ? 'fixed inset-x-0 bottom-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[88vh]'
            : 'rounded-2xl w-[460px] h-[560px]'
        }`}
      >
        {/* iOS-style drag handle on mobile only */}
        {isMobile && (
          <div className="pt-2 pb-1 flex justify-center">
            <div className="w-9 h-1 rounded-full bg-[var(--border-default)]" />
          </div>
        )}

        {/* Pill search bar — iOS UISearchBar shape */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-[var(--surface-raised)]">
            <MagnifyingGlass className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons"
              className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder-[var(--text-muted)] text-[var(--text-primary)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center bg-[var(--text-muted)]/20 text-[var(--text-muted)] hover:bg-[var(--text-muted)]/30"
              >
                <X className="w-3 h-3" weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Icons grid */}
        <div ref={gridScrollRef} className="flex-1 overflow-y-auto px-3 pb-2">
          {/* Remove icon shortcut — only visible when one is currently set */}
          {value && !searchResults && (
            <button
              type="button"
              onClick={() => { onChange(null); onClose() }}
              className="mb-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--color-copper)] transition-colors cursor-pointer"
            >
              Remove icon
            </button>
          )}

          {searchResults ? (
            searchResults.length === 0 ? (
              <div className="text-center text-sm text-[var(--text-muted)] py-12">
                No icons match &ldquo;{search}&rdquo;
              </div>
            ) : (
              <IconGrid icons={searchResults} value={value} onPick={handlePick} />
            )
          ) : (
            <IconGrid icons={displayIcons} value={value} onPick={handlePick} />
          )}
        </div>

        {/* Bottom category tab bar — iOS emoji-picker style */}
        {!searchResults && (
          <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)]">
            <div className="overflow-x-auto">
              <div className="flex items-center px-2 py-1.5 gap-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveCategory(tab.key)}
                    title={tab.label}
                    aria-label={tab.label}
                    className={`shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      activeCategory === tab.key
                        ? 'bg-[var(--surface-raised)] text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <DynamicIcon name={tab.glyph} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
            <p className="px-3 pb-1.5 text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
              {currentTab?.label} · {displayIcons.length}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
