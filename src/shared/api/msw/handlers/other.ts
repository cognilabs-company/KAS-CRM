import { http, HttpResponse } from 'msw'
import { faker } from '@faker-js/faker'
import type {
  ChatUser, ChatMessage, PaginatedResponse,
  Product, Store, BotUser, AiLog, AiLogStats, AiSettings,
  ProductType, ApplicationArea,
} from '@shared/types/api'

// ─── Chats ────────────────────────────────────────────────────────────────────

const LAST_MESSAGES = [
  "Sizga 25 lik PPR truba kerakmi?", "Ha, iltimos", "Lokatsiyangizni yuboring",
  "Isitish tizimi uchun nima kerak?", "Rahmat, magazin telefoni oldim",
  "Ovozli xabar yubordi", "Eng yaqin magazin topildi",
]

function generateChatUser(): ChatUser {
  return {
    id: faker.string.alphanumeric(10),
    telegramId: faker.string.numeric(9),
    username: faker.internet.userName(),
    fullName: `${faker.person.firstName()} ${faker.person.lastName()}`,
    lastMessage: faker.helpers.arrayElement(LAST_MESSAGES),
    lastMessageTime: faker.date.recent({ days: 2 }).toISOString(),
    unreadCount: faker.number.int({ min: 0, max: 8 }),
    hasVoice: faker.datatype.boolean(0.3),
    hasLead: false,
  }
}

export const CHAT_USERS_DB: ChatUser[] = Array.from({ length: 60 }, generateChatUser)
  .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())

function generateMessages(userId: string): ChatMessage[] {
  const msgs: ChatMessage[] = []
  const now = new Date()

  const templates = [
    { type: 'user' as const, content: 'Salom! Menga 20 lik truba kerak' },
    { type: 'bot' as const, content: 'Assalomu alaykum! KAS botiga xush kelibsiz. Issiq yoki sovuq suv tizimi uchunmi?' },
    { type: 'user' as const, content: 'Issiq suv uchun' },
    { type: 'voice' as const, content: '🎤 Ovozli xabar', transcript: '25 lik PPR truba kerak, 10 metr. Narxi qancha?' },
    { type: 'bot' as const, content: 'PPR PN25 truba issiq suv uchun ideal. Bizda 20mm va 25mm variantlar mavjud. Lokatsiyangizni yuborsangiz, eng yaqin magazinni topib beraman.' },
    { type: 'system' as const, content: '📍 Lokatsiya yuborildi', systemEvent: 'location_sent' as const },
    { type: 'bot' as const, content: 'Eng yaqin magazin: KAS Yunusobod. Telefon: +998 71 234 56 78. Manzil: Yunusobod tumani, 19-kvartal.' },
    { type: 'system' as const, content: '✅ Lead yaratildi → KAS Yunusobod', systemEvent: 'lead_created' as const, storeName: 'KAS Yunusobod' },
    { type: 'system' as const, content: '🏪 Magazin biriktirildi', systemEvent: 'store_assigned' as const, storeName: 'KAS Yunusobod' },
    { type: 'user' as const, content: 'Rahmat!' },
    { type: 'bot' as const, content: 'Marhamat! Boshqa savollaringiz bo\'lsa, yozing. KAS bilan qulay xarid!' },
  ]

  templates.forEach((t, i) => {
    const time = new Date(now)
    time.setMinutes(time.getMinutes() - (templates.length - i) * 3)
    msgs.push({
      id: `msg_${userId}_${i}`,
      ...t,
      timestamp: time.toISOString(),
      isRead: true,
    })
  })

  return msgs
}

const CHAT_MESSAGES_DB = new Map<string, ChatMessage[]>(
  CHAT_USERS_DB.map((user) => [user.id, generateMessages(user.id)])
)

function getChatMessages(userId: string): ChatMessage[] {
  const existingMessages = CHAT_MESSAGES_DB.get(userId)
  if (existingMessages) return existingMessages

  const generatedMessages = generateMessages(userId)
  CHAT_MESSAGES_DB.set(userId, generatedMessages)
  return generatedMessages
}

