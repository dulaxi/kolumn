import { memo, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import Card from './Card'
import AICardSkeleton from './AICardSkeleton'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { isAIBuilding } from '../../lib/toolExecutor'

export default memo(function SortableCard({ card, onClick, onComplete, isSelected }) {
  const [showSkeleton, setShowSkeleton] = useState(() => isAIBuilding(card.id))

  useEffect(() => {
    if (!showSkeleton && isAIBuilding(card.id)) {
      setShowSkeleton(true)
    }
  })

  useEffect(() => {
    if (showSkeleton) {
      const timer = setTimeout(() => setShowSkeleton(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [showSkeleton])
  const isMobile = useIsMobile()
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
      <div ref={setNodeRef} style={style} className="flex items-stretch">
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex items-center px-1 text-[#E0DBD5] active:text-[#8E8E89] touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <Card card={card} onClick={onClick} onComplete={onComplete} isSelected={isSelected} />
        </div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card card={card} onClick={onClick} onComplete={onComplete} isSelected={isSelected} />
    </div>
  )
})
