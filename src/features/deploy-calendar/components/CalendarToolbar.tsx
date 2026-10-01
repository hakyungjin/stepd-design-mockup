import { Btn } from '@/components/ui/Btn'
import { Pill, Segment } from '@/components/ui/Controls'
import type { CalendarView } from '../types'
import styles from './calendar.module.css'

const VIEWS: Array<{ key: CalendarView; label: string }> = [
  { key: 'today', label: '오늘' },
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
]

export interface SubTab {
  key: string
  label: string
  active: boolean
  onSelect: () => void
}

export interface CalendarToolbarProps {
  view: CalendarView
  onViewChange: (v: CalendarView) => void
  subTabs: SubTab[]
  rangeLabel: string
  /** 주 단위 앞뒤로 넘기기 — 주간 뷰에서만 넘어옵니다 */
  onStepRange?: (delta: number) => void
  onOpenAdd: () => void
}

export function CalendarToolbar({
  view,
  onViewChange,
  subTabs,
  rangeLabel,
  onStepRange,
  onOpenAdd,
}: CalendarToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <Segment>
        {VIEWS.map((v) => (
          <Pill key={v.key} active={view === v.key} onClick={() => onViewChange(v.key)}>
            {v.label}
          </Pill>
        ))}
      </Segment>

      {subTabs.length > 0 && (
        <Segment>
          {subTabs.map((t) => (
            <Pill key={t.key} active={t.active} onClick={t.onSelect}>
              {t.label}
            </Pill>
          ))}
        </Segment>
      )}

      {onStepRange ? (
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepBtn}
            aria-label="이전 주"
            title="이전 주"
            onClick={() => onStepRange(-1)}
          >
            ‹
          </button>
          <span className={styles.rangeLabel}>{rangeLabel}</span>
          <button
            type="button"
            className={styles.stepBtn}
            aria-label="다음 주"
            title="다음 주"
            onClick={() => onStepRange(1)}
          >
            ›
          </button>
        </div>
      ) : (
        <span className={styles.rangeLabel}>{rangeLabel}</span>
      )}

      <div className={styles.spacer} />

      <Btn variant="primary" size="sm" onClick={onOpenAdd}>
        + 배포 추가
      </Btn>
    </div>
  )
}
