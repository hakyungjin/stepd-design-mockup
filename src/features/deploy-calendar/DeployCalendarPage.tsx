import { useMemo, useState } from 'react'
import type { ScreenKey } from '@/app/screens'
import { Pill, Segment } from '@/components/ui/Controls'
import {
  addDays,
  iso,
  mondayOf,
  monthKey,
  parseDate,
  toMinutes,
  DOW_LABELS,
} from '@/lib/date'
import type { DateStr, TimeStr } from '@/lib/date'
import { PLATFORMS, SLOTS, VIDEO_TYPE } from './constants'
import { createMockData, MOCK_NOW, MOCK_USER } from './data/mockData'
import { useDeployCalendar } from './hooks/useDeployCalendar'
import type {
  ArchiveItem,
  BulkDraft,
  BulkPlanRow,
  CalendarEntry,
  DeployItem,
  HistoryEntry,
  SingleDraft,
  Video,
} from './types'
import { isArchive } from './types'
import { AddDeployDialog } from './components/AddDeployDialog'
import { CalendarToolbar, type SubTab } from './components/CalendarToolbar'
import { ItemDrawer } from './components/ItemDrawer'
import { MonthView } from './components/MonthView'
import { SummaryBar } from './components/SummaryBar'
import { SwapPopover } from './components/SwapPopover'
import { TodayView } from './components/TodayView'
import { Toast } from './components/Toast'
import { WeekView } from './components/WeekView'
import type { SwapAnchor } from './components/ScheduleCard'
import styles from './components/calendar.module.css'

const WEEK_MS = 604_800_000

export interface DeployCalendarPageProps {
  /** 영상 카탈로그. 생략하면 목 데이터를 씁니다. */
  videos?: Record<string, Video>
  initialItems?: DeployItem[]
  initialHistory?: HistoryEntry[]
  archiveFor?: (date: DateStr) => ArchiveItem[]
  /** 화면의 "지금". 목업은 재현성을 위해 2026-09-30 09:00 으로 고정돼 있습니다. */
  now?: Date
  currentUser?: string
  /** 다른 화면으로 이동 (배포 탭 / 편집기 등) */
  onNavigate?: (screen: ScreenKey) => void
}

