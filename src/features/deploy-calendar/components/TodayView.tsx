import type { MouseEvent } from 'react'
import { Thumb } from '@/components/ui/Controls'
import { durationText, toMinutes } from '@/lib/date'
import type { DateStr, TimeStr } from '@/lib/date'
import { VIDEO_TYPE } from '../constants'
import type { ArchiveItem, CalendarEntry, DeployItem, Video } from '../types'
import { isArchive } from '../types'
import { PlatformChips, statusTextColor } from './PlatformChips'
import type { SwapAnchor } from './ScheduleCard'
import styles from './calendar.module.css'

export interface TodayViewProps {
  today: DateStr
  items: DeployItem[]
  videos: Record<string, Video>
  archiveFor: (date: DateStr) => ArchiveItem[]
  isPast: (date: DateStr, time: TimeStr) => boolean
  onOpenSwap: (id: string, anchor: SwapAnchor) => void
  onOpenDrawer: (id: string) => void
}

const anchorRight = (e: MouseEvent<HTMLElement>): SwapAnchor => {
  const r = e.currentTarget.getBoundingClientRect()
  return { x: r.right + 6, y: r.top }
}

const anchorBelow = (e: MouseEvent<HTMLElement>): SwapAnchor => {
  const r = e.currentTarget.getBoundingClientRect()
  return { x: r.left, y: r.bottom + 4 }
}

export function TodayView({
  today,
  items,
  videos,
  archiveFor,
  isPast,
  onOpenSwap,
  onOpenDrawer,
}: TodayViewProps) {
  const rows: CalendarEntry[] = [
    ...items.filter((i) => i.date === today),
    ...archiveFor(today),
  ].sort((a, b) => toMinutes(a.time) - toMinutes(b.time))

  /** 같은 시각끼리 묶습니다 — 시간은 묶음 머리에 한 번만 나옵니다 */
  const groups = rows.reduce<Array<{ time: TimeStr; entries: CalendarEntry[] }>>((acc, entry) => {
    const last = acc[acc.length - 1]
    if (last && last.time === entry.time) last.entries.push(entry)
    else acc.push({ time: entry.time, entries: [entry] })
    return acc
  }, [])

  return (
    <div className={styles.surface}>
      <div className={styles.todayHead}>
        <span>영상</span>
        <span>플랫폼별 상태</span>
        <span>상태</span>
        <span />
      </div>

      {groups.map((group) => {
        const done = group.entries.filter(
          (e) => isArchive(e) || e.status === '게시 완료',
        ).length
        return (
          <div key={group.time}>
            <div className={styles.todayGroupHead}>
              <span className={styles.todayGroupTime}>{group.time}</span>
              <span className={styles.todayGroupCount}>{group.entries.length}건</span>
              {done > 0 && (
                <span className={styles.todayGroupNote}>
                  {done === group.entries.length ? '모두 게시 완료' : `${done}건 게시 완료`}
                </span>
              )}
            </div>

            {group.entries.map((entry) =>
              isArchive(entry) ? (
                <ArchiveRow key={entry.id} entry={entry} />
              ) : (
                <DeployRow
                  key={entry.id}
                  item={entry}
                  video={videos[entry.vid]}
                  past={isPast(entry.date, entry.time)}
                  onOpenSwap={onOpenSwap}
                  onOpenDrawer={onOpenDrawer}
                />
              ),
            )}
          </div>
        )
      })}

      {rows.length === 0 && <div className={styles.empty}>오늘 배포할 영상이 없습니다</div>}
    </div>
  )
}

function ArchiveRow({ entry }: { entry: ArchiveItem }) {
  return (
    <div className={styles.todayRowArchive}>
      <div className={styles.todayVideo}>
        <span className={styles.archiveThumb} />
        <div className={styles.todayMeta}>
          <span className={`${styles.todayTitleStatic} ${styles.ellipsis}`}>{entry.title}</span>
          <span className={styles.todayTypeLabel}>{entry.genre} · 09:00 이전 게시</span>
        </div>
      </div>
      <div className={styles.todayChips}>
        <PlatformChips pl={entry.pl} size="lg" labelOf={() => '완료'} />
      </div>
      <span className={styles.todayStatus} style={statusTextColor('게시 완료')}>
        게시 완료
      </span>
      <span />
    </div>
  )
}

function DeployRow({
  item,
  video,
  past,
  onOpenSwap,
  onOpenDrawer,
}: {
  item: DeployItem
  video: Video
  past: boolean
  onOpenSwap: (id: string, anchor: SwapAnchor) => void
  onOpenDrawer: (id: string) => void
}) {
  const type = VIDEO_TYPE[video.type]
  const published = item.status === '게시 완료'

  return (
    <div
      className={past ? `${styles.todayRow} ${styles.todayRowPast}` : styles.todayRow}
      title={`${type.label} · ${durationText(video.dur)} — 누르면 영상 교체`}
      onClick={(e) => onOpenSwap(item.id, anchorRight(e))}
    >
      <div className={styles.todayVideo}>
        <Thumb src={video.thumb} width={64} height={36} radius={6} />
        <div className={styles.todayMeta}>
          {published ? (
            <span className={`${styles.todayTitleStatic} ${styles.ellipsis}`}>{video.title}</span>
          ) : (
            <button
              type="button"
              className={styles.todayTitleBtn}
              title="이 시간에 배치할 영상 바꾸기"
              onClick={(e) => {
                e.stopPropagation()
                onOpenSwap(item.id, anchorBelow(e))
              }}
            >
              <span className={styles.ellipsis}>{video.title}</span>
              <span className={styles.caretInline}>▼</span>
            </button>
          )}
          <span className={styles.todayTypeLabel}>
            {type.label} · {durationText(video.dur)}
          </span>
          {!video.ready && <span className={styles.flagRender}>렌더링 미완료 · 끝나야 게시</span>}
          {item.test && <span className={styles.flagTest}>테스트 모드 · 비공개 먼저</span>}
        </div>
      </div>

      <div className={styles.todayChips}>
        <PlatformChips pl={item.pl} size="lg" />
      </div>

      <span className={styles.todayStatus} style={statusTextColor(item.status)}>
        {item.status}
      </span>

      <div className={styles.todayActions}>
        {!published && (
          <button
            type="button"
            className={styles.miniBtn}
            title="일정·플랫폼·상태 바꾸기"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDrawer(item.id)
            }}
          >
            설정
          </button>
        )}
      </div>
    </div>
  )
}
