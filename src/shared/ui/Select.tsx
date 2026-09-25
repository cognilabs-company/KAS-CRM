import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@shared/lib/utils'

export interface SelectOption<V extends string = string> {
  value: V
  label: string
  disabled?: boolean
}

interface SelectProps<V extends string> {
  value: V
  onChange: (value: V) => void
  options: SelectOption<V>[]
  // Shown when no option matches the value (e.g. an empty value with no '' option).
  placeholder?: string
  // Applied to the wrapper; use it for width classes.
  className?: string
  size?: 'md' | 'sm'
  disabled?: boolean
  required?: boolean
  // Adds a filter input at the top of the menu; meant for long lists.
  searchable?: boolean
  searchPlaceholder?: string
  id?: string
  'aria-label'?: string
}

const MENU_MAX_HEIGHT = 288
const VIEWPORT_MARGIN = 8

interface MenuPosition {
  style: CSSProperties
  maxHeight: number
}

// Styled replacement for the native <select>: a combobox button plus a listbox rendered in a
// portal, so it is not clipped by scrolling modals and drawers. Keyboard behaviour follows the
// native control (arrows, Home/End, Enter/Space, Escape, Tab, type-ahead).
export function Select<V extends string>({
  value,
  onChange,
  options,
  placeholder = 'Tanlang',
  className,
  size = 'md',
  disabled = false,
  required = false,
  searchable = false,
  searchPlaceholder = 'Qidirish...',
  id,
  'aria-label': ariaLabel,
}: SelectProps<V>) {
  const listboxId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])
  const typeahead = useRef({ text: '', timer: 0 })
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState<MenuPosition | null>(null)

  const selected = options.find((option) => option.value === value)

  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!searchable || !needle) return options
    return options.filter((option) => option.label.toLowerCase().includes(needle))
  }, [options, query, searchable])

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const desiredHeight = MENU_MAX_HEIGHT + (searchable ? 48 : 0)
    const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN
    const spaceAbove = rect.top - VIEWPORT_MARGIN
    const openUp = spaceBelow < Math.min(desiredHeight, 200) && spaceAbove > spaceBelow
    const width = Math.min(Math.max(rect.width, 160), viewportWidth - VIEWPORT_MARGIN * 2)
    const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), viewportWidth - width - VIEWPORT_MARGIN)
    const available = (openUp ? spaceAbove : spaceBelow) - 4

    setPosition({
      maxHeight: Math.max(Math.min(desiredHeight, available), 120),
      style: openUp
        ? { left, width, bottom: viewportHeight - rect.top + 4 }
        : { left, width, top: rect.bottom + 4 },
    })
  }, [searchable])

  function firstEnabled(list: SelectOption<V>[], from: number, step: 1 | -1) {
    for (let index = from; index >= 0 && index < list.length; index += step) {
      if (!list[index].disabled) return index
    }
    return -1
  }

  function openMenu() {
    if (disabled) return
    setQuery('')
    const selectedIndex = options.findIndex((option) => option.value === value)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled(options, 0, 1))
    updatePosition()
    setOpen(true)
  }

  function closeMenu(focusTrigger = true) {
    setOpen(false)
    setPosition(null)
    if (focusTrigger) triggerRef.current?.focus()
  }

  function choose(option: SelectOption<V> | undefined) {
    if (!option || option.disabled) return
    if (option.value !== value) onChange(option.value)
    closeMenu()
  }

  function moveActive(step: 1 | -1) {
    const start = activeIndex < 0 ? (step === 1 ? 0 : visibleOptions.length - 1) : activeIndex + step
    const next = firstEnabled(visibleOptions, start, step)
    if (next >= 0) setActiveIndex(next)
  }

  function handleTypeahead(key: string) {
    window.clearTimeout(typeahead.current.timer)
    typeahead.current.text += key.toLowerCase()
    typeahead.current.timer = window.setTimeout(() => {
      typeahead.current.text = ''
    }, 500)
    const match = options.findIndex(
      (option) => !option.disabled && option.label.toLowerCase().startsWith(typeahead.current.text)
    )
    if (match < 0) return
    if (open) setActiveIndex(match)
    else if (options[match].value !== value) onChange(options[match].value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openMenu()
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        handleTypeahead(event.key)
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveActive(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveActive(-1)
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(firstEnabled(visibleOptions, 0, 1))
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(firstEnabled(visibleOptions, visibleOptions.length - 1, -1))
        break
      case 'Enter':
        event.preventDefault()
        choose(visibleOptions[activeIndex])
        break
      case 'Escape':
        // Close only the menu, not a surrounding modal.
        event.preventDefault()
        event.stopPropagation()
        closeMenu()
        break
      case 'Tab':
        closeMenu(false)
        break
      default:
        if (!searchable && event.key === ' ') {
          event.preventDefault()
          choose(visibleOptions[activeIndex])
        } else if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          handleTypeahead(event.key)
        }
    }
  }

  // Keep the menu attached to the trigger while anything scrolls or the window resizes.
  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      closeMenu(false)
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [open])

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus()
  }, [open, searchable])

  useEffect(() => {
    if (open && activeIndex >= 0) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), [])

  const activeOptionId = open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined

  return (
    <div className={cn('relative w-full', className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={searchable ? undefined : activeOptionId}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60',
          size === 'md'
            ? 'kas-input cursor-pointer'
            : 'h-8 cursor-pointer rounded-md border border-border bg-surface px-2 text-xs text-text-primary outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30',
          open && 'border-primary ring-1 ring-primary/30'
        )}
      >
        <span className={cn('min-w-0 truncate', !selected && 'text-text-muted')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={size === 'md' ? 16 : 14}
          aria-hidden
          className={cn('shrink-0 text-text-muted transition-transform', open && 'rotate-180 text-primary')}
        />
      </button>

      {required ? (
        // Keeps native form validation: the form cannot submit while no value is chosen.
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => undefined}
          onInvalid={() => triggerRef.current?.focus()}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      ) : null}

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              style={position.style}
              className="fixed z-[70] flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            >
              {searchable ? (
                <div className="border-b border-border p-2">
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value)
                        setActiveIndex(0)
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={searchPlaceholder}
                      aria-label={searchPlaceholder}
                      aria-controls={listboxId}
                      aria-activedescendant={activeOptionId}
                      className="kas-input py-1.5 pl-8 text-sm"
                    />
                  </div>
                </div>
              ) : null}
              <div
                id={listboxId}
                role="listbox"
                aria-label={ariaLabel}
                style={{ maxHeight: position.maxHeight - (searchable ? 48 : 0) }}
                className="overflow-y-auto p-1"
              >
                {visibleOptions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-text-muted">Hech narsa topilmadi</p>
                ) : (
                  visibleOptions.map((option, index) => {
                    const isSelected = option.value === value
                    return (
                      <div
                        key={option.value}
                        ref={(node) => {
                          optionRefs.current[index] = node
                        }}
                        id={`${listboxId}-option-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        // Keep focus on the trigger/search input while clicking.
                        onPointerDown={(event) => event.preventDefault()}
                        onPointerEnter={() => !option.disabled && setActiveIndex(index)}
                        onClick={() => choose(option)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-text-primary',
                          index === activeIndex && 'bg-surface-2',
                          isSelected && 'font-medium text-primary',
                          option.disabled && 'cursor-not-allowed opacity-40'
                        )}
                      >
                        <span className="min-w-0 truncate">{option.label}</span>
                        {isSelected ? <Check size={14} className="shrink-0" aria-hidden /> : null}
                      </div>
                    )
                  })
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
