import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Filter, Mic, Send } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '@shared/api/axios'
import {
  mapChatListItem,
  mapChatMessage,
  normalizePaginated,
  type BackendChatListItem,
  type BackendChatMessageResponse,
  type BackendChatResponse,
  type BackendPaginated,
} from '@shared/api/backend'
import { useUIStore } from '@shared/lib/store'
import { useIsMobile } from '@shared/lib/useIsMobile'
import { cn, formatChatDate, formatTime, getInitials, truncate } from '@shared/lib/utils'
import { SearchInput } from '@shared/ui/Controls'
import type { ChatMessage, ChatUser } from '@shared/types/api'

type ChatFilter = 'all' | 'voice' | 'lead'

const FILTER_LABELS: Record<ChatFilter, string> = {
  all: 'Barchasi',
  voice: 'Voice bor',
  lead: 'Lead yaratilgan',
}

export function ChatsPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') ?? ''
  const routedChatId = searchParams.get('chatId')
  const routedUserId = searchParams.get('userId')

  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState<ChatFilter>('all')
  const [activeChatId, setActiveChatId] = useState<string | null>(routedChatId)
  const [messageInput, setMessageInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const suppressRouteSyncRef = useRef(false)

  const queryClient = useQueryClient()
  const deferredSearch = useDeferredValue(search)
  const markChatRead = useUIStore((state) => state.markChatRead)
  const markNotificationSeen = useUIStore((state) => state.markNotificationSeen)

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    if (suppressRouteSyncRef.current) {
      if (!routedChatId) {
        suppressRouteSyncRef.current = false
      }
      return
    }

    if (routedChatId) {
      setActiveChatId(routedChatId)
    }
  }, [routedChatId])

  const { data: chatsData } = useQuery({
    queryKey: ['chats', deferredSearch, filter, routedUserId],
    queryFn: () =>
      api
        .get<BackendPaginated<BackendChatListItem>>('/admin/chats/', {
          params: {
            page: 1,
            size: 100,
            search: deferredSearch || undefined,
            has_voice: filter === 'voice' ? true : undefined,
            has_lead: filter === 'lead' ? true : undefined,
            user_id: routedUserId || undefined,
          },
        })
        .then((response) => normalizePaginated(response.data, mapChatListItem)),
    staleTime: 30_000,
  })

  const chats = chatsData?.data ?? []

  useEffect(() => {
    if (isMobile) return
    if (activeChatId || chats.length === 0) return
    const firstChatId = chats[0]?.id
    if (!firstChatId) return
    setActiveChatId(firstChatId)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('chatId', firstChatId)
    setSearchParams(nextParams, { replace: true })
  }, [activeChatId, chats, isMobile, searchParams, setSearchParams])

  const activeChat = useMemo(() => {
    if (!activeChatId) return null
    return chats.find((chat) => chat.id === activeChatId) ?? null
  }, [activeChatId, chats])

  const { data: chatDetail, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-detail', activeChatId],
    queryFn: () =>
      api.get<BackendChatResponse>(`/admin/chats/${activeChatId}`).then((response) => response.data),
    enabled: Boolean(activeChatId),
  })

  const messages: ChatMessage[] = useMemo(
    () => (chatDetail?.messages ?? []).map((message: BackendChatMessageResponse) => mapChatMessage(message)),
    [chatDetail?.messages]
  )

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api
        .post(`/admin/chats/${activeChatId}/messages`, { content })
        .then((response) => response.data),
    onSuccess: () => {
      setMessageInput('')
      queryClient.invalidateQueries({ queryKey: ['chat-detail', activeChatId] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
  })

  useEffect(() => {
    if (!activeChatId) return
    markChatRead(activeChatId)
    markNotificationSeen(`chat:${activeChatId}`)
  }, [activeChatId, markChatRead, markNotificationSeen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages])

  const groupedMessages = useMemo(() => {
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

  function handleSelectChat(chat: ChatUser) {
    suppressRouteSyncRef.current = false
    setActiveChatId(chat.id)
    markChatRead(chat.id)
    markNotificationSeen(`chat:${chat.id}`)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('chatId', chat.id)
    if (search.trim()) nextParams.set('search', search.trim())
    else nextParams.delete('search')
    startTransition(() => {
      setSearchParams(nextParams, { replace: true })
    })
  }

  function closeActiveChat() {
    suppressRouteSyncRef.current = true
    setActiveChatId(null)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('chatId')
    setSearchParams(nextParams, { replace: true })
  }

  const showChatList = !isMobile || !activeChat
  const showChatDetail = !isMobile || Boolean(activeChat)

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {showChatList ? (
      <div className={cn('flex flex-col border-r border-border bg-surface', isMobile ? 'w-full' : 'w-80 flex-shrink-0')}>
        <div className="p-3 border-b border-border space-y-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Ism yoki username bo'yicha qidirish..."
          />
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(FILTER_LABELS) as ChatFilter[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  'min-h-10 px-2 py-1 rounded text-[11px] sm:text-xs font-medium transition-colors text-center leading-tight',
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
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => handleSelectChat(chat)}
              className={cn(
                'w-full flex items-start gap-3 px-3 sm:px-4 py-3 text-left transition-colors border-b border-border/50',
                activeChat?.id === chat.id
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'hover:bg-surface-2'
              )}
            >
              <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-text-secondary">
                  {getInitials(chat.fullName)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {chat.fullName}
                  </p>
                  <span className="text-xs text-text-muted flex-shrink-0 ml-1">
                    {formatTime(chat.lastMessageTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-text-muted truncate max-w-[150px] sm:max-w-[170px]">
                    {truncate(chat.lastMessage, 38)}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {chat.hasVoice && <Mic size={10} className="text-warning" />}
                    {chat.hasLead && (
                      <span className="kas-badge bg-success/10 text-success text-[10px]">
                        Lead
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      ) : null}

      {showChatDetail && activeChat && chatDetail ? (
        <div className="flex w-full min-w-0 flex-1 flex-col bg-background">
          <div className="h-14 border-b border-border flex items-center justify-between px-3 sm:px-5 flex-shrink-0 bg-surface gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={closeActiveChat}
                className="kas-btn-ghost rounded-md p-1.5 md:hidden"
                aria-label="Chatlar ro'yxatiga qaytish"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                <span className="text-xs font-bold text-text-secondary">
                  {getInitials(activeChat.fullName)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{activeChat.fullName}</p>
                {activeChat.hasLead && (
                  <span className="kas-badge bg-success/10 text-success border border-success/20 text-xs">
                    Lead yaratilgan
                  </span>
                )}
              </div>
            </div>

            {activeChat.leadId && (
              <button
                onClick={() => navigate(`/leads?leadId=${activeChat.leadId}`)}
                className="kas-btn-ghost gap-1 text-xs px-2 sm:px-3"
              >
                <ExternalLink size={13} />
                <span className="hidden sm:inline">Lead ko'rish</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1">
            {messagesLoading ? (
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

                    const isBot = message.type === 'bot'
                    const isVoice = message.type === 'voice'

                    return (
                      <div
                        key={message.id}
                        className={cn('flex mb-1', isBot ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] sm:max-w-sm rounded-xl px-4 py-2.5 text-sm',
                            isBot
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
                              isBot ? 'text-white/60' : 'text-text-muted'
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

          <div className="p-3 sm:p-4 border-t border-border flex-shrink-0 bg-surface">
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
        <div className="hidden flex-1 items-center justify-center bg-background md:flex">
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
