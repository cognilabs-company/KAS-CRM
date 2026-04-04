import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { StatusBadge } from '@shared/ui/StatusBadge'
import { MetricCard } from '@shared/ui/MetricCard'
import { formatRelative, truncate } from '@shared/lib/utils'
import api from '@shared/api/axios'
import type { AiLog, AiLogStats, PaginatedResponse } from '@shared/types/api'

export function AiLogsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['ai-logs', page, status],
    queryFn: () =>
      api.get<PaginatedResponse<AiLog>>('/ai-logs', { params: { page, limit: 20, status: status || undefined } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: stats } = useQuery({
    queryKey: ['ai-logs-stats'],
    queryFn: () => api.get<AiLogStats>('/ai-logs/stats').then((r) => r.data),
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
      header: 'Savol',
      render: (row) => <span className="text-text-secondary">{truncate(row.question, 50)}</span>,
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
      key: 'promptTokens',
      header: 'Tokenlar',
      render: (row) => (
        <span className="font-mono text-xs text-text-muted">
          {row.promptTokens + row.completionTokens}
        </span>
      ),
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
    <div className="p-6 max-w-content mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title">AI Loglar</h1>
        <p className="page-subtitle">Bot so'rovlari va javoblar tarixi</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Jami So'rovlar" value={stats?.totalRequests ?? 0} icon={Zap} iconColor="text-primary" />
        <MetricCard title="Muvaffaqiyat %" value={stats ? `${stats.successRate.toFixed(1)}%` : '—'} icon={CheckCircle} iconColor="text-success" />
        <MetricCard title="O'rtacha Vaqt" value={stats ? `${stats.avgResponseTime}ms` : '—'} icon={Clock} iconColor="text-warning" />
        <MetricCard title="Jami Tokenlar" value={stats ? `${(stats.totalTokens / 1000).toFixed(0)}k` : '—'} icon={XCircle} iconColor="text-text-secondary" />
      </div>

      <div className="flex items-center gap-3">
        <select
          className="kas-input w-48"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
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
          pagination={data ? { page, totalPages: data.totalPages, total: data.total, limit: data.limit, onPageChange: setPage } : undefined}
          emptyMessage="Log topilmadi"
        />
      </div>
    </div>
  )
}
