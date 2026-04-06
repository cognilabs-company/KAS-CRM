import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Grid, ImagePlus, List, Package, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import {
  normalizePaginated,
  mapProductListItem,
  type BackendPaginated,
  type BackendProductListItem,
  type BackendProductResponse,
} from '@shared/api/backend'
import { ConfirmDialog, SearchInput } from '@shared/ui/Controls'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { ModalDialog } from '@shared/ui/ModalDialog'
import { StatusBadge } from '@shared/ui/StatusBadge'
import { cn } from '@shared/lib/utils'
import type { ApplicationArea, Product, ProductType } from '@shared/types/api'

type ViewMode = 'grid' | 'table'

const PRODUCT_TYPE_OPTIONS: Array<{ value: ProductType; label: string }> = [
  { value: 'truba', label: 'Truba' },
  { value: 'fiting', label: 'Fiting' },
  { value: 'other', label: 'Boshqa' },
]

const APPLICATION_AREA_OPTIONS: Array<{ value: ApplicationArea; label: string }> = [
  { value: 'issiq_suv', label: 'Issiq suv' },
  { value: 'sovuq_suv', label: 'Sovuq suv' },
  { value: 'kanalizatsiya', label: 'Kanalizatsiya' },
  { value: 'isitish', label: 'Isitish' },
]

interface ProductFormState {
  name: string
  sku: string
  category: string
  productType: ProductType
  size: string
  description: string
  usageArea: ApplicationArea
  material: string
  pressureRating: string
  temperatureRating: string
  price: string
  isActive: boolean
  images: File[]
}

const INITIAL_PRODUCT_FORM: ProductFormState = {
  name: '',
  sku: '',
  category: '',
  productType: 'truba',
  size: '',
  description: '',
  usageArea: 'issiq_suv',
  material: 'PPR',
  pressureRating: 'PN20',
  temperatureRating: '95C',
  price: '',
  isActive: true,
  images: [],
}

function getProductTypeLabel(type: ProductType) {
  return PRODUCT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
}

