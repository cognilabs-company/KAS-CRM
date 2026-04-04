import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Grid, List, Edit, Trash2, Package } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { SearchInput, ConfirmDialog } from '@shared/ui/Controls'
import { StatusBadge } from '@shared/ui/StatusBadge'
import { cn } from '@shared/lib/utils'
import api from '@shared/api/axios'
import toast from 'react-hot-toast'
import type { Product, PaginatedResponse } from '@shared/types/api'

type ViewMode = 'grid' | 'table'

export function ProductsPage() {
  const [searchParams] = useSearchParams()
  const routeSearch = searchParams.get('search') ?? ''
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(routeSearch)
  const [view, setView] = useState<ViewMode>('table')
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    setSearch(routeSearch)
    setPage(1)
  }, [routeSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () =>
      api
        .get<PaginatedResponse<Product>>('/products', { params: { page, limit: 20, search } })
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success("Mahsulot o'chirildi")
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  })

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Mahsulot',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center flex-shrink-0">
            <Package size={14} className="text-text-muted" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.name}</p>
            <p className="text-xs font-mono text-text-muted">{row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Kategoriya',
      render: (row) => (
        <span className="kas-badge bg-surface-2 text-text-secondary">{row.category}</span>
      ),
    },
    {
      key: 'type',
      header: 'Turi',
      render: (row) => (
        <span className="text-sm text-text-secondary capitalize">{row.type}</span>
      ),
    },
    {
      key: 'size',
      header: "O'lcham",
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">{row.size ?? '—'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Holat',
      render: (row) => (
        <StatusBadge variant={row.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="kas-btn-ghost p-1.5 rounded-md">
            <Edit size={14} />
          </button>
          <button
            className="kas-btn-ghost p-1.5 rounded-md hover:text-danger"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 max-w-content mx-auto">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Mahsulotlar</h1>
          <p className="page-subtitle">
            {data ? `${data.total} ta mahsulot` : 'Yuklanmoqda...'}
          </p>
        </div>
        <button className="kas-btn-primary">
          <Plus size={16} />
          Mahsulot qo'shish
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Nom yoki SKU..."
          className="w-72"
        />
        <div className="ml-auto flex items-center gap-1 bg-surface-2 rounded-md p-0.5">
          <button
            onClick={() => setView('table')}
            className={cn('p-2 rounded', view === 'table' ? 'bg-surface text-text-primary' : 'text-text-muted')}
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setView('grid')}
            className={cn('p-2 rounded', view === 'grid' ? 'bg-surface text-text-primary' : 'text-text-muted')}
          >
            <Grid size={15} />
          </button>
        </div>
      </div>

      {view === 'grid' && !isLoading && data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.data.map((prod) => (
            <div key={prod.id} className="kas-card p-4 hover:border-primary/30 transition-colors group">
              <div className="w-full h-28 rounded-md bg-surface-2 flex items-center justify-center mb-3">
                <Package size={32} className="text-text-muted" />
              </div>
              <p className="font-medium text-text-primary text-sm truncate">{prod.name}</p>
              <p className="text-xs font-mono text-text-muted mt-0.5">{prod.sku}</p>
              <div className="flex items-center justify-between mt-3">
                <StatusBadge variant={prod.isActive ? 'active' : 'inactive'} />
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="kas-btn-ghost p-1 rounded">
                    <Edit size={13} />
                  </button>
                  <button
                    className="kas-btn-ghost p-1 rounded hover:text-danger"
                    onClick={() => setDeleteTarget(prod)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="kas-card">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            keyField="id"
            loading={isLoading}
            pagination={
              data
                ? { page, totalPages: data.totalPages, total: data.total, limit: data.limit, onPageChange: setPage }
                : undefined
            }
            emptyMessage="Mahsulot topilmadi"
          />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Mahsulotni o'chirish"
        description={`"${deleteTarget?.name}" mahsulotini o'chirishni tasdiqlaysizmi?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
