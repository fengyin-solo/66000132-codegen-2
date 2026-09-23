import type { ColorTheme } from '../types'

/** 每套色板固定 5 格颜色 */
export const COLOR_COUNT = 5

export const BUILTIN_THEMES: ColorTheme[] = [
  { id: 'sunset',  name: '日落', colors: ['#ff6b35','#f7c59f','#efefd0','#004e89','#1a659e'], builtin: true },
  { id: 'ocean',   name: '海洋', colors: ['#05445e','#75e6da','#189ab4','#d4f1f9','#22577a'], builtin: true },
  { id: 'neon',    name: '霓虹', colors: ['#ff00ff','#00ffff','#ffff00','#ff6600','#66ff00'], builtin: true },
  { id: 'forest',  name: '森林', colors: ['#1b4332','#2d6a4f','#40916c','#52b788','#95d5b2'], builtin: true },
  { id: 'mono',    name: '单色', colors: ['#ffffff','#cccccc','#888888','#444444','#222222'], builtin: true },
  { id: 'pastel',  name: '糖果', colors: ['#ffadad','#ffd6a5','#caffbf','#9bf6ff','#bdb2ff'], builtin: true },
  { id: 'fire',    name: '火焰', colors: ['#ff0000','#ff6600','#ffcc00','#ff9900','#ff3300'], builtin: true },
  { id: 'aurora',  name: '极光', colors: ['#00ff87','#60efff','#0061ff','#c850c0','#ffcc70'], builtin: true },
]

/** 深 / 浅画面底色，切换时实时预览色板落在画面上的效果 */
export const BG_COLORS = {
  dark: '#030712',
  light: '#f8fafc',
} as const

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** 校验单个色值，支持 #rgb / #rrggbb */
export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim())
}

/** 把合法色值归一化为 #rrggbb 小写形式；非法时返回 null（不悄悄回退默认值） */
export function normalizeHex(value: string): string | null {
  const v = value.trim()
  if (!HEX_RE.test(v)) return null
  if (v.length === 4) {
    return ('#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toLowerCase()
  }
  return v.toLowerCase()
}

/** 根据序号生成自定义色板 id */
export function makeCustomId(): string {
  return `custom-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}
