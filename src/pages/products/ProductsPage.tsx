import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Grid, ImagePlus, Import, List, Package, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { getApiErrorMessage } from '@shared/api/errors'
import {
  mapProductListItem,
  mapProductResponse,
  normalizePaginated,
  type BackendMessageResponse,
  type BackendPaginated,
  type BackendProductListItem,
  type BackendProductResponse,
} from '@shared/api/backend'
import { ConfirmDialog, SearchInput } from '@shared/ui/Controls'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { ModalDialog } from '@shared/ui/ModalDialog'
import { StatusBadge } from '@shared/ui/StatusBadge'
import { cn, truncate } from '@shared/lib/utils'
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
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
  const [alternativeId, setAlternativeId] = useState('')
  const [bulkImportValue, setBulkImportValue] = useState('')
  const [form, setForm] = useState<ProductFormState>(INITIAL_PRODUCT_FORM)
  const [editForm, setEditForm] = useState<ProductFormState>(INITIAL_PRODUCT_FORM)
  const uploadInputRef = useRef<HTMLInputElement>(null)
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

  const { data: selectedProduct, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', selectedProductId],
    queryFn: () =>
      api
        .get<BackendProductResponse>(`/admin/products/${selectedProductId}`)
        .then((response) => mapProductResponse(response.data)),
    enabled: Boolean(selectedProductId),
  })

  const alternativeOptionsQuery = useQuery({
    queryKey: ['product-alternative-options', selectedProductId],
    queryFn: () =>
      api
        .get<BackendPaginated<BackendProductListItem>>('/admin/products/', {
          params: { page: 1, size: 100 },
        })
        .then((response) => normalizePaginated(response.data, mapProductListItem)),
    enabled: Boolean(selectedProductId),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!selectedProduct) return
    setEditForm({
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      category: selectedProduct.category,
      productType: selectedProduct.type,
      size: selectedProduct.size ?? '',
      description: selectedProduct.description ?? '',
      usageArea: selectedProduct.usageArea ?? 'issiq_suv',
      material: selectedProduct.material ?? '',
      pressureRating: selectedProduct.pressureSpec ?? '',
      temperatureRating: selectedProduct.temperatureSpec ?? '',
      price: selectedProduct.price != null ? String(selectedProduct.price) : '',
      isActive: selectedProduct.isActive,
      images: [],
    })
  }, [selectedProduct])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: (_, deletedId) => {
      toast.success("Mahsulot o'chirildi")
      setDeleteTarget(null)
      if (selectedProductId === deletedId) {
        setSelectedProductId(null)
      }
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Mahsulotni o'chirib bo'lmadi")),
  })

  const createMutation = useMutation({
    mutationFn: async (payload: ProductFormState) => {
      const normalizedPrice = Number(payload.price.trim().replace(',', '.'))
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
        price: normalizedPrice,
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
    onError: (error) => toast.error(getApiErrorMessage(error, "Mahsulotni qo'shib bo'lmadi")),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: ProductFormState) =>
      api.patch<BackendProductResponse>(`/admin/products/${selectedProductId}`, {
        name: payload.name.trim(),
        sku: payload.sku.trim(),
        category: payload.category.trim(),
        product_type: payload.productType,
        size: payload.size.trim() || undefined,
        description: payload.description.trim() || undefined,
        usage_area: payload.usageArea || undefined,
        material: payload.material.trim() || undefined,
        pressure_rating: payload.pressureRating.trim() || undefined,
        temperature_rating: payload.temperatureRating.trim() || undefined,
        price: payload.price.trim() ? Number(payload.price.trim().replace(',', '.')) : undefined,
        is_active: payload.isActive,
      }),
    onSuccess: () => {
      toast.success('Mahsulot yangilandi')
      setIsEditOpen(false)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Mahsulotni yangilab bo'lmadi")),
  })

  const uploadImagesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!selectedProductId) return null
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      const response = await api.post<BackendProductResponse>(
        `/admin/products/${selectedProductId}/images`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success('Rasmlar yuklandi')
      queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Rasmlarni yuklab bo'lmadi")),
  })

  const deleteImageMutation = useMutation({
    mutationFn: (imageUrl: string) =>
      api.delete<BackendProductResponse>(`/admin/products/${selectedProductId}/images`, {
        params: { image_url: imageUrl },
      }),
    onSuccess: () => {
      toast.success("Rasm o'chirildi")
      queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Rasmni o'chirib bo'lmadi")),
  })

  const addAlternativeMutation = useMutation({
    mutationFn: (nextAlternativeId: string) =>
      api.post<BackendMessageResponse>(
        `/admin/products/${selectedProductId}/alternatives/${nextAlternativeId}`
      ),
    onSuccess: () => {
      toast.success("Alternativ mahsulot qo'shildi")
      setAlternativeId('')
      queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] })
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Alternativ mahsulotni qo'shib bo'lmadi")),
  })

  const removeAlternativeMutation = useMutation({
    mutationFn: (nextAlternativeId: string) =>
      api.delete<BackendMessageResponse>(
        `/admin/products/${selectedProductId}/alternatives/${nextAlternativeId}`
      ),
    onSuccess: () => {
      toast.success('Alternativ mahsulot olib tashlandi')
      queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] })
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Alternativ mahsulotni olib tashlab bo'lmadi")),
  })

  const bulkImportMutation = useMutation({
    mutationFn: () => {
      const payload = JSON.parse(bulkImportValue)
      return api.post('/admin/products/bulk-import', payload)
    },
    onSuccess: () => {
      toast.success('Bulk import bajarildi')
      setIsBulkImportOpen(false)
      setBulkImportValue('')
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Bulk import bajarilmadi')),
  })

  function updateForm<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function updateEditForm<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setEditForm((previous) => ({ ...previous, [key]: value }))
  }

  function openCreateDialog() {
    setForm(INITIAL_PRODUCT_FORM)
    setIsCreateOpen(true)
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    updateForm('images', Array.from(event.target.files ?? []))
  }

  function handleDrawerImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    uploadImagesMutation.mutate(files)
    event.target.value = ''
  }

  function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createMutation.mutate(form)
  }

  function handleEditProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateMutation.mutate(editForm)
  }

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Mahsulot',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2">
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

  const alternativeOptions = (alternativeOptionsQuery.data?.data ?? []).filter(
    (product) =>
      product.id !== selectedProductId &&
      !selectedProduct?.alternatives.some((alternative) => alternative.id === product.id)
  )

  return (
    <div className="mx-auto max-w-content p-4 sm:p-6">
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Mahsulotlar</h1>
          <p className="page-subtitle">{data ? `${data.total} ta mahsulot` : 'Yuklanmoqda...'}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button className="kas-btn-secondary w-full sm:w-auto" onClick={() => setIsBulkImportOpen(true)}>
            <Import size={16} />
            Bulk import
          </button>
          <button className="kas-btn-primary w-full sm:w-auto" onClick={openCreateDialog}>
            <Plus size={16} />
            Mahsulot qo&apos;shish
          </button>
        </div>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {data.data.map((product) => (
            <div
              key={product.id}
              className="kas-card group cursor-pointer p-4 transition-colors hover:border-primary/30"
              onClick={() => setSelectedProductId(product.id)}
            >
              <div className="mb-3 flex h-28 w-full items-center justify-center overflow-hidden rounded-md bg-surface-2">
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
                    onClick={(event) => {
                      event.stopPropagation()
                      setDeleteTarget(product)
                    }}
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
            onRowClick={(row) => setSelectedProductId(row.id)}
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

      {selectedProductId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelectedProductId(null)} />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Mahsulot tafsilotlari</h2>
                {selectedProduct && (
                  <p className="mt-1 text-xs font-mono text-text-muted">
                    #{selectedProduct.id.slice(-6).toUpperCase()}
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedProductId(null)} className="kas-btn-ghost rounded-md p-1.5">
                <X size={18} />
              </button>
            </div>

            {isProductLoading || !selectedProduct ? (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-text-muted">
                Yuklanmoqda...
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="kas-card p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                        <Package size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-text-primary">{selectedProduct.name}</p>
                        <p className="text-sm font-mono text-text-secondary">{selectedProduct.sku}</p>
                      </div>
                    </div>
                    <StatusBadge variant={selectedProduct.isActive ? 'active' : 'inactive'} />
                  </div>

                  <div className="space-y-2.5">
                    <DrawerRow label="Kategoriya" value={selectedProduct.category} />
                    <DrawerRow label="Turi" value={getProductTypeLabel(selectedProduct.type)} />
                    <DrawerRow label="O'lcham" value={selectedProduct.size ?? '-'} mono />
                    <DrawerRow label="Narx" value={selectedProduct.price != null ? String(selectedProduct.price) : '-'} mono />
                    <DrawerRow label="Material" value={selectedProduct.material ?? '-'} />
                    <DrawerRow label="Usage area" value={selectedProduct.usageArea ?? '-'} />
                    <DrawerRow label="Pressure" value={selectedProduct.pressureSpec ?? '-'} />
                    <DrawerRow label="Temperature" value={selectedProduct.temperatureSpec ?? '-'} />
                  </div>

                  <div className="mt-4">
                    <button className="kas-btn-secondary w-full" onClick={() => setIsEditOpen(true)}>
                      <Pencil size={14} />
                      Tahrirlash
                    </button>
                  </div>
                </div>

                <div className="kas-card p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">Rasmlar</h3>
                    <div className="flex gap-2">
                      <input
                        ref={uploadInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleDrawerImageUpload}
                      />
                      <button
                        type="button"
                        className="kas-btn-secondary gap-2 text-xs"
                        onClick={() => uploadInputRef.current?.click()}
                        disabled={uploadImagesMutation.isPending}
                      >
                        <Upload size={13} />
                        Rasm yuklash
                      </button>
                    </div>
                  </div>

                  {(selectedProduct.imageUrls ?? []).length === 0 ? (
                    <p className="text-sm text-text-muted">Hozircha rasm yo&apos;q</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedProduct.imageUrls?.map((imageUrl) => (
                        <div key={imageUrl} className="overflow-hidden rounded-xl border border-border bg-surface-2">
                          <img src={imageUrl} alt={selectedProduct.name} className="h-32 w-full object-cover" />
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-2 border-t border-border px-3 py-2 text-xs text-danger"
                            onClick={() => deleteImageMutation.mutate(imageUrl)}
                            disabled={deleteImageMutation.isPending}
                          >
                            <Trash2 size={12} />
                            O&apos;chirish
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="kas-card p-4">
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">Tavsif</h3>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {selectedProduct.description ?? "Tavsif yo'q"}
                  </p>
                </div>

                <div className="kas-card p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      Alternativ mahsulotlar
                    </h3>
                    <span className="kas-badge bg-primary/10 text-primary">
                      {selectedProduct.alternatives.length}
                    </span>
                  </div>

                  <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                    <select
                      className="kas-input"
                      value={alternativeId}
                      onChange={(event) => setAlternativeId(event.target.value)}
                    >
                      <option value="">Alternativ mahsulot tanlang</option>
                      {alternativeOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.sku}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="kas-btn-primary sm:w-auto"
                      onClick={() => alternativeId && addAlternativeMutation.mutate(alternativeId)}
                      disabled={!alternativeId || addAlternativeMutation.isPending}
                    >
                      Qo&apos;shish
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedProduct.alternatives.length === 0 ? (
                      <p className="text-sm text-text-muted">Alternativ mahsulot bog&apos;lanmagan</p>
                    ) : (
                      selectedProduct.alternatives.map((alternative) => (
                        <div
                          key={alternative.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2"
                        >
                          <span className="text-sm text-text-primary">{alternative.name}</span>
                          <button
                            type="button"
                            className="kas-btn-ghost rounded-md p-1.5 hover:text-danger"
                            onClick={() => removeAlternativeMutation.mutate(alternative.id)}
                            disabled={removeAlternativeMutation.isPending}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </>
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
        <ProductForm
          formId="create-product-form"
          form={form}
          onSubmit={handleCreateProduct}
          onChange={updateForm}
          onImageChange={handleImageChange}
        />
      </ModalDialog>

      <ModalDialog
        open={isEditOpen}
        title="Mahsulotni tahrirlash"
        description="Product detail, update, image va alternatives endpointlariga ulangan."
        onClose={() => !updateMutation.isPending && setIsEditOpen(false)}
        className="max-w-4xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="kas-btn-secondary"
              onClick={() => setIsEditOpen(false)}
              disabled={updateMutation.isPending}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              form="edit-product-form"
              className="kas-btn-primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        }
      >
        <ProductForm
          formId="edit-product-form"
          form={editForm}
          onSubmit={handleEditProduct}
          onChange={updateEditForm}
          onImageChange={() => undefined}
          showImages={false}
        />
      </ModalDialog>

      <ModalDialog
        open={isBulkImportOpen}
        title="Bulk import"
        description="JSON array ko'rinishidagi mahsulotlarni `/admin/products/bulk-import` endpointiga yuboradi."
        onClose={() => !bulkImportMutation.isPending && setIsBulkImportOpen(false)}
        className="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="kas-btn-secondary"
              onClick={() => setIsBulkImportOpen(false)}
              disabled={bulkImportMutation.isPending}
            >
              Bekor qilish
            </button>
            <button
              type="button"
              className="kas-btn-primary"
              onClick={() => bulkImportMutation.mutate()}
              disabled={bulkImportMutation.isPending || !bulkImportValue.trim()}
            >
              {bulkImportMutation.isPending ? 'Yuborilmoqda...' : 'Import qilish'}
            </button>
          </div>
        }
      >
        <textarea
          className="kas-input min-h-[320px] resize-none font-mono text-xs"
          value={bulkImportValue}
          onChange={(event) => setBulkImportValue(event.target.value)}
          placeholder='[{"name":"PPR Elbow 25mm","sku":"PPR-ELB-25","category":"fittings","product_type":"fiting","size":"25mm","description":"High-pressure elbow fitting","usage_area":"issiq_suv","material":"PPR","pressure_rating":"PN20","temperature_rating":"95C","price":12500,"is_active":true,"image_urls":[]}]'
        />
      </ModalDialog>
    </div>
  )
}

function ProductForm({
  formId,
  form,
  onSubmit,
  onChange,
  onImageChange,
  showImages = true,
}: {
  formId: string
  form: ProductFormState
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void
  showImages?: boolean
}) {
  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Mahsulot nomi" required>
          <input className="kas-input" value={form.name} onChange={(event) => onChange('name', event.target.value)} placeholder="PPR Elbow 25mm" required />
        </FormField>
        <FormField label="SKU" required>
          <input className="kas-input" value={form.sku} onChange={(event) => onChange('sku', event.target.value)} placeholder="PPR-ELB-25" required />
        </FormField>
        <FormField label="Kategoriya" required>
          <input className="kas-input" value={form.category} onChange={(event) => onChange('category', event.target.value)} placeholder="fittings" required />
        </FormField>
        <FormField label="Product type" required>
          <select className="kas-input" value={form.productType} onChange={(event) => onChange('productType', event.target.value as ProductType)}>
            {PRODUCT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="O'lcham">
          <input className="kas-input" value={form.size} onChange={(event) => onChange('size', event.target.value)} placeholder="25mm" />
        </FormField>
        <FormField label="Usage area" required>
          <select className="kas-input" value={form.usageArea} onChange={(event) => onChange('usageArea', event.target.value as ApplicationArea)}>
            {APPLICATION_AREA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Material" required>
          <input className="kas-input" value={form.material} onChange={(event) => onChange('material', event.target.value)} placeholder="PPR" required />
        </FormField>
        <FormField label="Pressure rating" required>
          <input className="kas-input" value={form.pressureRating} onChange={(event) => onChange('pressureRating', event.target.value)} placeholder="PN20" required />
        </FormField>
        <FormField label="Temperature rating" required>
          <input className="kas-input" value={form.temperatureRating} onChange={(event) => onChange('temperatureRating', event.target.value)} placeholder="95C" required />
        </FormField>
        <FormField label="Narx" required>
          <input type="number" step="0.01" className="kas-input" value={form.price} onChange={(event) => onChange('price', event.target.value)} placeholder="12500.00" required />
        </FormField>
      </div>

      <FormField label="Tavsif" required>
        <textarea className="kas-input min-h-28 resize-none" value={form.description} onChange={(event) => onChange('description', event.target.value)} placeholder="High-pressure elbow fitting for hot water systems." required />
      </FormField>

      <div className={cn('grid gap-4', showImages ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
        {showImages ? (
          <FormField label="Mahsulot rasmlari">
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-5 text-center">
              <ImagePlus size={20} className="text-primary" />
              <span className="text-sm font-medium text-text-primary">Kompyuterdan rasm tanlash</span>
              <span className="text-xs text-text-secondary">Bir yoki bir nechta fayl yuklashingiz mumkin</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={onImageChange} />
            </label>
          </FormField>
        ) : null}

        <FormField label="Holat">
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary">
              <input type="checkbox" checked={form.isActive} onChange={(event) => onChange('isActive', event.target.checked)} />
              Faol mahsulot
            </label>

            {showImages ? (
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
            ) : null}
          </div>
        </FormField>
      </div>
    </form>
  )
}

function DrawerRow({
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
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-right text-sm text-text-primary ${mono ? 'font-mono' : 'font-medium'}`}>
        {truncate(value, 80)}
      </span>
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
