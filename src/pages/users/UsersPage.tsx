import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@shared/api/axios'
import {
  mapTelegramUser,
  normalizePaginated,
  type BackendPaginated,
  type BackendTelegramUserListItem,
} from '@shared/api/backend'
import { formatRelative } from '@shared/lib/utils'
import { SearchInput } from '@shared/ui/Controls'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { StatusBadge } from '@shared/ui/StatusBadge'
import type { BotUser, UserStatus } from '@shared/types/api'

export function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, status],
    queryFn: () =>
      api
        .get<BackendPaginated<BackendTelegramUserListItem>>('/admin/users/', {
          params: {
            page,
            size: 20,
            search: search.trim() || undefined,
            status: status || undefined,
          },
        })
        .then((response) => normalizePaginated(response.data, mapTelegramUser)),
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
      render: (row) => <span className="font-mono text-xs text-text-secondary">{row.phone ?? '-'}</span>,
    },
    {
      key: 'leadsCount',
      header: 'Leadlar',
      render: (row) => <span className="font-bold text-primary">{row.leadsCount}</span>,
    },
    {
      key: 'messageCount',
      header: 'Xabarlar',
      render: (row) => <span className="font-medium text-text-secondary">{row.messageCount}</span>,
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
    <div className="p-4 sm:p-6 max-w-content mx-auto">
      <div className="page-header">
        <h1 className="page-title">Foydalanuvchilar</h1>
        <p className="page-subtitle">{data ? `Jami ${data.total} ta foydalanuvchi` : 'Yuklanmoqda...'}</p>
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Ism, username yoki telefon..."
          className="w-full sm:w-72"
        />
        <select
          className="kas-input w-full sm:w-40"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
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
          emptyMessage="Foydalanuvchi topilmadi"
        />
      </div>
    </div>
  )
}
