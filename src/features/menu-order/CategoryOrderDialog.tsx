import { useState } from 'react'
import { useIsMutating, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { ChevronRight, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { getApiErrorMessage } from '@shared/api/errors'
import type {
  BackendMenuOrderCategory,
  BackendMenuOrderCategoryPatch,
  BackendMenuOrderSubcategoriesResponse,
  BackendMenuOrderSubcategory,
  BackendMenuOrderSubcategoryPatch,
} from '@shared/api/backend'
import { ModalDialog } from '@shared/ui/ModalDialog'
import { KasLoader } from '@shared/ui/KasLoader'
import { cn } from '@shared/lib/utils'
import { SortableList } from './SortableList'
import { MenuItemActions, MenuItemEditor, MenuItemLabel } from './MenuItemControls'

const CATEGORIES_KEY = ['menu-order-categories'] as const
const subcategoriesKey = (category: string) => ['menu-order-subcategories', category] as const
const SAVE_MUTATION_KEY = 'menu-order-save'

// All writes to one list (reorder, edit, reset) are optimistic and share a mutation scope,
// so they reach the server in order. The list is refetched only after the last pending write
// settles, otherwise an intermediate refetch would briefly revert newer optimistic state.
function useListMutation<TData, TVariables>({
  queryKey,
  scopeId,
  request,
  applyOptimistic,
  errorMessage,
}: {
  queryKey: QueryKey
  scopeId: string
  request: (variables: TVariables) => Promise<unknown>
  applyOptimistic: (previous: TData, variables: TVariables) => TData
  errorMessage: string
}) {
  const queryClient = useQueryClient()
  const mutationKey = [SAVE_MUTATION_KEY, scopeId]

  return useMutation({
    mutationKey,
    scope: { id: scopeId },
    mutationFn: request,
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TData>(queryKey)
      if (previous !== undefined) {
        queryClient.setQueryData<TData>(queryKey, applyOptimistic(previous, variables))
      }
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      toast.error(getApiErrorMessage(error, errorMessage))
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) <= 1) {
        void queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}

function reorderBySlugs<T extends { slug: string; position: number }>(items: T[], orderedSlugs: string[]) {
  const bySlug = new Map(items.map((item) => [item.slug, item]))
  return orderedSlugs
    .map((slug) => bySlug.get(slug))
    .filter((item): item is T => Boolean(item))
    .map((item, position) => ({ ...item, position }))
}

interface EditableItem {
  slug: string
  name_uz: string | null
  name_ru: string | null
  icon?: string | null
  is_hidden: boolean
  is_edited: boolean
}

// Mirrors the backend: fields hold raw overrides and null means "use the default".
function applyPatch<T extends EditableItem>(item: T, patch: BackendMenuOrderCategoryPatch): T {
  const next = { ...item }
  if (patch.name_uz !== undefined) next.name_uz = patch.name_uz
  if (patch.name_ru !== undefined) next.name_ru = patch.name_ru
  if (patch.icon !== undefined) next.icon = patch.icon
  if (patch.is_hidden !== undefined) next.is_hidden = patch.is_hidden
  next.is_edited = Boolean(next.name_uz || next.name_ru || next.icon || next.is_hidden)
  return next
}

function resetItem<T extends EditableItem>(item: T): T {
  const next = { ...item, name_uz: null, name_ru: null, is_hidden: false, is_edited: false }
  if ('icon' in item) next.icon = null
  return next
}

function updateBySlug<T extends { slug: string }>(items: T[], slug: string, update: (item: T) => T) {
  return items.map((item) => (item.slug === slug ? update(item) : item))
}

function SubcategoryOrder({ category }: { category: string }) {
  const queryKey = subcategoriesKey(category)
  const scopeId = `menu-order-sub:${category}`
  const [editingSlug, setEditingSlug] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      api
        .get<BackendMenuOrderSubcategoriesResponse>('/admin/menu-order/subcategories', {
          params: { category },
          signal,
        })
        .then((response) => response.data),
    staleTime: 0,
    refetchOnMount: true,
  })

  const reorderMutation = useListMutation<BackendMenuOrderSubcategoriesResponse, string[]>({
    queryKey,
    scopeId,
    request: (orderedSlugs) =>
      api.put('/admin/menu-order/subcategories', { category, ordered_slugs: orderedSlugs }),
    applyOptimistic: (previous, orderedSlugs) => ({
      ...previous,
      subcategories: reorderBySlugs(previous.subcategories, orderedSlugs),
    }),
    errorMessage: "Tartibni saqlab bo'lmadi",
  })

  const patchMutation = useListMutation<
    BackendMenuOrderSubcategoriesResponse,
    { slug: string; patch: BackendMenuOrderSubcategoryPatch }
  >({
    queryKey,
    scopeId,
    request: ({ slug, patch }) => api.patch('/admin/menu-order/subcategories', { category, slug, ...patch }),
    applyOptimistic: (previous, { slug, patch }) => ({
      ...previous,
      subcategories: updateBySlug(previous.subcategories, slug, (item) => applyPatch(item, patch)),
    }),
    errorMessage: "Sub-kategoriyani saqlab bo'lmadi",
  })

  const resetMutation = useListMutation<BackendMenuOrderSubcategoriesResponse, string>({
    queryKey,
    scopeId,
    request: (slug) => api.delete('/admin/menu-order/subcategories', { params: { category, slug } }),
    applyOptimistic: (previous, slug) => ({
      ...previous,
      subcategories: updateBySlug(previous.subcategories, slug, resetItem),
    }),
    errorMessage: "Asl holiga qaytarib bo'lmadi",
  })

  if (isLoading) {
    return <div className="py-4"><KasLoader compact /></div>
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-2 py-2 text-sm text-danger">
        Sub-kategoriyalarni yuklab bo&apos;lmadi
        <button type="button" className="kas-btn-ghost text-xs" onClick={() => void refetch()}>
          <RefreshCw size={14} />
          Qayta urinish
        </button>
      </div>
    )
  }

  const subcategories = data?.subcategories ?? []

  if (subcategories.length === 0) {
    return <p className="py-2 text-sm text-text-muted">Sub-kategoriyalar yo&apos;q</p>
  }

  return (
    <SortableList<BackendMenuOrderSubcategory>
      items={subcategories}
      getKey={(item) => item.slug}
      onReorder={(next) => reorderMutation.mutate(next.map((item) => item.slug))}
      disabled={editingSlug !== null}
      renderItem={(item) =>
        editingSlug === item.slug ? (
          <MenuItemEditor
            item={item}
            onCancel={() => setEditingSlug(null)}
            onSave={(patch) => {
              patchMutation.mutate({ slug: item.slug, patch })
              setEditingSlug(null)
            }}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap">
            <MenuItemLabel
              item={item}
              isHidden={item.is_hidden}
              isEdited={item.is_edited}
              count={item.count}
            />
            <MenuItemActions
              isHidden={item.is_hidden}
              isEdited={item.is_edited}
              onToggleHidden={() => patchMutation.mutate({ slug: item.slug, patch: { is_hidden: !item.is_hidden } })}
              onEdit={() => setEditingSlug(item.slug)}
              onReset={() => resetMutation.mutate(item.slug)}
            />
          </div>
        )
      }
    />
  )
}

