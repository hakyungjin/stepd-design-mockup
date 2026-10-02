/*
 * 프로그램 — 목록과 홈은 STEPD 본 저장소 화면을 그대로 따릅니다.
 *   목록: apps/web/src/app/(app)/programs/page.tsx
 *   홈  : apps/web/src/app/(app)/programs/[id]/page.tsx
 *
 * 설정만 우리 디자인입니다. 본 저장소 설정은 카드 10장(소개 · 방영 정보 ·
 * 편성·담당·권리 · 크레딧 · 분위기 태그 · 출연진 · 해외 배포 · 유튜브 재생목록 ·
 * 썸네일 엔진 · 기본 정보)인데, 여기서는 **네 묶음으로 줄인 축소 필드**를 씁니다.
 *
 * 본 저장소와 의도적으로 다른 점:
 *   - 포스터·썸네일은 생성된 SVG 플레이스홀더
 *   - 삭제의 window.confirm + prompt 2단 확인 → 인앱 모달(이름 입력은 그대로 요구)
 *   - 라우터를 모르는 화면이라 /programs/:id 이동이 view 상태 전환입니다
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ScreenKey } from '@/app/screens'
import { PageTopBar } from '@/layout/AppShell'
import { AnalysisRequest } from '@/features/analysis/AnalysisRequest'
import { Select } from '@/components/ui/Controls'
import { frameThumb, portraitThumb } from '@/lib/frames'
import {
  CLIPS,
  EPISODES,
  ME,
  PIPELINE_STAGE_LABELS,
  PLAYLISTS,
  PROGRAMS,
  SECTIONS,
  TARGET_AGES,
  TODAY,
  TRACK_LABEL,
  YT_CHANNELS,
  formOf,
  posterColor,
  posterTextColor,
  targetAgeLabel,
  thumbOf,
  type CastMember,
  type Clip,
  type Episode,
  type PipelineGenre,
  type Program,
  type ProgramForm,
  type ProgramStatus,
  type TargetAge,
} from './data'
import {
  ALL,
  EMPTY_PROGRAM_FILTERS,
  PROGRAM_STATUSES,
  PROGRAM_STATUS_LABEL,
  filterPrograms,
  residualCounts,
  rightsWindowOf,
  sectionsOf,
  statusNoteFor,
  type ProgramFilters,
} from './domain'
import styles from './ProgramsPage.module.css'

const TOAST_MS = 2400
/** 회차 카드는 5열 2행까지만 — 실데이터는 회차가 수십 개입니다 */
const EPISODE_TILES = 10
const MEDIA_TILES = 12

type View = 'list' | 'home' | 'settings'

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

export interface ProgramsPageProps {
  startView?: View
  onNavigate: (screen: ScreenKey) => void
}

