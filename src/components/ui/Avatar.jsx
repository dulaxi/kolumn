import { avatarColorClasses, getInitials } from '../../utils/formatting'

const SIZE_CLASSES = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-5 h-5 text-[9px]',
  md: 'w-6 h-6 text-[10px]',
  lg: 'w-8 h-8 text-xs',
}

export default function Avatar({ name, size = 'sm', className = '', children, ringed = false, ringColor = 'ring-[var(--surface-card)]' }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm
  // ringColor is a full class so callers on other surfaces can match their
  // background without stacking two conflicting ring-color utilities.
  const ring = ringed ? `ring-2 ${ringColor}` : ''
  return (
    <span
      className={`rounded-full shrink-0 flex items-center justify-center font-heading ${sizeClass} ${avatarColorClasses(name)} ${ring} ${className}`}
    >
      {children ?? getInitials(name).toLowerCase()}
    </span>
  )
}
