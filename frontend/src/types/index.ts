export type PatternType = 'spiral' | 'fractal' | 'wave' | 'circles' | 'voronoi' | 'noise'

export interface DesignParams {
  pattern: PatternType
  seed: number
  iterations: number
  scale: number
  rotation: number
  strokeWidth: number
  opacity: number
  bgColor: string
  palette: string[]
  width: number
  height: number
}

/** 画面底色模式：深色 / 浅色，用于在编辑器中预览色板落在画面上的效果 */
export type BgMode = 'dark' | 'light'

export interface ColorTheme {
  id: string
  name: string
  colors: string[]
  /** true = 内置色板（可逐格覆盖修改、可还原）；false = 用户复制产生的自定义色板（可删除） */
  builtin: boolean
}
