import { CalendarDays } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import type { DashboardRange } from '@shared/api/backend'

const OPTIONS: Array<{ value: DashboardRange; label: string; detail: string }> = [
  { value: '7d', label: '7 kun', detail: 'Hafta' },
  { value: '30d', label: '30 kun', detail: 'Oy' },
  { value: '90d', label: '90 kun', detail: 'Chorak' },
]

export function DateRangePicker({ value, onChange }: { value: DashboardRange; onChange: (value: DashboardRange) => void }) {
  return (
    <div className="inline-flex w-full items-center gap-1 rounded-xl border border-border bg-surface-2/70 p-1 sm:w-auto" aria-label="Hisobot davri">
      <span className="hidden px-2 text-text-muted sm:inline-flex"><CalendarDays size={16} /></span>
      {OPTIONS.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:flex-none', value === option.value ? 'bg-surface text-text-primary shadow-sm ring-1 ring-border' : 'text-text-muted hover:text-text-primary')} title={option.detail}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
