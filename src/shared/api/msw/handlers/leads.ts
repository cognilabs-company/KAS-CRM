import { http, HttpResponse } from 'msw'
import { faker } from '@faker-js/faker'
import type { Lead, PaginatedResponse } from '@shared/types/api'
import { CHAT_USERS_DB } from './other'

const UZ_NAMES = [
  'Jasur Toshmatov', 'Dilnoza Yusupova', 'Bobur Karimov',
  'Shahlo Xasanova', 'Nodir Rahimov', 'Zulfiya Mamadaliyeva',
  'Sardor Ergashev', 'Hulkar Nazarova', 'Ulugbek Qodirov',
  'Maftuna Abdullayeva', 'Behruz Ismoilov', 'Nasiba Tursunova',
  'Eldor Xolmatov', 'Sitora Jurayeva', 'Mirzo Begmatov',
]

const PRODUCTS = [
  { id: 'p1', name: 'PPR Truba 20mm' },
  { id: 'p2', name: 'PPR Truba 25mm' },
  { id: 'p3', name: 'Muftali fiting 20' },
  { id: 'p4', name: 'Burchak fiting 90°' },
  { id: 'p5', name: 'Kran sharlisi 1/2"' },
  { id: 'p6', name: 'Kanalizatsiya trubasi 110mm' },
]

const STORES = [
  { id: 's1', name: 'KAS Yunusobod' },
  { id: 's2', name: 'KAS Chilonzor' },
  { id: 's3', name: 'KAS Yakkasaroy' },
  { id: 's4', name: 'KAS Mirzo Ulugbek' },
  { id: 's5', name: 'KAS Uchtepa' },
]

const AI_SUMMARIES = [
  "Mijoz PPR trubalar haqida so'radi. Issiq suv tizimi uchun 20mm va 25mm trubalar kerak. Lokatsiya yubordi, eng yaqin magazin belgilandi.",
  "Foydalanuvchi kanalizatsiya trubalari bo'yicha konsultatsiya oldi. 110mm diametrli truba qidirmoqda.",
  "Isitish tizimi uchun fiting so'radi. Bot 3 ta alternativ tavsiya qildi. Lead yaratildi.",
  "Kran sharlisi va burchak fiting haqida savol berdi. Montaj uchun to'liq komplekt kerak.",
]

function generateLead(): Lead {
  const linkedChatUser = faker.helpers.arrayElement(CHAT_USERS_DB)
  const name = linkedChatUser.fullName || faker.helpers.arrayElement(UZ_NAMES)
  const numProducts = faker.number.int({ min: 1, max: 3 })
  const leadId = `lead_${faker.string.alphanumeric(8)}`

  if (!linkedChatUser.leadId) {
    linkedChatUser.hasLead = true
    linkedChatUser.leadId = leadId
  }

  return {
    id: leadId,
    chatUserId: linkedChatUser.id,
    telegramId: linkedChatUser.telegramId,
    username: linkedChatUser.username,
    fullName: name,
    phone: `+998${faker.string.numeric(9)}`,
    location: {
      lat: 41.2 + faker.number.float({ min: 0, max: 0.2, fractionDigits: 4 }),
      lng: 69.2 + faker.number.float({ min: 0, max: 0.2, fractionDigits: 4 }),
      address: `${faker.helpers.arrayElement(['Yunusobod', 'Chilonzor', 'Yakkasaroy'])} tumani`,
    },
    nearestStore: faker.helpers.arrayElement(STORES),
    products: faker.helpers.arrayElements(PRODUCTS, numProducts),
    aiSummary: faker.helpers.arrayElement(AI_SUMMARIES),
    source: 'telegram_bot',
    createdAt: faker.date.recent({ days: 30 }).toISOString(),
    updatedAt: faker.date.recent({ days: 5 }).toISOString(),
  }
}

function generateLeadFromChatUser(index: number): Lead {
  const chatUser = CHAT_USERS_DB[index]
  const numProducts = faker.number.int({ min: 1, max: 3 })
  const leadId = `lead_${faker.string.alphanumeric(8)}`

  chatUser.hasLead = true
  chatUser.leadId = leadId

  return {
    id: leadId,
    chatUserId: chatUser.id,
    telegramId: chatUser.telegramId,
    username: chatUser.username,
    fullName: chatUser.fullName,
    phone: `+998${faker.string.numeric(9)}`,
    location: {
      lat: 41.2 + faker.number.float({ min: 0, max: 0.2, fractionDigits: 4 }),
      lng: 69.2 + faker.number.float({ min: 0, max: 0.2, fractionDigits: 4 }),
      address: `${faker.helpers.arrayElement(['Yunusobod', 'Chilonzor', 'Yakkasaroy'])} tumani`,
    },
    nearestStore: faker.helpers.arrayElement(STORES),
    products: faker.helpers.arrayElements(PRODUCTS, numProducts),
    aiSummary: faker.helpers.arrayElement(AI_SUMMARIES),
    source: 'telegram_bot',
    createdAt: chatUser.lastMessageTime,
    updatedAt: chatUser.lastMessageTime,
  }
}

// Generate stable dataset
const LINKED_LEADS_COUNT = 35

const LEADS_DB: Lead[] = [
  ...Array.from({ length: LINKED_LEADS_COUNT }, (_, index) => generateLeadFromChatUser(index)),
  ...Array.from({ length: 115 }, generateLead),
]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

export const leadsHandlers = [
  http.get('/api/v1/leads', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const search = url.searchParams.get('search') ?? ''
    const store = url.searchParams.get('store') ?? ''
    const district = url.searchParams.get('district') ?? ''

    let filtered = [...LEADS_DB]

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.fullName.toLowerCase().includes(q) ||
          l.username?.toLowerCase().includes(q) ||
          l.phone?.includes(q)
      )
    }
    if (store) filtered = filtered.filter((l) => l.nearestStore?.id === store)
    if (district) {
      filtered = filtered.filter((l) =>
        l.location?.address?.toLowerCase().includes(district.toLowerCase())
      )
    }

    const total = filtered.length
    const data = filtered.slice((page - 1) * limit, page * limit)

    const response: PaginatedResponse<Lead> = {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
    return HttpResponse.json(response)
  }),

  http.get('/api/v1/leads/:id', ({ params }) => {
    const lead = LEADS_DB.find((l) => l.id === params.id)
    if (!lead) return HttpResponse.json({ message: 'Lead topilmadi' }, { status: 404 })
    return HttpResponse.json(lead)
  }),

  http.patch('/api/v1/leads/:id/store', async ({ params, request }) => {
    const body = (await request.json()) as { storeId: string }
    const lead = LEADS_DB.find((l) => l.id === params.id)
    if (!lead) return HttpResponse.json({ message: 'Lead topilmadi' }, { status: 404 })
    const store = STORES.find((s) => s.id === body.storeId)
    if (store) lead.nearestStore = store
    return HttpResponse.json(lead)
  }),
]
