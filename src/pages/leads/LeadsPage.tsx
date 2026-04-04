import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, X, ExternalLink, Clock, Bot } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '@shared/api/axios'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { SearchInput } from '@shared/ui/Controls'
import { formatRelative, formatPhone, truncate } from '@shared/lib/utils'
import type { Lead, PaginatedResponse } from '@shared/types/api'

export function LeadsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const routeSearch = searchParams.get('search') ?? ''
  const selectedLeadId = searchParams.get('leadId')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(routeSearch)
  const [selected, setSelected] = useState<Lead | null>(null)

  useEffect(() => {
    setSearch(routeSearch)
    setPage(1)
  }, [routeSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search],
    queryFn: () =>
      api
        .get<PaginatedResponse<Lead>>('/leads', { params: { page, limit: 20, search } })
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: selectedLead } = useQuery({
    queryKey: ['lead', selectedLeadId],
    queryFn: () => api.get<Lead>(`/leads/${selectedLeadId}`).then((r) => r.data),
    enabled: !!selectedLeadId,
  })

  useEffect(() => {
    if (selectedLead) {
      setSelected(selectedLead)
    }
  }, [selectedLead])

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
      header: 'Telegram Foydalanuvchi',
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.fullName}</p>
          {row.username && (
            <p className="text-xs text-text-muted">@{row.username}</p>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.phone ? formatPhone(row.phone) : '—'}
        </span>
      ),
    },
    {
      key: 'products',
      header: 'Mahsulotlar',
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {row.products.slice(0, 2).map((p) => (
            <span key={p.id} className="kas-badge bg-primary/10 text-primary text-xs">
              {truncate(p.name, 16)}
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
      header: 'Eng yaqin magazin',
      render: (row) => (
        <span className="text-text-secondary text-sm">
          {row.nearestStore?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'aiSummary',
      header: 'AI Summary',
      render: (row) => (
        <span className="text-text-muted text-xs max-w-[200px] block">
          {truncate(row.aiSummary, 60)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Vaqt',
      render: (row) => (
        <div className="flex items-center gap-1 text-text-muted whitespace-nowrap">
          <Clock size={12} />
          <span className="text-xs">{formatRelative(row.createdAt)}</span>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 max-w-content mx-auto">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Leadlar</h1>
          <p className="page-subtitle">
            {data ? `Jami ${data.total} ta lead` : 'Yuklanmoqda...'}
          </p>
        </div>
        <button className="kas-btn-secondary gap-2">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Ism, username yoki telefon..."
          className="w-72"
        />
      </div>

      {/* Table */}
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

      {/* Detail Drawer */}
      {selected && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={closeLead}
          />
          <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border z-50 flex flex-col overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Lead tafsilotlari</h2>
                <p className="text-xs font-mono text-text-muted">
                  #{selected.id.slice(-6).toUpperCase()}
                </p>
              </div>
              <button
                onClick={closeLead}
                className="kas-btn-ghost p-1.5 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* User info */}
              <div className="kas-card p-4 space-y-2.5">
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Foydalanuvchi
                </h3>
                <Row label="Ism" value={selected.fullName} />
                {selected.username && (
                  <Row label="Username" value={`@${selected.username}`} mono />
                )}
                {selected.phone && (
                  <Row label="Telefon" value={formatPhone(selected.phone)} mono />
                )}
                <Row label="Telegram ID" value={selected.telegramId} mono />
              </div>

              {/* Location & store */}
              <div className="kas-card p-4 space-y-2.5">
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Magazin
                </h3>
                {selected.location?.address && (
                  <Row label="Joylashuv" value={selected.location.address} />
                )}
                <Row
                  label="Eng yaqin magazin"
                  value={selected.nearestStore?.name ?? '—'}
                />
              </div>

              {/* Products */}
              <div className="kas-card p-4">
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Mahsulotlar
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selected.products.map((p) => (
                    <span key={p.id} className="kas-badge bg-primary/10 text-primary border border-primary/20">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Summary */}
              <div className="kas-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={14} className="text-primary" />
                  <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    AI Summary
                  </h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {selected.aiSummary}
                </p>
              </div>

              {/* Meta */}
              <div className="kas-card p-4 space-y-2.5">
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Meta
                </h3>
                <Row label="Yaratilgan" value={formatRelative(selected.createdAt)} />
                <Row label="Manba" value="Telegram Bot" />
              </div>

              {/* Chat link */}
              <button
                disabled={!selected.chatUserId}
                onClick={() => {
                  if (!selected.chatUserId) return
                  navigate(`/chats?userId=${selected.chatUserId}`)
                }}
                className="kas-btn-secondary w-full justify-center"
              >
                <ExternalLink size={14} />
                Chat tarixini ko'rish
              </button>
            </div>
          </aside>
        </>
      )}
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