export function ProgramsPage({ startView = 'list', onNavigate }: ProgramsPageProps) {
  const [programs, setPrograms] = useState<Program[]>(PROGRAMS)
  const [episodes, setEpisodes] = useState<Episode[]>(EPISODES)
  const [view, setView] = useState<View>(startView)
  const [curId, setCurId] = useState('camp')

  const [form, setForm] = useState<ProgramForm | null>(null)
  const [dirty, setDirty] = useState(false)
  const [ytAdd, setYtAdd] = useState<{ ch: string; pl: string } | null>(null)

  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [delText, setDelText] = useState('')
  const [photo, setPhoto] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const say = (text: string) => {
    if (timer.current) clearTimeout(timer.current)
    setToast(text)
    timer.current = setTimeout(() => setToast(''), TOAST_MS)
  }

  const current = programs.find((p) => p.id === curId) ?? null

  const openHome = (id?: string) => {
    if (id) setCurId(id)
    setView('home')
    setDeleting(false)
    window.scrollTo(0, 0)
  }

  const openSettings = (section?: string, program?: Program) => {
    const p = program ?? current
    if (!p) return
    setCurId(p.id)
    setForm(formOf(p))
    setDirty(false)
    setYtAdd(null)
    setDeleting(false)
    setDelText('')
    setView('settings')
    window.requestAnimationFrame(() => {
      if (section) document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' })
      else window.scrollTo(0, 0)
    })
  }

  const patch = (change: Partial<ProgramForm>) => {
    setForm((f) => (f ? { ...f, ...change } : f))
    setDirty(true)
  }

  const save = () => {
    if (!dirty || !form || !current) return
    setPrograms((list) =>
      list.map((p) =>
        p.id !== curId
          ? p
          : {
              ...p,
              title: form.title.trim() || p.title,
              section: form.section,
              owner: form.owner,
              targetAge: form.targetAge,
              status: form.status,
              schedule: form.schedule,
              firstAiredDate: form.firstAiredDate,
              endedDate: form.endedDate,
              rightsUntil: form.rightsUntil,
              lang: form.lang,
              hideKo: form.hideKo,
              yt: form.yt,
              pipelineGenre: form.pipelineGenre,
              intro: form.intro,
              prompt: form.prompt,
              cast: form.cast.filter((c) => c[0].trim()),
            },
      ),
    )
    setDirty(false)
    say('저장했습니다 — 출연자 · AI 설정은 다음 분석부터 반영됩니다')
  }

  const removeCurrent = () => {
    if (!current || delText.trim() !== current.title.trim()) return
    const { title, id } = current
    const rest = programs.filter((x) => x.id !== id)
    setPrograms(rest)
    setEpisodes((list) => list.filter((e) => e.programId !== id))
    setCurId(rest[0]?.id ?? '')
    setDeleting(false)
    setView('list')
    say(`"${title}" 을 삭제했습니다`)
    window.scrollTo(0, 0)
  }

  /* ------------------------------------------------------------------ */

  return (
    <>
      <PageTopBar title="프로그램" subtitle="편성·상태별 프로그램 목록" />

      <main className={styles.page}>
        {view === 'list' && (
          <ProgramList
            programs={programs}
            onOpen={openHome}
            onNew={() => setCreating(true)}
          />
        )}

        {view !== 'list' && current && (
          <button type="button" className={styles.backLink} onClick={() => { setView('list'); window.scrollTo(0, 0) }}>
            ← 프로그램 목록으로 돌아가기
          </button>
        )}

        {view === 'home' && current && (
          <ProgramHome
            program={current}
            episodes={episodes.filter((e) => e.programId === current.id)}
            clips={CLIPS}
            onSettings={openSettings}
            onNavigate={onNavigate}
            onAskDelete={() => { setDeleting(true); setDelText('') }}
            onSay={say}
          />
        )}

        {view === 'settings' && current && form && (
          <ProgramSettings
            program={current}
            form={form}
            dirty={dirty}
            onPatch={patch}
            onSave={save}
            onAskDelete={() => { setDeleting(true); setDelText('') }}
            ytAdd={ytAdd}
            onYtAdd={setYtAdd}
            onPhoto={setPhoto}
            onSay={say}
          />
        )}

        {view !== 'list' && !current && (
          <div className={styles.notFound}>
            <h2>프로그램을 찾을 수 없습니다</h2>
            <p>
              삭제됐거나 주소가 잘못됐습니다.{' '}
              <button type="button" className={styles.inlineLink} onClick={() => setView('list')}>
                프로그램 목록으로
              </button>
            </p>
          </div>
        )}
      </main>

      {creating && (
        <NewProgramModal
          onClose={() => setCreating(false)}
          onCreate={(draft) => {
            const id = `n${programs.length + 1}`
            const created: Program = {
              id,
              title: draft.title,
              status: 'upcoming',
              section: draft.section,
              owner: ME,
              targetAge: draft.targetAge,
              episodeCount: 0,
              hasPosterImage: false,
              hue: 180 + programs.length * 25,
              cast: draft.cast.map((name) => [name, '', ''] as CastMember),
              yt: [],
              lang: 'ko',
              hideKo: true,
              intro: '',
              prompt: '',
            }
            setPrograms((list) => [created, ...list])
            setCreating(false)
            say(`프로그램 생성됨 — ${created.title}`)
            openSettings(undefined, created)
          }}
        />
      )}

      {/* 되돌릴 수 없습니다 — 무엇이 함께 지워지는지 알리고 이름을 그대로 입력해야 실행됩니다 */}
      {deleting && current && (
        <div className={styles.modalScrim} onClick={() => setDeleting(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitleDanger}>프로그램 삭제</div>
            <div className={styles.modalBody}>
              {episodes.filter((e) => e.programId === current.id).length
                ? `회차 ${Math.max(current.episodeCount, episodes.filter((e) => e.programId === current.id).length)}개와 그에 딸린 미디어 · 추천 · 클립 · 원본 파일이 전부 함께 삭제됩니다.`
                : '이 프로그램에는 등록된 회차가 없습니다.'}{' '}
              되돌릴 수 없습니다. 이미 게시된 영상은 내려가지 않습니다.
            </div>
            <input
              className={styles.deleteInput}
              placeholder={`확인을 위해 "${current.title}" 입력`}
              value={delText}
              onChange={(e) => setDelText(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtn} onClick={() => setDeleting(false)}>
                취소
              </button>
              <button
                type="button"
                className={styles.modalBtnDanger}
                disabled={delText.trim() !== current.title.trim()}
                onClick={removeCurrent}
              >
                영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 출연자 사진 */}
      {photo != null && form?.cast[photo] && current && (
        <div className={styles.modalScrim} onClick={() => setPhoto(null)}>
          <div className={styles.photoModal} onClick={(e) => e.stopPropagation()}>
            <div
              className={styles.photoBig}
              style={{
                background: posterColor(current.hue + photo * 40),
                color: posterTextColor(current.hue + photo * 40),
              }}
            >
              {form.cast[photo][0] ? form.cast[photo][0][0] : '?'}
            </div>
            <div className={styles.photoBody}>
              <div className={styles.photoHead}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.photoName}>{form.cast[photo][0] || '이름 없음'}</div>
                  <div className={styles.photoSub}>
                    {[form.cast[photo][1] && `극중 ${form.cast[photo][1]}`, form.cast[photo][2]]
                      .filter(Boolean)
                      .join(' · ') || '등록된 사진'}
                  </div>
                </div>
                <div className={styles.photoNav}>
                  <button type="button" className={styles.photoNavBtn} aria-label="이전" onClick={() => setPhoto((i) => (i! - 1 + form.cast.length) % form.cast.length)}>‹</button>
                  <span className={styles.photoPos}>{photo + 1} / {form.cast.length}</span>
                  <button type="button" className={styles.photoNavBtn} aria-label="다음" onClick={() => setPhoto((i) => (i! + 1) % form.cast.length)}>›</button>
                </div>
              </div>
              <div className={styles.photoActions}>
                <button type="button" className={styles.photoBtn} onClick={() => say('이미지 선택 창이 열립니다')}>사진 교체</button>
                <button type="button" className={styles.photoBtn} onClick={() => say('사진을 제거합니다 — 저장하면 반영됩니다')}>사진 제거</button>
                <button type="button" className={styles.photoBtnPrimary} onClick={() => setPhoto(null)}>닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  )
}

/* ================================================================== *
 * 목록 — 본 저장소 programs/page.tsx
 * ================================================================== */

function ProgramList({
  programs,
  onOpen,
  onNew,
}: {
  programs: Program[]
  onOpen: (id: string) => void
  onNew: () => void
}) {
  const [f, setF] = useState<ProgramFilters>(EMPTY_PROGRAM_FILTERS)
  const set = (change: Partial<ProgramFilters>) => setF((prev) => ({ ...prev, ...change }))

  const sections = useMemo(() => sectionsOf(programs), [programs])
  const counts = useMemo(() => residualCounts(programs, f, ME), [programs, f])
  const visible = useMemo(() => filterPrograms(programs, f, ME), [programs, f])

  const note = statusNoteFor(f.status)

  return (
    <div className={styles.stack}>
      <div className={styles.filterBar}>
        <div className={styles.filterLeft}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="프로그램명 · 담당 PD로 찾기"
            aria-label="프로그램 검색"
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
          />

          <span className={styles.divider} aria-hidden />

          <div className={styles.pillGroup}>
            <button type="button" className={cx(styles.chip, f.status === ALL && styles.chipOn)} aria-pressed={f.status === ALL} onClick={() => set({ status: ALL })}>
              전체 {counts.status[ALL] ?? 0}
            </button>
            {PROGRAM_STATUSES.map((s) => (
              <button key={s} type="button" className={cx(styles.chip, f.status === s && styles.chipOn)} aria-pressed={f.status === s} onClick={() => set({ status: s })}>
                {PROGRAM_STATUS_LABEL[s]} {counts.status[s] ?? 0}
              </button>
            ))}
          </div>

          <span className={styles.divider} aria-hidden />

          {/* 섹션 칩은 데이터에서 뽑습니다 — 3개가 넘으면 줄바꿈 */}
          <div className={cx(styles.pillGroup, sections.length > 3 && styles.pillGroupWrap)}>
            <button type="button" className={cx(styles.chip, f.section === ALL && styles.chipOn)} aria-pressed={f.section === ALL} onClick={() => set({ section: ALL })}>
              전 섹션 {counts.section[ALL] ?? 0}
            </button>
            {sections.map((s) => (
              <button key={s} type="button" className={cx(styles.chip, f.section === s && styles.chipOn)} aria-pressed={f.section === s} onClick={() => set({ section: s })}>
                {s} {counts.section[s] ?? 0}
              </button>
            ))}
          </div>

          <span className={styles.divider} aria-hidden />

          <div className={styles.pillGroup}>
            <button type="button" className={cx(styles.chip, f.mineOnly && styles.chipOn)} aria-pressed={f.mineOnly} onClick={() => set({ mineOnly: !f.mineOnly })}>
              내 담당만 {counts.mine}
            </button>
          </div>
        </div>

        <div className={styles.filterRight}>
          <span className={styles.summary}>{summaryOf(visible)}</span>
          <span className={styles.divider} aria-hidden />
          <button type="button" className={styles.newBtn} onClick={onNew}>
            <PlusIcon />
            <span>새 프로그램</span>
          </button>
        </div>
      </div>

      {note && <div className={styles.noteCard}>{note}</div>}

      {visible.length === 0 ? (
        <div className={styles.emptyBox}>
          {programs.length === 0
            ? '등록된 프로그램이 없습니다 — 오른쪽 위 ‘＋ 새 프로그램’으로 시작하세요'
            : '조건에 맞는 프로그램이 없습니다'}
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {visible.map((p) => (
            <ProgramCard key={p.id} program={p} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

interface CardTag {
  label: string
  tone: 'airing' | 'default'
}

function ProgramCard({
  program,
  onOpen,
}: {
  program: Program
  onOpen: (id: string) => void
}) {
  const track = program.pipelineGenre ? TRACK_LABEL[program.pipelineGenre] : '분석 트랙 미지정'

  /* 권리 만료는 목록 카드에 적지 않습니다 — 설정과 종영 배너에서 봅니다 */
  const tags: CardTag[] = [
    { label: PROGRAM_STATUS_LABEL[program.status], tone: program.status === 'airing' ? 'airing' : 'default' },
    { label: program.section, tone: 'default' },
    { label: track, tone: 'default' },
  ]

  return (
    <button type="button" className={styles.programCard} onClick={() => onOpen(program.id)}>
      <span className={styles.cardPoster} style={program.hasPosterImage ? { background: posterColor(program.hue) } : undefined}>
        {!program.hasPosterImage && '포스터 이미지'}
      </span>

      <span className={styles.cardBody}>
        <span className={styles.cardTop}>
          <span className={styles.cardTitle}>{program.title}</span>
          <span className={styles.tagRow}>
            {tags.map((t, i) => (
              <span key={i} className={cx(styles.tag, t.tone === 'airing' && styles.tagAiring)}>
                {t.label}
              </span>
            ))}
          </span>
        </span>
      </span>
    </button>
  )
}

function summaryOf(visible: Program[]): string {
  const by = (s: ProgramStatus) => visible.filter((p) => p.status === s).length
  return `${visible.length}개 · 방영 중 ${by('airing')} · 종영 ${by('ended')} · 편성 예정 ${by('upcoming')}`
}

/* ---------------- 새 프로그램 ---------------- */

function NewProgramModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (draft: { title: string; section: string; targetAge: TargetAge; cast: string[] }) => void
}) {
  const [title, setTitle] = useState('')
  const [section, setSection] = useState(SECTIONS[0])
  const [age, setAge] = useState<TargetAge>(0)
  const [castInput, setCastInput] = useState('')

  const submit = () => {
    const t = title.trim()
    if (!t) return
    onCreate({
      title: t,
      section,
      targetAge: age,
      cast: castInput.split(',').map((s) => s.trim()).filter(Boolean),
    })
  }

  return (
    <div className={styles.modalScrim} onClick={onClose}>
      <div className={cx(styles.modal, styles.modalWide)} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>새 프로그램</div>
          <button type="button" className={styles.modalClose} aria-label="닫기" onClick={onClose}>×</button>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>프로그램 제목 <em className={styles.required}>*</em></span>
          <input className={styles.input} placeholder="예: 전지적 참견 시점" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>장르 <em className={styles.required}>*</em></span>
            <Select value={section} onChange={(e) => setSection(e.target.value)} aria-label="장르">
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>시청 등급 <em className={styles.required}>*</em></span>
            <Select value={age} onChange={(e) => setAge(Number(e.target.value) as TargetAge)} aria-label="시청 등급">
              {TARGET_AGES.map((a) => <option key={a} value={a}>{targetAgeLabel(a)}</option>)}
            </Select>
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            출연자 <span className={styles.fieldHint}>(쉼표로 구분 · 선택)</span>
          </span>
          <input className={styles.input} placeholder="예: 이영자, 홍현희" value={castInput} onChange={(e) => setCastInput(e.target.value)} />
        </label>

        <p className={styles.modalNote}>포스터·프로그램 썸네일 이미지는 프로그램 생성 후 등록합니다.</p>

        <div className={cx(styles.modalActions, styles.modalActionsRuled)}>
          <button type="button" className={styles.modalBtn} onClick={onClose}>취소</button>
          <button type="button" className={styles.modalBtnPrimary} disabled={!title.trim()} onClick={submit}>만들기</button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== *
 * 홈 — 본 저장소 programs/[id]/page.tsx. **읽는 화면**입니다(편집은 설정).
 * ================================================================== */

function ProgramHome({
  program: p,
  episodes,
  clips,
  onSettings,
  onNavigate,
  onAskDelete,
  onSay,
}: {
  program: Program
  episodes: Episode[]
  clips: Clip[]
  onSettings: (section?: string) => void
  onNavigate: (screen: ScreenKey) => void
  onAskDelete: () => void
  onSay: (text: string) => void
}) {
  const eps = useMemo(
    () => episodes.slice().sort((a, b) => b.episodeNumber - a.episodeNumber),
    [episodes],
  )
  const epIds = useMemo(() => new Set(eps.map((e) => e.id)), [eps])
  const programClips = useMemo(() => clips.filter((c) => epIds.has(c.episodeId)), [clips, epIds])

  const rights = rightsWindowOf(p, TODAY)
  const published = programClips.filter((c) => c.published).length
  /** 영상 분석 요청 창 — 영상 분석 화면과 같은 것을 띄웁니다 */
  const [analyzing, setAnalyzing] = useState(false)

  return (
    <div className={styles.stack}>
      {analyzing && (
        <AnalysisRequest program={p.title} onClose={() => setAnalyzing(false)} onDone={onSay} />
      )}
      <div className={styles.homeHead}>
        <div className={styles.homeIdentity}>
          {/* 로고 아바타 — 포스터가 있으면 그걸 씁니다 */}
          <div className={styles.homeLogo} style={p.hasPosterImage ? { background: posterColor(p.hue) } : undefined}>
            {!p.hasPosterImage && <>프로그램<br />로고</>}
          </div>

          <div className={styles.homeMeta}>
            <h2 className={styles.homeTitle}>{p.title}</h2>
            <div className={styles.homeSched}>{scheduleLine(p) || '편성 정보가 등록되지 않았습니다.'}</div>

            <div className={styles.homePills}>
              {/* 체크 표시는 방영 중일 때만 */}
              {p.status === 'airing' ? (
                <span className={cx(styles.pill, styles.pillOk)}><CheckIcon /><span>{PROGRAM_STATUS_LABEL.airing}</span></span>
              ) : (
                <span className={styles.pill}>{PROGRAM_STATUS_LABEL[p.status]}</span>
              )}
              <span className={styles.pill}>{p.section}</span>
              <span className={styles.pill}>{p.pipelineGenre ? TRACK_LABEL[p.pipelineGenre] : '분석 트랙 미지정'}</span>
              <span className={styles.pill}>출연자 {p.cast.length}명 등록</span>
              <span className={styles.pill}>담당 {p.owner?.trim() || '미지정'}</span>
              {rights && <span className={cx(styles.pill, rights.expiring && styles.pillDanger)}>{rights.text}</span>}
            </div>
          </div>
        </div>

        <div className={styles.homeActions}>
          <button type="button" className={styles.outlineBtn} onClick={() => onSettings()}>
            <GearIcon /><span>프로그램 설정</span>
          </button>
          {/* 회차 · 미디어 · 추천 · 클립 · 원본 파일이 함께 지워집니다 — 2단 확인 */}
          <button type="button" className={styles.dangerBtn} title="이 프로그램과 하위 회차·클립을 완전히 삭제 (되돌릴 수 없음)" onClick={onAskDelete}>
            <TrashIcon /><span>프로그램 삭제</span>
          </button>
        </div>
      </div>

      {/* 편성 예정은 숫자를 아예 안 그립니다 — 0 세 개는 "고장" 으로 읽힙니다 */}
      {p.status !== 'upcoming' && (
        <div className={styles.summaryGrid}>
          <SummaryCard icon={<ListIcon />} label="회차" value={Math.max(p.episodeCount, eps.length)} />
          <SummaryCard icon={<FilmIcon />} label="미디어" value={programClips.length} />
          <SummaryCard icon={<ShareIcon />} label="배포됨" value={published} />
        </div>
      )}

      {p.status === 'airing' && <AiringBar episodes={eps} onOpenEpisode={() => onNavigate('analysis')} />}
      {p.status === 'ended' && <EndedBar program={p} rights={rights} onFind={() => onNavigate('search')} />}
      {p.status === 'upcoming' && <UpcomingEmpty onUpload={() => setAnalyzing(true)} />}

      {p.status !== 'upcoming' && (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionHeading}>회차</h3>
            <div className={styles.sectionHeadRight}>
              <button type="button" className={styles.sectionBtn} onClick={() => onNavigate('analysis')}>
                <span>전체 보기</span><ChevronIcon />
              </button>
              {/* 영상 분석 화면으로 보내지 않고 거기서 쓰는 요청 창을 그대로 띄웁니다 */}
              <button type="button" className={styles.uploadBtn} onClick={() => setAnalyzing(true)}>
                <UploadIcon /><span>영상 분석</span>
              </button>
            </div>
          </div>

          {eps.length > 0 ? (
            <div className={styles.tileGrid5}>
              {eps.slice(0, EPISODE_TILES).map((e) => (
                <EpisodeCard key={e.id} episode={e} onOpen={() => onNavigate('analysis')} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyRow}>아직 회차 원본이 없습니다 — ‘영상 분석’으로 시작하세요</div>
          )}
        </section>
      )}

      {p.status !== 'upcoming' && (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionHeadLeft}>
              <h3 className={styles.sectionHeading}>미디어</h3>
              <span className={styles.sectionHint}>추천 구간에서 채택한 것만 여기 올라옵니다</span>
            </div>
            <button type="button" className={styles.sectionBtn} onClick={() => onNavigate('media')}>
              <span>미디어에서 보기</span><ChevronIcon />
            </button>
          </div>

          {programClips.length > 0 ? (
            <div className={styles.tileGrid6}>
              {programClips.slice(0, MEDIA_TILES).map((c) => (
                <MediaCard key={c.id} clip={c} onOpen={() => onNavigate('editor-short')} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyRow}>
              {eps.length === 0
                ? '회차 원본이 올라가면 분석 후 추천 구간이 생깁니다'
                : '채택한 구간이 아직 없습니다 — 영상 분석에서 구간을 채택하면 여기 나타납니다'}
            </div>
          )}
        </section>
      )}

      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadLeft}>
            <h3 className={styles.sectionHeading}>출연자</h3>
            <span className={styles.sectionHint}>사람이 등록한 명단이 기준입니다 — 자동 인식은 참고용 표시만 합니다</span>
          </div>
          <button type="button" className={styles.sectionBtn} onClick={() => onSettings('sec-cast')}>
            <span>출연자 관리</span><ChevronIcon />
          </button>
        </div>

        {p.cast.length > 0 ? (
          <div className={styles.castRow}>
            {p.cast.map(([name], i) => (
              <div key={name || i} className={styles.castItem}>
                <span
                  className={styles.castPhoto}
                  style={{ background: posterColor(p.hue + i * 40), color: posterTextColor(p.hue + i * 40) }}
                >
                  {name ? name[0] : '?'}
                </span>
                <span className={styles.castName}>{name || '이름 없음'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyRow}>등록된 출연자가 없습니다. 프로그램 설정에서 등록하세요.</div>
        )}
      </section>
    </div>
  )
}

/** 헤더 아래 편성 한 줄 — 상태에 따라 쓸모 있는 정보가 다릅니다 */
function scheduleLine(p: Program): string {
  const parts: string[] = []
  if (p.status === 'ended' && p.endedDate) parts.push(`${p.endedDate} 종영`)
  else if (p.status === 'upcoming' && p.firstAiredDate) parts.push(`${p.firstAiredDate} 첫 방송 예정`)
  else if (p.schedule) parts.push(p.schedule)

  if (p.broadcaster) parts.push(p.broadcaster)
  if (p.status === 'airing' && p.currentInfo) parts.push(p.currentInfo)
  return parts.join(' · ')
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className={styles.summaryCard}>
      <span className={styles.summaryIcon}>{icon}</span>
      <div className={styles.summaryRow}>
        <h4 className={styles.summaryLabel}>{label}</h4>
        <span className={styles.summaryValue}>{value}</span>
      </div>
    </div>
  )
}

/** 방영 중 — 분석이 도는 회차로 들어가는 줄. 진행률은 서버 값 그대로 */
function AiringBar({ episodes, onOpenEpisode }: { episodes: Episode[]; onOpenEpisode: () => void }) {
  const running = episodes.find((e) => e.pipeline?.stageStatus === 'progress')
  const target = running ?? episodes[0]

  if (!target) {
    return (
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <span className={cx(styles.pill, styles.pillOk)}><CheckIcon /><span>진행 중</span></span>
          <strong className={styles.bannerText}>아직 올라온 회차가 없습니다.</strong>
        </div>
      </div>
    )
  }

  const pct = running ? Math.min(97, Math.round(running.pipeline!.progress)) : null

  return (
    <div className={styles.banner}>
      <div className={styles.bannerLeft}>
        <span className={cx(styles.pill, styles.pillOk)}><CheckIcon /><span>진행 중</span></span>
        <strong className={styles.bannerText}>
          회차 {target.episodeNumber}
          {running ? ` - ${PIPELINE_STAGE_LABELS[running.pipeline!.stage]} 중` : ' - 대기 중인 작업 없음'}
        </strong>
        {running?.pipeline?.note && <span className={styles.bannerNote}>{running.pipeline.note}</span>}
      </div>
      <div className={styles.bannerRight}>
        {pct !== null && (
          <>
            <span className={styles.barTrack}><span className={styles.bar} style={{ width: `${Math.max(2, pct)}%` }} /></span>
            <span className={styles.barPct}>{pct}%</span>
          </>
        )}
        <button type="button" className={styles.sectionBtn} onClick={onOpenEpisode}>회차 열기</button>
      </div>
    </div>
  )
}

/** 종영 — 새 회차가 없습니다. 아카이브 재활용이 유일한 경로입니다 */
function EndedBar({
  program,
  rights,
  onFind,
}: {
  program: Program
  rights: ReturnType<typeof rightsWindowOf>
  onFind: () => void
}) {
  return (
    <div className={styles.banner}>
      <div className={styles.bannerLeft}>
        <span className={styles.pill}>종영</span>
        <strong className={styles.bannerText}>
          {program.endedDate ? `${program.endedDate} 종영 — ` : ''}
          새 회차가 들어오지 않습니다. 기존 회차 재활용과 권리 만료일만 관리합니다.
        </strong>
        {rights && <span className={cx(styles.pill, rights.expiring && styles.pillDanger)}>{rights.text}</span>}
      </div>
      <button type="button" className={styles.sectionBtn} title="검색 화면에서 프로그램을 직접 선택하세요" onClick={onFind}>
        아카이브에서 장면 찾기
      </button>
    </div>
  )
}

/** 편성 예정 — 첫 방송 전. 회차도 지표도 없는 게 정상이라고 말해 줍니다 */
function UpcomingEmpty({ onUpload }: { onUpload: () => void }) {
  return (
    <div className={styles.upcoming}>
      <span className={styles.upcomingMark} aria-hidden />
      <div className={styles.upcomingTitle}>첫 방송 전 · 분석할 회차가 없습니다</div>
      <p className={styles.upcomingNote}>
        파일럿이나 선공개 영상이 있다면 지금 올려 두면 됩니다. 업로드는 분석 대기열에 들어갑니다.
      </p>
      {/* 회차 섹션과 같은 요청 창을 띄웁니다 */}
      <button type="button" className={styles.uploadBtn} onClick={onUpload}>
        <UploadIcon /><span>영상 업로드</span>
      </button>
    </div>
  )
}

/** 회차 카드 — 배지는 상태별로 갈립니다(실패를 '추천' 으로 뭉뚱그리지 않습니다) */
function EpisodeCard({ episode, onOpen }: { episode: Episode; onOpen: () => void }) {
  const st = episode.pipeline?.stageStatus
  return (
    <button type="button" className={styles.tile} onClick={onOpen}>
      <span className={styles.tileThumb} style={{ backgroundImage: `url("${frameThumb(thumbOf(episode.id))}")` }} />
      <span className={styles.tileBody}>
        <span className={styles.tileTop}>
          <span className={styles.tileTitleRow}>
            <strong className={styles.tileTitle}>회차 {episode.episodeNumber}</strong>
            <span className={cx(styles.badge, st === 'error' && styles.badgeError, st === 'progress' && styles.badgeProgress)}>
              {stageLabel(episode)}
            </span>
          </span>
          <span className={styles.tileSub}>{episode.broadDate || '방영일 미등록'}</span>
        </span>
        <span className={styles.tileGo}><ArrowIcon /></span>
      </span>
    </button>
  )
}

function stageLabel(e: Episode): string {
  const p = e.pipeline
  if (!p) return '분석 대기'
  const label = PIPELINE_STAGE_LABELS[p.stage] ?? p.stage
  if (p.stageStatus === 'progress') return `${label} 중`
  if (p.stageStatus === 'error') return `${label} 실패`
  if (p.stageStatus === 'idle') return '분석 대기'
  return label
}

/** 미디어 카드 — 누르면 편집기로 갑니다 */
function MediaCard({ clip, onOpen }: { clip: Clip; onOpen: () => void }) {
  const shortForm = clip.aspectRatio.startsWith('9:16')
  const frame = thumbOf(clip.id)
  return (
    <button type="button" className={styles.tile} onClick={onOpen}>
      <span className={styles.tileThumb}>
        <span
          className={shortForm ? styles.tileThumbPortrait : styles.tileThumbFull}
          style={{ backgroundImage: `url("${shortForm ? portraitThumb(frame) : frameThumb(frame)}")` }}
        />
      </span>
      <span className={styles.tileBody}>
        <strong className={styles.tileClipTitle}>{clip.title}</strong>
        <span className={styles.tileTags}>
          <span className={styles.badge}>{shortForm ? '숏폼' : '클립'}</span>
          <span className={styles.badge}>{Math.round(clip.durationSec)}초</span>
        </span>
      </span>
    </button>
  )
}

/* ================================================================== *
 * 설정 — 우리 디자인(축소 필드). 본 저장소 카드 10장을 네 묶음으로 줄였습니다.
 * ================================================================== */

function ProgramSettings({
  program: p,
  form: f,
  dirty,
  onPatch,
  onSave,
  onAskDelete,
  ytAdd,
  onYtAdd,
  onPhoto,
  onSay,
}: {
  program: Program
  form: ProgramForm
  dirty: boolean
  onPatch: (change: Partial<ProgramForm>) => void
  onSave: () => void
  onAskDelete: () => void
  ytAdd: { ch: string; pl: string } | null
  onYtAdd: (v: { ch: string; pl: string } | null) => void
  onPhoto: (i: number) => void
  onSay: (text: string) => void
}) {
  const setCast = (i: number, j: 0 | 1 | 2, value: string) =>
    onPatch({
      cast: f.cast.map((c, k) => (k === i ? (c.map((x, m) => (m === j ? value : x)) as CastMember) : c)),
    })

  const playlistOptions = ytAdd?.ch
    ? (PLAYLISTS[ytAdd.ch] ?? []).filter((o) => !f.yt.some(([c, x]) => c === ytAdd.ch && x === o))
    : []
  const canAddPlaylist = !!(ytAdd?.ch && ytAdd?.pl)

  return (
    <div className={styles.stack}>
      {/* 머리글 — 홈과 같은 자리·같은 모양. 저장은 스크롤해도 따라옵니다 */}
      <div className={styles.settingsHead}>
        <div className={styles.homeIdentity}>
          <div className={styles.homeLogo} style={p.hasPosterImage ? { background: posterColor(p.hue) } : undefined}>
            {!p.hasPosterImage && <>프로그램<br />로고</>}
          </div>
          <div className={styles.homeMeta}>
            <h2 className={styles.homeTitle}>{f.title.trim() || p.title}</h2>
            <div className={styles.homeSched}>프로그램 설정 — 출연자 · AI 설정은 다음 분석부터 반영됩니다</div>
          </div>
        </div>

        <div className={styles.homeActions}>
          <button type="button" className={styles.dangerBtn} title="이 프로그램과 하위 회차·클립을 완전히 삭제 (되돌릴 수 없음)" onClick={onAskDelete}>
            <TrashIcon /><span>프로그램 삭제</span>
          </button>
          <button type="button" className={cx(styles.saveBtn, dirty ? styles.saveBtnOn : styles.saveBtnOff)} onClick={onSave}>
            {dirty ? '변경사항 저장' : '저장됨'}
          </button>
        </div>
      </div>

      <div className={styles.settingsGrid}>
        <div className={styles.settingsCol}>
          {/* ---------------- 기본 정보 ---------------- */}
          <section id="sec-basic" className={styles.settingsCard}>
            <div className={styles.cardTitle2}>기본 정보</div>

            <div className={styles.posterRow}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>포스터</span>
                <button type="button" className={styles.posterBox} style={{ background: posterColor(p.hue) }} onClick={() => onSay('이미지 선택 창이 열립니다')}>
                  클릭해 교체
                </button>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>쇼츠 아이콘</span>
                <button type="button" className={styles.iconBox} style={{ background: posterColor(p.hue), color: posterTextColor(p.hue) }} onClick={() => onSay('이미지 선택 창이 열립니다')}>
                  {p.title[0]}
                </button>
              </div>
              <div className={styles.posterNote}>아이콘은 자동 렌더된 숏폼 하단, 프로그램명 옆에 들어갑니다.</div>
            </div>

            <div className={styles.formGrid}>
              <label className={cx(styles.field, styles.formGridFull)}>
                <span className={styles.fieldLabel}>프로그램 이름</span>
                <input className={styles.input} value={f.title} onChange={(e) => onPatch({ title: e.target.value })} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>섹션</span>
                <Select value={f.section} onChange={(e) => onPatch({ section: e.target.value })}>
                  {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>담당 PD</span>
                <input className={styles.input} value={f.owner} onChange={(e) => onPatch({ owner: e.target.value })} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>시청 등급</span>
                <Select value={f.targetAge} onChange={(e) => onPatch({ targetAge: Number(e.target.value) as TargetAge })}>
                  {TARGET_AGES.map((a) => <option key={a} value={a}>{targetAgeLabel(a)}</option>)}
                </Select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  권리 만료일 <span className={styles.fieldHint}>경고만 — 배포가 자동으로 막히지는 않습니다</span>
                </span>
                <input type="date" className={styles.input} value={f.rightsUntil} onChange={(e) => onPatch({ rightsUntil: e.target.value })} />
              </label>

              <div className={cx(styles.field, styles.formGridFull)}>
                <span className={styles.fieldLabel}>편성 상태</span>
                <div className={styles.segment}>
                  {PROGRAM_STATUSES.map((k) => (
                    <button key={k} type="button" className={cx(styles.seg, f.status === k && styles.segOn)} onClick={() => onPatch({ status: k })}>
                      {PROGRAM_STATUS_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>

              {f.status === 'airing' && (
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>편성</span>
                  <input className={styles.input} placeholder="예: 매주 토 오후 7:40" value={f.schedule} onChange={(e) => onPatch({ schedule: e.target.value })} />
                </label>
              )}
              {f.status === 'upcoming' && (
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>첫 방송일</span>
                  <input type="date" className={styles.input} value={f.firstAiredDate} onChange={(e) => onPatch({ firstAiredDate: e.target.value })} />
                </label>
              )}
              {f.status === 'ended' && (
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>종영일</span>
                  <input type="date" className={styles.input} value={f.endedDate} onChange={(e) => onPatch({ endedDate: e.target.value })} />
                </label>
              )}
            </div>
          </section>

          {/* ---------------- 출연자 ---------------- */}
          <section id="sec-cast" className={cx(styles.settingsCard, styles.settingsCardTight)}>
            <div className={styles.castHead}>
              <div>
                <div className={styles.cardTitle2}>출연자</div>
                <div className={styles.cardNote}>인물 라벨링과 추천 제목에 쓰입니다. 다음 분석부터 반영됩니다.</div>
              </div>
              <button
                type="button"
                className={styles.smallBtn}
                onClick={() => {
                  onPatch({ cast: [...f.cast, ['인물 A', '', ''], ['인물 B', '', '']] })
                  onSay('최근 분석에서 얼굴 2명을 찾았습니다 — 이름을 확인하세요')
                }}
              >
                최근 분석에서 가져오기
              </button>
            </div>

            <div className={styles.castHeadRow}>
              <span />
              <span>이름</span>
              <span>극중 이름 <span className={styles.fieldHint}>선택</span></span>
              <span>영어 표기 <span className={styles.fieldHint}>해외 배포용</span></span>
              <span />
            </div>

            {f.cast.map((c, i) => (
              <div key={i} className={styles.castGrid}>
                <button
                  type="button"
                  className={styles.castAvatarBtn}
                  title="사진 크게 보기"
                  style={{ background: posterColor(p.hue + i * 40), color: posterTextColor(p.hue + i * 40) }}
                  onClick={() => onPhoto(i)}
                >
                  {c[0] ? c[0][0] : '+'}
                </button>
                <input className={cx(styles.input, styles.inputSm)} placeholder="이름" value={c[0]} onChange={(e) => setCast(i, 0, e.target.value)} />
                <input className={cx(styles.input, styles.inputSm)} placeholder="—" value={c[1]} onChange={(e) => setCast(i, 1, e.target.value)} />
                <input className={cx(styles.input, styles.inputSm)} placeholder="비우면 자동" value={c[2]} onChange={(e) => setCast(i, 2, e.target.value)} />
                <button type="button" className={styles.iconBtn} aria-label="삭제" onClick={() => onPatch({ cast: f.cast.filter((_, k) => k !== i) })}>×</button>
              </div>
            ))}

            <button type="button" className={styles.addCastBtn} onClick={() => onPatch({ cast: [...f.cast, ['', '', '']] })}>
              + 출연자 추가
            </button>
          </section>
        </div>

        <div className={styles.settingsCol}>
          {/* ---------------- 배포 기본값 ---------------- */}
          <section id="sec-dist" className={styles.settingsCard}>
            <div>
              <div className={styles.cardTitle2}>배포 기본값</div>
              <div className={styles.cardNote}>
                이 프로그램 영상이 나갈 때마다 자동으로 붙습니다. 자동 배포 계획에서 채널별로 덮어쓸 수 있습니다.
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>자막 · 메타데이터 언어</span>
                <Select value={f.lang} onChange={(e) => onPatch({ lang: e.target.value })}>
                  <option value="ko">한국어</option>
                  <option value="en">영어</option>
                  <option value="ja">일본어</option>
                  <option value="zh">중국어 (간체)</option>
                </Select>
              </label>
              {f.lang !== 'ko' && (
                <label className={styles.checkboxRow}>
                  <input type="checkbox" className={styles.nativeCheckbox} checked={f.hideKo} onChange={() => onPatch({ hideKo: !f.hideKo })} />
                  원본에 구운 한국어 자막 가리기
                </label>
              )}
            </div>

            <div className={styles.ytBlock}>
              <div className={styles.ytBlockHead}>
                <span className={styles.blockLabel}>
                  YouTube 재생목록 <span className={styles.blockHint}>발행된 영상이 자동으로 담깁니다</span>
                </span>
                {!ytAdd && (
                  <button type="button" className={styles.smallBtn} onClick={() => onYtAdd({ ch: '', pl: '' })}>+ 추가</button>
                )}
              </div>

              {f.yt.length === 0 && !ytAdd && <div className={styles.ytEmpty}>추가한 재생목록이 없습니다.</div>}

              {f.yt.map(([channel, playlist], i) => (
                <div key={`${channel}-${playlist}`} className={styles.ytRow}>
                  <span className={styles.ytDot} />
                  <span className={styles.ytChannel}>{channel}</span>
                  <span className={styles.ytSep}>›</span>
                  <span className={styles.ytPlaylist}>{playlist}</span>
                  <button type="button" className={styles.iconBtn} aria-label="삭제" onClick={() => onPatch({ yt: f.yt.filter((_, k) => k !== i) })}>×</button>
                </div>
              ))}

              {ytAdd && (
                <div className={styles.ytAddBox}>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>채널</span>
                      <Select value={ytAdd.ch} onChange={(e) => onYtAdd({ ch: e.target.value, pl: '' })}>
                        <option value="">채널 선택</option>
                        {YT_CHANNELS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>재생목록</span>
                      <Select value={ytAdd.pl} disabled={!ytAdd.ch} onChange={(e) => onYtAdd({ ...ytAdd, pl: e.target.value })}>
                        <option value="">
                          {!ytAdd.ch ? '채널을 먼저 선택' : playlistOptions.length ? '재생목록 선택' : '추가할 재생목록 없음'}
                        </option>
                        {playlistOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </label>
                  </div>
                  <div className={styles.modalActions}>
                    <button type="button" className={styles.modalBtn} onClick={() => onYtAdd(null)}>취소</button>
                    <button
                      type="button"
                      className={styles.modalBtnPrimary}
                      disabled={!canAddPlaylist}
                      onClick={() => {
                        if (!canAddPlaylist) return
                        onPatch({ yt: [...f.yt, [ytAdd.ch, ytAdd.pl]] })
                        onYtAdd(null)
                      }}
                    >
                      추가
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ---------------- AI 분석 ---------------- */}
          <section id="sec-ai" className={styles.settingsCard}>
            <div>
              <div className={styles.cardTitle2}>AI 분석</div>
              <div className={styles.cardNote}>추천 구간과 제목을 만드는 방식입니다. 비워 두면 기본값으로 동작합니다.</div>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>구간을 나누는 기준</span>
              <div className={styles.trackRow}>
                {(
                  [
                    ['variety', '코너 단위', '예능 · 교양 — 코너와 리액션 중심으로 자릅니다'],
                    ['drama', '서사 단위', '드라마 — 장면의 시작과 끝을 지켜 자릅니다'],
                  ] as Array<[PipelineGenre, string, string]>
                ).map(([k, label, sub]) => (
                  <button key={k} type="button" className={cx(styles.trackBtn, f.pipelineGenre === k && styles.trackBtnOn)} onClick={() => onPatch({ pipelineGenre: k })}>
                    <span className={styles.trackLabel}>{label}</span>
                    <span className={styles.trackSub}>{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>프로그램 소개 <span className={styles.fieldHint}>한두 문장</span></span>
              <textarea
                className={styles.textarea}
                rows={2}
                placeholder="예: 연예인들이 매주 다른 캠핑장에서 1박 2일을 보내는 리얼리티."
                value={f.intro}
                onChange={(e) => onPatch({ intro: e.target.value })}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>추가 지시 <span className={styles.fieldHint}>이 프로그램에만 적용</span></span>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="예: 제목에 출연자 이름을 앞에 넣고, 물음표로 끝내지 마세요."
                value={f.prompt}
                onChange={(e) => onPatch({ prompt: e.target.value })}
              />
            </label>
          </section>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== *
 * 아이콘 — 본 저장소는 lucide 를 씁니다. 목업은 의존성 없이 같은 모양만 그립니다.
 * ================================================================== */

const svg = (d: string, size = 14) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const PlusIcon = () => svg('M12 5v14M5 12h14')
const CheckIcon = () => svg('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6', 12)
const GearIcon = () => svg('M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4')
const TrashIcon = () => svg('M4 7h16M9 7V4h6v3m-7 0 1 13h6l1-13')
const UploadIcon = () => svg('M12 16V4m-4 4 4-4 4 4M4 17v3h16v-3')
const ChevronIcon = () => svg('m9 6 6 6-6 6')
const ArrowIcon = () => svg('M5 12h14m-6-6 6 6-6 6')
const ListIcon = () => svg('M4 6h10M4 12h10M4 18h10m4-9 4 3-4 3V9Z', 22)
const FilmIcon = () => svg('M4 5h16v14H4V5Zm0 5h16M4 15h16M9 5v14m6-14v14', 22)
const ShareIcon = () => svg('M12 4v12m-4-8 4-4 4 4M5 14v6h14v-6', 22)
