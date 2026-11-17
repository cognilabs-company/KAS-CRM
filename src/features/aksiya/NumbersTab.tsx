import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { normalizePaginated, type BackendPaginated } from '@shared/api/backend'
import {
  AKSIYA_BASE,
  aksiyaKeys,
  consumerTypeLabel,
  formatTashkent,
  type AksiyaNumberListItem,
} from '@shared/api/aksiya'
import { formatPhone } from '@shared/lib/utils'
import { SearchInput } from '@shared/ui/Controls'
import { DataTable, type Column } from '@shared/ui/DataTable'

const PAGE_SIZE_OPTIONS = [50, 100]

function filenameFromDisposition(header: unknown) {
  if (typeof header !== 'string') return null
  const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return match ? decodeURIComponent(match[1]) : null
}

export function NumbersTab() {
  const [, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(50)

  const params = { search: search.trim() || undefined, page, size }

  const { data, isLoading, isError } = useQuery({
    queryKey: [...aksiyaKeys.numbers, params],
    queryFn: ({ signal }) =>
      api
        .get<BackendPaginated<AksiyaNumberListItem>>(`${AKSIYA_BASE}/numbers`, { params, signal })
        .then((response) => normalizePaginated(response.data, (item) => item)),
    staleTime: 15 * 1000,
    refetchOnMount: true,
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get<Blob>(`${AKSIYA_BASE}/export`, { responseType: 'blob' })
      const fallback = `aksiya_2026_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
      const filename = filenameFromDisposition(response.headers['content-disposition']) ?? fallback
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => toast.success('Excel fayl yuklab olindi'),
    onError: () => toast.error('Excel eksportida xatolik yuz berdi'),
  })

  function openApplication(row: AksiyaNumberListItem) {
    // The detail dialog lives in the applications tab.
    setSearchParams(new URLSearchParams({ applicationId: row.application_id }), { replace: false })
  }

  const columns: Column<AksiyaNumberListItem>[] = [
    {
      key: 'display',
      header: 'Raqam',
      render: (row) => <span className="font-mono text-sm font-semibold text-primary">{row.display}</span>,
    },
    {
      key: 'full_name',
      header: 'Qatnashchi',
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.full_name}</p>
          <p className="font-mono text-xs text-text-muted">{row.phone ? formatPhone(row.phone) : '—'}</p>
        </div>
      ),
    },
    {
      key: 'consumer_type',
      header: 'Turi',
      render: (row) => <span className="whitespace-nowrap text-xs text-text-secondary">{consumerTypeLabel(row.consumer_type)}</span>,
    },
    {
      key: 'store_name',
      header: "Do'kon / manzil",
      render: (row) => (
        <div className="max-w-[240px] text-xs">
          <p className="truncate text-text-primary" title={row.store_name ?? undefined}>{row.store_name || '—'}</p>
          <p className="truncate text-text-muted" title={row.location ?? undefined}>{row.location || ''}</p>
        </div>
      ),
    },
    {
      key: 'issued_at',
      header: 'Berilgan',
      render: (row) => <span className="whitespace-nowrap text-xs text-text-muted">{formatTashkent(row.issued_at)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Raqam (0005), ism yoki telefon..."
          className="w-full sm:w-80"
        />
        <button
          type="button"
          className="kas-btn-secondary w-full sm:w-auto"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          <Download size={14} />
          {exportMutation.isPending ? 'Tayyorlanmoqda...' : 'Excel yuklab olish'}
        </button>
      </div>

      <div className="kas-card">
        {isError ? (
          <p className="p-6 text-center text-sm text-danger">Raqamlarni yuklab bo&apos;lmadi</p>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            keyField="number"
            loading={isLoading}
            onRowClick={openApplication}
            emptyMessage="Hali raqam berilmagan"
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
    </div>
  )
}
