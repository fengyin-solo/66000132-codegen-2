import { useMemo, useState } from 'react'
import { useDesignStore } from '../store/design'
import type { ColorTheme } from '../types'
import {
  BUILTIN_THEMES,
  invalidColorIndexes, isBuiltinTheme, isValidColor, toHex,
} from '../themes/palettes'

interface Draft {
  /** null 表示由内置色板“另存为自定义”；否则为正在编辑的自定义色板 id */
  id: string | null
  sourceName: string
  name: string
  colors: string[]
}

const COLOR_LABELS = ['色格 1', '色格 2', '色格 3', '色格 4', '色格 5']

export default function PalettePanel() {
  const themes = useDesignStore(s => s.themes)
  const activeThemeId = useDesignStore(s => s.activeThemeId)
  const bgMode = useDesignStore(s => s.bgMode)
  const applyTheme = useDesignStore(s => s.applyTheme)
  const duplicateTheme = useDesignStore(s => s.duplicateTheme)
  const saveCustomTheme = useDesignStore(s => s.saveCustomTheme)
  const deleteCustomTheme = useDesignStore(s => s.deleteCustomTheme)
  const previewPalette = useDesignStore(s => s.previewPalette)
  const restorePalette = useDesignStore(s => s.restorePalette)
  const setBgMode = useDesignStore(s => s.setBgMode)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const allThemes = useMemo(() => [...BUILTIN_THEMES, ...themes], [themes])
  const invalidIndexes = draft ? invalidColorIndexes(draft.colors) : []
  const nameError = draft ? draft.name.trim().length === 0 : false

  function openEditor(theme: ColorTheme) {
    // 若正在编辑未保存的草稿，先还原画面，避免上一套预览“粘”在新编辑器上
    if (draft) restorePalette()
    setConfirmDeleteId(null)
    const nextDraft: Draft = isBuiltinTheme(theme.id)
      // 内置色板不能原地修改：以它为底，另存为一套自定义色板
      ? { id: null, sourceName: theme.name, name: `${theme.name} 改`, colors: [...theme.colors] }
      : { id: theme.id, sourceName: theme.name, name: theme.name, colors: [...theme.colors] }
    setDraft(nextDraft)
    // 进入编辑即开始在画面上预览这套颜色（含尚未改动的原始色），方便立刻切深/浅色看效果
    if (invalidColorIndexes(nextDraft.colors).length === 0) previewPalette(nextDraft.colors)
  }

  function handleDuplicate(theme: ColorTheme) {
    if (draft) restorePalette()
    setConfirmDeleteId(null)
    const newId = duplicateTheme(theme.id)
    const created = useDesignStore.getState().themes.find(t => t.id === newId)
    if (created) {
      setDraft({ id: created.id, sourceName: created.name, name: created.name, colors: [...created.colors] })
    }
  }

  function changeCell(index: number, value: string) {
    if (!draft) return
    const colors = draft.colors.map((c, i) => (i === index ? value : c))
    setDraft({ ...draft, colors })
    // 全部色格合法才推送到画面；有非法色格时保留上一次合法预览，绝不悄悄退回默认
    if (invalidColorIndexes(colors).length === 0) {
      previewPalette(colors)
    }
  }

  function changeName(value: string) {
    if (!draft) return
    setDraft({ ...draft, name: value })
  }

  function handleSave() {
    if (!draft || invalidIndexes.length > 0 || nameError) return
    saveCustomTheme(draft.id, draft.name.trim(), draft.colors)
    setDraft(null)
  }

  function handleCancel() {
    restorePalette()
    setDraft(null)
  }

  function handleDeleteClick(theme: ColorTheme) {
    if (confirmDeleteId === theme.id) {
      deleteCustomTheme(theme.id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(theme.id)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 深色 / 浅色背景切换，切换后立即在画面上预览当前色板效果 */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">背景预览</label>
        <div className="grid grid-cols-2 gap-1 rounded-md overflow-hidden border border-gray-700">
          <button
            onClick={() => setBgMode('dark')}
            className={`px-2 py-1.5 text-xs font-medium ${bgMode === 'dark' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >🌙 深色</button>
          <button
            onClick={() => setBgMode('light')}
            className={`px-2 py-1.5 text-xs font-medium ${bgMode === 'light' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >☀️ 浅色</button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400">颜色主题</label>
        <span className="text-[10px] text-gray-500">{themes.length} 套自定义 · 本地保存</span>
      </div>

      {/* 色板卡片列表 */}
      <div className="flex flex-col gap-2">
        {allThemes.map(theme => {
          const selected = theme.id === activeThemeId
          const builtin = isBuiltinTheme(theme.id)
          const confirming = confirmDeleteId === theme.id
          return (
            <div
              key={theme.id}
              className={`rounded-lg border p-2 transition-colors ${
                selected ? 'border-indigo-500 bg-gray-800/80' : 'border-gray-700 bg-gray-800/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => applyTheme(theme.id)}
                  className="flex-1 min-w-0 text-left"
                  title="套用这套配色"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium truncate ${selected ? 'text-indigo-300' : 'text-gray-200'}`}>
                      {theme.name}
                    </span>
                    {selected && <span className="text-[10px] text-indigo-400 shrink-0">使用中</span>}
                    {!builtin && <span className="text-[10px] text-amber-400/80 shrink-0">自定义</span>}
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {theme.colors.map((c, i) => (
                      <div
                        key={i}
                        title={isValidColor(c) ? c : `第 ${i + 1} 格色值无效：${c || '(空)'}`}
                        className="w-6 h-6 rounded border border-black/30"
                        style={{ background: isValidColor(c) ? c : 'repeating-conic-gradient(#6b7280 0% 25%, #374151 0% 50%) 50% / 8px 8px' }}
                      />
                    ))}
                  </div>
                </button>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => openEditor(theme)}
                    className="px-2 py-0.5 rounded text-[10px] bg-gray-700 hover:bg-gray-600"
                    title={builtin ? '以此为底另存并编辑' : '逐格改色'}
                  >{builtin ? '改色' : '编辑'}</button>
                  <button
                    onClick={() => handleDuplicate(theme)}
                    className="px-2 py-0.5 rounded text-[10px] bg-gray-700 hover:bg-gray-600"
                    title="复制出一套新配色"
                  >复制</button>
                  {!builtin && (
                    <button
                      onClick={() => handleDeleteClick(theme)}
                      className="px-2 py-0.5 rounded text-[10px] bg-rose-800/70 hover:bg-rose-700"
                    >{confirming ? '再次点击确认' : '删除'}</button>
                  )}
                </div>
              </div>

              {/* 删除正在使用的配色前，先说明影响 */}
              {confirming && (
                <div className="mt-2 p-2 rounded bg-rose-950/70 border border-rose-800 text-[10px] leading-relaxed text-rose-200">
                  {selected
                    ? `「${theme.name}」正在画面上使用。删除后作品会立即改用内置色板「日落」，此自定义配色将从本地存储中移除且无法恢复。`
                    : `确认删除自定义配色「${theme.name}」？删除后将从本地存储中移除且无法恢复，当前画面不受影响。`}
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={() => handleDeleteClick(theme)} className="px-2 py-0.5 rounded bg-rose-600 text-white">确认删除</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-0.5 rounded bg-gray-700 text-gray-200">取消</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 逐格编辑器 */}
      {draft && (
        <div className="rounded-lg border border-indigo-700 bg-gray-800 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300">
              {draft.id ? `编辑配色（预览中）` : `基于「${draft.sourceName}」另存`}
            </span>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-200 text-xs">✕</button>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">配色名称</label>
            <input
              value={draft.name}
              onChange={e => changeName(e.target.value)}
              maxLength={20}
              className={`w-full px-2 py-1 rounded text-xs bg-gray-900 border ${nameError ? 'border-rose-500' : 'border-gray-600'} text-white`}
              placeholder="给这套配色起个名字"
            />
            {nameError && <p className="text-[10px] text-rose-400 mt-1">名称不能为空</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            {draft.colors.map((c, i) => {
              const bad = !isValidColor(c)
              return (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <label className={`text-[10px] w-10 shrink-0 ${bad ? 'text-rose-400' : 'text-gray-400'}`}>
                      {COLOR_LABELS[i]}
                    </label>
                    <input
                      type="color"
                      value={toHex(bad ? '#000000' : c)}
                      onChange={e => changeCell(i, e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border border-gray-600 p-0"
                      title="取色器"
                    />
                    <input
                      value={c}
                      onChange={e => changeCell(i, e.target.value)}
                      className={`flex-1 min-w-0 px-2 py-1 rounded text-xs font-mono bg-gray-900 border text-white ${
                        bad ? 'border-rose-500' : 'border-gray-600'
                      }`}
                      placeholder="#rrggbb 或 rgb(...)"
                      spellCheck={false}
                    />
                  </div>
                  {bad && (
                    <p className="text-[10px] text-rose-400 mt-0.5 pl-12">
                      {COLOR_LABELS[i]}色值不合法：{c.trim() ? `「${c}」` : '不能为空'}，请使用 #rrggbb / #rgb 或 rgb() 格式
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {invalidIndexes.length > 0 && (
            <p className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800 rounded p-1.5">
              第 {invalidIndexes.map(i => i + 1).join('、')} 格色值不合法，修正前无法保存；画面保留上一次的合法效果。
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={invalidIndexes.length > 0 || nameError}
              className="flex-1 py-1.5 rounded text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
            >保存并套用</button>
            <button
              onClick={handleCancel}
              className="flex-1 py-1.5 rounded text-xs bg-gray-700 hover:bg-gray-600"
            >取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
