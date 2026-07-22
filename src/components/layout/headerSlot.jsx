import { createContext, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { useIsDesktop } from '../../hooks/useMediaQuery'

// Bridges each page's title + action buttons into the shared 64px header bar.
// The bar is rendered by AppLayout (above the page in the tree) but the content
// is owned by each page — so a page's buttons keep their own hooks/state. Header
// publishes an empty slot node here; pages portal their <PageHeader> into it.
const HeaderSlotContext = createContext(null)

export function HeaderSlotProvider({ children }) {
  const [node, setNode] = useState(null)
  return (
    <HeaderSlotContext.Provider value={{ node, setNode }}>
      {children}
    </HeaderSlotContext.Provider>
  )
}

export function useHeaderSlot() {
  return useContext(HeaderSlotContext)
}

// Horizontal alignment of the bar content, matched to each page's body:
//   narrow → centered max-w-4xl column (Chat, Builder)
//   wide   → full-width padded (Boards)
const ALIGN = {
  narrow: 'max-w-4xl mx-auto px-4 sm:px-8',
  wide: 'px-4 sm:px-8',
}

// Page-facing API. On desktop, portals title+buttons into the 64px bar,
// bottom-aligned. On mobile (or before the slot mounts), renders inline where
// it sits in the page — today's behavior, unchanged.
export function PageHeader({ align = 'narrow', mobileClassName, children }) {
  const slot = useHeaderSlot()
  const isDesktop = useIsDesktop()

  if (isDesktop && slot?.node) {
    return createPortal(
      <div className={`${ALIGN[align] || ALIGN.narrow} w-full flex items-end justify-between gap-3`}>
        {children}
      </div>,
      slot.node,
    )
  }

  return (
    <div className={mobileClassName || 'flex items-center justify-between gap-3 mb-6'}>
      {children}
    </div>
  )
}
