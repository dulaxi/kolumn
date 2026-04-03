import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { createPortal } from 'react-dom'
import DynamicIcon from './DynamicIcon'
import { PHOSPHOR_CATEGORIES, ALL_PHOSPHOR_ICONS } from '../../data/phosphorIcons'

// Lazy-load Material data only when the user switches to the Material tab.
// This keeps the 139KB file out of the main JS chunk.
let _materialCache = null
async function loadMaterialIcons() {
  if (!_materialCache) {
    const mod = await import('../../data/materialSymbolsIcons')
    _materialCache = { categories: mod.MATERIAL_CATEGORIES, names: mod.MATERIAL_ICON_NAMES }
  }
  return _materialCache
}

const LIBRARY_TABS = [
  { key: 'phosphor', label: 'Phosphor' },
  { key: 'material', label: 'Material' },
]

function IconGrid({ icons: iconList, value, onChange, onClose }) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-1">
      {iconList.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => { onChange(name); onClose() }}
          title={name}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
            value === name
              ? 'bg-[#EEF2D6] text-[#A8BA32] ring-1 ring-[#C2D64A]'
              : 'text-[#5C5C57] hover:bg-[#E8E2DB] hover:text-[#5C5C57]'
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
  const [activeTab, setActiveTab] = useState('phosphor')
  const inputRef = useRef(null)

  const [materialData, setMaterialData] = useState(null)

  const categories = activeTab === 'phosphor' ? PHOSPHOR_CATEGORIES : (materialData?.categories || [])
  const allIcons = activeTab === 'phosphor' ? ALL_PHOSPHOR_ICONS : (materialData?.names || [])
  const iconCount = allIcons.length

  // Reset category when switching tabs; lazy-load Material data on first switch
  useEffect(() => {
    setActiveCategory('popular')
    if (activeTab === 'material' && !materialData) {
      loadMaterialIcons().then(setMaterialData)
    }
  }, [activeTab, materialData])

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase().replace(/\s+/g, activeTab === 'material' ? '_' : '-')
    return allIcons.filter((name) => name.includes(q))
  }, [search, allIcons, activeTab])

  const currentCategory = categories.find((c) => c.key === activeCategory)
  const displayIcons = !searchResults ? (currentCategory ? currentCategory.icons : []) : null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className={`bg-white shadow-2xl flex flex-col overflow-hidden ${
          isMobile
            ? 'fixed inset-0 rounded-none'
            : 'rounded-2xl w-[640px] max-h-[80vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with tabs */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E2DB]">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-[#1B1B18]">Choose an icon</h2>
            <div className="flex items-center bg-[#E8E2DB] rounded-lg p-0.5">
              {LIBRARY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-white text-[#1B1B18] shadow-sm'
                      : 'text-[#5C5C57] hover:text-[#5C5C57]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#8E8E89] hover:text-[#5C5C57] rounded-lg hover:bg-[#E8E2DB]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E8E2DB]">
          <Search className="w-4 h-4 text-[#8E8E89] shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons..."
            className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder-[#8E8E89]"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-[#8E8E89] hover:text-[#5C5C57]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Category sidebar */}
          {!searchResults && (
            <div className="hidden sm:block w-44 shrink-0 border-r border-[#E8E2DB] overflow-y-auto py-2">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`w-full text-left px-4 py-1.5 text-xs transition-colors cursor-pointer ${
                    activeCategory === cat.key
                      ? 'text-[#1B1B18] font-medium bg-[#F2EDE8]'
                      : 'text-[#5C5C57] hover:text-[#5C5C57] hover:bg-[#F2EDE8]'
                  }`}
                >
                  {cat.label}
                  <span className="text-[#8E8E89] ml-1">({cat.icons.length})</span>
                </button>
              ))}
            </div>
          )}

          {/* Icons grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Remove icon option */}
            {value && (
              <button
                type="button"
                onClick={() => { onChange(null); onClose() }}
                className="mb-3 text-xs text-[#8E8E89] hover:text-[#7A5C44] transition-colors cursor-pointer"
              >
                Remove icon
              </button>
            )}

            {searchResults ? (
              <>
                <p className="text-xs text-[#8E8E89] mb-3">{searchResults.length} results for &ldquo;{search}&rdquo;</p>
                <IconGrid icons={searchResults} value={value} onChange={onChange} onClose={onClose} />
                {searchResults.length === 0 && (
                  <p className="text-center text-sm text-[#8E8E89] py-8">No icons found</p>
                )}
              </>
            ) : (
              <>
                <IconGrid icons={displayIcons} value={value} onChange={onChange} onClose={onClose} />
                {displayIcons.length === 0 && (
                  <p className="text-center text-sm text-[#8E8E89] py-8">No icons found</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[#E8E2DB] flex items-center justify-between">
          <span className="text-[11px] text-[#8E8E89]">{iconCount} icons available</span>
          <button type="button" onClick={onClose} className="text-xs text-[#5C5C57] hover:text-[#5C5C57] px-3 py-1 rounded-lg hover:bg-[#E8E2DB] cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
