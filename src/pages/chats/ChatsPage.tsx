import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ExternalLink, Filter, Mic, Send } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '@shared/api/axios'
import { useUIStore } from '@shared/lib/store'
import { cn, formatChatDate, formatTime, getInitials, truncate } from '@shared/lib/utils'
import { SearchInput } from '@shared/ui/Controls'
import type { ChatMessage, ChatUser, PaginatedResponse } from '@shared/types/api'

type ChatFilter = 'all' | 'voice' | 'lead'

const FILTER_LABELS: Record<ChatFilter, string> = {
  all: 'Barchasi',
  voice: 'Voice bor',
  lead: 'Lead yaratilgan',
}

export function ChatsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') ?? ''
  const routedUserId = searchParams.get('userId')

  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState<ChatFilter>('all')
  const [activeUserId, setActiveUserId] = useState<string | null>(routedUserId)
  const [messageInput, setMessageInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const qc = useQueryClient()
  const deferredSearch = useDeferredValue(search)
  const readChatIds = useUIStore((s) => s.readChatIds)
  const markChatRead = useUIStore((s) => s.markChatRead)
  const markNotificationSeen = useUIStore((s) => s.markNotificationSeen)

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    if (routedUserId) {
      setActiveUserId(routedUserId)
    }
  }, [routedUserId])

  const { data: usersData } = useQuery({
    queryKey: ['chats', deferredSearch, filter],
    queryFn: () =>
      api
        .get<PaginatedResponse<ChatUser>>('/chats', {
          params: {
            page: 1,
            limit: 100,
            search: deferredSearch || undefined,
            hasVoice: filter === 'voice' ? true : undefined,
            hasLead: filter === 'lead' ? true : undefined,
          },
        })
        .then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: routedUser } = useQuery({
    queryKey: ['chat-user', routedUserId],
    queryFn: () => api.get<ChatUser>(`/chats/${routedUserId}`).then((r) => r.data),
    enabled: !!routedUserId,
  })

  const users = useMemo(() => {
    const list = usersData?.data ?? []
    if (!routedUser) return list
    return list.some((user) => user.id === routedUser.id)
      ? list
      : [routedUser, ...list]
  }, [routedUser, usersData?.data])

  const activeUser = useMemo(() => {
    if (!activeUserId) return null
    return users.find((user) => user.id === activeUserId) ?? null
  }, [activeUserId, users])

  const { data: messages, isLoading: msgsLoading } = useQuery({
    queryKey: ['chat-messages', activeUserId],
    queryFn: () =>
      api
        .get<{ data: ChatMessage[] }>(`/chats/${activeUserId}/messages`)
        .then((r) => r.data.data),
    enabled: !!activeUserId,
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/chats/${activeUserId}/send`, { content }).then((r) => r.data),
    onSuccess: () => {
      setMessageInput('')
      qc.invalidateQueries({ queryKey: ['chat-messages', activeUserId] })
      qc.invalidateQueries({ queryKey: ['chats'] })
      qc.invalidateQueries({ queryKey: ['header-notification-chats'] })
    },
  })

  useEffect(() => {
    if (!activeUserId) return
    markChatRead(activeUserId)
    markNotificationSeen(`chat:${activeUserId}`)
  }, [activeUserId, markChatRead, markNotificationSeen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const groupedMessages = useMemo(() => {
    if (!messages) return []

    const groups: { date: string; messages: ChatMessage[] }[] = []
    messages.forEach((message) => {
      const date = formatChatDate(message.timestamp)
      const lastGroup = groups[groups.length - 1]
      if (lastGroup?.date === date) {
        lastGroup.messages.push(message)
      } else {
        groups.push({ date, messages: [message] })
      }
    })
    return groups
  }, [messages])

  function effectiveUnreadCount(user: ChatUser) {
    return readChatIds.includes(user.id) ? 0 : user.unreadCount
  }

  function handleSelectUser(user: ChatUser) {
    setActiveUserId(user.id)
    markChatRead(user.id)
    markNotificationSeen(`chat:${user.id}`)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('userId', user.id)
    if (search.trim()) nextParams.set('search', search.trim())
    else nextParams.delete('search')
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col bg-surface">
        <div className="p-3 border-b border-border space-y-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Ism yoki username bo'yicha qidirish..."
          />
          <div className="flex gap-1">
            {(Object.keys(FILTER_LABELS) as ChatFilter[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  'flex-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                  filter === value
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-2'
                )}
              >
                {FILTER_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {users.map((user) => {
            const unreadCount = effectiveUnreadCount(user)

            return (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50',
                  activeUser?.id === user.id
                    ? 'bg-primary/10 border-l-2 border-l-primary'
                    : 'hover:bg-surface-2'
                )}
              >
                <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-text-secondary">
                    {getInitials(user.fullName)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.fullName}
                    </p>
                    <span className="text-xs text-text-muted flex-shrink-0 ml-1">
                      {formatTime(user.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-text-muted truncate max-w-[170px]">
                      {truncate(user.lastMessage, 38)}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {user.hasVoice && <Mic size={10} className="text-warning" />}
                      {unreadCount > 0 && (
                        <>
                          <Bell size={11} className="text-primary" />
                          <span className="bg-primary text-white text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-medium">
                            {unreadCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {activeUser ? (
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <div className="h-14 border-b border-border flex items-center justify-between px-5 flex-shrink-0 bg-surface">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                <span className="text-xs font-bold text-text-secondary">
                  {getInitials(activeUser.fullName)}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{activeUser.fullName}</p>
                {activeUser.hasLead && (
                  <span className="kas-badge bg-success/10 text-success border border-success/20 text-xs">
                    Lead yaratilgan
                  </span>
                )}
              </div>
            </div>

            {activeUser.leadId && (
              <button
                onClick={() => navigate(`/leads?leadId=${activeUser.leadId}`)}
                className="kas-btn-ghost gap-1 text-xs"
              >
                <ExternalLink size={13} />
                Lead ko'rish
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {msgsLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-text-muted text-sm">Yuklanmoqda...</p>
              </div>
            ) : (
              groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center justify-center my-4">
                    <span className="text-xs text-text-muted bg-surface px-3 py-1 rounded-full border border-border">
                      {group.date}
                    </span>
                  </div>

                  {group.messages.map((message) => {
                    if (message.type === 'system') {
                      return (
                        <div key={message.id} className="flex justify-center my-2">
                          <span className="text-xs text-text-muted bg-surface-2 px-3 py-1.5 rounded-full border border-border">
                            {message.content}
                          </span>
                        </div>
                      )
                    }

                    const isAI = message.type === 'bot'
                    const isVoice = message.type === 'voice'

                    return (
                      <div
                        key={message.id}
                        className={cn('flex mb-1', isAI ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-sm rounded-xl px-4 py-2.5 text-sm',
                            isAI
                              ? 'bg-primary text-white rounded-br-sm'
                              : 'bg-surface-2 text-text-primary rounded-bl-sm'
                          )}
                        >
                          {isVoice ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-warning">
                                <Mic size={14} />
                                <span className="text-xs font-medium">Ovozli xabar</span>
                              </div>
                              {message.transcript && (
                                <p className="text-xs opacity-80 italic border-t border-border pt-2">
                                  "{message.transcript}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <p>{message.content}</p>
                          )}
                          <p
                            className={cn(
                              'text-xs mt-1 text-right',
                              isAI ? 'text-white/60' : 'text-text-muted'
                            )}
                          >
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border flex-shrink-0 bg-surface">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && messageInput.trim()) {
                    sendMutation.mutate(messageInput.trim())
                  }
                }}
                placeholder="Xabar yozing..."
                className="kas-input flex-1"
              />
              <button
                onClick={() => messageInput.trim() && sendMutation.mutate(messageInput.trim())}
                disabled={!messageInput.trim() || sendMutation.isPending}
                className="kas-btn-primary px-3 py-2 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Operator sifatida Telegram orqali xabar yuboriladi
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center mx-auto mb-3">
              <Filter size={24} className="text-text-muted" />
            </div>
            <p className="text-text-secondary">Chatni ko'rish uchun foydalanuvchini tanlang</p>
          </div>
        </div>
      )}
    </div>
  )
}
