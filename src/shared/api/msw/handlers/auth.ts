import { http, HttpResponse } from 'msw'
import type { LoginRequest, LoginResponse, AuthUser } from '@shared/types/api'

const MOCK_USERS: Array<AuthUser & { password: string }> = [
  {
    id: 'usr_001',
    email: 'superadmin@kas.uz',
    password: 'admin123',
    name: 'Sardor Toshmatov',
    role: 'super_admin',
  },
  {
    id: 'usr_002',
    email: 'admin@kas.uz',
    password: 'admin123',
    name: 'Malika Yusupova',
    role: 'kas_admin',
  },
]

export const authHandlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginRequest

    const user = MOCK_USERS.find(
      (u) => u.email === body.email && u.password === body.password
    )

    if (!user) {
      return HttpResponse.json(
        { message: "Email yoki parol noto'g'ri" },
        { status: 401 }
      )
    }

    const { password: _, ...userWithoutPassword } = user

    const response: LoginResponse = {
      token: `mock_jwt_${user.id}_${Date.now()}`,
      user: userWithoutPassword,
    }

    return HttpResponse.json(response)
  }),

  http.post('/api/v1/auth/logout', () => {
    return HttpResponse.json({ success: true })
  }),

  http.get('/api/v1/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const user = MOCK_USERS[0]
    const { password: _, ...userWithoutPassword } = user
    return HttpResponse.json(userWithoutPassword)
  }),
]
