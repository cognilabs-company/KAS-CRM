import { useSearchParams } from 'react-router-dom'
import { PERIOD_LABELS, PERIOD_TONE } from '@shared/api/aksiya'
import { cn } from '@shared/lib/utils'
import { useAksiyaStats } from '@features/aksiya/queries'
import { ApplicationsTab } from '@features/aksiya/ApplicationsTab'
import { NumbersTab } from '@features/aksiya/NumbersTab'
import { SettingsTab } from '@features/aksiya/SettingsTab'
import { ContentTab } from '@features/aksiya/ContentTab'

type Tab = 'applications' | 'numbers' | 'settings' | 'content'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'applications', label: 'Arizalar' },
  { key: 'numbers', label: 'Raqamlar' },
  { key: 'settings', label: 'Sozlamalar' },
  { key: 'content', label: 'Bot kontenti' },
]

function isTab(value: string | null): value is Tab {
  return TABS.some((tab) => tab.key === value)
}

export function AksiyaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: Tab = isTab(rawTab) ? rawTab : 'applications'
  const { data: stats } = useAksiyaStats()

  function selectTab(tab: Tab) {
    const next = new URLSearchParams()
    if (tab !== 'applications') next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="p-4 sm:p-6 max-w-content mx-auto space-y-4 sm:space-y-6">
      <div className="page-header mb-0 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Aksiya 2026</h1>
          <p className="page-subtitle">Arizalar, qatnashchi raqamlari, g&apos;oliblar va bot kontenti</p>
        </div>
        {stats ? (
          <span className={cn('kas-badge border w-fit', PERIOD_TONE[stats.period])}>
            Aksiya: {PERIOD_LABELS[stats.period]}
          </span>
        ) : null}
      </div>

      <div className="flex w-full sm:w-fit gap-1 overflow-x-auto bg-surface-2 p-1 rounded-lg">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => selectTab(tab.key)}
            className={cn(
              'flex-1 sm:flex-none whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
            {tab.key === 'applications' && stats && stats.pending > 0 ? (
              <span className="ml-1.5 kas-badge bg-warning/15 text-warning">{stats.pending}</span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === 'applications' && <ApplicationsTab />}
      {activeTab === 'numbers' && <NumbersTab />}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'content' && <ContentTab />}
    </div>
  )
}