export const chatsHandlers = [
  http.get('/api/v1/chats', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const search = url.searchParams.get('search') ?? ''
    const hasVoice = url.searchParams.get('hasVoice')
    const hasLead = url.searchParams.get('hasLead')

    let filtered = [...CHAT_USERS_DB]
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (u) => u.fullName.toLowerCase().includes(q) || u.username?.includes(q)
      )
    }
    if (hasVoice === 'true') filtered = filtered.filter((u) => u.hasVoice)
    if (hasLead === 'true') filtered = filtered.filter((u) => u.hasLead)

    const total = filtered.length
    const data = filtered.slice((page - 1) * limit, page * limit)
    return HttpResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  }),

  http.get('/api/v1/chats/:userId', ({ params }) => {
    const user = CHAT_USERS_DB.find((chatUser) => chatUser.id === params.userId)
    if (!user) return HttpResponse.json({ message: 'Chat topilmadi' }, { status: 404 })
    return HttpResponse.json(user)
  }),

  http.get('/api/v1/chats/:userId/messages', ({ params }) => {
    const messages = getChatMessages(params.userId as string)
    return HttpResponse.json({ data: messages, hasMore: false })
  }),

  http.post('/api/v1/chats/:userId/send', async ({ params, request }) => {
    const body = (await request.json()) as { content: string }
    const userId = params.userId as string
    const msg: ChatMessage = {
      id: `msg_op_${Date.now()}`,
      type: 'bot',
      content: body.content,
      timestamp: new Date().toISOString(),
      isRead: true,
    }

    const messages = getChatMessages(userId)
    messages.push(msg)

    const chatUser = CHAT_USERS_DB.find((user) => user.id === userId)
    if (chatUser) {
      chatUser.lastMessage = body.content
      chatUser.lastMessageTime = msg.timestamp
    }

    return HttpResponse.json(msg)
  }),
]

// ─── Products ─────────────────────────────────────────────────────────────────

const PRODUCT_NAMES = [
  { name: 'PPR PN20 Truba 20mm', type: 'truba' as ProductType, cat: 'PPR Trubalar' },
  { name: 'PPR PN25 Truba 25mm', type: 'truba' as ProductType, cat: 'PPR Trubalar' },
  { name: 'PPR PN25 Truba 32mm', type: 'truba' as ProductType, cat: 'PPR Trubalar' },
  { name: 'PPR Muftali Fiting 20', type: 'fiting' as ProductType, cat: 'Fitinglar' },
  { name: 'PPR Burchak Fiting 90° 25mm', type: 'fiting' as ProductType, cat: 'Fitinglar' },
  { name: 'PPR T-simon Fiting 20mm', type: 'fiting' as ProductType, cat: 'Fitinglar' },
  { name: 'Kran Sharlisi 1/2"', type: 'boshqa' as ProductType, cat: 'Armatura' },
  { name: 'Kran Sharlisi 3/4"', type: 'boshqa' as ProductType, cat: 'Armatura' },
  { name: 'Kanalizatsiya Trubasi 50mm', type: 'truba' as ProductType, cat: 'Kanalizatsiya' },
  { name: 'Kanalizatsiya Trubasi 110mm', type: 'truba' as ProductType, cat: 'Kanalizatsiya' },
  { name: 'Kanalizatsiya Burchagi 45°', type: 'fiting' as ProductType, cat: 'Kanalizatsiya' },
  { name: 'Metall-Plastik Truba 16mm', type: 'truba' as ProductType, cat: 'Metall-Plastik' },
]

