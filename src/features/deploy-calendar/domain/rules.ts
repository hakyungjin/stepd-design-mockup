/*
 * 배포 편성 규칙.
 * ------------------------------------------------------------------
 * 전부 순수 함수입니다. 실제 서비스에서는 같은 규칙이 서버에도 있어야 하므로,
 * 여기 있는 함수 시그니처를 그대로 API 검증 응답에 대응시키면 됩니다.
 */

import type { DateStr, TimeStr } from '@/lib/date'
import { shortDate, timestampOf } from '@/lib/date'
import { DAILY_LIMIT, PLATFORM_NAME, PROGRAM_NAME } from '../constants'
import type { DeployItem, PlatformKey, ProgramKey, Video } from '../types'

export type VideoMap = Record<string, Video>

/** 모든 플랫폼까지 게시가 끝난 건 — 주간 뷰에서 "게시 완료 N건"으로 접힙니다. */
export const isSettled = (it: DeployItem): boolean =>
  it.status === '게시 완료' && Object.values(it.pl).every((s) => s === '게시 완료')

export const isPastAt = (now: Date, date: DateStr, time: TimeStr): boolean =>
  timestampOf(date, time) <= now.getTime()

/** 같은 날 · 같은 프로그램 · 같은 플랫폼에 몇 건이 잡혀 있는지 */
export const countByProgram = (
  items: DeployItem[],
  videos: VideoMap,
  date: DateStr,
  prog: ProgramKey,
  key: PlatformKey,
  exceptId?: string,
): number =>
  items.filter(
    (i) =>
      i.id !== exceptId &&
      i.date === date &&
      videos[i.vid]?.prog === prog &&
      i.pl[key] !== undefined,
  ).length

/** 같은 영상이 같은 플랫폼에 이미 예약돼 있으면 그 건을 돌려줍니다. */
export const findDuplicate = (
  items: DeployItem[],
  vid: string,
  key: PlatformKey,
  exceptId?: string,
): DeployItem | undefined =>
  items.find((i) => i.id !== exceptId && i.vid === vid && i.pl[key] !== undefined)

/** 하루 상한에 걸리면 사람이 읽을 수 있는 사유를, 아니면 빈 문자열을 돌려줍니다. */
export const dailyLimitError = (
  items: DeployItem[],
  videos: VideoMap,
  date: DateStr,
  prog: ProgramKey,
  keys: PlatformKey[],
  exceptId?: string,
): string => {
  for (const key of keys) {
    if (countByProgram(items, videos, date, prog, key, exceptId) >= DAILY_LIMIT[prog]) {
      return `${PROGRAM_NAME[prog]} · ${PLATFORM_NAME[key]} 하루 ${DAILY_LIMIT[prog]}건 상한`
    }
  }
  return ''
}

/** 중복 예약 사유 문구 */
export const duplicateReason = (dup: DeployItem, key: PlatformKey): string =>
  `중복 예약 차단 — 같은 영상이 ${shortDate(dup.date)} ${dup.time}에 이미 ${PLATFORM_NAME[key]}로 예약돼 있습니다`

/** 아이템에서 켜져 있는 플랫폼 키 목록 */
export const platformKeysOf = (it: DeployItem): PlatformKey[] =>
  Object.keys(it.pl) as PlatformKey[]

/** 체크박스 맵에서 켜져 있는 플랫폼 키 목록 (PLATFORMS 순서 유지) */
export const selectedKeys = (
  map: Partial<Record<PlatformKey, boolean>>,
  order: readonly PlatformKey[],
): PlatformKey[] => order.filter((k) => map[k])
