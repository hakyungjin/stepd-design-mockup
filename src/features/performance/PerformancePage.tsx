import { useMemo, useState, type MouseEvent } from 'react'
import { Chip } from '@/components/ui/Badge'
import { Pill, Segment, Select } from '@/components/ui/Controls'
import { PageTopBar } from '@/layout/AppShell'
import type { ScreenKey } from '@/app/screens'
import {
  CHANNELS,
  CHANNEL_SHARE,
  DAYS,
  EDIT_EFFECTS,
  INSIGHTS,
  MAN,
  PERF_VIDEOS,
  STATUS_TONE,
  TYPE_LABEL,
  TYPE_SHARE,
  WON,
  WON_MAN,
  ageText,
  type MetricKey,
  type PerfVideo,
} from './data'
import styles from './PerformancePage.module.css'

type Period = '7' | '30' | 'custom'
type Unit = 'day' | 'week'
type SortKey = keyof Pick<
  PerfVideo,
  'title' | 'type' | 'rev' | 'views' | 'rpm' | 'comp' | 'ctr' | 'ageH' | 'status'
>

const HEADS: Array<[SortKey, string, 'left' | 'right']> = [
  ['title', '영상', 'left'],
  ['type', '유형', 'left'],
  ['rev', '수익', 'right'],
  ['views', '조회수', 'right'],
  ['rpm', 'RPM', 'right'],
  ['comp', '완주율', 'right'],
  ['ctr', 'CTR', 'right'],
  ['ageH', '게시 후', 'right'],
  ['status', '상태', 'right'],
]

const CHART_W = 1000
const CHART_H = 220

export type UserRole = 'owner' | 'admin' | 'member'

export interface PerformancePageProps {
  role?: UserRole
  onNavigate: (screen: ScreenKey) => void
}

interface ChartPoint {
  label: string
  views: number
  rev: number
  rpm: number
}

