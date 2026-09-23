import type { BgMode, ColorTheme } from '../types'

/** 内置（写死的）八套色板，不可删除 */
export const BUILTIN_THEMES: ColorTheme[] = [
  { id: 'sunset',  name: '日落',    colors: ['#ff6b35','#f7c59f','#efefd0','#004e89','#1a659e'] },
  { id: 'ocean',   name: '海洋',    colors: ['#05445e','#75e6da','#189ab4','#d4f1f9','#22577a'] },
  { id: 'neon',    name: '霓虹',    colors: ['#ff00ff','#00ffff','#ffff00','#ff6600','#66ff00'] },
  { id: 'forest',  name: '森林',    colors: ['#1b4332','#2d6a4f','#40916c','#52b788','#95d5b2'] },
  { id: 'mono',    name: '单色',    colors: ['#ffffff','#cccccc','#888888','#444444','#222222'] },
  { id: 'pastel',  name: '糖果',    colors: ['#ffadad','#ffd6a5','#caffbf','#9bf6ff','#bdb2ff'] },
  { id: 'fire',    name: '火焰',    colors: ['#ff0000','#ff6600','#ffcc00','#ff9900','#ff3300'] },
  { id: 'aurora',  name: '极光',    colors: ['#00ff87','#60efff','#0061ff','#c850c0','#ffcc70'] },
]

/** 每套色板固定的色格数量 */
export const PALETTE_SIZE = 5

/** 深色 / 浅色预览背景 */
export const BG_COLORS: Record<BgMode, string> = {
  dark: '#030712',
  light: '#f8fafc',
}

export function isBuiltinTheme(id: string): boolean {
  return BUILTIN_THEMES.some(t => t.id === id)
}

/** 校验单个色格输入：支持 #rgb / #rrggbb / #rgba / #rrggbbaa 以及 rgb()/rgba()，空值也不合法 */
export function isValidColor(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return true
  if (/^rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*(0|1|0?\.\d+|[\d.]+%)\s*)?\)$/.test(v)) {
    return CSS.supports('color', v)
  }
  return false
}

/** 找出全部不合法的色格下标，用于逐格提示 */
export function invalidColorIndexes(colors: string[]): number[] {
  return colors.reduce<number[]>((acc, c, i) => {
    if (!isValidColor(c)) acc.push(i)
    return acc
  }, [])
}

let probe: HTMLDivElement | null = null

/** 把任意合法 CSS 颜色转成 #rrggbb，供取色器 <input type="color"> 使用；失败时回退为黑色 */
export function toHex(value: string): string {
  try {
    if (!probe) {
      probe = document.createElement('div')
      probe.style.display = 'none'
      document.body.appendChild(probe)
    }
    probe.style.color = ''
    probe.style.color = value
    const computed = getComputedStyle(probe).color
    const m = computed.match(/rgba?\(([^)]+)\)/)
    if (!m) return '#000000'
    const parts = m[1].split(',').map(s => s.trim()).slice(0, 3).map(Number)
    if (parts.length < 3 || parts.some(Number.isNaN)) return '#000000'
    return '#' + parts.map(n => n.toString(16).padStart(2, '0')).join('')
  } catch {
    return '#000000'
  }
}

/** 生成不与内置色板及已有自定义色板冲突的 id */
export function createCustomId(existing: ColorTheme[]): string {
  const used = new Set([...BUILTIN_THEMES, ...existing].map(t => t.id))
  for (let i = 0; i < 10000; i++) {
    const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}${i ? '-' + i : ''}`
    if (!used.has(id)) return id
  }
  return `custom-${Math.random().toString(36).slice(2, 12)}`
}

/** 生成“xxx 副本 / xxx 副本 2”形式且不重名的名字 */
export function uniqueCopyName(baseName: string, existing: ColorTheme[]): string {
  const used = new Set([...BUILTIN_THEMES, ...existing].map(t => t.name))
  const candidate = (n: number) => (n === 1 ? `${baseName} 副本` : `${baseName} 副本 ${n}`)
  for (let n = 1; ; n++) {
    const name = candidate(n)
    if (!used.has(name)) return name
  }
}
