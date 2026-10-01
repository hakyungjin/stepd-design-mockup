import {
  DOW_LABELS,
  addDays,
  iso,
  monthKey,
  parseDate,
  toMinutes,
} from '@/lib/date'
import type { DateStr } from '@/lib/date'
import { GENRE_STYLE, PLATFORM_BADGE, PLATFORM_NAME, PLATFORM_ORDER } from '../constants'
import type {
  ArchiveItem,
  CalendarEntry,
  DeployItem,
  DeployStatus,
  PlatformKey,
  Video,
} from '../types'
import { isArchive } from '../types'
import styles from './calendar.module.css'

/** 한 칸에 보여줄 줄 수 */
const VISIBLE_LINES = 7

export interface MonthViewProps {
  month: DateStr
  today: DateStr
  items: DeployItem[]
  videos: Record<string, Video>
  archiveFor: (date: DateStr) => ArchiveItem[]
  /** 날짜를 누르면 그 주의 주간 캘린더로 */
  onPickWeek: (date: DateStr) => void
  onOpenDrawer: (id: string) => void
}

interface Line {
  entry: CalendarEntry
  key: PlatformKey
  status: DeployStatus
}

const lineColor = (status: DeployStatus): string => {
  if (status === '실패') return 'hsl(var(--status-error))'
  if (status === '게시 완료') return 'var(--text-secondary)'
  if (status === '승인 대기') return 'hsl(var(--status-warn))'
  return 'var(--text-primary)'
}

export function MonthView({
  month,
  today,
  items,
  videos,
  archiveFor,
  onPickWeek,
  onOpenDrawer,
}: MonthViewProps) {
  const first = parseDate(month)
  const gridStart = addDays(first, -first.getDay())
  const cellCount = addDays(gridStart, 35).getMonth() === first.getMonth() ? 42 : 35

  return (
    <>
      <div className={styles.surface}>
        <div className={styles.monthDowRow}>
          {DOW_LABELS.map((label, i) => (
            <div
              key={label}
              className={[
                styles.monthDow,
                i === 0 ? styles.sun : '',
                i === 6 ? styles.sat : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {label}
            </div>
          ))}
        </div>

        <div className={styles.monthGrid}>
          {Array.from({ length: cellCount }, (_, i) => {
            const cellDate = addDays(gridStart, i)
            const date = iso(cellDate)
            const inMonth = monthKey(date) === monthKey(month)
            const isToday = inMonth && date === today
            const dow = cellDate.getDay()

            const lines: Line[] = [
              ...items.filter((x) => x.date === date),
              ...(inMonth ? archiveFor(date) : []),
            ]
              .flatMap((entry) =>
                (Object.entries(entry.pl) as Array<[PlatformKey, DeployStatus]>).map(
                  ([key, status]) => ({ entry, key, status }),
                ),
              )
              .sort(
                (p, q) =>
                  toMinutes(p.entry.time) - toMinutes(q.entry.time) ||
                  String(p.entry.id).localeCompare(String(q.entry.id)) ||
                  PLATFORM_ORDER[p.key] - PLATFORM_ORDER[q.key],
              )

            const cls = [
              styles.monthCell,
              inMonth ? '' : styles.monthCellOut,
              isToday ? styles.monthCellToday : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div
                key={date}
                className={cls}
                title={inMonth ? `${cellDate.getMonth() + 1}/${cellDate.getDate()} 주간 보기` : undefined}
                onClick={() => inMonth && onPickWeek(date)}
              >
                {inMonth && (
                  <>
                    <div className={styles.monthCellHead}>
                      <span
                        className={
                          isToday
                            ? styles.monthNumToday
                            : [
                                styles.monthNum,
                                dow === 0 ? styles.sun : '',
                                dow === 6 ? styles.sat : '',
                              ]
                                .filter(Boolean)
                                .join(' ')
                        }
                      >
                        {cellDate.getDate()}
                      </span>
                      {lines.length > 0 && (
                        <span className={styles.monthCount}>{lines.length}건</span>
                      )}
                    </div>

                    {lines.slice(0, VISIBLE_LINES).map((line, idx) => {
                      const entry = line.entry
                      const title = isArchive(entry)
                        ? entry.title
                        : (videos[entry.vid]?.title ?? '제목 없음')
                      const genre: '예능' | '드라마' = isArchive(entry) ? entry.genre : '예능'
                      return (
                        <button
                          key={`${entry.id}-${line.key}-${idx}`}
                          type="button"
                          className={styles.monthEntry}
                          title={`${entry.time} · ${PLATFORM_NAME[line.key]} · ${line.status} · ${title}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isArchive(entry)) onPickWeek(date)
                            else onOpenDrawer(entry.id)
                          }}
                        >
                          <span
                            className={styles.monthEntryPl}
                            style={{ background: PLATFORM_BADGE[line.key].color }}
                          >
                            {PLATFORM_BADGE[line.key].short}
                          </span>
                          <span
                            className={styles.monthEntryGenre}
                            style={{
                              background: GENRE_STYLE[genre].bg,
                              color: GENRE_STYLE[genre].fg,
                            }}
                          >
                            {genre}
                          </span>
                          <span
                            className={styles.monthEntryText}
                            style={{ color: lineColor(line.status) }}
                          >
                            {title}
                          </span>
                        </button>
                      )
                    })}

                    {lines.length > VISIBLE_LINES && (
                      <span className={styles.monthMore}>
                        +{lines.length - VISIBLE_LINES}건
                      </span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