interface CategoryOrderDialogProps {
  open: boolean
  onClose: () => void
}

export function CategoryOrderDialog({ open, onClose }: CategoryOrderDialogProps) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const savingCount = useIsMutating({ mutationKey: [SAVE_MUTATION_KEY] })
  const scopeId = 'menu-order-root'

  const { data: categories = [], isLoading, isError, refetch } = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: ({ signal }) =>
      api
        .get<BackendMenuOrderCategory[]>('/admin/menu-order/categories', { signal })
        .then((response) => response.data),
    enabled: open,
    staleTime: 0,
    refetchOnMount: true,
  })

  const reorderMutation = useListMutation<BackendMenuOrderCategory[], string[]>({
    queryKey: CATEGORIES_KEY,
    scopeId,
    request: (orderedSlugs) => api.put('/admin/menu-order/categories', { ordered_slugs: orderedSlugs }),
    applyOptimistic: reorderBySlugs,
    errorMessage: "Tartibni saqlab bo'lmadi",
  })

  const patchMutation = useListMutation<
    BackendMenuOrderCategory[],
    { slug: string; patch: BackendMenuOrderCategoryPatch }
  >({
    queryKey: CATEGORIES_KEY,
    scopeId,
    request: ({ slug, patch }) => api.patch(`/admin/menu-order/categories/${encodeURIComponent(slug)}`, patch),
    applyOptimistic: (previous, { slug, patch }) => updateBySlug(previous, slug, (item) => applyPatch(item, patch)),
    errorMessage: "Kategoriyani saqlab bo'lmadi",
  })

  const resetMutation = useListMutation<BackendMenuOrderCategory[], string>({
    queryKey: CATEGORIES_KEY,
    scopeId,
    request: (slug) => api.delete(`/admin/menu-order/categories/${encodeURIComponent(slug)}`),
    applyOptimistic: (previous, slug) => updateBySlug(previous, slug, resetItem),
    errorMessage: "Asl holiga qaytarib bo'lmadi",
  })

  function handleClose() {
    setEditingSlug(null)
    onClose()
  }

  return (
    <ModalDialog
      open={open}
      onClose={handleClose}
      className="max-w-3xl"
      title="Kategoriyalar menyusi"
      description="Tartib, nom, ikonka va ko'rinishni boshqaring. O'zgarishlar darhol saqlanadi va bot hamda miniapp menyusida qo'llanadi. Nomni o'zgartirish mahsulotlar filtriga ta'sir qilmaydi."
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className={cn('text-xs', savingCount > 0 ? 'text-warning' : 'text-text-muted')}>
            {savingCount > 0 ? 'Saqlanmoqda...' : 'Barcha o‘zgarishlar saqlangan'}
          </span>
          <button type="button" className="kas-btn-secondary" onClick={handleClose}>
            Yopish
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div className="py-10"><KasLoader /></div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-sm text-danger">
          Kategoriyalarni yuklab bo&apos;lmadi
          <button type="button" className="kas-btn-secondary" onClick={() => void refetch()}>
            <RefreshCw size={14} />
            Qayta urinish
          </button>
        </div>
      ) : categories.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">Kategoriyalar topilmadi</p>
      ) : (
        <SortableList<BackendMenuOrderCategory>
          items={categories}
          getKey={(item) => item.slug}
          onReorder={(next) => reorderMutation.mutate(next.map((item) => item.slug))}
          disabled={editingSlug !== null}
          renderItem={(item) => {
            if (editingSlug === item.slug) {
              return (
                <MenuItemEditor
                  item={item}
                  icon={item.icon}
                  defaultIcon={item.default_icon}
                  withIcon
                  onCancel={() => setEditingSlug(null)}
                  onSave={(patch) => {
                    patchMutation.mutate({ slug: item.slug, patch })
                    setEditingSlug(null)
                  }}
                />
              )
            }

            const isExpanded = expandedSlug === item.slug
            return (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap">
                <MenuItemLabel
                  item={item}
                  icon={item.icon ?? item.default_icon}
                  isHidden={item.is_hidden}
                  isEdited={item.is_edited}
                  count={item.count}
                  strong
                />
                <MenuItemActions
                  isHidden={item.is_hidden}
                  isEdited={item.is_edited}
                  onToggleHidden={() => patchMutation.mutate({ slug: item.slug, patch: { is_hidden: !item.is_hidden } })}
                  onEdit={() => setEditingSlug(item.slug)}
                  onReset={() => resetMutation.mutate(item.slug)}
                >
                  <button
                    type="button"
                    className="kas-btn-ghost shrink-0 rounded-md px-2 py-1 text-xs"
                    onClick={() => setExpandedSlug(isExpanded ? null : item.slug)}
                    aria-expanded={isExpanded}
                    aria-label="Sub-kategoriyalar"
                    title="Sub-kategoriyalar"
                  >
                    <ChevronRight size={14} className={cn('transition-transform', isExpanded && 'rotate-90')} />
                  </button>
                </MenuItemActions>
              </div>
            )
          }}
          renderBelow={(item) =>
            expandedSlug === item.slug ? (
              <div className="border-t border-border px-3 py-3 sm:pl-10">
                <SubcategoryOrder category={item.slug} />
              </div>
            ) : null
          }
        />
      )}
    </ModalDialog>
  )
}
