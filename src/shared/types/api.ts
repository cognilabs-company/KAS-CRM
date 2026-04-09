export type UserRole = 'superadmin' | 'admin'

export type AdminPage =
  | 'dashboard'
  | 'leads'
  | 'chats'
  | 'products'
  | 'stores'
  | 'users'
  | 'ai_logs'
  | 'ai_settings'

export interface AuthUser {
  id: string
  email: string
  name: string
  fullName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  availablePages: AdminPage[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface DashboardStats {
  todayLeads: number
  todayLeadsTrend?: number
  totalUsers: number
  totalUsersTrend?: number
  activeChats: number
  activeChatsTrend?: number
  totalStores: number
  totalStoresTrend?: number
}

export interface ChartDataPoint {
  date: string
  value: number
}

export interface RegionData {
  district: string
  leads: number
}

export interface TopProduct {
  id: string
  name: string
  requests: number
  category: string
}

export interface Lead {
  id: string
  chatUserId?: string
  telegramId: string
  userId?: string
  storeId?: string
  username?: string
  firstName?: string
  lastName?: string
  fullName: string
  phone?: string
  location?: {
    lat: number
    lng: number
    address?: string
  }
  nearestStore?: {
    id: string
    name: string
  }
  products: Array<{ id: string; name: string }>
  aiSummary: string
  source: string
  createdAt: string
  updatedAt: string
}

export interface LeadFilters extends PaginationParams {
  search?: string
  store?: string
  product?: string
  district?: string
  from?: string
  to?: string
}

export type MessageType = 'user' | 'bot' | 'voice' | 'system'

export type SystemEventType =
  | 'location_sent'
  | 'lead_created'
  | 'store_assigned'
  | 'notification_sent'

export interface ChatMessage {
  id: string
  type: MessageType
  content: string
  transcript?: string
  systemEvent?: SystemEventType
  timestamp: string
}

export interface ChatUser {
  id: string
  userId: string
  leadId?: string
  telegramId?: string
  username?: string
  firstName?: string
  lastName?: string
  fullName: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  hasVoice: boolean
  hasLead: boolean
  messageCount: number
  startedAt: string
}

export interface ChatFilters extends PaginationParams {
  search?: string
  hasVoice?: boolean
  hasLead?: boolean
  userId?: string
}

export type ProductType = 'fiting' | 'truba' | 'other'

export type ApplicationArea =
  | 'issiq_suv'
  | 'sovuq_suv'
  | 'kanalizatsiya'
  | 'isitish'
  | string

export interface Product {
  id: string
  name: string
  sku: string
  category: string
  type: ProductType
  size?: string
  material?: string
  usageArea?: ApplicationArea
  applicationAreas: ApplicationArea[]
  pressureSpec?: string
  temperatureSpec?: string
  description?: string
  imageUrl?: string
  imageUrls?: string[]
  price?: number
  alternatives: Array<{ id: string; name: string }>
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface ProductFilters extends PaginationParams {
  search?: string
  category?: string
  type?: ProductType
  active?: boolean
}

export interface Store {
  id: string
  name: string
  contactPerson: string
  phone: string
  phoneAlt?: string
  phoneSecondary?: string
  address: string
  district: string
  location: {
    lat: number
    lng: number
  }
  workingHours?: {
    from: string
    to: string
    raw: string
  }
  productTypes?: Partial<Record<ProductType, boolean>>
  telegramId?: string | number
  telegramGroupId?: string | number
  leadsCount: number
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface StoreFilters extends PaginationParams {
  search?: string
  district?: string
  active?: boolean
}

export type UserStatus = 'active' | 'blocked' | 'test'

export interface BotUser {
  id: string
  telegramId: string
  username?: string
  firstName: string
  lastName?: string
  phone?: string
  leadsCount: number
  messageCount: number
  lastActiveAt: string
  status: UserStatus
  interests: string[]
  createdAt: string
  updatedAt?: string
}

export interface UserFilters extends PaginationParams {
  search?: string
  status?: UserStatus
  from?: string
  to?: string
}

export type AiLogStatus = 'success' | 'error'

export interface AiLog {
  id: string
  userId: string
  userName: string
  question: string
  answer?: string
  responseTimeMs: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  modelUsed: string
  status: AiLogStatus
  errorMessage?: string
  createdAt: string
}

export interface AiLogStats {
  totalRequests: number
  successRate: number
  avgResponseTime: number
  totalTokens: number
}

export interface AiLogFilters extends PaginationParams {
  status?: AiLogStatus
  from?: string
  to?: string
  minResponseTime?: number
}

export interface PromptVersion {
  id: string
  version: number
  content: string
  isCurrent: boolean
  createdAt: string
}

export interface AISettingItem {
  id: string
  key: string
  value: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BotWebhookInfo {
  configuredUrl?: string
  telegramUrl?: string
  isRegistered: boolean
  pendingUpdateCount?: number
  lastErrorMessage?: string
  lastErrorAt?: string
  lastSyncErrorAt?: string
  maxConnections?: number
  ipAddress?: string
  allowedUpdates: string[]
  hasCustomCertificate?: boolean
}