const PRODUCTS_DB: Product[] = PRODUCT_NAMES.map((p, i) => ({
  id: `prod_${i + 1}`,
  name: p.name,
  sku: `KAS-${String(i + 1).padStart(4, '0')}`,
  category: p.cat,
  type: p.type,
  size: p.name.match(/\d+mm|\d+"/) ?.[0],
  material: p.type === 'truba' ? 'Polipropilen' : 'PP-R',
  applicationAreas: (['issiq_suv', 'sovuq_suv'] as ApplicationArea[]).slice(0, faker.number.int({ min: 1, max: 2 })),
  pressureSpec: '25 bar',
  temperatureSpec: '-10°C dan +95°C gacha',
  description: `${p.name} — KAS kompaniyasining sifatli mahsuloti. Barcha standartlarga mos keladi.`,
  price: faker.number.int({ min: 3000, max: 45000 }),
  alternatives: [],
  isActive: faker.datatype.boolean(0.85),
  createdAt: faker.date.past({ years: 1 }).toISOString(),
}))

export const productsHandlers = [
  http.get('/api/v1/products', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const search = url.searchParams.get('search') ?? ''
    const category = url.searchParams.get('category') ?? ''
    const type = url.searchParams.get('type') ?? ''
    const active = url.searchParams.get('active')

    let filtered = [...PRODUCTS_DB]
    if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search))
    if (category) filtered = filtered.filter((p) => p.category === category)
    if (type) filtered = filtered.filter((p) => p.type === type)
    if (active !== null && active !== '') filtered = filtered.filter((p) => p.isActive === (active === 'true'))

    const total = filtered.length
    const data = filtered.slice((page - 1) * limit, page * limit)
    return HttpResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) } as PaginatedResponse<Product>)
  }),

  http.post('/api/v1/products', async ({ request }) => {
    const body = await request.json() as Partial<Product>
    const product: Product = {
      id: `prod_${Date.now()}`,
      name: body.name ?? '',
      sku: body.sku ?? `KAS-${faker.string.numeric(4)}`,
      category: body.category ?? '',
      type: body.type ?? 'boshqa',
      applicationAreas: body.applicationAreas ?? [],
      alternatives: [],
      isActive: body.isActive ?? true,
      createdAt: new Date().toISOString(),
    }
    PRODUCTS_DB.unshift(product)
    return HttpResponse.json(product, { status: 201 })
  }),

  http.put('/api/v1/products/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<Product>
    const idx = PRODUCTS_DB.findIndex((p) => p.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Mahsulot topilmadi' }, { status: 404 })
    PRODUCTS_DB[idx] = { ...PRODUCTS_DB[idx], ...body }
    return HttpResponse.json(PRODUCTS_DB[idx])
  }),

  http.delete('/api/v1/products/:id', ({ params }) => {
    const idx = PRODUCTS_DB.findIndex((p) => p.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Mahsulot topilmadi' }, { status: 404 })
    PRODUCTS_DB.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),
]

// ─── Stores ───────────────────────────────────────────────────────────────────

const DISTRICTS = ['Yunusobod', 'Chilonzor', 'Yakkasaroy', 'Mirzo Ulugbek', 'Shayxontohur', 'Bektemir', 'Uchtepa', 'Olmazor', 'Sergeli']

const STORES_DB: Store[] = DISTRICTS.map((district, i) => ({
  id: `store_${i + 1}`,
  name: `KAS ${district}`,
  contactPerson: `${faker.person.firstName()} ${faker.person.lastName()}`,
  phone: `+998${faker.string.numeric(9)}`,
  address: `${district} tumani, ${faker.number.int({ min: 1, max: 20 })}-kvartal`,
  district,
  location: {
    lat: 41.2995 + faker.number.float({ min: -0.08, max: 0.08, fractionDigits: 4 }),
    lng: 69.2401 + faker.number.float({ min: -0.1, max: 0.1, fractionDigits: 4 }),
  },
  workingHours: { from: '09:00', to: '18:00' },
  leadsCount: faker.number.int({ min: 5, max: 180 }),
  isActive: faker.datatype.boolean(0.9),
  createdAt: faker.date.past({ years: 2 }).toISOString(),
}))

export const storesHandlers = [
  http.get('/api/v1/stores', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const search = url.searchParams.get('search') ?? ''
    const district = url.searchParams.get('district') ?? ''
    const active = url.searchParams.get('active')

    let filtered = [...STORES_DB]
    if (search) filtered = filtered.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.address.toLowerCase().includes(search.toLowerCase()))
    if (district) filtered = filtered.filter((s) => s.district === district)
    if (active !== null && active !== '') filtered = filtered.filter((s) => s.isActive === (active === 'true'))

    return HttpResponse.json({ data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) })
  }),

  http.get('/api/v1/stores/map', () => HttpResponse.json(STORES_DB)),

  http.post('/api/v1/stores', async ({ request }) => {
    const body = await request.json() as Partial<Store>
    const store: Store = {
      id: `store_${Date.now()}`,
      name: body.name ?? '',
      contactPerson: body.contactPerson ?? '',
      phone: body.phone ?? '',
      address: body.address ?? '',
      district: body.district ?? '',
      location: body.location ?? { lat: 41.2995, lng: 69.2401 },
      leadsCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    STORES_DB.push(store)
    return HttpResponse.json(store, { status: 201 })
  }),

  http.put('/api/v1/stores/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<Store>
    const idx = STORES_DB.findIndex((s) => s.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Magazin topilmadi' }, { status: 404 })
    STORES_DB[idx] = { ...STORES_DB[idx], ...body }
    return HttpResponse.json(STORES_DB[idx])
  }),

  http.delete('/api/v1/stores/:id', ({ params }) => {
    const idx = STORES_DB.findIndex((s) => s.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Magazin topilmadi' }, { status: 404 })
    STORES_DB.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),
]

// ─── Users ────────────────────────────────────────────────────────────────────

const USERS_DB: BotUser[] = Array.from({ length: 80 }, (_, i) => ({
  id: `user_${i + 1}`,
  telegramId: faker.string.numeric(9),
  username: faker.internet.userName(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  phone: `+998${faker.string.numeric(9)}`,
  leadsCount: faker.number.int({ min: 0, max: 8 }),
  lastActiveAt: faker.date.recent({ days: 30 }).toISOString(),
  status: faker.helpers.arrayElement(['active', 'active', 'active', 'blocked', 'test']),
  interests: faker.helpers.arrayElements(['PPR', 'Fiting', 'Kran', 'Kanalizatsiya', 'Isitish'], { min: 1, max: 3 }),
  createdAt: faker.date.past({ years: 1 }).toISOString(),
}))

export const usersHandlers = [
  http.get('/api/v1/users', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const search = url.searchParams.get('search') ?? ''
    const status = url.searchParams.get('status') ?? ''

    let filtered = [...USERS_DB]
    if (search) filtered = filtered.filter((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) || u.username?.includes(search) || u.phone?.includes(search))
    if (status) filtered = filtered.filter((u) => u.status === status)

    return HttpResponse.json({ data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) })
  }),

  http.get('/api/v1/users/:id', ({ params }) => {
    const user = USERS_DB.find((u) => u.id === params.id)
    if (!user) return HttpResponse.json({ message: 'Foydalanuvchi topilmadi' }, { status: 404 })
    return HttpResponse.json(user)
  }),

  http.patch('/api/v1/users/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as { status: string }
    const user = USERS_DB.find((u) => u.id === params.id)
    if (!user) return HttpResponse.json({ message: 'Foydalanuvchi topilmadi' }, { status: 404 })
    user.status = body.status as BotUser['status']
    return HttpResponse.json(user)
  }),
]