export function DeployCalendarPage({
  videos: videosProp,
  initialItems,
  initialHistory,
  archiveFor: archiveForProp,
  now = MOCK_NOW,
  currentUser = MOCK_USER,
  onNavigate,
}: DeployCalendarPageProps = {}) {
  const mock = useMemo(() => createMockData(now), [now])

  const videos = videosProp ?? mock.videos
  const archiveFor = archiveForProp ?? mock.archiveFor

  const cal = useDeployCalendar({
    videos,
    initialItems: initialItems ?? mock.items,
    initialHistory: initialHistory ?? mock.history,
    now,
    user: currentUser,
  })

  const {
    items,
    history,
    today,
    baseWeek,
    view,
    week,
    month,
    toast,
    say,
    isPast,
    findItem,
  } = cal

  /* ------------------------------ UI 상태 ------------------------------ */

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)
  const [swap, setSwap] = useState<{ id: string; anchor: SwapAnchor } | null>(null)
  const [drawer, setDrawer] = useState<string | null>(null)
  const [add, setAdd] = useState<{ date: DateStr; time: TimeStr; fromCell: boolean } | null>(null)

  const closeOverlays = () => {
    setSwap(null)
    setDrawer(null)
  }

  const openSwap = (id: string, anchor: SwapAnchor) => {
    setDrawer(null)
    setSwap({ id, anchor })
  }

  const openDrawer = (id: string) => {
    setSwap(null)
    setDrawer(id)
  }

  const openAdd = (date?: DateStr, time?: TimeStr) => {
    const firstOpenSlot = SLOTS.find((t) => !isPast(today, t)) ?? '18:00'
    closeOverlays()
    setAdd({
      date: date ?? today,
      time: time ?? firstOpenSlot,
      fromCell: Boolean(date),
    })
  }

  /* ------------------------------ 파생 값 ------------------------------ */

  const weekStart = parseDate(week)
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => iso(addDays(weekStart, i))),
    [week], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const isToday = view === 'today'
  const isWeek = view === 'week'
  const monthStart = parseDate(month)

  const todayEntries: CalendarEntry[] = useMemo(
    () =>
      [...items.filter((i) => i.date === today), ...archiveFor(today)].sort(
        (a, b) => toMinutes(a.time) - toMinutes(b.time),
      ),
    [archiveFor, items, today],
  )

  /** 요약 바가 세는 범위 */
  const scopeEntries: CalendarEntry[] = useMemo(() => {
    const scopeDates = isToday
      ? [today]
      : isWeek
        ? days
        : Array.from({ length: 31 }, (_, i) =>
            iso(new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1)),
          ).filter((d) => monthKey(d) === monthKey(month))

    const inScope = (e: CalendarEntry) =>
      isToday
        ? e.date === today
        : isWeek
          ? days.includes(e.date)
          : monthKey(e.date) === monthKey(month)

    return [...items, ...scopeDates.flatMap(archiveFor)].filter(inScope)
  }, [archiveFor, days, isToday, isWeek, items, month, monthStart, today])

  const weekOffset = Math.round(
    (weekStart.getTime() - parseDate(baseWeek).getTime()) / WEEK_MS,
  )

  const rangeLabel = (() => {
    if (isToday) {
      const d = parseDate(today)
      return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW_LABELS[d.getDay()]}) · ${todayEntries.length}건`
    }
    if (isWeek) {
      const end = addDays(weekStart, 6)
      return `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`
    }
    return `${monthStart.getFullYear()}년 ${monthStart.getMonth() + 1}월`
  })()

  /** 주간 뷰는 화살표로 한 주씩 넘깁니다 */
  const stepWeek = (delta: number) =>
    cal.setWeek(iso(addDays(parseDate(cal.week), delta * 7)))

  const subTabs: SubTab[] = useMemo(() => {
    // 주간은 화살표로 넘기므로 하위 탭이 없습니다
    if (isToday || isWeek) return []
    return [0, 1].map((delta) => {
      const d = new Date(now.getFullYear(), now.getMonth() + delta, 1)
      const key = iso(d)
      return {
        key,
        label: `${d.getMonth() + 1}월`,
        active: month === key,
        onSelect: () => cal.setMonth(key),
      }
    })
  }, [cal, isToday, isWeek, month, now])

  const summary = useMemo(() => {
    const weekLabel =
      weekOffset === 0
        ? '이번 주'
        : weekOffset === -1
          ? '지난 주'
          : weekOffset === 1
            ? '다음 주'
            : `${Math.abs(weekOffset)}주 ${weekOffset < 0 ? '전' : '후'}`
    const label = isToday ? '오늘' : isWeek ? weekLabel : `${monthStart.getMonth() + 1}월`

    return {
      label,
      total: scopeEntries.length,
      upcoming: scopeEntries.filter((e) => !isArchive(e) && !isPast(e.date, e.time)).length,
      perPlatform: PLATFORMS.map((p) => ({
        name: p.name,
        count: scopeEntries.filter((e) => e.pl[p.key] !== undefined).length,
      })),
      waiting: scopeEntries.filter((e) => e.status === '승인 대기').length,
      rendering: scopeEntries.filter((e) => !isArchive(e) && !videos[e.vid]?.ready).length,
      failed: scopeEntries.reduce(
        (n, e) => n + Object.values(e.pl).filter((s) => s === '실패').length,
        0,
      ),
    }
  }, [isPast, isToday, isWeek, monthStart, scopeEntries, videos, weekOffset])

  /* 카드 색은 영상 유형 하나로 고정입니다 */
  const legend = useMemo(
    () => Object.values(VIDEO_TYPE).map((t) => ({ label: t.label, color: t.dot })),
    [],
  )

  /* ------------------------------ 핸들러 ------------------------------ */

  const handleCellDrop = (date: DateStr, time: TimeStr) => {
    const id = draggingId
    setDraggingId(null)
    setOverKey(null)
    if (id) cal.moveItem(id, date, time)
  }

  const handleSaveSingle = (draft: SingleDraft) => {
    cal.addSingle(draft)
    setAdd(null)
  }

  const handleSaveBulk = (draft: BulkDraft, plan: BulkPlanRow[]) => {
    cal.addBulk(draft, plan)
    setAdd(null)
  }

  const swapItem = swap ? findItem(swap.id) : undefined
  const drawerItem = drawer ? findItem(drawer) : undefined

  /* ------------------------------ 렌더 ------------------------------ */

  return (
    <div className={styles.page}>
      <Segment size="lg">
        <Pill
          size="lg"
          onClick={() =>
            onNavigate ? onNavigate('dist') : say('배포 목록 화면으로 이동할 수 없습니다')
          }
        >
          배포
        </Pill>
        <Pill size="lg" active>
          스케줄
        </Pill>
      </Segment>

      <CalendarToolbar
        view={view}
        onViewChange={cal.setView}
        subTabs={subTabs}
        rangeLabel={rangeLabel}
        onStepRange={isWeek ? stepWeek : undefined}
        onOpenAdd={() => openAdd()}
      />

      <SummaryBar {...summary} legend={legend} />

      {isToday && (
        <TodayView
          today={today}
          items={items}
          videos={videos}
          archiveFor={archiveFor}
          isPast={isPast}
          onOpenSwap={openSwap}
          onOpenDrawer={openDrawer}
        />
      )}

      {isWeek && (
        <WeekView
          days={days}
          today={today}
          items={items}
          videos={videos}
          archiveFor={archiveFor}
          isPast={isPast}
          draggingId={draggingId}
          overKey={overKey}
          onDragStart={setDraggingId}
          onDragEnd={() => {
            setDraggingId(null)
            setOverKey(null)
          }}
          onCellDragOver={setOverKey}
          onCellDrop={handleCellDrop}
          onCellClick={(date, time) => openAdd(date, time)}
          onOpenSwap={openSwap}
          onOpenDrawer={openDrawer}
        />
      )}

      {view === 'month' && (
        <MonthView
          month={month}
          today={today}
          items={items}
          videos={videos}
          archiveFor={archiveFor}
          onPickWeek={(date) => {
            cal.setView('week')
            cal.setWeek(iso(mondayOf(parseDate(date))))
          }}
          onOpenDrawer={openDrawer}
        />
      )}

      {swap && swapItem && (
        <SwapPopover
          item={swapItem}
          videos={videos}
          items={items}
          anchor={swap.anchor}
          onClose={() => setSwap(null)}
          onSwap={(id, vid) => {
            setSwap(null)
            cal.swapVideo(id, vid)
          }}
          onEdit={(id) => {
            setSwap(null)
            setDrawer(id)
          }}
          onRemove={(id) => {
            setSwap(null)
            cal.cancelItem(id)
          }}
        />
      )}

      {drawerItem && (
        <ItemDrawer
          item={drawerItem}
          videos={videos}
          items={items}
          history={history}
          now={now}
          isPast={isPast}
          onClose={closeOverlays}
          onOpenSwap={openSwap}
          onMove={cal.moveItem}
          onTogglePlatform={cal.togglePlatform}
          onSetStatus={cal.setItemStatus}
          onSetTemplate={cal.setTemplate}
          onToggleTest={cal.toggleTest}
          onRetry={cal.retryPlatform}
          onCancel={(id) => {
            setDrawer(null)
            cal.cancelItem(id)
          }}
          onOpenEditor={(video) => {
            if (onNavigate) onNavigate(video.type === 'hl' ? 'editor-hl' : video.type === 'short' ? 'editor-short' : 'editor-clip')
            else say(`${VIDEO_TYPE[video.type].label} 편집기로 이동할 수 없습니다`)
          }}
        />
      )}

      {add && (
        <AddDeployDialog
          initialDate={add.date}
          initialTime={add.time}
          startAtVideoStep={add.fromCell}
          videos={videos}
          items={items}
          isPast={isPast}
          onClose={() => setAdd(null)}
          onSaveSingle={handleSaveSingle}
          onPlanBulk={cal.planBulk}
          onSaveBulk={handleSaveBulk}
          onToast={say}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
