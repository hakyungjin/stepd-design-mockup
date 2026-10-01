import { useState } from 'react'
import { CLIP_PIECES, CLIP_REC_GROUPS, frameImage, timeText, type Recommendation } from './data'
import { EditorHeader, ExportDialog, Field, PanelHeading, Preview, SequenceStrip, TimelineRuler, Transport, useDraft, useTransport, type WorkspaceProps } from './workspace'
import styles from './Workspace.module.css'

interface ClipSegment { id: string; label: string; img: string; line: string; sourceIn: number; sourceOut: number; sourceMin: number; sourceMax: number }
interface ClipDraft { title: string; segments: ClipSegment[]; captions: boolean; transition: 'cut' | 'fade' }
const INITIAL: ClipDraft = {
  title: '영호와 영숙, 대화의 끝', captions: true, transition: 'cut',
  segments: CLIP_PIECES.map((piece, index) => {
    const sourceIn = 2170 + CLIP_PIECES.slice(0, index).reduce((sum, p) => sum + p.dur, 0)
    return { id: piece.id, label: piece.label, img: piece.img, line: piece.line, sourceIn, sourceOut: sourceIn + piece.dur, sourceMin: sourceIn - 20, sourceMax: sourceIn + piece.dur + 20 }
  }),
}
const validDraft = (value: unknown): value is ClipDraft => {
  if (!value || typeof value !== 'object') return false
  const draft = value as ClipDraft
  return typeof draft.title === 'string' && typeof draft.captions === 'boolean' && ['cut', 'fade'].includes(draft.transition) && Array.isArray(draft.segments) && draft.segments.every(segment => typeof segment.id === 'string' && typeof segment.label === 'string' && typeof segment.img === 'string' && typeof segment.line === 'string' && [segment.sourceIn, segment.sourceOut, segment.sourceMin, segment.sourceMax].every(Number.isFinite) && segment.sourceIn >= segment.sourceMin && segment.sourceOut <= segment.sourceMax && segment.sourceOut > segment.sourceIn)
}

