import { Btn } from '@/components/ui/Btn'
import { Pill, Segment } from '@/components/ui/Controls'
import type { CalendarView } from '../types'
import styles from './calendar.module.css'

const VIEWS: Array<{ key: CalendarView; label: string }> = [
  { key: 'today', label: '오늘' },
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
]

export interface CalendarToolbarProps {
  view: CalendarView
  onViewChange: (v: CalendarView) => void
  rangeLabel: string
  /** 한 칸씩 앞뒤로 넘기기 — 주간은 한 주, 월간은 한 달 */
  onStepRange?: (delta: number) => void
  onOpenAdd: () => void
}

export function CalendarToolbar({
  view,
  onViewChange,
  rangeLabel,
  onStepRange,
  onOpenAdd,
}: CalendarToolbarProps) {
  /* 달을 버튼으로 늘어놓으면 해가 쌓일수록 줄이 끝없이 길어집니다 — 화살표로 넘깁니다 */
  const unit = view === 'month' ? '달' : '주'
  return (
    <div className={styles.toolbar}>
      <Segment>
        {VIEWS.map((v) => (
          <Pill key={v.key} active={view === v.key} onClick={() => onViewChange(v.key)}>
            {v.label}
          </Pill>
        ))}
      </Segment>

      {onStepRange ? (
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepBtn}
            aria-label={`이전 ${unit}`}
            title={`이전 ${unit}`}
            onClick={() => onStepRange(-1)}
          >
            ‹
          </button>
          <span className={styles.rangeLabel}>{rangeLabel}</span>
          <button
            type="button"
            className={styles.stepBtn}
            aria-label={`다음 ${unit}`}
            title={`다음 ${unit}`}
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
