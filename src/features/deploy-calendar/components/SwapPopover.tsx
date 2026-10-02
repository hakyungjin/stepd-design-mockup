import { Btn } from '@/components/ui/Btn'
import { Thumb } from '@/components/ui/Controls'
import { dowLabel, durationText, shortDate } from '@/lib/date'
import { PLATFORM_NAME, PROGRAM_NAME, VIDEO_TYPE } from '../constants'
import type { DeployItem, PlatformKey, Video } from '../types'
import type { SwapAnchor } from './ScheduleCard'
import styles from './overlays.module.css'

const POPOVER_W = 360
const POPOVER_H = 200

export interface SwapPopoverProps {
  item: DeployItem
  videos: Record<string, Video>
  anchor: SwapAnchor
  onClose: () => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
}

/*
 * 예약된 한 건을 들여다보는 팝오버 — 자리·영상과 할 수 있는 일만 보여 줍니다.
 *
 * 다른 영상으로 바로 바꿔 끼우는 후보 목록은 뺐습니다. 한 번 누르는 것만으로
 * 배포가 갈려 버려서, 영상을 바꾸려면 이 배포를 취소하고 다시 넣도록 합니다.
 */
export function SwapPopover({ item, videos, anchor, onClose, onEdit, onRemove }: SwapPopoverProps) {
  const current = videos[item.vid]
  const published = item.status === '게시 완료'

  const left = Math.max(8, Math.min(anchor.x, window.innerWidth - POPOVER_W - 16))
  const top = Math.max(8, Math.min(anchor.y, window.innerHeight - POPOVER_H - 8))

  return (
    <>
      <div className={styles.clickAway} onClick={onClose} />
      <div className={styles.popover} style={{ left, top }}>
        <div className={styles.popHead}>
          <div className={styles.popHeadBody}>
            <div className={styles.popSlot}>
              {shortDate(item.date)} ({dowLabel(item.date)}) {item.time} ·{' '}
              {PROGRAM_NAME[current.prog]}
            </div>
            <div className={styles.popSub}>
              {(Object.entries(item.pl) as Array<[PlatformKey, string]>)
                .map(([k, s]) => `${PLATFORM_NAME[k]} ${s}`)
                .join(' · ')}
            </div>
          </div>
          <button type="button" aria-label="닫기" className={styles.iconBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.popCurrent}>
          <div className={styles.popCurrentRow}>
            <Thumb src={current.thumb} width={72} height={42} radius={5} />
            <div className={styles.popCurrentBody}>
              <div className={`${styles.popCurrentTitle} ${styles.ellipsis}`}>{current.title}</div>
              <div className={styles.popSub}>
                {VIDEO_TYPE[current.type].label} · {durationText(current.dur)} · 추천 점수{' '}
                {current.score} · {item.status}
              </div>
            </div>
          </div>
          <div className={styles.popActions}>
            <div className={styles.popActionCell}>
              <Btn variant="secondary" size="sm" onClick={() => onEdit(item.id)}>
                확인·수정
              </Btn>
            </div>
            <div className={styles.popActionCell}>
              <Btn
                variant="danger"
                size="sm"
                disabled={published}
                onClick={() => onRemove(item.id)}
              >
                배포 취소
              </Btn>
            </div>
          </div>
        </div>

        {published && (
          <div className={styles.popSub}>이미 게시된 배포는 취소할 수 없습니다</div>
        )}
      </div>
    </>
  )
}
