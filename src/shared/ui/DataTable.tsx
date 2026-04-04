import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib/utils'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  loading?: boolean
  onRowClick?: (row: T) => void
  pagination?: {
    page: number
    totalPages: number
    total: number
    limit: number
    onPageChange: (page: number) => void
  }
  emptyMessage?: string
  skeletonRows?: number
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
                          : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-text-muted">
            Jami {pagination.total} ta,{' '}
            {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} ko'rsatilmoqda
          </p>
          <div className="flex items-center gap-1">
            <button
              className="kas-btn-ghost p-1.5 rounded-md disabled:opacity-40"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  className={cn(
                    'w-8 h-8 rounded-md text-xs font-medium transition-colors',
                    p === pagination.page
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-surface-2'
                  )}
                  onClick={() => pagination.onPageChange(p)}
                >
                  {p}
                </button>
              )
            })}
            <button
              className="kas-btn-ghost p-1.5 rounded-md disabled:opacity-40"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
