// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'kas_admin'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  todayLeads: number
  todayLeadsTrend: number
  totalUsers: number
  totalUsersTrend: number
  activeChats: number
  activeChatsTrend: number
  totalStores: number
  totalStoresTrend: number
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

// ─── Lead ─────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  chatUserId?: string
  telegramId: string
  username?: string
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
  source: 'telegram_bot'
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

// ─── Chat ─────────────────────────────────────────────────────────────────────

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
  transcript?: string // for voice
  systemEvent?: SystemEventType
  storeName?: string // for store_assigned / lead_created
  timestamp: string
  isRead?: boolean
}

export interface ChatUser {
  id: string
  leadId?: string
  telegramId: string
  username?: string
  fullName: string
  avatar?: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  hasVoice: boolean
  hasLead: boolean
}

export interface ChatFilters extends PaginationParams {
  search?: string
  hasVoice?: boolean
  hasLead?: boolean
}

// ─── Product ──────────────────────────────────────────────────────────────────

export type ProductType = 'fiting' | 'truba' | 'boshqa'

export type ApplicationArea =
  | 'issiq_suv'
  | 'sovuq_suv'
  | 'kanalizatsiya'
  | 'isitish'

export interface Product {
  id: string
  name: string
  sku: string
  category: string
  type: ProductType
  size?: string
  material?: string
  applicationAreas: ApplicationArea[]
  pressureSpec?: string
  temperatureSpec?: string
  description?: string
  imageUrl?: string
  price?: number
  alternatives: Array<{ id: string; name: string }>
  isActive: boolean
  createdAt: string
}

export interface ProductFilters extends PaginationParams {
  search?: string
  category?: string
  type?: ProductType
  active?: boolean
}

// ─── Store ────────────────────────────────────────────────────────────────────

export interface Store {
  id: string
  name: string
  contactPerson: string
  phone: string
  phoneAlt?: string
  address: string
  district: string
  location: {
    lat: number
    lng: number
  }
  workingHours?: {
    from: string
    to: string
  }
  productTypes?: ProductType[]
  telegramId?: string
  leadsCount: number
  isActive: boolean
  createdAt: string
}

export interface StoreFilters extends PaginationParams {
  search?: string
  district?: string
  active?: boolean
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserStatus = 'active' | 'blocked' | 'test'

export interface BotUser {
  id: string
  telegramId: string
  username?: string
  firstName: string
  lastName?: string
  phone?: string
  leadsCount: number
  lastActiveAt: string
  status: UserStatus
  interests: string[]
  createdAt: string
}

export interface UserFilters extends PaginationParams {
  search?: string
  status?: UserStatus
  from?: string
  to?: string
}

// ─── AI Logs ──────────────────────────────────────────────────────────────────

export type AiLogStatus = 'success' | 'error'

export interface AiLog {
  id: string
  userId: string
  userName: string
  question: string
  answer: string
  knowledgeBaseSource?: string
  responseTimeMs: number
  promptTokens: number
  completionTokens: number
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

// ─── AI Settings ─────────────────────────────────────────────────────────────

export interface AiSettings {
  systemPrompt: string
  promptVersions: Array<{
    version: number
    content: string
    createdAt: string
  }>
  logic: {
    locationTrigger: 'after_consultation' | 'always' | 'never'
    leadCreationTrigger: 'after_location' | 'always'
    maxConsultationLength: number
    fallbackResponse: string
  }
  blacklist: {
    words: string[]
    restrictedCategories: string[]
  }
}
