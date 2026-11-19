// "Aksiya 2026" promotion: backend contract (KAS app/schemas/aksiya.py) and small helpers.
// Endpoints live under /api/v1/admin/aksiya; paths below are relative to API_BASE_URL.
import { ACCESS_TOKEN_STORAGE_KEY, API_ORIGIN, buildAbsoluteMediaUrl } from '@shared/api/backend'

export const AKSIYA_BASE = '/admin/aksiya'

export type AksiyaStatus = 'pending' | 'approved' | 'rejected'
export type AksiyaConsumerType = 'usta' | 'owner'
export type AksiyaPeriod = 'disabled' | 'not_started' | 'active' | 'ended'
export type AksiyaBlockType = 'video' | 'photo' | 'text'

export interface AksiyaNumber {
  number: number
  display: string
}

// Another active (pending/approved) application that contains the same Telegram file.
export interface AksiyaDuplicateRef {
  application_id: string
  full_name: string
  status: AksiyaStatus | string
  created_at: string | null
  // true: the other application used this file first, so this one is the copy.
  earlier: boolean
}

export function isCopy(refs?: AksiyaDuplicateRef[] | null) {
  return Boolean(refs?.some((ref) => ref.earlier))
}

export interface AksiyaFile {
  index: number
  kind: 'photo' | 'document' | string
  file_name: string | null
  mime_type: string | null
  size: number | null
  available: boolean
  url: string | null
  duplicate_of: AksiyaDuplicateRef[]
}

export interface AksiyaVideo {
  mime_type: string | null
  size: number | null
  available: boolean
  url: string | null
  duplicate_of: AksiyaDuplicateRef[]
}

export interface AksiyaApplicationListItem {
  id: string
  telegram_id: number
  full_name: string
  phone: string | null
  consumer_type: AksiyaConsumerType | null
  region: string | null
  region_name: string | null
  location: string | null
  store_id: string | null
  store_name: string | null
  amount_text: string | null
  claimed_amount: number | null
  confirmed_amount: number | null
  status: AksiyaStatus
  numbers: AksiyaNumber[]
  files_count: number
  has_video: boolean
  has_duplicates: boolean
  annulled_at: string | null
  created_at: string
  reviewed_at: string | null
}

// Cumulative totals for the participant (same telegram_id): numbers are issued on the total
// approved amount and the remainder carries over to the next application.
export interface AksiyaParticipantSummary {
  approved_amount: number
  numbers_total: number
  amount_per_number: number
  earned: number
  remainder: number
  to_next: number
  missing: number
}

export interface AksiyaReconcileResponse {
  telegram_id: number
  issued_numbers: AksiyaNumber[]
  participant: AksiyaParticipantSummary
  notified: boolean
}

export interface AksiyaAnnulResponse {
  application: AksiyaApplicationDetail
  removed_numbers: AksiyaNumber[]
  reissued_numbers: AksiyaNumber[]
  notified: boolean
}

export interface AksiyaApplicationDetail extends AksiyaApplicationListItem {
  files: AksiyaFile[]
  video: AksiyaVideo | null
  consent_at: string | null
  reject_reason: string | null
  note: string | null
  reviewed_by_id: string | null
  reviewed_by_name: string | null
  participant: AksiyaParticipantSummary
  notified_at: string | null
  username: string | null
}

export interface AksiyaReviewResponse {
  application: AksiyaApplicationDetail
  issued_numbers: AksiyaNumber[]
  notified: boolean
}

export interface AksiyaStats {
  pending: number
  approved: number
  rejected: number
  total_applications: number
  total_numbers: number
  participants: number
  confirmed_amount_total: number
  period: AksiyaPeriod
}

export interface AksiyaRegion {
  code: string
  name_uz: string
  name_ru: string
}

export interface AksiyaStoreOption {
  id: string
  name: string
  district: string | null
}

export interface AksiyaMeta {
  regions: AksiyaRegion[]
  stores: AksiyaStoreOption[]
}

export interface AksiyaNumberListItem {
  number: number
  display: string
  application_id: string
  full_name: string
  phone: string | null
  location: string | null
  store_name: string | null
  consumer_type: AksiyaConsumerType | null
  issued_at: string
}

export interface AksiyaWinnerInput {
  place: number
  /** Display text («2026-0007») or the plain internal number. */
  number: number | string
  prize: string
}

export interface AksiyaWinner {
  place: number
  number: number
  prize: string
  display: string
  full_name: string | null
  phone: string | null
}

export interface AksiyaSettings {
  is_enabled: boolean
  start_date: string | null
  end_date: string | null
  amount_per_number: number
  rules_text_uz: string | null
  rules_text_ru: string | null
  rules_file_name: string | null
  rules_file_url: string | null
  winners: AksiyaWinner[]
  winners_published: boolean
  period: AksiyaPeriod
  today: string
  visibility: AksiyaVisibility
  visible_users: AksiyaVisibleUser[]
  number_template: string
  next_number_display: string
  next_counter: number
  number_formats: AksiyaNumberFormat[]
}

export interface AksiyaNumberFormat {
  template: string
  from_number: number
  first_display: string
  last_display: string | null
  count: number
  is_current: boolean
}

