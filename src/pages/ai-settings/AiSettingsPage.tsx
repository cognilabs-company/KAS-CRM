import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import {
  mapAiSetting,
  type BackendAiSettingResponse,
  type BackendPromptVersionResponse,
} from '@shared/api/backend'
import { formatDateTime, truncate } from '@shared/lib/utils'
import { ModalDialog } from '@shared/ui/ModalDialog'
import type { AISettingItem, PromptVersion } from '@shared/types/api'

type Tab = 'prompt' | 'settings'

interface SettingFormState {
  key: string
  value: string
  description: string
  isActive: boolean
}

const INITIAL_SETTING_FORM: SettingFormState = {
  key: '',
  value: '',
  description: '',
  isActive: true,
}

function mapPromptVersion(item: BackendPromptVersionResponse): PromptVersion {
  return {
    id: item.id,
    version: item.version,
    content: item.content,
    isCurrent: item.is_current,
    createdAt: item.created_at,
  }
}

export function AiSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('prompt')
  const [promptValue, setPromptValue] = useState('')
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false)
  const [editingSetting, setEditingSetting] = useState<AISettingItem | null>(null)
  const [settingForm, setSettingForm] = useState<SettingFormState>(INITIAL_SETTING_FORM)
  const queryClient = useQueryClient()

  const promptQuery = useQuery({
    queryKey: ['ai-settings-prompt'],
    queryFn: () =>
      api
        .get<BackendPromptVersionResponse>('/admin/ai-settings/prompt')
        .then((response) => mapPromptVersion(response.data)),
  })

  const versionsQuery = useQuery({
    queryKey: ['ai-settings-prompt-versions'],
    queryFn: () =>
      api
        .get<BackendPromptVersionResponse[]>('/admin/ai-settings/prompt/versions')
        .then((response) => response.data.map(mapPromptVersion)),
  })

  const settingsQuery = useQuery({
    queryKey: ['ai-settings-list'],
    queryFn: () =>
      api
        .get<BackendAiSettingResponse[]>('/admin/ai-settings/')
        .then((response) => response.data.map(mapAiSetting)),
  })

  useEffect(() => {
    if (promptQuery.data) {
      setPromptValue(promptQuery.data.content)
    }
  }, [promptQuery.data])

  const promptMutation = useMutation({
    mutationFn: (content: string) =>
      api.put('/admin/ai-settings/prompt', { content }),
    onSuccess: () => {
      toast.success('Prompt saqlandi')
      queryClient.invalidateQueries({ queryKey: ['ai-settings-prompt'] })
      queryClient.invalidateQueries({ queryKey: ['ai-settings-prompt-versions'] })
    },
    onError: () => toast.error('Promptni saqlab bo‘lmadi'),
  })

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) =>
      api.post(`/admin/ai-settings/prompt/versions/${versionId}/restore`),
    onSuccess: () => {
      toast.success('Prompt versiyasi tiklandi')
      queryClient.invalidateQueries({ queryKey: ['ai-settings-prompt'] })
      queryClient.invalidateQueries({ queryKey: ['ai-settings-prompt-versions'] })
    },
    onError: () => toast.error('Versiyani tiklab bo‘lmadi'),
  })

  const saveSettingMutation = useMutation({
    mutationFn: (payload: SettingFormState) => {
      if (editingSetting) {
        return api.patch(`/admin/ai-settings/${editingSetting.id}`, {
          value: payload.value,
          description: payload.description,
          is_active: payload.isActive,
        })
      }

      return api.post('/admin/ai-settings/', {
        key: payload.key,
        value: payload.value,
        description: payload.description,
        is_active: payload.isActive,
      })
    },
    onSuccess: () => {
      toast.success(editingSetting ? 'Sozlama yangilandi' : "Sozlama qo'shildi")
      closeSettingModal()
      queryClient.invalidateQueries({ queryKey: ['ai-settings-list'] })
    },
    onError: () => toast.error("Sozlamani saqlab bo'lmadi"),
  })

  const deleteMutation = useMutation({
    mutationFn: (settingId: string) => api.delete(`/admin/ai-settings/${settingId}`),
    onSuccess: () => {
      toast.success("Sozlama o'chirildi")
      queryClient.invalidateQueries({ queryKey: ['ai-settings-list'] })
    },
    onError: () => toast.error("Sozlamani o'chirib bo'lmadi"),
  })

  function openCreateSetting() {
    setEditingSetting(null)
    setSettingForm(INITIAL_SETTING_FORM)
    setIsSettingModalOpen(true)
  }

  function openEditSetting(setting: AISettingItem) {
    setEditingSetting(setting)
    setSettingForm({
      key: setting.key,
      value: setting.value,
      description: setting.description ?? '',
      isActive: setting.isActive,
    })
    setIsSettingModalOpen(true)
  }

  function closeSettingModal() {
    setIsSettingModalOpen(false)
    setEditingSetting(null)
    setSettingForm(INITIAL_SETTING_FORM)
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'prompt', label: 'Prompt' },
    { key: 'settings', label: 'Sozlamalar' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-content mx-auto space-y-4 sm:space-y-6">
      <div className="page-header">
        <h1 className="page-title">AI Sozlamalar</h1>
        <p className="page-subtitle">Prompt va AI konfiguratsiyalarini boshqarish</p>
      </div>

      <div className="flex w-full sm:w-fit gap-1 bg-surface-2 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'prompt' && (
        <div className="space-y-4">
          <div className="kas-card p-5">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Current system prompt</h3>
                {promptQuery.data && (
                  <p className="text-xs text-text-muted mt-1">
                    v{promptQuery.data.version} • {formatDateTime(promptQuery.data.createdAt)}
                  </p>
                )}
              </div>
              <button
                className="kas-btn-primary gap-2 text-xs w-full sm:w-auto"
                onClick={() => promptMutation.mutate(promptValue)}
                disabled={promptMutation.isPending}
              >
                <Save size={13} />
                Saqlash
              </button>
            </div>
            <textarea
              className="kas-input font-mono text-xs resize-none"
              rows={16}
              value={promptValue}
              onChange={(event) => setPromptValue(event.target.value)}
              placeholder="System prompt..."
            />
          </div>

          <div className="kas-card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Versiyalar tarixi</h3>
            <div className="space-y-3">
              {(versionsQuery.data ?? []).map((version) => (
                <div
                  key={version.id}
                  className="rounded-xl border border-border bg-surface-2 p-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs bg-surface px-2 py-1 rounded text-text-muted">
                        v{version.version}
                      </span>
                      {version.isCurrent && (
                        <span className="kas-badge bg-success/10 text-success">Current</span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mb-2">{formatDateTime(version.createdAt)}</p>
                    <p className="text-sm text-text-secondary">{truncate(version.content, 220)}</p>
                  </div>
                  {!version.isCurrent && (
                    <button
                      className="kas-btn-secondary gap-2 text-xs flex-shrink-0 w-full sm:w-auto"
                      onClick={() => restoreMutation.mutate(version.id)}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw size={13} />
                      Tiklash
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="flex justify-stretch sm:justify-end">
            <button className="kas-btn-primary gap-2 w-full sm:w-auto" onClick={openCreateSetting}>
              <Plus size={14} />
              Sozlama qo'shish
            </button>
          </div>

          <div className="grid gap-4">
            {(settingsQuery.data ?? []).map((setting) => (
              <div key={setting.id} className="kas-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-text-primary">{setting.key}</p>
                      <span
                        className={`kas-badge ${
                          setting.isActive ? 'bg-success/10 text-success' : 'bg-surface-2 text-text-muted'
                        }`}
                      >
                        {setting.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {setting.description && (
                      <p className="text-xs text-text-muted mb-2">{setting.description}</p>
                    )}
                    <pre className="whitespace-pre-wrap text-sm text-text-secondary font-mono bg-surface-2 rounded-lg p-3 overflow-x-auto">
                      {setting.value}
                    </pre>
                    <p className="text-xs text-text-muted mt-3">
                      Yangilangan: {formatDateTime(setting.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                    <button className="kas-btn-secondary text-xs" onClick={() => openEditSetting(setting)}>
                      Tahrirlash
                    </button>
                    <button
                      className="kas-btn-danger gap-2 text-xs"
                      onClick={() => deleteMutation.mutate(setting.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={13} />
                      O'chirish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ModalDialog
        open={isSettingModalOpen}
        title={editingSetting ? 'Sozlamani tahrirlash' : "Sozlama qo'shish"}
        description="Backend AI settings CRUD endpointlariga ulanadi."
        onClose={() => !saveSettingMutation.isPending && closeSettingModal()}
        className="max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="kas-btn-secondary"
              onClick={closeSettingModal}
              disabled={saveSettingMutation.isPending}
            >
              Bekor qilish
            </button>
            <button
              type="button"
              className="kas-btn-primary"
              onClick={() => saveSettingMutation.mutate(settingForm)}
              disabled={saveSettingMutation.isPending || !settingForm.key.trim() || !settingForm.value.trim()}
            >
              {saveSettingMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Key</span>
            <input
              className="kas-input"
              value={settingForm.key}
              onChange={(event) =>
                setSettingForm((current) => ({ ...current, key: event.target.value }))
              }
              disabled={Boolean(editingSetting)}
              placeholder="system_prompt"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Description</span>
            <input
              className="kas-input"
              value={settingForm.description}
              onChange={(event) =>
                setSettingForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Primary system prompt used for customer conversations."
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Value</span>
            <textarea
              className="kas-input min-h-40 resize-none font-mono text-sm"
              value={settingForm.value}
              onChange={(event) =>
                setSettingForm((current) => ({ ...current, value: event.target.value }))
              }
              placeholder="Setting value..."
            />
          </label>

          <label className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={settingForm.isActive}
              onChange={(event) =>
                setSettingForm((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            Faol sozlama
          </label>
        </div>
      </ModalDialog>
    </div>
  )
}
