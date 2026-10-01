/**
 * 날짜·시간 유틸.
 *
 * 이 목업은 "로컬 타임존의 날짜(YYYY-MM-DD)"와 "시각(HH:mm)"을 문자열로 다룹니다.
 * 서버 연동 시에는 ISO8601(UTC) <-> 이 포맷 변환만 어댑터에서 처리하면 됩니다.
 */

/** YYYY-MM-DD */
export type DateStr = string
/** HH:mm */
export type TimeStr = string

export const pad = (n: number): string => String(n).padStart(2, '0')

/** Date -> 'YYYY-MM-DD' (로컬 기준) */
export const iso = (d: Date): DateStr =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** 'YYYY-MM-DD' -> Date (로컬 자정) */
export const parseDate = (s: DateStr): Date => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** 그 주의 월요일 */
export const mondayOf = (d: Date): Date => addDays(d, -((d.getDay() + 6) % 7))

/** 'YYYY-MM-DD' -> 'M/D' */
export const shortDate = (s: DateStr): string => {
  const d = parseDate(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 'HH:mm' -> 자정 기준 분 */
export const toMinutes = (t: TimeStr): number => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** 자정 기준 분 -> 'HH:mm' (24시간 넘어가면 랩어라운드) */
export const fromMinutes = (m: number): TimeStr =>
  `${pad(Math.floor(m / 60) % 24)}:${pad(((m % 60) + 60) % 60)}`

/** 날짜+시각의 epoch ms */
export const timestampOf = (date: DateStr, time: TimeStr): number =>
  parseDate(date).getTime() + toMinutes(time) * 60_000

export const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

export const dowLabel = (date: DateStr): string => DOW_LABELS[parseDate(date).getDay()]

/** 초 단위 길이를 '48초' / '10분 12초' 로 */
export const durationText = (seconds: number): string =>
  seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분 ${pad(seconds % 60)}초`

/** 'YYYY-MM' 접두 비교용 */
export const monthKey = (date: DateStr): string => date.slice(0, 7)
