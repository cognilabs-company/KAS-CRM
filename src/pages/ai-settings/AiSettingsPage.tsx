import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, TestTube } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import type { AiSettings } from '@shared/types/api'

type Tab = 'prompt' | 'logic' | 'blacklist'

const TABS: { key: Tab; label: string }[] = [
  { key: 'prompt', label: 'Prompt' },
  { key: 'logic', label: 'Logika' },
  { key: 'blacklist', label: 'Blacklist' },
]

export function AiSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('prompt')
  const qc = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => api.get<AiSettings>('/ai-settings').then((r) => r.data),
  })

  const promptMutation = useMutation({
    mutationFn: (systemPrompt: string) =>
      api.put('/ai-settings/prompt', { systemPrompt }),
    onSuccess: () => {
      toast.success('Prompt saqlandi')
      qc.invalidateQueries({ queryKey: ['ai-settings'] })
    },
  })

  const [promptValue, setPromptValue] = useState('')

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface rounded w-48" />
          <div className="h-64 bg-surface rounded" />
        </div>
      </div>
    )
  }

  const currentPrompt = promptValue || settings?.systemPrompt || ''

  return (
    <div className="p-6 max-w-content mx-auto">
      <div className="page-header">
        <h1 className="page-title">AI Sozlamalar</h1>
        <p className="page-subtitle">Bot prompt va ishlash mantiqini boshqarish</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-2 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Prompt Tab */}
      {activeTab === 'prompt' && (
        <div className="space-y-4">
          <div className="kas-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">System Prompt</h3>
              <div className="flex gap-2">
                <button className="kas-btn-secondary gap-2 text-xs">
                  <TestTube size={13} />
                  Test qilish
                </button>
                <button
                  className="kas-btn-primary gap-2 text-xs"
                  onClick={() => promptMutation.mutate(currentPrompt)}
                  disabled={promptMutation.isPending}
                >
                  <Save size={13} />
                  Saqlash
                </button>
              </div>
            </div>
            <textarea
              className="kas-input font-mono text-xs resize-none"
              rows={16}
              value={currentPrompt}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder="System prompt..."
            />
          </div>

          {/* Version history */}
          {settings?.promptVersions && settings.promptVersions.length > 0 && (
            <div className="kas-card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Versiyalar tarixi</h3>
              <div className="space-y-2">
                {[...settings.promptVersions].reverse().slice(0, 5).map((v) => (
                  <div key={v.version} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs bg-surface-2 px-2 py-0.5 rounded text-text-muted">
                        v{v.version}
                      </span>
                      <span className="text-xs text-text-muted">
                        {new Date(v.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                    </div>
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setPromptValue(v.content)}
                    >
                      Tiklash
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logic Tab */}
      {activeTab === 'logic' && settings && (
        <div className="kas-card p-5 space-y-5">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Bot Logikasi</h3>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Lokatsiya so'rash</label>
            <select className="kas-input" defaultValue={settings.logic.locationTrigger}>
              <option value="after_consultation">Konsultatsiyadan keyin</option>
              <option value="always">Har doim</option>
              <option value="never">Hech qachon</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Lead yaratish</label>
            <select className="kas-input" defaultValue={settings.logic.leadCreationTrigger}>
              <option value="after_location">Lokatsiyadan keyin</option>
              <option value="always">Har doim</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-text-secondary">Max konsultatsiya uzunligi</label>
              <span className="text-xs text-primary font-mono">{settings.logic.maxConsultationLength} xabar</span>
            </div>
            <input
              type="range"
              min={1} max={10}
              defaultValue={settings.logic.maxConsultationLength}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Fallback javob</label>
            <textarea
              className="kas-input resize-none"
              rows={3}
              defaultValue={settings.logic.fallbackResponse}
            />
          </div>

          <button className="kas-btn-primary gap-2">
            <Save size={14} />
            Saqlash
          </button>
        </div>
      )}

      {/* Blacklist Tab */}
      {activeTab === 'blacklist' && settings && (
        <div className="kas-card p-5 space-y-5">
          <h3 className="text-sm font-semibold text-text-primary">Taqiqlangan so'zlar</h3>
          <div className="flex flex-wrap gap-2 p-3 bg-surface-2 rounded-md min-h-[80px]">
            {settings.blacklist.words.map((word) => (
              <span key={word} className="kas-badge bg-danger/10 text-danger border border-danger/20">
                {word}
                <button className="ml-1 hover:text-danger/60">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="kas-input flex-1" placeholder="Yangi so'z qo'shish..." />
            <button className="kas-btn-danger">Qo'shish</button>
          </div>
        </div>
      )}
    </div>
  )
}
