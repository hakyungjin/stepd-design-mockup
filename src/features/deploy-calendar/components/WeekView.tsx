import type { DragEvent } from 'react'
import { DOW_LABELS, parseDate, shortDate, toMinutes } from '@/lib/date'
import type { DateStr, TimeStr } from '@/lib/date'
import { PER_SLOT, SLOTS, slotOf } from '../constants'
import { isSettled } from '../domain/rules'
import type { ArchiveItem, DeployItem, Video } from '../types'
import { ScheduleCard, type SwapAnchor } from './ScheduleCard'
import styles from './calendar.module.css'

export interface WeekViewProps {
  days: DateStr[]
  today: DateStr
  items: DeployItem[]
  videos: Record<string, Video>
  archiveFor: (date: DateStr) => ArchiveItem[]
  isPast: (date: DateStr, time: TimeStr) => boolean
  draggingId: string | null
  overKey: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onCellDragOver: (key: string) => void
  onCellDrop: (date: DateStr, time: TimeStr) => void
  onCellClick: (date: DateStr, time: TimeStr) => void
  onOpenSwap: (id: string, anchor: SwapAnchor) => void
  onOpenDrawer: (id: string) => void
}

export function WeekView({
  days,
  today,
  items,
  videos,
  archiveFor,
  isPast,
  draggingId,
  overKey,
  onDragStart,
  onDragEnd,
  onCellDragOver,
  onCellDrop,
  onCellClick,
  onOpenSwap,
  onOpenDrawer,
}: WeekViewProps) {
  const handleDragOver = (e: DragEvent<HTMLDivElement>, key: string) => {
    if (!draggingId) return
    e.preventDefault()
    if (overKey !== key) onCellDragOver(key)
  }

  return (
    <>
      <div className={styles.surfaceScroll}>
        <div className={styles.weekHead}>
          <div />
          {days.map((date) => {
            const d = parseDate(date)
            const isToday = date === today
            const count = items.filter((i) => i.date === date).length + archiveFor(date).length
            return (
              <div
                key={date}
                className={isToday ? `${styles.dayHead} ${styles.dayHeadToday}` : styles.dayHead}
              >
                <div className={styles.dayHeadTop}>
                  <span className={styles.dowLabel}>{DOW_LABELS[d.getDay()]}</span>
                  <span className={styles.dayDate}>{shortDate(date)}</span>
                  {isToday && <span className={styles.todayBadge}>오늘</span>}
                  <span className={styles.dayCount}>{count ? `${count}건` : ''}</span>
                </div>
              </div>
            )
          })}
        </div>

        {SLOTS.map((time) => (
          <div key={time} className={styles.weekRow}>
            <div className={styles.slotLabel}>
              <span className={styles.slotTime}>{time}</span>
              <span className={styles.slotCap}>{PER_SLOT}개</span>
            </div>

            {days.map((date) => {
              const cellKey = `${date} ${time}`
              const past = isPast(date, time)
              const isToday = date === today
              const inSlot = items.filter((i) => i.date === date && slotOf(i.time) === time)
              const cards = inSlot
                .filter((i) => !(past && isSettled(i)))
                .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
              const archived =
                archiveFor(date).filter((x) => slotOf(x.time) === time).length +
                inSlot.filter((i) => past && isSettled(i)).length
              const freeSlots = Math.max(0, PER_SLOT - inSlot.length)
              const showGap = !past && inSlot.length < PER_SLOT

              const cls = [
                styles.cell,
                isToday && !past ? styles.cellToday : '',
                past ? styles.cellPast : '',
                overKey === cellKey ? styles.cellOver : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <div
                  key={cellKey}
                  className={cls}
                  title={
                    past
                      ? undefined
                      : `${shortDate(date)} ${time}에 배포 추가 (${inSlot.length}/${PER_SLOT})`
                  }
                  onClick={() => {
                    if (!past) onCellClick(date, time)
                  }}
                  onDragOver={(e) => handleDragOver(e, cellKey)}
                  onDrop={(e) => {
                    e.preventDefault()
                    onCellDrop(date, time)
                  }}
                >
                  {cards.map((item) => (
                    <ScheduleCard
                      key={item.id}
                      item={item}
                      video={videos[item.vid]}
                      past={isPast(item.date, item.time)}
                      dragging={draggingId === item.id}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onOpenSwap={onOpenSwap}
                      onOpenDrawer={onOpenDrawer}
                    />
                  ))}

                  {archived > 0 && (
                    <div className={styles.archiveNote}>
                      <span className={styles.archiveDot} />
                      게시 완료 {archived}건
                    </div>
                  )}

                  {showGap && (
                    <button
                      type="button"
                      className={styles.gapSlot}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCellClick(date, time)
                      }}
                    >
                      + 빈 자리 {freeSlots}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
