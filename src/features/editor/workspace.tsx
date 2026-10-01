import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ScreenKey } from '@/app/screens'
import { frameImage, MODE_LABEL, timeText, type EditorMode } from './data'
import styles from './Workspace.module.css'

export interface WorkspaceProps { onNavigate: (screen: ScreenKey) => void }
export function useDraft<T>(mode: EditorMode, initial: T, valid: (value: unknown) => value is T) {
  const key = `stepd.editor.${mode}.v1`
  const [history, setHistory] = useState<{ past: T[]; present: T; future: T[] }>(() => {
    let present = initial
    try {
      const raw = localStorage.getItem(key)
      const value: unknown = raw ? JSON.parse(raw) : null
      if (valid(value)) present = value
    } catch { /* 저장소가 없으면 기본 초안을 사용합니다. */ }
    return { past: [], present, future: [] }
  })
  const [status, setStatus] = useState('로컬 초안')
  const save = () => {
    try { localStorage.setItem(key, JSON.stringify(history.present)); setStatus('이 브라우저에 저장됨'); return true }
    catch { setStatus('저장 실패 · 설정을 다운로드해 주세요'); return false }
  }
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const timer = window.setTimeout(() => saveRef.current(), 700)
    return () => { window.clearTimeout(timer) }
  }, [history.present])
  useEffect(() => () => { saveRef.current() }, [])
  const update = (change: T | ((current: T) => T)) => {
    setHistory(h => ({ past: [...h.past.slice(-49), h.present], present: typeof change === 'function' ? (change as (current: T) => T)(h.present) : change, future: [] }))
    setStatus('저장 중…')
  }
  const undo = () => setHistory(h => h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h)
  const redo = () => setHistory(h => h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h)
  const historyActions = useRef({ undo, redo })
  historyActions.current = { undo, redo }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.code === 'KeyS') { event.preventDefault(); saveRef.current() }
      if (event.code === 'KeyZ' && !(event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true]'))) {
        event.preventDefault()
        if (event.shiftKey) historyActions.current.redo()
        else historyActions.current.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return { state: history.present, update, undo, redo, canUndo: !!history.past.length, canRedo: !!history.future.length, save, status }
}

export function useTransport(start: number, end: number, seekBounds: [number, number] = [start, end]) {
  const [pos, setPos] = useState(start)
  const [playing, setPlaying] = useState(false)
  useEffect(() => { setPos(p => Math.min(end, Math.max(start, p))); setPlaying(false) }, [start, end])
  useEffect(() => {
    if (!playing || end <= start) return
    const timer = window.setInterval(() => setPos(p => {
      if (p + .25 >= end) { setPlaying(false); return end }
      return p + .25
    }), 250)
    return () => window.clearInterval(timer)
  }, [playing, start, end])
  const toggle = () => { if (end <= start) return; if (pos >= end || pos < start) setPos(start); setPlaying(p => !p) }
  const seek = (value: number) => setPos(Math.min(seekBounds[1], Math.max(seekBounds[0], value)))
  const toggleRef = useRef(toggle)
  toggleRef.current = toggle
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('input, textarea, select, button, [contenteditable=true], dialog')) return
      if (event.code === 'Space') { event.preventDefault(); toggleRef.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return { pos, playing, seek, toggle }
}

interface HeaderProps extends WorkspaceProps {
  mode: EditorMode; title: string; duration: number; status: string; save: () => boolean
  canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void; onExport: () => void
}
export function EditorHeader({ mode, title, duration, status, save, onNavigate, canUndo, canRedo, undo, redo, onExport }: HeaderProps) {
  const go = (screen: ScreenKey) => { if (save()) onNavigate(screen) }
  return <header className={styles.header}>
    <button type="button" className={styles.exit} onClick={() => go('media')} aria-label="저장하고 미디어로 돌아가기">← <span>미디어</span></button>
    <span className={styles.brand}>STEP D</span>
    <nav className={styles.editorSwitch} aria-label="편집기 선택">
      {(['short', 'clip', 'hl'] as const).map(key => <button type="button" key={key} aria-current={mode === key ? 'page' : undefined} onClick={() => { if (key !== mode) go(`editor-${key}`) }}>{MODE_LABEL[key]}<span>{key === 'short' ? '9:16' : key === 'clip' ? '16:9' : '챕터'}</span></button>)}
    </nav>
    <div className={styles.project}><strong>{title}</strong><span>나는 SOLO · {mode === 'hl' ? '1–12회' : '32회'} · {timeText(duration)}</span></div>
    <div className={styles.headerActions}>
      <span className={styles.saveStatus} role="status">{status}</span>
      <button type="button" className={styles.iconButton} aria-label="실행 취소" disabled={!canUndo} onClick={undo}>↶</button>
      <button type="button" className={styles.iconButton} aria-label="다시 실행" disabled={!canRedo} onClick={redo}>↷</button>
      <button type="button" className={styles.button} onClick={save}>저장</button>
      <button type="button" className={styles.primaryButton} onClick={onExport} disabled={duration <= 0}>내보내기 설정 ↗</button>
    </div>
  </header>
}

