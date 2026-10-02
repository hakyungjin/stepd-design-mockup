import { useState } from 'react'
import { DAYS7 } from '../constants'
import type { PlanEntry, Rule } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import { cx } from './shared'
import { DayQueue } from './DayQueue'
import styles from './schedule.module.css'

export interface BoardLook { days: number; dense: boolean; text: boolean }

/*
 * 발행 편성표 — 하루씩 봅니다. STEPD 본 저장소의 "배포 대기 영상" 화면을 따릅니다.
 *
 * 일간/주간 전환과 주간 격자는 뺐습니다. 한 화면에 거르개가 너무 많았고,
 * 실제로 손보는 일은 "오늘 무엇이 나가는가" 라서 하루 단위면 충분합니다.
 */
export function PlanBoard({ rule, plan, store, look }: { rule: Rule; plan: PlanEntry[]; store: AutoDeployStore; look: BoardLook }) {
  const [day, setDay] = useState(0)
  return <section className={cx(styles.planner, look.dense && styles.dense)} aria-label="플랫폼별 발행 편성표">
    <div className={styles.toolbar}>
      <div className={styles.period}><span className={styles.calendarIcon}>▦</span><strong>{DAYS7[day].label}</strong><span className={styles.periodYear}>2026</span><button type="button" className={styles.todayButton} onClick={() => setDay(0)}>오늘</button></div>
    </div>

    <div className={styles.dayPicker}>
      {DAYS7.map((d) => <button key={d.i} type="button" aria-pressed={day === d.i} onClick={() => setDay(d.i)}>{d.short} <span>{d.label}</span></button>)}
      {/* 빈 자리는 손으로 채워도 되고, 이 버튼으로 한 번에 채워도 됩니다 */}
      <button type="button" className={styles.autoFillBtn} title="이 날 비어 있는 자리를 아직 안 쓴 영상으로 채웁니다" onClick={() => store.autoFill(rule, day)}>
        ✦ 자동배치
      </button>
    </div>

    <div className={styles.dayPane}><DayQueue rule={rule} plan={plan} store={store} day={day} /></div>
  </section>
}
