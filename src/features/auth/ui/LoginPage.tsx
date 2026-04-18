import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { warmUpAppCache } from '@shared/api/prefetch'
import { mapAdminUser, type BackendAdminUserResponse, type BackendTokenResponse } from '@shared/api/backend'
import { useAuthStore } from '@shared/lib/store'

const schema = z.object({
  email: z.string().email("To'g'ri email kiriting"),
  password: z.string().min(6, 'Parol kamida 6 ta belgi'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const loginResponse = await api.post<BackendTokenResponse>('/admin/auth/login', data)
      const meResponse = await api.get<BackendAdminUserResponse>('/admin/auth/me', {
        headers: {
          Authorization: `Bearer ${loginResponse.data.access_token}`,
        },
      })

      return {
        user: mapAdminUser(meResponse.data),
        session: {
          accessToken: loginResponse.data.access_token,
          refreshToken: loginResponse.data.refresh_token,
          expiresIn: loginResponse.data.expires_in,
          refreshExpiresIn: loginResponse.data.refresh_expires_in,
        },
      }
    },
    onSuccess: async (data) => {
      const loadingToast = toast.loading("Ma'lumotlar tayyorlanmoqda...")
      setAuth(data.user, data.session)
      await warmUpAppCache(data.user.availablePages)
      toast.dismiss(loadingToast)
      toast.success(`Xush kelibsiz, ${data.user.name}!`)
      navigate('/', { replace: true })
    },
    onError: () => {
      toast.error("Email yoki parol noto'g'ri")
    },
  })

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-text-primary leading-tight">KAS CRM</p>
              <p className="text-xs text-text-muted leading-tight">by Cognilabs</p>
            </div>
          </div>
          <p className="text-text-secondary text-sm">Admin panelga kirish</p>
        </div>

        <div className="kas-card p-6">
          <form onSubmit={handleSubmit((formData) => mutation.mutate(formData))} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="admin@kas.uz"
                className="kas-input"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-danger mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Parol
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="********"
                  className="kas-input pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-danger mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="kas-btn-primary w-full mt-2"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Kirish...' : 'Kirish'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
