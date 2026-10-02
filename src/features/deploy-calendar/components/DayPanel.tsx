/*
 * 하루 보기 — 월간 달력에서 날짜 칸을 누르면 뜹니다.
 *
 * 월간 칸의 줄은 읽기 전용입니다(하나하나 누르지 않습니다).
 * 그 날 배포를 손보려면 여기서 고릅니다 — 줄을 누르면 배포 설정이 열립니다.
 */

import { Btn } from '@/components/ui/Btn'
import { Thumb } from '@/components/ui/Controls'
import { DOW_LABELS, durationText, parseDate, toMinutes } from '@/lib/date'
import type { DateStr, TimeStr } from '@/lib/date'
import { VIDEO_TYPE } from '../constants'
import type { ArchiveItem, CalendarEntry, DeployItem, Video } from '../types'
import { isArchive } from '../types'
import { PlatformChips, statusTextColor } from './PlatformChips'
import styles from './calendar.module.css'
import overlay from './overlays.module.css'

export interface DayPanelProps {
  date: DateStr
  items: DeployItem[]
  videos: Record<string, Video>
  archiveFor: (date: DateStr) => ArchiveItem[]
  isPast: (date: DateStr, time: TimeStr) => boolean
  onClose: () => void
  /** 줄을 누르면 그 배포의 설정 서랍을 엽니다 */
  onOpenItem: (id: string) => void
  /** 이 날이 든 주의 주간 보기로 */
  onOpenWeek: () => void
  onAdd: () => void
}

export function DayPanel({
  date,
  items,
  videos,
  archiveFor,
  isPast,
  onClose,
  onOpenItem,
  onOpenWeek,
  onAdd,
}: DayPanelProps) {
  const d = parseDate(date)
  const rows: CalendarEntry[] = [...items.filter((i) => i.date === date), ...archiveFor(date)].sort(
    (a, b) => toMinutes(a.time) - toMinutes(b.time),
  )

  /** 같은 시각끼리 묶습니다 — 시간은 묶음 머리에 한 번만 나옵니다 */
  const groups = rows.reduce<Array<{ time: TimeStr; entries: CalendarEntry[] }>>((acc, entry) => {
    const last = acc[acc.length - 1]
    if (last && last.time === entry.time) last.entries.push(entry)
    else acc.push({ time: entry.time, entries: [entry] })
    return acc
  }, [])

  return (
    <div className={overlay.modalScrim} onClick={onClose} role="presentation">
      <div
        className={overlay.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일 배포`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={overlay.modalHead}>
          <span className={overlay.modalTitle}>
            {d.getMonth() + 1}월 {d.getDate()}일 ({DOW_LABELS[d.getDay()]})
          </span>
          <span className={styles.dayCount}>{rows.length}건</span>
          <div className={overlay.modalHeadSpacer} />
          <Btn variant="ghost" size="sm" onClick={onClose}>
            닫기
          </Btn>
        </div>

        <div className={styles.dayBody}>
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
                    <div key={entry.id} className={styles.todayRowArchive}>
                      <div className={styles.todayVideo}>
                        <span className={styles.archiveThumb} />
                        <div className={styles.todayMeta}>
                          <span className={`${styles.todayTitleStatic} ${styles.ellipsis}`}>
                            {entry.title}
                          </span>
                          <span className={styles.todayTypeLabel}>{entry.genre} · 기존 게시물</span>
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
                  ) : (
                    <DayRow
                      key={entry.id}
                      item={entry}
                      video={videos[entry.vid]}
                      past={isPast(entry.date, entry.time)}
                      onOpen={() => onOpenItem(entry.id)}
                    />
                  ),
                )}
              </div>
            )
          })}

          {rows.length === 0 && <div className={styles.empty}>이 날에는 배포가 없습니다</div>}
        </div>

        <div className={styles.dayFoot}>
          <Btn variant="secondary" size="md" onClick={onOpenWeek}>
            이 주 주간 보기
          </Btn>
          <div className={styles.dayFootSpacer} />
          <Btn variant="primary" size="md" onClick={onAdd}>
            + 이 날에 배포 추가
          </Btn>
        </div>
      </div>
    </div>
  )
}

function DayRow({
  item,
  video,
  past,
  onOpen,
}: {
  item: DeployItem
  video: Video
  past: boolean
  onOpen: () => void
}) {
  const type = VIDEO_TYPE[video.type]

  return (
    <button
      type="button"
      className={past ? `${styles.dayRow} ${styles.todayRowPast}` : styles.dayRow}
      title={`${video.title} — 누르면 배포 설정`}
      onClick={onOpen}
    >
      <span className={styles.todayVideo}>
        <Thumb src={video.thumb} width={64} height={36} radius={6} />
        <span className={styles.todayMeta}>
          <span className={`${styles.todayTitleStatic} ${styles.ellipsis}`}>{video.title}</span>
          <span className={styles.todayTypeLabel}>
            {type.label} · {durationText(video.dur)}
          </span>
          {!video.ready && <span className={styles.flagRender}>렌더링 미완료 · 끝나야 게시</span>}
          {item.test && <span className={styles.flagTest}>테스트 모드 · 비공개 먼저</span>}
        </span>
      </span>

      <span className={styles.todayChips}>
        <PlatformChips pl={item.pl} size="lg" />
      </span>

      <span className={styles.todayStatus} style={statusTextColor(item.status)}>
        {item.status}
      </span>

      <span className={styles.dayRowCaret} aria-hidden>
        ›
      </span>
    </button>
  )
}
