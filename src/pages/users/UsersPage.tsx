import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, MessageSquare, Pencil, Trash2, UserCircle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { getApiErrorMessage } from '@shared/api/errors'
import {
  mapChatListItem,
  mapLeadListItem,
  mapTelegramUser,
  normalizePaginated,
  type BackendChatListItem,
  type BackendMessageResponse,
  type BackendPaginated,
  type BackendLeadListItem,
  type BackendTelegramUserListItem,
  type BackendTelegramUserResponse,
} from '@shared/api/backend'
import { formatPhone, formatRelative, truncate } from '@shared/lib/utils'
import { ConfirmDialog, SearchInput } from '@shared/ui/Controls'
import { DataTable, type Column } from '@shared/ui/DataTable'
import { ModalDialog } from '@shared/ui/ModalDialog'
import { StatusBadge } from '@shared/ui/StatusBadge'
import type { BotUser, ChatUser, UserStatus } from '@shared/types/api'

interface UserFormState {
  firstName: string
  lastName: string
  username: string
  phone: string
  status: UserStatus
}

const INITIAL_USER_FORM: UserFormState = {
  firstName: '',
  lastName: '',
  username: '',
  phone: '',
  status: 'active',
}

function safeTrim(value?: string | null) {
  return (value ?? '').trim()
}

