import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@shared/lib/utils'

interface ModalDialogProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function ModalDialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  className,
}: ModalDialogProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 sm:px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-text-secondary">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="kas-btn-ghost rounded-md p-1.5"
            aria-label="Dialogni yopish"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
          {children}
        </div>

        {footer && (
          <div className="border-t border-border px-4 sm:px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
