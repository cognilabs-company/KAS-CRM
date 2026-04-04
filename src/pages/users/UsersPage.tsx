import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { SearchInput } from '@shared/ui/Controls'
import { StatusBadge } from '@shared/ui/StatusBadge'
import { formatRelative } from '@shared/lib/utils'
import api from '@shared/api/axios'
import type { BotUser, PaginatedResponse, UserStatus } from '@shared/types/api'

export function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, status],
    queryFn: () =>
      api.get<PaginatedResponse<BotUser>>('/users', { params: { page, limit: 20, search, status: status || undefined } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const columns: Column<BotUser>[] = [
    {
      key: 'firstName',
      header: 'Foydalanuvchi',
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.firstName} {row.lastName}</p>
          {row.username && <p className="text-xs text-text-muted">@{row.username}</p>}
        </div>
      ),
    },
    {
      key: 'telegramId',
      header: 'Telegram ID',
      render: (row) => <span className="font-mono text-xs text-text-muted">{row.telegramId}</span>,
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (row) => <span className="font-mono text-xs text-text-secondary">{row.phone ?? '—'}</span>,
    },
    {
      key: 'leadsCount',
      header: 'Leadlar',
      render: (row) => <span className="font-bold text-primary">{row.leadsCount}</span>,
    },
    {
      key: 'lastActiveAt',
      header: "So'nggi faollik",
      render: (row) => <span className="text-xs text-text-muted">{formatRelative(row.lastActiveAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge variant={row.status as UserStatus} />,
    },
  ]

  return (
    <div className="p-6 max-w-content mx-auto">
      <div className="page-header">
        <h1 className="page-title">Foydalanuvchilar</h1>
        <p className="page-subtitle">{data ? `Jami ${data.total} ta foydalanuvchi` : 'Yuklanmoqda...'}</p>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Ism, username yoki telefon..." className="w-72" />
        <select
          className="kas-input w-40"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">Barcha statuslar</option>
          <option value="active">Aktiv</option>
          <option value="blocked">Bloklangan</option>
          <option value="test">Test</option>
        </select>
      </div>
      <div className="kas-card">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyField="id"
          loading={isLoading}
          pagination={data ? { page, totalPages: data.totalPages, total: data.total, limit: data.limit, onPageChange: setPage } : undefined}
          emptyMessage="Foydalanuvchi topilmadi"
        />
      </div>
    </div>
  )
}
