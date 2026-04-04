import { http, HttpResponse } from 'msw'
import { faker } from '@faker-js/faker'
import type {
  DashboardStats,
  ChartDataPoint,
  RegionData,
  TopProduct,
} from '@shared/types/api'

const DISTRICTS = [
  'Yunusobod', 'Chilonzor', 'Yakkasaroy', 'Mirzo Ulugbek',
  'Shayxontohur', 'Bektemir', 'Uchtepa', 'Olmazor',
  'Sergeli', 'Yashnobod', 'Mirobod', 'Hamza',
]

const KAS_PRODUCTS = [
  'PPR Truba 20mm', 'PPR Truba 25mm', 'PPR Truba 32mm',
  'Muftali fiting 20', 'Burchak fiting 90°', 'T-simon fiting',
  'Kran sharlisi 1/2"', 'Kran sharlisi 3/4"',
  'Kanalizatsiya trubasi 50mm', 'Kanalizatsiya trubasi 110mm',
]

export const dashboardHandlers = [
  http.get('/api/v1/dashboard/stats', () => {
    const stats: DashboardStats = {
      todayLeads: faker.number.int({ min: 12, max: 48 }),
      todayLeadsTrend: faker.number.float({ min: -15, max: 35, fractionDigits: 1 }),
      totalUsers: faker.number.int({ min: 1200, max: 2400 }),
      totalUsersTrend: faker.number.float({ min: 2, max: 18, fractionDigits: 1 }),
      activeChats: faker.number.int({ min: 5, max: 32 }),
      activeChatsTrend: faker.number.float({ min: -10, max: 25, fractionDigits: 1 }),
      totalStores: faker.number.int({ min: 85, max: 105 }),
      totalStoresTrend: faker.number.float({ min: 0, max: 5, fractionDigits: 1 }),
    }
    return HttpResponse.json(stats)
  }),

  http.get('/api/v1/dashboard/chart/leads', ({ request }) => {
    const url = new URL(request.url)
    const period = url.searchParams.get('period') ?? '7d'
    const days = period === '30d' ? 30 : 7

    const data: ChartDataPoint[] = Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      return {
        date: date.toISOString().split('T')[0],
        value: faker.number.int({ min: 5, max: 50 }),
      }
    })

    return HttpResponse.json(data)
  }),

  http.get('/api/v1/dashboard/chart/regions', () => {
    const data: RegionData[] = DISTRICTS.map((district) => ({
      district,
      leads: faker.number.int({ min: 10, max: 180 }),
    })).sort((a, b) => b.leads - a.leads)

    return HttpResponse.json(data)
  }),

  http.get('/api/v1/dashboard/top-products', () => {
    const data: TopProduct[] = KAS_PRODUCTS.slice(0, 5).map((name, i) => ({
      id: `prod_${i + 1}`,
      name,
      requests: faker.number.int({ min: 50, max: 400 }),
      category: name.includes('Truba') ? 'Truba' : name.includes('Kran') ? 'Armatura' : 'Fiting',
    })).sort((a, b) => b.requests - a.requests)

    return HttpResponse.json(data)
  }),
]
