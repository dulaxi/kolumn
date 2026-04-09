import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Column from './Column'

export default function SortableColumn({ column, ...props }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column' },
    transition: {
      duration: 300,
      easing: 'cubic-bezier(0.35, 0, 0.25, 1)',
    },
    animateLayoutChanges: ({ isSorting, isDragging }) => isSorting || isDragging,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    filter: isDragging ? 'drop-shadow(0 10px 15px rgba(27, 27, 24, 0.1))' : 'none',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Column
        column={column}
        dragHandleProps={{ ...attributes, ...listeners }}
        {...props}
      />
    </div>
  )
}