// ─── AI Logs ──────────────────────────────────────────────────────────────────

const QUESTIONS = [
  "Menga 25 lik truba kerak", "Issiq suv uchun qaysi fiting yaxshi?",
  "Kanalizatsiya uchun 110mm truba bormi?", "PPR va metall-plastik farqi nima?",
  "Kran sharlisi 3/4 narxi qancha?", "Isitish tizimi uchun nima kerak?",
]

const AI_LOGS_DB: AiLog[] = Array.from({ length: 200 }, (_, i) => ({
  id: `log_${i + 1}`,
  userId: `user_${faker.number.int({ min: 1, max: 80 })}`,
  userName: `${faker.person.firstName()} ${faker.person.lastName()}`,
  question: faker.helpers.arrayElement(QUESTIONS),
  answer: 'Bot tomonidan batafsil javob berildi va mahsulot tavsiyalari yuborildi.',
  knowledgeBaseSource: 'products_v2.json',
  responseTimeMs: faker.number.int({ min: 180, max: 2400 }),
  promptTokens: faker.number.int({ min: 200, max: 800 }),
  completionTokens: faker.number.int({ min: 50, max: 400 }),
  status: faker.helpers.arrayElement(['success', 'success', 'success', 'success', 'error']),
  errorMessage: undefined,
  createdAt: faker.date.recent({ days: 30 }).toISOString(),
}))

