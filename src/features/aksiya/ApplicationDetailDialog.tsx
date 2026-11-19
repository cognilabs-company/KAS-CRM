import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  RefreshCw,
  ImageOff,
  Info,
  Ban,
  Send,
  X,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { getApiErrorMessage } from '@shared/api/errors'
import {
  AKSIYA_BASE,
  STATUS_BADGE,
  STATUS_LABELS,
  aksiyaKeys,
  buildPrivateFileUrl,
  consumerTypeLabel,
  formatBytes,
  formatSom,
  formatTashkent,
  groupDigits,
  parseDigits,
  isCopy,
  statusLabel,
  type AksiyaAnnulResponse,
  type AksiyaApplicationDetail,
  type AksiyaDuplicateRef,
  type AksiyaFile,
  type AksiyaParticipantSummary,
  type AksiyaReconcileResponse,
  type AksiyaReviewResponse,
} from '@shared/api/aksiya'
import { cn, formatPhone } from '@shared/lib/utils'
import { KasLoader } from '@shared/ui/KasLoader'
import { ModalDialog } from '@shared/ui/ModalDialog'
import { StatusBadge } from '@shared/ui/StatusBadge'
import { invalidateAfterReview } from './queries'

interface ApplicationDetailDialogProps {
  applicationId: string | null
  onClose: () => void
}

export function ApplicationDetailDialog({ applicationId, onClose }: ApplicationDetailDialogProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: aksiyaKeys.application(applicationId),
    queryFn: () =>
      api
        .get<AksiyaApplicationDetail>(`${AKSIYA_BASE}/applications/${applicationId}`)
        .then((response) => response.data),
    enabled: Boolean(applicationId),
    staleTime: 0,
    refetchOnMount: true,
  })

  return (
    <ModalDialog
      open={Boolean(applicationId)}
      onClose={onClose}
      className="max-w-4xl"
      title={data ? data.full_name : 'Ariza'}
      description={data ? `Ariza #${data.id.slice(-6).toUpperCase()} · ${formatTashkent(data.created_at)}` : undefined}
    >
      {isLoading ? (
        <div className="py-12"><KasLoader /></div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center gap-3 py-12 text-sm text-danger">
          Arizani yuklab bo&apos;lmadi
          <button type="button" className="kas-btn-secondary" onClick={() => void refetch()}>Qayta urinish</button>
        </div>
      ) : (
        // Keyed by id so per-application drafts (amount, reason, note) reset when switching.
        <ApplicationDetailBody key={data.id} application={data} />
      )}
    </ModalDialog>
  )
}

