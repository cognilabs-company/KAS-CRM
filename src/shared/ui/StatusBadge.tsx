import { cn } from '@shared/lib/utils'

type StatusVariant = 'active' | 'inactive' | 'new' | 'blocked' | 'test' | 'success' | 'warning' | 'error'

interface StatusBadgeProps {
  variant: StatusVariant
  label?: string
  className?: string
}

const CONFIG: Record<StatusVariant, { label: string; className: string; dot: string }> = {
  active:   { label: 'Aktiv',    className: 'bg-success/10 text-success border-success/20',    dot: 'bg-success' },
  inactive: { label: 'Noaktiv',  className: 'bg-text-muted/10 text-text-muted border-text-muted/20', dot: 'bg-text-muted' },
  new:      { label: 'Yangi',    className: 'bg-primary/10 text-primary border-primary/20',    dot: 'bg-primary' },
  blocked:  { label: 'Bloklangan', className: 'bg-danger/10 text-danger border-danger/20',    dot: 'bg-danger' },
  test:     { label: 'Test',     className: 'bg-warning/10 text-warning border-warning/20',   dot: 'bg-warning' },
  success:  { label: 'Muvaffaqiyat', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  warning:  { label: 'Ogohlantirish', className: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  error:    { label: 'Xatolik',  className: 'bg-danger/10 text-danger border-danger/20',      dot: 'bg-danger' },
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const cfg = CONFIG[variant]
  return (
    <span
      className={cn(
        'kas-badge border',
        cfg.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {label ?? cfg.label}
    </span>
  )
}
