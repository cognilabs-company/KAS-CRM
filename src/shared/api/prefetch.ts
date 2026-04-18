import api from '@shared/api/axios'
import {
  mapAiSetting,
  mapAiLog,
  mapAiLogStats,
  mapChatListItem,
  mapLeadListItem,
  mapLeadsDynamics,
  mapProductListItem,
  mapStoreListItem,
  mapTelegramUser,
  normalizePaginated,
  type BackendAiSettingResponse,
  type BackendAiLogListItem,
  type BackendAiLogStatsResponse,
  type BackendChatListItem,
  type BackendDashboardStatsResponse,
  type BackendLeadListItem,
  type BackendPaginated,
  type BackendProductListItem,
  type BackendPromptVersionResponse,
  type BackendStoreListItem,
  type BackendTelegramUserListItem,
} from '@shared/api/backend'
import { queryClient } from '@shared/lib/queryClient'
import type { AdminPage } from '@shared/types/api'

function mapPromptVersion(item: BackendPromptVersionResponse) {
  return {
    id: item.id,
    version: item.version,
    content: item.content,
    isCurrent: item.is_current,
    createdAt: item.created_at,
  }
}

export async function warmUpAppCache(availablePages: AdminPage[]) {
  const tasks: Array<Promise<unknown>> = []

  if (availablePages.includes('dashboard')) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () =>
          api
            .get<BackendDashboardStatsResponse>('/admin/dashboard/stats')
            .then((response) => response.data),
      }),
      queryClient.prefetchQuery({
        queryKey: ['dashboard-leads-chart', '7d'],
        queryFn: () =>
          api
            .get('/admin/dashboard/leads-dynamics', { params: { days: 7 } })
            .then((response) => mapLeadsDynamics(response.data)),
      }),
    )
  }

  if (availablePages.includes('leads')) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['leads', { page: 1, size: 20, search: undefined }],
        queryFn: () =>
          api
            .get<BackendPaginated<BackendLeadListItem>>('/admin/leads/', {
              params: { page: 1, size: 20 },
            })
            .then((response) => normalizePaginated(response.data, mapLeadListItem)),
      }),
    )
  }

  if (availablePages.includes('chats')) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['chats', '', 'all', null],
        queryFn: () =>
          api
            .get<BackendPaginated<BackendChatListItem>>('/admin/chats/', {
              params: { page: 1, size: 100 },
            })
            .then((response) => normalizePaginated(response.data, mapChatListItem)),
      }),
    )
  }

  if (availablePages.includes('products')) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['products', 1, 20, '', '', ''],
        queryFn: ({ signal }) =>
          api
            .get<BackendPaginated<BackendProductListItem>>('/admin/products/', {
              params: { page: 1, size: 20 },
              signal,
            })
            .then((response) => normalizePaginated(response.data, mapProductListItem)),
      }),
    )
  }

  if (availablePages.includes('stores')) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['stores', 1, ''],
        queryFn: () =>
          api
            .get<BackendPaginated<BackendStoreListItem>>('/admin/stores/', {
              params: { page: 1, size: 20 },
            })
            .then((response) => normalizePaginated(response.data, mapStoreListItem)),
      }),
    )
  }

  if (availablePages.includes('users')) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['users', 1, '', ''],
        queryFn: () =>
          api
            .get<BackendPaginated<BackendTelegramUserListItem>>('/admin/users/', {
              params: { page: 1, size: 20 },
            })
            .then((response) => normalizePaginated(response.data, mapTelegramUser)),
      }),
    )
  }

  if (availablePages.includes('ai_logs')) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['ai-logs', 1, ''],
        queryFn: () =>
          api
            .get<BackendPaginated<BackendAiLogListItem>>('/admin/ai-logs/', {
              params: { page: 1, size: 20 },
            })
            .then((response) => normalizePaginated(response.data, mapAiLog)),
      }),
      queryClient.prefetchQuery({
        queryKey: ['ai-logs-stats'],
        queryFn: () =>
          api
            .get<BackendAiLogStatsResponse>('/admin/ai-logs/stats')
            .then((response) => mapAiLogStats(response.data)),
      }),
    )
  }

  if (availablePages.includes('ai_settings')) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['ai-settings-prompt'],
        queryFn: () =>
          api
            .get<BackendPromptVersionResponse>('/admin/ai-settings/prompt')
            .then((response) => mapPromptVersion(response.data)),
      }),
      queryClient.prefetchQuery({
        queryKey: ['ai-settings-prompt-versions'],
        queryFn: () =>
          api
            .get<BackendPromptVersionResponse[]>('/admin/ai-settings/prompt/versions')
            .then((response) => response.data.map(mapPromptVersion)),
      }),
      queryClient.prefetchQuery({
        queryKey: ['ai-settings-list'],
        queryFn: () =>
          api
            .get<BackendAiSettingResponse[]>('/admin/ai-settings/')
            .then((response) => response.data.map(mapAiSetting)),
      }),
    )
  }

  await Promise.allSettled(tasks)
}
