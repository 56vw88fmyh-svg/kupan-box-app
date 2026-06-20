import { createElement } from 'react'
import { cn } from './ui/index.js'

export function MotionPage({ children }) {
  return (
    <div className="animate-page-enter">
      {children}
    </div>
  )
}

export function MotionCard({ children, className = '', as: Component = 'div' }) {
  return createElement(
    Component,
    { className: cn('animate-page-enter transition duration-200 hover:-translate-y-0.5', className) },
    children,
  )
}
