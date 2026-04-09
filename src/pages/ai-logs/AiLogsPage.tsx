import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, X, XCircle, Zap } from 'lucide-react'
import api from '@shared/api/axios'
import {
  mapAiLog,
  mapAiLogStats,
  normalizePaginated,
  type BackendAiLogListItem,
  type BackendAiLogResponse,
  type BackendAiLogStatsResponse,
  type BackendPaginated,
} from '@shared/api/backend'
import { formatDateTime, formatRelative, truncate } from '@shared/lib/utils'
import { MetricCard } from '@shared/ui/MetricCard'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { StatusBadge } from '@shared/ui/StatusBadge'
import type { AiLog } from '@shared/types/api'

export function AiLogsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)

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

  const { data: selectedLog, isLoading: isLogLoading } = useQuery({
    queryKey: ['ai-log', selectedLogId],
    queryFn: () =>
      api
        .get<BackendAiLogResponse>(`/admin/ai-logs/${selectedLogId}`)
        .then((response) => mapAiLog(response.data)),
    enabled: Boolean(selectedLogId),
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
          onRowClick={(row) => setSelectedLogId(row.id)}
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

      {selectedLogId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelectedLogId(null)} />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">AI log tafsilotlari</h2>
                {selectedLog && (
                  <p className="mt-1 text-xs font-mono text-text-muted">
                    #{selectedLog.id.slice(-6).toUpperCase()}
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedLogId(null)} className="kas-btn-ghost rounded-md p-1.5">
                <X size={18} />
              </button>
            </div>

            {isLogLoading || !selectedLog ? (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-text-muted">
                Yuklanmoqda...
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="kas-card p-4 space-y-2.5">
                  <DrawerRow label="Foydalanuvchi" value={selectedLog.userName} />
                  <DrawerRow label="Model" value={selectedLog.modelUsed} mono />
                  <DrawerRow label="Status" value={selectedLog.status} />
                  <DrawerRow label="Response time" value={`${selectedLog.responseTimeMs}ms`} mono />
                  <DrawerRow label="Tokenlar" value={String(selectedLog.totalTokens)} mono />
                  <DrawerRow label="Yaratilgan" value={formatDateTime(selectedLog.createdAt)} />
                </div>

                <div className="kas-card p-4">
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                    Prompt
                  </h3>
                  <pre className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-mono text-xs text-text-secondary">
                    {selectedLog.question}
                  </pre>
                </div>

                <div className="kas-card p-4">
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                    Javob
                  </h3>
                  <pre className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-mono text-xs text-text-secondary">
                    {selectedLog.answer ?? "Javob yo'q"}
                  </pre>
                </div>

                {selectedLog.errorMessage && (
                  <div className="rounded-xl border border-danger/30 bg-danger/10 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-danger">Xatolik</p>
                    <p className="mt-2 text-sm text-danger">{selectedLog.errorMessage}</p>
                  </div>
                )}
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  )
}

function DrawerRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-right text-sm text-text-primary ${mono ? 'font-mono' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  )
}
