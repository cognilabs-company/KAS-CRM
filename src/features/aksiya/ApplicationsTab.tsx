import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, Hash, Wallet, Video, Paperclip, X, type LucideIcon } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api from '@shared/api/axios'
import { normalizePaginated, type BackendPaginated } from '@shared/api/backend'
import {
  AKSIYA_BASE,
  CONSUMER_TYPE_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
  aksiyaKeys,
  consumerTypeLabel,
  formatSom,
  formatTashkent,
  groupDigits,
  type AksiyaApplicationListItem,
  type AksiyaConsumerType,
  type AksiyaStatus,
} from '@shared/api/aksiya'
import { formatPhone } from '@shared/lib/utils'
import { SearchInput } from '@shared/ui/Controls'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { Select } from '@shared/ui/Select'
import { StatusBadge } from '@shared/ui/StatusBadge'
import { cn } from '@shared/lib/utils'
import { useAksiyaMeta, useAksiyaStats } from './queries'
import { ApplicationDetailDialog } from './ApplicationDetailDialog'

type StatusFilter = AksiyaStatus | ''
type ConsumerFilter = AksiyaConsumerType | ''

const PAGE_SIZE_OPTIONS = [20, 50, 100]

const CONSUMER_OPTIONS: Array<{ value: ConsumerFilter; label: string }> = [
  { value: '', label: 'Barcha turlar' },
  { value: 'usta', label: CONSUMER_TYPE_LABELS.usta },
  { value: 'owner', label: CONSUMER_TYPE_LABELS.owner },
]

const STAT_TONES = {
  blue: 'bg-primary/10 text-primary',
  green: 'bg-success/10 text-success',
  amber: 'bg-warning/10 text-warning',
} as const

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
  loading,
}: {
  title: string
  value: string | number
  hint: string
  icon: LucideIcon
  tone: keyof typeof STAT_TONES
  loading: boolean
}) {
  return (
    <div className="kas-card p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary sm:text-xs">{title}</p>
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', STAT_TONES[tone])}>
          <Icon size={16} />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-24 animate-pulse rounded bg-surface-2" />
      ) : (
        <p className="text-lg font-bold text-text-primary sm:text-2xl break-words">{value}</p>
      )}
      <p className="mt-1 text-[11px] text-text-muted sm:text-xs">{hint}</p>
    </div>
  )
}

