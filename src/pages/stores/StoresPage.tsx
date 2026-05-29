import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Phone, Plus, Send, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { getApiErrorMessage } from '@shared/api/errors'
import {
  mapStoreListItem,
  mapStoreResponse,
  normalizePaginated,
  type BackendPaginated,
  type BackendStoreListItem,
  type BackendStoreResponse,
} from '@shared/api/backend'
import { formatPhone, formatRelative } from '@shared/lib/utils'
import { SearchInput } from '@shared/ui/Controls'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { ModalDialog } from '@shared/ui/ModalDialog'
import { StatusBadge } from '@shared/ui/StatusBadge'
import { YandexMapPicker } from '@shared/ui/YandexMapPicker'
import type { Store } from '@shared/types/api'

type ContactField =
  | 'responsiblePerson'
  | 'phone'
  | 'secondaryResponsiblePerson'
  | 'phoneSecondary'

interface StoreFormState {
  name: string
  responsiblePerson: string
  secondaryResponsiblePerson: string
  phone: string
  phoneSecondary: string
  address: string
  district: string
  latitude: string
  longitude: string
  workingHours: string
  telegramId: string
  telegramGroupId: string
  isActive: boolean
  productTypes: string[]
}

const INITIAL_STORE_FORM: StoreFormState = {
  name: '',
  responsiblePerson: '',
  secondaryResponsiblePerson: '',
  phone: '+998',
  phoneSecondary: '',
  address: '',
  district: '',
  latitude: '41.2995',
  longitude: '69.2401',
  workingHours: '09:00-18:00',
  telegramId: '',
  telegramGroupId: '',
  isActive: true,
  productTypes: [],
}

function productTypesToRecord(types: string[]): Record<string, boolean> {
  return types.reduce<Record<string, boolean>>((accumulator, type) => {
    accumulator[type] = true
    return accumulator
  }, {})
}

function productTypesToList(record?: Record<string, boolean>): string[] {
  if (!record) return []
  return Object.entries(record)
    .filter(([, enabled]) => enabled)
    .map(([type]) => type)
}

