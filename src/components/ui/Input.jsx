import { forwardRef } from 'react'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

const BASE =
  'w-full text-[13px] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] ' +
  'border border-[var(--border-default)] rounded-lg ' +
  'transition-colors duration-100 outline-none ' +
  'hover:border-[var(--color-mist)] focus:border-[var(--color-ink)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

const SIZE = 'h-9 px-3'

const ERROR =
  'border-[var(--color-copper)] hover:border-[var(--color-copper)] focus:border-[var(--color-copper)]'

const Input = forwardRef(function Input(
  { error = false, leadingIcon, className = '', wrapperClassName = '', type = 'text', ...rest },
  ref,
) {
  const inputClasses = mergeClassNames(
    BASE,
    SIZE,
    leadingIcon ? 'pl-9' : '',
    error ? ERROR : '',
    className,
  )

  // Note: wrapperClassName only applies in the leadingIcon branch below —
  // without an icon there is no wrapper to put it on and the prop is silently
  // dropped. That has bitten a caller trying to size a field with it. If you
  // need a width, put it on the input via className, or wrap the field
  // yourself at the call site.
  if (leadingIcon) {
    return (
      <div className={mergeClassNames('relative', wrapperClassName)}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex items-center justify-center">
          {leadingIcon}
        </span>
        <input ref={ref} type={type} className={inputClasses} {...rest} />
      </div>
    )
  }

  return <input ref={ref} type={type} className={inputClasses} {...rest} />
})

export default Input