export function ClipEditorPage({ onNavigate }: WorkspaceProps) {
  const draft = useDraft('clip', INITIAL, validDraft)
  const { state, update } = draft
  const [selectedId, setSelectedId] = useState(state.segments[0]?.id ?? '')
  const [leftTab, setLeftTab] = useState<'source' | 'recommendations'>('source')
  const [previewMode, setPreviewMode] = useState<'result' | 'selected' | 'context'>('result')
  const [exportOpen, setExportOpen] = useState(false)
  const selected = state.segments.find(segment => segment.id === selectedId) ?? state.segments[0]
  const selectedIndex = selected ? state.segments.indexOf(selected) : -1
  const sequence = state.segments.map((segment, index) => ({ ...segment, dur: segment.sourceOut - segment.sourceIn, start: state.segments.slice(0, index).reduce((sum, item) => sum + item.sourceOut - item.sourceIn, 0) }))
  const total = sequence.reduce((sum, segment) => sum + segment.dur, 0)
  const selectedStart = sequence[selectedIndex]?.start ?? 0
  const start = selected && previewMode === 'context' ? Math.max(0, selected.sourceIn - 10) : previewMode === 'selected' ? selectedStart : 0
  const end = selected && previewMode === 'context' ? selected.sourceOut + 10 : previewMode === 'selected' ? selectedStart + (selected ? selected.sourceOut - selected.sourceIn : 0) : total
  const transport = useTransport(start, end)
  const current = previewMode === 'context' ? selected : sequence.find(segment => transport.pos >= segment.start && transport.pos < segment.start + segment.dur) ?? sequence[sequence.length - 1]
  const outside = previewMode === 'context' && selected && (transport.pos < selected.sourceIn || transport.pos >= selected.sourceOut)
  const patchSegment = (patch: Partial<ClipSegment>) => { if (selected) update(current => ({ ...current, segments: current.segments.map(segment => segment.id === selected.id ? { ...segment, ...patch } : segment) })) }
  const trimIn = (value: number) => { if (selected) patchSegment({ sourceIn: Math.max(selected.sourceMin, Math.min(selected.sourceOut - .5, value)) }) }
  const trimOut = (value: number) => { if (selected) patchSegment({ sourceOut: Math.min(selected.sourceMax, Math.max(selected.sourceIn + .5, value)) }) }
  const pick = (id: string) => {
    setSelectedId(id)
    if (previewMode === 'result') transport.seek(sequence.find(segment => segment.id === id)?.start ?? 0)
  }
  const move = (id: string, delta: number) => update(current => {
    const index = current.segments.findIndex(segment => segment.id === id)
    const target = index + delta
    if (index < 0 || target < 0 || target >= current.segments.length) return current
    const segments = [...current.segments]; [segments[index], segments[target]] = [segments[target], segments[index]]
    return { ...current, segments }
  })
  const add = (rec: Recommendation) => {
    const id = `clip-${crypto.randomUUID()}`
    const sourceIn = rec.pos === 'front' ? 2154 : rec.pos === 'swap' ? 2212 : 2374
    const segment: ClipSegment = { id, label: rec.title, img: rec.img, line: rec.line, sourceIn, sourceOut: sourceIn + rec.dur, sourceMin: sourceIn - 20, sourceMax: sourceIn + rec.dur + 20 }
    update(current => {
      const segments = [...current.segments]
      if (rec.pos === 'swap' && selectedIndex >= 0) segments.splice(selectedIndex, 1, segment)
      else if (rec.pos === 'front') segments.unshift(segment)
      else segments.push(segment)
      return { ...current, segments }
    })
    setSelectedId(id)
  }
  return <div className={styles.workspace} data-editor="clip">
    <EditorHeader mode="clip" title={state.title} duration={total} {...draft} onNavigate={onNavigate} onExport={() => setExportOpen(true)} />
    <div className={`${styles.threeColumns} ${styles.clipColumns}`}>
      <aside className={`${styles.panel} ${styles.leftPanel}`} aria-label="클립 장면 탐색">
        <PanelHeading title="장면 탐색" meta="32회" />
        <div className={styles.tabs} role="tablist" aria-label="클립 장면 목록"><button type="button" role="tab" aria-selected={leftTab === 'source'} onClick={() => setLeftTab('source')}>사용 장면 · {state.segments.length}</button><button type="button" role="tab" aria-selected={leftTab === 'recommendations'} onClick={() => setLeftTab('recommendations')}>✧ 추천 장면</button></div>
        {leftTab === 'source' ? <>
          <div className={styles.sceneList}>{state.segments.map((segment, index) => <button type="button" key={segment.id} className={styles.scene} aria-pressed={segment.id === selected?.id} onClick={() => pick(segment.id)}><img src={frameImage(segment.img)} alt="" /><span><strong>{index + 1}. {segment.label}</strong><small>{timeText(segment.sourceIn)}–{timeText(segment.sourceOut)}</small></span></button>)}</div>
          {!state.segments.length && <div className={styles.panelContent}><p className={styles.empty}>추천 장면을 추가해 클립 구성을 시작하세요.</p><button type="button" className={styles.button} onClick={() => setLeftTab('recommendations')}>추천 장면 보기</button></div>}
          <div className={styles.panelContent}><div className={styles.info}><strong>맥락을 이어서 한 편의 클립으로</strong>장면별 시작·끝을 조절하고 앞뒤 상황을 확인하세요. 아래 타임라인에서 장면 순서를 바꿀 수 있습니다.</div></div>
        </> : <div className={styles.panelContent}>{CLIP_REC_GROUPS.map(group => <section key={group.title}><h3 className={styles.sectionTitle}>{group.title}</h3>{group.items.map(rec => <div className={styles.recCard} key={rec.title}><img src={frameImage(rec.img)} alt="" /><div className={styles.recBody}><strong>{rec.title}</strong><p>{rec.why} · {timeText(rec.dur)}</p><div><span className={styles.recScore}>적합도 {rec.score}</span><button type="button" className={styles.button} onClick={() => add(rec)}>{rec.pos === 'swap' && selected ? '선택 장면 교체' : '구성에 추가'}</button></div></div></div>)}</section>)}</div>}
      </aside>
      <main className={`${styles.stage} ${styles.clipStage}`} aria-label="클립 미리보기">
        <div className={styles.stageToolbar}><div><strong>클립 편집기</strong><span>16:9 · 1920 × 1080</span></div><span>{state.segments.length}개 장면 · {timeText(total)}</span></div>
        <div className={styles.stageArea}>{current ? <Preview image={current.img} caption={state.captions ? current.line : undefined} badge={outside ? '원본 맥락 · 결과물에 포함되지 않음' : current.label} /> : <p className={styles.empty}>장면을 추가하면 결과물을 미리 볼 수 있습니다.</p>}</div>
        <p className={styles.quote}>{current ? `“${current.line}”` : '먼저 사용할 장면을 선택하세요.'}</p>
        <div className={styles.previewModes}>{([{ key: 'result', label: '전체 결과물' }, { key: 'selected', label: '선택 장면' }, { key: 'context', label: '원본 앞뒤 10초' }] as const).map(mode => <button type="button" key={mode.key} aria-pressed={previewMode === mode.key} disabled={!selected} onClick={() => setPreviewMode(mode.key)}>{mode.label}</button>)}</div>
        <div className={styles.previewNote}>샘플 프레임 미리보기</div>
        <Transport transport={transport} start={start} end={end} label={previewMode === 'context' ? '원본 시간' : '결과물 시간'} />
      </main>
      <aside className={`${styles.panel} ${styles.rightPanel}`} aria-label="클립 구간 편집">
        <PanelHeading title="구간 편집" meta={selected ? `장면 ${selectedIndex + 1}` : '장면 없음'} />
        <div className={styles.panelContent}>
          {selected && <>
            <div><h3 className={styles.sectionTitle}>{selected.label}</h3><div className={styles.segmentSummary}><strong>{timeText(selected.sourceOut - selected.sourceIn)}</strong><span>선택 장면 길이</span></div></div>
            <div className={styles.fieldRow}><Field label="시작 (원본 초)"><input type="number" step="0.5" min={selected.sourceMin} max={selected.sourceOut - .5} value={selected.sourceIn} onChange={event => { if (event.target.value !== '') trimIn(Number(event.target.value)) }} /></Field><Field label="끝 (원본 초)"><input type="number" step="0.5" min={selected.sourceIn + .5} max={selected.sourceMax} value={selected.sourceOut} onChange={event => { if (event.target.value !== '') trimOut(Number(event.target.value)) }} /></Field></div>
            <div><h3 className={styles.sectionTitle}>앞뒤 맥락 조절 <span>4초 단위</span></h3><div className={styles.stepButtons}><button type="button" className={styles.button} onClick={() => trimIn(selected.sourceIn - 4)} disabled={selected.sourceIn <= selected.sourceMin}>앞 장면 +4초</button><button type="button" className={styles.button} onClick={() => trimOut(selected.sourceOut + 4)} disabled={selected.sourceOut >= selected.sourceMax}>뒤 장면 +4초</button><button type="button" className={styles.button} onClick={() => trimIn(selected.sourceIn + 4)} disabled={selected.sourceOut - selected.sourceIn <= 4}>시작 4초 줄이기</button><button type="button" className={styles.button} onClick={() => trimOut(selected.sourceOut - 4)} disabled={selected.sourceOut - selected.sourceIn <= 4}>끝 4초 줄이기</button></div></div>
            <Field label="장면 자막"><textarea value={selected.line} onChange={event => patchSegment({ line: event.target.value })} /></Field>
            <button type="button" className={`${styles.button} ${styles.dangerButton}`} onClick={() => { update(current => ({ ...current, segments: current.segments.filter(segment => segment.id !== selected.id) })); setSelectedId('') }}>선택 장면 제거</button>
          </>}
          <Field label="클립 제목"><input value={state.title} onChange={event => update(current => ({ ...current, title: event.target.value }))} /></Field>
          <label className={styles.toggleField}>말자막 표시<input type="checkbox" checked={state.captions} onChange={event => update(current => ({ ...current, captions: event.target.checked }))} /></label>
          <Field label="장면 연결"><select value={state.transition} onChange={event => update(current => ({ ...current, transition: event.target.value as ClipDraft['transition'] }))}><option value="cut">컷 연결</option><option value="fade">짧은 디졸브 · 0.3초</option></select></Field>
          <p className={styles.help}>연결 방식은 내보내기 설정에 저장됩니다. 세로 리프레임 없이 원본 화면비를 유지합니다.</p>
        </div>
      </aside>
    </div>
    <footer className={styles.timeline} aria-label="클립 장면 타임라인">
      <div className={styles.timelineHead}><div><h2>클립 시퀀스</h2><small>{state.segments.length}개 장면 · {timeText(total)} · {state.transition === 'cut' ? '컷 연결' : '디졸브 연결'}</small></div><button type="button" className={styles.button} onClick={() => setLeftTab('recommendations')}>＋ 장면 추가</button></div>
      <TimelineRuler duration={total} />
      <SequenceStrip segments={sequence} selected={selected?.id ?? ''} onSelect={pick} onMove={move} />
    </footer>
    {exportOpen && <ExportDialog mode="clip" title={state.title} duration={total} settings={state} onClose={() => setExportOpen(false)} />}
  </div>
}
