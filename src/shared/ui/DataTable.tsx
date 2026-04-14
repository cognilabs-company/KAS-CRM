import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib/utils'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: string
  render?: (row: T) => React.ReactNode
  className?: string
}

export interface PaginationConfig {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
  limitOptions?: number[]
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  loading?: boolean
  onRowClick?: (row: T) => void
  pagination?: PaginationConfig
  emptyMessage?: string
  skeletonRows?: number
}

export type PaginationPageItem = number | 'ellipsis'

export function getVisiblePages(page: number, totalPages: number): PaginationPageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const currentPage = Math.min(Math.max(page, 1), totalPages)
  const pageSet = new Set<number>([1, 2, 3, totalPages - 1, totalPages])

  if (currentPage > 3 && currentPage < totalPages - 1) {
    pageSet.add(currentPage)
  }

  const pages = Array.from(pageSet)
    .filter((nextPage) => nextPage >= 1 && nextPage <= totalPages)
    .sort((a, b) => a - b)

  return pages.reduce<PaginationPageItem[]>((items, nextPage, index) => {
    const previousPage = pages[index - 1]

    if (previousPage && nextPage - previousPage === 2) {
      items.push(previousPage + 1)
    } else if (previousPage && nextPage - previousPage > 2) {
      items.push('ellipsis')
    }

    items.push(nextPage)
    return items
  }, [])
}

export function PaginationControls({ pagination }: { pagination: PaginationConfig }) {
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const to = Math.min(pagination.page * pagination.limit, pagination.total)
  const visiblePages = getVisiblePages(pagination.page, pagination.totalPages)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="text-xs text-text-muted">
          Jami {pagination.total} ta, {from}-{to} ko'rsatilmoqda
        </p>
        {pagination.onLimitChange ? (
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <span>Sahifada</span>
            <select
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-text-primary outline-none focus:border-primary"
              value={pagination.limit}
              onChange={(event) => pagination.onLimitChange?.(Number(event.target.value))}
            >
              {(pagination.limitOptions ?? [20, 45, 75, 100]).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span>ta</span>
          </label>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <button
          className="kas-btn-ghost rounded-md p-1.5 disabled:opacity-40"
          onClick={() => pagination.onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          aria-label="Oldingi sahifa"
        >
          <ChevronLeft size={16} />
        </button>
        {visiblePages.map((nextPage, index) =>
          nextPage === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="flex h-8 w-8 items-center justify-center text-xs text-text-muted">
              ...
            </span>
          ) : (
            <button
              key={nextPage}
              className={cn(
                'h-8 w-8 rounded-md text-xs font-medium transition-colors',
                nextPage === pagination.page
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-surface-2'
              )}
              onClick={() => pagination.onPageChange(nextPage)}
            >
              {nextPage}
            </button>
          )
        )}
        <button
          className="kas-btn-ghost rounded-md p-1.5 disabled:opacity-40"
          onClick={() => pagination.onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          aria-label="Keyingi sahifa"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  loading,
  onRowClick,
  pagination,
  emptyMessage = "Ma'lumot topilmadi",
  skeletonRows = 8,
}: DataTableProps<T>) {
  const shouldShowPagination = Boolean(
    pagination && pagination.total > 0 && (pagination.totalPages > 1 || pagination.onLimitChange)
  )

  return (
    <div className="flex flex-col gap-0">
      <div className="overflow-x-auto">
        <table className="kas-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(col.width && `w-[${col.width}]`)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="!cursor-default !hover:bg-transparent">
                    {columns.map((col) => (
                      <td key={String(col.key)}>
                        <div className="h-4 bg-surface-2 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.length === 0
                ? (
                    <tr className="!cursor-default !hover:bg-transparent">
                      <td colSpan={columns.length} className="text-center py-12">
                        <p className="text-text-muted">{emptyMessage}</p>
                      </td>
                    </tr>
                  )
                : data.map((row) => (
                    <tr
                      key={String(row[keyField])}
                      onClick={() => onRowClick?.(row)}
                      className={cn(!onRowClick && '!cursor-default')}
                    >
                      {columns.map((col) => (
                        <td key={String(col.key)} className={col.className}>
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[String(col.key)] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>

      {shouldShowPagination && pagination ? <PaginationControls pagination={pagination} /> : null}
    </div>
  )
}
