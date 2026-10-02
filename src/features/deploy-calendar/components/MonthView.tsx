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
  /** 날짜 칸을 누르면 그 날 보기를 엽니다 — 칸 안의 줄은 읽기 전용입니다 */
  onPickDay: (date: DateStr) => void
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
  onPickDay,
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

            /* 세는 단위는 배포 건수입니다 — 주간 보기·하루 보기와 같은 숫자가 나옵니다 */
            const entries: CalendarEntry[] = [
              ...items.filter((x) => x.date === date),
              ...(inMonth ? archiveFor(date) : []),
            ]

            /* 줄은 플랫폼별로 한 줄씩 — 한 배포가 여러 줄이 될 수 있습니다 */
            const lines: Line[] = entries
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

            const visible = lines.slice(0, VISIBLE_LINES)
            /* "+N건" 은 칸에 한 줄도 못 올라간 배포 수 — 머리의 건수와 합이 맞습니다 */
            const shown = new Set(visible.map((line) => line.entry.id))
            const hidden = entries.length - shown.size

            const cls = [
              styles.monthCell,
              inMonth ? '' : styles.monthCellOut,
              isToday ? styles.monthCellToday : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                key={date}
                type="button"
                className={cls}
                disabled={!inMonth}
                aria-label={
                  inMonth
                    ? `${cellDate.getMonth() + 1}월 ${cellDate.getDate()}일 · ${entries.length}건 — 하루 보기`
                    : undefined
                }
                title={
                  inMonth
                    ? `${cellDate.getMonth() + 1}/${cellDate.getDate()} · ${entries.length}건 — 눌러서 하루 보기`
                    : undefined
                }
                onClick={() => inMonth && onPickDay(date)}
              >
                {inMonth && (
                  <>
                    <span className={styles.monthCellHead}>
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
                      {entries.length > 0 && (
                        <span className={styles.monthCount}>{entries.length}건</span>
                      )}
                    </span>

                    {visible.map((line, idx) => {
                      const entry = line.entry
                      const title = isArchive(entry)
                        ? entry.title
                        : (videos[entry.vid]?.title ?? '제목 없음')
                      const genre: '예능' | '드라마' = isArchive(entry) ? entry.genre : '예능'
                      return (
                        <span
                          key={`${entry.id}-${line.key}-${idx}`}
                          className={styles.monthEntry}
                          title={`${entry.time} · ${PLATFORM_NAME[line.key]} · ${line.status} · ${title}`}
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
                        </span>
                      )
                    })}

                    {hidden > 0 && <span className={styles.monthMore}>+{hidden}건</span>}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
