/*
 * 배포 캘린더의 모든 상태와 동작.
 * ------------------------------------------------------------------
 * 화면 컴포넌트는 이 훅이 돌려주는 값만 쓰고, 직접 데이터를 만들지 않습니다.
 *
 * STEPD 연동 시 손댈 곳은 아래 주석의 `TODO(api)` 지점뿐입니다.
 * 지금은 전부 로컬 상태 갱신(낙관적 업데이트)만 하고 있습니다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays,
  fromMinutes,
  iso,
  mondayOf,
  parseDate,
  shortDate,
  toMinutes,
} from '@/lib/date'
import type { DateStr, TimeStr } from '@/lib/date'
import {
  PER_SLOT,
  PLATFORM_KEYS,
  PLATFORM_NAME,
  SLOTS,
  TEMPLATES,
  defaultTemplate,
} from '../constants'
import {
  dailyLimitError,
  findDuplicate,
  isPastAt,
  platformKeysOf,
  selectedKeys,
} from '../domain/rules'
import type {
  BulkDraft,
  BulkPlanRow,
  CalendarView,
  DeployItem,
  DeployStatus,
  HistoryEntry,
  PlatformKey,
  PlatformStatusMap,
  SingleDraft,
  Video,
} from '../types'

const TOAST_MS = 3000
const RETRY_MS = 1400

export interface UseDeployCalendarOptions {
  videos: Record<string, Video>
  initialItems: DeployItem[]
  initialHistory: HistoryEntry[]
  now: Date
  user: string
}

export function useDeployCalendar({
  videos,
  initialItems,
  initialHistory,
  now,
  user,
}: UseDeployCalendarOptions) {
  const today = useMemo(() => iso(now), [now])
  const baseWeek = useMemo(() => iso(mondayOf(now)), [now])
  const baseMonth = useMemo(() => iso(new Date(now.getFullYear(), now.getMonth(), 1)), [now])

  const [items, setItems] = useState<DeployItem[]>(initialItems)
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory)

  const [view, setView] = useState<CalendarView>('week')
  const [week, setWeek] = useState<DateStr>(baseWeek)
  const [month, setMonth] = useState<DateStr>(baseMonth)

  const [toast, setToast] = useState('')

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const logTick = useRef(0)

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      retryTimers.current.forEach(clearTimeout)
    },
    [],
  )

  const say = useCallback((text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(text)
    toastTimer.current = setTimeout(() => setToast(''), TOAST_MS)
  }, [])

  const log = useCallback(
    (text: string, id: string | null) => {
      logTick.current += 1
      const at = `${now.getMonth() + 1}/${now.getDate()} ${fromMinutes(
        now.getHours() * 60 + now.getMinutes() + logTick.current,
      )}`
      setHistory((prev) => [...prev, { at, who: user, text, id }])
    },
    [now, user],
  )

  const isPast = useCallback(
    (date: DateStr, time: TimeStr) => isPastAt(now, date, time),
    [now],
  )

  const findItem = useCallback(
    (id: string) => items.find((i) => i.id === id),
    [items],
  )

  const patch = useCallback((id: string, fn: (it: DeployItem) => DeployItem) => {
    setItems((prev) => prev.map((it) => (it.id === id ? fn(it) : it)))
  }, [])

  /* ---------------------------------------------------------------- *
   * 동작
   * ---------------------------------------------------------------- */

  /** 드래그 이동 / 드로어에서 날짜·시간 변경 */
  const moveItem = useCallback(
    (id: string, date: DateStr, time: TimeStr) => {
      const it = findItem(id)
      if (!it || (it.date === date && it.time === time)) return
      const v = videos[it.vid]

      if (it.status === '게시 완료') return say('이미 게시된 배포는 옮길 수 없습니다')
      if (isPast(date, time)) return say('지난 시간에는 배치할 수 없습니다')

      const err =
        it.date === date
          ? ''
          : dailyLimitError(items, videos, date, v.prog, platformKeysOf(it), id)
      if (err) return say(`옮기지 못했습니다 — ${err}에 걸립니다`)

      // TODO(api): PATCH /deploys/:id { date, time }
      patch(id, (x) => ({ ...x, date, time }))
      log(
        `일정 변경 · ${v.title} · ${shortDate(it.date)} ${it.time} → ${shortDate(date)} ${time}`,
        id,
      )
      say(`옮겼습니다: ${v.title} → ${shortDate(date)} ${time}`)
    },
    [findItem, isPast, items, log, patch, say, videos],
  )

  /* 예약된 영상을 다른 영상으로 바꿔 끼우는 동작은 두지 않습니다 — 취소하고 다시 넣습니다 */

  /** 플랫폼 추가/제외 */
  const togglePlatform = useCallback(
    (id: string, key: PlatformKey) => {
      const it = findItem(id)
      if (!it) return
      const v = videos[it.vid]

      if (it.pl[key] !== undefined) {
        if (it.pl[key] === '게시 완료') return say('이미 게시된 플랫폼은 뺄 수 없습니다')
        if (platformKeysOf(it).length === 1) return say('플랫폼은 하나 이상 있어야 합니다')

        const pl: PlatformStatusMap = { ...it.pl }
        delete pl[key]
        // TODO(api): PATCH /deploys/:id { platforms }
        patch(id, (x) => ({ ...x, pl }))
        log(`플랫폼 제외 · ${v.title} · ${PLATFORM_NAME[key]}`, id)
        return
      }

      const dup = findDuplicate(items, it.vid, key, id)
      if (dup) {
        return say(
          `중복 예약 차단 — 같은 영상이 ${shortDate(dup.date)} ${dup.time}에 이미 ${PLATFORM_NAME[key]}로 예약돼 있습니다`,
        )
      }
      const err = dailyLimitError(items, videos, it.date, v.prog, [key], id)
      if (err) return say(`추가하지 못했습니다 — ${err}에 걸립니다`)

      patch(id, (x) => ({ ...x, pl: { ...x.pl, [key]: x.status } }))
      log(`플랫폼 추가 · ${v.title} · ${PLATFORM_NAME[key]}`, id)
    },
    [findItem, items, log, patch, say, videos],
  )

  /** 상태 변경 — 이미 끝난(완료/실패) 플랫폼 상태는 건드리지 않습니다 */
  const setItemStatus = useCallback(
    (id: string, status: DeployStatus) => {
      const it = findItem(id)
      if (!it || it.status === status) return

      patch(id, (x) => ({
        ...x,
        status,
        pl: Object.fromEntries(
          Object.entries(x.pl).map(([k, s]) => [
            k,
            s === '게시 완료' || s === '실패' ? s : status,
          ]),
        ) as PlatformStatusMap,
      }))
      log(`상태 변경 · ${videos[it.vid].title} · ${it.status} → ${status}`, id)
    },
    [findItem, log, patch, videos],
  )

  /** 실패한 플랫폼만 다시 보내기 */
  const retryPlatform = useCallback(
    (id: string, key: PlatformKey) => {
      const it = findItem(id)
      if (!it) return

      // TODO(api): POST /deploys/:id/platforms/:key/retry — 아래 setTimeout 은 목업 연출입니다
      patch(id, (x) => ({ ...x, pl: { ...x.pl, [key]: '처리 중' } }))
      log(`다시 보내기 · ${videos[it.vid].title} · ${PLATFORM_NAME[key]}`, id)

      const timer = setTimeout(() => {
        patch(id, (x) => ({ ...x, pl: { ...x.pl, [key]: '게시 완료' } }))
        say(`${PLATFORM_NAME[key]}에 게시했습니다`)
      }, RETRY_MS)
      retryTimers.current.push(timer)
    },
    [findItem, log, patch, say, videos],
  )

  /** 제목·설명 템플릿 변경 */
  const setTemplate = useCallback(
    (id: string, index: number) => {
      const it = findItem(id)
      if (!it || it.tpl === index) return
      patch(id, (x) => ({ ...x, tpl: index }))
      log(`템플릿 변경 · ${videos[it.vid].title} · ${TEMPLATES[index].name}`, id)
    },
    [findItem, log, patch, videos],
  )

  /** 공개 전 테스트 모드 토글 */
  const toggleTest = useCallback(
    (id: string) => {
      const it = findItem(id)
      if (!it || it.status === '게시 완료') return
      patch(id, (x) => ({ ...x, test: !x.test }))
      log(`테스트 모드 ${it.test ? '끔' : '켬'} · ${videos[it.vid].title}`, id)
    },
    [findItem, log, patch, videos],
  )

  /** 배포 취소 */
  const cancelItem = useCallback(
    (id: string) => {
      const it = findItem(id)
      if (!it || it.status === '게시 완료') return
      const v = videos[it.vid]

      // TODO(api): DELETE /deploys/:id
      setItems((prev) => prev.filter((i) => i.id !== id))
      log(
        `배포 취소 · ${v.title} · ${shortDate(it.date)} ${it.time} (${platformKeysOf(it)
          .map((k) => PLATFORM_NAME[k])
          .join(', ')})`,
        null,
      )
      say(`취소했습니다: ${v.title} · ${shortDate(it.date)} ${it.time}`)
    },
    [findItem, log, say, videos],
  )

  /** 배포 추가 — 한 개 */
  const addSingle = useCallback(
    (draft: SingleDraft) => {
      if (!draft.vid) return
      const keys = selectedKeys(draft.pls, PLATFORM_KEYS)
      if (!keys.length) return
      const v = videos[draft.vid]
      const id = `n${Date.now().toString(36)}`

      const item: DeployItem = {
        id,
        date: draft.date,
        time: draft.time,
        vid: draft.vid,
        status: '예약됨',
        pl: Object.fromEntries(keys.map((k) => [k, '예약됨' as DeployStatus])),
        tpl: draft.tpl,
        test: draft.test,
      }

      // TODO(api): POST /deploys
      setItems((prev) => [...prev, item])
      setView('week')
      setWeek(iso(mondayOf(parseDate(draft.date))))
      log(
        `배포 추가 · ${v.title} · ${shortDate(draft.date)} ${draft.time} (${keys
          .map((k) => PLATFORM_NAME[k])
          .join(', ')})${draft.test ? ' · 테스트 모드' : ''}`,
        id,
      )
      say(`예약 저장했습니다: ${v.title} · ${shortDate(draft.date)} ${draft.time}`)
    },
    [log, say, videos],
  )

  /**
   * 묶음 자동 배치 미리보기.
   * gap < 0 이면 06·18시 슬롯의 빈 자리를 앞에서부터 채우고,
   * 그렇지 않으면 시작 시각부터 gap 분 간격으로 늘어놓습니다.
   */
  const planBulk = useCallback(
    (draft: BulkDraft): BulkPlanRow[] => {
      const keys = selectedKeys(draft.pls, PLATFORM_KEYS)
      const pool = items.slice()
      const spots: Array<[DateStr, TimeStr]> = []

      if (draft.gap < 0) {
        for (let d = 0; spots.length < draft.vids.length && d < 60; d++) {
          const date = iso(addDays(parseDate(draft.date), d))
          for (const time of SLOTS) {
            if (d === 0 && toMinutes(time) < toMinutes(draft.time)) continue
            const free = PER_SLOT - pool.filter((i) => i.date === date && i.time === time).length
            for (let f = 0; f < free && spots.length < draft.vids.length; f++) {
              spots.push([date, time])
            }
          }
        }
      }

      return draft.vids.map((vid, i) => {
        const total = toMinutes(draft.time) + i * Math.max(0, draft.gap)
        const [date, time] =
          draft.gap < 0
            ? (spots[i] ?? [draft.date, draft.time])
            : [
                iso(addDays(parseDate(draft.date), Math.floor(total / 1440))),
                fromMinutes(total % 1440),
              ]
        const v = videos[vid]

        let reason = ''
        if (isPast(date, time)) reason = '지난 시간'
        if (!reason) {
          for (const key of keys) {
            const dup = findDuplicate(pool, vid, key)
            if (dup) {
              reason = `중복 예약 · ${PLATFORM_NAME[key]} ${shortDate(dup.date)} ${dup.time}`
              break
            }
          }
        }
        if (!reason) {
          const err = dailyLimitError(pool, videos, date, v.prog, keys)
          if (err) reason = `${err} 초과`
        }
        if (!reason) {
          pool.push({
            id: `tmp${i}`,
            date,
            time,
            vid,
            status: '예약됨',
            tpl: 0,
            test: false,
            pl: Object.fromEntries(keys.map((k) => [k, '예약됨' as DeployStatus])),
          })
        }
        return { vid, date, time, ok: !reason, reason }
      })
    },
    [isPast, items, videos],
  )

  /** 묶음 저장 — 미리보기에서 ok 인 줄만 저장합니다 */
  const addBulk = useCallback(
    (draft: BulkDraft, plan: BulkPlanRow[]) => {
      const keys = selectedKeys(draft.pls, PLATFORM_KEYS)
      const ok = plan.filter((p) => p.ok)
      if (!ok.length) return

      const stamp = Date.now().toString(36)
      const added: DeployItem[] = ok.map((p, i) => ({
        id: `n${stamp}-${i}`,
        date: p.date,
        time: p.time,
        vid: p.vid,
        status: '예약됨',
        pl: Object.fromEntries(keys.map((k) => [k, '예약됨' as DeployStatus])),
        tpl: defaultTemplate(videos[p.vid].type),
        test: false,
      }))

      // TODO(api): POST /deploys/bulk
      setItems((prev) => [...prev, ...added])
      setView('week')
      setWeek(iso(mondayOf(parseDate(ok[0].date))))
      log(
        `묶음 배포 추가 · ${ok.length}건 · ${shortDate(ok[0].date)} ${ok[0].time}부터 ${
          draft.gap < 0 ? '06·18시 빈 자리' : `${draft.gap}분 간격`
        } (${keys.map((k) => PLATFORM_NAME[k]).join(', ')})`,
        null,
      )
      say(`${ok.length}건 예약 저장했습니다`)
    },
    [log, say, videos],
  )

  const goToday = useCallback(() => {
    setWeek(baseWeek)
    setMonth(baseMonth)
  }, [baseMonth, baseWeek])

  return {
    // 데이터
    videos,
    items,
    history,
    today,
    baseWeek,
    now,

    // 화면 상태
    view,
    setView,
    week,
    setWeek,
    month,
    setMonth,
    goToday,

    // 토스트
    toast,
    say,

    // 유틸
    isPast,
    findItem,

    // 동작
    moveItem,
    togglePlatform,
    setItemStatus,
    setTemplate,
    toggleTest,
    retryPlatform,
    cancelItem,
    addSingle,
    planBulk,
    addBulk,
  }
}

export type DeployCalendarController = ReturnType<typeof useDeployCalendar>
