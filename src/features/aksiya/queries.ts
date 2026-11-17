import { useQuery, type QueryClient } from '@tanstack/react-query'
import api from '@shared/api/axios'
import { AKSIYA_BASE, aksiyaKeys, type AksiyaMeta, type AksiyaSettings, type AksiyaStats } from '@shared/api/aksiya'

export function useAksiyaStats() {
  return useQuery({
    queryKey: aksiyaKeys.stats,
    queryFn: () => api.get<AksiyaStats>(`${AKSIYA_BASE}/stats`).then((response) => response.data),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

export function useAksiyaSettings() {
  return useQuery({
    queryKey: aksiyaKeys.settings,
    queryFn: () => api.get<AksiyaSettings>(`${AKSIYA_BASE}/settings`).then((response) => response.data),
    staleTime: 60 * 1000,
    refetchOnMount: true,
  })
}

// Regions (bot order) and active partner stores for the filters.
export function useAksiyaMeta() {
  return useQuery({
    queryKey: aksiyaKeys.meta,
    queryFn: () => api.get<AksiyaMeta>(`${AKSIYA_BASE}/meta`).then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  })
}

// Approve/reject changes counters, the application list and the issued numbers.
export function invalidateAfterReview(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: aksiyaKeys.stats })
  void queryClient.invalidateQueries({ queryKey: aksiyaKeys.applications })
  void queryClient.invalidateQueries({ queryKey: aksiyaKeys.numbers })
}
