import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, FileText, Hash, Plus, Save, Search, Trash2, Trophy, Upload, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { getApiErrorMessage } from '@shared/api/errors'
import {
  AKSIYA_BASE,
  MULTIPART_HEADERS,
  PERIOD_LABELS,
  PERIOD_TONE,
  aksiyaKeys,
  buildPublicMediaUrl,
  formatPlainDate,
  formatSom,
  groupDigits,
  numberKey,
  parseDigits,
  renderNumberTemplate,
  type AksiyaNumberListItem,
  telegramUserName,
  type AksiyaSettings,
  type AksiyaSettingsPatch,
  type AksiyaVisibility,
  type AksiyaVisibleUser,
  type AksiyaWinnerInput,
} from '@shared/api/aksiya'
import { cn, formatPhone } from '@shared/lib/utils'
import { useDebouncedValue } from '@shared/lib/useDebouncedValue'
import { ConfirmDialog } from '@shared/ui/Controls'
import { KasLoader } from '@shared/ui/KasLoader'
import { useAksiyaSettings } from './queries'

const RULES_MAX_BYTES = 20 * 1024 * 1024
const RULES_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function SettingsTab() {
  const { data: settings, isLoading, isError, refetch } = useAksiyaSettings()

  if (isLoading) return <div className="py-16"><KasLoader /></div>
  if (isError || !settings) {
    return (
      <div className="kas-card flex flex-col items-center gap-3 p-10 text-sm text-danger">
        Sozlamalarni yuklab bo&apos;lmadi
        <button type="button" className="kas-btn-secondary" onClick={() => void refetch()}>Qayta urinish</button>
      </div>
    )
  }

  // Forms are keyed by the saved values: they reset after a save, but not on an unchanged refetch.
  const generalKey = JSON.stringify([
    settings.is_enabled,
    settings.start_date,
    settings.end_date,
    settings.amount_per_number,
    settings.rules_text_uz,
    settings.rules_text_ru,
  ])
  const winnersKey = JSON.stringify([settings.winners, settings.winners_published])
  const visibilityKey = JSON.stringify([settings.visibility, settings.visible_users.map((user) => user.telegram_id)])
  const numberFormatKey = JSON.stringify([settings.number_template, settings.number_formats])

  return (
    <div className="space-y-4 sm:space-y-6">
      <VisibilityCard key={visibilityKey} settings={settings} />
      <GeneralSettingsCard key={generalKey} settings={settings} />
      <NumberFormatCard key={numberFormatKey} settings={settings} />
      <RulesFileCard settings={settings} />
      <WinnersCard key={winnersKey} settings={settings} />
    </div>
  )
}

function useSaveSettings() {
  const queryClient = useQueryClient()
  return (settings: AksiyaSettings) => {
    queryClient.setQueryData(aksiyaKeys.settings, settings)
    void queryClient.invalidateQueries({ queryKey: aksiyaKeys.stats })
  }
}

