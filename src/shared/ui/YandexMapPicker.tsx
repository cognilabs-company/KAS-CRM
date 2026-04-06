import { ExternalLink, LocateFixed, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    ymaps?: {
      ready: (callback: () => void) => void
      Map: new (element: HTMLElement, options: unknown, settings?: unknown) => YMapInstance
      Placemark: new (
        coords: [number, number],
        properties?: unknown,
        options?: unknown
      ) => YMapPlacemark
    }
  }
}

interface YMapPlacemark {
  geometry: {
    setCoordinates: (coords: [number, number]) => void
  }
  events: {
    add: (eventName: string, handler: () => void) => void
  }
}

interface YMapInstance {
  destroy: () => void
  setCenter: (coords: [number, number], zoom?: number, options?: unknown) => void
  geoObjects: {
    add: (geoObject: YMapPlacemark) => void
  }
  events: {
    add: (
      eventName: string,
      handler: (event: { get: (key: string) => [number, number] }) => void
    ) => void
  }
}

interface YandexMapPickerProps {
  latitude: number
  longitude: number
  onSelect: (coords: { latitude: number; longitude: number }) => void
  className?: string
}

let yandexScriptPromise: Promise<void> | null = null

function buildScriptSrc(apiKey?: string) {
  const base = 'https://api-maps.yandex.ru/2.1/'
  const params = new URLSearchParams({ lang: 'ru_RU' })
  if (apiKey) params.set('apikey', apiKey)
  return `${base}?${params.toString()}`
}

function loadYandexMaps(apiKey?: string) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window topilmadi'))
  }

  if (window.ymaps) {
    return new Promise<void>((resolve) => {
      window.ymaps?.ready(() => resolve())
    })
  }

  if (yandexScriptPromise) return yandexScriptPromise

  yandexScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = buildScriptSrc(apiKey)
    script.async = true
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error('Yandex Maps yuklanmadi'))
        return
      }
      window.ymaps.ready(() => resolve())
    }
    script.onerror = () => reject(new Error('Yandex Maps script yuklanmadi'))
    document.head.appendChild(script)
  })

  return yandexScriptPromise
}

function normalizeCoords(latitude: number, longitude: number): [number, number] {
  return [
    Number((Number.isFinite(latitude) ? latitude : 41.2995).toFixed(6)),
    Number((Number.isFinite(longitude) ? longitude : 69.2401).toFixed(6)),
  ]
}

export function YandexMapPicker({
  latitude,
  longitude,
  onSelect,
  className,
}: YandexMapPickerProps) {
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<YMapInstance | null>(null)
  const placemarkRef = useRef<YMapPlacemark | null>(null)
  const onSelectRef = useRef(onSelect)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return

    let disposed = false
    setStatus('loading')

    loadYandexMaps(apiKey)
      .then(() => {
        if (disposed || !containerRef.current || !window.ymaps) return

        const initialCoords = normalizeCoords(latitude, longitude)
        const map = new window.ymaps.Map(
          containerRef.current,
          {
            center: initialCoords,
            zoom: 13,
            controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
          },
          {
            suppressMapOpenBlock: true,
          }
        )

        const placemark = new window.ymaps.Placemark(
          initialCoords,
          {
            hintContent: 'Magazin lokatsiyasi',
          },
          {
            draggable: true,
            preset: 'islands#blueDotIcon',
          }
        )

        const applyCoords = (coords: [number, number]) => {
          const normalized = normalizeCoords(coords[0], coords[1])
          placemark.geometry.setCoordinates(normalized)
          onSelectRef.current({
            latitude: normalized[0],
            longitude: normalized[1],
          })
        }

        map.geoObjects.add(placemark)
        map.events.add('click', (event) => {
          applyCoords(event.get('coords'))
        })
        placemark.events.add('dragend', () => {
          const nextCoords = (placemark.geometry as { getCoordinates?: () => [number, number] }).getCoordinates?.()
          if (nextCoords) {
            applyCoords(nextCoords)
          }
        })

        mapRef.current = map
        placemarkRef.current = placemark
        setStatus('ready')
      })
      .catch(() => {
        if (!disposed) setStatus('error')
      })

    return () => {
      disposed = true
      mapRef.current?.destroy()
      mapRef.current = null
      placemarkRef.current = null
    }
  }, [apiKey])

  useEffect(() => {
    if (!mapRef.current || !placemarkRef.current) return
    const coords = normalizeCoords(latitude, longitude)
    placemarkRef.current.geometry.setCoordinates(coords)
    mapRef.current.setCenter(coords, undefined, { duration: 200 })
  }, [latitude, longitude])

  const mapsLink = `https://yandex.uz/maps/?ll=${longitude}%2C${latitude}&mode=search&pt=${longitude},${latitude}&z=15`

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin size={15} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Yandex Map orqali lokatsiya tanlash
                </p>
                <p className="text-xs text-text-secondary">
                  Kartaga bosing yoki pinni sudrab aniq nuqtani belgilang.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted whitespace-nowrap">
              {status === 'loading' && 'Yuklanmoqda...'}
              {status === 'ready' && 'Tayyor'}
              {status === 'error' && 'Xatolik'}
              {status === 'idle' && 'Kutmoqda'}
            </span>
            <a
              href={mapsLink}
              target="_blank"
              rel="noreferrer"
              className="kas-btn-ghost rounded-md px-2 py-1 text-xs"
              title="Yandex Maps'da ochish"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        <div
          ref={containerRef}
          className="h-80 w-full bg-surface"
        />

        <div className="grid gap-3 border-t border-border px-4 py-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Latitude</p>
            <p className="mt-1 font-mono text-sm text-text-primary">{latitude.toFixed(6)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Longitude</p>
            <p className="mt-1 font-mono text-sm text-text-primary">{longitude.toFixed(6)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-3 py-2">
            <div className="flex items-center gap-2">
              <LocateFixed size={13} className="text-primary" />
              <p className="text-[11px] uppercase tracking-wider text-text-muted">Holat</p>
            </div>
            <p className="mt-1 text-sm text-text-primary">
              {apiKey ? 'API key orqali yuklandi' : 'Fallback script orqali yuklandi'}
            </p>
          </div>
        </div>
      </div>

      {status === 'error' && (
        <p className="mt-2 text-xs text-danger">
          Yandex mapni yuklab bo&apos;lmadi. Tarmoq yoki Yandex script holatini tekshiring.
        </p>
      )}
    </div>
  )
}
