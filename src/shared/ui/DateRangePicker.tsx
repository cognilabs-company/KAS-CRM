import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import type { DashboardPeriod, DashboardRange } from '@shared/api/backend'

const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']
const DAYS_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
const RANGE_DAYS: Record<DashboardRange, number> = { '7d': 7, '30d': 30, '90d': 90 }
const PRESETS: Array<{ value: DashboardRange; label: string }> = [
  { value: '7d', label: '7 kun' }, { value: '30d', label: '30 kun' }, { value: '90d', label: '90 kun' },
]

const isCustom = (value: DashboardPeriod): value is Exclude<DashboardPeriod, DashboardRange> => typeof value === 'object'
const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate())
const addDays = (value: Date, amount: number) => { const next = new Date(value); next.setDate(next.getDate() + amount); return next }
const sameDay = (left: Date, right: Date) => left.getTime() === right.getTime()
const toISODate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const fromISODate = (value: string) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) }
const formatShort = (value: Date) => value.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })

export function DateRangePicker({ value, onChange }: { value: DashboardPeriod; onChange: (value: DashboardPeriod) => void }) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const activeFrom = isCustom(value) ? fromISODate(value.from) : addDays(today, -(RANGE_DAYS[value] - 1))
  const activeTo = isCustom(value) ? fromISODate(value.to) : today
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(activeTo.getFullYear(), activeTo.getMonth(), 1))
  const [draftFrom, setDraftFrom] = useState<Date | null>(activeFrom)
  const [draftTo, setDraftTo] = useState<Date | null>(activeTo)
  const [hovered, setHovered] = useState<Date | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape) }
  }, [open])

  const calendarCells = useMemo(() => {
    const year = visibleMonth.getFullYear(); const month = visibleMonth.getMonth()
    const offset = (new Date(year, month, 1).getDay() + 6) % 7
    const total = new Date(year, month + 1, 0).getDate()
    return [...Array.from({ length: offset }, () => null), ...Array.from({ length: total }, (_, index) => new Date(year, month, index + 1))]
  }, [visibleMonth])

  const openCalendar = () => {
    setDraftFrom(activeFrom); setDraftTo(activeTo); setHovered(null)
    setVisibleMonth(new Date(activeTo.getFullYear(), activeTo.getMonth(), 1)); setOpen((current) => !current)
  }

  const pickDay = (day: Date) => {
    if (!draftFrom || draftTo) { setDraftFrom(day); setDraftTo(null); return }
    if (day < draftFrom) { setDraftTo(draftFrom); setDraftFrom(day) } else setDraftTo(day)
    setHovered(null)
  }

  const previewEnd = draftTo ?? hovered
  const rangeStart = draftFrom && previewEnd && previewEnd < draftFrom ? previewEnd : draftFrom
  const rangeEnd = draftFrom && previewEnd && previewEnd < draftFrom ? draftFrom : previewEnd

  const applyCustom = () => {
    if (!draftFrom || !draftTo) return
    onChange({ from: toISODate(draftFrom), to: toISODate(draftTo) })
    setOpen(false)
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
      <div className="grid grid-cols-3 rounded-xl border border-border bg-surface-2/70 p-1">
        {PRESETS.map((preset) => <button key={preset.value} type="button" aria-pressed={!isCustom(value) && value === preset.value} onClick={() => { onChange(preset.value); setOpen(false) }} className={cn('rounded-lg px-3 py-2.5 text-xs font-semibold transition-all', !isCustom(value) && value === preset.value ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface hover:text-text-primary')}>{preset.label}</button>)}
      </div>

      <div ref={rootRef} className="relative">
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={openCalendar} className={cn('flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 text-left transition-all sm:w-auto', isCustom(value) || open ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/10' : 'border-border bg-surface-2/70 text-text-secondary hover:border-primary/45')}>
          <CalendarDays size={16} /><span className="min-w-0 flex-1 whitespace-nowrap text-xs font-semibold">{isCustom(value) ? `${formatShort(activeFrom)} — ${formatShort(activeTo)}` : 'Maxsus sana'}</span><ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
        </button>

        {open && <div role="dialog" aria-label="Maxsus sana oralig‘ini tanlash" className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(330px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 shadow-[0_22px_60px_rgb(0_0_0/.34)]">
          <div className="mb-3 flex items-center justify-between"><button type="button" aria-label="Oldingi oy" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary"><ChevronLeft size={16} /></button><p className="text-sm font-bold text-text-primary">{MONTHS_UZ[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}</p><button type="button" aria-label="Keyingi oy" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary"><ChevronRight size={16} /></button></div>
          <div className="grid grid-cols-7 gap-1">{DAYS_UZ.map((day) => <span key={day} className="py-1 text-center text-[10px] font-bold text-text-muted">{day}</span>)}{calendarCells.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} />
            const disabled = day > today
            const inside = !!rangeStart && !!rangeEnd && day >= rangeStart && day <= rangeEnd
            const edge = (!!rangeStart && sameDay(day, rangeStart)) || (!!rangeEnd && sameDay(day, rangeEnd))
            return <button key={day.toISOString()} type="button" disabled={disabled} onClick={() => pickDay(day)} onMouseEnter={() => !draftTo && draftFrom && setHovered(day)} className={cn('relative grid aspect-square place-items-center rounded-lg text-xs tabular-nums transition-colors', edge && 'bg-primary font-bold text-white', inside && !edge && 'bg-primary/10 font-medium text-primary', !inside && !disabled && 'text-text-secondary hover:bg-surface-2', disabled && 'cursor-not-allowed text-text-muted/30')}>{day.getDate()}{sameDay(day, today) && !edge && <span className="absolute bottom-1 h-0.5 w-2 rounded-full bg-primary" />}</button>
          })}</div>
          <div className="mt-4 border-t border-border pt-3"><div className="mb-3 flex items-center justify-between text-xs"><span className="text-text-muted">{draftFrom && !draftTo ? 'Tugash sanasini tanlang' : 'Tanlangan davr'}</span><span className="font-bold text-text-primary">{draftFrom ? formatShort(draftFrom) : '—'} — {draftTo ? formatShort(draftTo) : '—'}</span></div><button type="button" disabled={!draftFrom || !draftTo} onClick={applyCustom} className="kas-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-45"><Check size={15} /> Qo‘llash</button></div>
        </div>}
      </div>
    </div>
  )
}
