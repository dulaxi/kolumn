import { memo, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DotsSixVertical } from '@phosphor-icons/react'
import Card from './Card'
import AICardSkeleton from './AICardSkeleton'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { isAIBuilding } from '../../lib/toolExecutor'
import { useGhostHoverStore } from '../../store/ghostHoverStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useBoardStore } from '../../store/boardStore'

export default memo(function SortableCard({ card, onClick, onComplete, isSelected }) {
  const [showSkeleton, setShowSkeleton] = useState(() => isAIBuilding(card.id))

  useEffect(() => {
    if (showSkeleton) {
      const timer = setTimeout(() => setShowSkeleton(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [showSkeleton])
  const isMobile = useIsMobile()

  const setHoverCard = useGhostHoverStore((s) => s.setHoverCard)
  const clearHoverCard = useGhostHoverStore((s) => s.clearHoverCard)

  const onGhostEnter = () => {
    if (!useSettingsStore.getState().isGhostArmed(card.board_id)) return
    if (useBoardStore.getState()._isDragging) return
    setHoverCard(card.id)
  }
  const onGhostLeave = () => clearHoverCard()

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  if (showSkeleton) {
    return (
      <div ref={setNodeRef} style={style}>
        <AICardSkeleton />
      </div>
    )
  }

  if (isMobile) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-stretch" onMouseEnter={onGhostEnter} onMouseLeave={onGhostLeave}>
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex items-center px-1 text-[var(--border-default)] active:text-[var(--text-muted)] touch-none"
        >
          <DotsSixVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <Card card={card} onClick={onClick} onComplete={onComplete} isSelected={isSelected} />
        </div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onMouseEnter={onGhostEnter} onMouseLeave={onGhostLeave}>
      <Card card={card} onClick={onClick} onComplete={onComplete} isSelected={isSelected} />
    </div>
  )
})