export function ProductsPage() {
  const [searchParams] = useSearchParams()
  const routeSearch = searchParams.get('search') ?? ''
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(routeSearch)
  const [view, setView] = useState<ViewMode>('table')
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState<ProductFormState>(INITIAL_PRODUCT_FORM)
  const queryClient = useQueryClient()

  useEffect(() => {
    setSearch(routeSearch)
    setPage(1)
  }, [routeSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () =>
      api
        .get<BackendPaginated<BackendProductListItem>>('/admin/products/', {
          params: { page, size: 20, search: search.trim() || undefined },
        })
        .then((response) => normalizePaginated(response.data, mapProductListItem)),
    staleTime: 5 * 60 * 1000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => {
      toast.success("Mahsulot o'chirildi")
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Mahsulotni o‘chirib bo‘lmadi'),
  })

  const createMutation = useMutation({
    mutationFn: async (payload: ProductFormState) => {
      const createResponse = await api.post<BackendProductResponse>('/admin/products/', {
        name: payload.name.trim(),
        sku: payload.sku.trim(),
        category: payload.category.trim(),
        product_type: payload.productType,
        size: payload.size.trim() || undefined,
        description: payload.description.trim(),
        usage_area: payload.usageArea,
        material: payload.material.trim(),
        pressure_rating: payload.pressureRating.trim(),
        temperature_rating: payload.temperatureRating.trim(),
        price: payload.price.trim(),
        is_active: payload.isActive,
        image_urls: [],
      })

      if (payload.images.length > 0) {
        const formData = new FormData()
        payload.images.forEach((file) => formData.append('files', file))
        await api.post(`/admin/products/${createResponse.data.id}/images`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      }

      return createResponse.data
    },
    onSuccess: () => {
      toast.success("Mahsulot qo'shildi")
      setIsCreateOpen(false)
      setForm(INITIAL_PRODUCT_FORM)
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error("Mahsulotni qo'shib bo'lmadi"),
  })

  function updateForm<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function openCreateDialog() {
    setForm(INITIAL_PRODUCT_FORM)
    setIsCreateOpen(true)
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    updateForm('images', Array.from(event.target.files ?? []))
  }

  function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createMutation.mutate(form)
  }

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Mahsulot',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-surface-2 overflow-hidden">
            {row.imageUrl ? (
              <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" />
            ) : (
              <Package size={14} className="text-text-muted" />
            )}
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
        <span className="text-sm text-text-secondary">{getProductTypeLabel(row.type)}</span>
      ),
    },
    {
      key: 'size',
      header: "O'lcham",
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">{row.size ?? '-'}</span>
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
      render: (row) => (
        <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <button
            className="kas-btn-ghost rounded-md p-1.5 hover:text-danger"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-content p-4 sm:p-6">
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Mahsulotlar</h1>
          <p className="page-subtitle">{data ? `${data.total} ta mahsulot` : 'Yuklanmoqda...'}</p>
        </div>
        <button className="kas-btn-primary w-full sm:w-auto" onClick={openCreateDialog}>
          <Plus size={16} />
          Mahsulot qo&apos;shish
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Nom yoki SKU..."
          className="w-full sm:w-72"
        />
        <div className="flex items-center gap-1 rounded-md bg-surface-2 p-0.5 sm:ml-auto self-start sm:self-auto">
          <button
            onClick={() => setView('table')}
            className={cn('rounded p-2', view === 'table' ? 'bg-surface text-text-primary' : 'text-text-muted')}
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setView('grid')}
            className={cn('rounded p-2', view === 'grid' ? 'bg-surface text-text-primary' : 'text-text-muted')}
          >
            <Grid size={15} />
          </button>
        </div>
      </div>

      {view === 'grid' && !isLoading && data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.data.map((product) => (
            <div key={product.id} className="kas-card group p-4 transition-colors hover:border-primary/30">
              <div className="mb-3 flex h-28 w-full items-center justify-center rounded-md bg-surface-2 overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package size={32} className="text-text-muted" />
                )}
              </div>
              <p className="truncate text-sm font-medium text-text-primary">{product.name}</p>
              <p className="mt-0.5 text-xs font-mono text-text-muted">{product.sku}</p>
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge variant={product.isActive ? 'active' : 'inactive'} />
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="kas-btn-ghost rounded p-1 hover:text-danger"
                    onClick={() => setDeleteTarget(product)}
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
                ? {
                    page,
                    totalPages: data.totalPages,
                    total: data.total,
                    limit: data.limit,
                    onPageChange: setPage,
                  }
                : undefined
            }
            emptyMessage="Mahsulot topilmadi"
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Mahsulotni o'chirish"
        description={`"${deleteTarget?.name}" mahsulotini o'chirishni tasdiqlaysizmi?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />

      <ModalDialog
        open={isCreateOpen}
        title="Mahsulot qo'shish"
        description="Avval mahsulot yaratiladi, so'ng tanlangan rasmlar backendga multipart ko'rinishida yuklanadi."
        onClose={() => !createMutation.isPending && setIsCreateOpen(false)}
        className="max-w-4xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="kas-btn-secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              form="create-product-form"
              className="kas-btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saqlanmoqda...' : "Mahsulot qo'shish"}
            </button>
          </div>
        }
      >
        <form id="create-product-form" onSubmit={handleCreateProduct} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Mahsulot nomi" required>
              <input
                className="kas-input"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="PPR Elbow 25mm"
                required
              />
            </FormField>

            <FormField label="SKU" required>
              <input
                className="kas-input"
                value={form.sku}
                onChange={(event) => updateForm('sku', event.target.value)}
                placeholder="PPR-ELB-25"
                required
              />
            </FormField>

            <FormField label="Kategoriya" required>
              <input
                className="kas-input"
                value={form.category}
                onChange={(event) => updateForm('category', event.target.value)}
                placeholder="fittings"
                required
              />
            </FormField>

            <FormField label="Product type" required>
              <select
                className="kas-input"
                value={form.productType}
                onChange={(event) => updateForm('productType', event.target.value as ProductType)}
              >
                {PRODUCT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="O'lcham">
              <input
                className="kas-input"
                value={form.size}
                onChange={(event) => updateForm('size', event.target.value)}
                placeholder="25mm"
              />
            </FormField>

            <FormField label="Usage area" required>
              <select
                className="kas-input"
                value={form.usageArea}
                onChange={(event) => updateForm('usageArea', event.target.value as ApplicationArea)}
              >
                {APPLICATION_AREA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Material" required>
              <input
                className="kas-input"
                value={form.material}
                onChange={(event) => updateForm('material', event.target.value)}
                placeholder="PPR"
                required
              />
            </FormField>

            <FormField label="Pressure rating" required>
              <input
                className="kas-input"
                value={form.pressureRating}
                onChange={(event) => updateForm('pressureRating', event.target.value)}
                placeholder="PN20"
                required
              />
            </FormField>

            <FormField label="Temperature rating" required>
              <input
                className="kas-input"
                value={form.temperatureRating}
                onChange={(event) => updateForm('temperatureRating', event.target.value)}
                placeholder="95C"
                required
              />
            </FormField>

            <FormField label="Narx" required>
              <input
                className="kas-input"
                value={form.price}
                onChange={(event) => updateForm('price', event.target.value)}
                placeholder="12500.00"
                required
              />
            </FormField>
          </div>

          <FormField label="Tavsif" required>
            <textarea
              className="kas-input min-h-28 resize-none"
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              placeholder="High-pressure elbow fitting for hot water systems."
              required
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Mahsulot rasmlari">
              <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-5 text-center">
                <ImagePlus size={20} className="text-primary" />
                <span className="text-sm font-medium text-text-primary">Kompyuterdan rasm tanlash</span>
                <span className="text-xs text-text-secondary">Bir yoki bir nechta fayl yuklashingiz mumkin</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </FormField>

            <FormField label="Holat">
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => updateForm('isActive', event.target.checked)}
                  />
                  Faol mahsulot
                </label>

                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <p className="text-xs uppercase tracking-wider text-text-muted">Tanlangan rasmlar</p>
                  <div className="mt-2 space-y-1">
                    {form.images.length > 0 ? (
                      form.images.map((file) => (
                        <p key={`${file.name}-${file.lastModified}`} className="truncate text-sm text-text-primary">
                          {file.name}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-text-secondary">Hozircha rasm tanlanmagan</p>
                    )}
                  </div>
                </div>
              </div>
            </FormField>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

function FormField({
  label,
  children,
  required,
}: {
  label: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}
