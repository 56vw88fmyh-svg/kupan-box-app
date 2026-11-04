import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button.jsx'
import { Card } from './Card.jsx'
import { acquireBodyScrollLock } from '../../utils/bodyScrollLock.js'
import { cn } from './utils.js'

const openDialogs = []
let backgroundLocks = 0
let previousInert = false

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
  const dialogId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    previousFocusRef.current = document.activeElement
    const dialog = dialogRef.current
    const root = document.getElementById('root')
    if (backgroundLocks++ === 0 && root) { previousInert = root.inert; root.inert = true }
    const token = {}
    openDialogs.push(token)
    const focusable = dialog ? Array.from(dialog.querySelectorAll(focusableSelector)) : []
    const firstFocusable = focusable[0] ?? dialog
    firstFocusable?.focus()

    function handleKeyDown(event) {
      if (openDialogs.at(-1) !== token) return
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = dialog ? Array.from(dialog.querySelectorAll(focusableSelector)).filter((element) => element.getClientRects().length > 0) : []
      if (focusable.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const releaseScrollLock = acquireBodyScrollLock(document.body)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      releaseScrollLock()
      const wasTop = openDialogs.at(-1) === token
      openDialogs.splice(openDialogs.indexOf(token), 1)
      if (--backgroundLocks === 0 && root) root.inert = previousInert
      if (wasTop && previousFocusRef.current?.isConnected) previousFocusRef.current.focus?.({ preventScroll: true })
    }
  }, [isOpen])

  if (!isOpen) return null

  function handleBackdropClick(event) {
    if (isDestructive) return
    if (event.target === event.currentTarget) onClose?.()
  }

  return createPortal(
    <div className="k-dialog-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-black/72 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:px-4" onMouseDown={handleBackdropClick}>
      <Card
        ref={dialogRef}
        aria-describedby={description ? `${dialogId}-description` : undefined}
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        className={cn('k-dialog-panel w-full max-w-[94vw] overflow-auto p-5 focus:outline-none sm:max-w-lg', className)}
        role="dialog"
        tabIndex={-1}
        variant="elevated"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`${dialogId}-title`} className="text-2xl font-black uppercase leading-tight text-white">{title}</h2>
            {description ? <p id={`${dialogId}-description`} className="mt-2 text-sm leading-6 text-white/65">{description}</p> : null}
          </div>
          <Button aria-label={closeLabel} size="sm" variant="icon" onClick={onClose}>x</Button>
        </div>
        <div className="mt-5">{children}</div>
      </Card>
    </div>,
    document.body,
  )
}
