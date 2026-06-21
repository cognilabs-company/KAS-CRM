import { cn } from '@shared/lib/utils'

interface KasLoaderProps {
  overlay?: boolean
  label?: string
  compact?: boolean
}

export function KasLoader({ overlay = false, label = 'Yuklanmoqda', compact = false }: KasLoaderProps) {
  return (
    <div className={cn('kas-loader', overlay && 'kas-loader-overlay', compact && 'kas-loader-compact')} role="status">
      <div className="kas-wordmark" aria-label="KAS">
        <span>K</span><span>A</span><span>S</span><i aria-hidden="true" />
      </div>
      {!compact && <p>{label}</p>}
    </div>
  )
}
