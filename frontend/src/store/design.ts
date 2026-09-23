import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BgMode, ColorTheme, DesignParams, PatternType } from '../types'
import { BG_COLORS, BUILTIN_THEMES, COLOR_COUNT } from '../themes/palettes'

/** 合并内置色板与本地保存的改动：覆盖内置、追加自定义 */
function resolveThemes(
  overrides: Record<string, ColorTheme> | undefined,
  customs: ColorTheme[] | undefined
): ColorTheme[] {
  const list = BUILTIN_THEMES.map(b => overrides?.[b.id] ?? b)
  for (const c of customs ?? []) {
    if (!list.some(t => t.id === c.id)) {
      list.push({ ...c, builtin: false })
    }
  }
  return list
}

interface PersistedPaletteState {
  builtinOverrides: Record<string, ColorTheme>
  customThemes: ColorTheme[]
  activeThemeId: string
  bgMode: BgMode
}

interface DesignStore extends DesignParams {
  // —— 色板管理 ——
  themes: ColorTheme[]
  activeThemeId: string
  bgMode: BgMode
  builtinOverrides: Record<string, ColorTheme>
  customThemes: ColorTheme[]
  setTheme: (id: string) => void
  setBgMode: (mode: BgMode) => void
  /** 保存编辑结果；新建（id 不存在）则插入，否则覆盖 */
  saveTheme: (id: string, name: string, colors: string[]) => void
  /** 删除自定义色板；返回实际生效的新选中 id */
  deleteTheme: (id: string) => void
  /** 内置色板还原为初始色板 */
  resetBuiltin: (id: string) => void

  // —— 图案参数 ——
  svgContent: string
  setParam: <K extends keyof DesignParams>(key: K, value: DesignParams[K]) => void
  setPattern: (p: PatternType) => void
  randomSeed: () => void
  setSvgContent: (s: string) => void
  exportSvg: () => void
  exportPng: () => void
}

export const useDesignStore = create<DesignStore>()(
  persist(
    (set, get) => ({
      // 初始值：默认选中第一套内置色板、深色底色
      pattern: 'spiral',
      seed: 42,
      iterations: 200,
      scale: 1.0,
      rotation: 0,
      strokeWidth: 1.5,
      opacity: 0.8,
      bgMode: 'dark',
      bgColor: BG_COLORS.dark,
      themes: BUILTIN_THEMES.slice(),
      activeThemeId: BUILTIN_THEMES[0].id,
      builtinOverrides: {},
      customThemes: [],
      palette: BUILTIN_THEMES[0].colors.slice(),
      width: 800,
      height: 1000,
      svgContent: '',

      setTheme: (id) => {
        const theme = get().themes.find(t => t.id === id)
        if (theme) set({ activeThemeId: id, palette: theme.colors.slice() })
      },

      setBgMode: (mode) => set({ bgMode: mode, bgColor: BG_COLORS[mode] }),

      saveTheme: (id, name, colors) => {
        const state = get()
        const existing = state.themes.find(t => t.id === id)
        const theme: ColorTheme = {
          id,
          name: name.trim(),
          colors: colors.slice(0, COLOR_COUNT),
          builtin: existing?.builtin ?? false,
        }
        if (existing?.builtin) {
          const overrides = { ...state.builtinOverrides, [id]: theme }
          set({
            builtinOverrides: overrides,
            themes: state.themes.map(t => (t.id === id ? theme : t)),
          })
        } else if (existing) {
          set({
            customThemes: state.customThemes.map(t => (t.id === id ? theme : t)),
            themes: state.themes.map(t => (t.id === id ? theme : t)),
          })
        } else {
          // 保存时才落地的新色板（编辑器中新建并预览）
          set({
            customThemes: [...state.customThemes, theme],
            themes: [...state.themes, theme],
            activeThemeId: id,
          })
        }
        // 当前正在用这套颜色：立即生效
        if (get().activeThemeId === id) {
          set({ palette: theme.colors.slice() })
        }
      },

      deleteTheme: (id) => {
        const state = get()
        const target = state.themes.find(t => t.id === id)
        if (!target || target.builtin) return
        const customs = state.customThemes.filter(t => t.id !== id)
        const themes = state.themes.filter(t => t.id !== id)
        const patch: Partial<DesignStore> = { customThemes: customs, themes }
        if (state.activeThemeId === id) {
          // 删除正在使用的色板后回退到第一套（通常为「日落」）
          const fallback = themes[0]
          patch.activeThemeId = fallback.id
          patch.palette = fallback.colors.slice()
        }
        set(patch)
      },

      resetBuiltin: (id) => {
        const state = get()
        const original = BUILTIN_THEMES.find(t => t.id === id)
        if (!original) return
        const overrides = { ...state.builtinOverrides }
        delete overrides[id]
        set({
          builtinOverrides: overrides,
          themes: state.themes.map(t => (t.id === id ? original : t)),
        })
        if (state.activeThemeId === id) {
          set({ palette: original.colors.slice() })
        }
      },

      setParam: (key, value) => set({ [key]: value } as any),
      setPattern: (p) => set({ pattern: p }),
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
    }),
    {
      name: 'generative-art-palettes-v1',
      partialize: (s): PersistedPaletteState => ({
        builtinOverrides: s.builtinOverrides,
        customThemes: s.customThemes,
        activeThemeId: s.activeThemeId,
        bgMode: s.bgMode,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedPaletteState>
        const themes = resolveThemes(p.builtinOverrides, p.customThemes)
        // 选中的色板若已不存在（如本地数据残缺），回退第一套，而不是静默丢配色
        const activeTheme =
          themes.find(t => t.id === p.activeThemeId) ?? themes[0]
        const bgMode: BgMode = p.bgMode === 'light' ? 'light' : 'dark'
        return {
          ...current,
          builtinOverrides: p.builtinOverrides ?? {},
          customThemes: p.customThemes ?? [],
          themes,
          activeThemeId: activeTheme.id,
          palette: activeTheme.colors.slice(),
          bgMode,
          bgColor: BG_COLORS[bgMode],
        }
      },
    }
  )
)
