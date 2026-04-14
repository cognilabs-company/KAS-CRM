import type {
  AISettingItem,
  AdminPage,
  AiLog,
  AiLogStats,
  BotWebhookInfo,
  AuthUser,
  BotUser,
  ChartDataPoint,
  ChatMessage,
  ChatUser,
  DashboardStats,
  Lead,
  PaginatedResponse,
  Product,
  RegionData,
  Store,
  TopProduct,
  UserRole,
} from '@shared/types/api'

const REMOTE_API_ORIGIN =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'https://kas.api.cognilabs.org'

export const API_ORIGIN = import.meta.env.DEV ? '' : REMOTE_API_ORIGIN
export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api/v1` : '/api/v1'
export const MEDIA_BASE_URL =
  import.meta.env.VITE_MEDIA_BASE_URL?.replace(/\/$/, '') ?? REMOTE_API_ORIGIN

export const ACCESS_TOKEN_STORAGE_KEY = 'kas_access_token'
export const REFRESH_TOKEN_STORAGE_KEY = 'kas_refresh_token'

export interface BackendPaginated<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface BackendTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
  role: UserRole
  available_pages: AdminPage[]
}

export interface BackendAdminUserResponse {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  available_pages: AdminPage[]
}

export interface BackendDashboardLeadItem {
  id: string
  telegram_id: number
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  lead_source: string
  store_id?: string | null
  store_name?: string | null
  interested_products: string[]
  ai_summary: string
  created_at: string
}

export interface BackendDashboardStatsResponse {
  today_leads: number
  total_users: number
  active_chats: number
  store_count: number
  leads_by_district: Array<{ district: string; count: number }>
  top_products: Array<{ product_name: string; count: number }>
  leads_by_store: Array<{ store_name: string; count: number }>
  recent_leads: BackendDashboardLeadItem[]
}

export interface BackendLeadsDynamicsResponse {
  days: number
  items: Array<{ date: string; count: number }>
}

export interface BackendTelegramUserListItem {
  id: string
  telegram_id: number
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  status: 'active' | 'blocked' | 'test'
  message_count: number
  leads_count: number
  last_seen: string
  created_at?: string
  updated_at?: string
}

export interface BackendTelegramUserResponse extends BackendTelegramUserListItem {}

export interface BackendStoreListItem {
  id: string
  name: string
  district: string
  address: string
  phone: string
  is_active: boolean
  latitude: number
  longitude: number
  leads_count: number
}

export interface BackendStoreResponse extends BackendStoreListItem {
  responsible_person: string
  phone_secondary?: string | null
  working_hours?: string | null
  telegram_id?: number | null
  telegram_group_id?: number | null
  product_types: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface BackendLeadListItem {
  id: string
  telegram_id: number
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  lead_source: string
  store_id?: string | null
  store_name?: string | null
  interested_products: string[]
  ai_summary: string
  created_at: string
}

export interface BackendLeadResponse {
  telegram_id: number
  username?: string | null
  phone?: string | null
  location_lat?: number | null
  location_lon?: number | null
  interested_products: string[]
  ai_summary: string
  lead_source: string
  user_id: string
  store_id?: string | null
  id: string
  user?: BackendTelegramUserListItem
  store?: BackendStoreListItem
  created_at: string
  updated_at: string
}

export interface BackendChatListItem {
  id: string
  user_id: string
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  lead_id?: string | null
  last_message_at: string
  last_message_preview: string
  message_count: number
  has_voice?: boolean
  has_lead?: boolean
  started_at: string
}

export interface BackendChatMediaItem {
  url: string
  kind: 'image' | 'audio'
  filename?: string | null
  extension?: string | null
}

export interface BackendChatMessageResponse {
  role: 'user' | 'bot' | 'operator' | 'system'
  content: string
  message_type: 'text' | 'voice' | 'location' | 'event'
  voice_transcript?: string | null
  event_type?:
    | 'location_sent'
    | 'lead_created'
    | 'store_assigned'
    | 'notification_sent'
    | 'voice_deferred'
    | 'photo_shared'
    | null
  media_urls?: string[]
  has_media?: boolean
  media_items?: BackendChatMediaItem[]
  chat_id: string
  id: string
  timestamp: string
}

export interface BackendChatResponse {
  user_id: string
  lead_id?: string | null
  id: string
  user: BackendTelegramUserListItem
  messages: BackendChatMessageResponse[]
  started_at: string
  last_message_at: string
}

export interface BackendProductAlternative {
  id: string
  name: string
  sku: string
  product_type: string
  size?: string | null
}

export interface BackendProductListItem {
  id: string
  name: string
  sku: string
  category: string
  product_type: 'fiting' | 'truba' | 'other'
  size?: string | null
  price?: string | null
  is_active: boolean
  image_urls: string[]
}

export interface BackendProductResponse extends BackendProductListItem {
  description?: string | null
  usage_area?: string | null
  material?: string | null
  pressure_rating?: string | null
  temperature_rating?: string | null
  alternatives: BackendProductAlternative[]
  created_at: string
  updated_at: string
}

export interface BackendAiSettingResponse {
  key: string
  value: string
  description?: string | null
  is_active: boolean
  id: string
  created_at: string
  updated_at: string
}

export interface BackendPromptVersionResponse {
  id: string
  version: number
  content: string
  is_current: boolean
  created_at: string
}

export interface BackendAiLogListItem {
  id: string
  model_used: string
  tokens_used: number
  response_time_ms: number
  is_error: boolean
  created_at: string
  user_id: string
  user_name: string
  prompt_preview: string
}

export interface BackendAiLogResponse extends BackendAiLogListItem {
  chat_message_id?: string | null
  prompt_used: string
  response: string
  error_message?: string | null
}

export interface BackendMessageResponse {
  message: string
}

export interface BackendNearestStoreResponse extends BackendStoreListItem {
  distance_km: number
}

export interface BackendAiLogStatsResponse {
  total_queries: number
  success_rate: number
  avg_response_time_ms: number
  total_tokens: number
}

export type BackendWebhookInfoResponse = Record<string, unknown>

export function clearStoredAuth() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
}

export function normalizeAdminAvailablePages(role: UserRole, pages: AdminPage[] = []): AdminPage[] {
  if (role !== 'admin' && role !== 'superadmin') return pages

  const adminPages = role === 'admin' ? pages.filter((page) => page !== 'ai_logs') : pages
  return adminPages.includes('users') ? adminPages : [...adminPages, 'users']
}

export function buildAbsoluteMediaUrl(url?: string | null) {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export function normalizePaginated<TSource, TMapped>(
  response: BackendPaginated<TSource>,
  mapper: (item: TSource) => TMapped
): PaginatedResponse<TMapped> {
  return {
    data: response.items.map(mapper),
    total: response.total,
    page: response.page,
    limit: response.size,
    totalPages: response.pages,
  }
}

function buildFullName(firstName?: string | null, lastName?: string | null, username?: string | null) {
  const parts = [firstName, lastName].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  return username ? `@${username}` : 'Noma’lum foydalanuvchi'
}

function splitWorkingHours(raw?: string | null) {
  if (!raw) return undefined
  const [from = '', to = ''] = raw.split('-')
  return { from, to, raw }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

function pickNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return undefined
}

function pickBoolean(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') return value
  }
  return undefined
}

function pickStringArray(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string')
    }
  }
  return []
}

function toWebhookDate(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return new Date(value * 1000).toISOString()
  }
  return undefined
}

export function mapAdminUser(response: BackendAdminUserResponse): AuthUser {
  return {
    id: response.id,
    email: response.email,
    name: response.full_name,
    fullName: response.full_name,
    role: response.role,
    isActive: response.is_active,
    createdAt: response.created_at,
    availablePages: normalizeAdminAvailablePages(response.role, response.available_pages),
  }
}

export function mapDashboardStats(response: BackendDashboardStatsResponse): DashboardStats {
  return {
    todayLeads: response.today_leads,
    totalUsers: response.total_users,
    activeChats: response.active_chats,
    totalStores: response.store_count,
  }
}

export function mapLeadsDynamics(response: BackendLeadsDynamicsResponse): ChartDataPoint[] {
  return response.items.map((item) => ({
    date: item.date,
    value: item.count,
  }))
}

export function mapRegionData(
  items: BackendDashboardStatsResponse['leads_by_district']
): RegionData[] {
  return items.map((item) => ({
    district: item.district,
    leads: item.count,
  }))
}

export function mapTopProducts(
  items: BackendDashboardStatsResponse['top_products']
): TopProduct[] {
  return items.map((item, index) => ({
    id: `${index}-${item.product_name}`,
    name: item.product_name,
    requests: item.count,
    category: 'backend',
  }))
}

export function mapLeadListItem(item: BackendLeadListItem | BackendDashboardLeadItem): Lead {
  const firstName = item.first_name ?? undefined
  const lastName = item.last_name ?? undefined
  const userId = 'user_id' in item ? (item as BackendLeadResponse).user_id : undefined
  return {
    id: item.id,
    telegramId: String(item.telegram_id),
    userId,
    storeId: item.store_id ?? undefined,
    username: item.username ?? undefined,
    firstName,
    lastName,
    fullName: buildFullName(firstName, lastName, item.username),
    phone: item.phone ?? undefined,
    products: item.interested_products.map((productName, index) => ({
      id: `${item.id}-product-${index}`,
      name: productName,
    })),
    aiSummary: item.ai_summary,
    source: item.lead_source,
    nearestStore: item.store_name
      ? {
          id: item.store_id ?? item.store_name,
          name: item.store_name,
        }
      : undefined,
    createdAt: item.created_at,
    updatedAt: item.created_at,
  }
}

export function mapLeadResponse(item: BackendLeadResponse): Lead {
  const fullName = buildFullName(item.user?.first_name, item.user?.last_name, item.username)
  return {
    id: item.id,
    telegramId: String(item.telegram_id),
    userId: item.user_id,
    storeId: item.store_id ?? undefined,
    username: item.username ?? undefined,
    firstName: item.user?.first_name ?? undefined,
    lastName: item.user?.last_name ?? undefined,
    fullName,
    phone: item.phone ?? item.user?.phone ?? undefined,
    location:
      item.location_lat != null && item.location_lon != null
        ? {
            lat: item.location_lat,
            lng: item.location_lon,
          }
        : undefined,
    nearestStore: item.store
      ? {
          id: item.store.id,
          name: item.store.name,
        }
      : undefined,
    products: item.interested_products.map((productName, index) => ({
      id: `${item.id}-product-${index}`,
      name: productName,
    })),
    aiSummary: item.ai_summary,
    source: item.lead_source,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export function mapChatListItem(item: BackendChatListItem): ChatUser {
  return {
    id: item.id,
    userId: item.user_id,
    leadId: item.lead_id ?? undefined,
    username: item.username ?? undefined,
    firstName: item.first_name ?? undefined,
    lastName: item.last_name ?? undefined,
    fullName: buildFullName(item.first_name, item.last_name, item.username),
    lastMessage: item.last_message_preview,
    lastMessageTime: item.last_message_at,
    unreadCount: 0,
    hasVoice: item.has_voice ?? false,
    hasLead: item.has_lead ?? Boolean(item.lead_id),
    messageCount: item.message_count,
    startedAt: item.started_at,
  }
}

export function mapChatMessage(item: BackendChatMessageResponse): ChatMessage {
  const rawMediaItems =
    item.media_items && item.media_items.length > 0
      ? item.media_items
      : (item.media_urls ?? []).map((url) => {
          const extension = url.match(/\.[a-z0-9]+(?:$|\?)/i)?.[0].replace(/\?$/, '') ?? ''
          return {
            url,
            kind: item.message_type === 'voice' ? 'audio' : 'image',
            filename: url.split('/').pop() ?? undefined,
            extension,
          } satisfies BackendChatMediaItem
        })

  const mediaItems = rawMediaItems.map((mediaItem) => ({
    url: mediaItem.url,
    kind: mediaItem.kind,
    filename: mediaItem.filename ?? undefined,
    extension: mediaItem.extension ?? undefined,
  }))

  return {
    id: item.id,
    type:
      item.message_type === 'voice'
        ? 'voice'
        : item.role === 'system'
          ? 'system'
          : item.role === 'bot' || item.role === 'operator'
            ? 'bot'
            : 'user',
    content: item.content,
    transcript: item.voice_transcript ?? undefined,
    systemEvent: item.event_type ?? undefined,
    mediaItems,
    hasMedia: Boolean(item.has_media || mediaItems.length > 0),
    timestamp: item.timestamp,
  }
}

export function mapProductListItem(item: BackendProductListItem): Product {
  const imageUrls = item.image_urls.map((url) => buildAbsoluteMediaUrl(url) ?? url)
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    type: item.product_type,
    size: item.size ?? undefined,
    applicationAreas: [],
    imageUrl: imageUrls[0],
    imageUrls,
    price: item.price ? Number(item.price) : undefined,
    alternatives: [],
    isActive: item.is_active,
    createdAt: '',
  }
}

export function mapProductResponse(item: BackendProductResponse): Product {
  const product = mapProductListItem(item)
  return {
    ...product,
    usageArea: item.usage_area ?? undefined,
    applicationAreas: item.usage_area ? [item.usage_area] : [],
    material: item.material ?? undefined,
    pressureSpec: item.pressure_rating ?? undefined,
    temperatureSpec: item.temperature_rating ?? undefined,
    description: item.description ?? undefined,
    alternatives: item.alternatives.map((alternative) => ({
      id: alternative.id,
      name: alternative.name,
    })),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export function mapStoreListItem(item: BackendStoreListItem): Store {
  return {
    id: item.id,
    name: item.name,
    contactPerson: 'Ko‘rsatilmagan',
    phone: item.phone,
    address: item.address,
    district: item.district,
    location: {
      lat: item.latitude,
      lng: item.longitude,
    },
    leadsCount: item.leads_count,
    isActive: item.is_active,
    createdAt: '',
  }
}

export function mapStoreResponse(item: BackendStoreResponse): Store {
  const store = mapStoreListItem(item)
  return {
    ...store,
    contactPerson: item.responsible_person,
    phoneSecondary: item.phone_secondary ?? undefined,
    phoneAlt: item.phone_secondary ?? undefined,
    workingHours: splitWorkingHours(item.working_hours),
    productTypes: item.product_types,
    telegramId: item.telegram_id ?? undefined,
    telegramGroupId: item.telegram_group_id ?? undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export function mapTelegramUser(item: BackendTelegramUserListItem): BotUser {
  return {
    id: item.id,
    telegramId: String(item.telegram_id),
    username: item.username ?? undefined,
    firstName: item.first_name ?? '',
    lastName: item.last_name ?? undefined,
    phone: item.phone ?? undefined,
    leadsCount: item.leads_count,
    messageCount: item.message_count,
    lastActiveAt: item.last_seen,
    status: item.status,
    interests: [],
    createdAt: item.created_at ?? item.last_seen,
    updatedAt: item.updated_at ?? undefined,
  }
}

export function mapAiLog(item: BackendAiLogListItem | BackendAiLogResponse): AiLog {
  const responseText = 'response' in item ? item.response : undefined
  const errorMessage = 'error_message' in item ? item.error_message ?? undefined : undefined
  const promptUsed = 'prompt_used' in item ? item.prompt_used : item.prompt_preview
  return {
    id: item.id,
    userId: item.user_id,
    userName: item.user_name,
    question: promptUsed,
    answer: responseText,
    responseTimeMs: item.response_time_ms,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: item.tokens_used,
    modelUsed: item.model_used,
    status: item.is_error ? 'error' : 'success',
    errorMessage,
    createdAt: item.created_at,
  }
}

export function mapAiLogStats(item: BackendAiLogStatsResponse): AiLogStats {
  return {
    totalRequests: item.total_queries,
    successRate: item.success_rate,
    avgResponseTime: item.avg_response_time_ms,
    totalTokens: item.total_tokens,
  }
}

export function mapAiSetting(item: BackendAiSettingResponse): AISettingItem {
  return {
    id: item.id,
    key: item.key,
    value: item.value,
    description: item.description ?? undefined,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export function mapBotWebhookInfo(payload: BackendWebhookInfoResponse): BotWebhookInfo {
  const root = isRecord(payload) ? payload : {}
  const telegramPayload = isRecord(root.telegram)
    ? root.telegram
    : isRecord(root.telegram_info)
      ? root.telegram_info
      : isRecord(root.result)
        ? root.result
        : root

  const configuredUrl =
    pickString(root, ['configured_webhook_url', 'configured_url', 'app_webhook_url']) ??
    pickString(telegramPayload, ['configured_webhook_url', 'configured_url', 'app_webhook_url'])

  const telegramUrl =
    pickString(telegramPayload, ['url', 'telegram_webhook_url', 'telegram_url', 'webhook_url']) ??
    pickString(root, ['telegram_webhook_url', 'telegram_url'])
  const telegramAllowedUpdates = pickStringArray(telegramPayload, ['allowed_updates'])

  return {
    configuredUrl,
    telegramUrl,
    isRegistered: Boolean(telegramUrl),
    pendingUpdateCount:
      pickNumber(telegramPayload, ['pending_update_count', 'pending_updates']) ??
      pickNumber(root, ['pending_update_count', 'pending_updates']),
    lastErrorMessage:
      pickString(telegramPayload, ['last_error_message']) ??
      pickString(root, ['last_error_message']),
    lastErrorAt:
      toWebhookDate(telegramPayload.last_error_date) ?? toWebhookDate(root.last_error_date),
    lastSyncErrorAt:
      toWebhookDate(telegramPayload.last_synchronization_error_date) ??
      toWebhookDate(root.last_synchronization_error_date),
    maxConnections:
      pickNumber(telegramPayload, ['max_connections']) ??
      pickNumber(root, ['max_connections']),
    ipAddress:
      pickString(telegramPayload, ['ip_address']) ?? pickString(root, ['ip_address']),
    allowedUpdates:
      telegramAllowedUpdates.length > 0
        ? telegramAllowedUpdates
        : pickStringArray(root, ['allowed_updates']),
    hasCustomCertificate:
      pickBoolean(telegramPayload, ['has_custom_certificate']) ??
      pickBoolean(root, ['has_custom_certificate']),
  }
}