/** Same rendering as the backend: the «#» run is the zero-padded counter. */
export function renderNumberTemplate(template: string, counter: number) {
  const match = /^([^#]*)(#{1,8})([^#]*)$/.exec(template.trim())
  if (!match) return null
  return `${match[1]}${String(counter).padStart(match[2].length, '0')}${match[3]}`
}

/** Comparison key for typed numbers: spaces removed, case-insensitive. */
export function numberKey(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
}

export type AksiyaVisibility = 'all' | 'selected'

export interface AksiyaVisibleUser {
  telegram_id: number
  first_name: string | null
  last_name: string | null
  username: string | null
  phone: string | null
  known: boolean
}

export function telegramUserName(user: AksiyaVisibleUser) {
  const name = [user.first_name, user.last_name].filter((part) => part && part.trim() && part.trim() !== '.').join(' ')
  return name || (user.username ? `@${user.username}` : user.known ? 'Ismsiz foydalanuvchi' : "Botga hali yozmagan")
}

export type AksiyaSettingsPatch = Partial<{
  is_enabled: boolean
  start_date: string | null
  end_date: string | null
  amount_per_number: number
  rules_text_uz: string | null
  rules_text_ru: string | null
  visibility: AksiyaVisibility
  visible_telegram_ids: number[]
}>

export interface AksiyaContentBlock {
  id: string
  position: number
  block_type: AksiyaBlockType
  media_path: string | null
  media_url: string | null
  text_uz: string | null
  text_ru: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface AksiyaContentList {
  items: AksiyaContentBlock[]
}

// Telegram limits: media caption 1024, plain message 4096.
export const CAPTION_LIMIT = 1024
export const TEXT_LIMIT = 4096

export const MULTIPART_HEADERS = { 'Content-Type': 'multipart/form-data' }

export const STATUS_LABELS: Record<AksiyaStatus, string> = {
  pending: 'Tekshirilmoqda',
  approved: 'Tasdiqlandi',
  rejected: 'Rad etildi',
}

export function statusLabel(status: string) {
  return STATUS_LABELS[status as AksiyaStatus] ?? status
}

export const STATUS_BADGE: Record<AksiyaStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
}

export const CONSUMER_TYPE_LABELS: Record<AksiyaConsumerType, string> = {
  usta: 'Usta (santexnik)',
  owner: 'Uy / obyekt egasi',
}

export const PERIOD_LABELS: Record<AksiyaPeriod, string> = {
  disabled: "O'chirilgan",
  not_started: 'Hali boshlanmagan',
  active: 'Faol',
  ended: 'Yakunlangan',
}

export const PERIOD_TONE: Record<AksiyaPeriod, string> = {
  disabled: 'bg-text-muted/10 text-text-muted border-text-muted/20',
  not_started: 'bg-warning/10 text-warning border-warning/20',
  active: 'bg-success/10 text-success border-success/20',
  ended: 'bg-primary/10 text-primary border-primary/20',
}

export function consumerTypeLabel(value: AksiyaConsumerType | null | undefined) {
  return value ? CONSUMER_TYPE_LABELS[value] ?? value : '—'
}

export function groupDigits(value: number | string) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// "20 000 000 so'm"
export function formatSom(amount: number | null | undefined) {
  if (amount == null) return '—'
  return `${groupDigits(Math.round(amount))} so'm`
}

// Keeps only digits; used by the thousand-separated amount inputs.
export function parseDigits(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits ? Number(digits) : null
}

const TASHKENT_DATE_TIME = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Asia/Tashkent',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// Timestamps from the backend shown in Tashkent time: "05.03.2026, 14:20".
export function formatTashkent(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return TASHKENT_DATE_TIME.format(date)
}

// Plain dates (YYYY-MM-DD) as dd.MM.yyyy, no timezone shift.
export function formatPlainDate(value: string | null | undefined) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}.${month}.${year}` : value
}

export function formatBytes(size: number | null | undefined) {
  if (size == null) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

// Application files/video come as absolute API paths (/api/v1/admin/aksiya/...) that need the
// admin JWT. <img>/<video>/<a> cannot send headers, so the token goes in ?token= (the backend
// accepts it on these routes). The token is read at render time so a refreshed one is used.
export function buildPrivateFileUrl(url: string | null | undefined, download = false) {
  if (!url) return undefined
  const params = new URLSearchParams()
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  if (token) params.set('token', token)
  if (download) params.set('download', 'true')
  const base = /^https?:\/\//i.test(url) ? url : `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
  const query = params.toString()
  return query ? `${base}${base.includes('?') ? '&' : '?'}${query}` : base
}

// Rules file and content media are public /media paths.
export const buildPublicMediaUrl = buildAbsoluteMediaUrl

export const aksiyaKeys = {
  all: ['aksiya'] as const,
  stats: ['aksiya', 'stats'] as const,
  applications: ['aksiya', 'applications'] as const,
  application: (id: string | null) => ['aksiya', 'application', id] as const,
  numbers: ['aksiya', 'numbers'] as const,
  settings: ['aksiya', 'settings'] as const,
  meta: ['aksiya', 'meta'] as const,
  content: ['aksiya', 'content'] as const,
}