export function UsersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userLeadsPage, setUserLeadsPage] = useState(1)
  const [userChatsPage, setUserChatsPage] = useState(1)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BotUser | null>(null)
  const [form, setForm] = useState<UserFormState>(INITIAL_USER_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, status],
    queryFn: () =>
      api
        .get<BackendPaginated<BackendTelegramUserListItem>>('/admin/users/', {
          params: {
            page,
            size: 20,
            search: search.trim() || undefined,
            status: status || undefined,
          },
        })
        .then((response) => normalizePaginated(response.data, mapTelegramUser)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: selectedUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['user', selectedUserId],
    queryFn: () =>
      api
        .get<BackendTelegramUserResponse>(`/admin/users/${selectedUserId}`)
        .then((response) => mapTelegramUser(response.data)),
    enabled: Boolean(selectedUserId),
  })

  const { data: userLeads, isLoading: isLeadsLoading } = useQuery({
    queryKey: ['user-leads', selectedUserId, userLeadsPage],
    queryFn: () =>
      api
        .get<BackendPaginated<BackendLeadListItem>>(`/admin/users/${selectedUserId}/leads`, {
          params: {
            page: userLeadsPage,
            size: 5,
          },
        })
        .then((response) => normalizePaginated(response.data, mapLeadListItem)),
    enabled: Boolean(selectedUserId),
  })

  const { data: userChats, isLoading: isChatsLoading } = useQuery({
    queryKey: ['user-chats', selectedUserId, userChatsPage],
    queryFn: () =>
      api
        .get<BackendPaginated<BackendChatListItem>>(`/admin/users/${selectedUserId}/chats`, {
          params: {
            page: userChatsPage,
            size: 5,
          },
        })
        .then((response) => normalizePaginated(response.data, mapChatListItem)),
    enabled: Boolean(selectedUserId),
  })

  useEffect(() => {
    if (!selectedUser) return
    setForm({
      firstName: selectedUser.firstName ?? '',
      lastName: selectedUser.lastName ?? '',
      username: selectedUser.username ?? '',
      phone: selectedUser.phone ?? '',
      status: selectedUser.status,
    })
  }, [selectedUser])

  const updateMutation = useMutation({
    mutationFn: (payload: UserFormState) =>
      api
        .patch<BackendTelegramUserResponse>(`/admin/users/${selectedUserId}`, {
          first_name: safeTrim(payload.firstName),
          last_name: safeTrim(payload.lastName) || undefined,
          username: safeTrim(payload.username) || undefined,
          phone: safeTrim(payload.phone) || undefined,
          status: payload.status,
        })
        .then((response) => response.data),
    onSuccess: () => {
      toast.success("Foydalanuvchi yangilandi")
      setIsEditOpen(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', selectedUserId] })
      queryClient.invalidateQueries({ queryKey: ['user-leads', selectedUserId] })
      queryClient.invalidateQueries({ queryKey: ['user-chats', selectedUserId] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Foydalanuvchini yangilab bo'lmadi")),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete<BackendMessageResponse>(`/admin/users/${userId}`).then((response) => response.data),
    onSuccess: (response, userId) => {
      toast.success(response.message || "Foydalanuvchi o'chirildi")
      if (selectedUserId === userId) {
        setSelectedUserId(null)
      }
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Foydalanuvchini o'chirib bo'lmadi")),
  })

  function openUser(user: BotUser) {
    setSelectedUserId(user.id)
    setUserLeadsPage(1)
    setUserChatsPage(1)
  }

  function openEditDialog() {
    if (!selectedUser) return
    setForm({
      firstName: selectedUser.firstName ?? '',
      lastName: selectedUser.lastName ?? '',
      username: selectedUser.username ?? '',
      phone: selectedUser.phone ?? '',
      status: selectedUser.status,
    })
    setIsEditOpen(true)
  }

  const columns: Column<BotUser>[] = [
    {
      key: 'firstName',
      header: 'Foydalanuvchi',
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">
            {row.firstName} {row.lastName}
          </p>
          {row.username && <p className="text-xs text-text-muted">@{row.username}</p>}
        </div>
      ),
    },
    {
      key: 'telegramId',
      header: 'Telegram ID',
      render: (row) => <span className="font-mono text-xs text-text-muted">{row.telegramId}</span>,
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.phone ? formatPhone(row.phone) : '-'}
        </span>
      ),
    },
    {
      key: 'leadsCount',
      header: 'Leadlar',
      render: (row) => <span className="font-bold text-primary">{row.leadsCount}</span>,
    },
    {
      key: 'messageCount',
      header: 'Xabarlar',
      render: (row) => <span className="font-medium text-text-secondary">{row.messageCount}</span>,
    },
    {
      key: 'lastActiveAt',
      header: "So'nggi faollik",
      render: (row) => <span className="text-xs text-text-muted">{formatRelative(row.lastActiveAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge variant={row.status as UserStatus} />,
    },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-content mx-auto">
      <div className="page-header">
        <h1 className="page-title">Foydalanuvchilar</h1>
        <p className="page-subtitle">{data ? `Jami ${data.total} ta foydalanuvchi` : 'Yuklanmoqda...'}</p>
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Ism, username yoki telefon..."
          className="w-full sm:w-72"
        />
        <select
          className="kas-input w-full sm:w-40"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">Barcha statuslar</option>
          <option value="active">Aktiv</option>
          <option value="blocked">Bloklangan</option>
          <option value="test">Test</option>
        </select>
      </div>
      <div className="kas-card">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyField="id"
          loading={isLoading}
          onRowClick={openUser}
          pagination={
            data
              ? {
                  page,
                  totalPages: data.totalPages,
                  total: data.total,
                  limit: data.limit,
                  onPageChange: setPage,
                }
              : undefined
          }
          emptyMessage="Foydalanuvchi topilmadi"
        />
      </div>

      {selectedUserId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelectedUserId(null)} />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Foydalanuvchi tafsilotlari</h2>
                {selectedUser && (
                  <p className="mt-1 text-xs font-mono text-text-muted">
                    #{selectedUser.id.slice(-6).toUpperCase()}
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedUserId(null)} className="kas-btn-ghost rounded-md p-1.5">
                <X size={18} />
              </button>
            </div>

            {isUserLoading || !selectedUser ? (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-text-muted">
                Yuklanmoqda...
              </div>
            ) : (
              <div className="flex-1 space-y-5 p-5">
                <div className="kas-card p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                        <UserCircle size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-text-primary">
                          {selectedUser.firstName} {selectedUser.lastName}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {selectedUser.username ? `@${selectedUser.username}` : "Username yo'q"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge variant={selectedUser.status} />
                  </div>

                  <div className="space-y-2.5">
                    <DrawerRow label="Telegram ID" value={selectedUser.telegramId} mono />
                    <DrawerRow
                      label="Telefon"
                      value={selectedUser.phone ? formatPhone(selectedUser.phone) : "Ko'rsatilmagan"}
                      mono
                    />
                    <DrawerRow label="Leadlar soni" value={String(selectedUser.leadsCount)} mono />
                    <DrawerRow label="Xabarlar soni" value={String(selectedUser.messageCount)} mono />
                    <DrawerRow label="Oxirgi faollik" value={formatRelative(selectedUser.lastActiveAt)} />
                    <DrawerRow label="Yaratilgan" value={formatRelative(selectedUser.createdAt)} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button className="kas-btn-secondary gap-2 text-xs" onClick={openEditDialog}>
                      <Pencil size={13} />
                      Tahrirlash
                    </button>
                    <button
                      className="kas-btn-danger gap-2 text-xs"
                      onClick={() => setDeleteTarget(selectedUser)}
                    >
                      <Trash2 size={13} />
                      O'chirish
                    </button>
                  </div>
                </div>

                <div className="kas-card p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
                        Leadlar
                      </h3>
                      <p className="mt-1 text-xs text-text-secondary">
                        Ushbu foydalanuvchidan yaratilgan leadlar
                      </p>
                    </div>
                    <span className="kas-badge bg-primary/10 text-primary">
                      {userLeads?.total ?? selectedUser.leadsCount}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {isLeadsLoading ? (
                      <p className="text-sm text-text-muted">Leadlar yuklanmoqda...</p>
                    ) : (userLeads?.data ?? []).length === 0 ? (
                      <p className="text-sm text-text-muted">Lead topilmadi</p>
                    ) : (
                      userLeads?.data.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          className="w-full rounded-xl border border-border bg-surface-2 p-3 text-left transition-colors hover:border-primary/30"
                          onClick={() => navigate(`/leads?leadId=${lead.id}`)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-text-primary">
                                {lead.products[0]?.name ?? 'Lead'}
                              </p>
                              <p className="mt-1 text-xs text-text-secondary">
                                {truncate(lead.aiSummary, 80)}
                              </p>
                            </div>
                            <ExternalLink size={14} className="mt-0.5 flex-shrink-0 text-text-muted" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <PaginationMini
                    page={userLeads?.page ?? userLeadsPage}
                    totalPages={userLeads?.totalPages ?? 1}
                    onPageChange={setUserLeadsPage}
                  />
                </div>

                <div className="kas-card p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
                        Chatlar
                      </h3>
                      <p className="mt-1 text-xs text-text-secondary">
                        Ushbu foydalanuvchining chat sessiyalari
                      </p>
                    </div>
                    <button
                      type="button"
                      className="kas-btn-ghost gap-2 text-xs"
                      onClick={() => navigate(`/chats?userId=${selectedUser.id}`)}
                    >
                      <MessageSquare size={13} />
                      Barchasi
                    </button>
                  </div>

                  <div className="space-y-3">
                    {isChatsLoading ? (
                      <p className="text-sm text-text-muted">Chatlar yuklanmoqda...</p>
                    ) : (userChats?.data ?? []).length === 0 ? (
                      <p className="text-sm text-text-muted">Chat topilmadi</p>
                    ) : (
                      userChats?.data.map((chat) => <ChatCard key={chat.id} chat={chat} />)
                    )}
                  </div>

                  <PaginationMini
                    page={userChats?.page ?? userChatsPage}
                    totalPages={userChats?.totalPages ?? 1}
                    onPageChange={setUserChatsPage}
                  />
                </div>
              </div>
            )}
          </aside>
        </>
      )}

      <ModalDialog
        open={isEditOpen}
        title="Foydalanuvchini tahrirlash"
        description="Telegram user detail va update endpointlariga ulangan."
        onClose={() => !updateMutation.isPending && setIsEditOpen(false)}
        className="max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="kas-btn-secondary"
              onClick={() => setIsEditOpen(false)}
              disabled={updateMutation.isPending}
            >
              Bekor qilish
            </button>
            <button
              type="button"
              className="kas-btn-primary"
              onClick={() => updateMutation.mutate(form)}
              disabled={updateMutation.isPending || !safeTrim(form.firstName)}
            >
              {updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Ism" required>
            <input
              className="kas-input"
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              placeholder="Ali"
            />
          </FormField>

          <FormField label="Familiya">
            <input
              className="kas-input"
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              placeholder="Valiyev"
            />
          </FormField>

          <FormField label="Username">
            <input
              className="kas-input"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              placeholder="ali_kas"
            />
          </FormField>

          <FormField label="Telefon">
            <input
              className="kas-input"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="+998901112233"
            />
          </FormField>

          <FormField label="Status" required>
            <select
              className="kas-input"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as UserStatus }))
              }
            >
              <option value="active">Aktiv</option>
              <option value="blocked">Bloklangan</option>
              <option value="test">Test</option>
            </select>
          </FormField>
        </div>
      </ModalDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Foydalanuvchini o'chirish"
        description={`"${deleteTarget?.firstName} ${deleteTarget?.lastName ?? ''}" foydalanuvchisini o'chirishni tasdiqlaysizmi?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function ChatCard({ chat }: { chat: ChatUser }) {
  return (
    <a
      href={`/chats?chatId=${chat.id}`}
      className="block rounded-xl border border-border bg-surface-2 p-3 transition-colors hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{chat.fullName}</p>
          <p className="mt-1 text-xs text-text-secondary">{truncate(chat.lastMessage, 80)}</p>
        </div>
        <ExternalLink size={14} className="mt-0.5 flex-shrink-0 text-text-muted" />
      </div>
      <p className="mt-2 text-xs text-text-muted">{formatRelative(chat.lastMessageTime)}</p>
    </a>
  )
}

function PaginationMini({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <button
        type="button"
        className="kas-btn-ghost text-xs"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Oldingi
      </button>
      <span className="text-xs text-text-muted">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        className="kas-btn-ghost text-xs"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Keyingi
      </button>
    </div>
  )
}

function DrawerRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-right text-sm text-text-primary ${mono ? 'font-mono' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  )
}

function FormField({
  label,
  children,
  required,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}
