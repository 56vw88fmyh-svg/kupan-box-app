import { useId } from 'react'
import { cn } from './utils.js'

const statusClasses = {
  default: 'border-kupan-border focus:border-kupan-flame',
  error: 'border-kupan-red/65 focus:border-kupan-red',
  success: 'border-kupan-success/65 focus:border-kupan-success',
}

export function Input({
  className = '',
  disabled = false,
  error = '',
  helpText = '',
  icon = null,
  id,
  label,
  required = false,
  success = '',
  wrapperClassName = '',
  ...props
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const helpId = `${inputId}-help`
  const errorId = `${inputId}-error`
  const status = error ? 'error' : success ? 'success' : 'default'
  const descriptionId = error ? errorId : helpText || success ? helpId : undefined

  return (
    <div className={cn('block', wrapperClassName)}>
      {label ? (
        <label className="text-xs font-black uppercase tracking-[0.16em] text-white/70" htmlFor={inputId}>
          {label}{required ? <span className="ml-1 text-kupan-flame" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      <div className="relative mt-2">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-white/55" aria-hidden="true">{icon}</span> : null}
        <input
          id={inputId}
          className={cn(
            'min-h-12 w-full rounded-xl border bg-kupan-black/45 px-4 py-3 text-base font-bold text-kupan-bone outline-none transition placeholder:text-white/35 disabled:cursor-not-allowed disabled:opacity-55',
            icon ? 'pl-10' : '',
            statusClasses[status],
            className,
          )}
          aria-describedby={descriptionId}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          required={required}
          {...props}
        />
      </div>
      {error ? <p id={errorId} className="mt-2 text-sm font-bold leading-5 text-kupan-red">{error}</p> : null}
      {!error && success ? <p id={helpId} className="mt-2 text-sm font-bold leading-5 text-kupan-success">{success}</p> : null}
      {!error && !success && helpText ? <p id={helpId} className="mt-2 text-sm leading-5 text-white/65">{helpText}</p> : null}
    </div>
  )
}
