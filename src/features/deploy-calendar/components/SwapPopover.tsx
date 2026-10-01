import { Btn } from '@/components/ui/Btn'
import { Thumb } from '@/components/ui/Controls'
import { dowLabel, durationText, shortDate } from '@/lib/date'
import { PLATFORM_NAME, PROGRAM_NAME, VIDEO_TYPE } from '../constants'
import { findDuplicate, platformKeysOf } from '../domain/rules'
import type { DeployItem, PlatformKey, Video } from '../types'
import type { SwapAnchor } from './ScheduleCard'
import styles from './overlays.module.css'

const POPOVER_W = 360
const POPOVER_H = 460
/** 추천 후보 최대 개수 */
const MAX_CANDIDATES = 12

export interface SwapPopoverProps {
  item: DeployItem
  videos: Record<string, Video>
  items: DeployItem[]
  anchor: SwapAnchor
  onClose: () => void
  onSwap: (id: string, vid: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
}

/**
 * "이 자리에 넣을 영상" 팝오버.
 * 같은 플랫폼에 이미 예약된 영상과 렌더링 미완료 영상은 후보에서 제외합니다.
 */
export function SwapPopover({
  item,
  videos,
  items,
  anchor,
  onClose,
  onSwap,
  onEdit,
  onRemove,
}: SwapPopoverProps) {
  const current = videos[item.vid]
  const published = item.status === '게시 완료'
  const keys = platformKeysOf(item)

  const candidates = published
    ? []
    : Object.values(videos)
        .filter(
          (v) =>
            v.ready &&
            v.id !== item.vid &&
            !keys.some((k) => findDuplicate(items, v.id, k, item.id)),
        )
        .sort(
          (a, b) =>
            Number(b.type === current.type) - Number(a.type === current.type) ||
            Number(b.prog === current.prog) - Number(a.prog === current.prog) ||
            b.score - a.score,
        )
        .slice(0, MAX_CANDIDATES)

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
                빼기
              </Btn>
            </div>
          </div>
        </div>

        {!published && (
          <>
            <div>
              <div className={styles.popSectionTitle}>이 자리에 넣을 영상</div>
              <div className={styles.popSub}>
                승인·렌더링 완료 · 같은 플랫폼에 이미 예약된 영상은 뺐습니다 · 누르면 바로 교체
              </div>
            </div>

            <div className={styles.popList}>
              {candidates.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={styles.popOption}
                  onClick={() => onSwap(item.id, v.id)}
                >
                  <Thumb src={v.thumb} width={56} height={32} radius={4} />
                  <span className={styles.popOptionBody}>
                    <span className={`${styles.popOptionTitle} ${styles.ellipsis}`}>{v.title}</span>
                    <span className={styles.popOptionMeta}>
                      {PROGRAM_NAME[v.prog]} · {VIDEO_TYPE[v.type].label} · {durationText(v.dur)}
                    </span>
                  </span>
                  <span className={styles.popOptionScore}>
                    추천 <b>{v.score}</b>
                  </span>
                </button>
              ))}
              {candidates.length === 0 && (
                <div className={styles.popEmpty}>이 자리에 넣을 수 있는 다른 영상이 없습니다</div>
              )}
            </div>
          </>
        )}

        {published && (
          <div className={styles.popSub}>이미 게시된 배포는 영상을 바꿀 수 없습니다</div>
        )}
      </div>
    </>
  )
}