export function ApplicationsTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('applicationId')
  const [status, setStatus] = useState<StatusFilter>('')
  const [consumerType, setConsumerType] = useState<ConsumerFilter>('')
  const [region, setRegion] = useState('')
  const [storeId, setStoreId] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)

  const { data: stats, isLoading: statsLoading } = useAksiyaStats()
  const { data: meta } = useAksiyaMeta()

  const regionOptions = useMemo(
    () => [
      { value: '', label: 'Barcha viloyatlar' },
      ...(meta?.regions ?? []).map((item) => ({ value: item.code, label: item.name_uz })),
    ],
    [meta]
  )
  const storeOptions = useMemo(
    () => [
      { value: '', label: "Barcha do'konlar" },
      { value: 'none', label: "Boshqa do'kon (qo'lda yozilgan)" },
      ...(meta?.stores ?? []).map((item) => ({
        value: item.id,
        label: item.district ? `${item.name} (${item.district})` : item.name,
      })),
    ],
    [meta]
  )

  const params = useMemo(
    () => ({
      status: status || undefined,
      consumer_type: consumerType || undefined,
      region: region || undefined,
      store_id: storeId || undefined,
      search: search.trim() || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      size,
    }),
    [consumerType, dateFrom, dateTo, page, region, search, size, status, storeId]
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: [...aksiyaKeys.applications, params],
    queryFn: ({ signal }) =>
      api
        .get<BackendPaginated<AksiyaApplicationListItem>>(`${AKSIYA_BASE}/applications`, { params, signal })
        .then((response) => normalizePaginated(response.data, (item) => item)),
    staleTime: 15 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  const statusTabs: Array<{ value: StatusFilter; label: string; count?: number }> = [
    { value: '', label: 'Barchasi', count: stats?.total_applications },
    { value: 'pending', label: STATUS_LABELS.pending, count: stats?.pending },
    { value: 'approved', label: STATUS_LABELS.approved, count: stats?.approved },
    { value: 'rejected', label: STATUS_LABELS.rejected, count: stats?.rejected },
  ]

  const hasFilters = Boolean(status || consumerType || region || storeId || search || dateFrom || dateTo)

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function clearFilters() {
    setStatus('')
    setConsumerType('')
    setRegion('')
    setStoreId('')
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function openApplication(row: AksiyaApplicationListItem) {
    const next = new URLSearchParams(searchParams)
    next.set('applicationId', row.id)
    setSearchParams(next, { replace: true })
  }

  function closeApplication() {
    const next = new URLSearchParams(searchParams)
    next.delete('applicationId')
    setSearchParams(next, { replace: true })
  }

  const columns: Column<AksiyaApplicationListItem>[] = [
    {
      key: 'full_name',
      header: 'Qatnashchi',
      render: (row) => (
        <div className="min-w-[160px]">
          <p className="font-medium text-text-primary">{row.full_name}</p>
          <p className="font-mono text-xs text-text-muted">{row.phone ? formatPhone(row.phone) : '—'}</p>
        </div>
      ),
    },
    {
      key: 'consumer_type',
      header: 'Turi',
      render: (row) => <span className="text-xs text-text-secondary whitespace-nowrap">{consumerTypeLabel(row.consumer_type)}</span>,
    },
    {
      key: 'store_name',
      header: "Do'kon / manzil",
      render: (row) => (
        <div className="max-w-[220px] text-xs">
          <p className="truncate text-text-primary" title={row.store_name ?? undefined}>{row.store_name || '—'}</p>
          <p className="truncate text-text-muted" title={row.location ?? undefined}>{row.location || row.region_name || ''}</p>
        </div>
      ),
    },
    {
      key: 'claimed_amount',
      header: 'Summa',
      render: (row) => (
        <div className="whitespace-nowrap text-xs">
          {row.confirmed_amount != null ? (
            <p className="font-medium text-success">{formatSom(row.confirmed_amount)}</p>
          ) : null}
          <p className={cn(row.confirmed_amount != null ? 'text-text-muted' : 'text-text-primary')}>
            {row.claimed_amount != null ? formatSom(row.claimed_amount) : row.amount_text || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'files_count',
      header: 'Fayllar',
      render: (row) => (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1"><Paperclip size={13} />{row.files_count}</span>
          {row.has_video ? <Video size={14} className="text-primary" aria-label="Isbot (rasm/video) bor" /> : null}
        </div>
      ),
    },
    {
      key: 'numbers',
      header: 'Raqamlar',
      render: (row) =>
        row.numbers.length === 0 ? (
          <span className="text-xs text-text-muted">—</span>
        ) : (
          <div className="flex max-w-[180px] flex-wrap gap-1">
            {row.numbers.slice(0, 4).map((item) => (
              <span key={item.number} className="kas-badge bg-primary/10 font-mono text-primary">{item.display}</span>
            ))}
            {row.numbers.length > 4 ? (
              <span className="kas-badge bg-surface-2 text-text-muted">+{row.numbers.length - 4}</span>
            ) : null}
          </div>
        ),
    },
    {
      key: 'status',
      header: 'Holat',
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge
            variant={STATUS_BADGE[row.status]}
            label={row.annulled_at ? 'Bekor qilingan' : STATUS_LABELS[row.status]}
          />
          {row.has_duplicates ? (
            <span
              className="kas-badge whitespace-nowrap bg-danger/15 font-semibold text-danger"
              title="Chek yoki isbot boshqa faol arizada ham bor"
            >
              ⚠️ Takroriy
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Yuborilgan',
      render: (row) => <span className="whitespace-nowrap text-xs text-text-muted">{formatTashkent(row.created_at)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Tekshiruvda" value={stats?.pending ?? 0} icon={Clock} tone="amber" loading={statsLoading} hint="ko'rib chiqilishi kerak" />
        <StatCard title="Tasdiqlangan" value={stats?.approved ?? 0} icon={CheckCircle2} tone="green" loading={statsLoading} hint={`${stats?.rejected ?? 0} ta rad etilgan`} />
        <StatCard title="Berilgan raqamlar" value={stats ? groupDigits(stats.total_numbers) : 0} icon={Hash} tone="blue" loading={statsLoading} hint={`${stats?.participants ?? 0} ta qatnashchi`} />
        <StatCard title="Tasdiqlangan summa" value={stats ? formatSom(stats.confirmed_amount_total) : '—'} icon={Wallet} tone="blue" loading={statsLoading} hint="jami tasdiqlangan xaridlar" />
      </div>

      <div className="flex w-full gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1 sm:w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            onClick={() => resetPage(setStatus)(tab.value)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              status === tab.value ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="text-xs text-text-muted">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={resetPage(setSearch)}
          placeholder="Ism, telefon, do'kon yoki raqam (0005)..."
          className="w-full sm:w-80"
        />
        <Select<ConsumerFilter>
          value={consumerType}
          onChange={resetPage(setConsumerType)}
          options={CONSUMER_OPTIONS}
          className="w-full sm:w-52"
          aria-label="Iste'molchi turi"
        />
        <Select
          value={region}
          onChange={resetPage(setRegion)}
          options={regionOptions}
          className="w-full sm:w-52"
          aria-label="Viloyat"
        />
        <Select
          value={storeId}
          onChange={resetPage(setStoreId)}
          options={storeOptions}
          searchable
          className="w-full sm:w-60"
          aria-label="Do'kon"
        />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <input
            type="date"
            className="kas-input sm:w-40"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => resetPage(setDateFrom)(event.target.value)}
            aria-label="Sanadan"
          />
          <span className="text-text-muted">—</span>
          <input
            type="date"
            className="kas-input sm:w-40"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => resetPage(setDateTo)(event.target.value)}
            aria-label="Sanagacha"
          />
        </div>
        {hasFilters ? (
          <button type="button" className="kas-btn-ghost text-xs" onClick={clearFilters}>
            <X size={14} /> Filtrlarni tozalash
          </button>
        ) : null}
      </div>

      <div className="kas-card">
        {isError ? (
          <p className="p-6 text-center text-sm text-danger">Arizalarni yuklab bo&apos;lmadi</p>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            keyField="id"
            loading={isLoading}
            onRowClick={openApplication}
            emptyMessage="Arizalar topilmadi"
            pagination={
              data
                ? {
                    page: data.page,
                    totalPages: data.totalPages,
                    total: data.total,
                    limit: data.limit,
                    onPageChange: setPage,
                    onLimitChange: (limit) => {
                      setSize(limit)
                      setPage(1)
                    },
                    limitOptions: PAGE_SIZE_OPTIONS,
                  }
                : undefined
            }
          />
        )}
      </div>

      <ApplicationDetailDialog applicationId={selectedId} onClose={closeApplication} />
    </div>
  )
}
