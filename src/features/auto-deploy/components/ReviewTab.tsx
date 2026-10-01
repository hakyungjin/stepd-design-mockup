/*
 * 발행 예정 탭 — 계획표 / 막힌 것 / 영상 상세.
 */

import type { ScreenKey } from '@/app/screens'
import { DAYS7, platOf } from '../constants'
import { upcomingOf } from '../domain/plan'
import type { Rule } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import { HoldDetail } from './HoldDetail'
import { PlanBoard, type BoardLook } from './PlanBoard'
import { SlotPopover } from './SlotPopover'
import { VideoLibrary } from './VideoLibrary'
import styles from './schedule.module.css'
import emptyStyles from './board.module.css'

interface BlockedRow {
  title: string
  desc: string
  dot: string
  auto?: boolean
  action?: string
  onAction?: () => void
}

export function ReviewTab({
  rule,
  store,
  look,
  onNavigate,
}: {
  rule: Rule
  store: AutoDeployStore
  look: BoardLook
  onNavigate: (screen: ScreenKey) => void
}) {
  const plan = store.planOf(rule)
  const up = upcomingOf(plan)
  const titleOf = (h: { line1: string; title: string }) => h.line1 || h.title

  if (!rule.holds.length)
    return (
      <div className={emptyStyles.noHolds}>
        <span className={emptyStyles.noHoldsMark}>✓</span>
        <div className={emptyStyles.noHoldsTitle}>발행 예정 영상이 없습니다</div>
        <div className={emptyStyles.noHoldsNote}>순방이 새 회차를 분석하면 계획을 채웁니다.</div>
      </div>
    )

  if (store.focus) return <HoldDetail rule={rule} store={store} />

  /* 실제로 나갈 수 있는 것 중 가장 빠른 건 */
  const live = up
    .filter((p) => {
      const c = rule.channels.find((x) => x.name === p.ch)
      const h = rule.holds.find((x) => x.id === p.hid)
      return c && !c.expired && !c.gated && h && !h.rendering
    })
    .sort((a, b) => a.day - b.day || a.t.localeCompare(b.t))

  const blocked: BlockedRow[] = []
  rule.holds
    .filter((h) => h.rendering)
    .forEach((h) => {
      const ps = up.filter((p) => p.hid === h.id)
      if (!ps.length) return
      blocked.push({
        title: `렌더 중 · ${titleOf(h)}`,
        desc: `${ps
          .map(
            (p) =>
              `${platOf(rule.channels.find((c) => c.name === p.ch)?.icon ?? 'YT').name} ${DAYS7[p.day].short} ${p.t}`,
          )
          .join(', ')} 발행분 · 다시 굽는 중입니다 (50~90초)`,
        auto: true,
        dot: 'var(--bg-active)',
      })
    })
  rule.channels
    .filter((c) => c.expired)
    .forEach((c) => {
      const n = up.filter((p) => p.ch === c.name).length
      if (!n) return
      blocked.push({
        title: `채널 토큰 만료 · ${c.name}`,
        desc: `다시 연결할 때까지 이 채널의 발행 ${n}건이 나가지 않습니다`,
        dot: 'var(--color-amber-600)',
        action: '재연결 →',
        onAction: () => onNavigate('channels'),
      })
    })
  if (store.credit <= 0)
    blocked.push({
      title: '크레딧 없음 · 자동 충전 실패',
      desc: `잔액이 없어 발행 ${up.length}건이 멈춰 있습니다`,
      dot: 'hsl(var(--status-error))',
      action: '충전 →',
      onAction: () => store.say('충전 화면으로 이동합니다'),
    })

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className={styles.headTitle}>
            발행 편성표 <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 15, marginLeft: 8 }}>{up.length}개 예정</span>
          </div>
          <div className={styles.headNote}>
            플랫폼별 일정을 한눈에 확인하고, 시간 이동 · 영상 교체 · 삭제를 바로 관리하세요.
          </div>
        </div>
        <div className={styles.nextPublish}>
          다음 발행<strong>{live[0] ? `${DAYS7[live[0].day].short} ${live[0].t}` : '없음'}</strong>
        </div>
      </div>

      {blocked.length > 0 && (
        <details className={styles.issuePanel}>
          <summary className={styles.issueSummary}>
            <strong>ⓘ 확인 필요 {blocked.length}건</strong>
            <span>{blocked.map((b) => b.auto ? '영상 렌더 중' : b.title.split(' · ')[0]).join(' · ')}</span>
          </summary>
          {blocked.map((b) => (
            <div key={b.title} className={styles.blockedRow}>
              <span className={styles.dot} style={{ background: b.dot }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.blockedTitle}>{b.title}</div>
                <div className={styles.blockedDesc}>{b.desc}</div>
              </div>
              {b.action && (
                <button type="button" className={styles.blockedLink} onClick={b.onAction}>
                  {b.action}
                </button>
              )}
              {b.auto && <span className={styles.blockedAuto}>끝나면 자동으로 나감</span>}
            </div>
          ))}
        </details>
      )}

      <PlanBoard rule={rule} plan={plan} store={store} look={look} />
      <VideoLibrary rule={rule} plan={plan} store={store} />
      <SlotPopover rule={rule} plan={plan} store={store} />
    </div>
  )
}
