import { useEffect, useMemo, useRef, useState } from 'react'
import { Chip } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Controls'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ui/ConfirmDialog'
import type { ScreenKey } from '@/app/screens'
import { editorRoute } from '@/features/editor/data'
import {
  CLIPS,
  DIST_STYLE,
  EPISODES,
  KIND_ORDER,
  KIND_TONE,
  NO_EPISODE,
  channelsOf,
  durationText,
  episodeOf,
  flagsOf,
  metaOf,
  renderChip,
  ME,
  commentsOf,
  versionsOf,
  type ClipComment,
  type ClipVersion,
  type Episode,
  type MediaClip,
  type MediaKind,
} from './data'
import { CommentPanel } from './CommentPanel'
import styles from './MediaPage.module.css'
import type { MediaCollaborationStore, MediaCommentTarget } from './useMediaCollaborationMock'

/** 댓글에서 부른 사람 찾기 */
const MENTION_RE = /@[가-힣A-Za-z0-9_]+/g

/** 업로드 모달의 프로그램 고르기 (회차가 등록된 프로그램) */
const PROGRAMS = [...new Set(EPISODES.map((e) => e.program))]

const TOAST_MS = 2600
/** 업로드 진행 시뮬레이션 간격 */
const TICK_MS = 700

type Layout = 'A' | 'B'
type Source = 'ai' | 'upload'

export interface MediaPageProps {
  /** 'A' 목록(기본) · 'B' 카드 */
  initialLayout?: Layout
  onNavigate: (screen: ScreenKey) => void
  collaboration: MediaCollaborationStore
  commentTarget: MediaCommentTarget | null
  onCommentTargetHandled: () => void
}

interface MetaDraft {
  id: string
  ch: string
  title: string
  desc: string
  tags: string
  extra: Record<string, string>
}