export function PanelHeading({ title, meta, children }: { title: string; meta?: string; children?: ReactNode }) {
  return <div className={styles.panelHeading}><div><h2>{title}</h2>{meta && <span>{meta}</span>}</div>{children}</div>
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>
}

export function Preview({ image = 'f5', portrait = false, title, caption, badge, children, filtered = false, frame = 'basic', position = 50, captionSize }: {
  image?: string; portrait?: boolean; title?: string; caption?: string; badge?: string; children?: ReactNode; filtered?: boolean; frame?: string; position?: number; captionSize?: number
}) {
  return <div className={`${styles.preview} ${portrait ? styles.portrait : styles.landscape} ${filtered ? styles.filtered : ''} ${frame === 'clean' ? styles.cleanFrame : ''}`}>
    <img src={frameImage(image)} alt="샘플 영상 프레임" style={{ objectPosition: `${position}% center` }} />
    {portrait && <><div className={styles.safeTop} /><div className={styles.safeBottom} /></>}
    {badge && <span className={styles.previewBadge}>{badge}</span>}
    {title && <div className={styles.previewTitle}>{title}</div>}
    {caption && <div className={styles.caption}><span style={captionSize ? { fontSize: captionSize } : undefined}>{caption}</span></div>}
    {children}
  </div>
}

export function Transport({ transport, start = 0, end, label = '결과물 미리보기' }: {
  transport: ReturnType<typeof useTransport>; start?: number; end: number; label?: string
}) {
  return <div className={styles.transport}>
    <button type="button" className={styles.iconButton} aria-label={transport.playing ? '미리보기 일시정지' : '미리보기 재생'} disabled={end <= start} onClick={transport.toggle}>{transport.playing ? 'Ⅱ' : '▶'}</button>
    <span>{timeText(transport.pos)} <small>/ {timeText(end)}</small></span>
    <input aria-label="재생 위치" type="range" min={start} max={Math.max(start, end)} step="0.25" value={transport.pos} onChange={event => transport.seek(Number(event.target.value))} disabled={end <= start} />
    <small className={styles.transportLabel}>{label}</small>
  </div>
}

export function ExportDialog({ mode, title, duration, settings, onClose }: {
  mode: EditorMode; title: string; duration: number; settings: unknown; onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ schemaVersion: 1, mode, title, duration, settings }, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `stepd-${mode}-edit.json`; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <dialog ref={ref} className={styles.exportDialog} aria-labelledby="editor-export-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <PanelHeading title="내보내기 설정"><button type="button" className={styles.iconButton} aria-label="내보내기 설정 닫기" onClick={onClose}>×</button></PanelHeading>
    <div className={styles.dialogContent}>
      <h3 id="editor-export-title">{title}</h3>
      <dl className={styles.exportSummary}><div><dt>콘텐츠</dt><dd>{MODE_LABEL[mode]}</dd></div><div><dt>화면 규격</dt><dd>{mode === 'short' ? '1080 × 1920 · 9:16' : '1920 × 1080 · 16:9'}</dd></div><div><dt>결과물 길이</dt><dd>{timeText(duration)}</dd></div></dl>
      <p>편집 설정을 JSON 파일로 다운로드할 수 있습니다. 영상 렌더링은 STEPD 연동 후 사용할 수 있습니다.</p>
      <button type="button" className={styles.primaryButton} onClick={download}>편집 설정 다운로드</button>
    </div>
  </dialog>
}

export function TimelineRuler({ duration, start = 0 }: { duration: number; start?: number }) {
  return <div className={styles.ruler}>{Array.from({ length: 9 }, (_, i) => <span key={i}>{timeText(start + duration * i / 8)}</span>)}</div>
}

export function SequenceStrip({ segments, selected, onSelect, onMove }: { segments: Array<{ id: string; label: string; dur: number; img: string }>; selected: string; onSelect: (id: string) => void; onMove?: (id: string, delta: number) => void }) {
  return <div className={styles.sequenceStrip}>{segments.map((piece, index) => <div key={piece.id} className={`${styles.stripItem} ${selected === piece.id ? styles.stripSelected : ''}`}>
    <button type="button" className={styles.stripPick} aria-pressed={selected === piece.id} onClick={() => onSelect(piece.id)}>
      <img src={frameImage(piece.img)} alt="" /><span><strong>{piece.label}</strong><small>{timeText(piece.dur)}</small></span>
    </button>
    {onMove && <div className={styles.stripMove}><button type="button" aria-label={`${piece.label} 앞으로 이동`} disabled={index === 0} onClick={() => onMove(piece.id, -1)}>←</button><button type="button" aria-label={`${piece.label} 뒤로 이동`} disabled={index === segments.length - 1} onClick={() => onMove(piece.id, 1)}>→</button></div>}
  </div>)}</div>
}
