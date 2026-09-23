import type { BgMode, ColorTheme } from '../types'
import { PALETTE_SIZE } from '../themes/palettes'

const CUSTOM_THEMES_KEY = 'gan-art:custom-themes'
const ACTIVE_THEME_KEY = 'gan-art:active-theme-id'
const BG_MODE_KEY = 'gan-art:bg-mode'

function isColorArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length === PALETTE_SIZE && value.every(v => typeof v === 'string')
}

function isTheme(value: unknown): value is ColorTheme {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return typeof t.id === 'string' && typeof t.name === 'string' && isColorArray(t.colors)
}

/** 读取本地保存的自定义色板；数据损坏或缺失时返回空数组，绝不抛错 */
export function loadCustomThemes(): ColorTheme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTheme)
  } catch {
    return []
  }
}

export function saveCustomThemes(themes: ColorTheme[]): void {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
  } catch {
    // 隐私模式 / 存储满等情况下静默失败，不影响当前会话使用
  }
}

export function loadActiveThemeId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_THEME_KEY)
  } catch {
    return null
  }
}

export function saveActiveThemeId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_THEME_KEY, id)
  } catch {
    // ignore
  }
}

export function loadBgMode(): BgMode {
  try {
    return localStorage.getItem(BG_MODE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function saveBgMode(mode: BgMode): void {
  try {
    localStorage.setItem(BG_MODE_KEY, mode)
  } catch {
    // ignore
  }
}