function ProductTypesField({
  values,
  onChange,
}: {
  values: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  function addType() {
    const value = draft.trim()
    if (!value) return
    if (!values.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value])
    }
    setDraft('')
  }

  function removeType(value: string) {
    onChange(values.filter((existing) => existing !== value))
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className="kas-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addType()
            }
          }}
          placeholder="Mahsulot turini yozing (masalan: Fiting)"
        />
        <button
          type="button"
          className="kas-btn-secondary shrink-0"
          onClick={addType}
          title="Qo'shish"
        >
          <Plus size={16} />
        </button>
      </div>

      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-text-primary"
            >
              {value}
              <button
                type="button"
                onClick={() => removeType(value)}
                className="text-text-muted transition-colors hover:text-danger"
                title="O'chirish"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ContactFields({
  responsiblePerson,
  phone,
  secondaryResponsiblePerson,
  phoneSecondary,
  onChange,
}: {
  responsiblePerson: string
  phone: string
  secondaryResponsiblePerson: string
  phoneSecondary: string
  onChange: (field: ContactField, value: string) => void
}) {
  const hasSecondary = Boolean(secondaryResponsiblePerson.trim() || phoneSecondary.trim())
  const [expanded, setExpanded] = useState(hasSecondary)

  useEffect(() => {
    if (hasSecondary) setExpanded(true)
  }, [hasSecondary])

  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Mas'ul shaxs" required>
          <input
            className="kas-input"
            value={responsiblePerson}
            onChange={(event) => onChange('responsiblePerson', event.target.value)}
            placeholder="Bekzod Karimov"
            required
          />
        </FormField>

        <FormField label="Telefon" required>
          <input
            className="kas-input"
            value={phone}
            onChange={(event) => onChange('phone', event.target.value)}
            placeholder="+998712345678"
            required
          />
        </FormField>
      </div>

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="kas-btn-ghost inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-primary"
        >
          <Plus size={14} />
          Qo&apos;shimcha mas&apos;ul shaxs va telefon
        </button>
      )}

      <div
        className={`grid transition-all duration-300 ease-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid gap-4 pt-1 md:grid-cols-2">
            <FormField label="Qo'shimcha mas'ul shaxs">
              <input
                className="kas-input"
                value={secondaryResponsiblePerson}
                onChange={(event) => onChange('secondaryResponsiblePerson', event.target.value)}
                placeholder="Dilnoza Yusupova"
              />
            </FormField>

            <FormField label="Qo'shimcha telefon">
              <input
                className="kas-input"
                value={phoneSecondary}
                onChange={(event) => onChange('phoneSecondary', event.target.value)}
                placeholder="+998901112233"
              />
            </FormField>
          </div>

          <button
            type="button"
            onClick={() => {
              onChange('secondaryResponsiblePerson', '')
              onChange('phoneSecondary', '')
              setExpanded(false)
            }}
            className="kas-btn-ghost mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:text-danger"
          >
            <X size={14} />
            Qo&apos;shimchani olib tashlash
          </button>
        </div>
      </div>
    </div>
  )
}

export function StoresPage() {
  const [searchParams] = useSearchParams()
  const routeSearch = searchParams.get('search') ?? ''
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(routeSearch)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null)
  const [form, setForm] = useState<StoreFormState>(INITIAL_STORE_FORM)
  const [editForm, setEditForm] = useState<StoreFormState>(INITIAL_STORE_FORM)
  const queryClient = useQueryClient()

  useEffect(() => {
    setSearch(routeSearch)
    setPage(1)
  }, [routeSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['stores', page, search],
    queryFn: ({ signal }) =>
      api
        .get<BackendPaginated<BackendStoreListItem>>('/admin/stores/', {
          params: { page, size: 20, search: search.trim() || undefined },
          signal,
        })
        .then((response) => normalizePaginated(response.data, mapStoreListItem)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: selectedStore } = useQuery({
    queryKey: ['store', selectedStoreId],
    queryFn: () =>
      api
        .get<BackendStoreResponse>(`/admin/stores/${selectedStoreId}`)
        .then((response) => mapStoreResponse(response.data)),
    enabled: Boolean(selectedStoreId),
  })

  useEffect(() => {
    if (!selectedStore) return
    setEditForm({
      name: selectedStore.name,
      responsiblePerson: selectedStore.contactPerson,
      secondaryResponsiblePerson: selectedStore.secondaryContactPerson ?? '',
      phone: selectedStore.phone,
      phoneSecondary: selectedStore.phoneSecondary ?? '',
      address: selectedStore.address,
      district: selectedStore.district,
      latitude: String(selectedStore.location.lat),
      longitude: String(selectedStore.location.lng),
      workingHours: selectedStore.workingHours?.raw ?? '',
      telegramId: selectedStore.telegramId ? String(selectedStore.telegramId) : '',
      telegramGroupId: selectedStore.telegramGroupId ? String(selectedStore.telegramGroupId) : '',
      isActive: selectedStore.isActive,
      productTypes: productTypesToList(selectedStore.productTypes),
    })
  }, [selectedStore])

  const createMutation = useMutation({
    mutationFn: (payload: StoreFormState) =>
      api.post('/admin/stores/', {
        name: payload.name.trim(),
        responsible_person: payload.responsiblePerson.trim(),
        secondary_responsible_person: payload.secondaryResponsiblePerson.trim() || undefined,
        phone: payload.phone.trim(),
        phone_secondary: payload.phoneSecondary.trim() || undefined,
        address: payload.address.trim(),
        district: payload.district.trim(),
        latitude: Number(payload.latitude),
        longitude: Number(payload.longitude),
        working_hours: payload.workingHours.trim(),
        telegram_id: payload.telegramId.trim() ? Number(payload.telegramId) : undefined,
        telegram_group_id: payload.telegramGroupId.trim() ? Number(payload.telegramGroupId) : undefined,
        is_active: payload.isActive,
        product_types: productTypesToRecord(payload.productTypes),
      }),
    onSuccess: () => {
      toast.success("Magazin qo'shildi")
      setIsCreateOpen(false)
      setForm(INITIAL_STORE_FORM)
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
    onError: () => toast.error("Magazinni qo'shib bo'lmadi"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/stores/${id}`),
    onSuccess: () => {
      toast.success("Magazin o'chirildi")
      setDeleteTarget(null)
      setSelectedStoreId(null)
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
    onError: () => toast.error("Magazinni o'chirib bo'lmadi"),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: StoreFormState) =>
      api.patch(`/admin/stores/${selectedStoreId}`, {
        name: payload.name.trim(),
        responsible_person: payload.responsiblePerson.trim(),
        secondary_responsible_person: payload.secondaryResponsiblePerson.trim() || undefined,
        phone: payload.phone.trim(),
        phone_secondary: payload.phoneSecondary.trim() || undefined,
        address: payload.address.trim(),
        district: payload.district.trim(),
        latitude: Number(payload.latitude),
        longitude: Number(payload.longitude),
        working_hours: payload.workingHours.trim() || undefined,
        telegram_id: payload.telegramId.trim() ? Number(payload.telegramId) : undefined,
        telegram_group_id: payload.telegramGroupId.trim() ? Number(payload.telegramGroupId) : undefined,
        is_active: payload.isActive,
        product_types: productTypesToRecord(payload.productTypes),
      }),
    onSuccess: () => {
      toast.success('Magazin yangilandi')
      setIsEditOpen(false)
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      queryClient.invalidateQueries({ queryKey: ['store', selectedStoreId] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Magazinni yangilab bo'lmadi")),
  })

  function updateForm<K extends keyof StoreFormState>(key: K, value: StoreFormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function handleMapSelect(coords: { latitude: number; longitude: number }) {
    setForm((previous) => ({
      ...previous,
      latitude: String(coords.latitude),
      longitude: String(coords.longitude),
    }))
  }

  function openCreateDialog() {
    setForm(INITIAL_STORE_FORM)
    setIsCreateOpen(true)
  }

  function handleCreateStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createMutation.mutate(form)
  }

  function handleUpdateStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateMutation.mutate(editForm)
  }

  const columns: Column<Store>[] = [
    {
      key: 'name',
      header: 'Magazin',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
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
      render: (row) => <span className="font-semibold text-primary">{row.leadsCount}</span>,
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
        <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
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
          <h1 className="page-title">Magazinlar</h1>
          <p className="page-subtitle">{data ? `${data.total} ta magazin` : 'Yuklanmoqda...'}</p>
        </div>
        <button className="kas-btn-primary w-full sm:w-auto" onClick={openCreateDialog}>
          <Plus size={16} />
          Magazin qo&apos;shish
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Nom, telefon yoki manzil..."
          className="w-full sm:w-72"
        />
      </div>

      <div className="kas-card">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyField="id"
          loading={isLoading}
          onRowClick={(row) => setSelectedStoreId(row.id)}
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
          emptyMessage="Magazin topilmadi"
        />
      </div>

      {selectedStore && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelectedStoreId(null)} />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Magazin tafsilotlari</h2>
                <p className="mt-1 text-xs font-mono text-text-muted">#{selectedStore.id.slice(-6).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedStoreId(null)} className="kas-btn-ghost rounded-md p-1.5">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 p-5">
              <div className="kas-card p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <MapPin size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-text-primary">{selectedStore.name}</p>
                      <p className="text-sm text-text-secondary">{selectedStore.district}</p>
                    </div>
                  </div>
                  <StatusBadge variant={selectedStore.isActive ? 'active' : 'inactive'} />
                </div>

                <div className="space-y-2.5">
                  <DrawerRow label="Mas'ul shaxs" value={selectedStore.contactPerson} />
                  {selectedStore.secondaryContactPerson && (
                    <DrawerRow label="Qo'shimcha mas'ul shaxs" value={selectedStore.secondaryContactPerson} />
                  )}
                  <DrawerRow label="Telefon" value={formatPhone(selectedStore.phone)} mono />
                  {selectedStore.phoneSecondary && (
                    <DrawerRow label="Qo'shimcha telefon" value={formatPhone(selectedStore.phoneSecondary)} mono />
                  )}
                  <DrawerRow label="Leadlar soni" value={String(selectedStore.leadsCount)} mono />
                </div>

                <div className="mt-4">
                  <button className="kas-btn-secondary w-full" onClick={() => setIsEditOpen(true)}>
                    Tahrirlash
                  </button>
                </div>
              </div>

              <div className="kas-card space-y-3 p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">Manzil va lokatsiya</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{selectedStore.address}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-surface-2 p-3">
                    <p className="text-xs uppercase tracking-wider text-text-muted">Latitude</p>
                    <p className="mt-1 font-mono text-sm text-text-primary">{selectedStore.location.lat}</p>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3">
                    <p className="text-xs uppercase tracking-wider text-text-muted">Longitude</p>
                    <p className="mt-1 font-mono text-sm text-text-primary">{selectedStore.location.lng}</p>
                  </div>
                </div>
              </div>

              <div className="kas-card space-y-3 p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">Ish vaqti</h3>
                <DrawerRow
                  label="Jadval"
                  value={selectedStore.workingHours?.raw ?? "Ko'rsatilmagan"}
                  mono
                />
                <DrawerRow label="Yaratilgan" value={formatRelative(selectedStore.createdAt)} />
              </div>

              <div className="kas-card space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <Send size={14} className="text-primary" />
                  <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">Telegram</h3>
                </div>
                {selectedStore.telegramId && <DrawerRow label="Telegram ID" value={String(selectedStore.telegramId)} mono />}
                {selectedStore.telegramGroupId && <DrawerRow label="Group ID" value={String(selectedStore.telegramGroupId)} mono />}
              </div>

              <div className="kas-card space-y-3 p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">Mahsulot turlari</h3>
                <div className="flex flex-wrap gap-2">
                  {productTypesToList(selectedStore.productTypes).map((type) => (
                    <span key={type} className="kas-badge border border-primary/20 bg-primary/10 text-primary">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      <ModalDialog
        open={isCreateOpen}
        title="Magazin qo'shish"
        description="Store yaratish backend contractiga mos JSON request yuboriladi."
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
              form="create-store-form"
              className="kas-btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saqlanmoqda...' : "Magazin qo'shish"}
            </button>
          </div>
        }
      >
        <form id="create-store-form" onSubmit={handleCreateStore} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Magazin nomi" required>
              <input
                className="kas-input"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="KAS Chilonzor"
                required
              />
            </FormField>

            <FormField label="Tuman" required>
              <input
                className="kas-input"
                value={form.district}
                onChange={(event) => updateForm('district', event.target.value)}
                placeholder="Chilonzor"
                required
              />
            </FormField>
          </div>

          <ContactFields
            responsiblePerson={form.responsiblePerson}
            phone={form.phone}
            secondaryResponsiblePerson={form.secondaryResponsiblePerson}
            phoneSecondary={form.phoneSecondary}
            onChange={(field, value) => updateForm(field, value)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Ish vaqti" required>
              <input
                className="kas-input"
                value={form.workingHours}
                onChange={(event) => updateForm('workingHours', event.target.value)}
                placeholder="09:00-18:00"
                required
              />
            </FormField>

            <FormField label="Telegram ID">
              <input
                className="kas-input"
                value={form.telegramId}
                onChange={(event) => updateForm('telegramId', event.target.value)}
                placeholder="9988776655"
              />
            </FormField>

            <FormField label="Telegram Group ID">
              <input
                className="kas-input"
                value={form.telegramGroupId}
                onChange={(event) => updateForm('telegramGroupId', event.target.value)}
                placeholder="-1001234567890"
              />
            </FormField>
          </div>

          <FormField label="Manzil" required>
            <textarea
              className="kas-input min-h-24 resize-none"
              value={form.address}
              onChange={(event) => updateForm('address', event.target.value)}
              placeholder="Chilonzor tumani, Bunyodkor ko'chasi 12"
              required
            />
          </FormField>

          <div className="kas-card p-4">
            <YandexMapPicker
              latitude={Number(form.latitude)}
              longitude={Number(form.longitude)}
              onSelect={handleMapSelect}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Latitude" required>
              <input
                type="number"
                step="0.000001"
                className="kas-input"
                value={form.latitude}
                onChange={(event) => updateForm('latitude', event.target.value)}
                required
              />
            </FormField>

            <FormField label="Longitude" required>
              <input
                type="number"
                step="0.000001"
                className="kas-input"
                value={form.longitude}
                onChange={(event) => updateForm('longitude', event.target.value)}
                required
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Mahsulot turlari">
              <ProductTypesField
                values={form.productTypes}
                onChange={(next) => updateForm('productTypes', next)}
              />
            </FormField>

            <FormField label="Holat">
              <label className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateForm('isActive', event.target.checked)}
                />
                Faol magazin
              </label>
            </FormField>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        open={Boolean(deleteTarget)}
        title="Magazinni o'chirish"
        description={`"${deleteTarget?.name}" magazinini o'chirishni tasdiqlaysizmi?`}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        className="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="kas-btn-secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Bekor qilish
            </button>
            <button
              type="button"
              className="kas-btn-danger"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'O‘chirilmoqda...' : "O'chirish"}
            </button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          Backend bu amalni soft delete sifatida bajaradi va magazin `inactive` holatga o&apos;tadi.
        </p>
      </ModalDialog>

      <ModalDialog
        open={isEditOpen}
        title="Magazinni tahrirlash"
        description="Store detail va update endpointlariga ulangan."
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
              form="edit-store-form"
              className="kas-btn-primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        }
      >
        <form id="edit-store-form" onSubmit={handleUpdateStore} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Magazin nomi" required>
              <input
                className="kas-input"
                value={editForm.name}
                onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="KAS Chilonzor"
                required
              />
            </FormField>

            <FormField label="Tuman" required>
              <input
                className="kas-input"
                value={editForm.district}
                onChange={(event) => setEditForm((current) => ({ ...current, district: event.target.value }))}
                placeholder="Chilonzor"
                required
              />
            </FormField>
          </div>

          <ContactFields
            responsiblePerson={editForm.responsiblePerson}
            phone={editForm.phone}
            secondaryResponsiblePerson={editForm.secondaryResponsiblePerson}
            phoneSecondary={editForm.phoneSecondary}
            onChange={(field, value) => setEditForm((current) => ({ ...current, [field]: value }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Ish vaqti">
              <input
                className="kas-input"
                value={editForm.workingHours}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, workingHours: event.target.value }))
                }
                placeholder="09:00-18:00"
              />
            </FormField>

            <FormField label="Telegram ID">
              <input
                className="kas-input"
                value={editForm.telegramId}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, telegramId: event.target.value }))
                }
                placeholder="9988776655"
              />
            </FormField>

            <FormField label="Telegram Group ID">
              <input
                className="kas-input"
                value={editForm.telegramGroupId}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, telegramGroupId: event.target.value }))
                }
                placeholder="-1001234567890"
              />
            </FormField>
          </div>

          <FormField label="Manzil" required>
            <textarea
              className="kas-input min-h-24 resize-none"
              value={editForm.address}
              onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))}
              placeholder="Chilonzor tumani, Bunyodkor ko'chasi 12"
              required
            />
          </FormField>

          <div className="kas-card p-4">
            <YandexMapPicker
              latitude={Number(editForm.latitude)}
              longitude={Number(editForm.longitude)}
              onSelect={(coords) =>
                setEditForm((current) => ({
                  ...current,
                  latitude: String(coords.latitude),
                  longitude: String(coords.longitude),
                }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Latitude" required>
              <input
                type="number"
                step="0.000001"
                className="kas-input"
                value={editForm.latitude}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, latitude: event.target.value }))
                }
                required
              />
            </FormField>

            <FormField label="Longitude" required>
              <input
                type="number"
                step="0.000001"
                className="kas-input"
                value={editForm.longitude}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, longitude: event.target.value }))
                }
                required
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Mahsulot turlari">
              <ProductTypesField
                values={editForm.productTypes}
                onChange={(next) =>
                  setEditForm((current) => ({ ...current, productTypes: next }))
                }
              />
            </FormField>

            <FormField label="Holat">
              <label className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                Faol magazin
              </label>
            </FormField>
          </div>
        </form>
      </ModalDialog>
    </div>
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
        {value}
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
