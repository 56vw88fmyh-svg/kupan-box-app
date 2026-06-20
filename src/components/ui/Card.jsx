import { createElement, forwardRef } from 'react'
import { cn } from './utils.js'

const variantClasses = {
  standard: 'border-kupan-border bg-kupan-iron/90 shadow-[0_12px_34px_rgba(0,0,0,0.34)]',
  elevated: 'border-kupan-border bg-kupan-gray/90 shadow-[0_18px_54px_rgba(0,0,0,0.46)]',
  interactive: 'border-kupan-border bg-kupan-iron/90 shadow-[0_12px_34px_rgba(0,0,0,0.34)] transition duration-200 hover:-translate-y-0.5 hover:border-kupan-flame/55 hover:bg-kupan-gray/75',
  selected: 'border-kupan-flame/70 bg-kupan-ember/10 shadow-glow',
  warning: 'border-kupan-warning/45 bg-kupan-warning/10',
}

export const Card = forwardRef(function Card({ as = 'div', children, className = '', variant = 'standard', ...props }, ref) {
  return createElement(
    as,
    {
      ref,
      className: cn('rounded-xl border', variantClasses[variant] ?? variantClasses.standard, className),
      ...props,
    },
    children,
  )
})
