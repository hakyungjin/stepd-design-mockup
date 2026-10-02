import { useEffect, useMemo, useRef, useState } from 'react'
import { Chip } from '@/components/ui/Badge'
import type { ScreenKey } from '@/app/screens'
import {
  DETECTED_SEGMENTS,
  EPISODE_SUMMARY,
  ITEMS,
  JOBS,
  KINDS,
  KIND_TONE,
  PEOPLE,
  PROGRAM_OPTIONS,
  STEPS,
  UNKNOWNS,
  rangeTextOf,
  scenesOf,
  shareOf,
  timeText,
  totalOf,
  type AnalysisItem,
  type ItemKind,
  type Job,
  type Person,
  type Unknown,
} from './data'
import { AnalysisRequest } from './AnalysisRequest'
import styles from './AnalysisPage.module.css'

const TOAST_MS = 2600

/** 원본 파일 정보 — STEPD 연동 시 회차 응답으로 교체 */
const SOURCE = {
  duration: '1:32:40',
  file: '주말_캠핑_클럽_12회_원본.mp4',
  size: '4.2GB',
  spec: '1920×1080 · 29.97fps · H.264',
  uploaded: '09/26 09:58',
}

type View = 'history' | 'analyzing' | 'result'
type Tab = ItemKind | '등장 인물'
type Mode = 'list' | 'grid'

export interface AnalysisPageProps {
  onNavigate: (screen: ScreenKey) => void
}