export function PerformancePage({ role = 'owner', onNavigate }: PerformancePageProps) {
  const [period, setPeriod] = useState<Period>('30')
  const [from, setFrom] = useState('2026-09-10')
  const [to, setTo] = useState('2026-09-30')
  const [channel, setChannel] = useState('all')
  const [type, setType] = useState('all')
  const [metricPick, setMetricPick] = useState<MetricKey>('rev')
  const [unitPick, setUnitPick] = useState<Unit>('day')
  const [sortKey, setSortKey] = useState<SortKey>('rev')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [hover, setHover] = useState<number | null>(null)

  const canSeeRevenue = role !== 'member'

  /* ---------------- 기간 구간 ---------------- */
  let a = 0
  let b = 29
  if (period === '7') a = 23
  if (period === 'custom') {
    a = Math.max(0, Math.min(29, Number(from.slice(8)) - 1))
    b = Math.max(a, Math.min(29, Number(to.slice(8)) - 1))
  }

  const channelFactor = channel === 'all' ? 1 : (CHANNEL_SHARE[channel] ?? 1)
  const [typeViews, typeRev, avgCompletion] = TYPE_SHARE[type]

  const slice = useMemo(
    () =>
      DAYS.slice(a, b + 1).map((d) => ({
        ...d,
        views: d.views * channelFactor * typeViews,
        rev: d.rev * channelFactor * typeRev,
      })),
    [a, b, channelFactor, typeViews, typeRev],
  )

  const weekAvailable = slice.length >= 14
  const unit: Unit = weekAvailable ? unitPick : 'day'

  const points: ChartPoint[] = useMemo(() => {
    const build = (label: string, views: number, rev: number) => ({
      label,
      views,
      rev,
      rpm: views ? (rev / views) * 1000 : 0,
    })
    if (unit === 'week') {
      const out: ChartPoint[] = []
      for (let i = 0; i < slice.length; i += 7) {
        const g = slice.slice(i, i + 7)
        out.push(
          build(
            `${g[0].md}~${g[g.length - 1].md}`,
            g.reduce((x, y) => x + y.views, 0),
            g.reduce((x, y) => x + y.rev, 0),
          ),
        )
      }
      return out
    }
    return slice.map((d) => build(d.md, d.views, d.rev))
  }, [slice, unit])

  /* ---------------- KPI ---------------- */
  const totalViews = slice.reduce((x, y) => x + y.views, 0)
  const totalRev = slice.reduce((x, y) => x + y.rev, 0)
  const subscribers = Math.round((8420 * totalViews) / 12_840_000)

  const kpis = [
    { label: '총 조회수', value: MAN(totalViews), delta: '▲ 12.4% 이전 기간 대비', ok: true },
    {
      label: '총 수익',
      value: canSeeRevenue ? WON_MAN(totalRev) : '비공개',
      delta: canSeeRevenue ? '▲ 21.8% 이전 기간 대비' : '권한 없음',
      ok: canSeeRevenue,
    },
    {
      label: 'RPM',
      value: canSeeRevenue ? WON((totalRev / totalViews) * 1000) : '비공개',
      delta: canSeeRevenue ? '▲ 8.4% · 1,000회당 수익' : '권한 없음',
      ok: canSeeRevenue,
    },
    { label: '평균 완주율', value: `${avgCompletion.toFixed(1)}%`, delta: '▲ 2.1%p 이전 기간 대비', ok: true },
    {
      label: '구독자 순증',
      value: `+${subscribers.toLocaleString('ko-KR')}`,
      delta: '▲ 1,230명 이전 기간 대비',
      ok: true,
    },
  ]

  /* ---------------- 차트 기하 ---------------- */
  const metric: MetricKey = !canSeeRevenue && metricPick !== 'views' ? 'views' : metricPick
  const values = points.map((p) => p[metric])
  const maxV = Math.max(...values) * 1.12
  const minV = metric === 'rpm' ? Math.min(...values) * 0.85 : 0
  const X = (i: number) => (points.length === 1 ? CHART_W / 2 : (i / (points.length - 1)) * CHART_W)
  const Y = (v: number) => CHART_H - ((v - minV) / (maxV - minV || 1)) * CHART_H
  const linePath = points
    .map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p[metric]).toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L${X(points.length - 1).toFixed(1)} ${CHART_H} L${X(0).toFixed(1)} ${CHART_H} Z`
  const pct = (i: number) => (X(i) / CHART_W) * 100

  const ticks =
    points.length <= 1
      ? [points[0]?.label ?? '']
      : [points[0].label, points[Math.floor((points.length - 1) / 2)].label, points[points.length - 1].label]

  const hoverIndex = hover != null && hover < points.length ? hover : null
  const hoverPoint = hoverIndex != null ? points[hoverIndex] : null
  const hoverX = hoverIndex != null ? pct(hoverIndex) : 0

  const onChartMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const raw = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1))
    const clamped = Math.max(0, Math.min(points.length - 1, raw))
    if (clamped !== hover) setHover(clamped)
  }

  /* ---------------- 테이블 ---------------- */
  const rows = useMemo(() => {
    const list = PERF_VIDEOS.filter(
      (v) => (channel === 'all' || v.channel === channel) && (type === 'all' || v.type === type),
    )
    return list.sort((x, y) => {
      const p = x[sortKey]
      const q = y[sortKey]
      return (typeof p === 'string' ? p.localeCompare(q as string, 'ko') : p - (q as number)) * sortDir
    })
  }, [channel, sortDir, sortKey, type])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(key)
      setSortDir(key === 'title' || key === 'type' || key === 'ageH' ? 1 : -1)
    }
  }

  const resetHover = () => setHover(null)

  return (
    <>
      <PageTopBar title="성과" />

      <div className={styles.page}>
        {/* ---------------- 필터 ---------------- */}
        <div className={styles.filters}>
          <span className={styles.filterLabel}>기간</span>
          <Segment>
            {(
              [
                ['7', '최근 7일'],
                ['30', '최근 30일'],
                ['custom', '직접 선택'],
              ] as Array<[Period, string]>
            ).map(([k, label]) => (
              <Pill
                key={k}
                active={period === k}
                onClick={() => {
                  setPeriod(k)
                  resetHover()
                }}
              >
                {label}
              </Pill>
            ))}
          </Segment>

          {period === 'custom' && (
            <div className={styles.dateRange}>
              <input
                type="date"
                className={styles.dateInput}
                min="2026-09-01"
                max="2026-09-30"
                value={from}
                onChange={(e) => {
                  if (e.target.value) setFrom(e.target.value)
                  resetHover()
                }}
              />
              <span style={{ color: 'var(--text-muted)' }}>-</span>
              <input
                type="date"
                className={styles.dateInput}
                min="2026-09-01"
                max="2026-09-30"
                value={to}
                onChange={(e) => {
                  if (e.target.value) setTo(e.target.value)
                  resetHover()
                }}
              />
            </div>
          )}

          <span className={styles.divider} />
          <span className={styles.filterLabel}>채널</span>
          <Select
            look="plain"
            aria-label="채널"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value)
              resetHover()
            }}
          >
            <option value="all">전체 채널</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <span className={styles.divider} />
          <span className={styles.filterLabel}>유형</span>
          <Segment>
            {[
              ['all', '전체'],
              ['short', '숏폼'],
              ['clip', '클립'],
              ['hl', '하이라이트'],
            ].map(([k, label]) => (
              <Pill
                key={k}
                active={type === k}
                onClick={() => {
                  setType(k)
                  resetHover()
                }}
              >
                {label}
              </Pill>
            ))}
          </Segment>

          <span className={styles.rangeNote}>
            9/{a + 1} – 9/{b + 1} ({b - a + 1}일) · 업로드 전용 채널 1곳 제외
          </span>
        </div>

        {/* ---------------- KPI ---------------- */}
        <div className={styles.kpiGrid}>
          {kpis.map((k) => (
            <div key={k.label} className={styles.kpiCard}>
              <span className={styles.kpiLabel}>{k.label}</span>
              <span className={styles.kpiValue}>{k.value}</span>
              <span className={k.ok ? styles.kpiDelta : styles.kpiDeltaMuted}>{k.delta}</span>
            </div>
          ))}
        </div>

        {/* ---------------- 수익 추이 ---------------- */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>수익 추이</span>
            <span className={styles.cardNote}>
              그래프에 올리면 날짜별 수익·조회수·RPM 을 봅니다
            </span>
            <div className={styles.headActions}>
              <Segment className={styles.segmentInput}>
                {(
                  [
                    ['rev', '수익'],
                    ['views', '조회수'],
                    ['rpm', 'RPM'],
                  ] as Array<[MetricKey, string]>
                ).map(([k, label]) => {
                  const locked = !canSeeRevenue && k !== 'views'
                  return (
                    <Pill
                      key={k}
                      active={metric === k}
                      disabled={locked}
                      style={locked ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                      onClick={() => !locked && setMetricPick(k)}
                    >
                      {label}
                    </Pill>
                  )
                })}
              </Segment>
              <Segment className={styles.segmentInput}>
                {(
                  [
                    ['day', '일'],
                    ['week', '주'],
                  ] as Array<[Unit, string]>
                ).map(([k, label]) => {
                  const locked = k === 'week' && !weekAvailable
                  return (
                    <Pill
                      key={k}
                      active={unit === k}
                      disabled={locked}
                      style={locked ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                      onClick={() => {
                        if (locked) return
                        setUnitPick(k)
                        resetHover()
                      }}
                    >
                      {label}
                    </Pill>
                  )
                })}
              </Segment>
            </div>
          </div>

          <div className={styles.chartBox} onMouseMove={onChartMove} onMouseLeave={resetHover}>
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              className={styles.chartSvg}
              aria-hidden
            >
              <defs>
                <linearGradient id="perfArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1C60FF" stopOpacity=".42" />
                  <stop offset="100%" stopColor="#1C60FF" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[55, 110, 165].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2={CHART_W}
                  y2={y}
                  stroke="#2A2E3B"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path d={areaPath} fill="url(#perfArea)" />
              <path
                d={linePath}
                fill="none"
                stroke="#1C60FF"
                strokeWidth={2.5}
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {hoverPoint && (
              <>
                <div className={styles.hoverLine} style={{ left: `${hoverX}%` }} />
                <div
                  className={styles.hoverDot}
                  style={{
                    left: `${hoverX}%`,
                    top: `${(Y(hoverPoint[metric]) / CHART_H) * 100}%`,
                  }}
                />
                <div
                  className={styles.tooltip}
                  style={{
                    left: `${hoverX}%`,
                    transform: `translateX(${hoverX > 70 ? 'calc(-100% - 12px)' : '12px'})`,
                  }}
                >
                  <div className={styles.tipDate}>{hoverPoint.label}</div>
                  <div className={styles.tipRow}>
                    <span className={styles.tipKey}>수익</span>
                    <b className={styles.tipVal}>
                      {canSeeRevenue ? WON(hoverPoint.rev) : '비공개'}
                    </b>
                  </div>
                  <div className={styles.tipRow}>
                    <span className={styles.tipKey}>조회수</span>
                    <b className={styles.tipVal}>{MAN(hoverPoint.views)}</b>
                  </div>
                  <div className={styles.tipRow}>
                    <span className={styles.tipKey}>RPM</span>
                    <b className={styles.tipVal}>{canSeeRevenue ? WON(hoverPoint.rpm) : '—'}</b>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className={styles.chartTicks}>
            {ticks.map((t, i) => (
              <span key={`${t}-${i}`}>{t}</span>
            ))}
          </div>
        </section>

        {/* ---------------- 콘텐츠 성과 ---------------- */}
        <section className={styles.tableCard}>
          <div className={styles.tableHead}>
            <span className={styles.cardTitle}>콘텐츠 성과</span>
            <span className={styles.cardNote}>실제 돈 버는 영상 · 머리글을 누르면 정렬</span>
            <span className={styles.tableCount}>{rows.length}개</span>
          </div>

          <div className={styles.headRow}>
            {HEADS.map(([key, label, align]) => (
              <button
                key={key}
                type="button"
                className={[
                  styles.headBtn,
                  align === 'left' ? styles.headLeft : styles.headRight,
                  sortKey === key ? styles.headBtnActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => toggleSort(key)}
              >
                {label}
                {sortKey === key ? (sortDir < 0 ? ' ↓' : ' ↑') : ''}
              </button>
            ))}
          </div>

          {rows.map((v) => (
            <div key={v.title} className={styles.row}>
              <div className={styles.rowTitleCell}>
                <img src={v.thumb} alt="" className={styles.rowThumb} />
                <div className={styles.rowTitleBox}>
                  <span className={styles.rowTitle}>{v.title}</span>
                  <span className={styles.rowChannel}>{v.channel}</span>
                </div>
              </div>
              <span className={styles.cellText}>{TYPE_LABEL[v.type]}</span>
              <span className={styles.cellNumBold}>{canSeeRevenue ? WON(v.rev) : '비공개'}</span>
              <span className={styles.cellNum}>{MAN(v.views)}</span>
              <span className={styles.cellNum}>{canSeeRevenue ? WON(v.rpm) : '—'}</span>
              <span className={styles.cellNum}>{v.comp}%</span>
              <span className={styles.cellNum}>{v.ctr}%</span>
              <span className={styles.cellMuted}>{ageText(v.ageH)}</span>
              <div className={styles.cellEnd}>
                <Chip tone={STATUS_TONE[v.status]}>{v.status}</Chip>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className={styles.tableEmpty}>이 조건에 맞는 영상이 없습니다</div>
          )}

          <div className={styles.tableFoot}>
            상태: 급등 = 최근 24시간 조회수가 평소의 2배 이상 · 성장 = 3일 연속 증가 · 하락 = 3일 연속
            감소
          </div>
        </section>

        {/* ---------------- 인사이트 / 편집 비교 ---------------- */}
        <div className={styles.bottomGrid}>
          <section className={styles.card}>
            <div className={styles.tableHead}>
              <span className={styles.cardTitle}>패턴 인사이트</span>
              <span className={styles.cardNote}>다음 추천·편집·배포 전략</span>
            </div>
            {INSIGHTS.map((ins) => (
              <div key={ins.title} className={styles.insight}>
                <div className={styles.insightHead}>
                  <Chip tone="accent">{ins.area}</Chip>
                  <span className={styles.insightTitle}>{ins.title}</span>
                </div>
                <span className={styles.insightMetric}>{ins.metric}</span>
                <span className={styles.insightWhy}>{ins.why}</span>
                <div className={styles.insightFoot}>
                  <span className={styles.insightNext}>
                    <b className={styles.insightNextKey}>다음</b> · {ins.next}
                  </span>
                  <button
                    type="button"
                    className={styles.insightCta}
                    onClick={() => onNavigate(ins.to)}
                  >
                    {ins.cta}
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className={styles.card} style={{ gap: 14 }}>
            <div className={styles.compareHead}>
              <span className={styles.cardTitle}>추천안 대비 확정 편집 성과</span>
              <span className={styles.cardNote}>
                AI가 고른 조각을 사람이 어떻게 바꿨고, 그게 수익에 어떻게 이어졌나
              </span>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>AI 추천안 승인률</span>
                <span className={styles.statValue}>71%</span>
                <span className={styles.statNote}>추천 200개 중 142개 채택</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>편집자 수정 후 성과</span>
                <span className={styles.statValueGreen}>평균 수익 +18%</span>
                <span className={styles.statNote}>수정본 58개 vs 원안 그대로 84개</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>가장 많이 삭제된 장면</span>
                <span className={styles.statValueSm}>설명형 Sequence</span>
                <span className={styles.statNote}>38회 삭제 · 대부분 도입부</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>가장 많이 추가된 장면</span>
                <span className={styles.statValueSm}>인물 반응 Sequence</span>
                <span className={styles.statNote}>52회 추가 · 갈등 직후 배치</span>
              </div>
            </div>

            <div className={styles.editList}>
              <span className={styles.editListTitle}>편집 변화별 평균 수익 차이 (원안 대비)</span>
              {EDIT_EFFECTS.map(([label, n]) => (
                <div key={label} className={styles.editRow}>
                  <span className={styles.editLabel}>{label}</span>
                  <div className={styles.editTrack}>
                    <div
                      className={styles.editBar}
                      style={{
                        width: `${(Math.abs(n) / 24) * 100}%`,
                        background: n >= 0 ? '#1C60FF' : '#EF4444',
                      }}
                    />
                  </div>
                  <b
                    className={styles.editVal}
                    style={{
                      color: n >= 0 ? 'var(--status-success-text)' : 'hsl(var(--status-error))',
                    }}
                  >
                    {n > 0 ? '+' : ''}
                    {n}%
                  </b>
                </div>
              ))}
            </div>

            <span className={styles.footNote}>
              같은 회차·같은 채널 안에서 비교했습니다. 표본이 10개 미만인 항목은 뺐습니다.
            </span>
          </section>
        </div>
      </div>
    </>
  )
}
