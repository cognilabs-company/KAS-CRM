import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Filter, Image as ImageIcon, Loader2, Mic, Pause, Play, Send, X } from 'lucide-react'
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
import type { ChatMediaItem, ChatMessage, ChatUser } from '@shared/types/api'

type ChatFilter = 'all' | 'voice' | 'lead' | 'lead_voice'

const FILTER_LABELS: Record<ChatFilter, string> = {
  all: 'Barchasi',
  voice: 'Voice bor',
  lead: 'Lead yaratilgan',
  lead_voice: 'Lead + voice',
}

const CHAT_FILTERS: ChatFilter[] = ['all', 'voice', 'lead', 'lead_voice']
const CHAT_LIST_REFRESH_INTERVAL_MS = 3_000
const CHAT_DETAIL_REFRESH_INTERVAL_MS = 2_000
const VOICE_WAVEFORM_BARS = [8, 14, 10, 18, 24, 16, 28, 20, 12, 22, 30, 18, 26, 14, 20, 10, 16, 24, 12, 18]

const SYSTEM_EVENT_LABELS: Partial<Record<NonNullable<ChatMessage['systemEvent']>, string>> = {
  voice_deferred: 'Voice deferred',
  photo_shared: 'Rasm yuborildi',
  lead_created: 'Lead yaratildi',
  location_sent: 'Lokatsiya yuborildi',
  store_assigned: 'Magazin biriktirildi',
  notification_sent: 'Xabarnoma yuborildi',
}

function getChatFilter(value: string | null): ChatFilter {
  return value && CHAT_FILTERS.includes(value as ChatFilter) ? (value as ChatFilter) : 'all'
}

function getMediaRequestPath(rawUrl: string) {
  const apiPrefix = '/api/v1'
  let pathname = rawUrl
  let search = ''

  try {
    const parsedUrl = new URL(rawUrl, window.location.origin)
    pathname = parsedUrl.pathname
    search = parsedUrl.search
  } catch {
    pathname = rawUrl
  }

  if (pathname.startsWith(apiPrefix)) {
    return `${pathname.slice(apiPrefix.length)}${search}`
  }

  if (pathname.startsWith('/admin/chats/media/')) {
    return `${pathname}${search}`
  }

  return `/admin/chats/media/${pathname.replace(/^\/+/, '')}${search}`
}

async function fetchMediaObjectUrl(rawUrl: string) {
  const response = await api.get<Blob>(getMediaRequestPath(rawUrl), { responseType: 'blob' })
  return URL.createObjectURL(response.data)
}

function formatAudioDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'

  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function AuthenticatedImage({ item }: { item: ChatMediaItem }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  async function handleOpen() {
    if (isLoading) return

    if (!objectUrl) {
      setIsLoading(true)
      setError(null)
      try {
        const nextObjectUrl = await fetchMediaObjectUrl(item.url)
        setObjectUrl(nextObjectUrl)
        setIsOpen(true)
      } catch {
        setError("Rasmni yuklab bo'lmadi")
      } finally {
        setIsLoading(false)
      }
      return
    }

    setIsOpen(true)
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex h-36 w-56 max-w-full items-center justify-center overflow-hidden rounded-md border border-border/60 bg-background/40 text-left transition-colors hover:border-primary/70"
      >
        {objectUrl ? (
          <img src={objectUrl} alt={item.filename ?? 'Chat rasmi'} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-xs text-text-secondary">
            {isLoading ? <Loader2 size={22} className="animate-spin text-primary" /> : <ImageIcon size={22} />}
            <span>{isLoading ? 'Rasm yuklanmoqda...' : 'Rasmni ochish'}</span>
          </div>
        )}
      </button>

      {error && <p className="text-xs text-danger">{error}</p>}

      {isOpen && objectUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 rounded-md bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Rasmni yopish"
          >
            <X size={20} />
          </button>
          <img
            src={objectUrl}
            alt={item.filename ?? 'Chat rasmi'}
            className="max-h-full max-w-full rounded-md object-contain"
          />
        </div>
      ) : null}
    </div>
  )
}

