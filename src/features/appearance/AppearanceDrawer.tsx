import { Palette, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppearancePanel } from './AppearancePanel'
import { useUIStore } from '@shared/lib/store'
import { cn } from '@shared/lib/utils'

export function AppearanceDrawer() {
  const open = useUIStore((state) => state.isAppearanceOpen)
  const close = useUIStore((state) => state.closeAppearance)
  const navigate = useNavigate()
  return (
    <>
      <div className={cn('fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-sm transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={close} />
      <aside className={cn('fixed right-0 top-0 z-[80] flex h-full w-[min(430px,94vw)] flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-300', open ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Palette size={18} /></div><div><h2 className="font-semibold text-text-primary">Ko‘rinish</h2><p className="text-xs text-text-muted">Shaxsiy ish maydoningiz</p></div></div><button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary"><X size={18} /></button></div>
        <div className="flex-1 overflow-y-auto px-5 py-5"><AppearancePanel compact /></div>
        <button type="button" className="border-t border-border px-5 py-3 text-left text-xs font-semibold text-primary hover:bg-surface-2" onClick={() => { close(); navigate('/appearance') }}>Barcha ko‘rinish sozlamalari →</button>
      </aside>
    </>
  )
}
