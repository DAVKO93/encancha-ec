import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Spinner } from './Loader'

// Ventana emergente: en el celular sube desde abajo, en el computador va centrada.
export default function Modal({ open, onClose, title, children, footer, dismissible = true }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => {
      const first = panelRef.current?.querySelector('input, select, textarea')
      first?.focus()
    }, 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      clearTimeout(timer)
    }
  }, [open, onClose, dismissible])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => dismissible && onClose()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-paper shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 -mt-1 grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>
        <div className="overflow-y-auto px-6 pb-5 pt-2">{children}</div>
        {footer && (
          <footer
            className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 pt-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', busy }) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      dismissible={!busy}
      title={title}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-outline btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="btn-solid btn-sm">
            {busy ? <Spinner className="h-4 w-4" /> : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-mute">{message}</p>
    </Modal>
  )
}
