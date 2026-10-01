import { useEffect, useRef, useState } from 'react'
import type { ScreenKey } from '@/app/screens'
import { Select } from '@/components/ui/Controls'
import {
  GENRES,
  MEDIA_TITLES,
  ME,
  PLAYLISTS,
  PROGRAMS,
  STATUS_STYLE,
  YT_CHANNELS,
  daysUntil,
  formOf,
  mediaFrameColor,
  mediaThumbColor,
  monthDay,
  parseDate,
  posterColor,
  posterTextColor,
  type CastMember,
  type Program,
  type ProgramForm,
  type ProgramStatus,
} from './data'
import styles from './ProgramsPage.module.css'

const TOAST_MS = 2400
/** 홈에서 기본으로 보여주는 회차 수 */
const EPISODE_LIMIT = 5

type View = 'list' | 'home' | 'settings'
type ListLayout = 'grid' | 'table'

const SECTIONS: Array<[string, string]> = [
  ['sec-basic', '기본 정보'],
  ['sec-cast', '출연자'],
  ['sec-dist', '배포 기본값'],
  ['sec-ai', 'AI 분석'],
]

/** 목록 카드에 띄우는 최근 회차 상태 */
type AlertTone = 'info' | 'ok' | 'mute' | 'bad'

const ALERT_TONE: Record<AlertTone, [string, string]> = {
  info: ['var(--bg-accent-subtle)', 'var(--bg-active)'],
  ok: ['var(--status-success-bg)', 'var(--status-success-text)'],
  mute: ['var(--bg-card-hover)', 'var(--text-muted)'],
  bad: ['rgba(239,68,68,.08)', 'hsl(var(--status-error))'],
}

const NOTICE_TONE: Record<'info' | 'mute' | 'bad', [string, string, string]> = {
  info: ['var(--bg-accent-subtle)', 'var(--bg-accent-subtle)', 'var(--bg-active)'],
  mute: ['var(--bg-card)', 'var(--border-subtle)', 'var(--text-primary)'],
  bad: ['rgba(239,68,68,.08)', 'rgba(239,68,68,.30)', 'hsl(var(--status-error))'],
}

export interface ProgramsPageProps {
  startView?: View
  listLayout?: ListLayout
  onNavigate: (screen: ScreenKey) => void
}