export function AnalysisPage({ onNavigate }: AnalysisPageProps) {
  const [view, setView] = useState<View>('history')
  const [jobs] = useState<Job[]>(JOBS)
  const [currentJobId, setCurrentJobId] = useState('j1')

  const [histProgram, setHistProgram] = useState('all')
  const [histEp, setHistEp] = useState('all')

  const [tab, setTab] = useState<Tab>('숏폼')
  const [mode, setMode] = useState<Mode>('list')

  const [people, setPeople] = useState<Array<Person & { share?: number; scenes?: number }>>(PEOPLE)
  const [unknowns, setUnknowns] = useState<Unknown[]>(UNKNOWNS)
  const [regForm, setRegForm] = useState<Record<string, { name?: string; role?: string }>>({})

  const [detailId, setDetailId] = useState<string | null>(null)
  const [deployed, setDeployed] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState('')
  /** 원본 영상 창 */
  const [sourceOpen, setSourceOpen] = useState(false)
  /** 분석 요청 창 — 프로그램·회차를 고르고 원본을 올립니다 */
  const [newJob, setNewJob] = useState<{ program: string } | null>(null)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const say = (text: string) => {
    if (timer.current) clearTimeout(timer.current)
    setToast(text)
    timer.current = setTimeout(() => setToast(''), TOAST_MS)
  }

  const job = jobs.find((j) => j.id === currentJobId) ?? jobs[0]
  const detail = ITEMS.find((i) => i.id === detailId) ?? null

  /* ---------------- 목록 ---------------- */

  const visibleJobs = jobs.filter(
    (j) =>
      (histProgram === 'all' || j.program === histProgram) &&
      (histEp === 'all' || String(j.ep) === histEp),
  )

  const histEpOptions =
    histProgram === 'all'
      ? []
      : [...new Set(jobs.filter((j) => j.program === histProgram).map((j) => j.ep))]
          .sort((a, b) => b - a)
          .map((n) => ({ value: String(n), label: `${n}회` }))

  /* ---------------- 결과 ---------------- */

  const itemsOfTab = useMemo(
    () => (tab === '등장 인물' ? [] : ITEMS.filter((i) => i.kind === tab)),
    [tab],
  )

  const sidePeople = PEOPLE.map((p, i) => ({
    name: p.name,
    role: p.role,
    share: shareOf(i),
    color: p.color,
  }))

  const openDetail = (item: AnalysisItem) => setDetailId(item.id)

  return (
    <>
      <div className={styles.page}>
        {/* ---------------- 분석 목록 ---------------- */}
        {view === 'history' && (
          <div>
            <div className={styles.headRow}>
              <h1 className={styles.h1}>영상 분석</h1>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => setNewJob({ program: PROGRAM_OPTIONS[0].name })}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 16V4m-4 4 4-4 4 4M4 17v3h16v-3" />
                </svg>
                <span>영상 분석</span>
              </button>
            </div>

            <div className={styles.filterGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>프로그램</span>
                <select
                  className={styles.bigSelect}
                  value={histProgram}
                  onChange={(e) => {
                    setHistProgram(e.target.value)
                    setHistEp('all')
                  }}
                >
                  <option value="all">모든 프로그램</option>
                  {PROGRAM_OPTIONS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>회차</span>
                <select
                  className={styles.bigSelect}
                  value={histEp}
                  disabled={histProgram === 'all'}
                  onChange={(e) => setHistEp(e.target.value)}
                >
                  <option value="all">
                    {histProgram === 'all' ? '프로그램을 먼저 고르세요' : '모든 회차'}
                  </option>
                  {histEpOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.jobTable}>
              <div className={styles.jobHead}>
                <span>프로그램 · 회차</span>
                <span>길이</span>
                <span>요청</span>
                <span>상태</span>
                <span>생성물</span>
                <span />
              </div>

              {visibleJobs.map((j) => {
                const running = j.status === 'running'
                const failed = j.status === 'failed'
                return (
                  <button
                    key={j.id}
                    type="button"
                    className={styles.jobRow}
                    onClick={() => {
                      if (failed) {
                        say(j.reason ?? '분석에 실패했습니다')
                        return
                      }
                      setCurrentJobId(j.id)
                      setView(running ? 'analyzing' : 'result')
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className={styles.jobName}>{j.name}</div>
                      <div className={styles.jobFile}>{j.file}</div>
                    </div>
                    <span className={styles.jobMuted}>{j.dur}</span>
                    <span className={styles.jobMuted}>{j.at}</span>
                    <div className={styles.jobStateCell}>
                      <span>
                        <span
                          className={styles.statePill}
                          style={
                            running
                              ? { background: 'var(--badge-bg)', color: 'var(--badge-text)' }
                              : failed
                                ? {
                                    background: 'rgba(239,68,68,.08)',
                                    color: 'hsl(var(--status-error))',
                                  }
                                : {
                                    background: 'var(--status-success-bg)',
                                    color: 'var(--status-success-text)',
                                  }
                          }
                        >
                          {running
                            ? `분석 중 ${Math.floor(j.progress ?? 0)}%`
                            : failed
                              ? '실패'
                              : '완료'}
                        </span>
                      </span>
                      {running && (
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressBar}
                            style={{ width: `${j.progress ?? 0}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <span
                      className={styles.jobOut}
                      style={{
                        color: failed ? 'hsl(var(--status-error))' : 'var(--text-secondary)',
                      }}
                    >
                      {running ? '생성 중' : failed ? j.reason : '숏폼 8 · 클립 4 · 하이라이트 1'}
                    </span>
                    <span className={styles.jobCta}>
                      {running ? '진행 보기' : failed ? '' : '결과 보기'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ---------------- 분석 중 ---------------- */}
        {view === 'analyzing' && (
          <div className={styles.analyzing}>
            <button type="button" className={styles.backBtn} onClick={() => setView('history')}>
              ← 분석 목록
            </button>
            <div className={styles.analyzeCard}>
              <div className={styles.analyzeLabel}>분석 중</div>
              <div className={styles.analyzeTitle}>{job.name}</div>
              <div className={styles.analyzeRow}>
                <span className={styles.analyzeStep}>{STEPS[STEPS.length - 1]}</span>
                <span className={styles.analyzePct}>100%</span>
              </div>
              <div className={styles.bigTrack}>
                <div className={styles.progressBar} style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {STEPS.map((label, i) => (
                  <div key={label} className={styles.stepRow}>
                    <span className={`${styles.stepDot} ${styles.stepDotDone}`}>✓</span>
                    <span className={`${styles.stepText} ${styles.stepTextDone}`}>{label}</span>
                    <span className={styles.stepNote}>완료</span>
                    {i < 0 && null}
                  </div>
                ))}
              </div>
              <div className={styles.analyzeFoot}>
                이 화면을 떠나도 분석은 계속됩니다. 끝나면 분석 이력에서 결과를 볼 수 있습니다.
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 결과 ---------------- */}
        {view === 'result' && (
          <div className={styles.result}>
            <button type="button" className={styles.backBtn} onClick={() => setView('history')}>
              ← 분석 목록
            </button>

            <div className={styles.resultHead}>
              <div className={styles.resultIdentity}>
                <button
                  type="button"
                  className={styles.sourceThumb}
                  aria-label="원본 영상 보기"
                  onClick={() => setSourceOpen(true)}
                >
                  <img src={ITEMS[0]?.thumb} alt="" />
                  <span className={styles.sourcePlay} aria-hidden>▶</span>
                </button>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.resultTitle}>{job.name}</div>
                  <div className={styles.resultMeta}>
                    <span>원본 {SOURCE.duration}</span>
                    <span>장면 16개 · 인물 4명</span>
                    <span>분석 완료 {job.doneAt ?? ''}</span>
                  </div>
                  <div className={styles.resultActions}>
                    <button type="button" className={styles.sourceBtn} onClick={() => setSourceOpen(true)}>
                      <span aria-hidden>▶</span> 원본 보기
                    </button>
                    <button
                      type="button"
                      className={styles.sourceGhost}
                      onClick={() => say(`원본 내려받기 — ${SOURCE.file} (${SOURCE.size})`)}
                    >
                      원본 내려받기
                    </button>
                  </div>
                </div>
              </div>
              <div className={styles.kindStats}>
                {KINDS.map((k) => (
                  <div key={k} className={styles.kindStat}>
                    <div className={styles.kindStatValue}>
                      {ITEMS.filter((x) => x.kind === k).length}
                    </div>
                    <div className={styles.kindStatLabel}>{k}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.resultBody}>
              <div className={styles.resultMain}>
                <div className={styles.tabRow}>
                  {([...KINDS, '등장 인물'] as Tab[]).map((k) => {
                    const on = tab === k
                    const n =
                      k === '등장 인물'
                        ? people.length + unknowns.length
                        : ITEMS.filter((x) => x.kind === k).length
                    return (
                      <button
                        key={k}
                        type="button"
                        className={on ? `${styles.tab} ${styles.tabOn}` : styles.tab}
                        onClick={() => setTab(k)}
                      >
                        {k}
                        <span
                          className={on ? `${styles.tabCount} ${styles.tabCountOn}` : styles.tabCount}
                        >
                          {n}
                        </span>
                      </button>
                    )
                  })}

                  {tab !== '등장 인물' && (
                    <div className={styles.modeSwitch}>
                      {(
                        [
                          ['list', '리스트'],
                          ['grid', '썸네일'],
                        ] as Array<[Mode, string]>
                      ).map(([k, label], i) => (
                        <button
                          key={k}
                          type="button"
                          className={[
                            styles.modeBtn,
                            i > 0 ? styles.modeBtnDivider : '',
                            mode === k ? styles.modeBtnOn : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => setMode(k)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {tab === '등장 인물' ? (
                  <PeopleTab
                    people={people}
                    unknowns={unknowns}
                    regForm={regForm}
                    onRegForm={setRegForm}
                    onRegister={(u, name, role) => {
                      setUnknowns((list) => list.filter((x) => x.id !== u.id))
                      setPeople((list) => [
                        ...list,
                        {
                          name,
                          role: role || '출연',
                          color: 'var(--bg-active-hover)',
                          share: u.share,
                          scenes: u.scenes,
                        },
                      ])
                      say(`${name} 님을 등록했습니다`)
                    }}
                    onSay={say}
                  />
                ) : mode === 'grid' ? (
                  <div
                    className={tab === '숏폼' ? styles.itemGridShort : styles.itemGridWide}
                  >
                    {itemsOfTab.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        className={styles.itemCard}
                        onClick={() => openDetail(it)}
                      >
                        <div
                          className={[
                            styles.itemThumb,
                            it.kind === '숏폼' ? styles.itemThumbShort : styles.itemThumbWide,
                          ].join(' ')}
                        >
                          <img src={it.thumb} alt="" className={styles.itemThumbImg} />
                          <span className={styles.itemScore}>{it.score}점</span>
                          <span className={styles.itemRange}>{rangeTextOf(it)}</span>
                          <span className={styles.itemDur}>{timeText(totalOf(it))}</span>
                        </div>
                        <div className={styles.itemBody}>
                          <div className={styles.itemTitle}>{it.title}</div>
                          <div className={styles.itemReason}>
                            {deployed[it.id] ? '배포 요청됨 · ' : ''}
                            {it.reasons.join(' · ')}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.listTable}>
                    <div className={styles.listHead}>
                      <span>제목 · 추천 근거</span>
                      <span>원본 구간</span>
                      <span>길이</span>
                      <span>점수</span>
                      <span />
                    </div>
                    {itemsOfTab.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        className={styles.listRow}
                        onClick={() => openDetail(it)}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div className={styles.listTitle}>{it.title}</div>
                          <div className={styles.listReason}>
                            {deployed[it.id] ? '배포 요청됨 · ' : ''}
                            {it.reasons.join(' · ')}
                          </div>
                        </div>
                        <span className={styles.listRange}>{rangeTextOf(it)}</span>
                        <span className={styles.listDur}>{timeText(totalOf(it))}</span>
                        <span className={styles.listScore}>{it.score}</span>
                        <div className={styles.listActions}>
                          <span className={styles.listBtn}>재생·수정</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <aside className={styles.side}>
                <div>
                  <div className={styles.sideTitle}>회차 요약</div>
                  <div className={styles.sideText}>{EPISODE_SUMMARY}</div>
                </div>

                <div>
                  <div className={styles.sideTitle}>인물 등장 비중</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {sidePeople.map((p) => (
                      <div key={p.name}>
                        <div className={styles.sidePerson}>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {p.name} <span className={styles.sidePersonRole}>{p.role}</span>
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{p.share}%</span>
                        </div>
                        <div className={styles.shareTrack}>
                          <div
                            className={styles.shareBar}
                            style={{ width: `${p.share}%`, background: p.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className={styles.sideTitle}>구간 감지</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {DETECTED_SEGMENTS.map(([label, range]) => (
                      <div key={label} className={styles.sideSegRow}>
                        <span className={styles.sideSegLabel}>{label}</span>
                        <span className={styles.sideSegRange}>{range}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.sideNote}>감지된 구간은 생성물에서 자동으로 제외됩니다.</div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- 상세 드로어 ---------------- */}
      {detail && (
        <>
          <div className={styles.scrim} onClick={() => setDetailId(null)} />
          <aside className={styles.drawer}>
            <div className={styles.drawerHead}>
              <Chip tone={KIND_TONE[detail.kind]}>{detail.kind}</Chip>
              <span className={styles.drawerTitle}>{detail.title}</span>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="닫기"
                onClick={() => setDetailId(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.player}>
                <div className={styles.playerBox}>
                  <img
                    src={detail.thumb}
                    alt=""
                    className={
                      detail.kind === '숏폼' ? styles.playerImgShort : styles.playerImgWide
                    }
                  />
                </div>
                <div className={styles.playerMeta}>
                  <span>원본</span>
                  <span className={styles.playerMetaStrong}>
                    {detail.parts
                      .map(([x, y]) => `${timeText(x)}–${timeText(y)}`)
                      .join(', ')}
                  </span>
                  <span style={{ marginLeft: 'auto' }}>{timeText(totalOf(detail))}</span>
                </div>
              </div>

              <div className={styles.detailSide}>
                <div>
                  <div className={styles.detailLabel}>타이틀</div>
                  <div className={styles.detailTitleText}>{detail.title}</div>
                </div>

                <div>
                  <div className={styles.detailLabel}>
                    추천 근거 <span className={styles.detailScore}>{detail.score}점</span>
                  </div>
                  <div className={styles.reasonChips}>
                    {detail.reasons.map((r) => (
                      <span key={r} className={styles.reasonChip}>
                        {r}
                      </span>
                    ))}
                  </div>
                  <div className={styles.detailPeople}>등장 인물 · {detail.people.join(', ')}</div>
                </div>

                <div>
                  <div className={styles.detailLabel}>자막</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.subs.map((sub, i) => (
                      <div key={i} className={styles.subRow}>
                        <span className={styles.subAt}>{timeText(sub.t)}</span>
                        <span className={styles.subText}>{sub.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.drawerFoot}>
              <button
                type="button"
                className={styles.footBtn}
                onClick={() => say('내려받기를 시작합니다')}
              >
                다운로드
              </button>
              <button
                type="button"
                className={`${styles.footBtn} ${styles.footSpacer}`}
                onClick={() => onNavigate('media')}
              >
                미디어에서 편집
              </button>
              <button
                type="button"
                className={
                  deployed[detail.id] ? `${styles.deployBtn} ${styles.deployBtnOff}` : styles.deployBtn
                }
                onClick={() => {
                  if (deployed[detail.id]) return
                  setDeployed((d) => ({ ...d, [detail.id]: true }))
                  say('배포를 요청했습니다 — 배포 메뉴에서 진행 상황을 볼 수 있습니다')
                }}
              >
                {deployed[detail.id] ? '배포 요청됨' : '배포'}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ---------------- 원본 영상 ---------------- */}
      {sourceOpen && (
        <>
          <button
            type="button"
            className={styles.sourceScrim}
            aria-label="원본 영상 닫기"
            onClick={() => setSourceOpen(false)}
          />
          <div className={styles.sourceModal} role="dialog" aria-label="원본 영상" aria-modal="true">
            <div className={styles.sourceHead}>
              <div style={{ minWidth: 0 }}>
                <strong>{job.name} 원본</strong>
                <span>{SOURCE.file}</span>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="닫기"
                onClick={() => setSourceOpen(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.sourceStage}>
              <img src={ITEMS[0]?.thumb} alt="" />
              <button
                type="button"
                className={styles.sourcePlayBig}
                aria-label="재생"
                onClick={() => say('목업 화면이라 실제 재생은 되지 않습니다')}
              >
                ▶
              </button>
              <div className={styles.sourceBar}>
                <span className={styles.sourceTime}>0:00</span>
                <span className={styles.sourceTrack}>
                  <span className={styles.sourceFill} />
                </span>
                <span className={styles.sourceTime}>{SOURCE.duration}</span>
              </div>
            </div>

            <div className={styles.sourceFoot}>
              <dl className={styles.sourceSpecs}>
                <div><dt>길이</dt><dd>{SOURCE.duration}</dd></div>
                <div><dt>규격</dt><dd>{SOURCE.spec}</dd></div>
                <div><dt>용량</dt><dd>{SOURCE.size}</dd></div>
                <div><dt>올린 때</dt><dd>{SOURCE.uploaded}</dd></div>
              </dl>
              <button
                type="button"
                className={styles.sourceDownload}
                onClick={() => say(`원본 내려받기 — ${SOURCE.file} (${SOURCE.size})`)}
              >
                ↓ 원본 내려받기
              </button>
            </div>
          </div>
        </>
      )}

      {newJob && (
        <AnalysisRequest
          program={newJob.program}
          onClose={() => setNewJob(null)}
          onDone={say}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  )
}

/* ================================================================== */

function PeopleTab({
  people,
  unknowns,
  regForm,
  onRegForm,
  onRegister,
  onSay,
}: {
  people: Array<Person & { share?: number; scenes?: number }>
  unknowns: Unknown[]
  regForm: Record<string, { name?: string; role?: string }>
  onRegForm: (
    fn: (prev: Record<string, { name?: string; role?: string }>) => Record<
      string,
      { name?: string; role?: string }
    >,
  ) => void
  onRegister: (u: Unknown, name: string, role: string) => void
  onSay: (text: string) => void
}) {
  /* 아바타를 누르면 크게 봅니다 — 목록 안에서 앞뒤로 넘길 수 있습니다 */
  const [photo, setPhoto] = useState<number | null>(null)

  const faces = [
    ...people.map((p) => {
      const idx = PEOPLE.findIndex((x) => x.name === p.name)
      return {
        key: p.name,
        initials: p.name.slice(-2),
        color: p.color,
        name: p.name,
        role: p.role,
        lines: [
          `등장 비중 ${idx >= 0 ? shareOf(idx) : (p.share ?? 0)}%`,
          `등장 장면 ${idx >= 0 ? scenesOf(idx).length : (p.scenes ?? 0)}개`,
          `포함 생성물 ${ITEMS.filter((it) => it.people.includes(p.name)).length}개`,
        ],
      }
    }),
    ...unknowns.map((u) => ({
      key: u.id,
      initials: '?',
      color: 'var(--bg-card-hover)',
      name: u.label,
      role: '미등록 인물',
      lines: [
        `처음 등장 ${timeText(u.first)}`,
        `등장 장면 ${u.scenes}개`,
        `화면 비중 ${u.share}%`,
      ],
    })),
  ]
  const face = photo != null ? faces[photo] : null

  return (
    <div className={styles.peopleStack}>
      <div className={styles.peopleCard}>
        <div className={styles.peopleHead}>
          <span className={styles.peopleTitle}>
            등록된 인물 <span style={{ color: 'var(--bg-active)' }}>{people.length}</span>
          </span>
        </div>
        <div className={styles.regHead}>
          <span>인물</span>
          <span>등장 비중</span>
          <span>등장 장면</span>
          <span>포함 생성물</span>
        </div>
        {people.map((p) => {
          const idx = PEOPLE.findIndex((x) => x.name === p.name)
          const scenes = idx >= 0 ? scenesOf(idx).length : (p.scenes ?? 0)
          const share = idx >= 0 ? shareOf(idx) : (p.share ?? 0)
          const items = ITEMS.filter((it) => it.people.includes(p.name)).length
          return (
            <div key={p.name} className={styles.regRow}>
              <div className={styles.regPerson}>
                <button
                  type="button"
                  className={styles.avatarBtn}
                  title="사진 크게 보기"
                  style={{ background: p.color }}
                  onClick={() => setPhoto(faces.findIndex((f) => f.key === p.name))}
                >
                  {p.name.slice(-2)}
                </button>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.regName}>{p.name}</div>
                  <div className={styles.regRole}>{p.role}</div>
                </div>
              </div>
              <div className={styles.shareCell}>
                <div className={styles.shareTrack}>
                  <div
                    className={styles.shareBar}
                    style={{ width: `${share}%`, background: p.color }}
                  />
                </div>
                <span className={styles.sharePct}>{share}%</span>
              </div>
              <span className={styles.regCell}>{scenes}개</span>
              <span className={styles.regCell}>{items}개</span>
            </div>
          )
        })}
      </div>

      <div className={styles.peopleCard}>
        <div className={styles.peopleHead}>
          <span className={styles.peopleTitle}>
            미등록 인물 <span style={{ color: '#D97706' }}>{unknowns.length}</span>
          </span>
          <span className={styles.peopleNote}>
            이름을 넣어 등록하면 다음 분석부터 자동으로 알아봅니다
          </span>
        </div>

        {unknowns.map((u) => {
          const f = regForm[u.id] ?? {}
          return (
            <div key={u.id} className={styles.unregRow}>
              <button
                type="button"
                className={`${styles.avatarBtn} ${styles.avatarUnknown}`}
                title="사진 크게 보기"
                onClick={() => setPhoto(faces.findIndex((f) => f.key === u.id))}
              >
                ?
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.regName}>{u.label}</div>
                <div className={styles.regRole}>
                  처음 등장 {timeText(u.first)} · 장면 {u.scenes}개 · 화면 {u.share}%
                  {u.note ? ` · ${u.note}` : ''}
                </div>
              </div>
              <input
                type="text"
                className={styles.unregInput}
                placeholder="이름 입력"
                value={f.name ?? ''}
                onChange={(e) =>
                  onRegForm((prev) => ({
                    ...prev,
                    [u.id]: { ...(prev[u.id] ?? {}), name: e.target.value },
                  }))
                }
              />
              <input
                type="text"
                className={styles.unregInput}
                placeholder="역할 (예: 게스트)"
                value={f.role ?? ''}
                onChange={(e) =>
                  onRegForm((prev) => ({
                    ...prev,
                    [u.id]: { ...(prev[u.id] ?? {}), role: e.target.value },
                  }))
                }
              />
              <button
                type="button"
                className={styles.unregBtn}
                onClick={() => {
                  const name = (f.name ?? '').trim()
                  if (!name) {
                    onSay('이름을 입력하세요')
                    return
                  }
                  onRegister(u, name, (f.role ?? '').trim())
                }}
              >
                등록
              </button>
            </div>
          )
        })}

        {unknowns.length === 0 && (
          <div className={styles.unregEmpty}>미등록 인물이 없습니다.</div>
        )}
      </div>

      {/* ---------------- 인물 사진 크게 보기 ---------------- */}
      {face && (
        <div className={styles.scrim} onClick={() => setPhoto(null)}>
          <div
            className={styles.faceModal}
            role="dialog"
            aria-modal
            aria-label={`${face.name} 사진`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.faceBig} style={{ background: face.color }}>
              {face.initials}
            </div>
            <div className={styles.faceBody}>
              <div className={styles.faceName}>{face.name}</div>
              <div className={styles.faceRole}>{face.role}</div>
              <div className={styles.faceLines}>
                {face.lines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
              <div className={styles.faceNav}>
                <button
                  type="button"
                  className={styles.faceNavBtn}
                  aria-label="이전 인물"
                  onClick={() => setPhoto((i) => (i! - 1 + faces.length) % faces.length)}
                >
                  ‹
                </button>
                <span className={styles.facePos}>
                  {photo! + 1} / {faces.length}
                </span>
                <button
                  type="button"
                  className={styles.faceNavBtn}
                  aria-label="다음 인물"
                  onClick={() => setPhoto((i) => (i! + 1) % faces.length)}
                >
                  ›
                </button>
              </div>
            </div>
            <button
              type="button"
              className={styles.faceClose}
              aria-label="닫기"
              onClick={() => setPhoto(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
