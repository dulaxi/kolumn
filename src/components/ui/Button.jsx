import { forwardRef, cloneElement, isValidElement } from 'react'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

function Slot({ children, className, style, ...slotProps }) {
  if (!isValidElement(children)) return null
  const childProps = children.props || {}
  return cloneElement(children, {
    ...slotProps,
    ...childProps,
    className: mergeClassNames(className, childProps.className),
    style: { ...style, ...childProps.style },
  })
}

const VARIANTS = {
  primary:
    'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)]',
  accent:
    'bg-[var(--color-lime)] text-[var(--color-ink)] hover:bg-[var(--color-lime-dark)]',
  secondary:
    'bg-[var(--color-cream)] text-[var(--text-primary)] border border-[var(--color-sand)] hover:bg-[var(--color-cream-dark)]',
  ghost:
    'bg-transparent text-[var(--text-primary)] hover:bg-[var(--color-cream)]',
  destructive:
    'bg-[var(--color-copper)] text-white hover:bg-[var(--color-copper-dark)]',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-[13px] gap-1.5',
  lg: 'h-11 px-5 text-sm gap-2',
  'icon-sm': 'h-8 w-8 p-0 text-xs',
  'icon-md': 'h-9 w-9 p-0',
  'icon-lg': 'h-11 w-11 p-0',
}

const BASE =
  'inline-flex items-center justify-center font-medium rounded-lg select-none cursor-pointer ' +
  'transition-colors duration-100 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lime-dark)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-page)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'active:translate-y-[0.5px]'

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    disabled = false,
    asChild = false,
    type,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const classes = mergeClassNames(
    BASE,
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    loading ? 'pointer-events-none' : '',
    className,
  )

  const content = loading ? (
    <>
      <span>{loadingText ?? children}</span>
      <span aria-hidden="true" className="btn-dots" />
    </>
  ) : (
    children
  )

  if (asChild) {
    return (
      <Slot
        ref={ref}
        className={classes}
        aria-disabled={disabled || loading || undefined}
        aria-busy={loading || undefined}
        {...rest}
      >
        {content}
      </Slot>
    )
  }

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  )
})

export default Button
