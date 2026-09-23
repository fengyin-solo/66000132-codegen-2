import { useEffect, useMemo, useRef, useState } from 'react'
import { useDesignStore } from '../store/design'
import type { BgMode, ColorTheme } from '../types'
import {
  BG_COLORS,
  BUILTIN_THEMES,
  COLOR_COUNT,
  isValidHex,
  makeCustomId,
  normalizeHex,
} from '../themes/palettes'

interface EditorState {
  id: string
  name: string
  colors: string[]
  /** true = 复制产生的新色板（保存时才落地）；false = 编辑已有色板 */
  duplicate: boolean
}

/* ---------------------------------- 色卡 ---------------------------------- */

function PaletteCard({
  theme,
  active,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onReset,
}: {
  theme: ColorTheme
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onReset: () => void
}) {
  const original = BUILTIN_THEMES.find(b => b.id === theme.id)
  const changed =
    theme.builtin &&
    !!original &&
    (original.name !== theme.name ||
      JSON.stringify(original.colors) !== JSON.stringify(theme.colors))

  return (
    <div
      className={`rounded-lg border p-2 transition-colors ${
        active
          ? 'border-indigo-400 bg-gray-800/80'
          : 'border-gray-700 bg-gray-800/40 hover:border-gray-500'
      }`}
    >
      <button onClick={onSelect} className="w-full text-left" title="套用此配色">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium flex items-center gap-1">
            {theme.name}
            {!theme.builtin && (
              <span className="text-[10px] px-1 rounded bg-indigo-500/30 text-indigo-200">
                自定义
              </span>
            )}
          </span>
          {active && <span className="text-[10px] text-indigo-300">使用中 ✓</span>}
        </div>
        <div className="flex h-3 rounded overflow-hidden">
          {theme.colors.map((c, i) => (
            <div key={i} style={{ background: c }} className="flex-1" />
          ))}
        </div>
      </button>
      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
        <button onClick={onDuplicate} className="hover:text-gray-200">复制</button>
        <button onClick={onEdit} className="hover:text-gray-200">编辑</button>
        {theme.builtin ? (
          changed && (
            <button onClick={onReset} className="hover:text-amber-300 text-amber-400/80">
              还原内置
            </button>
          )
        ) : (
          <button onClick={onDelete} className="hover:text-rose-300 text-rose-400/80 ml-auto">
            删除
          </button>
        )}
      </div>
    </div>
  )
}

/* --------------------------------- 编辑器 --------------------------------- */