function AuthenticatedAudio({ item, isBot = false }: { item: ChatMediaItem; isBot?: boolean }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const shouldPlayRef = useRef(false)

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  useEffect(() => {
    if (!objectUrl || !shouldPlayRef.current) return
    shouldPlayRef.current = false
    void audioRef.current?.play().catch(() => setIsPlaying(false))
  }, [objectUrl])

  async function loadAudio(autoplay = false) {
    if (objectUrl) {
      if (autoplay) void audioRef.current?.play().catch(() => setIsPlaying(false))
      return
    }

    shouldPlayRef.current = shouldPlayRef.current || autoplay
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const nextObjectUrl = await fetchMediaObjectUrl(item.url)
      setObjectUrl(nextObjectUrl)
    } catch {
      shouldPlayRef.current = false
      setError("Ovozli xabarni yuklab bo'lmadi")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleTogglePlayback() {
    if (isLoading) return

    if (!objectUrl) {
      await loadAudio(true)
      return
    }

    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      void audio.play().catch(() => setIsPlaying(false))
      return
    }

    audio.pause()
  }

  function handleLoadedMetadata() {
    const nextDuration = audioRef.current?.duration ?? 0
    setDuration(Number.isFinite(nextDuration) ? nextDuration : 0)
  }

  function handleSeek(event: MouseEvent<HTMLButtonElement>) {
    if (!objectUrl || !duration || !audioRef.current) {
      void loadAudio(true)
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
    const nextTime = ratio * duration

    audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  function handleEnded() {
    setIsPlaying(false)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0
  const displaySeconds = objectUrl && duration > 0 ? (isPlaying || currentTime > 0 ? currentTime : duration) : 0

  return (
    <div className="w-60 max-w-full space-y-1.5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => void handleTogglePlayback()}
          disabled={isLoading}
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-70',
            isBot ? 'bg-white text-primary hover:bg-white/90' : 'bg-primary text-white hover:bg-primary-hover'
          )}
          aria-label={isPlaying ? "Ovozli xabarni to'xtatish" : 'Ovozli xabarni ijro etish'}
        >
          {isLoading ? (
            <Loader2 size={17} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={handleSeek}
          className="flex h-8 min-w-0 flex-1 items-center gap-0.5 rounded-md px-0.5"
          aria-label="Ovozli xabar progressi"
        >
          {VOICE_WAVEFORM_BARS.map((height, index) => {
            const barProgress = index / Math.max(VOICE_WAVEFORM_BARS.length - 1, 1)
            const isActive = objectUrl && barProgress <= progress

            return (
              <span
                key={`${height}-${index}`}
                className={cn(
                  'w-1 flex-shrink-0 rounded-full transition-colors',
                  isBot
                    ? isActive
                      ? 'bg-white'
                      : 'bg-white/35'
                    : isActive
                      ? 'bg-primary'
                      : 'bg-text-muted/40'
                )}
                style={{ height }}
              />
            )
          })}
        </button>
      </div>

      <p className={cn('pl-11 text-[10px] leading-none', isBot ? 'text-white/65' : 'text-text-muted')}>
        {formatAudioDuration(displaySeconds)}
      </p>

      <audio
        ref={audioRef}
        preload="metadata"
        src={objectUrl ?? undefined}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        className="hidden"
      />

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

function MessageMedia({ items, isBot = false }: { items: ChatMediaItem[]; isBot?: boolean }) {
  if (items.length === 0) return null

  return (
    <div className="mt-2 space-y-2">
      {items.map((item, index) => {
        if (item.kind === 'image') {
          return <AuthenticatedImage key={`${item.url}-${index}`} item={item} />
        }

        if (item.kind === 'audio') {
          return <AuthenticatedAudio key={`${item.url}-${index}`} item={item} isBot={isBot} />
        }

        return null
      })}
    </div>
  )
}

export function ChatsPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') ?? ''
  const routedFilter = getChatFilter(searchParams.get('tab'))
  const routedChatId = searchParams.get('chatId')
  const routedUserId = searchParams.get('userId')

  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState<ChatFilter>(routedFilter)
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
    setFilter(routedFilter)
  }, [routedFilter])

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
            tab: filter,
            user_id: routedUserId || undefined,
          },
        })
        .then((response) => normalizePaginated(response.data, mapChatListItem)),
    staleTime: 0,
    refetchInterval: CHAT_LIST_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  })

  const chats = chatsData?.data ?? []

  useEffect(() => {
    if (isMobile) return
    if (chats.length === 0) return
    if (activeChatId && chats.some((chat) => chat.id === activeChatId)) return
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
    staleTime: 0,
    refetchInterval: activeChatId ? CHAT_DETAIL_REFRESH_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  })

  const messages: ChatMessage[] = useMemo(
    () => (chatDetail?.messages ?? []).map((message: BackendChatMessageResponse) => mapChatMessage(message)),
    [chatDetail?.messages]
  )
  const latestMessageId = messages[messages.length - 1]?.id

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
  }, [latestMessageId, messages.length])

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

  function handleFilterChange(nextFilter: ChatFilter) {
    setFilter(nextFilter)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', nextFilter)
    nextParams.delete('page')
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

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = messageInput.trim()
    if (!content || sendMutation.isPending) return
    sendMutation.mutate(content)
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
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {CHAT_FILTERS.map((value) => (
              <button
                key={value}
                onClick={() => handleFilterChange(value)}
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
                      const eventLabel = message.systemEvent
                        ? SYSTEM_EVENT_LABELS[message.systemEvent] ?? message.systemEvent
                        : null
                      const isVoiceDeferred = message.systemEvent === 'voice_deferred'

                      return (
                        <div key={message.id} className="flex justify-center my-2">
                          <div
                            className={cn(
                              'flex max-w-[85%] items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-muted',
                              isVoiceDeferred && 'border-warning/20 bg-warning/5 italic opacity-80'
                            )}
                          >
                            {eventLabel && (
                              <span className="kas-badge rounded-md border border-border/70 bg-background/50 px-1.5 py-0 text-[10px] not-italic">
                                {eventLabel}
                              </span>
                            )}
                            <span>{message.content}</span>
                          </div>
                        </div>
                      )
                    }

                    const isBot = message.type === 'bot'
                    const isVoice = message.type === 'voice'
                    const eventLabel = message.systemEvent
                      ? SYSTEM_EVENT_LABELS[message.systemEvent] ?? message.systemEvent
                      : null
                    const isMediaPlaceholder =
                      message.content === '[Voice message]' || message.content === '[Photo message]'
                    const showContent = Boolean(message.content.trim()) && !(isMediaPlaceholder && message.hasMedia)

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
                          ) : showContent ? (
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          ) : null}

                          {eventLabel && (
                            <span
                              className={cn(
                                'mt-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium',
                                isBot
                                  ? 'border-white/20 bg-white/10 text-white/80'
                                  : 'border-border/70 bg-background/40 text-text-secondary'
                              )}
                            >
                              {eventLabel}
                            </span>
                          )}

                          <MessageMedia items={message.mediaItems} isBot={isBot} />

                          <p
                            className={cn(
                              'mt-1.5 text-right text-[10px] leading-none',
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

          <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-border flex-shrink-0 bg-surface">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder="Xabar yozing..."
                className="kas-input flex-1"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || sendMutation.isPending}
                className="kas-btn-primary px-3 py-2 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Operator sifatida Telegram orqali xabar yuboriladi
            </p>
          </form>
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
