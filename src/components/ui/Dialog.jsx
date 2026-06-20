import { useEffect, useRef } from 'react'
import { Button } from './Button.jsx'
import { Card } from './Card.jsx'
import { cn } from './utils.js'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function Dialog({
  children,
  className = '',
  closeLabel = 'Cerrar',
  description,
  isDestructive = false,
  isOpen,
  onClose,
  title,
}) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    previousFocusRef.current = document.activeElement
    const dialog = dialogRef.current
    const focusable = dialog ? Array.from(dialog.querySelectorAll(focusableSelector)) : []
    const firstFocusable = focusable[0] ?? dialog
    firstFocusable?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
        return
      }

      if (event.key !== 'Tab' || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus?.()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleBackdropClick(event) {
    if (isDestructive) return
    if (event.target === event.currentTarget) onClose?.()
  }

  return (
    <div className="k-dialog-backdrop fixed inset-0 z-50 flex items-end bg-black/72 backdrop-blur-sm sm:items-center sm:justify-center" onMouseDown={handleBackdropClick}>
      <Card
        ref={dialogRef}
        aria-describedby={description ? 'kupan-dialog-description' : undefined}
        aria-modal="true"
        aria-labelledby="kupan-dialog-title"
        className={cn('k-dialog-panel w-full max-w-lg overflow-auto p-5 focus:outline-none', className)}
        role="dialog"
        tabIndex={-1}
        variant="elevated"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="kupan-dialog-title" className="text-2xl font-black uppercase leading-tight text-white">{title}</h2>
            {description ? <p id="kupan-dialog-description" className="mt-2 text-sm leading-6 text-white/65">{description}</p> : null}
          </div>
          <Button aria-label={closeLabel} size="sm" variant="icon" onClick={onClose}>x</Button>
        </div>
        <div className="mt-5">{children}</div>
      </Card>
    </div>
  )
}
