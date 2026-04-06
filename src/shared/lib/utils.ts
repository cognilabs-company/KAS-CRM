import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isValid, isYesterday, parseISO } from 'date-fns'
import { uz } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function toValidDate(date: string | Date): Date | null {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (isValid(parsed)) return parsed

  const fallback = typeof date === 'string' ? new Date(date) : date
  return isValid(fallback) ? fallback : null
}

export function formatDate(date: string | Date): string {
  const d = toValidDate(date)
  if (!d) return typeof date === 'string' ? date : '-'
  return format(d, 'dd.MM.yyyy')
}

export function formatDateTime(date: string | Date): string {
  const d = toValidDate(date)
  if (!d) return typeof date === 'string' ? date : '-'
  return format(d, 'dd.MM.yyyy HH:mm')
}

export function formatTime(date: string | Date): string {
  const d = toValidDate(date)
  if (!d) return typeof date === 'string' ? date : '-'
  return format(d, 'HH:mm')
}

export function formatRelative(date: string | Date): string {
  const d = toValidDate(date)
  if (!d) return typeof date === 'string' ? date : '-'
  if (isToday(d)) return `Bugun, ${format(d, 'HH:mm')}`
  if (isYesterday(d)) return `Kecha, ${format(d, 'HH:mm')}`
  return formatDistanceToNow(d, { addSuffix: true, locale: uz })
}

export function formatChatDate(date: string | Date): string {
  const d = toValidDate(date)
  if (!d) return typeof date === 'string' ? date : '-'
  if (isToday(d)) return 'Bugun'
  if (isYesterday(d)) return 'Kecha'
  return format(d, 'd MMMM', { locale: uz })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str
}

export function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('998') && digits.length === 12) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
  }
  return phone
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
