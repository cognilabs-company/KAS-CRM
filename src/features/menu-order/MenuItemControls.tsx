import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check, Eye, EyeOff, Pencil, RotateCcw, X } from 'lucide-react'
import { cn } from '@shared/lib/utils'

const ICON_PRESETS = ['🔵', '🟡', '🟤', '🔴', '🟠', '🟢', '🚿', '🔥', '🔧', '💧', '🛁', '⚙️', '🧰', '📦']

// Raw override fields shared by categories and subcategories (null = not overridden).
export interface MenuItemNames {
  name_uz: string | null
  name_ru: string | null
  default_name: string
}

export interface MenuItemEdit {
  name_uz?: string | null
  name_ru?: string | null
  icon?: string | null
}

// Same fallback chain the backend uses for the bot and miniapp.
export function effectiveRu(item: MenuItemNames) {
  return item.name_ru || item.default_name
}

export function effectiveUz(item: MenuItemNames) {
  return item.name_uz || item.name_ru || item.default_name
}

interface MenuItemLabelProps {
  item: MenuItemNames
  icon?: string | null
  isHidden: boolean
  isEdited: boolean
  count?: number
  strong?: boolean
}

// UZ name on the first line; status badges, the RU name (when different) and the built-in
// name go on a second line so they never squeeze the main name.
export function MenuItemLabel({ item, icon, isHidden, isEdited, count, strong = false }: MenuItemLabelProps) {
  const uz = effectiveUz(item)
  const ru = effectiveRu(item)

  return (
    // Full width on phones so the action buttons wrap below instead of squeezing the name.
    <div className="min-w-0 flex-1 basis-full sm:basis-0">
      <div className={cn('flex min-w-0 items-center gap-2', isHidden && 'opacity-50')}>
        {icon ? <span className="shrink-0 text-base leading-none">{icon}</span> : null}
        <span className={cn('min-w-0 truncate text-sm text-text-primary', strong && 'font-medium')}>{uz}</span>
        {count !== undefined ? (
          <span className="hidden shrink-0 text-xs text-text-muted sm:inline">{count} ta</span>
        ) : null}
      </div>
      {isHidden || isEdited ? (
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-none">
          {isHidden ? (
            <span className="rounded bg-surface px-1.5 py-0.5 text-text-muted">yashirin</span>
          ) : null}
          {isEdited ? (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">o&apos;zgartirilgan</span>
          ) : null}
          {ru !== uz ? <span className="truncate text-text-secondary">RU: {ru}</span> : null}
          {ru !== item.default_name ? (
            <span className="truncate text-text-muted">asl: {item.default_name}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

interface MenuItemActionsProps {
  isHidden: boolean
  isEdited: boolean
  onToggleHidden: () => void
  onEdit: () => void
  onReset: () => void
  children?: ReactNode
}

export function MenuItemActions({ isHidden, isEdited, onToggleHidden, onEdit, onReset, children }: MenuItemActionsProps) {
  return (
    <div className="ml-auto flex shrink-0 items-center">
      {children}
      <button
        type="button"
        className="kas-btn-ghost rounded-md p-1.5"
        onClick={onToggleHidden}
        aria-label={isHidden ? "Menyuda ko'rsatish" : 'Menyudan yashirish'}
        title={isHidden ? "Menyuda ko'rsatish" : 'Menyudan yashirish'}
      >
        {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <button
        type="button"
        className="kas-btn-ghost rounded-md p-1.5"
        onClick={onEdit}
        aria-label="Tahrirlash"
        title="Tahrirlash"
      >
        <Pencil size={15} />
      </button>
      {isEdited ? (
        <button
          type="button"
          className="kas-btn-ghost rounded-md p-1.5"
          onClick={onReset}
          aria-label="Asl holiga qaytarish"
          title="Asl holiga qaytarish"
        >
          <RotateCcw size={15} />
        </button>
      ) : null}
    </div>
  )
}

// A blank value, or one equal to what the field would fall back to anyway, is stored as null
// so no redundant override is saved.
function toOverride(draft: string, fallback: string | null | undefined) {
  const value = draft.trim()
  return !value || value === fallback ? null : value
}

interface MenuItemEditorProps {
  item: MenuItemNames
  icon?: string | null
  defaultIcon?: string | null
  withIcon?: boolean
  onSave: (patch: MenuItemEdit) => void
  onCancel: () => void
}

export function MenuItemEditor({ item, icon, defaultIcon, withIcon = false, onSave, onCancel }: MenuItemEditorProps) {
  const [uzDraft, setUzDraft] = useState(item.name_uz ?? '')
  const [ruDraft, setRuDraft] = useState(item.name_ru ?? '')
  const [iconDraft, setIconDraft] = useState(icon ?? '')
  const uzInputRef = useRef<HTMLInputElement>(null)

  function save() {
    const nextRu = toOverride(ruDraft, item.default_name)
    // UZ falls back to RU, so compare against the RU name being saved.
    const nextUz = toOverride(uzDraft, nextRu ?? item.default_name)
    const patch: MenuItemEdit = {}
    if (nextRu !== item.name_ru) patch.name_ru = nextRu
    if (nextUz !== item.name_uz) patch.name_uz = nextUz
    if (withIcon) {
      const nextIcon = toOverride(iconDraft, defaultIcon)
      if (nextIcon !== (icon ?? null)) patch.icon = nextIcon
    }
    if (Object.keys(patch).length === 0) {
      onCancel()
      return
    }
    onSave(patch)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      save()
    }
    if (event.key === 'Escape') {
      // Keep the surrounding modal open.
      event.stopPropagation()
      onCancel()
    }
  }

  return (
    <div className="space-y-2 py-1">
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        {withIcon ? (
          <input
            className="kas-input w-14 shrink-0 px-2 text-center text-base"
            value={iconDraft}
            onChange={(event) => setIconDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={16}
            placeholder={defaultIcon ?? ''}
            aria-label="Ikonka"
            title="Ikonka"
          />
        ) : null}
        <label className="flex min-w-0 flex-1 basis-full items-center gap-1.5 sm:basis-0">
          <span className="w-6 shrink-0 text-xs font-medium text-text-muted">UZ</span>
          <input
            ref={uzInputRef}
            className="kas-input min-w-0 flex-1"
            value={uzDraft}
            onChange={(event) => setUzDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ruDraft.trim() || item.default_name}
            aria-label="Nomi (UZ)"
            autoFocus
          />
        </label>
        <label className="flex min-w-0 flex-1 basis-full items-center gap-1.5 sm:basis-0">
          <span className="w-6 shrink-0 text-xs font-medium text-text-muted">RU</span>
          <input
            className="kas-input min-w-0 flex-1"
            value={ruDraft}
            onChange={(event) => setRuDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={item.default_name}
            aria-label="Nomi (RU)"
          />
        </label>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button type="button" className="kas-btn-primary p-2" onClick={save} aria-label="Saqlash">
            <Check size={16} />
          </button>
          <button type="button" className="kas-btn-ghost p-2" onClick={onCancel} aria-label="Bekor qilish">
            <X size={16} />
          </button>
        </div>
      </div>
      {withIcon ? (
        <div className="flex flex-wrap gap-1">
          {ICON_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setIconDraft(preset)
                // Keep Enter-to-save working after picking a preset.
                uzInputRef.current?.focus()
              }}
              className={cn(
                'grid h-8 w-8 place-items-center rounded-md border text-base transition-colors',
                iconDraft === preset ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-surface'
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-text-muted">
        Bo&apos;sh qoldirilsa: RU uchun asl nom ({item.default_name}), UZ uchun RU nomi ishlatiladi.
      </p>
    </div>
  )
}
