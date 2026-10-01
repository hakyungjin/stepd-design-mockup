import type { CSSProperties } from 'react'
import { PLATFORM_BADGE, PLATFORM_NAME, STATUS_SHORT, STATUS_STYLE } from '../constants'
import type { DeployStatus, PlatformKey, PlatformStatusMap } from '../types'
import styles from './calendar.module.css'

/** 상태색(글자/배경/테두리)을 인라인 스타일로 */
export const statusColors = (status: DeployStatus): CSSProperties => ({
  color: STATUS_STYLE[status].fg,
  background: STATUS_STYLE[status].bg,
  borderColor: STATUS_STYLE[status].border,
})

export const statusTextColor = (status: DeployStatus): CSSProperties => ({
  color: STATUS_STYLE[status].fg,
})

export interface PlatformChipsProps {
  pl: PlatformStatusMap
  /** 'sm' = 캘린더 카드, 'lg' = 오늘 뷰 / 넓은 영역 */
  size?: 'sm' | 'lg'
  /** '완료' 처럼 상태 라벨을 고정하고 싶을 때 */
  labelOf?: (status: DeployStatus) => string
}

/** "YT 예약" 형태의 플랫폼별 상태 칩 묶음 */
export function PlatformChips({ pl, size = 'sm', labelOf }: PlatformChipsProps) {
  const entries = Object.entries(pl) as Array<[PlatformKey, DeployStatus]>
  return (
    <>
      {entries.map(([key, status]) => (
        <span
          key={key}
          title={`${PLATFORM_NAME[key]} · ${status}`}
          className={size === 'lg' ? `${styles.plChip} ${styles.plChipLg}` : styles.plChip}
          style={statusColors(status)}
        >
          {PLATFORM_BADGE[key].short} {labelOf ? labelOf(status) : STATUS_SHORT[status]}
        </span>
      ))}
    </>
  )
}