function VisibilityCard({ settings }: { settings: AksiyaSettings }) {
  const applySettings = useSaveSettings()
  const [mode, setMode] = useState<AksiyaVisibility>(settings.visibility)
  const [users, setUsers] = useState<AksiyaVisibleUser[]>(settings.visible_users)
  const [search, setSearch] = useState('')
  const [confirmAll, setConfirmAll] = useState(false)
  const debouncedSearch = useDebouncedValue(search.trim(), 350)

  const savedIds = settings.visible_users.map((user) => user.telegram_id).join(',')
  const currentIds = users.map((user) => user.telegram_id).join(',')
  const dirty = mode !== settings.visibility || savedIds !== currentIds
  const selectedIds = new Set(users.map((user) => user.telegram_id))

  const results = useQuery({
    queryKey: [...aksiyaKeys.settings, 'telegram-users', debouncedSearch],
    queryFn: ({ signal }) =>
      api
        .get<{ items: AksiyaVisibleUser[] }>(`${AKSIYA_BASE}/telegram-users`, {
          params: { search: debouncedSearch || undefined, limit: 10 },
          signal,
        })
        .then((response) => response.data.items),
    enabled: mode === 'selected' && debouncedSearch.length >= 2,
    staleTime: 30 * 1000,
  })

  const mutation = useMutation({
    mutationFn: () =>
      api
        .patch<AksiyaSettings>(`${AKSIYA_BASE}/settings`, {
          visibility: mode,
          visible_telegram_ids: users.map((user) => user.telegram_id),
        } satisfies AksiyaSettingsPatch)
        .then((response) => response.data),
    onSuccess: (next) => {
      setConfirmAll(false)
      toast.success(
        next.visibility === 'all'
          ? "Aksiya bo'limi endi barcha foydalanuvchilarga ko'rinadi"
          : `Aksiya bo'limi faqat ${next.visible_users.length} ta foydalanuvchiga ko'rinadi`
      )
      applySettings(next)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Saqlab bo'lmadi")),
  })

  function save() {
    if (mode === 'all' && settings.visibility !== 'all') setConfirmAll(true)
    else mutation.mutate()
  }

  function addUser(user: AksiyaVisibleUser) {
    if (!selectedIds.has(user.telegram_id)) setUsers((previous) => [...previous, user])
    setSearch('')
  }

  // A bare Telegram id can be added even if that person hasn't written to the bot yet.
  const typedId = /^\d{5,15}$/.test(search.trim()) ? Number(search.trim()) : null
  const showTypedId =
    typedId != null && !selectedIds.has(typedId) && !(results.data ?? []).some((user) => user.telegram_id === typedId)

  return (
    <Card
      title="Kimlarga ko'rinadi"
      description="Botdagi «🎁 Aksiya 2026» tugmasi kimlarga chiqishini tanlang. Boshqalar bu bo'limni umuman ko'rmaydi."
      aside={
        <span className={cn('kas-badge shrink-0 whitespace-nowrap border', settings.visibility === 'all' ? 'border-success/40 text-success' : 'border-warning/40 text-warning')}>
          {settings.visibility === 'all' ? 'Hammaga' : `Tanlanganlar: ${settings.visible_users.length}`}
        </span>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            ['selected', Users, 'Faqat tanlangan foydalanuvchilar', "Sinov uchun: bo'lim faqat ro'yxatdagilarga chiqadi"],
            ['all', Eye, 'Barcha foydalanuvchilar', "Aksiya hamma uchun ochiladi"],
          ] as const).map(([value, Icon, title, hint]) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                mode === value ? 'border-primary bg-primary/5' : 'border-border bg-surface-2/60 hover:border-primary/40'
              )}
            >
              <input
                type="radio"
                name="aksiya-visibility"
                className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]"
                checked={mode === value}
                onChange={() => setMode(value)}
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                  <Icon size={15} /> {title}
                </span>
                <span className="block text-xs text-text-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        {mode === 'selected' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                className="kas-input pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ism, @username, telefon yoki Telegram ID bo'yicha qidiring"
                aria-label="Foydalanuvchi qidirish"
              />
            </div>
            {search.trim().length >= 2 ? (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
                {results.isFetching && !results.data ? (
                  <p className="p-3 text-sm text-text-muted">Qidirilmoqda...</p>
                ) : null}
                {(results.data ?? []).map((user) => {
                  const added = selectedIds.has(user.telegram_id)
                  return (
                    <button
                      key={user.telegram_id}
                      type="button"
                      disabled={added}
                      onClick={() => addUser(user)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-surface-2 disabled:cursor-default disabled:opacity-60"
                    >
                      <UserLine user={user} />
                      <span className="shrink-0 text-xs text-primary">{added ? "Qo'shilgan" : "+ Qo'shish"}</span>
                    </button>
                  )
                })}
                {showTypedId ? (
                  <button
                    type="button"
                    onClick={() =>
                      addUser({ telegram_id: typedId as number, first_name: null, last_name: null, username: null, phone: null, known: false })
                    }
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-2"
                  >
                    <span className="text-sm text-text-primary">Telegram ID: <span className="font-mono">{typedId}</span></span>
                    <span className="shrink-0 text-xs text-primary">+ ID bo&apos;yicha qo&apos;shish</span>
                  </button>
                ) : null}
                {!results.isFetching && results.data?.length === 0 && !showTypedId ? (
                  <p className="p-3 text-sm text-text-muted">Foydalanuvchi topilmadi</p>
                ) : null}
              </div>
            ) : null}

            {users.length === 0 ? (
              <p className="rounded-xl border border-dashed border-warning/50 p-4 text-center text-sm text-warning">
                Ro&apos;yxat bo&apos;sh — hozir bo&apos;lim hech kimga ko&apos;rinmaydi
              </p>
            ) : (
              <ul className="space-y-2">
                {users.map((user) => (
                  <li key={user.telegram_id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/50 px-3 py-2">
                    <UserLine user={user} />
                    <button
                      type="button"
                      className="kas-btn-ghost px-2"
                      onClick={() => setUsers((previous) => previous.filter((item) => item.telegram_id !== user.telegram_id))}
                      aria-label="Ro'yxatdan olib tashlash"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-success/40 bg-success/5 p-3 text-sm text-text-secondary">
            Saqlangach, «🎁 Aksiya 2026» botning barcha foydalanuvchilari menyusida chiqadi (≈10 soniya ichida).
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {dirty ? (
            <button
              type="button"
              className="kas-btn-ghost"
              onClick={() => {
                setMode(settings.visibility)
                setUsers(settings.visible_users)
              }}
              disabled={mutation.isPending}
            >
              Bekor qilish
            </button>
          ) : null}
          <button type="button" className="kas-btn-primary" disabled={!dirty || mutation.isPending} onClick={save}>
            <Save size={15} />
            {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmAll}
        title="Aksiyani hammaga ochish"
        description="«🎁 Aksiya 2026» botning BARCHA foydalanuvchilariga ko'rinadi va ular ariza topshira oladi. Davom etasizmi?"
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => mutation.mutate()}
        loading={mutation.isPending}
      />
    </Card>
  )
}

function UserLine({ user }: { user: AksiyaVisibleUser }) {
  return (
    <span className="min-w-0">
      <span className={cn('block truncate text-sm', user.known ? 'text-text-primary' : 'text-text-muted')}>
        {telegramUserName(user)}
        {user.username && telegramUserName(user) !== `@${user.username}` ? (
          <span className="ml-1.5 text-xs text-text-muted">@{user.username}</span>
        ) : null}
      </span>
      <span className="block truncate font-mono text-[11px] text-text-muted">
        ID {user.telegram_id}
        {user.phone ? ` · ${formatPhone(user.phone)}` : ''}
      </span>
    </span>
  )
}

interface GeneralForm {
  isEnabled: boolean
  startDate: string
  endDate: string
  amountPerNumber: string
  rulesUz: string
  rulesRu: string
}

function toGeneralForm(settings: AksiyaSettings): GeneralForm {
  return {
    isEnabled: settings.is_enabled,
    startDate: settings.start_date ?? '',
    endDate: settings.end_date ?? '',
    amountPerNumber: groupDigits(settings.amount_per_number),
    rulesUz: settings.rules_text_uz ?? '',
    rulesRu: settings.rules_text_ru ?? '',
  }
}

// PATCH is partial on the backend: send only changed fields; null clears a date or text.
function buildSettingsPatch(initial: GeneralForm, current: GeneralForm): AksiyaSettingsPatch {
  const patch: AksiyaSettingsPatch = {}
  if (initial.isEnabled !== current.isEnabled) patch.is_enabled = current.isEnabled
  if (initial.startDate !== current.startDate) patch.start_date = current.startDate || null
  if (initial.endDate !== current.endDate) patch.end_date = current.endDate || null
  const amount = parseDigits(current.amountPerNumber)
  if (amount != null && amount !== parseDigits(initial.amountPerNumber)) patch.amount_per_number = amount
  if (initial.rulesUz.trim() !== current.rulesUz.trim()) patch.rules_text_uz = current.rulesUz.trim() || null
  if (initial.rulesRu.trim() !== current.rulesRu.trim()) patch.rules_text_ru = current.rulesRu.trim() || null
  return patch
}

function GeneralSettingsCard({ settings }: { settings: AksiyaSettings }) {
  const applySettings = useSaveSettings()
  const [initial] = useState(() => toGeneralForm(settings))
  const [form, setForm] = useState(initial)

  const patch = buildSettingsPatch(initial, form)
  const dirty = Object.keys(patch).length > 0
  const amount = parseDigits(form.amountPerNumber)
  const dateError = form.startDate && form.endDate && form.startDate > form.endDate
    ? "Boshlanish sanasi tugash sanasidan keyin bo'lmasligi kerak"
    : null
  const amountError = !amount ? "1 raqam uchun summani kiriting" : null

  const mutation = useMutation({
    mutationFn: () => api.patch<AksiyaSettings>(`${AKSIYA_BASE}/settings`, patch).then((response) => response.data),
    onSuccess: (next) => {
      toast.success('Sozlamalar saqlandi')
      applySettings(next)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Sozlamalarni saqlab bo'lmadi")),
  })

  function update<K extends keyof GeneralForm>(key: K, value: GeneralForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  return (
    <Card
      title="Asosiy sozlamalar"
      description={`Bugun (Toshkent): ${formatPlainDate(settings.today)}. Bot shu sana bo'yicha aksiya holatini aniqlaydi.`}
      aside={<span className={cn('kas-badge border', PERIOD_TONE[settings.period])}>{PERIOD_LABELS[settings.period]}</span>}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (dirty && !dateError && !amountError) mutation.mutate()
        }}
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2/60 p-4">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]"
            checked={form.isEnabled}
            onChange={(event) => update('isEnabled', event.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-text-primary">Aksiya yoqilgan</span>
            <span className="block text-xs text-text-muted">
              O&apos;chirilsa, bot aksiya bo&apos;limini ko&apos;rsatmaydi va arizalar qabul qilinmaydi.
            </span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Boshlanish sanasi" hint="Undan oldin bot: «Aksiya ... dan boshlanadi»">
            <input type="date" className="kas-input" value={form.startDate} max={form.endDate || undefined} onChange={(event) => update('startDate', event.target.value)} />
          </Field>
          <Field label="Tugash sanasi" hint="Undan keyin bot: «Aksiya yakunlandi», arizalar yopiladi">
            <input type="date" className="kas-input" value={form.endDate} min={form.startDate || undefined} onChange={(event) => update('endDate', event.target.value)} />
          </Field>
          <Field label="1 raqam uchun summa (so'm)" hint={amount ? `Har ${formatSom(amount)} uchun 1 ta raqam` : undefined}>
            <input
              className="kas-input font-mono"
              inputMode="numeric"
              value={form.amountPerNumber}
              onChange={(event) => {
                const value = parseDigits(event.target.value)
                update('amountPerNumber', value == null ? '' : groupDigits(value))
              }}
              placeholder="10 000 000"
            />
          </Field>
        </div>
        {dateError || amountError ? <p className="text-xs text-danger">{dateError ?? amountError}</p> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Qoidalar matni (o'zbekcha)">
            <textarea className="kas-input min-h-40 resize-y" value={form.rulesUz} onChange={(event) => update('rulesUz', event.target.value)} maxLength={4096} />
            <Counter value={form.rulesUz} limit={4096} />
          </Field>
          <Field label="Qoidalar matni (ruscha)">
            <textarea className="kas-input min-h-40 resize-y" value={form.rulesRu} onChange={(event) => update('rulesRu', event.target.value)} maxLength={4096} />
            <Counter value={form.rulesRu} limit={4096} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {dirty ? (
            <button type="button" className="kas-btn-ghost" onClick={() => setForm(initial)} disabled={mutation.isPending}>
              Bekor qilish
            </button>
          ) : null}
          <button type="submit" className="kas-btn-primary" disabled={!dirty || Boolean(dateError || amountError) || mutation.isPending}>
            <Save size={15} />
            {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Card>
  )
}

function RulesFileCard({ settings }: { settings: AksiyaSettings }) {
  const applySettings = useSaveSettings()
  const inputRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api
        .post<AksiyaSettings>(`${AKSIYA_BASE}/settings/rules-file`, formData, { headers: MULTIPART_HEADERS })
        .then((response) => response.data)
    },
    onSuccess: (next) => {
      toast.success('Qoidalar fayli yuklandi')
      applySettings(next)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Faylni yuklab bo'lmadi")),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete<AksiyaSettings>(`${AKSIYA_BASE}/settings/rules-file`).then((response) => response.data),
    onSuccess: (next) => {
      toast.success("Qoidalar fayli o'chirildi")
      setConfirmDelete(false)
      applySettings(next)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Faylni o'chirib bo'lmadi")),
  })

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      toast.error('Faqat PDF, DOC yoki DOCX fayl')
      return
    }
    if (file.size > RULES_MAX_BYTES) {
      toast.error('Fayl hajmi 20 MB dan oshmasligi kerak')
      return
    }
    uploadMutation.mutate(file)
  }

  const fileUrl = buildPublicMediaUrl(settings.rules_file_url)

  return (
    <Card title="Qoidalar fayli (reglament)" description="PDF / DOC / DOCX, 20 MB gacha. Bot qatnashchilarga shu faylni yuboradi.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {settings.rules_file_name ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm hover:border-primary/50"
          >
            <FileText size={18} className="shrink-0 text-primary" />
            <span className="truncate text-text-primary">{settings.rules_file_name}</span>
          </a>
        ) : (
          <p className="text-sm text-text-muted">Fayl yuklanmagan</p>
        )}
        <div className="flex shrink-0 gap-2">
          <input ref={inputRef} type="file" accept={RULES_ACCEPT} className="hidden" onChange={handleFile} />
          <button type="button" className="kas-btn-secondary" onClick={() => inputRef.current?.click()} disabled={uploadMutation.isPending}>
            <Upload size={15} />
            {uploadMutation.isPending ? 'Yuklanmoqda...' : settings.rules_file_name ? 'Almashtirish' : 'Yuklash'}
          </button>
          {settings.rules_file_name ? (
            <button type="button" className="kas-btn-danger" onClick={() => setConfirmDelete(true)} aria-label="Faylni o'chirish">
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Qoidalar faylini o'chirish"
        description="Fayl botdan ham olib tashlanadi."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </Card>
  )
}

const TEMPLATE_PRESETS = (year: string) =>
  [
    { template: '####', hint: 'Oddiy' },
    { template: '#####', hint: '5 xonali' },
    { template: `${year}-####`, hint: 'Yil bilan' },
    { template: `AK${year.slice(2)}-####`, hint: 'Aksiya + yil' },
    { template: 'KAS-####', hint: 'Brend bilan' },
    { template: '№####', hint: 'Belgi bilan' },
  ] as const

function NumberFormatCard({ settings }: { settings: AksiyaSettings }) {
  const applySettings = useSaveSettings()
  const year = settings.today.slice(0, 4)
  const presets = TEMPLATE_PRESETS(year)
  const [template, setTemplate] = useState(settings.number_template)
  const [restart, setRestart] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const issuedTotal = settings.number_formats.reduce((sum, era) => sum + era.count, 0)
  const isPreset = presets.some((preset) => preset.template === template)
  const [custom, setCustom] = useState(!isPreset)

  const trimmed = template.trim()
  const counter = restart ? 1 : settings.next_counter
  const preview = renderNumberTemplate(trimmed, counter)
  const preview2 = renderNumberTemplate(trimmed, counter + 1)
  const error = !trimmed
    ? "Shablonni kiriting"
    : trimmed.length > 24
      ? "24 belgidan oshmasin"
      : !preview
        ? "Raqam o'rni uchun bitta «#» guruhi bo'lsin (1–8 ta #), masalan 2026-####"
        : !/^[0-9A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ№ _\-/.#]*$/.test(trimmed)
          ? "Faqat harf, raqam, probel va - _ / . № belgilari mumkin"
          : null
  const unchanged = trimmed === settings.number_template && !restart

  const mutation = useMutation({
    mutationFn: () =>
      api
        .put<AksiyaSettings>(`${AKSIYA_BASE}/settings/number-format`, { template: trimmed, restart })
        .then((response) => response.data),
    onSuccess: (next) => {
      setConfirmOpen(false)
      toast.success(`Shablon saqlandi. Keyingi raqam: ${next.next_number_display}`)
      applySettings(next)
    },
    onError: (err) => {
      setConfirmOpen(false)
      toast.error(getApiErrorMessage(err, "Shablonni saqlab bo'lmadi"))
    },
  })

  return (
    <Card
      title="Raqam shabloni"
      description="Qatnashchi raqamlari qanday ko'rinishda berilishini tanlang. Avval berilgan raqamlar o'zgarmaydi — yangi shablon faqat bundan keyin beriladigan raqamlarga qo'llanadi."
      aside={
        <span className="kas-badge shrink-0 whitespace-nowrap border border-primary/40 font-mono text-primary">
          Keyingisi: {settings.next_number_display}
        </span>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {presets.map((preset) => {
            const active = !custom && template === preset.template
            return (
              <button
                key={preset.template}
                type="button"
                onClick={() => {
                  setCustom(false)
                  setTemplate(preset.template)
                }}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-surface-2/60 hover:border-primary/40'
                )}
              >
                <span className="block font-mono text-sm font-semibold text-text-primary">{renderNumberTemplate(preset.template, 1)}</span>
                <span className="block text-[11px] text-text-muted">{preset.hint}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setCustom(true)}
            className={cn(
              'rounded-xl border p-3 text-left transition-colors',
              custom ? 'border-primary bg-primary/5' : 'border-border bg-surface-2/60 hover:border-primary/40'
            )}
          >
            <span className="flex items-center gap-1 text-sm font-semibold text-text-primary"><Hash size={14} /> O&apos;zim yozaman</span>
            <span className="block text-[11px] text-text-muted">Istalgan ko&apos;rinish</span>
          </button>
        </div>

        {custom ? (
          <Field label="Shablon" hint="«#» — raqam o'rni (nechta # bo'lsa, shuncha xonali). Masalan: 2026-####, KAS/#####, A-####-UZ">
            <input
              className="kas-input font-mono"
              value={template}
              maxLength={24}
              onChange={(event) => setTemplate(event.target.value)}
              placeholder={`${year}-####`}
              aria-label="Raqam shabloni"
            />
          </Field>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {([
            [false, 'Raqamlashni davom ettirish', `Keyingi raqam ${settings.next_counter} dan davom etadi`],
            [true, '1 dan boshlash', 'Yangi shablonda sanoq 0001 dan boshlanadi'],
          ] as const).map(([value, title, hint]) => (
            <label
              key={String(value)}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                restart === value ? 'border-primary bg-primary/5' : 'border-border bg-surface-2/60 hover:border-primary/40'
              )}
            >
              <input
                type="radio"
                name="aksiya-number-restart"
                className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]"
                checked={restart === value}
                onChange={() => setRestart(value)}
              />
              <span>
                <span className="block text-sm font-medium text-text-primary">{title}</span>
                <span className="block text-xs text-text-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-surface-2/60 p-4">
          <p className="text-xs text-text-muted">Yangi raqamlar shunday ko&apos;rinadi:</p>
          {error ? (
            <p className="mt-1 text-sm text-danger">{error}</p>
          ) : (
            <p className="mt-1 font-mono text-lg font-semibold text-primary">
              {preview}, {preview2}, ...
            </p>
          )}
        </div>

        {settings.number_formats.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/60 text-left text-[11px] uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Shablon</th>
                  <th className="px-3 py-2 font-medium">Berilgan raqamlar</th>
                  <th className="px-3 py-2 text-right font-medium">Soni</th>
                </tr>
              </thead>
              <tbody>
                {settings.number_formats.map((era) => (
                  <tr key={era.from_number} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">
                      {era.template}
                      {era.is_current ? <span className="kas-badge ml-2 bg-primary/10 font-sans text-primary">hozirgi</span> : null}
                    </td>
                    <td className="px-3 py-2 font-mono text-text-secondary">
                      {era.last_display ? `${era.first_display} – ${era.last_display}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">{era.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            className="kas-btn-primary"
            onClick={() => setConfirmOpen(true)}
            disabled={Boolean(error) || unchanged || mutation.isPending}
          >
            <Save size={15} /> Shablonni saqlash
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Raqam shablonini o'zgartirish"
        description={`Bundan keyin beriladigan raqamlar: ${preview ?? ''}, ${preview2 ?? ''}, ... ${
          issuedTotal ? `Avval berilgan ${issuedTotal} ta raqam o'zgarmaydi.` : ''
        }`}
        onCancel={() => setConfirmOpen(false)}
        confirmLabel="Saqlash"
        onConfirm={() => mutation.mutate()}
        loading={mutation.isPending}
      />
    </Card>
  )
}

interface WinnerDraft {
  key: string
  place: string
  number: string
  prize: string
}

let winnerKeySeed = 0
const nextWinnerKey = () => `w${++winnerKeySeed}`

function WinnersCard({ settings }: { settings: AksiyaSettings }) {
  const applySettings = useSaveSettings()
  const [rows, setRows] = useState<WinnerDraft[]>(() =>
    settings.winners.map((winner) => ({
      key: nextWinnerKey(),
      place: String(winner.place),
      number: winner.display,
      prize: winner.prize,
    }))
  )
  const [published, setPublished] = useState(settings.winners_published)
  const [dirty, setDirty] = useState(false)

  const savedByNumber = new Map(settings.winners.map((winner) => [numberKey(winner.display), winner]))

  const parsed = rows.map((row) => ({
    place: parseDigits(row.place),
    number: row.number.trim(),
    prize: row.prize.trim(),
  }))
  const places = parsed.map((row) => row.place).filter((value): value is number => value != null)
  const numbers = parsed.map((row) => numberKey(row.number)).filter(Boolean)
  const error =
    parsed.some((row) => !row.place || !row.number)
      ? "Har bir qatorda o'rin va raqam to'ldirilishi kerak"
      : new Set(places).size !== places.length
        ? "O'rinlar takrorlanmasligi kerak"
        : new Set(numbers).size !== numbers.length
          ? 'Raqamlar takrorlanmasligi kerak'
          : null

  const mutation = useMutation({
    mutationFn: () => {
      const winners: AksiyaWinnerInput[] = parsed.map((row) => ({
        place: row.place as number,
        number: row.number,
        prize: row.prize,
      }))
      return api
        .put<AksiyaSettings>(`${AKSIYA_BASE}/settings/winners`, { winners, winners_published: published })
        .then((response) => response.data)
    },
    onSuccess: (next) => {
      toast.success(next.winners_published ? "G'oliblar saqlandi va botda e'lon qilindi" : "G'oliblar saqlandi")
      applySettings(next)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "G'oliblarni saqlab bo'lmadi")),
  })

  function updateRow(key: string, field: keyof Omit<WinnerDraft, 'key'>, value: string) {
    setRows((previous) => previous.map((row) => (row.key === key ? { ...row, [field]: value } : row)))
    setDirty(true)
  }

  function addRow() {
    const nextPlace = places.length > 0 ? Math.max(...places) + 1 : 1
    setRows((previous) => [...previous, { key: nextWinnerKey(), place: String(nextPlace), number: '', prize: '' }])
    setDirty(true)
  }

  function removeRow(key: string) {
    setRows((previous) => previous.filter((row) => row.key !== key))
    setDirty(true)
  }

  return (
    <Card
      title="G'oliblar"
      description="Lototron natijalari. E'lon qilingach, bot g'oliblarni yashirilgan ismlar bilan ko'rsatadi."
      aside={<Trophy size={18} className="text-warning" />}
    >
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-text-muted">G&apos;oliblar hali kiritilmagan</p>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[70px_110px_1fr_1fr_40px] gap-2 px-1 text-[11px] font-medium uppercase tracking-wider text-text-muted md:grid">
              <span>O&apos;rin</span>
              <span>Raqam</span>
              <span>Sovrin</span>
              <span>Qatnashchi</span>
              <span />
            </div>
            {rows.map((row, index) => (
              <div key={row.key} className="grid grid-cols-[70px_1fr_40px] gap-2 rounded-xl border border-border bg-surface-2/50 p-2 md:grid-cols-[70px_110px_1fr_1fr_40px] md:border-0 md:bg-transparent md:p-0">
                <input
                  className="kas-input font-mono"
                  inputMode="numeric"
                  value={row.place}
                  onChange={(event) => updateRow(row.key, 'place', event.target.value.replace(/\D/g, ''))}
                  aria-label={`${index + 1}-qator o'rni`}
                  placeholder="1"
                />
                <input
                  className="kas-input font-mono"
                  value={row.number}
                  maxLength={40}
                  onChange={(event) => updateRow(row.key, 'number', event.target.value)}
                  aria-label={`${index + 1}-qator raqami`}
                  placeholder={settings.number_formats[0]?.first_display ?? '0001'}
                />
                <button type="button" className="kas-btn-ghost px-2 md:order-last" onClick={() => removeRow(row.key)} aria-label="Qatorni o'chirish">
                  <Trash2 size={15} />
                </button>
                <input
                  className="kas-input col-span-3 md:col-span-1"
                  value={row.prize}
                  maxLength={255}
                  onChange={(event) => updateRow(row.key, 'prize', event.target.value)}
                  placeholder="Sovrin, masalan: Chevrolet Labo"
                  aria-label={`${index + 1}-qator sovrini`}
                />
                <div className="col-span-3 md:col-span-1">
                  <WinnerParticipant number={row.number.trim()} saved={savedByNumber} />
                </div>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="kas-btn-secondary" onClick={addRow}>
          <Plus size={15} /> G&apos;olib qo&apos;shish
        </button>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2/60 p-4">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]"
            checked={published}
            onChange={(event) => {
              setPublished(event.target.checked)
              setDirty(true)
            }}
          />
          <span>
            <span className="block text-sm font-medium text-text-primary">Botda e&apos;lon qilish</span>
            <span className="block text-xs text-text-muted">Yoqilsa, g&apos;oliblar ro&apos;yxati botda ko&apos;rinadi.</span>
          </span>
        </label>

        {error && rows.length > 0 ? <p className="text-xs text-danger">{error}</p> : null}

        <div className="flex justify-end">
          <button
            type="button"
            className="kas-btn-primary"
            onClick={() => mutation.mutate()}
            disabled={!dirty || Boolean(error && rows.length > 0) || mutation.isPending}
          >
            <Save size={15} />
            {mutation.isPending ? 'Saqlanmoqda...' : "G'oliblarni saqlash"}
          </button>
        </div>
      </div>
    </Card>
  )
}

// Shows who owns a typed number: saved winners come resolved from the backend; a newly typed
// number («2026-0007», «0007» or «7») is resolved via /numbers/resolve with the template history.
function WinnerParticipant({
  number,
  saved,
}: {
  number: string
  saved: Map<string, AksiyaSettings['winners'][number]>
}) {
  const debounced = useDebouncedValue(number, 400)
  const savedWinner = number ? saved.get(numberKey(number)) : undefined
  const lookup = useQuery({
    queryKey: [...aksiyaKeys.numbers, 'resolve', debounced],
    queryFn: ({ signal }) =>
      api
        .get<AksiyaNumberListItem>(`${AKSIYA_BASE}/numbers/resolve`, { params: { q: debounced }, signal })
        .then((response) => response.data)
        .catch((error: { response?: { status?: number } }) => {
          if (error?.response?.status === 404) return null
          throw error
        }),
    enabled: Boolean(debounced) && !savedWinner,
    staleTime: 60 * 1000,
    retry: false,
  })

  if (!number) return <p className="px-1 py-2 text-xs text-text-muted">—</p>
  if (savedWinner?.full_name) {
    return <ParticipantLine name={savedWinner.full_name} phone={savedWinner.phone} />
  }
  if (lookup.isFetching || debounced !== number) return <p className="px-1 py-2 text-xs text-text-muted">Qidirilmoqda...</p>
  if (lookup.data) {
    const exact = numberKey(lookup.data.display) === numberKey(number)
    return <ParticipantLine name={lookup.data.full_name} phone={lookup.data.phone} hint={exact ? undefined : lookup.data.display} />
  }
  return <p className="px-1 py-2 text-xs text-danger">Bunday raqam berilmagan</p>
}

function ParticipantLine({ name, phone, hint }: { name: string; phone: string | null; hint?: string }) {
  return (
    <p className="truncate px-1 py-2 text-sm text-text-primary">
      {hint ? <span className="mr-2 font-mono text-xs font-semibold text-primary">{hint}</span> : null}
      {name}
      {phone ? <span className="ml-2 font-mono text-xs text-text-muted">{formatPhone(phone)}</span> : null}
    </p>
  )
}

function Card({ title, description, aside, children }: { title: string; description?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="kas-card p-4 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-text-secondary">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-text-muted">{hint}</p> : null}
    </div>
  )
}

function Counter({ value, limit }: { value: string; limit: number }) {
  return (
    <p className={cn('mt-1 text-right text-[11px]', value.length > limit ? 'text-danger' : 'text-text-muted')}>
      {value.length}/{limit}
    </p>
  )
}
