import { createElement } from 'react'
import { cn } from './utils.js'

const stateClasses = {
  available: 'border-kupan-success/45 bg-kupan-success/10 text-kupan-success',
  reserved: 'border-kupan-info/45 bg-kupan-info/10 text-kupan-info',
  full: 'border-kupan-border bg-kupan-gray/70 text-white/70',
  cancelled: 'border-kupan-red/45 bg-kupan-red/10 text-kupan-red',
  pending: 'border-kupan-warning/45 bg-kupan-warning/10 text-kupan-warning',
  success: 'border-kupan-success/45 bg-kupan-success/10 text-kupan-success',
  warning: 'border-kupan-warning/45 bg-kupan-warning/10 text-kupan-warning',
  error: 'border-kupan-red/45 bg-kupan-red/10 text-kupan-red',
  neutral: 'border-kupan-border bg-kupan-gray/70 text-kupan-bone',
}

export function Badge({ as = 'span', children, className = '', state = 'neutral', ...props }) {
  return createElement(
    as,
    {
      className: cn('inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em]', stateClasses[state] ?? stateClasses.neutral, className),
      ...props,
    },
    children,
  )
}
