import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ui/ConfirmDialog'
import { frameImage } from './data'
import { useTransport, type WorkspaceProps } from './workspace'
import { ReviewTimeline } from './ReviewTimeline'
import { trimBoundary } from './reviewTimelineMath'
import { ASPECTS, FONT_OPTIONS, INITIAL_REVIEW, POST_CANDIDATES, REVIEW_KEY, SOURCE_DURATION, TITLE_CANDIDATES, TITLE_COLORS, fmtReviewTime, parseReviewTime, validReview, type ReviewCue, type ReviewDraft, type ReviewLayout } from './shortformReview'
import styles from './ShortformReview.module.css'

// STEPD automation hold detail with a source sequence for mouse trimming.
const round = (n: number) => Math.round(n * 10) / 10
const fontFamily = (id: string) => FONT_OPTIONS.find(font => font.id === (id || 'gmarket'))?.css ?? 'GmarketSans'
function readDraft(): ReviewDraft {
  try { const value: unknown = JSON.parse(localStorage.getItem(REVIEW_KEY) ?? 'null'); if (validReview(value)) return value } catch { /* Use the sample if storage is unavailable. */ }
  return structuredClone(INITIAL_REVIEW)
}
function Range({ label, value, min, max, step = .5, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix: string; onChange: (value: number) => void }) {
  return <label className={styles.range}><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /><output>{value}{suffix}</output></label>
}
function FontSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}><option value="">글꼴 기본</option>{FONT_OPTIONS.map(font => <option key={font.id} value={font.id}>{font.label}</option>)}</select>
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className={styles.toggle}><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />{label}</label>
}
function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className={styles.colorField}><span>{label}</span><input type="color" value={value} onChange={event => onChange(event.target.value.toUpperCase())} /><small>{value}</small></label>
}
function FitTitle({ children, style }: { children: ReactNode; style: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    let mounted = true
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const fit = () => {
      const el = ref.current
      if (!mounted || !el?.parentElement || !context) return
      const computed = getComputedStyle(el)
      context.font = `${computed.fontWeight} ${Number(style.fontSize)}px ${computed.fontFamily}`
      const text = el.textContent ?? ''
      const width = context.measureText(text).width + Number(style.letterSpacing ?? 0) * text.length
      setScale(Math.min(1, el.parentElement.clientWidth / Math.max(1, width)))
    }
    fit(); void document.fonts.ready.then(fit)
    document.fonts.addEventListener('loadingdone', fit)
    const observer = new ResizeObserver(fit)
    if (ref.current?.parentElement) observer.observe(ref.current.parentElement)
    return () => { mounted = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone', fit) }
  }, [children, style.fontSize, style.fontFamily, style.letterSpacing])
  return <div className={styles.titleLine}><span ref={ref} style={{ ...style, fontSize: Number(style.fontSize) * scale }}>{children}</span></div>
}
function CueTime({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const [text, setText] = useState(fmtReviewTime(value))
  useEffect(() => setText(fmtReviewTime(value)), [value])
  return <div className={styles.cueTime}><span>{label}</span><button type="button" aria-label={`자막 ${label} 0.5초 앞당기기`} onClick={() => onChange(value - .5)}>−</button><input aria-label={`자막 ${label} 시각`} value={text} aria-invalid={parseReviewTime(text) === null} onChange={event => { const next = event.target.value; setText(next); const time = parseReviewTime(next); if (time !== null) onChange(time) }} onBlur={() => setText(fmtReviewTime(value))} /><button type="button" aria-label={`자막 ${label} 0.5초 늦추기`} onClick={() => onChange(value + .5)}>＋</button></div>
}

export function ShortformEditorPage({ onNavigate }: WorkspaceProps) {
  const [state, setState] = useState(readDraft)
  const [saved, setSaved] = useState(() => JSON.stringify(state))
  const [tab, setTab] = useState<'post' | 'cues'>('post')
  const [colorLine, setColorLine] = useState<0 | 1>(1)
  const [postChannel, setPostChannel] = useState('YouTube')
  const [selectedCue, setSelectedCue] = useState(state.cues[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewWidth, setPreviewWidth] = useState(250)
  useLayoutEffect(() => {
    const element = previewRef.current
    if (!element) return
    const measure = () => setPreviewWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure); observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const transport = useTransport(state.trimIn, state.trimOut, [0, SOURCE_DURATION])
  const dirty = JSON.stringify(state) !== saved
  const duration = round(state.trimOut - state.trimIn)
  const patch = (value: Partial<ReviewDraft>) => { setState(current => ({ ...current, ...value })); setMessage('') }
  const layout = (value: Partial<ReviewLayout>) => setState(current => ({ ...current, layout: { ...current.layout, ...value } }))
  const setColor = (value: string, index: 0 | 1 = state.line2.trim() ? colorLine : 0) => setState(current => ({ ...current, colors: index === 0 ? [value, current.colors[1]] : [current.colors[0], value] }))
  const setMeta = (value: Partial<{ title: string; body: string }>) => setState(current => ({ ...current, meta: { ...current.meta, [postChannel]: { ...current.meta[postChannel], ...value } } }))
  const invalid = state.cues.some(cue => cue.text.trim() && cue.end <= cue.start)
  const excluded = state.cues.filter(cue => cue.end <= state.trimIn || cue.start >= state.trimOut).length
  const save = (encode = false) => {
    if (invalid) { setMessage('끝 시각이 시작보다 늦어야 합니다. 빨간 자막 줄을 고쳐 주세요.'); return false }
    const next = { ...state, cues: state.cues.filter(cue => cue.text.trim()) }
    try {
      localStorage.setItem(REVIEW_KEY, JSON.stringify(next)); setState(next); setSaved(JSON.stringify(next))
      setMessage(encode ? '인코딩 서버가 연결되지 않았습니다. 수정 정보는 이 브라우저에 저장했습니다.' : '이 브라우저에 저장했습니다.')
      return true
    } catch { setMessage('저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'); return false }
  }
  const actions = useRef({ save }); actions.current = { save }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') { event.preventDefault(); actions.current.save(); return }
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [])
  const changeTrim = (edge: 'trimIn' | 'trimOut', value: number) => {
    if (!Number.isFinite(value)) return
    setState(current => ({ ...current, [edge]: trimBoundary(current.trimIn, current.trimOut, edge, value, SOURCE_DURATION) }))
    setMessage('')
  }
  const updateCue = (id: string, value: Partial<ReviewCue>) => setState(current => ({ ...current, cues: current.cues.map(cue => cue.id === id ? { ...cue, ...value } : cue) }))
  const cueTime = (cue: ReviewCue, edge: 'start' | 'end', value: number) => updateCue(cue.id, { [edge]: round(Math.max(0, Math.min(SOURCE_DURATION, state.trimIn + value))) })
  const addCue = (index: number) => {
    if (state.cues.length >= 600) return
    const before = state.cues[index - 1], after = state.cues[index]
    const start = round(Math.min(state.trimOut - .1, Math.max(state.trimIn, before ? before.end + .1 : state.trimIn)))
    const end = round(Math.min(state.trimOut, Math.max(start + .5, after ? after.start - .1 : start + 2)))
    const cue = { id: `cue-${crypto.randomUUID()}`, start, end, text: '새 자막', added: true }
    patch({ cues: [...state.cues.slice(0, index), cue, ...state.cues.slice(index)] }); setSelectedCue(cue.id); transport.seek(start)
  }
  const activeCue = state.cues.find(cue => transport.pos >= cue.start && transport.pos < cue.end)
  const cueVisible = activeCue && activeCue.end > state.trimIn && activeCue.start < state.trimOut
  const shownAt = transport.pos
  const image = shownAt < 2470 ? 'f5' : shownAt < 2484 ? 'f6' : shownAt < 2493 ? 'f8' : 'f7'
  const lay = state.layout, stageHeight = previewWidth * 16 / 9, outputScale = stageHeight / 1920
  const videoRect = state.aspect === '9:16-crop-full' ? { top: 0, height: 100 } : state.aspect === '9:16-crop-main' ? { top: 440 / 1920 * 100, height: 1480 / 1920 * 100 } : state.aspect === '9:16-crop-sub' ? { top: 440 / 1920 * 100, height: 980 / 1920 * 100 } : { top: 34.2, height: 31.7 }
  const curMeta = state.meta[postChannel]
  const back = () => {
    if (!dirty) { onNavigate('auto'); return }
    setConfirm({ title: '수정 내용을 저장할까요?', body: '저장하고 배포 대기 목록으로 돌아갑니다.', confirmLabel: '저장하고 목록으로', onConfirm: () => { if (save()) onNavigate('auto') } })
  }
  return <div className={styles.page} data-editor="short">
    <div className={styles.top}><button type="button" onClick={back}>‹ 목록</button><span className={styles.chip}>숏폼 · 9:16 세로</span><small>1 / 12</small></div>
    <div className={styles.columns}>
      <aside className={styles.previewColumn} aria-label="숏폼 미리보기">
        <div className={styles.preview} ref={previewRef}>
          <div className={styles.video} style={{ top: `${videoRect.top}%`, height: `${videoRect.height}%` }}><img src={frameImage(image)} alt="샘플 영상 프레임" style={{ objectFit: state.aspect === '9:16-letterbox' || !state.aspect ? 'contain' : 'cover' }} /></div>
          <div className={styles.previewTitles} style={{ top: `${lay.titleY}%`, lineHeight: lay.titleLineHeight }}>
            {[state.line1, state.line2].map((line, index) => <FitTitle key={index} style={{ color: state.colors[index], fontSize: state.titleSize * 3 * outputScale, fontFamily: fontFamily(lay.titleFont), letterSpacing: lay.titleSpacing * outputScale, textShadow: lay.titleShadow ? '0 2px 3px #000' : undefined }}>{line}</FitTitle>)}
          </div>
          {state.subtitles && cueVisible && <div className={styles.caption} style={{ bottom: `${lay.subtitleY}%`, fontSize: stageHeight * lay.subtitleSize / 100, color: lay.subtitleColor, fontFamily: fontFamily(lay.captionFont), letterSpacing: lay.subtitleSpacing * outputScale, textShadow: lay.subtitleShadow ? `${lay.subtitleShadowX}px ${lay.subtitleShadowY}px 3px #000` : undefined, WebkitTextStroke: lay.subtitleStroke ? `0.5px ${lay.subtitleStrokeColor}` : undefined }}><span style={{ background: lay.subtitleBg ? `${lay.subtitleBgColor}${Math.round(lay.subtitleBgOpacity / 100 * 255).toString(16).padStart(2, '0')}` : undefined }}>{activeCue.text}</span></div>}
          {lay.logo && <div className={styles.previewLogo} style={{ top: `${lay.channelIconY}%`, height: lay.channelIconSize * 3 * outputScale, width: lay.channelIconSize * 3 * outputScale * 1.4 }}>로고</div>}
        </div>
        <p className={styles.previewNote}>{tab === 'cues' ? cueVisible ? `${fmtReviewTime(shownAt - state.trimIn)} — 이대로 인코딩됩니다` : '이 줄은 화면에서 빠집니다' : '미리보기'}</p>
        {dirty && <p className={styles.warning}>수정한 내용은 아직 이 영상에 없습니다. 저장 후 인코딩을 누르면 이 내용으로 MP4를 다시 만듭니다.</p>}
        {tab === 'cues' && !state.subtitles && <p className={styles.warning}>이 클립은 자막이 꺼져 있습니다 — 고쳐도 영상에는 안 나옵니다.</p>}
      </aside>
      <main className={styles.editColumn}>
        <div className={styles.tabs} role="tablist" aria-label="배포 대기 영상 편집"><button type="button" role="tab" aria-selected={tab === 'post'} onClick={() => setTab('post')}>게시물 · 타이틀</button><button type="button" role="tab" aria-selected={tab === 'cues'} onClick={() => setTab('cues')}>자막 수정</button></div>
        {tab === 'post' ? <div role="tabpanel" aria-label="게시물 · 타이틀" className={styles.post}>
          <section className={styles.overlayControls}>
          <h2>영상 안 타이틀 <small>2줄 · 후보에서 고르거나 직접 고칩니다</small></h2>
          <div className={styles.candidates}>{TITLE_CANDIDATES.map(candidate => <button type="button" key={candidate.kind} aria-pressed={state.line1 === candidate.line1 && state.line2 === candidate.line2} onClick={() => patch({ line1: candidate.line1, line2: candidate.line2 })}><span className={styles.radio} /><small>{candidate.kind}</small><span>{candidate.line1}<br /><em>{candidate.line2}</em></span></button>)}</div>
          <label className={styles.lineInput}><span>1줄</span><input aria-label="타이틀 1줄" value={state.line1} onChange={event => patch({ line1: event.target.value })} /></label>
          <label className={styles.lineInput}><span>2줄</span><input aria-label="타이틀 2줄" value={state.line2} placeholder="비워도 됩니다" style={{ borderLeft: `4px solid ${state.colors[1]}` }} onChange={event => patch({ line2: event.target.value })} /></label>
          <div className={styles.swatches}><span>색</span>{!!state.line2.trim() && ([0, 1] as const).map(index => <button type="button" key={index} aria-pressed={colorLine === index} onClick={() => setColorLine(index)}>{index + 1}줄</button>)}{TITLE_COLORS.map(color => <button type="button" className={styles.swatch} key={color.hex} title={color.name} aria-label={`${color.name} 타이틀 색`} aria-pressed={state.colors[state.line2.trim() ? colorLine : 0] === color.hex} style={{ background: color.hex }} onClick={() => setColor(color.hex)} />)}<input type="color" aria-label="줄 색 직접 선택" value={state.colors[state.line2.trim() ? colorLine : 0]} onChange={event => setColor(event.target.value.toUpperCase())} /><small>{(state.line2.trim() ? colorLine : 0) + 1}줄 · {TITLE_COLORS.find(color => color.hex === state.colors[state.line2.trim() ? colorLine : 0])?.name ?? state.colors[state.line2.trim() ? colorLine : 0]}</small></div>
          <Range label="크기" min={14} max={72} step={1} value={state.titleSize} suffix="px" onChange={titleSize => patch({ titleSize })} />
          <Range label="위치" min={3} max={30} value={lay.titleY} suffix="% · 위에서" onChange={titleY => layout({ titleY })} />
          <div className={styles.quickRow}><Range label="자막" min={4} max={40} value={lay.subtitleY} suffix="% · 아래에서" onChange={subtitleY => layout({ subtitleY })} /><Range label="크기" min={2.5} max={7} step={.1} value={lay.subtitleSize} suffix="%" onChange={subtitleSize => layout({ subtitleSize })} /><FontSelect label="자막 글꼴" value={lay.captionFont} onChange={captionFont => layout({ captionFont })} /></div>
          <div className={styles.quickRow}><Range label="로고" min={60} max={92} value={lay.channelIconY} suffix="% · 위에서" onChange={channelIconY => layout({ channelIconY })} /><Range label="크기" min={20} max={90} value={lay.channelIconSize} suffix="px" onChange={channelIconSize => layout({ channelIconSize })} /></div>
          <p className={styles.help}>2줄은 비워도 됩니다.</p>
          <label className={styles.field}><span>영상 배치</span><select value={state.aspect} onChange={event => patch({ aspect: event.target.value })}><option value="">현재 유지 (템플릿 기본)</option>{ASPECTS.map(aspect => <option key={aspect.id} value={aspect.id}>{aspect.label}</option>)}</select></label>
          <details className={styles.details}><summary>위치·스타일 — 이 영상에만 적용</summary><div className={styles.styleControls}>
            <h3>위치</h3><div className={styles.quickRow}><Toggle label="로고" checked={lay.logo} onChange={logo => layout({ logo })} /><Toggle label="자막" checked={state.subtitles} onChange={subtitles => patch({ subtitles })} /></div>
            <Range label="타이틀 위치" min={3} max={30} value={lay.titleY} suffix="%" onChange={titleY => layout({ titleY })} /><Range label="로고 위치" min={60} max={92} value={lay.channelIconY} suffix="%" onChange={channelIconY => layout({ channelIconY })} /><Range label="로고 크기" min={20} max={90} value={lay.channelIconSize} suffix="px" onChange={channelIconSize => layout({ channelIconSize })} /><Range label="자막 위치" min={4} max={40} value={lay.subtitleY} suffix="%" onChange={subtitleY => layout({ subtitleY })} />
            <h3>타이틀 스타일</h3><FontSelect label="타이틀 글꼴" value={lay.titleFont} onChange={titleFont => layout({ titleFont })} /><Color label="강조색" value={state.colors[state.line2.trim() ? 1 : 0]} onChange={color => setColor(color, state.line2.trim() ? 1 : 0)} /><Range label="타이틀 자간" min={-10} max={30} value={lay.titleSpacing} suffix="px" onChange={titleSpacing => layout({ titleSpacing })} /><Range label="타이틀 줄 간격" min={.8} max={2} step={.05} value={lay.titleLineHeight} suffix="배" onChange={titleLineHeight => layout({ titleLineHeight })} /><Toggle label="타이틀 그림자" checked={lay.titleShadow} onChange={titleShadow => layout({ titleShadow })} />
            <h3>자막 스타일</h3><FontSelect label="자막 스타일 글꼴" value={lay.captionFont} onChange={captionFont => layout({ captionFont })} /><Color label="자막 색" value={lay.subtitleColor} onChange={subtitleColor => layout({ subtitleColor })} /><Range label="자막 크기" min={2.5} max={7} step={.1} value={lay.subtitleSize} suffix="%" onChange={subtitleSize => layout({ subtitleSize })} /><Range label="자막 자간" min={-10} max={30} value={lay.subtitleSpacing} suffix="px" onChange={subtitleSpacing => layout({ subtitleSpacing })} />
            <Toggle label="자막 그림자" checked={lay.subtitleShadow} onChange={subtitleShadow => layout({ subtitleShadow })} />{lay.subtitleShadow && <><Range label="그림자 가로" min={-10} max={10} step={1} value={lay.subtitleShadowX} suffix="px" onChange={subtitleShadowX => layout({ subtitleShadowX })} /><Range label="그림자 세로" min={-10} max={10} step={1} value={lay.subtitleShadowY} suffix="px" onChange={subtitleShadowY => layout({ subtitleShadowY })} /></>}
            <Toggle label="자막 외곽선" checked={lay.subtitleStroke} onChange={subtitleStroke => layout({ subtitleStroke })} />{lay.subtitleStroke && <Color label="외곽선 색" value={lay.subtitleStrokeColor} onChange={subtitleStrokeColor => layout({ subtitleStrokeColor })} />}
            <Toggle label="자막 배경" checked={lay.subtitleBg} onChange={subtitleBg => layout({ subtitleBg })} />{lay.subtitleBg && <><Color label="배경 색" value={lay.subtitleBgColor} onChange={subtitleBgColor => layout({ subtitleBgColor })} /><Range label="배경 불투명도" min={0} max={100} step={5} value={lay.subtitleBgOpacity} suffix="%" onChange={subtitleBgOpacity => layout({ subtitleBgOpacity })} /></>}
          </div></details>
          </section>
          <section className={styles.metadata}><div className={styles.metadataHeading}><h2>게시물 정보</h2><select aria-label="게시물 채널" value={postChannel} onChange={event => setPostChannel(event.target.value)}>{Object.keys(state.meta).map(channel => <option key={channel}>{channel}</option>)}</select></div>
            {postChannel === 'YouTube' && <><label className={styles.field}><span>게시물 제목</span><input value={curMeta.title} onChange={event => setMeta({ title: event.target.value })} /></label><div className={styles.postCandidates}>{POST_CANDIDATES.map(title => <button type="button" key={title} onClick={() => { const tags = curMeta.title.match(/(?:\s+#[^\s#]+)+\s*$/)?.[0] ?? ''; setMeta({ title: `${title}${tags}` }) }}>{title}</button>)}</div></>}
            <label className={styles.field}><span>게시물 설명 · 해시태그</span><textarea rows={4} value={curMeta.body} onChange={event => setMeta({ body: event.target.value })} /></label><p className={styles.help}>{postChannel === 'YouTube' ? '마지막 줄의 #태그들은 해시태그로 저장됩니다' : '보이는 글이 그대로 게시됩니다 — 해시태그도 이 글 안에 씁니다'}</p><div className={styles.publish}><strong>발행 예정 · 한국 시간</strong><span>10월 1일 (목) 19:00</span></div>
          </section>
        </div> : <section role="tabpanel" aria-label="자막 수정" className={styles.cues}>
          <div className={styles.cuesHeading}><div><h2>자막 {state.cues.length}줄</h2><small>발행본 0:00.0–{fmtReviewTime(duration)}</small></div><button type="button" onClick={() => setConfirm({ title: '자막을 전체 되돌릴까요?', body: '원본 자막으로 되돌립니다. 저장 후 인코딩해야 영상에 반영됩니다.', confirmLabel: '전체 되돌리기', onConfirm: () => { patch({ cues: structuredClone(INITIAL_REVIEW.cues) }); setSelectedCue(INITIAL_REVIEW.cues[0].id) } })}>전체 되돌리기</button></div>
          {excluded > 0 && <p className={styles.warning}>{excluded}줄은 편집 구간 밖이라 화면에서 빠집니다.</p>}
          <div className={styles.cueList}><button type="button" className={styles.addCue} disabled={state.cues.length >= 600} onClick={() => addCue(0)}>＋ 자막 추가</button>{state.cues.map((cue, index) => {
            const outside = cue.end <= state.trimIn || cue.start >= state.trimOut, cut = !outside && (cue.start < state.trimIn || cue.end > state.trimOut), overlap = index > 0 && state.cues[index - 1].end > cue.start
            return <div key={cue.id}><article className={styles.cue} data-selected={selectedCue === cue.id} data-invalid={cue.end <= cue.start} onClick={() => { setSelectedCue(cue.id); transport.seek(cue.start) }}><div className={styles.cueTimes}><CueTime label="시작" value={cue.start - state.trimIn} onChange={value => cueTime(cue, 'start', value)} /><CueTime label="끝" value={cue.end - state.trimIn} onChange={value => cueTime(cue, 'end', value)} /></div><input aria-label={`자막 ${index + 1} 내용`} maxLength={300} value={cue.text} onChange={event => updateCue(cue.id, { text: event.target.value })} /><div className={styles.cueFlags}><span>{cue.end <= cue.start ? '끝 시각이 시작보다 늦어야 합니다' : outside ? '화면에서 빠짐' : cut ? '앞뒤가 잘립니다' : overlap ? '앞 줄과 시간이 겹칩니다' : cue.added ? '추가한 줄' : !cue.text.trim() ? '저장하면 삭제됩니다' : ''}</span><small>{cue.text.length}/300</small></div></article><button type="button" className={styles.addCue} disabled={state.cues.length >= 600} onClick={() => addCue(index + 1)}>＋ 자막 추가</button></div>
          })}</div><p className={styles.help}>최대 600줄 · 한 줄 300자 · 빈 줄은 저장할 때 삭제됩니다.</p><button type="button" disabled={invalid || !dirty} onClick={() => save()}>자막 저장</button>
        </section>}
        <footer className={styles.footer}><div className={styles.footerActions}><button type="button" disabled={!dirty || invalid} onClick={() => save()}>저장</button><button type="button" className={styles.encode} disabled={invalid} onClick={() => save(true)}>인코딩</button></div>{message && <p className={styles.message} role="status">{message}</p>}<small>처리 기록에 하경진(으)로 남습니다.</small></footer>
      </main>
    </div>
    <ReviewTimeline trimIn={state.trimIn} trimOut={state.trimOut} sourceDuration={SOURCE_DURATION} position={transport.pos} playing={transport.playing} onTrim={changeTrim} onSeek={transport.seek} onToggle={transport.toggle} />
    <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
  </div>
}