function ApplicationDetailBody({ application }: { application: AksiyaApplicationDetail }) {
  const queryClient = useQueryClient()
  const [lastResult, setLastResult] = useState<AksiyaReviewResponse | null>(null)
  const [note, setNote] = useState(application.note ?? '')

  const noteChanged = note.trim() !== (application.note ?? '').trim()

  function applyDetail(detail: AksiyaApplicationDetail) {
    queryClient.setQueryData(aksiyaKeys.application(detail.id), detail)
  }

  function handleReviewSuccess(result: AksiyaReviewResponse) {
    setLastResult(result)
    applyDetail(result.application)
    setNote(result.application.note ?? '')
    invalidateAfterReview(queryClient)
  }

  const noteMutation = useMutation({
    mutationFn: () =>
      api
        .patch<AksiyaApplicationDetail>(`${AKSIYA_BASE}/applications/${application.id}`, { note: note.trim() || null })
        .then((response) => response.data),
    onSuccess: (detail) => {
      toast.success('Izoh saqlandi')
      applyDetail(detail)
      setNote(detail.note ?? '')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Izohni saqlab bo'lmadi")),
  })

  const notifyMutation = useMutation({
    mutationFn: () =>
      api
        .post<AksiyaReviewResponse>(`${AKSIYA_BASE}/applications/${application.id}/notify`)
        .then((response) => response.data),
    onSuccess: (result) => {
      setLastResult(result)
      applyDetail(result.application)
      if (result.notified) toast.success('Xabar qatnashchiga yuborildi')
      else toast.error("Xabar yetib bormadi. Qatnashchi botni bloklagan bo'lishi mumkin")
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Xabarni yuborib bo'lmadi")),
  })

  const reconcileMutation = useMutation({
    mutationFn: () =>
      api
        .post<AksiyaReconcileResponse>(`${AKSIYA_BASE}/participants/${application.telegram_id}/reconcile`)
        .then((response) => response.data),
    onSuccess: (result) => {
      const count = result.issued_numbers.length
      const issued = count ? `${count} ta raqam berildi: ${result.issued_numbers.map((item) => item.display).join(', ')}` : 'Yangi raqam berilmadi'
      if (result.notified || !count) toast.success(issued)
      else toast.error(`${issued}. Telegram xabari yetib bormadi`)
      void queryClient.invalidateQueries({ queryKey: aksiyaKeys.application(application.id) })
      invalidateAfterReview(queryClient)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Raqamlarni qayta hisoblab bo'lmadi")),
  })

  const participant = application.participant
  // Proof of use is a photo or a video (stored in the same "video" field).
  const proofIsImage = Boolean(application.video?.mime_type?.toLowerCase().startsWith('image/'))
  // Files this application reused from an earlier one (red) vs. files a later application reused (amber).
  const mediaRefs = [...application.files.map((file) => file.duplicate_of), application.video?.duplicate_of]
  const copyCount = mediaRefs.filter((refs) => isCopy(refs)).length
  const reusedLaterCount = mediaRefs.filter((refs) => refs?.some((ref) => !ref.earlier)).length
  const photos = application.files.filter((file) => file.kind === 'photo')
  const documents = application.files.filter((file) => file.kind !== 'photo')
  const reviewed = application.status !== 'pending'
  // A reviewed application whose message never reached the participant.
  const notDelivered = lastResult ? !lastResult.notified : reviewed && !application.notified_at

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          variant={STATUS_BADGE[application.status]}
          label={application.annulled_at ? 'Bekor qilingan' : STATUS_LABELS[application.status]}
        />
        {application.numbers.length > 0 ? (
          <span className="text-xs text-text-muted">{application.numbers.length} ta raqam</span>
        ) : null}
      </div>

      {copyCount > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Takroriy fayl: {copyCount} ta fayl avvalroq boshqa arizada ishlatilgan</p>
            <p className="mt-0.5 text-xs">
              Bitta chekdan qayta foydalanib bo&apos;lmaydi (7.6-band). Quyida har bir fayl yonida qaysi arizada ishlatilgani ko&apos;rsatilgan.
            </p>
          </div>
        </div>
      ) : reusedLaterCount > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          <Info size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Bu ariza asl nusxa: {reusedLaterCount} ta fayl keyinroq boshqa arizada ham yuborilgan</p>
            <p className="mt-0.5 text-xs">Takroriy nusxalar o&apos;sha arizalarda belgilangan.</p>
          </div>
        </div>
      ) : null}

      {application.annulled_at ? (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <Ban size={18} className="mt-0.5 shrink-0" />
          <span>Tasdiq {formatTashkent(application.annulled_at)} da bekor qilingan, raqamlar olib tashlangan.</span>
        </div>
      ) : null}

      {lastResult ? (
        <ReviewResultBanner result={lastResult} />
      ) : null}

      {participant.missing > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-warning">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              Qatnashchiga jami summasi bo&apos;yicha yana {participant.missing} ta raqam berilishi kerak, lekin hali berilmagan.
            </span>
          </div>
          <button
            type="button"
            className="kas-btn-secondary shrink-0"
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending}
          >
            <RefreshCw size={14} className={cn(reconcileMutation.isPending && 'animate-spin')} />
            {reconcileMutation.isPending ? 'Hisoblanmoqda...' : `Raqamlarni qayta hisoblash (+${participant.missing})`}
          </button>
        </div>
      ) : null}

      {notDelivered ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-warning">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>Telegram xabari qatnashchiga yetib bormadi.</span>
          </div>
          <button
            type="button"
            className="kas-btn-secondary shrink-0"
            onClick={() => notifyMutation.mutate()}
            disabled={notifyMutation.isPending}
          >
            <Send size={14} />
            {notifyMutation.isPending ? 'Yuborilmoqda...' : 'Qayta yuborish'}
          </button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <InfoRow label="F.I.Sh">{application.full_name}</InfoRow>
        <InfoRow label="Telefon">
          {application.phone ? <span className="font-mono">{formatPhone(application.phone)}</span> : '—'}
        </InfoRow>
        <InfoRow label="Telegram">
          <span className="font-mono">{application.telegram_id}</span>
          {application.username ? <span className="ml-2 text-text-muted">@{application.username}</span> : null}
        </InfoRow>
        <InfoRow label="Iste'molchi turi">{consumerTypeLabel(application.consumer_type)}</InfoRow>
        <InfoRow label="Viloyat / tuman">
          {application.location || application.region_name || '—'}
        </InfoRow>
        <InfoRow label="Do'kon">
          {application.store_name || '—'}
          {application.store_name && !application.store_id ? (
            <span className="block text-xs text-text-muted">Ro&apos;yxatda yo&apos;q, qo&apos;lda yozilgan</span>
          ) : null}
        </InfoRow>
        <InfoRow label="Ko'rsatilgan summa">
          {application.claimed_amount != null ? formatSom(application.claimed_amount) : '—'}
          {application.amount_text && application.amount_text !== String(application.claimed_amount) ? (
            <span className="block text-xs text-text-muted">Yozilgan: &laquo;{application.amount_text}&raquo;</span>
          ) : null}
        </InfoRow>
        <InfoRow label="Tasdiqlangan summa">
          {application.confirmed_amount != null ? (
            <span className="font-medium text-success">{formatSom(application.confirmed_amount)}</span>
          ) : '—'}
        </InfoRow>
        <InfoRow label="Rozilik berilgan">{formatTashkent(application.consent_at)}</InfoRow>
        <InfoRow label="Ko'rib chiqildi">
          {application.reviewed_at ? (
            <>
              {formatTashkent(application.reviewed_at)}
              {application.reviewed_by_name ? <span className="block text-xs text-text-muted">{application.reviewed_by_name}</span> : null}
            </>
          ) : '—'}
        </InfoRow>
        {reviewed ? (
          <InfoRow label="Xabar yuborildi">{formatTashkent(application.notified_at)}</InfoRow>
        ) : null}
        {application.status === 'rejected' && application.reject_reason ? (
          <InfoRow label="Rad etish sababi" className="sm:col-span-2">
            <span className="whitespace-pre-wrap text-danger">{application.reject_reason}</span>
          </InfoRow>
        ) : null}
      </section>

      <ParticipantTotals participant={participant} />

      {application.numbers.length > 0 ? (
        <Section title="Qatnashchi raqamlari">
          <div className="flex flex-wrap gap-2">
            {application.numbers.map((item) => (
              <span key={item.number} className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-sm font-semibold text-primary">
                {item.display}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title={proofIsImage ? 'Isbot (rasm)' : 'Isbot (video)'}>
        {application.video ? (
          application.video.available && application.video.url ? (
            <div className="space-y-2">
              {proofIsImage ? (
                <a href={buildPrivateFileUrl(application.video.url)} target="_blank" rel="noreferrer">
                  <img
                    alt="Isbot rasmi"
                    className="max-h-[420px] w-full rounded-xl border border-border bg-black object-contain"
                    src={buildPrivateFileUrl(application.video.url)}
                  />
                </a>
              ) : (
                <video
                  controls
                  preload="metadata"
                  className="max-h-[420px] w-full rounded-xl border border-border bg-black"
                  src={buildPrivateFileUrl(application.video.url)}
                />
              )}
              <a className="kas-btn-ghost text-xs w-fit" href={buildPrivateFileUrl(application.video.url, true)}>
                <Download size={14} /> {proofIsImage ? 'Rasmni' : 'Videoni'} yuklab olish {formatBytes(application.video.size)}
              </a>
              <DuplicateWarning refs={application.video.duplicate_of} subject={proofIsImage ? 'Bu rasm' : 'Bu video'} />
            </div>
          ) : (
            <div className="space-y-2">
              <Unavailable text="Isbotni Telegramdan yuklab bo'lmadi" />
              <DuplicateWarning refs={application.video.duplicate_of} subject={proofIsImage ? 'Bu rasm' : 'Bu video'} />
            </div>
          )
        ) : (
          <p className="text-sm text-text-muted">Isbot yuborilmagan</p>
        )}
      </Section>

      <Section title={`Nakladnoylar (${application.files.length})`}>
        {application.files.length === 0 ? (
          <p className="text-sm text-text-muted">Fayllar yo&apos;q</p>
        ) : (
          <div className="space-y-3">
            {photos.length > 0 ? <PhotoGallery photos={photos} /> : null}
            {documents.length > 0 ? (
              <ul className="space-y-2">
                {documents.map((file) => (
                  <li key={file.index}>
                    {file.available && file.url ? (
                      <a
                        href={buildPrivateFileUrl(file.url, true)}
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm hover:border-primary/50"
                      >
                        <FileText size={18} className="shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-text-primary">{file.file_name || `Fayl ${file.index + 1}`}</span>
                        <span className="shrink-0 text-xs text-text-muted">{formatBytes(file.size)}</span>
                        <Download size={15} className="shrink-0 text-text-muted" />
                      </a>
                    ) : (
                      <Unavailable text={`${file.file_name || `Fayl ${file.index + 1}`}: faylni yuklab bo'lmadi`} />
                    )}
                    <DuplicateWarning refs={file.duplicate_of} className="mt-1.5" />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </Section>

      <Section title="Ichki izoh">
        <p className="mb-2 text-xs text-text-muted">Faqat operatorlar uchun, qatnashchiga ko&apos;rsatilmaydi.</p>
        <textarea
          className="kas-input min-h-20 resize-y"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Masalan: nakladnoy summasi do'kon bilan tekshirildi"
          maxLength={2000}
        />
        {noteChanged ? (
          <div className="mt-2 flex justify-end">
            <button type="button" className="kas-btn-secondary" onClick={() => noteMutation.mutate()} disabled={noteMutation.isPending}>
              {noteMutation.isPending ? 'Saqlanmoqda...' : 'Izohni saqlash'}
            </button>
          </div>
        ) : null}
      </Section>

      {application.status === 'pending' ? (
        <ReviewActions
          application={application}
          note={noteChanged ? note.trim() || undefined : undefined}
          onSuccess={handleReviewSuccess}
        />
      ) : null}

      {application.status === 'approved' ? (
        <AnnulSection
          application={application}
          hasDuplicates={copyCount > 0 || application.has_duplicates}
          onDone={(detail) => {
            setLastResult(null)
            applyDetail(detail)
            invalidateAfterReview(queryClient)
          }}
        />
      ) : null}
    </div>
  )
}

const ANNUL_DUPLICATE_REASON = 'Chek takroriy yuborilgan (7.6-band)'

function AnnulSection({
  application,
  hasDuplicates,
  onDone,
}: {
  application: AksiyaApplicationDetail
  hasDuplicates: boolean
  onDone: (detail: AksiyaApplicationDetail) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(hasDuplicates ? ANNUL_DUPLICATE_REASON : '')
  const canSubmit = reason.trim().length >= 2

  const annulMutation = useMutation({
    mutationFn: () =>
      api
        .post<AksiyaAnnulResponse>(`${AKSIYA_BASE}/applications/${application.id}/annul`, { reason: reason.trim() })
        .then((response) => response.data),
    onSuccess: (result) => {
      const removed = result.removed_numbers.map((item) => item.display)
      const reissued = result.reissued_numbers.map((item) => item.display)
      let message = removed.length
        ? `Bekor qilindi: ${removed.join(', ')} ${removed.length > 1 ? 'raqamlari' : 'raqami'} olib tashlandi`
        : 'Bekor qilindi'
      if (reissued.length) message += `. Qayta berildi: ${reissued.join(', ')}`
      toast.success(message, { duration: 6000 })
      if (!result.notified) toast.error('Telegram xabari qatnashchiga yetib bormadi')
      setOpen(false)
      onDone(result.application)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Tasdiqni bekor qilib bo'lmadi")),
  })

  if (!open) {
    return (
      <div className="flex justify-end">
        <button type="button" className="kas-btn-danger" onClick={() => setOpen(true)}>
          <Ban size={16} /> Tasdiqni bekor qilish
        </button>
      </div>
    )
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-danger/40 bg-danger/5 p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit && !annulMutation.isPending) annulMutation.mutate()
      }}
    >
      <div className="flex items-start gap-2 text-sm text-danger">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          Ariza &laquo;Rad etildi&raquo; holatiga o&apos;tadi va unga berilgan raqamlar
          {application.numbers.length ? ` (${application.numbers.map((item) => item.display).join(', ')})` : ''} olib
          tashlanadi. Qatnashchiga sabab Telegramda yuboriladi.
        </p>
      </div>
      <label className="block text-xs font-medium text-text-secondary">
        Sabab (qatnashchiga yuboriladi)
        <textarea
          className="kas-input mt-1.5 min-h-20 resize-y"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={1000}
          placeholder={ANNUL_DUPLICATE_REASON}
          autoFocus
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted">{reason.length}/1000</span>
        <div className="flex gap-2">
          <button type="button" className="kas-btn-secondary" onClick={() => setOpen(false)} disabled={annulMutation.isPending}>
            Ortga
          </button>
          <button type="submit" className="kas-btn-danger" disabled={!canSubmit || annulMutation.isPending}>
            <Ban size={16} />
            {annulMutation.isPending ? 'Bekor qilinmoqda...' : 'Bekor qilishni tasdiqlash'}
          </button>
        </div>
      </div>
    </form>
  )
}

function DuplicateWarning({
  refs,
  className,
  subject = 'Bu chek',
}: {
  refs?: AksiyaDuplicateRef[]
  className?: string
  subject?: string
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  if (!refs?.length) return null

  function openApplication(id: string) {
    const next = new URLSearchParams(searchParams)
    next.set('applicationId', id)
    setSearchParams(next, { replace: false })
  }

  function renderRef(ref: AksiyaDuplicateRef) {
    return (
      <>
        <button
          type="button"
          className="font-semibold underline underline-offset-2 hover:opacity-80"
          onClick={() => openApplication(ref.application_id)}
        >
          {ref.full_name}
        </button>{' '}
        ({formatTashkent(ref.created_at)}, {statusLabel(ref.status)})
      </>
    )
  }

  const earlier = refs.filter((ref) => ref.earlier)
  const later = refs.filter((ref) => !ref.earlier)

  return (
    <div className={cn('space-y-1.5', className)}>
      {earlier.length ? (
        <div className="space-y-1 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {earlier.map((ref) => (
            <p key={ref.application_id}>⚠️ {subject} boshqa arizada ishlatilgan: {renderRef(ref)}</p>
          ))}
        </div>
      ) : null}
      {later.length ? (
        <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {later.map((ref) => (
            <p key={ref.application_id}>ℹ️ {subject} keyinroq boshqa arizada ham yuborilgan: {renderRef(ref)}</p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ReviewActions({
  application,
  note,
  onSuccess,
}: {
  application: AksiyaApplicationDetail
  note?: string
  onSuccess: (result: AksiyaReviewResponse) => void
}) {
  const [mode, setMode] = useState<'approve' | 'reject'>('approve')
  const [amountInput, setAmountInput] = useState(
    application.claimed_amount != null ? groupDigits(application.claimed_amount) : ''
  )
  const [reason, setReason] = useState('')

  const amount = parseDigits(amountInput)
  const { approved_amount: approvedSoFar, numbers_total: numbersTotal, amount_per_number: amountPerNumber } =
    application.participant
  // Numbers are cumulative per participant: (all approved + this amount) // step - already issued.
  const preview =
    amount != null && amount > 0 && amountPerNumber > 0
      ? (() => {
          const total = approvedSoFar + amount
          const totalNumbers = Math.floor(total / amountPerNumber)
          return {
            total,
            totalNumbers,
            newNumbers: Math.max(0, totalNumbers - numbersTotal),
            toNext: amountPerNumber - (total % amountPerNumber),
          }
        })()
      : null
  const canApprove = amount != null && amount > 0
  const canReject = reason.trim().length >= 2

  const approveMutation = useMutation({
    mutationFn: () =>
      api
        .post<AksiyaReviewResponse>(`${AKSIYA_BASE}/applications/${application.id}/approve`, {
          confirmed_amount: amount,
          note,
        })
        .then((response) => response.data),
    onSuccess: (result) => {
      const count = result.issued_numbers.length
      toast.success(
        count ? `Tasdiqlandi: ${count} ta raqam berildi` : "Tasdiqlandi: yangi raqam berilmadi, summa jamg'arildi"
      )
      onSuccess(result)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Arizani tasdiqlab bo'lmadi")),
  })

  const rejectMutation = useMutation({
    mutationFn: () =>
      api
        .post<AksiyaReviewResponse>(`${AKSIYA_BASE}/applications/${application.id}/reject`, {
          reason: reason.trim(),
          note,
        })
        .then((response) => response.data),
    onSuccess: (result) => {
      toast.success('Ariza rad etildi')
      onSuccess(result)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Arizani rad etib bo'lmadi")),
  })

  const isPending = approveMutation.isPending || rejectMutation.isPending

  return (
    <section className="rounded-xl border border-border bg-surface-2/50 p-4">
      <div className="mb-4 flex gap-1 rounded-lg bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setMode('approve')}
          className={cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium', mode === 'approve' ? 'bg-surface text-success shadow-sm' : 'text-text-secondary')}
        >
          Tasdiqlash
        </button>
        <button
          type="button"
          onClick={() => setMode('reject')}
          className={cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium', mode === 'reject' ? 'bg-surface text-danger shadow-sm' : 'text-text-secondary')}
        >
          Rad etish
        </button>
      </div>

      {mode === 'approve' ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (canApprove && !isPending) approveMutation.mutate()
          }}
        >
          <label className="block text-xs font-medium text-text-secondary">
            Tekshirilgan umumiy summa (so&apos;m)
            <input
              className="kas-input mt-1.5 font-mono text-base"
              inputMode="numeric"
              value={amountInput}
              onChange={(event) => {
                const value = parseDigits(event.target.value)
                setAmountInput(value == null ? '' : groupDigits(value))
              }}
              placeholder="20 000 000"
              autoFocus
            />
          </label>
          <div className="text-xs text-text-muted">
            Qatnashchi ko&apos;rsatgan: {application.claimed_amount != null ? formatSom(application.claimed_amount) : '—'}
            {application.amount_text ? <> · &laquo;{application.amount_text}&raquo;</> : null}
            {amountPerNumber ? <> · 1 raqam = {formatSom(amountPerNumber)}</> : null}
          </div>
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium',
              !preview ? 'bg-surface text-text-muted' : preview.newNumbers > 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            )}
          >
            {!preview ? (
              'Summani kiriting'
            ) : (
              <>
                <p>
                  Jami: {formatSom(preview.total)} → {preview.totalNumbers} ta raqam
                  {preview.newNumbers > 0 ? <> · bu ariza bilan +{preview.newNumbers} ta yangi raqam</> : null}
                </p>
                {preview.newNumbers === 0 ? (
                  <p className="mt-0.5">
                    Yangi raqam berilmaydi — summa jamg&apos;ariladi (keyingi raqamgacha {formatSom(preview.toNext)})
                  </p>
                ) : null}
                {approvedSoFar > 0 ? (
                  <p className="mt-0.5 text-xs font-normal opacity-80">
                    Avval tasdiqlangan: {formatSom(approvedSoFar)} · berilgan: {numbersTotal} ta raqam
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div className="flex justify-end">
            <button type="submit" className="kas-btn-primary" disabled={!canApprove || isPending}>
              <Check size={16} />
              {approveMutation.isPending ? 'Tasdiqlanmoqda...' : preview && preview.newNumbers === 0 ? 'Tasdiqlash' : 'Tasdiqlash va raqam berish'}
            </button>
          </div>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (canReject && !isPending) rejectMutation.mutate()
          }}
        >
          <label className="block text-xs font-medium text-text-secondary">
            Rad etish sababi (qatnashchiga Telegramda yuboriladi)
            <textarea
              className="kas-input mt-1.5 min-h-24 resize-y"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              placeholder="Masalan: nakladnoy o'qib bo'lmaydi, iltimos, aniqroq rasm yuboring"
              autoFocus
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-text-muted">{reason.length}/1000</span>
            <button type="submit" className="kas-btn-danger" disabled={!canReject || isPending}>
              <XCircle size={16} />
              {rejectMutation.isPending ? 'Yuborilmoqda...' : 'Rad etish'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function ReviewResultBanner({ result }: { result: AksiyaReviewResponse }) {
  if (result.application.status === 'approved') {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-4">
        {result.issued_numbers.length > 0 ? (
          <>
            <p className="text-sm font-medium text-success">
              Ariza tasdiqlandi. Berilgan raqamlar ({result.issued_numbers.length}):
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.issued_numbers.map((item) => (
                <span key={item.number} className="rounded-lg bg-surface px-3 py-1 font-mono text-sm font-semibold text-success">
                  {item.display}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm font-medium text-success">
            Ariza tasdiqlandi. Yangi raqam berilmadi — summa jamg&apos;arildi
            {result.application.participant.to_next > 0
              ? ` (keyingi raqamgacha ${formatSom(result.application.participant.to_next)})`
              : ''}
            .
          </p>
        )}
        {result.notified ? <p className="mt-2 text-xs text-success">Qatnashchiga Telegram orqali xabar yuborildi.</p> : null}
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
      Ariza rad etildi.{result.notified ? ' Sabab qatnashchiga yuborildi.' : ''}
    </div>
  )
}

function ParticipantTotals({ participant }: { participant: AksiyaParticipantSummary }) {
  return (
    <Section title="Qatnashchi jami">
      <div className="grid gap-3 sm:grid-cols-3">
        <InfoRow label="Tasdiqlangan summa">{formatSom(participant.approved_amount)}</InfoRow>
        <InfoRow label="Berilgan raqamlar">{participant.numbers_total} ta</InfoRow>
        <InfoRow label="Keyingi raqamgacha">{formatSom(participant.to_next)}</InfoRow>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Raqamlar qatnashchining barcha tasdiqlangan arizalari jami summasi bo&apos;yicha beriladi; qoldiq keyingi arizaga o&apos;tadi.
      </p>
    </Section>
  )
}

function PhotoGallery({ photos }: { photos: AksiyaFile[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const available = photos.filter((photo) => photo.available && photo.url)
  const current = openIndex != null ? available[openIndex] : null

  useEffect(() => {
    if (openIndex == null) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpenIndex(null)
      }
      if (event.key === 'ArrowRight') setOpenIndex((index) => (index == null ? index : (index + 1) % available.length))
      if (event.key === 'ArrowLeft') setOpenIndex((index) => (index == null ? index : (index - 1 + available.length) % available.length))
    }
    // Capture phase so Escape closes the lightbox before the surrounding dialog.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [available.length, openIndex])

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {photos.map((photo) =>
          photo.available && photo.url ? (
            <button
              key={photo.index}
              type="button"
              onClick={() => setOpenIndex(available.indexOf(photo))}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-xl border bg-surface-2',
                isCopy(photo.duplicate_of) ? 'border-danger ring-2 ring-danger/40' : 'border-border'
              )}
            >
              <img
                src={buildPrivateFileUrl(photo.url)}
                alt={photo.file_name || `Rasm ${photo.index + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              {isCopy(photo.duplicate_of) ? (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  ⚠️ Takroriy
                </span>
              ) : null}
            </button>
          ) : (
            <div key={photo.index} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface-2 p-2 text-center text-xs text-text-muted">
              <ImageOff size={20} />
              Faylni yuklab bo&apos;lmadi
            </div>
          )
        )}
      </div>
      {photos
        .filter((photo) => photo.duplicate_of?.length)
        .map((photo) => (
          <div key={photo.index} className="mt-2">
            <p className="mb-1 text-xs font-medium text-text-secondary">{photo.file_name || `Rasm ${photo.index + 1}`}:</p>
            <DuplicateWarning refs={photo.duplicate_of} />
          </div>
        ))}

      {current ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setOpenIndex(null)}>
          <img
            src={buildPrivateFileUrl(current.url)}
            alt={current.file_name || 'Rasm'}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <div className="absolute right-4 top-4 flex gap-2" onClick={(event) => event.stopPropagation()}>
            <a className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" href={buildPrivateFileUrl(current.url, true)} aria-label="Yuklab olish">
              <Download size={18} />
            </a>
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setOpenIndex(null)} aria-label="Yopish">
              <X size={18} />
            </button>
          </div>
          {available.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenIndex((index) => (index == null ? index : (index - 1 + available.length) % available.length))
                }}
                aria-label="Oldingi"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenIndex((index) => (index == null ? index : (index + 1) % available.length))
                }}
                aria-label="Keyingi"
              >
                <ChevronRight size={22} />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                {(openIndex ?? 0) + 1} / {available.length}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h3>
      {children}
    </section>
  )
}

function InfoRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface-2/60 px-3 py-2.5', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <div className="mt-1 break-words text-sm text-text-primary">{children}</div>
    </div>
  )
}

function Unavailable({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 px-3 py-2 text-sm text-text-muted">
      <AlertTriangle size={15} className="shrink-0 text-warning" />
      {text}
    </div>
  )
}
