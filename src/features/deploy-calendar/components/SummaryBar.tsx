import styles from './calendar.module.css'

export interface SummaryLegendItem {
  label: string
  color: string
}

export interface SummaryBarProps {
  /** '오늘' / '이번 주' / '9월' 같은 범위 이름 */
  label: string
  total: number
  upcoming: number
  perPlatform: Array<{ name: string; count: number }>
  waiting: number
  rendering: number
  failed: number
  legend: SummaryLegendItem[]
}

export function SummaryBar({
  label,
  total,
  upcoming,
  perPlatform,
  waiting,
  rendering,
  failed,
  legend,
}: SummaryBarProps) {
  return (
    <div className={styles.summary}>
      <span className={styles.summaryMain}>
        {label} <b className={styles.summaryTotal}>{total}건</b> · 예약{' '}
        <b className={styles.summaryStrong}>{upcoming}</b>
      </span>

      <span className={styles.divider} />

      <div className={styles.summaryGroup}>
        {perPlatform.map((p) => (
          <span key={p.name}>
            {p.name} <b className={styles.summaryStrong}>{p.count}</b>
          </span>
        ))}
      </div>

      <span className={styles.divider} />

      <div className={styles.summaryStates}>
        <span className={styles.stateWarn}>
          승인 대기 <b>{waiting}</b>
        </span>
        <span className={styles.stateRender}>
          렌더링 중 <b>{rendering}</b>
        </span>
        <span className={styles.stateFail}>
          실패 <b>{failed}</b>
        </span>
      </div>

      <div className={styles.legend}>
        {legend.map((l) => (
          <span key={l.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
