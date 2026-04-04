import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, MapPin, Edit, Trash2, Phone } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { SearchInput } from '@shared/ui/Controls'
import { StatusBadge } from '@shared/ui/StatusBadge'
import api from '@shared/api/axios'
import { formatPhone } from '@shared/lib/utils'
import type { Store, PaginatedResponse } from '@shared/types/api'

export function StoresPage() {
  const [searchParams] = useSearchParams()
  const routeSearch = searchParams.get('search') ?? ''
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(routeSearch)

  useEffect(() => {
    setSearch(routeSearch)
    setPage(1)
  }, [routeSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['stores', page, search],
    queryFn: () =>
      api.get<PaginatedResponse<Store>>('/stores', { params: { page, limit: 20, search } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const columns: Column<Store>[] = [
    {
      key: 'name',
      header: 'Magazin',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <MapPin size={13} className="text-primary" />
          </div>
          <span className="font-medium text-text-primary">{row.name}</span>
        </div>
      ),
    },
    { key: 'contactPerson', header: "Mas'ul shaxs" },
    {
      key: 'phone',
      header: 'Telefon',
      render: (row) => (
        <div className="flex items-center gap-1 font-mono text-xs text-text-secondary">
          <Phone size={11} />
          {formatPhone(row.phone)}
        </div>
      ),
    },
    { key: 'district', header: 'Tuman' },
    {
      key: 'leadsCount',
      header: 'Leadlar',
      render: (row) => (
        <span className="font-semibold text-primary">{row.leadsCount}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Holat',
      render: (row) => <StatusBadge variant={row.isActive ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="kas-btn-ghost p-1.5 rounded-md"><Edit size={14} /></button>
          <button className="kas-btn-ghost p-1.5 rounded-md hover:text-danger"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 max-w-content mx-auto">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Magazinlar</h1>
          <p className="page-subtitle">{data ? `${data.total} ta magazin` : 'Yuklanmoqda...'}</p>
        </div>
        <button className="kas-btn-primary"><Plus size={16} /> Magazin qo'shish</button>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Nom, telefon yoki manzil..." className="w-72" />
      </div>
      <div className="kas-card">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyField="id"
          loading={isLoading}
          pagination={data ? { page, totalPages: data.totalPages, total: data.total, limit: data.limit, onPageChange: setPage } : undefined}
          emptyMessage="Magazin topilmadi"
        />
      </div>
    </div>
  )
}