export const aiLogsHandlers = [
  http.get('/api/v1/ai-logs', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const status = url.searchParams.get('status') ?? ''

    let filtered = [...AI_LOGS_DB]
    if (status) filtered = filtered.filter((l) => l.status === status)

    return HttpResponse.json({ data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) })
  }),

  http.get('/api/v1/ai-logs/stats', () => {
    const stats: AiLogStats = {
      totalRequests: AI_LOGS_DB.length,
      successRate: 82.5,
      avgResponseTime: 640,
      totalTokens: AI_LOGS_DB.reduce((s, l) => s + l.promptTokens + l.completionTokens, 0),
    }
    return HttpResponse.json(stats)
  }),
]

// ─── AI Settings ──────────────────────────────────────────────────────────────

let AI_SETTINGS: AiSettings = {
  systemPrompt: `Siz KAS kompaniyasi uchun sun'iy intellektli sotuv yordamchisisiz.
KAS — Turkiyaning yetakchi fiting va truba distribyutori.

Vazifangiz:
1. Mijozlarga mahsulotlar haqida ma'lumot bering
2. Qisqa texnik konsultatsiya o'tkazing
3. Lokatsiyani so'rang va eng yaqin magazinni toping
4. Lead yarating

Uslub: Samimiy, professional, qisqa va aniq.`,
  promptVersions: [
    { version: 1, content: 'Birinchi versiya...', createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { version: 2, content: 'Ikkinchi versiya...', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  ],
  logic: {
    locationTrigger: 'after_consultation',
    leadCreationTrigger: 'after_location',
    maxConsultationLength: 5,
    fallbackResponse: "Uzr, bu savolga javob bera olmayman. Iltimos, boshqa savol bering yoki +998 71 123 45 67 ga qo'ng'iroq qiling.",
  },
  blacklist: {
    words: ['raqib', 'boshqa kompaniya', 'arzon'],
    restrictedCategories: ['siyosat', 'din'],
  },
}

export const aiSettingsHandlers = [
  http.get('/api/v1/ai-settings', () => HttpResponse.json(AI_SETTINGS)),

  http.put('/api/v1/ai-settings/prompt', async ({ request }) => {
    const body = (await request.json()) as { systemPrompt: string }
    AI_SETTINGS.systemPrompt = body.systemPrompt
    AI_SETTINGS.promptVersions.push({
      version: AI_SETTINGS.promptVersions.length + 1,
      content: body.systemPrompt,
      createdAt: new Date().toISOString(),
    })
    return HttpResponse.json(AI_SETTINGS)
  }),

  http.put('/api/v1/ai-settings/logic', async ({ request }) => {
    const body = (await request.json()) as AiSettings['logic']
    AI_SETTINGS.logic = body
    return HttpResponse.json(AI_SETTINGS)
  }),

  http.put('/api/v1/ai-settings/blacklist', async ({ request }) => {
    const body = (await request.json()) as AiSettings['blacklist']
    AI_SETTINGS.blacklist = body
    return HttpResponse.json(AI_SETTINGS)
  }),
]