export function MediaPage({ initialLayout = 'A', onNavigate, collaboration, commentTarget, onCommentTargetHandled }: MediaPageProps) {
  const [clips, setClips] = useState<MediaClip[]>(CLIPS)
  const [layout, setLayout] = useState<Layout>(initialLayout)
  const [source, setSource] = useState<Source>('ai')
  const [type, setType] = useState('all')
  const [program, setProgram] = useState('all')
  const [epFilter, setEpFilter] = useState('all')
  const [selected, setSelected] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [programCollapsed, setProgramCollapsed] = useState<Record<string, boolean>>({})
  const [detailId, setDetailId] = useState<string | null>(null)
  const [metaCh, setMetaCh] = useState<string | null>(null)
  const [metaDraft, setMetaDraft] = useState<MetaDraft | null>(null)

  /** 댓글과 버전은 알림함과 공유하고 화면 이동 후에도 유지합니다. */
  const { threads, setThreads } = collaboration
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null)
  /** 상세에서 보고 있는 버전 (null = 전체) */
  const [filterV, setFilterV] = useState<number | null>(null)
  useEffect(() => {
    if (!commentTarget) return
    if (clips.some((clip) => clip.id === commentTarget.clipId)) {
      setDetailId(commentTarget.clipId)
      setFilterV(commentTarget.version)
      setHighlightedCommentId(commentTarget.commentId)
      setMetaCh(null)
      setMetaDraft(null)
    }
    onCommentTargetHandled()
  }, [commentTarget, clips, onCommentTargetHandled])

  /** 처음 열 때 시드로 채우고, 그 뒤로는 state 를 씁니다 */
  const threadOf = (clip: MediaClip) =>
    threads[clip.id] ?? { versions: versionsOf(clip), comments: commentsOf(clip) }
  const [upload, setUpload] = useState<{
    title: string
    /** 프로그램 이름 — 빈 문자열이면 미지정 */
    program: string
    /** 회차 키 — 'none' 이면 미지정 */
    ep: string
    kind: MediaKind
  } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [toast, setToast] = useState('')

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const say = (text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(text)
    toastTimer.current = setTimeout(() => setToast(''), TOAST_MS)
  }

  /* 업로드 · 인코딩 진행 시뮬레이션 */
  useEffect(() => {
    const id = setInterval(() => {
      setClips((list) => {
        if (!list.some((c) => c.render === 'uploading' || c.render === 'processing')) return list
        return list.map((c) => {
          if (c.render === 'uploading') {
            const pct = Math.min(100, (c.pct ?? 0) + 9)
            return pct >= 100 ? { ...c, pct: 100, render: 'processing' as const } : { ...c, pct }
          }
          if (c.render === 'processing') return { ...c, render: 'done' as const }
          return c
        })
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])


  /* ---------------- 필터 ---------------- */

  const base = clips.filter((c) => {
    const e = episodeOf(c.ep)
    if (c.source !== source) return false
    if (type === 'short' && c.kind !== '숏폼') return false
    if (type === 'clip' && c.kind !== '클립') return false
    if (type === 'hl' && c.kind !== '하이라이트') return false
    if (program !== 'all' && e.program !== program) return false
    if (epFilter !== 'all' && c.ep !== epFilter) return false
    return true
  })

  const list = base

  /* ---------------- 그룹 ---------------- */

  /** 회차는 방송일 최신순, 그 안은 숏폼 → 클립 → 하이라이트 순 */
  const episodeGroups = useMemo(
    () =>
      [...EPISODES, NO_EPISODE]
        .map((e) => ({ episode: e, clips: list.filter((c) => c.ep === e.key) }))
        .filter((g) => g.clips.length > 0)
        .sort((a, b) => b.episode.airNo - a.episode.airNo)
        .map(({ episode, clips: cs }) => ({
          episode,
          clips: [...cs].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]),
        })),
    [list],
  )

  const programGroups = useMemo(() => {
    const map = new Map<string, typeof episodeGroups>()
    episodeGroups.forEach((g) => {
      const key = g.episode.ep ? g.episode.program : '회차 미지정'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(g)
    })
    return [...map.entries()].map(([name, groups]) => ({ name, groups }))
  }, [episodeGroups])

  /* ---------------- 선택 ---------------- */

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const selectedClips = clips.filter((c) => selected.includes(c.id))
  const countOfKind = (k: MediaKind) => selectedClips.filter((c) => c.kind === k).length

  const remove = (c: MediaClip) =>
    setConfirm({
      title: `"${c.title}"를 삭제할까요?`,
      body: '이미 채널에 올라간 영상은 내려가지 않습니다.',
      confirmLabel: '삭제',
      tone: 'danger',
      onConfirm: () => {
        setClips((list2) => list2.filter((x) => x.id !== c.id))
        setSelected((s) => s.filter((x) => x !== c.id))
        setDetailId((d) => (d === c.id ? null : d))
        say('삭제했습니다')
      },
    })

  const detail = clips.find((c) => c.id === detailId) ?? null
  const detailEpisode = detail ? episodeOf(detail.ep) : null

  const programOptions = [...new Set(EPISODES.map((e) => e.program))]
  const epOptions = EPISODES.filter(
    (e) => program === 'all' || e.program === program,
  ).map((e) => ({ key: e.key, label: `${e.program} ${e.ep}회` }))

  /* ---------------- 렌더 ---------------- */

  return (
    <>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.h1}>미디어</h1>
          <button
            type="button"
            className={styles.uploadBtn}
            onClick={() => setUpload({ title: '', program: '', ep: 'none', kind: '숏폼' })}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 16V4" />
              <path d="M6 10l6-6 6 6" />
              <path d="M4 20h16" />
            </svg>
            영상 업로드
          </button>
        </div>

        {/* ---------------- 출처 탭 ---------------- */}
        <div className={styles.sourceTabs}>
          {(
            [
              ['ai', 'AI 추천'],
              ['upload', '직접 업로드'],
            ] as Array<[Source, string]>
          ).map(([k, label]) => {
            const on = source === k
            const n = clips.filter((c) => c.source === k).length
            return (
              <button
                key={k}
                type="button"
                className={on ? `${styles.sourceTab} ${styles.sourceTabOn}` : styles.sourceTab}
                onClick={() => {
                  setSource(k)
                  setSelected([])
                }}
              >
                <span>
                  <span
                    className={on ? `${styles.sourceLabel} ${styles.sourceLabelOn}` : styles.sourceLabel}
                  >
                    {label}
                  </span>
                  <span
                    className={on ? `${styles.sourceCount} ${styles.sourceCountOn}` : styles.sourceCount}
                  >
                    {n}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* ---------------- 필터 ---------------- */}
        <div className={styles.filters}>
          <div className={styles.segment}>
            {[
              ['all', '전체'],
              ['short', '숏폼'],
              ['clip', '클립'],
              ['hl', '하이라이트'],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={type === k ? `${styles.seg} ${styles.segOn}` : styles.seg}
                onClick={() => setType(k)}
              >
                {label}
              </button>
            ))}
          </div>

          <Select
            value={program}
            style={{ minWidth: 160 }}
            onChange={(e) => {
              setProgram(e.target.value)
              setEpFilter('all')
            }}
          >
            <option value="all">전체 프로그램</option>
            {programOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>

          <Select
            value={epFilter}
            style={{ minWidth: 150 }}
            onChange={(e) => setEpFilter(e.target.value)}
          >
            <option value="all">전체 회차</option>
            {epOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>

          <span className={styles.countLabel}>
            프로그램 {programGroups.length} · 회차 {episodeGroups.length} · 미디어 {list.length}건
          </span>

          <div className={styles.segment}>
            {(
              [
                ['A', '목록', '한 줄씩 — 상태 · 채널을 빠르게 훑기'],
                ['B', '카드', '썸네일 — 장면을 보면서 고르기'],
              ] as Array<[Layout, string, string]>
            ).map(([k, label, title]) => (
              <button
                key={k}
                type="button"
                title={title}
                className={layout === k ? `${styles.seg} ${styles.segOn}` : styles.seg}
                onClick={() => setLayout(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ---------------- 목록 ---------------- */}
        {list.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>조건에 맞는 미디어가 없습니다</div>
            <div className={styles.emptyNote}>
              유형 · 프로그램 · 회차 필터를 바꿔 보세요.
            </div>
            <button
              type="button"
              className={styles.smallBtn}
              style={{ height: 34, padding: '0 14px' }}
              onClick={() => {
                setType('all')
                setProgram('all')
                setEpFilter('all')
              }}
            >
              필터 초기화
            </button>
          </div>
        ) : (
          <div className={styles.groupStack}>
            {programGroups.map((pg) => {
              const open = !programCollapsed[pg.name]
              const total = pg.groups.reduce((n, g) => n + g.clips.length, 0)
              return (
                <div key={pg.name} className={styles.programGroup}>
                  <button
                    type="button"
                    className={styles.programHead}
                    onClick={() =>
                      setProgramCollapsed((m) => ({ ...m, [pg.name]: !m[pg.name] }))
                    }
                  >
                    <span className={styles.caret}>{open ? '▾' : '▸'}</span>
                    <span className={styles.programName}>{pg.name}</span>
                    <span className={styles.programSub}>
                      {pg.groups[0].episode.ep
                        ? `회차 ${pg.groups.length} · 미디어 ${total}`
                        : `미디어 ${total}`}
                    </span>
                  </button>

                  {open && (
                    <div className={styles.programGroup}>
                      {pg.groups.map((g) =>
                        layout === 'A' ? (
                          <EpisodeList
                            key={g.episode.key}
                            episode={g.episode}
                            clips={g.clips}
                            selected={selected}
                            collapsed={!!collapsed[g.episode.key]}
                            onToggleCollapse={() =>
                              setCollapsed((m) => ({
                                ...m,
                                [g.episode.key]: !m[g.episode.key],
                              }))
                            }
                            onToggle={toggle}
                            onToggleAll={(ids, all) =>
                              setSelected((s) =>
                                all
                                  ? s.filter((id) => !ids.includes(id))
                                  : [...new Set([...s, ...ids])],
                              )
                            }
                            onOpen={setDetailId}
                            onEdit={(clip) => onNavigate(editorRoute(clip.kind))}
                            onDelete={remove}
                            onAnalysis={() => onNavigate('analysis')}
                            showAnalysisLink={source === 'ai'}
                          />
                        ) : (
                          <EpisodeTiles
                            key={g.episode.key}
                            episode={g.episode}
                            clips={g.clips}
                            selected={selected}
                            onToggle={toggle}
                            onToggleAll={(ids, all) =>
                              setSelected((s) =>
                                all
                                  ? s.filter((id) => !ids.includes(id))
                                  : [...new Set([...s, ...ids])],
                              )
                            }
                            onOpen={setDetailId}
                            onAnalysis={() => onNavigate('analysis')}
                            showAnalysisLink={source === 'ai'}
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ---------------- 선택 바 ---------------- */}
      {selected.length > 0 && (
        <div className={styles.selectionBar}>
          <span className={styles.selCount}>{selected.length}건 선택됨</span>
          <span className={styles.selNote}>
            {(['숏폼', '클립', '하이라이트'] as MediaKind[])
              .map((k) => (countOfKind(k) ? `${k} ${countOfKind(k)}` : ''))
              .filter(Boolean)
              .join(' · ')}
          </span>
          <span className={styles.selNote}>· 렌더가 끝난 미디어만 선택할 수 있습니다</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button type="button" className={styles.footBtn} onClick={() => setSelected([])}>
              선택 해제
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => say(`배포 창 — ${selected.length}건 · 채널 · 예약 선택`)}
            >
              배포 ({selected.length}건)
            </button>
          </div>
        </div>
      )}

      {/* ---------------- 상세 ---------------- */}
      {detail && detailEpisode && (
        <DetailModal
          clip={detail}
          episode={detailEpisode}
          thread={threadOf(detail)}
          filterV={filterV}
          highlightedCommentId={highlightedCommentId}
          onFilterV={setFilterV}
          onAddComment={(text, v) => {
            const t = threadOf(detail)
            const at = '방금'
            const next: ClipComment = {
              id: `${detail.id}-n${t.comments.length}`,
              by: ME,
              at,
              text,
              v,
            }
            collaboration.addComment(detail, next)
            // TODO(api): POST /media/:id/comments
            const called = text.match(MENTION_RE)
            say(called ? `댓글을 남겼습니다 — ${called.join(', ')} 에게 알림` : '댓글을 남겼습니다')
          }}
          onAddVersion={() => {
            const t = threadOf(detail)
            const v = t.versions.length + 1
            const at = '방금'
            const version: ClipVersion = { v, by: ME, at, note: '새로 올린 파일' }
            const system: ClipComment = {
              id: `${detail.id}-v${v}`,
              by: ME,
              at,
              text: '',
              v,
              system: true,
            }
            // TODO(api): POST /media/:id/versions
            setThreads((m) => ({
              ...m,
              [detail.id]: { versions: [...t.versions, version], comments: [...t.comments, system] },
            }))
            setFilterV(null)
            say(`v${v} 을 올렸습니다 — 이 영상을 보고 있는 사람에게 알림이 갑니다`)
          }}
          onRestore={(v) => {
            const t = threadOf(detail)
            const nv = t.versions.length + 1
            const at = '방금'
            setThreads((m) => ({
              ...m,
              [detail.id]: {
                versions: [...t.versions, { v: nv, by: ME, at, note: `v${v} 로 되돌림` }],
                comments: [
                  ...t.comments,
                  { id: `${detail.id}-v${nv}`, by: ME, at, text: '', v: nv, system: true },
                ],
              },
            }))
            setFilterV(null)
            say(`v${v} 내용으로 v${nv} 을 만들었습니다`)
          }}
          metaCh={metaCh}
          onMetaCh={setMetaCh}
          draft={metaDraft}
          onDraft={setMetaDraft}
          onSaveMeta={(ch, value) => {
            setClips((list2) =>
              list2.map((x) =>
                x.id === detail.id ? { ...x, meta: { ...(x.meta ?? {}), [ch]: value } } : x,
              ),
            )
            setMetaDraft(null)
            say(`${ch} 메타데이터를 저장했습니다`)
          }}
          onClose={() => {
            setHighlightedCommentId(null)
            setDetailId(null)
            setMetaDraft(null)
            setFilterV(null)
          }}
          onDelete={() => remove(detail)}
          onEdit={() => onNavigate(editorRoute(detail.kind))}
          onRetry={(ch) => say(`${ch} 다시 시도 — 배포 화면에서 진행 상황을 볼 수 있습니다`)}
          onSay={say}
        />
      )}

      {/* ---------------- 업로드 ---------------- */}
      {upload && (
        <div className={styles.upScrim} onClick={() => setUpload(null)}>
          <div className={styles.upModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.upTitle}>영상 업로드</div>

            <div
              className={styles.dropZone}
              onClick={() => say('파일 선택 창이 열립니다')}
            >
              영상 파일을 끌어다 놓거나 눌러서 고르세요
              <span className={styles.dropNote}>
                세로 9:16 은 숏폼, 가로 16:9 는 클립으로 자동 분류됩니다
              </span>
            </div>

            <label className={styles.upField}>
              <span className={styles.upLabel}>제목</span>
              <input
                className={styles.input}
                placeholder="예: 텐트 붕괴 슬로모션"
                value={upload.title}
                onChange={(e) => setUpload({ ...upload, title: e.target.value })}
              />
            </label>

            <label className={styles.upField}>
              <span className={styles.upLabel}>프로그램</span>
              <Select
                value={upload.program}
                onChange={(e) =>
                  // 프로그램을 바꾸면 회차는 다시 고릅니다
                  setUpload({ ...upload, program: e.target.value, ep: 'none' })
                }
              >
                <option value="">프로그램 미지정</option>
                {PROGRAMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </label>

            <div className={styles.upGrid}>
              <label className={styles.upField}>
                <span className={styles.upLabel}>회차</span>
                <Select
                  value={upload.ep}
                  disabled={!upload.program}
                  title={upload.program ? undefined : '프로그램을 먼저 고르세요'}
                  onChange={(e) => setUpload({ ...upload, ep: e.target.value })}
                >
                  <option value="none">회차 미지정</option>
                  {EPISODES.filter((e) => e.program === upload.program).map((e) => (
                    <option key={e.key} value={e.key}>
                      {e.ep}회
                    </option>
                  ))}
                </Select>
              </label>
              <label className={styles.upField}>
                <span className={styles.upLabel}>유형</span>
                <Select
                  value={upload.kind}
                  onChange={(e) => setUpload({ ...upload, kind: e.target.value as MediaKind })}
                >
                  <option value="숏폼">숏폼</option>
                  <option value="클립">클립</option>
                  <option value="하이라이트">하이라이트</option>
                </Select>
              </label>
            </div>

            <div className={styles.upActions}>
              <button type="button" className={styles.footBtn} onClick={() => setUpload(null)}>
                취소
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!upload.title.trim()}
                onClick={() => {
                  const id = `up${clips.length + 1}`
                  setClips((list2) => [
                    {
                      id,
                      ep: upload.ep,
                      kind: upload.kind,
                      title: upload.title.trim(),
                      dur: upload.kind === '숏폼' ? 42 : 240,
                      created: '방금',
                      render: 'uploading',
                      dists: [],
                      source: 'upload',
                      uploader: '김도윤',
                      pct: 0,
                      thumb:
                        upload.kind === '숏폼'
                          ? CLIPS[0].thumb
                          : CLIPS[4].thumb,
                    },
                    ...list2,
                  ])
                  setUpload(null)
                  setSource('upload')
                  say('업로드를 시작했습니다 — 끝나면 렌더가 이어집니다')
                }}
              >
                업로드
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}

/* ================================================================== *
 * 회차 카드 — 목록(A)
 * ================================================================== */

interface EpisodeViewProps {
  episode: Episode
  clips: MediaClip[]
  selected: string[]
  onToggle: (id: string) => void
  onToggleAll: (ids: string[], allChecked: boolean) => void
  onOpen: (id: string) => void
  onAnalysis: () => void
  showAnalysisLink: boolean
}

function useEpisodeStats(clips: MediaClip[], selected: string[]) {
  const selectable = clips.filter((c) => c.render === 'done').map((c) => c.id)
  const allChecked = selectable.length > 0 && selectable.every((id) => selected.includes(id))
  const fs = clips.map(flagsOf)
  return {
    selectable,
    allChecked,
    failed: fs.filter((f) => f.failed).length,
    none: fs.filter((f) => f.none).length,
    rendering: fs.filter((f) => f.rendering).length,
    ready: fs.filter((f) => f.ready).length,
    published: fs.filter((f) => f.published).length,
    shorts: clips.filter((c) => c.kind === '숏폼'),
    clipsOnly: clips.filter((c) => c.kind === '클립'),
    highlights: clips.filter((c) => c.kind === '하이라이트'),
  }
}

function ChannelChips({ clip, small }: { clip: MediaClip; small?: boolean }) {
  if (clip.dists.length === 0) {
    return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
  }
  return (
    <>
      {clip.dists.map((d) => {
        const m = DIST_STYLE[d.status]
        const bad = d.status === 'failed'
        return (
          <span
            key={d.ch}
            title={`${d.ch} · ${m.label}${d.at ? ` · ${d.at}` : ''}${d.err ? `\n${d.err}` : ''}`}
            className={[
              styles.channelChip,
              small ? styles.channelChipSm : '',
              bad ? styles.channelChipBad : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.channelDot} style={{ background: m.dot }} />
            {d.ch}
          </span>
        )
      })}
    </>
  )
}

function EpisodeList({
  episode,
  clips,
  selected,
  collapsed,
  onToggleCollapse,
  onToggle,
  onToggleAll,
  onOpen,
  onEdit,
  onDelete,
  onAnalysis,
  showAnalysisLink,
}: EpisodeViewProps & {
  collapsed: boolean
  onToggleCollapse: () => void
  onEdit: (c: MediaClip) => void
  onDelete: (c: MediaClip) => void
}) {
  const stats = useEpisodeStats(clips, selected)
  const attention = [
    stats.failed && `배포 실패 ${stats.failed}`,
    stats.none && `렌더 전 ${stats.none}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={styles.epCard}>
      <div className={styles.epHead}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={stats.allChecked}
          disabled={stats.selectable.length === 0}
          onChange={() => onToggleAll(stats.selectable, stats.allChecked)}
        />
        <button type="button" className={styles.epHeadBtn} onClick={onToggleCollapse}>
          <span className={styles.caret}>{collapsed ? '▸' : '▾'}</span>
          <span className={styles.epHeading}>{episode.ep ? `${episode.ep}회` : '회차 미지정'}</span>
          <span className={styles.epAir}>
            {episode.air ? `방송 ${episode.air}` : '프로그램 · 회차에 묶이지 않은 영상'}
          </span>
        </button>
        <span className={styles.epCount}>
          {[
            stats.shorts.length && `숏폼 ${stats.shorts.length}`,
            stats.clipsOnly.length && `클립 ${stats.clipsOnly.length}`,
            stats.highlights.length && `하이라이트 ${stats.highlights.length}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {attention && <span className={styles.epAttention}>{attention}</span>}
        {showAnalysisLink && (
          <button type="button" className={styles.epLink} onClick={onAnalysis}>
            분석 결과 보기 →
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <div className={styles.rowHead}>
            <span />
            <span />
            <span>제목</span>
            <span>상태</span>
            <span>채널별 배포</span>
            <span />
          </div>

          {clips.map((c) => {
            const f = flagsOf(c)
            const chip = renderChip(c)
            const isSelected = selected.includes(c.id)
            return (
              <div
                key={c.id}
                className={[
                  styles.row,
                  isSelected ? styles.rowSelected : '',
                  !isSelected && f.failed ? styles.rowFailed : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onOpen(c.id)}
              >
                <span onClick={(e) => e.stopPropagation()} style={{ display: 'flex' }}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isSelected}
                    disabled={c.render !== 'done'}
                    title={
                      c.render !== 'done'
                        ? f.rendering
                          ? '렌더가 끝나면 배포할 수 있습니다'
                          : '편집기에서 내보내기를 해야 배포할 수 있습니다'
                        : '배포 대상으로 선택'
                    }
                    onChange={() => onToggle(c.id)}
                  />
                </span>

                <div className={styles.thumbBox}>
                  <img
                    src={c.thumb}
                    alt=""
                    className={c.kind === '숏폼' ? styles.thumbPortrait : styles.thumbLandscape}
                  />
                  <span className={styles.durBadge}>{durationText(c.dur)}</span>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className={styles.rowTitle}>
                    {c.title}
                  </div>
                  <div className={styles.rowMeta}>
                    <Chip tone={KIND_TONE[c.kind]}>{c.kind}</Chip>
                    <span>{c.kind === '숏폼' ? '9:16' : '16:9'}</span>
                    <span>·</span>
                    <span>
                      {c.source === 'upload'
                        ? `업로드 ${c.uploader} · ${c.created}`
                        : `생성 ${c.created}`}
                    </span>
                  </div>
                </div>

                <div className={styles.chipWrap}>
                  <Chip tone={chip.tone}>{chip.label}</Chip>
                </div>

                <div className={styles.chipWrap}>
                  <ChannelChips clip={c} />
                </div>

                <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                  <button type="button" className={styles.rowBtn} onClick={() => onEdit(c)}>
                    편집
                  </button>
                  <button
                    type="button"
                    className={styles.rowDelBtn}
                    title="삭제"
                    onClick={() => onDelete(c)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

/* ================================================================== *
 * 회차 카드 — 타일(B)
 * ================================================================== */

function EpisodeTiles({
  episode,
  clips,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
  onAnalysis,
  showAnalysisLink,
}: EpisodeViewProps) {
  const stats = useEpisodeStats(clips, selected)

  const statRow = (label: string, value: number, red = false) => (
    <div key={label} className={styles.tileStat}>
      <span className={styles.tileStatLabel}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: red && value ? 'hsl(var(--status-error))' : value ? 'var(--text-primary)' : 'var(--border-subtle)',
        }}
      >
        {value}
      </span>
    </div>
  )

  const renderTile = (c: MediaClip, short: boolean) => {
    const chip = renderChip(c)
    const isSelected = selected.includes(c.id)
    return (
      <div
        key={c.id}
        className={[
          styles.tile,
          short ? styles.tileShort : styles.tileClip,
          isSelected ? styles.tileSelected : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => onOpen(c.id)}
      >
        <div
          className={[
            styles.tileMedia,
            short ? styles.tileMediaShort : styles.tileMediaWide,
          ].join(' ')}
        >
          <img src={c.thumb} alt="" className={styles.tileImg} />
          <span className={styles.tileCheck} onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className={styles.checkbox}
              style={{ width: 15, height: 15 }}
              checked={isSelected}
              disabled={c.render !== 'done'}
              onChange={() => onToggle(c.id)}
            />
          </span>
          <span className={styles.tileDur}>{durationText(c.dur)}</span>
          {chip.label !== '완료' && (
            <div className={styles.tileOverlay}>
              <Chip tone={chip.tone}>{chip.label}</Chip>
            </div>
          )}
        </div>
        <div className={short ? styles.tileTitle : styles.tileTitleOne}>
          {c.title}
        </div>
        <div className={styles.tileChips}>
          {c.dists.length === 0 ? (
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>배포 전</span>
          ) : (
            <ChannelChips clip={c} small />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.tileCard}>
      <div className={styles.tileSide}>
        <div>
          <div className={styles.tileSideAir}>
            {episode.air ? `방송 ${episode.air}` : '프로그램 · 회차에 묶이지 않은 영상'}
          </div>
          <div className={styles.tileSideEp}>
            {episode.ep ? `${episode.ep}회` : '회차 미지정'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {statRow('배포 실패', stats.failed, true)}
          {statRow('렌더 중 · 전', stats.rendering + stats.none)}
          {statRow('배포 대기', stats.ready)}
          {statRow('배포됨', stats.published)}
        </div>

        <label className={styles.tileSelectAll}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={stats.allChecked}
            disabled={stats.selectable.length === 0}
            onChange={() => onToggleAll(stats.selectable, stats.allChecked)}
          />
          배포 가능한 것 모두 선택
        </label>

        {showAnalysisLink && (
          <button
            type="button"
            className={styles.epLink}
            style={{ marginTop: 'auto', marginLeft: 0, textAlign: 'left' }}
            onClick={onAnalysis}
          >
            분석 결과 보기 →
          </button>
        )}
      </div>

      <div className={styles.tileBody}>
        {stats.shorts.length > 0 && (
          <div>
            <div className={styles.tileSectionLabel}>숏폼 {stats.shorts.length}</div>
            <div className={styles.tileRow}>{stats.shorts.map((c) => renderTile(c, true))}</div>
          </div>
        )}
        {stats.clipsOnly.length > 0 && (
          <div>
            <div className={styles.tileSectionLabel}>클립 {stats.clipsOnly.length}</div>
            <div className={styles.tileRow}>{stats.clipsOnly.map((c) => renderTile(c, false))}</div>
          </div>
        )}
        {stats.highlights.length > 0 && (
          <div>
            <div className={styles.tileSectionLabel}>하이라이트 {stats.highlights.length}</div>
            <div className={styles.tileRow}>
              {stats.highlights.map((c) => renderTile(c, false))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================== *
 * 상세 모달
 * ================================================================== */

function DetailModal({
  clip,
  episode,
  thread,
  filterV,
  highlightedCommentId,
  onFilterV,
  onAddComment,
  onAddVersion,
  onRestore,
  metaCh,
  onMetaCh,
  draft,
  onDraft,
  onSaveMeta,
  onClose,
  onDelete,
  onEdit,
  onRetry,
  onSay,
}: {
  clip: MediaClip
  episode: Episode
  thread: { versions: ClipVersion[]; comments: ClipComment[] }
  filterV: number | null
  highlightedCommentId: string | null
  onFilterV: (v: number | null) => void
  onAddComment: (text: string, v: number) => void
  onAddVersion: () => void
  onRestore: (v: number) => void
  metaCh: string | null
  onMetaCh: (ch: string) => void
  draft: MetaDraft | null
  onDraft: (d: MetaDraft | null) => void
  onSaveMeta: (ch: string, value: { title: string; desc: string; tags: string[]; extra: Record<string, string> }) => void
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
  onRetry: (ch: string) => void
  onSay: (text: string) => void
}) {
  const short = clip.kind === '숏폼'
  const channels = channelsOf(clip)
  const currentCh = metaCh && channels.includes(metaCh) ? metaCh : channels[0]
  const meta = metaOf(clip, episode, currentCh)
  const editing = draft && draft.id === clip.id && draft.ch === currentCh
  const chip = renderChip(clip)
  const flags = flagsOf(clip)
  const canDeploy = clip.render === 'done'

  return (
    <>
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <span className={styles.modalHeadText}>
            {episode.ep
              ? `${episode.program} ${episode.ep}회 · 방송 ${episode.air}`
              : '회차 미지정 · 직접 업로드'}
          </span>
          <button type="button" className={styles.closeBtn} aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalLeft}>
            <div className={styles.playerBox}>
              <img
                src={clip.thumb}
                alt=""
                className={short ? styles.playerShort : styles.playerWide}
              />
            </div>

            <div>
              <div className={styles.detailTitle}>
                {clip.title}
              </div>
              <div className={styles.detailMeta}>
                <Chip tone={KIND_TONE[clip.kind]}>{clip.kind}</Chip>
                <span>
                  {short ? '9:16' : '16:9'} · {durationText(clip.dur)}
                </span>
                <span>·</span>
                <span>
                  {clip.source === 'upload'
                    ? `업로드 ${clip.uploader} · ${clip.created}`
                    : `생성 ${clip.created}`}
                </span>
              </div>
              <div className={styles.chipWrap} style={{ marginTop: 12 }}>
                <Chip tone={chip.tone}>{chip.label}</Chip>
              </div>
            </div>
          </div>

          <div className={styles.modalRight}>
            {/* 썸네일 */}
            <div>
              <div className={styles.sectionHead}>
                <span className={styles.sectionTitle}>썸네일</span>
                <button
                  type="button"
                  className={styles.smallBtn}
                  onClick={() => onSay('썸네일 변경 — 프레임 선택 또는 이미지 업로드')}
                >
                  변경
                </button>
              </div>
              <div className={styles.thumbRow}>
                <div className={short ? styles.thumbPreviewShort : styles.thumbPreviewWide}>
                  <img src={clip.thumb} alt="" className={styles.tileImg} />
                </div>
                <div className={styles.thumbNote}>
                  {clip.source === 'upload'
                    ? '영상 0:04 프레임 · 모든 채널 공통'
                    : 'AI 추천 프레임 0:04 · 모든 채널 공통'}
                </div>
              </div>
            </div>

            {/* 채널별 메타데이터 */}
            <div>
              <div className={styles.sectionHead}>
                <span className={styles.sectionTitle}>채널별 메타데이터</span>
                {!editing && (
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() =>
                      onDraft({
                        id: clip.id,
                        ch: currentCh,
                        title: meta.title,
                        desc: meta.desc,
                        tags: meta.tags.join(', '),
                        extra: Object.fromEntries(meta.extra.map((x) => [x.k, x.v])),
                      })
                    }
                  >
                    변경
                  </button>
                )}
              </div>

              <div className={styles.metaTabs}>
                {channels.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    className={
                      ch === currentCh ? `${styles.metaTab} ${styles.metaTabOn}` : styles.metaTab
                    }
                    onClick={() => {
                      onMetaCh(ch)
                      onDraft(null)
                    }}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {editing && draft ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label className={styles.metaField}>
                    <span className={styles.metaLabel}>제목</span>
                    <input
                      className={styles.input}
                      value={draft.title}
                      onChange={(e) => onDraft({ ...draft, title: e.target.value })}
                    />
                  </label>
                  <label className={styles.metaField}>
                    <span className={styles.metaLabel}>{meta.descLabel}</span>
                    <textarea
                      className={styles.textarea}
                      rows={4}
                      value={draft.desc}
                      onChange={(e) => onDraft({ ...draft, desc: e.target.value })}
                    />
                  </label>
                  <label className={styles.metaField}>
                    <span className={styles.metaLabel}>
                      {meta.tagLabel} <span style={{ fontWeight: 400 }}>쉼표로 구분</span>
                    </span>
                    <input
                      className={styles.input}
                      value={draft.tags}
                      onChange={(e) => onDraft({ ...draft, tags: e.target.value })}
                    />
                  </label>
                  <div className={styles.metaExtraGrid} style={{ borderTop: 0, paddingTop: 0 }}>
                    {meta.extra.map((x) => (
                      <label key={x.k} className={styles.metaField}>
                        <span className={styles.metaLabel}>{x.k}</span>
                        {x.opts ? (
                          <Select
                            value={draft.extra[x.k] ?? x.v}
                            onChange={(e) =>
                              onDraft({
                                ...draft,
                                extra: { ...draft.extra, [x.k]: e.target.value },
                              })
                            }
                          >
                            {x.opts.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <input
                            className={styles.input}
                            value={draft.extra[x.k] ?? x.v}
                            onChange={(e) =>
                              onDraft({
                                ...draft,
                                extra: { ...draft.extra, [x.k]: e.target.value },
                              })
                            }
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  <div className={styles.editFoot}>
                    <span className={styles.editNote}>렌더 없이 바로 저장됩니다</span>
                    <button
                      type="button"
                      className={styles.smallBtn}
                      style={{ height: 32 }}
                      onClick={() => onDraft(null)}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      style={{ height: 32, padding: '0 14px', fontSize: 12.5 }}
                      onClick={() =>
                        onSaveMeta(currentCh, {
                          title: draft.title.trim() || meta.title,
                          desc: draft.desc,
                          tags: draft.tags
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean),
                          extra: draft.extra,
                        })
                      }
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className={styles.metaField}>
                    <span className={styles.metaLabel}>제목</span>
                    <span className={styles.metaValue}>{meta.title}</span>
                  </div>
                  <div className={styles.metaField}>
                    <span className={styles.metaLabel}>{meta.descLabel}</span>
                    <span className={styles.metaDesc}>{meta.desc}</span>
                  </div>
                  <div className={styles.metaField} style={{ gap: 6 }}>
                    <span className={styles.metaLabel}>{meta.tagLabel}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {meta.tags.map((t) => (
                        <span key={t} className={styles.tagChip}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.metaExtraGrid}>
                    {meta.extra.map((x) => (
                      <div key={x.k} className={styles.metaField} style={{ gap: 3 }}>
                        <span className={styles.metaLabel}>{x.k}</span>
                        <span className={styles.metaExtraValue}>{x.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 채널별 배포 */}
            <div>
              <div className={styles.sectionTitle} style={{ marginBottom: 10 }}>
                채널별 배포
              </div>
              {clip.dists.length === 0 ? (
                <div className={styles.noDist}>
                  {flags.rendering
                    ? '렌더가 끝나면 배포할 수 있습니다.'
                    : flags.none
                      ? '아직 내보내지 않았습니다. 편집기에서 내보내기를 하면 배포할 수 있습니다.'
                      : '아직 어느 채널에도 배포하지 않았습니다.'}
                </div>
              ) : (
                <div className={styles.distList}>
                  {clip.dists.map((d) => {
                    const m = DIST_STYLE[d.status]
                    const failed = d.status === 'failed'
                    return (
                      <div key={d.ch} className={styles.distRow}>
                        <div className={styles.distTop}>
                          <span className={styles.distCh}>{d.ch}</span>
                          <span
                            className={styles.channelChip}
                            style={failed ? { color: 'hsl(var(--status-error))' } : undefined}
                          >
                            <span className={styles.channelDot} style={{ background: m.dot }} />
                            {m.label}
                          </span>
                          <span className={styles.distAt}>{d.at}</span>
                          {failed && (
                            <button
                              type="button"
                              className={styles.smallBtn}
                              style={{ marginLeft: 'auto' }}
                              onClick={() => onRetry(d.ch)}
                            >
                              다시 시도
                            </button>
                          )}
                        </div>
                        {failed && d.err && <div className={styles.distErr}>{d.err}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <CommentPanel
            highlightedCommentId={highlightedCommentId}
            versions={thread.versions}
            comments={thread.comments}
            filterV={filterV}
            onFilterV={onFilterV}
            onAddComment={onAddComment}
            onAddVersion={onAddVersion}
            onRestore={onRestore}
          />
        </div>

        <div className={styles.modalFoot}>
          <button type="button" className={styles.dangerBtn} onClick={onDelete}>
            삭제
          </button>
          <div className={styles.footRight}>
            <button type="button" className={styles.footBtn} onClick={onEdit}>
              편집
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!canDeploy}
              title={canDeploy ? undefined : '렌더가 끝나면 배포할 수 있습니다'}
              onClick={() => onSay(`배포 창 — ${clip.title} · 채널 · 예약 선택`)}
            >
              배포
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
