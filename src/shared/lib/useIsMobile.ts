import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 1024
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
const MOBILE_USER_AGENT_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i

function hasMobileUserAgent() {
  if (typeof navigator === 'undefined') return false
  return MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent)
}

function hasTouchDevice() {
  if (typeof navigator === 'undefined') return false
  return navigator.maxTouchPoints > 0
}

function hasCoarsePointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(pointer: coarse)').matches
}

function getMatches() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  const viewportWidth =
    window.visualViewport?.width ??
    document.documentElement.clientWidth ??
    window.innerWidth

  const screenWidth = window.screen?.width ?? viewportWidth

  return (
    viewportWidth < MOBILE_BREAKPOINT ||
    screenWidth < MOBILE_BREAKPOINT ||
    window.matchMedia(MOBILE_MEDIA_QUERY).matches ||
    hasMobileUserAgent() ||
    (hasTouchDevice() && hasCoarsePointer())
  )
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getMatches)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
