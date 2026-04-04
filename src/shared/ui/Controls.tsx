import { useCallback, useRef, type ReactNode } from 'react'
import { Search, X, AlertTriangle, type LucideIcon } from 'lucide-react'
import { cn } from '@shared/lib/utils'

// ─── SearchInput ──────────────────────────────────────────────────────────────

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Qidirish...',
  className,
}: SearchInputProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onChange(val), 300)
    },
    [onChange]
  )

  return (
    <div className={cn('relative', className)}>
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
      <input
        type="text"
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="kas-input pl-9 pr-8"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center mb-4">
          <Icon size={24} className="text-text-muted" />
        </div>
      )}
      <p className="text-base font-medium text-text-primary mb-1">{title}</p>
      {description && (
        <p className="text-sm text-text-secondary max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "O'chirish",
  cancelLabel = 'Bekor qilish',
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative kas-card p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-danger" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
            <p className="text-sm text-text-secondary">{description}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button className="kas-btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className="kas-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Yuklanmoqda...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
