import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import type { DashboardRange } from '@shared/api/backend'

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
]
const DAYS_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
const RANGE_DAYS: Record<DashboardRange, number> = { '7d': 7, '30d': 30, '90d': 90 }
const OPTIONS: Array<{ value: DashboardRange; label: string; detail: string }> = [
  { value: '7d', label: '7 kun', detail: 'Oxirgi hafta' },
  { value: '30d', label: '30 kun', detail: 'Oxirgi oy' },
  { value: '90d', label: '90 kun', detail: 'Oxirgi chorak' },
]

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function addDays(value: Date, amount: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + amount)
  return next
}

function sameDay(left: Date, right: Date) {
  return left.getTime() === right.getTime()
}

function formatShort(value: Date) {
  return value.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
}

export function DateRangePicker({ value, onChange }: { value: DashboardRange; onChange: (value: DashboardRange) => void }) {
  const [open, setOpen] = useState(false)
  const today = useMemo(() => startOfDay(new Date()), [])
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedStart = addDays(today, -(RANGE_DAYS[value] - 1))

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const calendarCells = useMemo(() => {
    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const mondayOffset = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return [
      ...Array.from({ length: mondayOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ]
  }, [visibleMonth])

  const changeMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  const selectRange = (next: DashboardRange) => {
    onChange(next)
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex min-h-11 w-full items-center gap-3 rounded-xl border px-3.5 text-left transition-all sm:w-auto',
          open ? 'border-primary bg-primary/10 ring-2 ring-primary/15' : 'border-border bg-surface-2/70 hover:border-primary/45 hover:bg-surface-2'
        )}
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><CalendarDays size={16} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[.12em] text-text-muted">Hisobot davri</span>
          <span className="block whitespace-nowrap text-xs font-semibold text-text-primary">{formatShort(selectedStart)} — {formatShort(today)}</span>
        </span>
        <ChevronDown size={15} className={cn('text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="dialog" aria-label="Hisobot davrini tanlash" className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(330px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 shadow-[0_22px_60px_rgb(0_0_0/.34)]">
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-surface-2/75 p-1">
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={value === option.value}
                title={option.detail}
                onClick={() => selectRange(option.value)}
                className={cn(
                  'flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all',
                  value === option.value ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface hover:text-text-primary'
                )}
              >
                {value === option.value && <Check size={12} />}{option.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Oldingi oy" onClick={() => changeMonth(-1)} className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"><ChevronLeft size={16} /></button>
            <p className="text-sm font-bold text-text-primary">{MONTHS_UZ[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}</p>
            <button type="button" aria-label="Keyingi oy" onClick={() => changeMonth(1)} className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"><ChevronRight size={16} /></button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DAYS_UZ.map((day) => <span key={day} className="py-1 text-center text-[10px] font-bold text-text-muted">{day}</span>)}
            {calendarCells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />
              const inRange = day >= selectedStart && day <= today
              const edge = sameDay(day, selectedStart) || sameDay(day, today)
              const future = day > today
              return (
                <span
                  key={day.toISOString()}
                  className={cn(
                    'relative grid aspect-square place-items-center rounded-lg text-xs tabular-nums',
                    inRange && !edge && 'bg-primary/10 font-medium text-primary',
                    edge && 'bg-primary font-bold text-white shadow-sm',
                    !inRange && !future && 'text-text-secondary',
                    future && 'text-text-muted/40'
                  )}
                >
                  {day.getDate()}
                  {sameDay(day, today) && <span className="absolute bottom-1 h-0.5 w-2 rounded-full bg-white/80" />}
                </span>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-text-muted">Tanlangan davr</span>
            <span className="font-bold text-text-primary">{formatShort(selectedStart)} — {formatShort(today)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
