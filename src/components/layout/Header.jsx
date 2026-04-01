import { Search, User, LogOut, Settings, LayoutGrid, Bell, AtSign, UserPlus, MessageSquare, ArrowRight, X } from 'lucide-react'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '../../store/authStore'
import { useBoardStore } from '../../store/boardStore'
import { useNoteStore } from '../../store/noteStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import DynamicIcon from '../board/DynamicIcon'

export default function Header({ title }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const mobileSearchRef = useRef(null)
  const menuRef = useRef(null)
  const searchRef = useRef(null)
  const notifRef = useRef(null)
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const isDesktop = useIsDesktop()
  const toggleMobileMenu = useSettingsStore((s) => s.toggleMobileMenu)

  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)

  const cards = useBoardStore((s) => s.cards)
  const boards = useBoardStore((s) => s.boards)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const notes = useNoteStore((s) => s.notes)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Close notification panel on click outside
  useEffect(() => {
    if (!notifOpen) return
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  // Close search on click outside
  useEffect(() => {
    if (!searchFocused) return
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [searchFocused])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || q.length < 2) return { cards: [], notes: [] }

    const matchedCards = Object.values(cards)
      .filter((c) => {
        const title = (c.title || '').toLowerCase()
        const desc = (c.description || '').toLowerCase()
        const taskNum = `#${c.task_number}`
        return title.includes(q) || desc.includes(q) || taskNum.includes(q)
      })
      .slice(0, 6)

    const matchedNotes = Object.values(notes)
      .filter((n) => {
        const title = (n.title || '').toLowerCase()
        const content = (n.content || '').toLowerCase()
        return title.includes(q) || content.includes(q)
      })
      .slice(0, 3)

    return { cards: matchedCards, notes: matchedNotes }
  }, [searchQuery, cards, notes])

  const hasResults = searchResults.cards.length > 0 || searchResults.notes.length > 0
  const showDropdown = searchFocused && searchQuery.trim().length >= 2

  const handleCardResult = (card) => {
    setActiveBoard(card.board_id)
    setSearchQuery('')
    setSearchFocused(false)
    navigate('/boards')
    // Dispatch a custom event so BoardsPage can open this card
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('gambit:open-card', { detail: { cardId: card.id } }))
    }, 100)
  }

  const handleNoteResult = (note) => {
    setSearchQuery('')
    setSearchFocused(false)
    navigate('/notes')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const closeMobileSearch = () => {
    setMobileSearchOpen(false)
    setSearchQuery('')
    setSearchFocused(false)
  }

  // Auto-focus mobile search input when opened
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchRef.current) {
      mobileSearchRef.current.focus()
    }
  }, [mobileSearchOpen])

  return (
    <header className="relative h-16 bg-[#FAF8F6] border-b border-[#E0DBD5] flex items-center justify-between px-4 sm:px-6">
      {/* Mobile search overlay */}
      {!isDesktop && mobileSearchOpen ? (
        <div className="absolute inset-0 bg-white flex items-center gap-2 px-4 z-40" ref={searchRef}>
          <Search className="w-4 h-4 text-[#8E8E89] shrink-0" />
          <input
            ref={mobileSearchRef}
            type="text"
            placeholder="Search tasks, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            className="flex-1 text-sm py-2 bg-transparent focus:outline-none placeholder-gray-400"
          />
          <button
            type="button"
            onClick={closeMobileSearch}
            aria-label="Close search"
            className="p-1.5 rounded-lg text-[#8E8E89] hover:bg-[#E8E2DB] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Mobile search results */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full bg-white border-t border-[#E0DBD5] shadow-lg z-50 max-h-[70vh] overflow-y-auto">
              {!hasResults && (
                <p className="px-4 py-3 text-sm text-[#8E8E89]">No results found</p>
              )}
              {searchResults.cards.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-[#8E8E89] uppercase tracking-wider bg-[#F2EDE8]">Tasks</p>
                  {searchResults.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => { handleCardResult(card); closeMobileSearch() }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-[#F2EDE8] transition-colors"
                    >
                      <span className="text-[11px] font-mono text-[#8E8E89] shrink-0">#{card.task_number}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#1B1B18] truncate">{card.title}</p>
                        {boards[card.board_id] && (
                          <p className="text-[11px] text-[#8E8E89] truncate">{boards[card.board_id].name}</p>
                        )}
                      </div>
                      {card.priority && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          card.priority === 'high' ? 'bg-[#C27A4A]' : card.priority === 'medium' ? 'bg-[#D4A843]' : 'bg-[#A8BA32]'
                        }`} />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {searchResults.notes.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-[#8E8E89] uppercase tracking-wider bg-[#F2EDE8]">Notes</p>
                  {searchResults.notes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => { handleNoteResult(note); closeMobileSearch() }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-[#F2EDE8] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#1B1B18] truncate">{note.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
      {/* Left: grid button (mobile) + title (mobile) / title (desktop) */}
      <div className="flex items-center gap-2.5 min-w-0">
        {!isDesktop && (
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="p-1.5 -ml-1.5 rounded-lg text-[#5C5C57] hover:bg-[#E8E2DB] transition-colors"
          >
            <LayoutGrid className="w-[18px] h-[18px]" />
          </button>
        )}
        {isDesktop ? (
          <h1 className="text-xl font-semibold text-[#1B1B18] font-heading">{title}</h1>
        ) : (
          <span className="text-sm font-medium text-[#5C5C57] truncate">{title}</span>
        )}
      </div>
      </>
      )}

      {/* Center: search (desktop only) */}
      {isDesktop && (
        <div className="relative hidden sm:block sm:w-64 lg:w-80" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E89]" />
          <input
            type="text"
            placeholder="Search tasks, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-[#E8E2DB] border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6]"
          />

          {/* Search results dropdown */}
          {showDropdown && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#E0DBD5] rounded-xl shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto animate-dropdown">
              {!hasResults && (
                <p className="px-4 py-3 text-sm text-[#8E8E89]">No results found</p>
              )}

              {searchResults.cards.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-[#8E8E89] uppercase tracking-wider bg-[#F2EDE8]">Tasks</p>
                  {searchResults.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleCardResult(card)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-[#F2EDE8] transition-colors"
                    >
                      <span className="text-[11px] font-mono text-[#8E8E89] shrink-0">#{card.task_number}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#1B1B18] truncate">{card.title}</p>
                        {boards[card.board_id] && (
                          <p className="text-[11px] text-[#8E8E89] truncate">{boards[card.board_id].name}</p>
                        )}
                      </div>
                      {card.priority && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          card.priority === 'high' ? 'bg-[#C27A4A]' : card.priority === 'medium' ? 'bg-[#D4A843]' : 'bg-[#A8BA32]'
                        }`} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {searchResults.notes.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-[#8E8E89] uppercase tracking-wider bg-[#F2EDE8]">Notes</p>
                  {searchResults.notes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => handleNoteResult(note)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-[#F2EDE8] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#1B1B18] truncate">{note.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Right: search (mobile) + notifications + avatar */}
      <div className="flex items-center gap-1">
        {/* Mobile search trigger */}
        {!isDesktop && !mobileSearchOpen && (
          <button
            type="button"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Search"
            className="p-2 rounded-lg text-[#8E8E89] hover:bg-[#E8E2DB] transition-colors"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>
        )}

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            className="relative p-2 rounded-lg text-[#8E8E89] hover:bg-[#E8E2DB] transition-colors"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#C27A4A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#E0DBD5] rounded-xl shadow-lg z-50 overflow-hidden animate-dropdown">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E8E2DB]">
                <span className="text-sm font-semibold text-[#1B1B18]">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] font-medium text-[#A8BA32] hover:text-[#A8BA32]"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="px-4 py-6 text-sm text-[#8E8E89] text-center">No notifications yet</p>
                )}
                {notifications.map((n) => {
                  const icon = n.type === 'mention' ? <AtSign className="w-3.5 h-3.5 text-[#A8BA32]" />
                    : n.type === 'assigned' ? <UserPlus className="w-3.5 h-3.5 text-[#A8BA32]" />
                    : n.type === 'moved' ? <ArrowRight className="w-3.5 h-3.5 text-[#A8969E]" />
                    : <MessageSquare className="w-3.5 h-3.5 text-[#C4BFB8]" />

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        if (!n.read) markAsRead(n.id)
                        if (n.card_id && n.board_id) {
                          setActiveBoard(n.board_id)
                          setNotifOpen(false)
                          navigate('/boards')
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('gambit:open-card', { detail: { cardId: n.card_id } }))
                          }, 100)
                        }
                      }}
                      className={`flex items-start gap-2.5 w-full px-4 py-2.5 text-left hover:bg-[#F2EDE8] transition-colors ${!n.read ? 'bg-[#EEF2D6]/50' : ''}`}
                    >
                      <div className="mt-0.5 shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#5C5C57]">
                          <span className="font-medium">{n.actor_name || 'Someone'}</span>{' '}
                          {n.title}
                        </p>
                        {n.body && <p className="text-[11px] text-[#8E8E89] truncate mt-0.5">{n.body}</p>}
                        <p className="text-[10px] text-[#C4BFB8] mt-0.5">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#C2D64A] shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ${
            isDesktop
              ? profile?.icon ? `${profile.color === 'bg-[#8E8E89]' ? 'text-[#1B1B18]' : 'text-white'} ${profile.color || 'bg-[#E0DBD5]'}` : 'bg-[#E8E2DB]'
              : ''
          }`}
        >
          {!isDesktop ? (
            <span
              className="material-symbols-outlined text-[#1B1B18]"
              style={{ fontSize: '22px', lineHeight: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              owl
            </span>
          ) : profile?.icon ? (
            <DynamicIcon name={profile.icon} className="w-5 h-5" />
          ) : (
            <User className="w-5 h-5 text-[#5C5C57]" />
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 bg-white border border-[#E0DBD5] rounded-xl shadow-lg py-1 z-30 w-48 animate-dropdown">
            <div className="px-3 py-2 border-b border-[#E8E2DB]">
              <p className="text-sm font-medium text-[#1B1B18] truncate">{profile?.display_name || 'User'}</p>
              <p className="text-xs text-[#8E8E89] truncate">{profile?.email || ''}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                navigate('/settings')
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#5C5C57] hover:bg-[#F2EDE8]"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#7A5C44] hover:bg-[#F2EDE8]"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  )
}