export function ProgramsPage({
  startView = 'list',
  listLayout = 'grid',
  onNavigate,
}: ProgramsPageProps) {
  const [programs, setPrograms] = useState<Program[]>(PROGRAMS)
  const [view, setView] = useState<View>(startView)
  const [curId, setCurId] = useState('camp')
  const [layout, setLayout] = useState<ListLayout>(listLayout)
  const [statusTab, setStatusTab] = useState<'airing' | 'ended'>('airing')
  const [allEps, setAllEps] = useState(false)
  const [mediaType, setMediaType] = useState('all')

  const [form, setForm] = useState<ProgramForm | null>(null)
  const [dirty, setDirty] = useState(false)
  const [sec, setSec] = useState('sec-basic')
  const [ytAdd, setYtAdd] = useState<{ ch: string; pl: string } | null>(null)

  const [deleting, setDeleting] = useState(false)
  const [delText, setDelText] = useState('')
  const [draft, setDraft] = useState<{ title: string; genre: string; status: ProgramStatus } | null>(
    null,
  )
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
    setAllEps(false)
    setMediaType('all')
    setDeleting(false)
    window.scrollTo(0, 0)
  }

  const openSettings = (section?: string, program?: Program) => {
    const p = program ?? current
    if (!p) return
    setForm(formOf(p))
    setDirty(false)
    setYtAdd(null)
    setDeleting(false)
    setDelText('')
    setSec(section ?? 'sec-basic')
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
              genre: form.genre,
              owner: form.owner,
              status: form.status,
              sched: form.sched,
              first: form.first,
              ended: form.ended,
              yt: form.yt,
              track: form.track,
              intro: form.intro,
              cast: form.cast.filter((c) => c[0].trim()),
            },
      ),
    )
    setDirty(false)
    say('저장했습니다 — 출연자 · AI 설정은 다음 분석부터 반영됩니다')
  }

  const jump = (id: string) => {
    setSec(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  /* ------------------------------------------------------------------ */

  return (
    <>
      <div className={styles.crumbs}>
        <button
          type="button"
          className={view === 'list' ? styles.crumbLink : styles.crumbMuted}
          onClick={() => {
            setView('list')
            window.scrollTo(0, 0)
          }}
        >
          프로그램
        </button>
        {view !== 'list' && current && (
          <>
            <span className={styles.crumbSep}>/</span>
            <button
              type="button"
              className={view === 'settings' ? styles.crumbMuted : styles.crumbLink}
              onClick={() => openHome()}
            >
              {current.title}
            </button>
          </>
        )}
        {view === 'settings' && (
          <>
            <span className={styles.crumbSep}>/</span>
            <span className={styles.crumbCurrent}>설정</span>
          </>
        )}
      </div>

      <div className={styles.page}>
        {view === 'list' && (
          <ProgramList
            programs={programs}
            statusTab={statusTab}
            onStatusTab={setStatusTab}
            layout={layout}
            onLayout={setLayout}
            onOpen={openHome}
            onNew={() => setDraft({ title: '', genre: '예능', status: 'airing' })}
          />
        )}

        {view === 'home' && current && (
          <ProgramHome
            program={current}
            allEps={allEps}
            onShowAllEps={() => setAllEps(true)}
            mediaType={mediaType}
            onMediaType={setMediaType}
            onSettings={openSettings}
            onNavigate={onNavigate}
            onSay={say}
            onRetryAnalysis={(ep) => {
              setPrograms((list) =>
                list.map((x) =>
                  x.id !== current.id
                    ? x
                    : {
                        ...x,
                        fail: null,
                        run: { ep, stage: '원본 확인', pct: 3 },
                        epList: x.epList.map((y) => (y.n === ep ? { ...y, state: 'run' } : y)),
                      },
                ),
              )
              say(`${ep}회 다시 분석을 시작했습니다`)
            }}
          />
        )}

        {view === 'settings' && current && form && (
          <ProgramSettings
            program={current}
            form={form}
            dirty={dirty}
            sec={sec}
            onJump={jump}
            onPatch={patch}
            onSave={save}
            onAskDelete={() => {
              setDeleting(true)
              setDelText('')
            }}
            ytAdd={ytAdd}
            onYtAdd={setYtAdd}
            onPhoto={setPhoto}
            onSay={say}
          />
        )}
      </div>

      {/* ---------------- 새 프로그램 ---------------- */}
      {draft && (
        <div className={styles.modalScrim} onClick={() => setDraft(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>새 프로그램</div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>프로그램 이름</span>
              <input
                className={styles.input}
                placeholder="예: 주말 캠핑 클럽"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>장르</span>
                <Select
                  value={draft.genre}
                  onChange={(e) => setDraft({ ...draft, genre: e.target.value })}
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>방영 상태</span>
                <Select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value as ProgramStatus })
                  }
                >
                  <option value="airing">방영 중</option>
                  <option value="ended">종영</option>
                </Select>
              </label>
            </div>
            <div className={styles.modalNote}>
              포스터 · 출연자 · 배포 기본값은 만든 뒤 설정에서 채웁니다.
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtn} onClick={() => setDraft(null)}>
                취소
              </button>
              <button
                type="button"
                className={styles.modalBtnPrimary}
                style={{
                  background: draft.title.trim() ? 'var(--bg-active)' : 'var(--badge-bg)',
                }}
                onClick={() => {
                  if (!draft.title.trim()) return
                  const id = `n${programs.length + 1}`
                  const created: Program = {
                    id,
                    title: draft.title.trim(),
                    status: draft.status,
                    genre: draft.genre,
                    owner: ME,
                    sched: '',
                    first: '2026-10-31',
                    ended: '2026-09-28',
                    eps: 0,
                    hue: 180,
                    rights: '',
                    auto: false,
                    track: draft.genre === '드라마' ? 'drama' : 'variety',
                    cast: [],
                    chans: [],
                    yt: [],
                    intro: '',
                    epList: [],
                  }
                  setPrograms((list) => [created, ...list])
                  setDraft(null)
                  setCurId(id)
                  openSettings(undefined, created)
                  say('만들었습니다 — 포스터와 출연자를 채워 주세요')
                }}
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 삭제 ---------------- */}
      {deleting && current && (
        <div className={styles.modalScrim} onClick={() => setDeleting(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitleDanger}>프로그램 삭제</div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              {current.epList.length
                ? `회차 ${current.epList.length}개와 추천 · 클립 · 원본 파일이 함께 지워집니다.`
                : '등록된 회차는 없습니다.'}{' '}
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
                className={styles.modalBtnPrimary}
                style={{
                  background:
                    delText.trim() === current.title
                      ? 'hsl(var(--status-error))'
                      : 'rgba(239,68,68,.30)',
                  cursor: delText.trim() === current.title ? 'pointer' : 'not-allowed',
                }}
                onClick={() => {
                  if (delText.trim() !== current.title) return
                  const title = current.title
                  const rest = programs.filter((x) => x.id !== curId)
                  setPrograms(rest)
                  setCurId(rest[0]?.id ?? '')
                  setDeleting(false)
                  setView('list')
                  say(`"${title}"을 삭제했습니다`)
                  window.scrollTo(0, 0)
                }}
              >
                영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 출연자 사진 ---------------- */}
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
                  <button
                    type="button"
                    className={styles.photoNavBtn}
                    aria-label="이전"
                    onClick={() => setPhoto((i) => ((i! - 1 + form.cast.length) % form.cast.length))}
                  >
                    ‹
                  </button>
                  <span className={styles.photoPos}>
                    {photo + 1} / {form.cast.length}
                  </span>
                  <button
                    type="button"
                    className={styles.photoNavBtn}
                    aria-label="다음"
                    onClick={() => setPhoto((i) => ((i! + 1) % form.cast.length))}
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className={styles.photoActions}>
                <button
                  type="button"
                  className={styles.photoBtn}
                  onClick={() => say('이미지 선택 창이 열립니다')}
                >
                  사진 교체
                </button>
                <button
                  type="button"
                  className={styles.photoBtn}
                  onClick={() => say('사진을 제거합니다 — 저장하면 반영됩니다')}
                >
                  사진 제거
                </button>
                <button
                  type="button"
                  className={styles.photoBtnPrimary}
                  onClick={() => setPhoto(null)}
                >
                  닫기
                </button>
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
 * 목록
 * ================================================================== */

function ProgramList({
  programs,
  statusTab,
  onStatusTab,
  layout,
  onLayout,
  onOpen,
  onNew,
}: {
  programs: Program[]
  statusTab: 'airing' | 'ended'
  onStatusTab: (v: 'airing' | 'ended') => void
  layout: ListLayout
  onLayout: (v: ListLayout) => void
  onOpen: (id: string) => void
  onNew: () => void
}) {
  const groupOf = (p: Program) => (p.status === 'ended' ? 'ended' : 'airing')
  const visible = programs.filter((p) => groupOf(p) === statusTab)

  const alertOf = (p: Program): [string, AlertTone] => {
    const e = p.epList[0]
    if (!e) return ['업로드된 회차 없음', 'mute']
    if (e.state === 'run') return [`${e.n}회 분석 중 · ${p.run?.pct ?? 0}%`, 'info']
    if (e.state === 'fail') return [`${e.n}회 분석 실패`, 'bad']
    return [`${e.n}회 분석 완료`, 'ok']
  }

  const schedShort = (p: Program) =>
    p.status === 'airing'
      ? (p.sched ?? '')
      : p.status === 'upcoming'
        ? `${monthDay(parseDate(p.first!))} 첫 방송`
        : `${monthDay(parseDate(p.ended!))} 종영`

  return (
    <div className={styles.stack}>
      <div className={styles.headerRow}>
        <h1 className={styles.h1}>프로그램</h1>
        <button type="button" className={styles.primaryBtn} onClick={onNew}>
          + 새 프로그램
        </button>
      </div>

      <div className={styles.listBar}>
        <div className={styles.bigTabs}>
          {(
            [
              ['airing', '방영 중'],
              ['ended', '종영'],
            ] as Array<['airing' | 'ended', string]>
          ).map(([k, label]) => {
            const on = statusTab === k
            return (
              <button
                key={k}
                type="button"
                className={on ? `${styles.bigTab} ${styles.bigTabOn}` : styles.bigTab}
                onClick={() => onStatusTab(k)}
              >
                {label}{' '}
                <span className={on ? `${styles.tabCount} ${styles.tabCountOn}` : styles.tabCount}>
                  {programs.filter((p) => groupOf(p) === k).length}
                </span>
              </button>
            )
          })}
        </div>
        <div className={styles.spacer} />
        <div className={styles.segment}>
          {(
            [
              ['grid', '카드'],
              ['table', '표'],
            ] as Array<[ListLayout, string]>
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={layout === k ? `${styles.seg} ${styles.segOn}` : styles.seg}
              onClick={() => onLayout(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <div className={styles.emptyCard}>
          <div className={styles.emptyTitle}>조건에 맞는 프로그램이 없습니다</div>
        </div>
      )}

      {layout === 'grid' && visible.length > 0 && (
        <div className={styles.cardGrid}>
          {visible.map((p) => {
            const [text, tone] = alertOf(p)
            const st = STATUS_STYLE[p.status]
            return (
              <button
                key={p.id}
                type="button"
                className={styles.programCard}
                onClick={() => onOpen(p.id)}
              >
                <div className={styles.poster} style={{ background: posterColor(p.hue) }}>
                  포스터
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <span className={styles.cardTitle}>{p.title}</span>
                    <span className={styles.pill} style={{ background: st.bg, color: st.fg }}>
                      {st.label}
                    </span>
                  </div>
                  <div className={styles.cardMeta}>총 {p.eps}회</div>
                  <div
                    className={styles.cardAlert}
                    style={{ background: ALERT_TONE[tone][0], color: ALERT_TONE[tone][1] }}
                  >
                    {text}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {layout === 'table' && visible.length > 0 && (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>프로그램</span>
            <span>상태</span>
            <span>편성</span>
            <span>회차</span>
            <span>담당</span>
            <span>최근 회차 분석</span>
          </div>
          {visible.map((p) => {
            const [text, tone] = alertOf(p)
            const st = STATUS_STYLE[p.status]
            return (
              <button
                key={p.id}
                type="button"
                className={styles.tableRow}
                onClick={() => onOpen(p.id)}
              >
                <span className={styles.tableTitleCell}>
                  <span
                    className={styles.tableThumb}
                    style={{ background: posterColor(p.hue) }}
                  />
                  <span className={styles.tableTitle}>{p.title}</span>
                </span>
                <span>
                  <span className={styles.pill} style={{ background: st.bg, color: st.fg }}>
                    {st.label}
                  </span>
                </span>
                <span className={styles.cellMuted}>{schedShort(p)}</span>
                <span className={styles.cellMuted}>{p.eps ? `${p.eps}회` : '—'}</span>
                <span className={styles.cellMuted}>{p.owner}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: ALERT_TONE[tone][1] }}>
                  {text}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ================================================================== *
 * 프로그램 홈
 * ================================================================== */

function ProgramHome({
  program: p,
  allEps,
  onShowAllEps,
  mediaType,
  onMediaType,
  onSettings,
  onNavigate,
  onSay,
  onRetryAnalysis,
}: {
  program: Program
  allEps: boolean
  onShowAllEps: () => void
  mediaType: string
  onMediaType: (v: string) => void
  onSettings: (section?: string) => void
  onNavigate: (screen: ScreenKey) => void
  onSay: (text: string) => void
  onRetryAnalysis: (ep: number) => void
}) {
  const st = STATUS_STYLE[p.status]

  const line =
    p.status === 'upcoming'
      ? `${monthDay(parseDate(p.first!))} 첫 방송 예정 · ${p.genre} · 담당 ${p.owner}`
      : p.status === 'ended'
        ? `${monthDay(parseDate(p.ended!))} 종영 · ${p.genre} · 담당 ${p.owner}`
        : `${p.sched} · ${p.genre} · 담당 ${p.owner}`

  /* 알림 */
  const notices: Array<{
    kind: 'info' | 'mute' | 'bad'
    title: string
    desc: string
    pct?: number
    action?: string
    to?: ScreenKey
  }> = []
  if (p.run) {
    notices.push({
      kind: 'info',
      title: `${p.run.ep}회 분석 중`,
      desc: `${p.run.stage} 단계 — 끝나면 추천 구간이 영상 분석에 올라옵니다.`,
      pct: p.run.pct,
    })
  }
  if (p.status === 'ended') {
    notices.push({
      kind: 'mute',
      title: '새 회차가 들어오지 않습니다',
      desc: '기존 회차에서 장면을 찾아 다시 쓸 수 있습니다.',
      action: '아카이브에서 장면 찾기',
      to: 'analysis',
    })
  }
  const rightsLeft = p.rights ? daysUntil(p.rights) : null
  if (rightsLeft !== null && rightsLeft >= 0 && rightsLeft <= 30) {
    notices.push({
      kind: 'bad',
      title: `디지털 권리 D-${rightsLeft}`,
      desc: `${monthDay(parseDate(p.rights))} 이후에는 이 프로그램 영상을 배포하면 안 됩니다. 만료돼도 자동으로 막히지는 않습니다.`,
    })
  }

  /* 회차 */
  const stateLabel: Record<string, [string, string, number]> = {
    done: ['분석 완료', 'var(--text-secondary)', 400],
    run: [`분석 중 · ${p.run?.pct ?? 0}%`, 'var(--bg-active)', 600],
    fail: ['분석 실패', 'hsl(var(--status-error))', 600],
  }
  const shownEps = allEps ? p.epList : p.epList.slice(0, EPISODE_LIMIT)
  const moreEps = p.epList.length - EPISODE_LIMIT

  /* 미디어 */
  const titles = MEDIA_TITLES[p.id] ?? []
  const kinds = ['숏폼', '숏폼', '클립', '숏폼', '하이라이트', '클립']
  const allMedia: Array<{
    kind: string
    ep: string
    title: string
    dur: string
    state: string
    stateColor: string
    hue: number
  }> = []
  p.epList
    .filter((e) => e.state === 'done')
    .slice(0, 4)
    .forEach((e, ei) => {
      for (let j = 0; j < 4; j++) {
        const k = ei * 4 + j
        const kind = kinds[k % kinds.length]
        const sec =
          kind === '숏폼'
            ? 28 + ((k * 11) % 32)
            : kind === '클립'
              ? 95 + ((k * 37) % 180)
              : 240 + ((k * 53) % 200)
        const [stateText, stateColor] =
          ei === 0 && j === 3
            ? ['렌더 중', 'var(--bg-active)']
            : ei === 0 && j === 2
              ? ['렌더 전', 'var(--text-muted)']
              : ['완료', 'var(--status-success-text)']
        allMedia.push({
          kind,
          ep: `${e.n}회`,
          title: titles.length ? titles[k % titles.length] : `${e.n}회 추천 구간 ${j + 1}`,
          dur: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`,
          state: stateText,
          stateColor,
          hue: p.hue + k * 23,
        })
      }
    })
  const mediaList = allMedia.filter((m) => mediaType === 'all' || m.kind === mediaType)

  return (
    <div className={styles.stack}>
      <div className={styles.homeHeader}>
        <div className={styles.homeAvatar} style={{ background: posterColor(p.hue) }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.homeTitleRow}>
            <h1 className={styles.homeTitle}>{p.title}</h1>
            <span className={styles.pill} style={{ background: st.bg, color: st.fg }}>
              {st.label}
            </span>
          </div>
          <div className={styles.homeLine}>{line}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 6 }}>
          {p.cast.length > 0 ? (
            <>
              <button
                type="button"
                className={styles.castStack}
                title="출연자 관리"
                onClick={() => onSettings('sec-cast')}
              >
                {p.cast.slice(0, 5).map(([name], i) => (
                  <span
                    key={name}
                    className={styles.castAvatar}
                    style={{
                      width: 30,
                      height: 30,
                      fontSize: 11,
                      marginLeft: i ? -8 : 0,
                      border: '2px solid var(--bg-dark)',
                      background: posterColor(p.hue + i * 40),
                      color: posterTextColor(p.hue + i * 40),
                    }}
                  >
                    {name[0]}
                  </span>
                ))}
              </button>
              <button
                type="button"
                className={styles.castCount}
                onClick={() => onSettings('sec-cast')}
              >
                출연자 {p.cast.length}명
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.castEmpty}
              onClick={() => onSettings('sec-cast')}
            >
              + 출연자 등록
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={styles.secondaryBtn} onClick={() => onSettings()}>
            설정
          </button>
          {p.status === 'airing' && p.epList.length > 0 && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => onSay('업로드한 영상은 분석 대기열에 들어갑니다')}
            >
              회차 영상 업로드
            </button>
          )}
        </div>
      </div>

      {notices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notices.map((n) => {
            const [bg, border, fg] = NOTICE_TONE[n.kind]
            return (
              <div key={n.title} className={styles.notice} style={{ background: bg, borderColor: border }}>
                <span className={styles.noticeTitle} style={{ color: fg }}>
                  {n.title}
                </span>
                <span className={styles.noticeDesc}>{n.desc}</span>
                {n.pct != null && (
                  <span className={styles.noticeBarTrack}>
                    <span className={styles.noticeBar} style={{ width: `${n.pct}%` }} />
                  </span>
                )}
                {n.action && n.to && (
                  <button
                    type="button"
                    className={styles.noticeAction}
                    onClick={() => onNavigate(n.to!)}
                  >
                    {n.action}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {p.epList.length === 0 ? (
        <div className={styles.bigEmpty}>
          <div className={styles.bigEmptyTitle}>아직 올라온 회차가 없습니다</div>
          <div className={styles.bigEmptyNote}>회차 영상을 올리면 분석 대기열에 들어갑니다.</div>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => onSay('업로드한 영상은 분석 대기열에 들어갑니다')}
          >
            회차 영상 업로드
          </button>
        </div>
      ) : (
        <div className={styles.stack}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>
                회차 <span className={styles.panelCount}>{p.epList.length}</span>
              </span>
            </div>
            <div className={styles.epHead}>
              <span>회차</span>
              <span>업로드</span>
              <span>분석</span>
              <span />
            </div>
            {shownEps.map((e) => {
              const [text, color, weight] = stateLabel[e.state]
              return (
                <div key={e.n} className={styles.epRow}>
                  <span className={styles.epLabel}>{e.n}회</span>
                  <span className={styles.cellMuted}>{e.air}</span>
                  <span className={styles.epState}>
                    <span className={styles.epStateText} style={{ color, fontWeight: weight }}>
                      {text}
                    </span>
                    {e.state === 'run' && (
                      <span className={styles.epBarTrack}>
                        <span
                          className={styles.noticeBar}
                          style={{ width: `${p.run?.pct ?? 0}%` }}
                        />
                      </span>
                    )}
                    {e.state === 'fail' && <span className={styles.epErr}>{p.fail?.err}</span>}
                  </span>
                  <span className={styles.epAction}>
                    {e.state === 'done' && (
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => onNavigate('analysis')}
                      >
                        추천 보기
                      </button>
                    )}
                    {e.state === 'fail' && (
                      <button
                        type="button"
                        className={styles.smallBtn}
                        onClick={() => onRetryAnalysis(e.n)}
                      >
                        다시 분석
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
            {!allEps && moreEps > 0 && (
              <button type="button" className={styles.moreBtn} onClick={onShowAllEps}>
                이전 회차 {moreEps}개 더 보기
              </button>
            )}
          </div>

          <div className={styles.mediaPanel}>
            <div className={styles.mediaHead}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span className={styles.panelTitle}>
                  미디어 <span className={styles.panelCount}>{allMedia.length}</span>
                </span>
                <div className={styles.mediaTabs}>
                  {['all', '숏폼', '클립', '하이라이트'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={
                        mediaType === k ? `${styles.mediaTab} ${styles.mediaTabOn}` : styles.mediaTab
                      }
                      onClick={() => onMediaType(k)}
                    >
                      {k === 'all' ? '전체' : k}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => onNavigate('media')}
              >
                미디어에서 전체 보기 →
              </button>
            </div>

            <div className={styles.mediaGrid}>
              {mediaList.slice(0, 12).map((m, i) => (
                <button
                  key={`${m.title}-${i}`}
                  type="button"
                  className={styles.mediaItem}
                  onClick={() => onNavigate('media')}
                >
                  <div
                    className={styles.mediaThumb}
                    style={{ background: mediaThumbColor(m.hue) }}
                  >
                    {m.kind === '숏폼' && (
                      <div
                        className={styles.mediaFrame}
                        style={{ background: mediaFrameColor(m.hue) }}
                      />
                    )}
                    <span className={styles.mediaKind}>{m.kind}</span>
                    <span className={styles.mediaDur}>{m.dur}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.mediaTitle}>{m.title}</div>
                    <div className={styles.mediaMeta}>
                      <span>{m.ep}</span>
                      <span>·</span>
                      <span style={{ color: m.stateColor, fontWeight: 600 }}>{m.state}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {mediaList.length === 0 && (
              <div className={styles.mediaEmpty}>이 유형의 미디어가 없습니다.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================== *
 * 설정
 * ================================================================== */

function ProgramSettings({
  program: p,
  form: f,
  dirty,
  sec,
  onJump,
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
  sec: string
  onJump: (id: string) => void
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
      cast: f.cast.map((c, k) =>
        k === i ? (c.map((x, m) => (m === j ? value : x)) as CastMember) : c,
      ),
    })

  const playlistOptions =
    ytAdd?.ch
      ? (PLAYLISTS[ytAdd.ch] ?? []).filter(
          (o) => !f.yt.some(([c, x]) => c === ytAdd.ch && x === o),
        )
      : []
  const canAddPlaylist = !!(ytAdd?.ch && ytAdd?.pl)

  return (
    <div className={styles.settingsLayout}>
      <div className={styles.secNav}>
        {SECTIONS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={sec === id ? `${styles.secNavBtn} ${styles.secNavBtnOn}` : styles.secNavBtn}
            onClick={() => onJump(id)}
          >
            {label}
          </button>
        ))}
        <div className={styles.secNavFoot}>
          <button
            type="button"
            className={dirty ? `${styles.saveBtn} ${styles.saveBtnOn}` : `${styles.saveBtn} ${styles.saveBtnOff}`}
            onClick={onSave}
          >
            {dirty ? '변경사항 저장' : '저장됨'}
          </button>
          <button type="button" className={styles.deleteBtn} onClick={onAskDelete}>
            프로그램 삭제
          </button>
        </div>
      </div>

      <div className={styles.stack}>
        {/* ---------------- 기본 정보 ---------------- */}
        <section id="sec-basic" className={styles.section}>
          <div className={styles.sectionTitle}>기본 정보</div>

          <div className={styles.posterRow}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>포스터</span>
              <div
                className={styles.posterBox}
                style={{ background: posterColor(p.hue) }}
                onClick={() => onSay('이미지 선택 창이 열립니다')}
              >
                클릭해 교체
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>쇼츠 아이콘</span>
              <div
                className={styles.iconBox}
                style={{ background: posterColor(p.hue), color: posterTextColor(p.hue) }}
                onClick={() => onSay('이미지 선택 창이 열립니다')}
              >
                {p.title[0]}
              </div>
            </div>
            <div className={styles.posterNote}>
              아이콘은 자동 렌더된 숏폼 하단, 프로그램명 옆에 들어갑니다.
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={`${styles.field} ${styles.formGridFull}`}>
              <span className={styles.fieldLabel}>프로그램 이름</span>
              <input
                className={styles.input}
                value={f.title}
                onChange={(e) => onPatch({ title: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>장르</span>
              <Select value={f.genre} onChange={(e) => onPatch({ genre: e.target.value })}>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>담당 PD</span>
              <input
                className={styles.input}
                value={f.owner}
                onChange={(e) => onPatch({ owner: e.target.value })}
              />
            </label>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <span className={styles.fieldLabel}>방영 상태</span>
              <div className={styles.segment} style={{ alignSelf: 'flex-start' }}>
                {(['airing', 'ended'] as ProgramStatus[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={f.status === k ? `${styles.seg} ${styles.segOn}` : styles.seg}
                    onClick={() => onPatch({ status: k })}
                  >
                    {STATUS_STYLE[k].label}
                  </button>
                ))}
              </div>
            </div>
            {f.status === 'airing' && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>편성</span>
                <input
                  className={styles.input}
                  placeholder="예: 매주 토 오후 7:40"
                  value={f.sched}
                  onChange={(e) => onPatch({ sched: e.target.value })}
                />
              </label>
            )}
            {f.status === 'upcoming' && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>첫 방송일</span>
                <input
                  type="date"
                  className={styles.input}
                  value={f.first}
                  onChange={(e) => onPatch({ first: e.target.value })}
                />
              </label>
            )}
            {f.status === 'ended' && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>종영일</span>
                <input
                  type="date"
                  className={styles.input}
                  value={f.ended}
                  onChange={(e) => onPatch({ ended: e.target.value })}
                />
              </label>
            )}
          </div>
        </section>

        {/* ---------------- 출연자 ---------------- */}
        <section id="sec-cast" className={styles.section} style={{ gap: 14 }}>
          <div className={styles.castHead}>
            <div>
              <div className={styles.sectionTitle}>출연자</div>
              <div className={styles.sectionNote}>
                인물 라벨링과 추천 제목에 쓰입니다. 다음 분석부터 반영됩니다.
              </div>
            </div>
            <button
              type="button"
              className={styles.smallBtn}
              style={{ height: 34, padding: '0 12px' }}
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
            <span>
              극중 이름 <span className={styles.fieldHint}>선택</span>
            </span>
            <span>
              영어 표기 <span className={styles.fieldHint}>해외 배포용</span>
            </span>
            <span />
          </div>

          {f.cast.map((c, i) => (
            <div key={i} className={styles.castGrid}>
              <button
                type="button"
                className={styles.castAvatarBtn}
                title="사진 크게 보기"
                style={{
                  width: 36,
                  height: 36,
                  fontSize: 13,
                  background: posterColor(p.hue + i * 40),
                  color: posterTextColor(p.hue + i * 40),
                }}
                onClick={() => onPhoto(i)}
              >
                {c[0] ? c[0][0] : '+'}
              </button>
              <input
                className={`${styles.input} ${styles.inputSm}`}
                placeholder="이름"
                value={c[0]}
                onChange={(e) => setCast(i, 0, e.target.value)}
              />
              <input
                className={`${styles.input} ${styles.inputSm}`}
                placeholder="—"
                value={c[1]}
                onChange={(e) => setCast(i, 1, e.target.value)}
              />
              <input
                className={`${styles.input} ${styles.inputSm}`}
                placeholder="비우면 자동"
                value={c[2]}
                onChange={(e) => setCast(i, 2, e.target.value)}
              />
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="삭제"
                onClick={() => onPatch({ cast: f.cast.filter((_, k) => k !== i) })}
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            className={styles.addCastBtn}
            onClick={() => onPatch({ cast: [...f.cast, ['', '', '']] })}
          >
            + 출연자 추가
          </button>
        </section>

        {/* ---------------- 배포 기본값 ---------------- */}
        <section id="sec-dist" className={styles.section}>
          <div>
            <div className={styles.sectionTitle}>배포 기본값</div>
            <div className={styles.sectionNote}>
              이 프로그램 영상이 나갈 때마다 자동으로 붙습니다. 자동 배포 계획에서 채널별로 덮어쓸 수
              있습니다.
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
                <input
                  type="checkbox"
                  className={styles.nativeCheckbox}
                  checked={f.hideKo}
                  onChange={() => onPatch({ hideKo: !f.hideKo })}
                />
                원본에 구운 한국어 자막 가리기
              </label>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span className={styles.blockLabel}>
                YouTube 재생목록{' '}
                <span className={styles.blockHint}>발행된 영상이 자동으로 담깁니다</span>
              </span>
              {!ytAdd && (
                <button
                  type="button"
                  className={styles.smallBtn}
                  style={{ height: 32, padding: '0 12px' }}
                  onClick={() => onYtAdd({ ch: '', pl: '' })}
                >
                  + 추가
                </button>
              )}
            </div>

            {f.yt.length === 0 && !ytAdd && (
              <div className={styles.ytEmpty}>추가한 재생목록이 없습니다.</div>
            )}

            {f.yt.map(([channel, playlist], i) => (
              <div key={`${channel}-${playlist}`} className={styles.ytRow}>
                <span className={styles.ytDot} />
                <span className={styles.ytChannel}>{channel}</span>
                <span style={{ color: 'var(--text-muted)' }}>›</span>
                <span className={styles.ytPlaylist}>{playlist}</span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="삭제"
                  onClick={() => onPatch({ yt: f.yt.filter((_, k) => k !== i) })}
                >
                  ×
                </button>
              </div>
            ))}

            {ytAdd && (
              <div className={styles.ytAddBox}>
                <div className={styles.formGrid} style={{ gap: 10 }}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>채널</span>
                    <Select
                      value={ytAdd.ch}
                      onChange={(e) => onYtAdd({ ch: e.target.value, pl: '' })}
                    >
                      <option value="">채널 선택</option>
                      {YT_CHANNELS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>재생목록</span>
                    <Select
                      value={ytAdd.pl}
                      disabled={!ytAdd.ch}
                      onChange={(e) => onYtAdd({ ...ytAdd, pl: e.target.value })}
                    >
                      <option value="">
                        {!ytAdd.ch
                          ? '채널을 먼저 선택'
                          : playlistOptions.length
                            ? '재생목록 선택'
                            : '추가할 재생목록 없음'}
                      </option>
                      {playlistOptions.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className={styles.modalBtn} onClick={() => onYtAdd(null)}>
                    취소
                  </button>
                  <button
                    type="button"
                    className={styles.modalBtnPrimary}
                    style={{
                      height: 34,
                      padding: '0 14px',
                      fontSize: 12.5,
                      background: canAddPlaylist ? 'var(--bg-active)' : 'var(--badge-bg)',
                      cursor: canAddPlaylist ? 'pointer' : 'not-allowed',
                    }}
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
        <section id="sec-ai" className={styles.section}>
          <div>
            <div className={styles.sectionTitle}>AI 분석</div>
            <div className={styles.sectionNote}>
              추천 구간과 제목을 만드는 방식입니다. 비워 두면 기본값으로 동작합니다.
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>구간을 나누는 기준</span>
            <div className={styles.trackRow}>
              {(
                [
                  ['variety', '코너 단위', '예능 · 교양 — 코너와 리액션 중심으로 자릅니다'],
                  ['drama', '서사 단위', '드라마 — 장면의 시작과 끝을 지켜 자릅니다'],
                ] as Array<['variety' | 'drama', string, string]>
              ).map(([k, label, sub]) => (
                <button
                  key={k}
                  type="button"
                  className={
                    f.track === k ? `${styles.trackBtn} ${styles.trackBtnOn}` : styles.trackBtn
                  }
                  onClick={() => onPatch({ track: k })}
                >
                  <span className={styles.trackLabel}>{label}</span>
                  <span className={styles.trackSub}>{sub}</span>
                </button>
              ))}
            </div>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              프로그램 소개 <span className={styles.fieldHint}>한두 문장</span>
            </span>
            <textarea
              className={styles.textarea}
              rows={2}
              placeholder="예: 연예인들이 매주 다른 캠핑장에서 1박 2일을 보내는 리얼리티."
              value={f.intro}
              onChange={(e) => onPatch({ intro: e.target.value })}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              추가 지시 <span className={styles.fieldHint}>이 프로그램에만 적용</span>
            </span>
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
  )
}
