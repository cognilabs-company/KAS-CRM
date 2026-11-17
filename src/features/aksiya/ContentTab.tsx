import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Image as ImageIcon, Pencil, Plus, RefreshCw, Trash2, Type, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { getApiErrorMessage } from '@shared/api/errors'
import {
  AKSIYA_BASE,
  CAPTION_LIMIT,
  MULTIPART_HEADERS,
  TEXT_LIMIT,
  aksiyaKeys,
  buildPublicMediaUrl,
  type AksiyaBlockType,
  type AksiyaContentBlock,
  type AksiyaContentList,
} from '@shared/api/aksiya'
import { cn, truncate } from '@shared/lib/utils'
import { ConfirmDialog } from '@shared/ui/Controls'
import { KasLoader } from '@shared/ui/KasLoader'
import { ModalDialog } from '@shared/ui/ModalDialog'
import { Select } from '@shared/ui/Select'
import { SortableList } from '@features/menu-order/SortableList'

const MB = 1024 * 1024

const BLOCK_META: Record<AksiyaBlockType, { label: string; icon: typeof Video; accept?: string; maxBytes?: number; formats?: string }> = {
  video: { label: 'Video', icon: Video, accept: 'video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v', maxBytes: 50 * MB, formats: 'MP4 / MOV / WEBM / M4V, 50 MB gacha' },
  photo: { label: 'Rasm', icon: ImageIcon, accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp', maxBytes: 10 * MB, formats: 'JPG / PNG / WEBP, 10 MB gacha' },
  text: { label: 'Matn', icon: Type },
}

const BLOCK_TYPE_OPTIONS = (Object.keys(BLOCK_META) as AksiyaBlockType[]).map((value) => ({ value, label: BLOCK_META[value].label }))

function textLimit(blockType: AksiyaBlockType) {
  return blockType === 'text' ? TEXT_LIMIT : CAPTION_LIMIT
}

export function ContentTab() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<AksiyaContentBlock | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AksiyaContentBlock | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: aksiyaKeys.content,
    queryFn: () => api.get<AksiyaContentList>(`${AKSIYA_BASE}/content`).then((response) => response.data.items),
    staleTime: 0,
    refetchOnMount: true,
  })
  const blocks = data ?? []

  // Optimistic reorder; the server answer replaces the list, an error restores the previous one.
  const reorderMutation = useMutation({
    mutationFn: (ordered: AksiyaContentBlock[]) =>
      api
        .post<AksiyaContentList>(`${AKSIYA_BASE}/content/reorder`, { ordered_ids: ordered.map((block) => block.id) })
        .then((response) => response.data.items),
    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: aksiyaKeys.content })
      const previous = queryClient.getQueryData<AksiyaContentBlock[]>(aksiyaKeys.content)
      queryClient.setQueryData(aksiyaKeys.content, ordered.map((block, position) => ({ ...block, position })))
      return { previous }
    },
    onSuccess: (items) => queryClient.setQueryData(aksiyaKeys.content, items),
    onError: (error, _ordered, context) => {
      if (context?.previous) queryClient.setQueryData(aksiyaKeys.content, context.previous)
      toast.error(getApiErrorMessage(error, "Tartibni saqlab bo'lmadi"))
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (block: AksiyaContentBlock) => {
      const formData = new FormData()
      formData.append('is_active', String(!block.is_active))
      return api
        .patch<AksiyaContentBlock>(`${AKSIYA_BASE}/content/${block.id}`, formData, { headers: MULTIPART_HEADERS })
        .then((response) => response.data)
    },
    onSuccess: (updated) => replaceBlock(updated),
    onError: (error) => toast.error(getApiErrorMessage(error, "Holatni o'zgartirib bo'lmadi")),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`${AKSIYA_BASE}/content/${id}`),
    onSuccess: () => {
      toast.success("Blok o'chirildi")
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: aksiyaKeys.content })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Blokni o'chirib bo'lmadi")),
  })

  function replaceBlock(updated: AksiyaContentBlock) {
    queryClient.setQueryData<AksiyaContentBlock[]>(aksiyaKeys.content, (previous) =>
      (previous ?? []).map((block) => (block.id === updated.id ? updated : block))
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-secondary">
          Botdagi aksiya kirish sahifasi. Bloklar shu tartibda yuboriladi, tugmalar oxirgi blokka biriktiriladi.
        </p>
        <button type="button" className="kas-btn-primary w-full shrink-0 sm:w-auto" onClick={() => setEditing('new')}>
          <Plus size={15} /> Blok qo&apos;shish
        </button>
      </div>

      <div className="kas-card p-3 sm:p-4">
        {isLoading ? (
          <div className="py-10"><KasLoader /></div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-danger">
            Kontentni yuklab bo&apos;lmadi
            <button type="button" className="kas-btn-secondary" onClick={() => void refetch()}>
              <RefreshCw size={14} /> Qayta urinish
            </button>
          </div>
        ) : blocks.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">Hali blok qo&apos;shilmagan</p>
        ) : (
          <SortableList<AksiyaContentBlock>
            items={blocks}
            getKey={(block) => block.id}
            onReorder={(next) => reorderMutation.mutate(next)}
            renderItem={(block) => (
              <ContentBlockRow
                block={block}
                onEdit={() => setEditing(block)}
                onDelete={() => setDeleteTarget(block)}
                onToggle={() => toggleMutation.mutate(block)}
                toggling={toggleMutation.isPending && toggleMutation.variables?.id === block.id}
              />
            )}
          />
        )}
      </div>

      <ContentBlockDialog
        block={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved, isNew) => {
          if (isNew) void queryClient.invalidateQueries({ queryKey: aksiyaKeys.content })
          else replaceBlock(saved)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Blokni o'chirish"
        description="Blok va unga biriktirilgan media fayl butunlay o'chiriladi."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function ContentBlockRow({
  block,
  onEdit,
  onDelete,
  onToggle,
  toggling,
}: {
  block: AksiyaContentBlock
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  toggling: boolean
}) {
  const meta = BLOCK_META[block.block_type]
  const Icon = meta.icon
  const mediaUrl = buildPublicMediaUrl(block.media_url)
  const text = block.text_uz || block.text_ru

  return (
    <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
      <div className={cn('flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0', !block.is_active && 'opacity-50')}>
        <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2">
          {block.block_type === 'photo' && mediaUrl ? (
            <img src={mediaUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : block.block_type === 'video' && mediaUrl ? (
            <video src={mediaUrl} preload="metadata" muted className="h-full w-full object-cover" />
          ) : (
            <Icon size={20} className="text-text-muted" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="kas-badge bg-primary/10 text-primary"><Icon size={12} />{meta.label}</span>
            {!block.is_active ? <span className="kas-badge bg-surface-2 text-text-muted">o&apos;chirilgan</span> : null}
          </div>
          <p className="mt-1 truncate text-sm text-text-secondary">{text ? truncate(text, 120) : <span className="text-text-muted">Matnsiz</span>}</p>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center">
        <button type="button" className="kas-btn-ghost rounded-md p-1.5" onClick={onToggle} disabled={toggling} title={block.is_active ? "O'chirish (botda ko'rsatilmaydi)" : 'Yoqish'} aria-label={block.is_active ? "Blokni o'chirish" : 'Blokni yoqish'}>
          {block.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button type="button" className="kas-btn-ghost rounded-md p-1.5" onClick={onEdit} title="Tahrirlash" aria-label="Tahrirlash">
          <Pencil size={16} />
        </button>
        <button type="button" className="kas-btn-ghost rounded-md p-1.5 hover:text-danger" onClick={onDelete} title="O'chirish" aria-label="Blokni o'chirish">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

interface BlockForm {
  blockType: AksiyaBlockType
  textUz: string
  textRu: string
  isActive: boolean
  file: File | null
}

function ContentBlockDialog({
  block,
  onClose,
  onSaved,
}: {
  block: AksiyaContentBlock | 'new' | null
  onClose: () => void
  onSaved: (saved: AksiyaContentBlock, isNew: boolean) => void
}) {
  const isNew = block === 'new'
  const existing = block && block !== 'new' ? block : null
  const [form, setForm] = useState<BlockForm>({ blockType: 'video', textUz: '', textRu: '', isActive: true, file: null })
  const [filePreview, setFilePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!block) return
    setForm(
      existing
        ? { blockType: existing.block_type, textUz: existing.text_uz ?? '', textRu: existing.text_ru ?? '', isActive: existing.is_active, file: null }
        : { blockType: 'video', textUz: '', textRu: '', isActive: true, file: null }
    )
  }, [block])

  useEffect(() => {
    if (!form.file) {
      setFilePreview(null)
      return
    }
    const url = URL.createObjectURL(form.file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [form.file])

  const meta = BLOCK_META[form.blockType]
  const limit = textLimit(form.blockType)
  const needsFile = form.blockType !== 'text'
  const tooLong = form.textUz.length > limit || form.textRu.length > limit
  const error =
    isNew && needsFile && !form.file
      ? `${meta.label} faylini tanlang`
      : form.blockType === 'text' && !form.textUz.trim() && !form.textRu.trim()
        ? "Matn bloki uchun kamida bitta tilda matn kiriting"
        : tooLong
          ? `Matn ${limit} belgidan oshmasligi kerak`
          : null

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      if (isNew) formData.append('block_type', form.blockType)
      // On edit an empty string clears the text; on create empty fields are left out.
      if (!isNew || form.textUz.trim()) formData.append('text_uz', form.textUz.trim())
      if (!isNew || form.textRu.trim()) formData.append('text_ru', form.textRu.trim())
      formData.append('is_active', String(form.isActive))
      if (form.file) formData.append('file', form.file)
      const response = isNew
        ? await api.post<AksiyaContentBlock>(`${AKSIYA_BASE}/content`, formData, { headers: MULTIPART_HEADERS })
        : await api.patch<AksiyaContentBlock>(`${AKSIYA_BASE}/content/${existing?.id}`, formData, { headers: MULTIPART_HEADERS })
      return response.data
    },
    onSuccess: (saved) => {
      toast.success(isNew ? "Blok qo'shildi" : 'Blok saqlandi')
      onSaved(saved, isNew)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Blokni saqlab bo'lmadi")),
  })

  function update<K extends keyof BlockForm>(key: K, value: BlockForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function handleFile(file: File | null) {
    if (file && meta.maxBytes && file.size > meta.maxBytes) {
      toast.error(`Fayl juda katta. ${meta.formats}`)
      return
    }
    update('file', file)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!error && !mutation.isPending) mutation.mutate()
  }

  const currentMediaUrl = existing ? buildPublicMediaUrl(existing.media_url) : undefined
  const previewUrl = filePreview ?? currentMediaUrl

  return (
    <ModalDialog
      open={Boolean(block)}
      onClose={() => !mutation.isPending && onClose()}
      title={isNew ? "Yangi blok qo'shish" : 'Blokni tahrirlash'}
      description={needsFile ? `Media blok uchun matn — izoh (caption), Telegram cheklovi ${CAPTION_LIMIT} belgi.` : `Matn bloki, ${TEXT_LIMIT} belgigacha.`}
    >
      <form id="aksiya-content-form" className="space-y-4" onSubmit={handleSubmit}>
        {isNew ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Blok turi</label>
            <Select<AksiyaBlockType>
              value={form.blockType}
              onChange={(value) => setForm((previous) => ({ ...previous, blockType: value, file: null }))}
              options={BLOCK_TYPE_OPTIONS}
            />
          </div>
        ) : null}

        {needsFile ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              {meta.label} fayli {isNew ? '*' : '(almashtirish uchun tanlang)'}
            </label>
            <input
              key={form.blockType}
              type="file"
              accept={meta.accept}
              className="kas-input file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:text-primary"
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-[11px] text-text-muted">{meta.formats}</p>
            {previewUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-black/5">
                {form.blockType === 'photo' ? (
                  <img src={previewUrl} alt="" className="max-h-64 w-full object-contain" />
                ) : (
                  <video src={previewUrl} controls preload="metadata" className="max-h-64 w-full bg-black" />
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <TextField label="Matn (o'zbekcha)" value={form.textUz} limit={limit} onChange={(value) => update('textUz', value)} />
        <TextField label="Matn (ruscha)" value={form.textRu} limit={limit} onChange={(value) => update('textRu', value)} />

        <label className="flex cursor-pointer items-center gap-3 text-sm text-text-primary">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--primary))]" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} />
          Botda ko&apos;rsatish (faol)
        </label>

        {error ? <p className="text-xs text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button type="button" className="kas-btn-secondary" onClick={onClose} disabled={mutation.isPending}>
            Bekor qilish
          </button>
          <button type="submit" className="kas-btn-primary" disabled={Boolean(error) || mutation.isPending}>
            {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </ModalDialog>
  )
}

function TextField({ label, value, limit, onChange }: { label: string; value: string; limit: number; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</label>
      <textarea className="kas-input min-h-28 resize-y" value={value} onChange={(event) => onChange(event.target.value)} />
      <p className={cn('mt-1 text-right text-[11px]', value.length > limit ? 'text-danger' : 'text-text-muted')}>
        {value.length}/{limit}
      </p>
    </div>
  )
}