function PaletteEditor({
  initial,
  onClose,
}: {
  initial: EditorState
  onClose: () => void
}) {
  const store = useDesignStore()
  const [draft, setDraft] = useState<EditorState>(initial)
  // 打开编辑器前正在使用的色板：取消时恢复画面
  const [prevActiveId] = useState(() => useDesignStore.getState().activeThemeId)
  const savedRef = useRef(false)

  const normColors = useMemo(
    () => draft.colors.map(c => normalizeHex(c)),
    [draft.colors]
  )
  const invalidCells = useMemo(
    () =>
      normColors
        .map((n, i) => (n === null ? i : -1))
        .filter(i => i >= 0),
    [normColors]
  )
  const nameEmpty = draft.name.trim() === ''
  const canSave = invalidCells.length === 0 && !nameEmpty

  // 进入编辑即把该色板挂到画面上，逐格改动（合法时）实时预览
  useEffect(() => {
    useDesignStore.setState({ activeThemeId: draft.id })
    if (invalidCells.length === 0) {
      useDesignStore.setState({ palette: normColors as string[] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 编辑过程中：全部格子合法才推到画面，非法值不悄悄替换
  useEffect(() => {
    if (invalidCells.length === 0) {
      useDesignStore.setState({ palette: normColors as string[] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.colors.join('|')])

  // 取消（未保存）：恢复打开前正在使用的色板
  useEffect(() => {
    return () => {
      if (!savedRef.current) {
        useDesignStore.getState().setTheme(prevActiveId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setCell = (i: number, value: string) =>
    setDraft(d => {
      const colors = d.colors.slice()
      colors[i] = value
      return { ...d, colors }
    })

  const save = () => {
    if (!canSave) return // 有非法格时不允许保存，更不会回退默认色
    savedRef.current = true
    store.saveTheme(draft.id, draft.name, normColors as string[])
    onClose()
  }

  return (
    <div className="rounded-lg border border-indigo-500/60 bg-gray-800 p-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-indigo-300">
          {initial.duplicate ? '复制为新色板' : '编辑色板'}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">✕</button>
      </div>

      {/* 命名 */}
      <div>
        <label className="text-[10px] text-gray-400 block mb-0.5">色板名称</label>
        <input
          value={draft.name}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          className={`w-full bg-gray-900 rounded px-2 py-1 text-xs outline-none border ${
            nameEmpty ? 'border-rose-500' : 'border-gray-700 focus:border-indigo-500'
          }`}
          placeholder="给这套配色起个名字"
        />
        {nameEmpty && (
          <p className="text-[10px] text-rose-400 mt-0.5">名称不能为空</p>
        )}
      </div>

      {/* 逐格改色 */}
      <div className="flex flex-col gap-1.5">
        {draft.colors.map((raw, i) => {
          const valid = isValidHex(raw)
          const norm = normColors[i]
          return (
            <div key={i}>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-500 w-7">第{i + 1}格</span>
                <input
                  type="color"
                  // 原生取色器只接受合法 #rrggbb，非法时不改变文本框内容
                  value={norm ?? '#000000'}
                  onChange={e => setCell(i, e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer bg-transparent border border-gray-700 p-0"
                  title="取色器"
                />
                <input
                  value={raw}
                  onChange={e => setCell(i, e.target.value)}
                  spellCheck={false}
                  className={`flex-1 min-w-0 bg-gray-900 rounded px-2 py-1 text-xs font-mono outline-none border ${
                    valid
                      ? 'border-gray-700 focus:border-indigo-500'
                      : 'border-rose-500 text-rose-300'
                  }`}
                  placeholder="#rrggbb"
                />
                <div
                  className="w-5 h-5 rounded border border-gray-600"
                  style={{ background: valid ? (norm ?? raw) : 'repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%) 50% / 8px 8px' }}
                  title={valid ? '当前颜色' : '色值无效'}
                />
              </div>
              {!valid && (
                <p className="text-[10px] text-rose-400 mt-0.5 pl-8">
                  第{i + 1}格色值无效：{raw.trim() === '' ? '不能为空' : `「${raw}」不是合法色值`}，应写成 <span className="font-mono">#rrggbb</span>（如 #1a659e）
                </p>
              )}
            </div>
          )
        })}
      </div>

      {invalidCells.length > 0 && (
        <p className="text-[10px] text-rose-400">
          共 {invalidCells.length} 格色值不合法（第 {invalidCells.map(i => i + 1).join('、')} 格），修正后才能保存；当前画面保持上一次的合法配色。
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!canSave}
          className={`flex-1 py-1.5 rounded text-xs font-medium ${
            canSave ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          保存并套用
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-1.5 rounded text-xs bg-gray-700 hover:bg-gray-600"
        >
          取消
        </button>
      </div>
      {initial.duplicate
        ? '取消后将放弃这套尚未保存的新配色'
        : '取消后将放弃本次未保存的修改'}
    </div>
  )
}

/* -------------------------------- 主组件 ---------------------------------- */

export default function PaletteManager() {
  const themes = useDesignStore(s => s.themes)
  const activeThemeId = useDesignStore(s => s.activeThemeId)
  const bgMode = useDesignStore(s => s.bgMode)
  const setTheme = useDesignStore(s => s.setTheme)
  const setBgMode = useDesignStore(s => s.setBgMode)
  const deleteTheme = useDesignStore(s => s.deleteTheme)
  const resetBuiltin = useDesignStore(s => s.resetBuiltin)

  const [editor, setEditor] = useState<EditorState | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const activeTheme = themes.find(t => t.id === activeThemeId)
  const confirmTheme = themes.find(t => t.id === confirmId) ?? null
  const deletingActive = confirmTheme?.id === activeThemeId
  const fallbackName = themes[0]?.name ?? '日落'

  const newFromActive = () => {
    const source = activeTheme ?? themes[0]
    setEditor({
      id: makeCustomId(),
      name: `${source.name} 副本`,
      colors: source.colors.slice(0, COLOR_COUNT),
      duplicate: true,
    })
  }

  const quickDuplicate = (t: ColorTheme) => {
    // 以草稿形式复制；保存时才落地为新色板，取消则不留痕迹
    setEditor({
      id: makeCustomId(),
      name: `${t.name} 副本`,
      colors: t.colors.slice(0, COLOR_COUNT),
      duplicate: true,
    })
  }

  const doDelete = () => {
    if (confirmId) deleteTheme(confirmId)
    setConfirmId(null)
  }

  const modeBtn = (mode: BgMode, label: string) => (
    <button
      onClick={() => setBgMode(mode)}
      className={`flex-1 py-1 rounded text-xs ${
        bgMode === mode ? 'bg-indigo-600 font-medium' : 'bg-gray-700 hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-2">
      {/* 深 / 浅画面切换：画面实时按对应底色预览色板效果 */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">画面底色预览</label>
        <div className="flex gap-1">
          {modeBtn('dark', '🌙 深色画面')}
          {modeBtn('light', '☀️ 浅色画面')}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400">
          颜色主题（{themes.length} 套）
        </label>
        <button
          onClick={newFromActive}
          className="text-[10px] px-2 py-0.5 rounded bg-indigo-600/80 hover:bg-indigo-500"
          title="从当前色板复制一套新配色"
        >
          ＋ 新建
        </button>
      </div>

      {/* 色板卡片列表 */}
      <div className="flex flex-col gap-1.5">
        {themes.map(t => (
          <PaletteCard
            key={t.id}
            theme={t}
            active={t.id === activeThemeId}
            onSelect={() => setTheme(t.id)}
            onEdit={() =>
              setEditor({ id: t.id, name: t.name, colors: t.colors.slice(), duplicate: false })
            }
            onDuplicate={() => quickDuplicate(t)}
            onDelete={() => setConfirmId(t.id)}
            onReset={() => resetBuiltin(t.id)}
          />
        ))}
      </div>

      {/* 编辑器 */}
      {editor && <PaletteEditor initial={editor} onClose={() => setEditor(null)} />}

      {/* 删除确认：删除正在使用的色板前先说明影响 */}
      {confirmTheme && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setConfirmId(null)}
        >
          <div
            className="bg-gray-800 border border-gray-600 rounded-lg p-4 w-72 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold">删除自定义色板</h3>
            <p className="text-xs text-gray-300 leading-5">
              确定删除「{confirmTheme.name}」吗？
            </p>
            {deletingActive ? (
              <p className="text-xs text-amber-300 leading-5">
                ⚠️ 这是当前画面正在使用的色板。删除后画面将立即切换为「{fallbackName}」配色，
                且本地保存的这套自定义配色会被一并移除，无法恢复。
              </p>
            ) : (
              <p className="text-xs text-gray-400 leading-5">
                删除后无法恢复，当前画面不受影响。
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={doDelete}
                className="flex-1 py-1.5 rounded text-xs bg-rose-600 hover:bg-rose-500 font-medium"
              >
                确认删除
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-1.5 rounded text-xs bg-gray-700 hover:bg-gray-600"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
