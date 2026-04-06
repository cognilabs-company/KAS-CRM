import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, XCircle, Zap } from 'lucide-react'
import api from '@shared/api/axios'
import {
  mapAiLog,
  mapAiLogStats,
  normalizePaginated,
  type BackendAiLogListItem,
  type BackendAiLogStatsResponse,
  type BackendPaginated,
} from '@shared/api/backend'
import { formatRelative, truncate } from '@shared/lib/utils'
import { MetricCard } from '@shared/ui/MetricCard'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { StatusBadge } from '@shared/ui/StatusBadge'
import type { AiLog } from '@shared/types/api'

export function AiLogsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['ai-logs', page, status],
    queryFn: () =>
      api
        .get<BackendPaginated<BackendAiLogListItem>>('/admin/ai-logs/', {
          params: {
            page,
            size: 20,
            is_error: status === 'error' ? true : status === 'success' ? false : undefined,
          },
        })
        .then((response) => normalizePaginated(response.data, mapAiLog)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: stats } = useQuery({
    queryKey: ['ai-logs-stats'],
    queryFn: () =>
      api
        .get<BackendAiLogStatsResponse>('/admin/ai-logs/stats')
        .then((response) => mapAiLogStats(response.data)),
    staleTime: 5 * 60 * 1000,
  })

  const columns: Column<AiLog>[] = [
    {
      key: 'createdAt',
      header: 'Vaqt',
      render: (row) => <span className="text-xs text-text-muted">{formatRelative(row.createdAt)}</span>,
    },
    { key: 'userName', header: 'Foydalanuvchi' },
    {
      key: 'question',
      header: 'Prompt',
      render: (row) => <span className="text-text-secondary">{truncate(row.question, 56)}</span>,
    },
    {
      key: 'modelUsed',
      header: 'Model',
      render: (row) => <span className="text-xs font-mono text-text-muted">{row.modelUsed}</span>,
    },
    {
      key: 'responseTimeMs',
      header: 'Vaqt (ms)',
      render: (row) => (
        <span className={`font-mono text-xs ${row.responseTimeMs > 1500 ? 'text-warning' : 'text-success'}`}>
          {row.responseTimeMs}ms
        </span>
      ),
    },
    {
      key: 'totalTokens',
      header: 'Tokenlar',
      render: (row) => <span className="font-mono text-xs text-text-muted">{row.totalTokens}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusBadge variant={row.status === 'success' ? 'success' : 'error'} />
      ),
    },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-content mx-auto space-y-4 sm:space-y-6">
      <div className="page-header">
        <h1 className="page-title">AI Loglar</h1>
        <p className="page-subtitle">Bot so'rovlari va javoblar tarixi</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Jami so'rovlar" value={stats?.totalRequests ?? 0} icon={Zap} iconColor="text-primary" />
        <MetricCard title="Muvaffaqiyat %" value={stats ? `${stats.successRate.toFixed(1)}%` : '-'} icon={CheckCircle} iconColor="text-success" />
        <MetricCard title="O'rtacha vaqt" value={stats ? `${stats.avgResponseTime}ms` : '-'} icon={Clock} iconColor="text-warning" />
        <MetricCard title="Jami tokenlar" value={stats?.totalTokens ?? 0} icon={XCircle} iconColor="text-text-secondary" />
      </div>

      <div className="flex items-center gap-3">
        <select
          className="kas-input w-full sm:w-48"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">Barcha statuslar</option>
          <option value="success">Muvaffaqiyatli</option>
          <option value="error">Xatolik</option>
        </select>
      </div>

      <div className="kas-card">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyField="id"
          loading={isLoading}
          pagination={
            data
              ? {
                  page,
                  totalPages: data.totalPages,
                  total: data.total,
                  limit: data.limit,
                  onPageChange: setPage,
                }
              : undefined
          }
          emptyMessage="Log topilmadi"
        />
      </div>
    </div>
  )
}
