import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Check, ImagePlus, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { DEFAULT_APPEARANCE } from '@shared/lib/appearance'
import { useUIStore } from '@shared/lib/store'
import { cn } from '@shared/lib/utils'
import type {
  AccentMode,
  AppearancePreferences,
  AppearanceResponse,
  CardStyle,
  ContainerMode,
  DensityMode,
  MotionMode,
  ThemeMode,
} from '@shared/types/api'

const THEMES: Array<{ value: ThemeMode; label: string; description: string; preview: string }> = [
  { value: 'kas', label: 'KAS Brand', description: 'Kobalt va industrial ko‘k', preview: 'linear-gradient(145deg,#061227,#123b79)' },
  { value: 'dark', label: 'Qorong‘i', description: 'Sokin tungi ish maydoni', preview: 'linear-gradient(145deg,#080d17,#1b263b)' },
  { value: 'light', label: 'Yorug‘', description: 'Toza va yuqori kontrast', preview: 'linear-gradient(145deg,#fff,#e7edf7)' },
  { value: 'liquid', label: 'Liquid Glass', description: 'Ixtiyoriy shaffof qatlamlar', preview: 'linear-gradient(145deg,#06324c,#147c8c 52%,#172554)' },
]

const ACCENTS: Array<{ value: AccentMode; label: string; color: string }> = [
  { value: 'kas_blue', label: 'KAS Blue', color: '#2349a4' },
  { value: 'graphite', label: 'Graphite', color: '#475569' },
  { value: 'teal', label: 'Teal', color: '#0d9488' },
  { value: 'amber', label: 'Amber', color: '#d97706' },
  { value: 'kas_red', label: 'KAS Red', color: '#e01e2d' },
]

interface ChoiceProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}

