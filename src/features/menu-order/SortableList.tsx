import { Fragment, useState, type DragEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { cn } from '@shared/lib/utils'

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

interface SortableListProps<T> {
  items: T[]
  getKey: (item: T) => string
  renderItem: (item: T, index: number) => ReactNode
  renderBelow?: (item: T) => ReactNode
  onReorder: (next: T[]) => void
  disabled?: boolean
  className?: string
}

interface DragState {
  from: number
  // Gap the item will land in: 0 = before the first item, items.length = after the last.
  gap: number
  height: number
  // The source row is hidden one frame after dragstart; hiding it synchronously cancels the drag.
  hidden: boolean
}

function dropIndex(drag: DragState) {
  return drag.gap > drag.from ? drag.gap - 1 : drag.gap
}

// Position an item will have if the drag is dropped now, so row numbers stay contiguous.
function previewPosition(index: number, drag: DragState) {
  const to = dropIndex(drag)
  if (index === drag.from) return to
  const withoutSource = index > drag.from ? index - 1 : index
  return withoutSource >= to ? withoutSource + 1 : withoutSource
}

// Native HTML5 drag-and-drop plus up/down buttons (touch devices do not fire drag events).
// While dragging, the source row collapses and an empty slot opens at the drop position.
// Handlers only act when this list owns the drag and stop propagation, so lists can be
// nested inside renderBelow.
export function SortableList<T>({
  items,
  getKey,
  renderItem,
  renderBelow,
  onReorder,
  disabled = false,
  className,
}: SortableListProps<T>) {
  const [drag, setDrag] = useState<DragState | null>(null)

  function commit(from: number, to: number) {
    if (from === to || to < 0 || to >= items.length) return
    onReorder(moveItem(items, from, to))
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, index: number) {
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    // Firefox needs data set for the drag to start.
    event.dataTransfer.setData('text/plain', getKey(items[index]))
    const height = event.currentTarget.getBoundingClientRect().height
    setDrag({ from: index, gap: index, height, hidden: false })
    requestAnimationFrame(() => {
      setDrag((current) => (current && current.from === index ? { ...current, hidden: true } : current))
    })
  }

  function allowDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleItemDragOver(event: DragEvent<HTMLLIElement>, index: number) {
    if (!drag) return
    allowDrop(event)
    const rect = event.currentTarget.getBoundingClientRect()
    const gap = event.clientY < rect.top + rect.height / 2 ? index : index + 1
    if (gap !== drag.gap) setDrag({ ...drag, gap })
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    commit(drag.from, dropIndex(drag))
    setDrag(null)
  }

  const placeholder = drag ? (
    <li
      aria-hidden
      onDragOver={allowDrop}
      onDrop={handleDrop}
      style={{ height: drag.height }}
      className="flex items-center justify-center rounded-lg border-2 border-dashed border-primary/60 bg-primary/10 text-xs font-medium text-primary"
    >
      {dropIndex(drag) + 1}-o&apos;rin
    </li>
  ) : null

  return (
    <ul
      className={cn('space-y-2', className)}
      onDragOver={(event) => {
        // Keeps the gaps between rows droppable.
        if (drag) allowDrop(event)
      }}
      onDrop={handleDrop}
    >
      {items.map((item, index) => {
        const isSource = drag?.from === index
        const position = drag ? previewPosition(index, drag) : index

        return (
          <Fragment key={getKey(item)}>
            {drag && drag.gap === index ? placeholder : null}
            <li
              onDragOver={(event) => handleItemDragOver(event, index)}
              onDrop={handleDrop}
              className={cn(
                'rounded-lg border border-border bg-surface-2/60',
                isSource && (drag.hidden ? 'hidden' : 'opacity-40')
              )}
            >
              <div
                draggable={!disabled}
                onDragStart={(event) => handleDragStart(event, index)}
                onDragEnd={(event) => {
                  event.stopPropagation()
                  setDrag(null)
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-2',
                  !disabled && 'cursor-grab active:cursor-grabbing'
                )}
              >
                <GripVertical size={16} className="shrink-0 text-text-muted" aria-hidden />
                <span className="w-6 shrink-0 text-right font-mono text-xs text-text-muted">{position + 1}</span>
                <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    className="kas-btn-ghost rounded-md p-1.5 disabled:opacity-30"
                    onClick={() => commit(index, index - 1)}
                    disabled={disabled || index === 0}
                    aria-label="Yuqoriga ko'tarish"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    className="kas-btn-ghost rounded-md p-1.5 disabled:opacity-30"
                    onClick={() => commit(index, index + 1)}
                    disabled={disabled || index === items.length - 1}
                    aria-label="Pastga tushirish"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
              {renderBelow?.(item)}
            </li>
          </Fragment>
        )
      })}
      {drag && drag.gap === items.length ? placeholder : null}
    </ul>
  )
}
