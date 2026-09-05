import { memo } from 'react'

import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { selectCardLabels } from '../../store/selectors'
import { usePresenceStore } from '../../store/presenceStore'
import { othersOnCard } from '../../store/presence'
import CardVisual from './CardVisual'

// Thin store-reading wrapper around CardVisual (the pure presentational
// shell). This file is where all the "how does a card get its data" wiring
// lives — Zustand reads, the complete-toggle write, presence lookup. Keep it
// that way: anything that needs a store, Supabase, or the browser belongs
// here, not in CardVisual, which marketing pages also render at prerender
// time in Node.
export default memo(function Card({ card, onClick, onComplete, isSelected, iconOverride, ghost }) {
  const labels = useBoardStore(selectCardLabels(card.id))
  const updateCard = useBoardStore((s) => s.updateCard)
  const profile = useAuthStore((s) => s.profile)
  const font = useSettingsStore((s) => s.font)
  const labelStyle = useSettingsStore((s) => s.labelStyle)
  const toggleLabelStyle = useSettingsStore((s) => s.toggleLabelStyle)
  const iconStyle = useSettingsStore((s) => s.iconStyle)
  const toggleIconStyle = useSettingsStore((s) => s.toggleIconStyle)
  // While ghost mode is armed for this board, the card surfaces swap: default
  // becomes the page colour and hover lifts to the card colour.
  const ghostArmed = useSettingsStore((s) => !!s.ghostBoards?.[card.board_id])

  const presenceByCard = usePresenceStore((s) => s.byCard)
  // Teammates currently on this card (excludes you) — shown as haloed avatars
  // in the card's avatar row, not a whole-card ring.
  const watchers = othersOnCard(presenceByCard, card.id, profile?.id)

  const handleToggleChecklistItem = (updatedChecklist) => {
    updateCard(card.id, { checklist: updatedChecklist })
  }

  return (
    <CardVisual
      card={card}
      onClick={onClick}
      onComplete={onComplete}
      isSelected={isSelected}
      iconOverride={iconOverride}
      ghost={ghost}
      labels={labels}
      profile={profile}
      watchers={watchers}
      font={font}
      labelStyle={labelStyle}
      toggleLabelStyle={toggleLabelStyle}
      iconStyle={iconStyle}
      toggleIconStyle={toggleIconStyle}
      onToggleChecklistItem={handleToggleChecklistItem}
      ghostArmed={ghostArmed}
    />
  )
})
