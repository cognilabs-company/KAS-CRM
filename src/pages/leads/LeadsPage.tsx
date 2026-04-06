import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Bot, Download, ExternalLink, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import {
  normalizePaginated,
  mapLeadListItem,
  mapLeadResponse,
  type BackendLeadListItem,
  type BackendLeadResponse,
  type BackendPaginated,
} from '@shared/api/backend'
import type { Lead } from '@shared/types/api'
import { formatPhone, formatRelative, truncate } from '@shared/lib/utils'
import { SearchInput } from '@shared/ui/Controls'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { ModalDialog } from '@shared/ui/ModalDialog'

export function LeadsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const routeSearch = searchParams.get('search') ?? ''
  const selectedLeadId = searchParams.get('leadId')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(routeSearch)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [isExportOpen, setIsExportOpen] = useState(false)

  useEffect(() => {
    setSearch(routeSearch)
    setPage(1)
  }, [routeSearch])

  const queryParams = useMemo(
    () => ({
      page,
      size: 20,
      search: search.trim() || undefined,
    }),
    [page, search]
  )

  const { data, isLoading } = useQuery({
    queryKey: ['leads', queryParams],
    queryFn: () =>
      api
        .get<BackendPaginated<BackendLeadListItem>>('/admin/leads/', { params: queryParams })
        .then((response) => normalizePaginated(response.data, mapLeadListItem)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: selectedLead } = useQuery({
    queryKey: ['lead', selectedLeadId],
    queryFn: () =>
      api
        .get<BackendLeadResponse>(`/admin/leads/${selectedLeadId}`)
        .then((response) => mapLeadResponse(response.data)),
    enabled: Boolean(selectedLeadId),
  })

  useEffect(() => {
    if (selectedLead) {
      setSelected(selectedLead)
    }
  }, [selectedLead])

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get<Blob>('/admin/leads/export', {
        params: {
          search: search.trim() || undefined,
        },
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      toast.success('Leadlar CSV fayl sifatida yuklab olindi')
      setIsExportOpen(false)
    },
    onError: () => toast.error('CSV eksportida xatolik yuz berdi'),
  })

  function openLead(row: Lead) {
    setSelected(row)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('leadId', row.id)
    if (search.trim()) nextParams.set('search', search.trim())
    else nextParams.delete('search')
    setSearchParams(nextParams, { replace: true })
  }

  function closeLead() {
    setSelected(null)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('leadId')
    setSearchParams(nextParams, { replace: true })
  }

  const columns: Column<Lead>[] = [
    {
      key: 'id',
      header: 'Lead ID',
      render: (row) => (
        <span className="font-mono text-xs text-text-muted">#{row.id.slice(-6).toUpperCase()}</span>
      ),
    },
    {
      key: 'fullName',
      header: 'Telegram foydalanuvchi',
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.fullName}</p>
          {row.username && <p className="text-xs text-text-muted">@{row.username}</p>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.phone ? formatPhone(row.phone) : '-'}
        </span>
      ),
    },
    {
      key: 'products',
      header: 'Mahsulotlar',
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {row.products.slice(0, 2).map((product) => (
            <span key={product.id} className="kas-badge bg-primary/10 text-primary text-xs">
              {truncate(product.name, 20)}
            </span>
          ))}
          {row.products.length > 2 && (
            <span className="kas-badge bg-surface-2 text-text-muted">
              +{row.products.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'nearestStore',
      header: 'Magazin',
      render: (row) => (
        <span className="text-text-secondary text-sm">
          {row.nearestStore?.name ?? '-'}
        </span>
      ),
    },
    {
      key: 'aiSummary',
      header: 'AI summary',
      render: (row) => (
        <span className="text-text-muted text-xs max-w-[220px] block">
          {truncate(row.aiSummary, 60)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Vaqt',
      render: (row) => <span className="text-xs text-text-muted">{formatRelative(row.createdAt)}</span>,
    },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-content mx-auto">
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Leadlar</h1>
          <p className="page-subtitle">
            {data ? `Jami ${data.total} ta lead` : 'Yuklanmoqda...'}
          </p>
        </div>
        <button className="kas-btn-secondary gap-2 w-full sm:w-auto" onClick={() => setIsExportOpen(true)}>
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Ism, username yoki telefon..."
          className="w-full sm:w-72"
        />
      </div>

      <div className="kas-card">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyField="id"
          loading={isLoading}
          onRowClick={openLead}
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
          emptyMessage="Hech qanday lead topilmadi"
        />
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeLead} />
          <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border z-50 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Lead tafsilotlari</h2>
                <p className="text-xs font-mono text-text-muted">
                  #{selected.id.slice(-6).toUpperCase()}
                </p>
              </div>
              <button onClick={closeLead} className="kas-btn-ghost p-1.5 rounded-md">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              <div className="kas-card p-4 space-y-2.5">
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Foydalanuvchi
                </h3>
                <Row label="Ism" value={selected.fullName} />
                {selected.username && <Row label="Username" value={`@${selected.username}`} mono />}
                {selected.phone && <Row label="Telefon" value={formatPhone(selected.phone)} mono />}
                <Row label="Telegram ID" value={selected.telegramId} mono />
              </div>

              <div className="kas-card p-4 space-y-2.5">
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Magazin
                </h3>
                <Row label="Eng yaqin magazin" value={selected.nearestStore?.name ?? '-'} />
                {selected.location && (
                  <>
                    <Row label="Latitude" value={String(selected.location.lat)} mono />
                    <Row label="Longitude" value={String(selected.location.lng)} mono />
                  </>
                )}
              </div>

              <div className="kas-card p-4">
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Mahsulotlar
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selected.products.map((product) => (
                    <span
                      key={product.id}
                      className="kas-badge bg-primary/10 text-primary border border-primary/20"
                    >
                      {product.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="kas-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={14} className="text-primary" />
                  <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    AI summary
                  </h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {selected.aiSummary}
                </p>
              </div>

              <div className="kas-card p-4 space-y-2.5">
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Meta
                </h3>
                <Row label="Yaratilgan" value={formatRelative(selected.createdAt)} />
                <Row label="Manba" value={selected.source} />
              </div>

              <button
                disabled={!selected.userId}
                onClick={() => {
                  if (!selected.userId) return
                  navigate(`/chats?userId=${selected.userId}`)
                }}
                className="kas-btn-secondary w-full justify-center"
              >
                <ExternalLink size={14} />
                Chat tarixini ko&apos;rish
              </button>
            </div>
          </aside>
        </>
      )}

      <ModalDialog
        open={isExportOpen}
        title="Leadlarni CSV ga eksport qilish"
        description="Joriy qidiruv bo'yicha backend CSV fayl qaytaradi."
        onClose={() => !exportMutation.isPending && setIsExportOpen(false)}
        className="max-w-lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="kas-btn-secondary"
              onClick={() => setIsExportOpen(false)}
              disabled={exportMutation.isPending}
            >
              Bekor qilish
            </button>
            <button
              type="button"
              className="kas-btn-primary"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? 'Yuklanmoqda...' : 'CSV yuklab olish'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <p className="text-xs uppercase tracking-wider text-text-muted">Eksport doirasi</p>
            <p className="mt-2 text-sm text-text-primary">
              {search.trim()
                ? `Qidiruv: "${search.trim()}" bo'yicha ${data?.total ?? 0} ta lead`
                : `Barcha leadlar: ${data?.total ?? 0} ta`}
            </p>
          </div>
        </div>
      </ModalDialog>
    </div>
  )
}

function Row({
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
      <span className="text-xs text-text-muted flex-shrink-0">{label}</span>
      <span
        className={`text-xs text-right text-text-primary ${mono ? 'font-mono' : 'font-medium'}`}
      >
        {value}
      </span>
    </div>
  )
}
