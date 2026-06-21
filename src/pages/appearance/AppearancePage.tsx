import { AppearancePanel } from '@features/appearance/AppearancePanel'

export function AppearancePage() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="page-header"><h1 className="page-title">Ko‘rinish</h1><p className="page-subtitle">KAS CRM ish maydonini qurilmalar bo‘ylab shaxsiylashtiring.</p></div>
      <div className="kas-card p-5 sm:p-7"><AppearancePanel /></div>
    </div>
  )
}