function Choice<T extends string>({ value, options, onChange }: ChoiceProps<T>) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors',
            value === option.value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-surface-2/60 text-text-secondary hover:border-primary/40 hover:text-text-primary'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function AppearancePanel({ compact = false }: { compact?: boolean }) {
  const appearance = useUIStore((state) => state.appearance)
  const catalog = useUIStore((state) => state.appearanceCatalog)
  const setAppearance = useUIStore((state) => state.setAppearance)
  const setAppearanceResponse = useUIStore((state) => state.setAppearanceResponse)
  const [draft, setDraft] = useState(appearance)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => setDraft(appearance), [appearance])

  const update = <K extends keyof AppearancePreferences>(key: K, value: AppearancePreferences[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const save = async (next = draft) => {
    setSaving(true)
    setAppearance(next)
    try {
      const response = await api.put<AppearanceResponse>('/admin/appearance', next)
      setAppearanceResponse(response.data)
      toast.success('Ko‘rinish saqlandi')
    } catch {
      setAppearance(appearance)
      toast.error('Ko‘rinishni saqlab bo‘lmadi')
    } finally {
      setSaving(false)
    }
  }

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Rasm 5 MB dan kichik bo‘lishi kerak')
      return
    }
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const response = await api.post<AppearanceResponse>('/admin/appearance/backgrounds', form)
      setAppearanceResponse(response.data)
      const asset = response.data.backgrounds[0]
      if (asset) {
        const next = { ...response.data.preferences, background_kind: 'upload' as const, background_value: asset.id }
        setDraft(next)
        await save(next)
      }
    } catch {
      toast.error('Rasmni yuklab bo‘lmadi')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeAsset = async (assetId: string) => {
    setDeleting(assetId)
    try {
      const response = await api.delete<AppearanceResponse>(`/admin/appearance/backgrounds/${assetId}`)
      setAppearanceResponse(response.data)
      setDraft(response.data.preferences)
      toast.success('Fon o‘chirildi')
    } catch {
      toast.error('Fonni o‘chirib bo‘lmadi')
    } finally {
      setDeleting(null)
    }
  }

  const reset = () => {
    setDraft(DEFAULT_APPEARANCE)
    setAppearance(DEFAULT_APPEARANCE)
  }

  return (
    <div className={cn('space-y-8', compact && 'space-y-6')}>
      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Asosiy tema</h3>
          <p className="text-xs text-text-muted">Liquid tema faqat o‘zingiz tanlaganingizda ishlaydi.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              aria-pressed={draft.theme === theme.value}
              onClick={() => update('theme', theme.value)}
              className={cn(
                'relative min-h-28 overflow-hidden rounded-2xl border p-3 text-left transition-all',
                draft.theme === theme.value ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
              )}
              style={{ background: theme.preview }}
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex h-full flex-col justify-end">
                <p className="text-sm font-bold text-white">{theme.label}</p>
                <p className="text-[11px] text-white/70">{theme.description}</p>
              </div>
              {draft.theme === theme.value && <Check size={16} className="absolute right-3 top-3 text-white" />}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Aksent rangi</h3>
        <div className="grid grid-cols-5 gap-2">
          {ACCENTS.map((accent) => (
            <button key={accent.value} type="button" aria-label={accent.label} aria-pressed={draft.accent === accent.value} title={accent.label} onClick={() => update('accent', accent.value)} className={cn('flex h-11 items-center justify-center rounded-xl border transition-all', draft.accent === accent.value ? 'border-primary bg-primary/10' : 'border-border bg-surface-2')}>
              <span className="h-5 w-5 rounded-full" style={{ backgroundColor: accent.color }} />
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-5">
        <div><h3 className="mb-3 text-sm font-semibold text-text-primary">Zichlik</h3><Choice<DensityMode> value={draft.density} onChange={(value) => update('density', value)} options={[{ value: 'compact', label: 'Ixcham' }, { value: 'comfortable', label: 'Muvozanatli' }, { value: 'spacious', label: 'Keng' }]} /></div>
        <div><h3 className="mb-3 text-sm font-semibold text-text-primary">Kartalar</h3><Choice<CardStyle> value={draft.card_style} onChange={(value) => update('card_style', value)} options={[{ value: 'outlined', label: 'Konturli' }, { value: 'flat', label: 'Tekis' }, { value: 'elevated', label: 'Ko‘tarilgan' }]} /></div>
        <div><h3 className="mb-3 text-sm font-semibold text-text-primary">Kontent kengligi</h3><Choice<ContainerMode> value={draft.container} onChange={(value) => update('container', value)} options={[{ value: 'fluid', label: 'To‘liq' }, { value: 'boxed', label: 'Chegaralangan' }]} /></div>
        <div><h3 className="mb-3 text-sm font-semibold text-text-primary">Harakat</h3><Choice<MotionMode> value={draft.motion} onChange={(value) => update('motion', value)} options={[{ value: 'system', label: 'Tizim' }, { value: 'full', label: 'To‘liq' }, { value: 'reduced', label: 'Kamaytirilgan' }]} /></div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-text-primary">Fon</h3><p className="text-xs text-text-muted">KAS presetlari yoki shaxsiy rasm.</p></div><button type="button" className="text-xs font-semibold text-text-secondary hover:text-primary" onClick={() => update('background_kind', 'none')}>Fonsiz</button></div>
        <div className="grid grid-cols-2 gap-3">
          {catalog.presets.map((preset) => (
            <button key={preset.id} type="button" onClick={() => setDraft((current) => ({ ...current, background_kind: 'preset', background_value: preset.id }))} className={cn('relative h-20 overflow-hidden rounded-xl border', draft.background_kind === 'preset' && draft.background_value === preset.id ? 'border-primary ring-2 ring-primary/20' : 'border-border')} style={{ background: preset.value }}>
              <span className="absolute bottom-2 left-2 text-xs font-semibold text-white">{preset.label}</span>
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} />
        <button type="button" className="kas-btn-secondary mt-3 w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />} Rasm yuklash</button>
        {catalog.backgrounds.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3">{catalog.backgrounds.map((asset) => <div key={asset.id} className={cn('group relative overflow-hidden rounded-xl border', draft.background_kind === 'upload' && draft.background_value === asset.id ? 'border-primary ring-2 ring-primary/20' : 'border-border')}><button type="button" className="block w-full" onClick={() => setDraft((current) => ({ ...current, background_kind: 'upload', background_value: asset.id }))}><img src={asset.url} alt="Saqlangan fon" className="h-20 w-full object-cover" /></button><button type="button" aria-label="Fonni o‘chirish" disabled={deleting === asset.id} onClick={() => removeAsset(asset.id)} className="absolute right-2 top-2 rounded-lg bg-black/65 p-1.5 text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">{deleting === asset.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}</button></div>)}</div>}
        <div className="mt-4 rounded-xl border border-border bg-surface-2/45 px-3 py-3">
          <div className="mb-2 flex items-center justify-between text-xs"><label htmlFor="background-opacity" className="font-semibold text-text-secondary">Fon ko‘rinishi</label><span className="font-bold text-text-primary">{Math.round(draft.background_opacity * 100)}%</span></div>
          <input id="background-opacity" type="range" min="25" max="100" step="5" value={Math.round(draft.background_opacity * 100)} onChange={(event) => update('background_opacity', Number(event.target.value) / 100)} className="h-1.5 w-full cursor-pointer accent-primary" />
        </div>
      </section>

      <div className="sticky bottom-0 flex gap-2 border-t border-border bg-surface/90 py-4 backdrop-blur-xl">
        <button type="button" className="kas-btn-secondary" onClick={reset}><RotateCcw size={15} /> Standart</button>
        <button type="button" className="kas-btn-primary flex-1" disabled={saving} onClick={() => save()}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Saqlash</button>
      </div>
    </div>
  )
}
