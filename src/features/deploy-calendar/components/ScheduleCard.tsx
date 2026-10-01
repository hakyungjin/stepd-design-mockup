import type { DragEvent, MouseEvent } from 'react'
import { Thumb } from '@/components/ui/Controls'
import { durationText } from '@/lib/date'
import { PROGRAM_NAME, VIDEO_TYPE } from '../constants'
import type { DeployItem, Video } from '../types'
import { PlatformChips, statusTextColor } from './PlatformChips'
import styles from './calendar.module.css'

export interface SwapAnchor {
  x: number
  y: number
}

export interface ScheduleCardProps {
  item: DeployItem
  video: Video
  /** 예약 시각이 이미 지났는지 */
  past: boolean
  dragging: boolean
  onDragStart: (id: string) => void
  onDragEnd: () => void
  /** 영상 교체 팝오버 열기 */
  onOpenSwap: (id: string, anchor: SwapAnchor) => void
  /** 상세 드로어 열기 */
  onOpenDrawer: (id: string) => void
}

/**
 * 주간 캘린더 셀 안의 배포 카드.
 * - 카드 자체를 누르면 오른쪽에 영상 교체 팝오버
 * - 제목을 누르면 카드 아래에 영상 교체 팝오버
 * - ⋯ 버튼은 일정·플랫폼·상태 드로어
 */
export function ScheduleCard({
  item,
  video,
  past,
  dragging,
  onDragStart,
  onDragEnd,
  onOpenSwap,
  onOpenDrawer,
}: ScheduleCardProps) {
  const type = VIDEO_TYPE[video.type]
  const published = item.status === '게시 완료'
  const draggable = !published && !past

  /* 카드 색은 영상 유형을 따릅니다 */
  const surface = { background: type.bg, borderColor: type.border }

  const anchorRight = (e: MouseEvent<HTMLElement>): SwapAnchor => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: r.right + 6, y: r.top }
  }
  const anchorBelow = (e: MouseEvent<HTMLElement>): SwapAnchor => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: r.left, y: r.bottom + 4 }
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.dataTransfer.setData('text/plain', item.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(item.id)
  }

  const className = [
    styles.card,
    draggable ? styles.cardDraggable : '',
    dragging ? styles.cardDragging : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      style={surface}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      title={`${type.label} · ${durationText(video.dur)} · ${PROGRAM_NAME[video.prog]} — 누르면 영상 교체`}
      onClick={(e) => {
        e.stopPropagation()
        onOpenSwap(item.id, anchorRight(e))
      }}
    >
      <div className={styles.cardTop}>
        <Thumb src={video.thumb} width={22} height={22} radius={4} />
        <span className={styles.cardTime}>{item.time}</span>
        <span className={styles.cardStatus} style={statusTextColor(item.status)}>
          {item.status}
        </span>
      </div>

      <button
        type="button"
        className={styles.cardTitleBtn}
        title="이 시간에 배치할 영상 바꾸기"
        onClick={(e) => {
          e.stopPropagation()
          onOpenSwap(item.id, anchorBelow(e))
        }}
      >
        <span className={styles.cardTitle}>{video.title}</span>
        <span className={styles.caret}>▼</span>
      </button>

      <div className={styles.cardBottom}>
        <div className={styles.cardChips}>
          <PlatformChips pl={item.pl} />
        </div>
        <button
          type="button"
          className={styles.moreBtn}
          aria-label="설정"
          title="일정·플랫폼·상태 바꾸기"
          onClick={(e) => {
            e.stopPropagation()
            onOpenDrawer(item.id)
          }}
        >
          ⋯
        </button>
      </div>

      {!video.ready && <div className={styles.flagRender}>렌더링 미완료 · 끝나야 게시</div>}
      {item.test && <div className={styles.flagTest}>테스트 모드 · 비공개 먼저</div>}
    </div>
  )
}
