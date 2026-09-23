import { create } from 'zustand'
import type { BgMode, ColorTheme, DesignParams, PatternType } from '../types'
import { BG_COLORS, BUILTIN_THEMES, createCustomId, uniqueCopyName } from '../themes/palettes'
import {
  loadActiveThemeId, loadBgMode, loadCustomThemes,
  saveActiveThemeId, saveBgMode, saveCustomThemes,
} from './storage'

interface DesignStore extends DesignParams {
  svgContent: string
  themes: ColorTheme[]
  activeThemeId: string
  bgMode: BgMode
  setParam: <K extends keyof DesignParams>(key: K, value: DesignParams[K]) => void
  setPattern: (p: PatternType) => void
  /** 套用某套色板（内置或自定义），立即生效并记住选择 */
  applyTheme: (id: string) => void
  /** 从任意一套现有色板复制出自定义色板，返回新 id（编辑中，尚未保存） */
  duplicateTheme: (id: string) => string
  /** 新建/更新自定义色板；id 为内置色板时表示由内置色板“另存为自定义” */
  saveCustomTheme: (id: string | null, name: string, colors: string[]) => string
  /** 删除自定义色板；返回它是否正处于套用状态（调用方应先说明影响） */
  deleteCustomTheme: (id: string) => boolean
  /** 编辑过程中临时预览一套颜色（全部色格合法时才推送），取消时用 restorePalette 还原 */
  previewPalette: (colors: string[]) => void
  restorePalette: () => void
  setBgMode: (mode: BgMode) => void
  randomSeed: () => void
  setSvgContent: (s: string) => void
  exportSvg: () => void
  exportPng: () => void
}

function findTheme(id: string, custom: ColorTheme[]): ColorTheme | undefined {
  return BUILTIN_THEMES.find(t => t.id === id) ?? custom.find(t => t.id === id)
}

function persist(custom: ColorTheme[]) {
  saveCustomThemes(custom)
}

// 初始化：优先恢复本地自定义色板与上次选中的那套，id 失效时回退到第一套内置色板
const initialCustom = loadCustomThemes()
const storedActiveId = loadActiveThemeId()
const initialBgMode = loadBgMode()
const initialActive =
  (storedActiveId && findTheme(storedActiveId, initialCustom)) || BUILTIN_THEMES[0]

export const useDesignStore = create<DesignStore>((set, get) => ({
  pattern: 'spiral',
  seed: 42,
  iterations: 200,
  scale: 1.0,
  rotation: 0,
  strokeWidth: 1.5,
  opacity: 0.8,
  bgMode: initialBgMode,
  bgColor: BG_COLORS[initialBgMode],
  palette: initialActive.colors,
  width: 800,
  height: 1000,
  svgContent: '',

  themes: initialCustom,
  activeThemeId: initialActive.id,

  setParam: (key, value) => set({ [key]: value } as any),
  setPattern: (p) => set({ pattern: p }),

  applyTheme: (id) => {
    const theme = findTheme(id, get().themes)
    if (!theme) return
    set({ activeThemeId: theme.id, palette: [...theme.colors] })
    saveActiveThemeId(theme.id)
  },

  duplicateTheme: (id) => {
    const source = findTheme(id, get().themes)
    if (!source) return id
    const custom = get().themes
    const copy: ColorTheme = {
      id: createCustomId(custom),
      name: uniqueCopyName(source.name, custom),
      colors: [...source.colors],
    }
    const next = [...custom, copy]
    persist(next)
    // 复制出来的新色板立即套用，配合编辑器做到“边改边看”
    set({ themes: next, activeThemeId: copy.id, palette: [...copy.colors] })
    saveActiveThemeId(copy.id)
    return copy.id
  },

  saveCustomTheme: (id, name, colors) => {
    const custom = get().themes
    const existing = id ? custom.find(t => t.id === id) : undefined
    let next: ColorTheme[]
    let savedId: string

    if (existing) {
      // 更新已有自定义色板
      next = custom.map(t => (t.id === id ? { ...t, name, colors: [...colors] } : t))
      savedId = id!
    } else {
      // 从内置色板编辑保存，或编辑过程中新建：另存为一套自定义色板
      const created: ColorTheme = { id: createCustomId(custom), name, colors: [...colors] }
      next = [...custom, created]
      savedId = created.id
    }

    persist(next)
    set({ themes: next, activeThemeId: savedId, palette: [...colors] })
    saveActiveThemeId(savedId)
    return savedId
  },

  deleteCustomTheme: (id) => {
    const custom = get().themes
    const target = custom.find(t => t.id === id)
    if (!target) return false
    const isActive = get().activeThemeId === id

    const next = custom.filter(t => t.id !== id)
    persist(next)

    if (isActive) {
      // 正在使用的色板被删：回退到第一套内置色板（日落），并同步选中态
      const fallback = BUILTIN_THEMES[0]
      set({ themes: next, activeThemeId: fallback.id, palette: [...fallback.colors] })
      saveActiveThemeId(fallback.id)
    } else {
      set({ themes: next })
    }
    return isActive
  },

  previewPalette: (colors) => set({ palette: [...colors] }),
  restorePalette: () => {
    const theme = findTheme(get().activeThemeId, get().themes)
    if (theme) set({ palette: [...theme.colors] })
  },

  setBgMode: (mode) => {
    set({ bgMode: mode, bgColor: BG_COLORS[mode] })
    saveBgMode(mode)
  },

  randomSeed: () => set({ seed: Math.floor(Math.random() * 99999) }),
  setSvgContent: (s) => set({ svgContent: s }),
  exportSvg: () => {
    const { svgContent } = get()
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `art-${get().seed}.svg`; a.click()
    URL.revokeObjectURL(url)
  },
  exportPng: () => {
    const { svgContent, width, height } = get()
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob!)
        a.download = `art-${get().seed}.png`; a.click()
      })
    }
    img.src = url
  },
}))
