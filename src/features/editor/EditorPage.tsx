import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import type { ScreenKey } from '@/app/screens'
import {
  CHAPTERS,
  CHAPTER_COLORS,
  CLIP_PIECES,
  CLIP_REC_GROUPS,
  FRAME_PRESETS,
  HL_RECS,
  MODE_LABEL,
  MOODS,
  OUTPUT_CHANNELS,
  SHORT_PIECES,
  SHORT_RECS,
  SUBTITLE_STYLES,
  frameImage,
  timeText,
  type Chapter,
  type EditorMode,
  type Piece,
  type Recommendation,
} from './data'
import styles from './EditorPage.module.css'

const TOAST_MS = 2400
/** 재생 틱 간격(ms)과 한 틱에 흐르는 초 */
const TICK_MS = 250
const TICK_SEC = 0.25
/** 클립 모드에서 Beat 하나가 늘리는 길이(초) */
const BEAT_SEC = 4

type PreviewTab = 'result' | 'loop' | 'context'
type SideTab = 'recs' | 'style' | 'out'

export interface EditorPageProps {
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  onNavigate: (screen: ScreenKey) => void
}

interface LaidOut extends Piece {
  start: number
  end: number
  /** 하이라이트: 챕터 인덱스 */
  ci?: number
}

export function EditorPage({ mode, onModeChange, onNavigate }: EditorPageProps) {
  const [shortPieces, setShortPieces] = useState<Piece[]>(SHORT_PIECES)
  const [clipPieces, setClipPieces] = useState<Piece[]>(CLIP_PIECES)
  const [chapters, setChapters] = useState<Chapter[]>(CHAPTERS)

  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [sel, setSel] = useState(0)
  const [hlSel, setHlSel] = useState('h20')
  const [previewTab, setPreviewTab] = useState<PreviewTab>('result')
  const [show169, setShow169] = useState(false)
  const [sideTab, setSideTab] = useState<SideTab>('recs')

  const [framePreset, setFramePreset] = useState('a')
  const [subStyle, setSubStyle] = useState('box')
  const [channels, setChannels] = useState<Record<string, boolean>>({ yt: true, fb: false, ig: true })
  const [thumbIndex, setThumbIndex] = useState(0)
  const [autoTitle, setAutoTitle] = useState(true)
  const [opening, setOpening] = useState('title')
  const [ending, setEnding] = useState('next')
  const [mood, setMood] = useState('설렘')
  const [outTitle, setOutTitle] = useState('')
  const [outDesc, setOutDesc] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const say = (text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(text)
    toastTimer.current = setTimeout(() => setToast(''), TOAST_MS)
  }

  const isShort = mode === 'short'
  const isClip = mode === 'clip'
  const isHl = mode === 'hl'

  /* ---------------- 타임라인 ---------------- */

  const sequence: LaidOut[] = useMemo(() => {
    let t = 0
    const pieces: Array<Piece & { ci?: number }> = isHl
      ? chapters.flatMap((ch, ci) =>
          ch.cards
            .filter((c) => !c.excluded)
            .map((c) => ({
              id: c.id,
              label: c.ep,
              dur: c.dur,
              img: c.img,
              line: c.line,
              tag: c.tag,
              ci,
            })),
        )
      : isShort
        ? shortPieces
        : clipPieces.map((c) => ({
            ...c,
            dur: c.dur + (c.front ?? 0) * BEAT_SEC + (c.back ?? 0) * BEAT_SEC,
          }))

    return pieces.map((x) => {
      const laid = { ...x, start: t, end: t + x.dur }
      t += x.dur
      return laid
    })
  }, [chapters, clipPieces, isHl, isShort, shortPieces])

  const total = sequence.length ? sequence[sequence.length - 1].end : 0

  const selIndex = useMemo(() => {
    if (isHl) {
      const i = sequence.findIndex((x) => x.id === hlSel)
      return i < 0 ? 0 : i
    }
    return Math.min(sel, Math.max(0, sequence.length - 1))
  }, [hlSel, isHl, sel, sequence])

  const selected = sequence[selIndex]

  /** 재생 구간 */
  const [winStart, winEnd] = useMemo<[number, number]>(() => {
    if (!selected || previewTab === 'result') return [0, total]
    if (previewTab === 'loop') {
      if (isHl) {
        const inChapter = sequence.filter((y) => y.ci === selected.ci)
        return [inChapter[0].start, inChapter[inChapter.length - 1].end]
      }
      return [selected.start, selected.end]
    }
    return [selected.start - 10, selected.end + 10]
  }, [isHl, previewTab, selected, sequence, total])

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setPos((p) => {
        const next = p + TICK_SEC
        if (next >= winEnd) {
          if (previewTab === 'result') {
            setPlaying(false)
            return winEnd
          }
          return winStart
        }
        return next
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [playing, previewTab, winEnd, winStart])

  const inside =
    sequence.find((x) => pos >= x.start && pos < x.end) ??
    (pos >= total ? sequence[sequence.length - 1] : sequence[0])
  const isContext = previewTab === 'context'
  const outside = isContext && selected && (pos < selected.start || pos >= selected.end)
  const current = isContext ? selected : inside

  /* ---------------- 액션 ---------------- */

  const pick = (index: number) => {
    const x = sequence[index]
    if (!x) return
    if (isHl) setHlSel(x.id)
    else setSel(index)
    setPos(previewTab === 'result' ? x.start : Math.max(0, x.start))
  }

  const pieces = isShort ? shortPieces : clipPieces
  const setPieces = isShort ? setShortPieces : setClipPieces

  const insertAt = (index: number, rec: Recommendation) => {
    const item: Piece = {
      id: `n${Date.now()}`,
      label: rec.title,
      dur: rec.dur,
      img: rec.img,
      line: rec.line,
      tag: rec.tag,
      src: '32회',
      front: 0,
      back: 0,
    }
    setPieces((list) => {
      const next = [...list]
      next.splice(index, 0, item)
      return next
    })
    setSel(index)
    say(`“${rec.title}”을(를) ${index + 1}번째에 넣었습니다`)
  }

  const movePiece = (from: number, to: number) => {
    if (from === to) return
    setPieces((list) => {
      const next = [...list]
      const [x] = next.splice(from, 1)
      next.splice(to, 0, x)
      return next
    })
    setSel(to)
  }

  const adjustBeat = (which: 'front' | 'back', delta: number) => {
    setClipPieces((list) =>
      list.map((c, i) =>
        i === selIndex
          ? { ...c, [which]: Math.max(0, Math.min(3, (c[which] ?? 0) + delta)) }
          : c,
      ),
    )
  }

  const toggleExcluded = () => {
    setChapters((list) =>
      list.map((ch) => ({
        ...ch,
        cards: ch.cards.map((c) => (c.id === hlSel ? { ...c, excluded: !c.excluded } : c)),
      })),
    )
  }

  const moveCardToChapter = (cardId: string, toChapter: number) => {
    setChapters((list) => {
      const next = list.map((ch) => ({ ...ch, cards: [...ch.cards] }))
      let card = null
      for (const ch of next) {
        const k = ch.cards.findIndex((c) => c.id === cardId)
        if (k >= 0) {
          card = ch.cards.splice(k, 1)[0]
          break
        }
      }
      if (card) next[toChapter].cards.push(card)
      return next
    })
  }

  /* ---------------- 파생 표시값 ---------------- */

  const chapterOf = (x: LaidOut | undefined) =>
    x?.ci != null ? chapters[x.ci] : undefined

  const selectedChapter = chapterOf(current)

  const recs: Array<{ title?: string; items: Recommendation[] }> = isShort
    ? [{ items: SHORT_RECS }]
    : isClip
      ? CLIP_REC_GROUPS
      : [{ items: HL_RECS }]

  const pctOf = (v: number) => ((v - winStart) / (winEnd - winStart || 1)) * 100

  const barSegments = isContext && selected
    ? [
        [selected.start - 10, selected.start, '#56627A'] as const,
        [selected.start, selected.end, 'var(--bg-active)'] as const,
        [selected.end, selected.end + 10, '#56627A'] as const,
      ]
    : sequence
        .filter((x) => x.end > winStart && x.start < winEnd)
        .map((x, i) => {
          const color = isHl
            ? CHAPTER_COLORS[(chapters[x.ci ?? 0]?.col ?? 0) % 6]
            : x.id === current?.id
              ? 'var(--bg-active)'
              : i % 2
                ? '#4A5876'
                : '#56627A'
          return [Math.max(x.start, winStart), Math.min(x.end, winEnd), color] as const
        })

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    setPos(winStart + ratio * (winEnd - winStart))
  }

  const checks = [
    { label: `길이 ${timeText(total)}`, tone: total <= 60 || !isShort ? 'ok' : 'warn' },
    { label: subStyle === 'none' ? '자막 없음' : '자막 적용', tone: 'ok' },
    { label: `${MODE_LABEL[mode]} 규격 확인`, tone: 'ok' },
  ]

  return (
    <div className={styles.screen}>
      {/* ---------------- 상단 ---------------- */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          title="미디어로 돌아가기"
          onClick={() => onNavigate('media')}
        >
          ←
        </button>
        <span className={styles.brand}>STEP D</span>
        <span className={styles.divider} />
        <div className={styles.crumbs}>
          <span>나는 SOLO</span>
          <span className={styles.crumbSep}>›</span>
          <span>32회</span>
          <span className={styles.crumbSep}>›</span>
          <span className={styles.crumbCurrent}>{MODE_LABEL[mode]} 조립</span>
        </div>
        <span className={styles.headMeta}>총 {timeText(total)}</span>
        <span className={styles.headMeta}>
          조각 {isHl ? sequence.length : pieces.length}개
        </span>

        <div className={styles.modeSwitch}>
          <span className={styles.modeLabel}>편집기</span>
          {(['short', 'clip', 'hl'] as EditorMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? `${styles.modeBtn} ${styles.modeBtnOn}` : styles.modeBtn}
              onClick={() => {
                onModeChange(m)
                setSel(0)
                setPos(0)
                setPlaying(false)
              }}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => say('AI가 다른 구성안을 만들었습니다')}
          >
            다른 구성안
          </button>
          <button type="button" className={styles.ghostBtn} onClick={() => say('저장했습니다')}>
            저장
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => say('승인했습니다 — 렌더 대기열에 들어갑니다')}
          >
            승인하고 렌더
          </button>
        </div>
      </div>

      {/* ---------------- 본문 ---------------- */}
      <div className={styles.body}>
        <div className={styles.main}>
          <div className={isHl ? styles.stage : `${styles.stage} ${styles.stageCentered}`}>
            <div
              className={[
                styles.playerCol,
                isShort ? styles.playerColShort : styles.playerColWide,
              ].join(' ')}
            >
              <div className={styles.toggleRow}>
                {isShort && (
                  <button
                    type="button"
                    className={styles.toggleLabel}
                    onClick={() => setShow169((v) => !v)}
                  >
                    <span
                      className={show169 ? `${styles.switch} ${styles.switchOn}` : styles.switch}
                    >
                      <span className={styles.switchKnob} />
                    </span>
                    원본 16:9 보기
                  </button>
                )}
              </div>

              <div
                className={[
                  styles.frame,
                  isShort && !show169 ? styles.frameShort : styles.frameWide,
                ].join(' ')}
              >
                <img
                  src={frameImage(current?.img ?? 'f1', isShort && !show169)}
                  alt=""
                  className={styles.frameImg}
                />

                {show169 && (
                  <>
                    <div className={styles.cropOverlay}>
                      <div className={styles.cropDim} />
                      <div className={styles.cropBox} />
                      <div className={styles.cropDim} />
                    </div>
                    <span className={styles.cropTag}>세로 크롭 영역 · 인물 추적</span>
                  </>
                )}

                {isShort && !show169 && (
                  <>
                    <div className={styles.safeTop} />
                    <div className={styles.safeBottom} />
                    <span className={styles.safeLabel}>자막 안전 영역</span>
                    <div className={styles.titleCard}>
                      <span className={styles.titleLine1}>나는 SOLO 32기</span>
                      <span className={styles.titleLine2}>영호, 결국 폭발하다</span>
                    </div>
                    <div className={styles.badges}>
                      <span className={styles.badge}>
                        <span className={styles.badgeKey}>프레임</span>
                        {FRAME_PRESETS.find((f) => f.key === framePreset)?.label}
                      </span>
                      <span className={styles.badge}>
                        <span className={styles.badgeKey}>길이</span>
                        {timeText(total)}
                      </span>
                    </div>
                  </>
                )}

                {isHl && selectedChapter && (
                  <div className={styles.chapterTag}>
                    <span
                      className={styles.chip}
                      style={{
                        background: `${CHAPTER_COLORS[selectedChapter.col % 6]}22`,
                        color: CHAPTER_COLORS[selectedChapter.col % 6],
                      }}
                    >
                      {(current?.ci ?? 0) + 1}
                    </span>
                    <span className={styles.chapterTagTitle}>{selectedChapter.title}</span>
                  </div>
                )}

                {outside && (
                  <div className={styles.outsideMask}>
                    <span className={styles.outsideText}>
                      원본 · 결과물에 포함되지 않는 구간
                    </span>
                  </div>
                )}

                {subStyle !== 'none' && current && (
                  <div className={styles.subWrap}>
                    <span className={subStyle === 'box' ? styles.subBox : styles.subOutline}>
                      {current.line}
                    </span>
                  </div>
                )}

                {!playing && (
                  <button
                    type="button"
                    aria-label="재생"
                    className={styles.bigPlay}
                    onClick={() => setPlaying(true)}
                  >
                    ▶
                  </button>
                )}
              </div>

              <div className={styles.controls}>
                <button
                  type="button"
                  aria-label="재생/정지"
                  className={styles.playBtn}
                  onClick={() => setPlaying((p) => !p)}
                >
                  {playing ? '❚❚' : '▶'}
                </button>
                <span className={styles.posText}>
                  {timeText(pos)} / {timeText(total)}
                </span>
                <div className={styles.seekBar} onClick={seek}>
                  <div className={styles.seekTrack}>
                    {barSegments.map(([a, b, color], i) => (
                      <div
                        key={i}
                        style={{
                          width: `${((b - a) / (winEnd - winStart || 1)) * 100}%`,
                          background: color,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className={styles.seekHead}
                    style={{ left: `${Math.max(0, Math.min(100, pctOf(pos)))}%` }}
                  />
                </div>
                <span className={styles.winText}>
                  {previewTab === 'result'
                    ? '전체 결과물'
                    : previewTab === 'loop'
                      ? '선택 구간 반복'
                      : '앞뒤 10초 포함'}
                </span>
              </div>

              <div className={styles.legendRow}>
                {(
                  [
                    ['result', '전체 결과물'],
                    ['loop', '선택 구간 반복'],
                    ['context', '앞뒤 10초'],
                  ] as Array<[PreviewTab, string]>
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={
                      previewTab === k ? `${styles.moodBtn} ${styles.moodBtnOn}` : styles.moodBtn
                    }
                    onClick={() => {
                      setPreviewTab(k)
                      setPos(k === 'result' ? 0 : Math.max(0, (selected?.start ?? 0) - (k === 'context' ? 10 : 0)))
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {isContext && (
                <div className={styles.legendRow}>
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendSwatch}
                      style={{ background: 'var(--bg-active)' }}
                    />
                    결과물에 쓰는 구간
                  </span>
                  <span className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ background: '#56627A' }} />
                    제외된 원본 앞뒤 10초
                  </span>
                </div>
              )}

              {isClip && current && (
                <div className={styles.clipLineRow}>
                  <span className={styles.clipLine}>“{current.line}”</span>
                  <span className={styles.aiReason}>
                    <span className={styles.aiReasonKey}>AI 추천 이유</span>
                    갈등의 시작부터 반전까지 흐름이 완결됨
                  </span>
                </div>
              )}
            </div>

            {isHl && selectedChapter && (
              <div className={styles.hlSide}>
                <div className={styles.hlCard}>
                  <span className={styles.hlCardLabel}>현재 챕터</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span
                      className={styles.chip}
                      style={{
                        background: `${CHAPTER_COLORS[selectedChapter.col % 6]}22`,
                        color: CHAPTER_COLORS[selectedChapter.col % 6],
                      }}
                    >
                      {(current?.ci ?? 0) + 1}
                    </span>
                    <span className={styles.hlCardTitle}>{selectedChapter.title}</span>
                  </div>
                  <div className={styles.hlInfo}>
                    장면 {selectedChapter.cards.filter((c) => !c.excluded).length}개 ·{' '}
                    {timeText(
                      selectedChapter.cards
                        .filter((c) => !c.excluded)
                        .reduce((a, c) => a + c.dur, 0),
                    )}
                  </div>
                  <div className={styles.hlSceneList}>
                    {selectedChapter.cards.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={
                          c.id === hlSel ? `${styles.hlScene} ${styles.hlSceneOn}` : styles.hlScene
                        }
                        onClick={() => {
                          const i = sequence.findIndex((x) => x.id === c.id)
                          if (i >= 0) pick(i)
                          else setHlSel(c.id)
                        }}
                      >
                        <span style={{ flex: 'none', fontSize: 11.5, color: 'var(--text-muted)' }}>
                          {c.ep.split(' ')[0]}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {c.line}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.hlCard}>
                  <span className={styles.hlCardLabel}>스토리 흐름</span>
                  <div className={styles.flowBar}>
                    {chapters.map((ch) => (
                      <div
                        key={ch.id}
                        title={ch.title}
                        style={{
                          flex: Math.max(1, ch.cards.filter((c) => !c.excluded).length),
                          background: CHAPTER_COLORS[ch.col % 6],
                        }}
                      />
                    ))}
                  </div>
                  <div className={styles.flowLegend}>
                    {chapters.map((ch) => (
                      <span key={ch.id} className={styles.flowLegendItem}>
                        <span
                          className={styles.flowDot}
                          style={{ background: CHAPTER_COLORS[ch.col % 6] }}
                        />
                        {ch.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---------------- 보드 ---------------- */}
          <div className={styles.board}>
            <div className={styles.boardHead}>
              <span className={styles.boardTitle}>
                {isHl ? '챕터 구성' : `${MODE_LABEL[mode]} 조각 순서`}
              </span>
              <span className={styles.boardSub}>
                {isHl
                  ? '카드를 끌어 챕터 안팎으로 옮길 수 있습니다'
                  : '카드를 끌어 순서를 바꾸고, + 를 눌러 AI 추천 조각을 넣습니다'}
              </span>
              <div className={styles.checks}>
                {checks.map((k) => (
                  <span
                    key={k.label}
                    className={styles.check}
                    style={
                      k.tone === 'ok'
                        ? {
                            background: 'var(--status-success-bg)',
                            color: 'var(--status-success-text)',
                          }
                        : {
                            background: 'rgba(245,158,11,.12)',
                            color: 'hsl(var(--status-warn))',
                          }
                    }
                  >
                    <span className={styles.checkDot} style={{ background: 'currentColor' }} />
                    {k.label}
                  </span>
                ))}
              </div>
            </div>

            {!isHl && (
              <>
                <div className={styles.rowScroll}>
                  {pieces.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                      {i === 0 ? (
                        <div className={styles.addSlot}>
                          <button
                            type="button"
                            className={styles.addBtn}
                            title="AI 추천 조각 추가"
                            onClick={() => insertAt(0, (isShort ? SHORT_RECS : CLIP_REC_GROUPS[0].items)[0])}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div className={styles.joinLine}>
                          <div className={styles.joinInner} />
                        </div>
                      )}

                      <div
                        draggable
                        onDragStart={() => setDragId(p.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (!dragId) return
                          const from = pieces.findIndex((x) => x.id === dragId)
                          if (from >= 0) movePiece(from, i)
                          setDragId(null)
                        }}
                        onClick={() => pick(i)}
                        className={
                          i === selIndex ? `${styles.pieceCard} ${styles.pieceCardOn}` : styles.pieceCard
                        }
                      >
                        <div
                          className={[
                            styles.pieceThumb,
                            isShort ? styles.pieceThumbShort : styles.pieceThumbWide,
                          ].join(' ')}
                        >
                          <img
                            src={frameImage(p.img, isShort)}
                            alt=""
                            className={styles.frameImg}
                          />
                          <span className={styles.pieceDur}>
                            {timeText(
                              p.dur + (p.front ?? 0) * BEAT_SEC + (p.back ?? 0) * BEAT_SEC,
                            )}
                          </span>
                          {current?.id === p.id && <span className={styles.playingTag}>재생 중</span>}
                        </div>

                        <div className={styles.pieceBody}>
                          <div className={styles.pieceHead}>
                            <span className={styles.pieceNo}>{i + 1}</span>
                            <span className={styles.pieceLabel}>{p.label}</span>
                            <span className={styles.dragHandle} title="드래그해서 순서 변경">
                              ⋮⋮
                            </span>
                          </div>
                          {p.src && <span className={styles.pieceRange}>{p.src}</span>}
                          <span className={styles.pieceLine}>“{p.line}”</span>
                          {p.tag && <span className={styles.pieceTag}>{p.tag}</span>}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className={styles.addSlot}>
                    <button
                      type="button"
                      className={styles.addBtn}
                      title="맨 뒤에 추천 조각 추가"
                      onClick={() =>
                        insertAt(pieces.length, (isShort ? SHORT_RECS : CLIP_REC_GROUPS[1].items)[0])
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className={styles.selBar}>
                  <span className={styles.selMuted}>선택</span>
                  <span className={styles.selLabel}>
                    {pieces[selIndex]?.label ?? '—'}
                  </span>

                  {isClip && (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}
                    >
                      <span className={styles.selMuted}>앞 Beat</span>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => adjustBeat('front', -1)}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => adjustBeat('front', 1)}
                      >
                        +
                      </button>
                      <span className={styles.selMuted} style={{ marginLeft: 6 }}>
                        뒤 Beat
                      </span>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => adjustBeat('back', -1)}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => adjustBeat('back', 1)}
                      >
                        +
                      </button>
                    </div>
                  )}

                  <div className={styles.selActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => selIndex > 0 && movePiece(selIndex, selIndex - 1)}
                    >
                      앞으로
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() =>
                        selIndex < pieces.length - 1 && movePiece(selIndex, selIndex + 1)
                      }
                    >
                      뒤로
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => say('AI가 비슷한 다른 조각을 찾고 있습니다')}
                    >
                      다른 조각으로 교체
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtnDanger}
                      onClick={() => {
                        if (pieces.length <= 1) {
                          say('조각은 하나 이상 있어야 합니다')
                          return
                        }
                        setPieces((list) => list.filter((_, i) => i !== selIndex))
                        setSel(Math.max(0, selIndex - 1))
                        say('조각을 뺐습니다')
                      }}
                    >
                      빼기
                    </button>
                  </div>
                </div>
              </>
            )}

            {isHl && (
              <div className={styles.chapterList}>
                {chapters.map((ch, ci) => (
                  <div
                    key={ch.id}
                    className={styles.chapterBox}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragId) moveCardToChapter(dragId, ci)
                      setDragId(null)
                    }}
                  >
                    <div className={styles.chapterHead}>
                      <span className={styles.dragHandle}>⋮⋮</span>
                      <span
                        className={styles.chip}
                        style={{
                          background: `${CHAPTER_COLORS[ch.col % 6]}22`,
                          color: CHAPTER_COLORS[ch.col % 6],
                        }}
                      >
                        {ci + 1}
                      </span>
                      <span className={styles.chapterTitle}>{ch.title}</span>
                      <span className={styles.chapterMeta}>
                        장면 {ch.cards.length}개 ·{' '}
                        {timeText(ch.cards.filter((c) => !c.excluded).reduce((a, c) => a + c.dur, 0))}
                      </span>
                      <div className={styles.chapterActions}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => say('장면 추가 — 추천 목록에서 고르세요')}
                        >
                          장면 추가
                        </button>
                        <button
                          type="button"
                          className={styles.boostBtn}
                          onClick={() => say(`AI가 "${ch.title}" 챕터를 보강했습니다`)}
                        >
                          AI가 이 챕터 보강
                        </button>
                      </div>
                    </div>

                    <div className={styles.chapterGrid}>
                      {ch.cards.map((c) => (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={() => setDragId(c.id)}
                          onClick={() => {
                            const i = sequence.findIndex((x) => x.id === c.id)
                            if (i >= 0) pick(i)
                            else setHlSel(c.id)
                          }}
                          className={[
                            styles.sceneCard,
                            c.id === hlSel ? styles.sceneCardOn : '',
                            c.excluded ? styles.sceneCardExcluded : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <div className={styles.sceneThumb}>
                            <img src={frameImage(c.img)} alt="" className={styles.frameImg} />
                            <span className={styles.pieceDur}>{timeText(c.dur)}</span>
                            {current?.id === c.id && (
                              <span className={styles.playingTag}>재생 중</span>
                            )}
                          </div>
                          <div className={styles.sceneBody}>
                            <span className={styles.sceneEp}>{c.ep}</span>
                            <span className={styles.sceneLine}>“{c.line}”</span>
                            <div className={styles.sceneTagRow}>
                              <span className={styles.pieceTag}>{c.tag}</span>
                              {c.excluded && <span className={styles.excludedTag}>제외됨</span>}
                            </div>
                          </div>
                        </div>
                      ))}

                      {ch.cards.length === 0 && (
                        <div className={styles.chapterEmpty}>
                          장면을 여기로 끌어 오거나 ‘장면 추가’를 누르세요
                        </div>
                      )}
                    </div>

                    {ch.cards.some((c) => c.id === hlSel) && (
                      <div className={styles.selBar}>
                        <span className={styles.selMuted}>선택한 장면</span>
                        <span className={styles.selLabel}>
                          {ch.cards.find((c) => c.id === hlSel)?.ep}
                        </span>
                        <div className={styles.selActions}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={toggleExcluded}
                          >
                            {ch.cards.find((c) => c.id === hlSel)?.excluded
                              ? '다시 포함'
                              : '결과물에서 빼기'}
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => say('AI가 비슷한 다른 장면을 찾고 있습니다')}
                          >
                            다른 장면으로 교체
                          </button>
                          <select
                            className={styles.actionBtn}
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return
                              moveCardToChapter(hlSel, Number(e.target.value))
                              say('챕터를 옮겼습니다')
                            }}
                          >
                            <option value="">챕터 이동</option>
                            {chapters.map((c2, i2) =>
                              i2 === ci ? null : (
                                <option key={c2.id} value={i2}>
                                  {i2 + 1}. {c2.title}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------------- 우측 패널 ---------------- */}
        <aside className={styles.side}>
          <div className={styles.sideTabs}>
            {(
              [
                ['recs', 'AI 추천'],
                ['style', '스타일'],
                ['out', '내보내기'],
              ] as Array<[SideTab, string]>
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={sideTab === k ? `${styles.sideTab} ${styles.sideTabOn}` : styles.sideTab}
                onClick={() => setSideTab(k)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.sideBody}>
            {sideTab === 'recs' && (
              <>
                <div className={styles.sideIntro}>
                  {isShort
                    ? '지금 구성에 넣으면 좋은 조각입니다. 점수가 높을수록 흐름이 자연스럽습니다.'
                    : isClip
                      ? '앞·뒤에 붙이거나 중간을 바꿀 수 있는 장면입니다.'
                      : '서사가 끊기는 자리에 넣을 만한 장면입니다.'}
                </div>

                {recs.map((g, gi) => (
                  <div key={g.title ?? gi} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {g.title && <span className={styles.recGroupTitle}>{g.title}</span>}
                    {g.items.map((r) => (
                      <div key={r.title} className={styles.recCard}>
                        <div
                          className={[
                            styles.recThumb,
                            isShort ? styles.recThumbShort : styles.recThumbWide,
                          ].join(' ')}
                        >
                          <img
                            src={frameImage(r.img, isShort)}
                            alt=""
                            className={styles.frameImg}
                          />
                          <span className={styles.pieceDur}>{timeText(r.dur)}</span>
                        </div>
                        <div className={styles.recBody}>
                          <span className={styles.recTitle}>{r.title}</span>
                          <span className={styles.recMeta}>
                            {r.ep ?? `“${r.line}”`}
                          </span>
                          <div className={styles.recWhyRow}>
                            <span className={styles.recWhy}>{r.why}</span>
                            <span className={styles.recScore}>{r.score}</span>
                          </div>
                          <div className={styles.recActions}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => say(`미리보기 — ${r.title}`)}
                            >
                              미리보기
                            </button>
                            <button
                              type="button"
                              className={styles.recAddBtn}
                              onClick={() => {
                                if (isHl) {
                                  const to = r.to ?? 0
                                  setChapters((list) =>
                                    list.map((ch, i) =>
                                      i === to
                                        ? {
                                            ...ch,
                                            cards: [
                                              ...ch.cards,
                                              {
                                                id: `n${Date.now()}`,
                                                ep: r.ep ?? '',
                                                dur: r.dur,
                                                img: r.img,
                                                line: r.line,
                                                tag: r.tag ?? '',
                                                excluded: false,
                                              },
                                            ],
                                          }
                                        : ch,
                                    ),
                                  )
                                  say(`“${chapters[to]?.title}” 챕터에 넣었습니다`)
                                } else if (r.pos === 'front') insertAt(0, r)
                                else if (r.pos === 'swap') insertAt(selIndex, r)
                                else insertAt(pieces.length, r)
                              }}
                            >
                              {isHl
                                ? `${(r.to ?? 0) + 1}번 챕터에 넣기`
                                : r.pos === 'front'
                                  ? '맨 앞에 넣기'
                                  : r.pos === 'swap'
                                    ? '여기에 끼우기'
                                    : '맨 뒤에 넣기'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {isHl && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      paddingTop: 16,
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span className={styles.sectionTitle}>구성 옵션</span>
                    <button
                      type="button"
                      className={styles.channelRow}
                      onClick={() => setAutoTitle((v) => !v)}
                    >
                      <span style={{ flex: 1 }}>
                        <span className={styles.channelLabel}>자동 챕터 제목</span>
                        <span
                          className={styles.recMeta}
                          style={{ display: 'block', marginTop: 2 }}
                        >
                          장면이 바뀌면 AI가 챕터 제목을 다시 붙입니다
                        </span>
                      </span>
                      <span
                        className={autoTitle ? `${styles.switch} ${styles.switchOn}` : styles.switch}
                      >
                        <span className={styles.switchKnob} />
                      </span>
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>오프닝 카드</span>
                        <select
                          className={styles.input}
                          value={opening}
                          onChange={(e) => setOpening(e.target.value)}
                        >
                          <option value="title">프로젝트 제목</option>
                          <option value="quote">핵심 대사 인용</option>
                          <option value="none">없음</option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>엔딩 카드</span>
                        <select
                          className={styles.input}
                          value={ending}
                          onChange={(e) => setEnding(e.target.value)}
                        >
                          <option value="next">다음 기수 예고</option>
                          <option value="sub">구독 유도</option>
                          <option value="none">없음</option>
                        </select>
                      </label>
                    </div>

                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>배경음악 분위기</span>
                      <div className={styles.moodRow}>
                        {MOODS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={
                              mood === m ? `${styles.moodBtn} ${styles.moodBtnOn}` : styles.moodBtn
                            }
                            onClick={() => setMood(m)}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {sideTab === 'style' && (
              <>
                <div className={styles.field}>
                  <span className={styles.sectionTitle}>브랜드 숏폼 프레임</span>
                  <div className={styles.presetGrid}>
                    {FRAME_PRESETS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        className={
                          framePreset === f.key
                            ? `${styles.presetBtn} ${styles.presetBtnOn}`
                            : styles.presetBtn
                        }
                        onClick={() => setFramePreset(f.key)}
                      >
                        <span className={styles.presetSwatch}>
                          <span className={styles.presetBar} style={{ background: f.color }} />
                        </span>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <span className={styles.sectionTitle}>자막 스타일</span>
                  {SUBTITLE_STYLES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={
                        subStyle === s.key
                          ? `${styles.subStyleBtn} ${styles.subStyleBtnOn}`
                          : styles.subStyleBtn
                      }
                      onClick={() => setSubStyle(s.key)}
                    >
                      <span
                        className={styles.subSample}
                        style={
                          s.key === 'box'
                            ? { background: 'rgba(10,15,26,.82)', color: '#fff' }
                            : s.key === 'outline'
                              ? { color: '#fff', textShadow: '0 0 3px #000' }
                              : { color: 'var(--text-muted)' }
                        }
                      >
                        이게 말이 돼?
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {sideTab === 'out' && (
              <>
                <div className={styles.field}>
                  <span className={styles.sectionTitle}>배포 채널</span>
                  {OUTPUT_CHANNELS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={styles.channelRow}
                      onClick={() => setChannels((m) => ({ ...m, [c.key]: !m[c.key] }))}
                    >
                      <span
                        className={styles.chip}
                        style={{
                          width: 18,
                          minWidth: 18,
                          height: 18,
                          borderRadius: 5,
                          background: channels[c.key] ? 'var(--bg-active)' : 'transparent',
                          border: channels[c.key] ? 0 : '1.5px solid var(--border-subtle)',
                          color: '#fff',
                        }}
                      >
                        {channels[c.key] ? '✓' : ''}
                      </span>
                      <span className={styles.channelLabel}>{c.label}</span>
                      <span className={styles.channelAcct}>{c.account}</span>
                    </button>
                  ))}
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>제목</span>
                  <input
                    className={styles.input}
                    placeholder="영호, 결국 폭발하다 #Shorts"
                    value={outTitle}
                    onChange={(e) => setOutTitle(e.target.value)}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>설명</span>
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    placeholder="나는 SOLO 32회에서 뽑은 숏폼입니다."
                    value={outDesc}
                    onChange={(e) => setOutDesc(e.target.value)}
                  />
                </label>

                <div className={styles.field}>
                  <span className={styles.fieldLabel}>
                    썸네일 <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>AI 추천 프레임</span>
                  </span>
                  <div className={styles.thumbGrid}>
                    {sequence.slice(0, 3).map((x, i) => (
                      <button
                        key={x.id}
                        type="button"
                        className={
                          thumbIndex === i ? `${styles.thumbBtn} ${styles.thumbBtnOn}` : styles.thumbBtn
                        }
                        onClick={() => setThumbIndex(i)}
                      >
                        <img src={frameImage(x.img)} alt="" className={styles.thumbImg} />
                      </button>
                    ))}
                  </div>
                </div>

                {isShort && (
                  <div className={styles.outNote}>
                    1080 × 1920 · 30fps · {timeText(total)}
                    <br />
                    쇼츠·릴스·틱톡 길이 제한(60초) {total <= 60 ? '안에 있습니다.' : '을 넘었습니다.'}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
