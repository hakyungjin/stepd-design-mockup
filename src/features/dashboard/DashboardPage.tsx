import { useState } from 'react'
import { Btn, type BtnVariant } from '@/components/ui/Btn'
import { Chip, StatusBadge, type StatusTone } from '@/components/ui/Badge'
import { PageTopBar } from '@/layout/AppShell'
import type { ScreenKey } from '@/app/screens'
import styles from './DashboardPage.module.css'

/* ------------------------------------------------------------------ *
 * 목 데이터 — STEPD 연동 시 props 로 교체
 * ------------------------------------------------------------------ */

const WON = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`

/** 00시부터 09시까지의 누적 수익 */
const CUMULATIVE = [14200, 26100, 35800, 43000, 49500, 56300, 67900, 84600, 104200, 128400]
/** 오늘 마감 예상 */
const CLOSING = 171000

const TOP_EARNERS: Array<[string, string, number]> = [
  ['영호 폭발 숏폼 (어제 게시)', 'Shorts', 38200],
  ['31회 최종 선택 하이라이트', 'YouTube', 27900],
  ['현숙의 선택, 모두가 놀란 이유', '네이버 클립', 15600],
]

type PlanState = 'scheduled' | 'review' | 'rendering' | 'failed' | 'published'

interface PlanRow {
  time: string
  title: string
  channel: string
  state: PlanState
}

const PLAN: PlanRow[] = [
  { time: '06:00', title: '옥순 눈물 숏폼', channel: 'YouTube · Instagram', state: 'published' },
  { time: '06:00', title: '기안84 요리 도전 숏폼', channel: 'YouTube · Instagram', state: 'published' },
  { time: '06:00', title: '윤하 정색 클립', channel: 'YouTube · Facebook', state: 'published' },
  { time: '06:00', title: '곽튜브 시장 탐방 숏폼', channel: 'YouTube · Instagram', state: 'published' },
  { time: '18:00', title: '영호 폭발 숏폼', channel: 'YouTube · Instagram · TikTok', state: 'scheduled' },
  { time: '18:00', title: '32회 갈등 클립', channel: 'YouTube · Facebook', state: 'scheduled' },
  { time: '18:00', title: '영숙·영호 하이라이트', channel: 'YouTube · Facebook', state: 'review' },
  { time: '18:00', title: '32회 예고 숏폼', channel: 'YouTube · Instagram', state: 'rendering' },
]

interface StateStyle {
  status: string
  tone: StatusTone
  pulse?: boolean
  action: string
  variant: BtnVariant
}

const STATE_STYLE: Record<PlanState, StateStyle> = {
  scheduled: { status: '예약됨', tone: 'idle', action: '일정 보기', variant: 'secondary' },
  review: { status: '승인 대기', tone: 'warn', action: '검수·승인', variant: 'primary' },
  rendering: { status: '렌더링 중', tone: 'progress', pulse: true, action: '확인', variant: 'secondary' },
  failed: { status: '렌더링 실패', tone: 'error', action: '확인', variant: 'danger' },
  published: { status: '게시 완료', tone: 'done', action: '성과 보기', variant: 'ghost' },
}

/* ------------------------------------------------------------------ */

export type UserRole = 'owner' | 'admin' | 'member'

export interface DashboardPageProps {
  /** member 는 수익을 볼 수 없습니다 */
  role?: UserRole
  onNavigate: (screen: ScreenKey) => void
}

export function DashboardPage({ role = 'owner', onNavigate }: DashboardPageProps) {
  /** 검수·승인을 누른 행 */
  const [approved, setApproved] = useState<Record<number, boolean>>({})

  const canSeeRevenue = role !== 'member'

  /* 누적 수익 스파크라인 */
  const W = 480
  const H = 96
  const max = CLOSING * 1.05
  const x = (hour: number) => (hour / 24) * W
  const y = (v: number) => H - (v / max) * H

  const points = CUMULATIVE.map((v, hour) => [x(hour), y(v)] as const)
  const linePath = points
    .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ')
  const last = points[points.length - 1]
  const areaPath = `${linePath} L${last[0].toFixed(1)} ${H} L0 ${H} Z`
  const projectionPath = `M${last[0].toFixed(1)} ${last[1].toFixed(1)} L${W} ${y(CLOSING).toFixed(1)}`

  const today = CUMULATIVE[CUMULATIVE.length - 1]

  return (
    <>
      <PageTopBar
        title="대시보드"
        right={<span className={styles.topBarMeta}>9월 30일 (수) · 09:00 기준</span>}
      />

      <div className={styles.page}>
        {/* ---------------- 오늘 수익 ---------------- */}
        <section className={styles.revenueCard}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>오늘 수익</span>
            <Chip tone="amber">추정 수익 · 확정 반영 전</Chip>
          </div>

          <div className={styles.revenueGrid}>
            <div className={styles.revenueLeft}>
              <div className={styles.revenueBlock}>
                <span className={styles.revenueLabel}>오늘 예상 수익</span>
                <span className={styles.revenueValue}>
                  {canSeeRevenue ? WON(today) : '비공개'}
                </span>
                {canSeeRevenue && (
                  <div className={styles.revenueDelta}>
                    <b className={styles.deltaUp}>+₩21,700 ▲20.3%</b>
                    <span className={styles.deltaNote}>09:00 기준 · 어제 같은 시각 대비</span>
                  </div>
                )}
              </div>
              <div className={styles.closeBox}>
                <span className={styles.closeLabel}>오늘 마감 예상</span>
                <b className={styles.closeValue}>{canSeeRevenue ? WON(CLOSING) : '비공개'}</b>
              </div>
            </div>

            <div className={styles.chartCol}>
              <div className={styles.chartLegend}>
                <span>시간별 누적 수익</span>
                <span>실선 실제 · 점선 예상</span>
              </div>
              <div className={styles.chartBox}>
                {canSeeRevenue ? (
                  <>
                    <svg
                      viewBox={`0 0 ${W} ${H}`}
                      preserveAspectRatio="none"
                      className={styles.chartSvg}
                      aria-hidden
                    >
                      <defs>
                        <linearGradient id="todayRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1C60FF" stopOpacity=".4" />
                          <stop offset="100%" stopColor="#1C60FF" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={areaPath} fill="url(#todayRev)" />
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#1C60FF"
                        strokeWidth={2.5}
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={projectionPath}
                        fill="none"
                        stroke="#1C60FF"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        opacity={0.6}
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    <div
                      className={styles.nowDot}
                      style={{ left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%` }}
                    />
                  </>
                ) : (
                  <div className={styles.masked}>수익 열람 권한 없음</div>
                )}
              </div>
              <div className={styles.chartAxis}>
                <span>00시</span>
                <span>09시</span>
                <span>24시</span>
              </div>
            </div>

            <div className={styles.topCol}>
              <span className={styles.topColTitle}>오늘 수익 기여 Top 3</span>
              {TOP_EARNERS.map(([title, channel, amount], i) => (
                <div key={title} className={styles.topRow}>
                  <span className={styles.topRank}>{i + 1}</span>
                  <div className={styles.topBody}>
                    <span className={styles.topTitle}>{title}</span>
                    <span className={styles.topChannel}>{channel}</span>
                  </div>
                  <b className={styles.topAmount}>{canSeeRevenue ? WON(amount) : '—'}</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- 오늘 배포 ---------------- */}
        <section className={styles.planCard}>
          <div className={styles.planHead}>
            <div className={styles.planHeadLeft}>
              <span className={styles.cardTitle}>오늘 배포</span>
              <span className={styles.planSub}>06시 4개 · 18시 4개</span>
              <span className={styles.planCount}>{PLAN.length}개</span>
            </div>
            <button
              type="button"
              className={styles.planLink}
              onClick={() => onNavigate('schedule')}
            >
              스케줄 전체
            </button>
          </div>

          <div>
            {PLAN.map((row, i) => {
              const style = STATE_STYLE[approved[i] ? 'scheduled' : row.state]
              const act = () => {
                if (style.action === '검수·승인') {
                  setApproved((prev) => ({ ...prev, [i]: true }))
                } else if (style.action === '일정 보기') {
                  onNavigate('schedule')
                } else if (style.action === '성과 보기') {
                  onNavigate('performance')
                } else {
                  onNavigate('dist')
                }
              }
              return (
                <div key={`${row.time}-${row.title}`} className={styles.planRow}>
                  <span className={styles.planTime}>{row.time}</span>
                  <span className={styles.planTitle}>{row.title}</span>
                  <span className={styles.planChannel}>{row.channel}</span>
                  <div>
                    <StatusBadge tone={style.tone} pulse={style.pulse}>
                      {style.status}
                    </StatusBadge>
                  </div>
                  <div className={styles.planAction}>
                    <Btn variant={style.variant} size="sm" onClick={act}>
                      {style.action}
                    </Btn>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}
