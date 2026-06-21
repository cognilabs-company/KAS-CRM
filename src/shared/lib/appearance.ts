import type { AppearancePreferences, AppearanceResponse } from '@shared/types/api'

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: 'kas',
  accent: 'kas_blue',
  density: 'comfortable',
  container: 'fluid',
  card_style: 'outlined',
  motion: 'system',
  background_kind: 'none',
  background_value: null,
  background_opacity: 0.9,
}

const ACCENTS = {
  kas_blue: ['35 73 164', '28 58 135'],
  graphite: ['71 85 105', '51 65 85'],
  teal: ['13 148 136', '15 118 110'],
  amber: ['217 119 6', '180 83 9'],
  kas_red: ['224 30 45', '185 28 38'],
} as const

export function applyAppearance(
  preferences: AppearancePreferences,
  catalog?: Pick<AppearanceResponse, 'presets' | 'backgrounds'>
) {
  const root = document.documentElement
  const [primary, hover] = ACCENTS[preferences.accent]
  root.dataset.theme = preferences.theme
  root.dataset.density = preferences.density
  root.dataset.container = preferences.container
  root.dataset.cardStyle = preferences.card_style
  root.dataset.motion = preferences.motion
  root.style.setProperty('--primary', primary)
  root.style.setProperty('--primary-hover', hover)
  root.style.setProperty('--wallpaper-opacity', String(preferences.background_opacity))

  let background = 'none'
  if (preferences.background_kind === 'preset') {
    const preset = catalog?.presets.find((item) => item.id === preferences.background_value)
    if (preset) background = preset.value
  } else if (preferences.background_kind === 'upload') {
    const asset = catalog?.backgrounds.find((item) => item.id === preferences.background_value)
    if (asset) background = `url("${asset.url.replace(/"/g, '%22')}")`
  }
  root.style.setProperty('--app-wallpaper', background)
}
