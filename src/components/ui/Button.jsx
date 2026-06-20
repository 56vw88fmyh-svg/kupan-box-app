import { cn } from './utils.js'

const variantClasses = {
  primary: 'bg-kupan-ember text-kupan-black shadow-glow hover:bg-kupan-flame hover:shadow-xl hover:shadow-kupan-ember/20',
  secondary: 'border border-kupan-border bg-kupan-gray/70 text-kupan-bone hover:border-kupan-flame/70 hover:bg-kupan-gray',
  tertiary: 'bg-transparent text-kupan-bone hover:bg-white/10 hover:text-white',
  destructive: 'border border-kupan-red/45 bg-kupan-red/10 text-white hover:bg-kupan-red/20',
  success: 'border border-kupan-success/45 bg-kupan-success/20 text-white hover:bg-kupan-success/25',
  icon: 'border border-kupan-border bg-kupan-gray/70 text-kupan-bone hover:border-kupan-flame/70 hover:bg-kupan-gray',
}

const sizeClasses = {
  sm: 'min-h-11 px-3 py-2 text-xs',
  md: 'min-h-12 px-4 py-3 text-sm',
  lg: 'min-h-14 px-5 py-4 text-base',
}

const iconSizeClasses = {
  sm: 'h-11 min-h-11 w-11 px-0 py-0',
  md: 'h-12 min-h-12 w-12 px-0 py-0',
  lg: 'h-14 min-h-14 w-14 px-0 py-0',
}

export function Button({
  as: Component = 'button',
  children,
  className = '',
  disabled = false,
  icon = null,
  isLoading = false,
  loadingLabel = 'Cargando',
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}) {
  const isDisabled = disabled || isLoading
  const isIconOnly = variant === 'icon' && !children
  const sizeClass = isIconOnly ? iconSizeClasses[size] : sizeClasses[size]

  return (
    <Component
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-black uppercase tracking-[0.08em] transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kupan-flame active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55',
        variantClasses[variant] ?? variantClasses.primary,
        sizeClass ?? sizeClasses.md,
        className,
      )}
      aria-busy={isLoading || undefined}
      aria-disabled={Component !== 'button' && isDisabled ? true : undefined}
      disabled={Component === 'button' ? isDisabled : undefined}
      type={Component === 'button' ? type : undefined}
      {...props}
    >
      <span className={cn('inline-flex items-center justify-center', isLoading ? 'opacity-0' : '')} aria-hidden={isLoading ? true : undefined}>
        {icon}
      </span>
      {children ? <span className={cn('inline-flex items-center justify-center', isLoading ? 'opacity-0' : '')}>{children}</span> : null}
      {isLoading ? (
        <span className="absolute inline-flex items-center justify-center gap-2" role="status" aria-live="polite">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          {isIconOnly ? <span className="sr-only">{loadingLabel}</span> : null}
        </span>
      ) : null}
    </Component>
  )
}
