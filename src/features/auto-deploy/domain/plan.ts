/*
 * 발행 계획 규칙 — 순수 함수만 둡니다.
 * 실제 서비스에서는 서버가 같은 규칙을 다시 검사해야 합니다.
 */

import { DAYS7, NOW_T, platOf } from '../constants'
import type { Hold, PlanEntry, PlanFrom, Rule } from '../types'

/** 이미 지나간 칸인지 (오늘이고 지금 시각보다 이른 칸) */
export const isPast = (p: { day: number; t: string }): boolean => p.day === 0 && p.t < NOW_T

/**
 * 순방이 채운 기본 계획.
 * 채널마다 그 플랫폼에 올릴 수 있는 영상만 골라 요일 × 시각 칸을 채웁니다.
 * 마지막 발행일의 마지막 시각은 "아직 못 채운 칸"으로 비워 둡니다.
 */
export const buildPlan = (rule: Rule): PlanEntry[] => {
  const out: PlanEntry[] = []
  const sl = rule.slots
  const pubDays = DAYS7.filter((d) => rule.weekdays.includes(d.wd))
  const lastDay = pubDays.length ? pubDays[pubDays.length - 1].i : -1

  rule.channels.forEach((c, ci) => {
    const P = platOf(c.icon)
    const pool = rule.holds.filter((h) => P.ok(h.kind))
    if (!pool.length) return
    let k = ci * 3
    pubDays.forEach((d) =>
      sl.forEach((x, si) => {
        for (let j = 0; j < (x.n || 1); j++) {
          // 아직 못 채운 칸
          if (d.i === lastDay && si === sl.length - 1) continue
          for (let q = 0; q < pool.length; q++) {
            const h = pool[k++ % pool.length]
            if (!out.some((p) => p.ch === c.name && p.hid === h.id)) {
              out.push({ hid: h.id, ch: c.name, day: d.i, t: x.t })
              break
            }
          }
        }
      }),
    )
  })
  return out
}

export const upcomingOf = (plan: PlanEntry[]): PlanEntry[] => plan.filter((p) => !isPast(p))

/** 칸 하나의 수용량 */
export const capacityOf = (rule: Rule, t: string): number =>
  rule.slots.find((x) => x.t === t)?.n ?? 1

export type PlaceError =
  | { ok: false; reason: string }
  | { ok: true }

/** 옮기기·넣기가 가능한지 검사합니다 */
export const canPlace = (
  rule: Rule,
  plan: PlanEntry[],
  hold: Hold,
  ch: string,
  day: number,
  t: string,
  from?: PlanFrom | null,
): PlaceError => {
  const c = rule.channels.find((x) => x.name === ch)
  if (!c || !DAYS7[day] || !rule.weekdays.includes(DAYS7[day].wd) || !rule.slots.some((x) => x.t === t))
    return { ok: false, reason: '발행 가능한 날짜와 시간대를 선택하세요' }
  if (from && isPast(from)) return { ok: false, reason: '이미 발행된 영상은 이동할 수 없습니다' }
  const P = platOf(c?.icon ?? 'YT')
  if (day === 0 && t < NOW_T) return { ok: false, reason: '이미 지난 시각입니다' }
  if (!P.ok(hold.kind))
    return { ok: false, reason: `${P.name}에는 올릴 수 없는 영상입니다 — ${P.rule}` }
  // 슬롯 수는 자동 편성의 기준입니다. 수동 편성은 같은 시간대에 영상을 추가할 수 있습니다.
  const dup = plan.find(
    (p) =>
      p.ch === ch &&
      p.hid === hold.id &&
      !(from && from.ch === ch && p.day === from.day && p.t === from.t),
  )
  if (dup)
    return {
      ok: false,
      reason: `이미 ${P.name} ${DAYS7[dup.day].short} ${dup.t}에 편성된 영상입니다`,
    }
  return { ok: true }
}

/** 이 영상이 어디에 언제 나가는지 한 줄로 */
export const publishText = (rule: Rule, plan: PlanEntry[], hold: Hold): string => {
  const ps = upcomingOf(plan)
    .filter((p) => p.hid === hold.id)
    .sort((a, b) => a.day - b.day || a.t.localeCompare(b.t))
  return ps.length
    ? ps.map((p) => `${platOf(rule.channels.find((c) => c.name === p.ch)?.icon ?? 'YT').name} ${DAYS7[p.day].short} ${p.t}`).join(' · ')
    : '편성 안 됨'
}

/** 저장하면 아직 안 나간 영상을 다시 만들어야 하는 변경인지 */
const LOOK_FIELDS = [
  'aspect',
  'template',
  'thumb',
  'orient',
  'titleSize',
  'lineHeight',
  'letter',
  'titleShadow',
  'titleTop',
  'capBottom',
  'logo',
] as const

export const looksChanged = (a: Rule, b: Rule): boolean =>
  LOOK_FIELDS.some((f) => a[f] !== b[f])

/** 설정 변경 요약 — 하단 변경 바에 칩으로 보입니다 */
export const diffRule = (o: Rule, d: Rule): string[] => {
  const out: string[] = []
  const WD = ['월', '화', '수', '목', '금', '토', '일']
  if (o.programs.join() !== d.programs.join()) out.push(`프로그램 ${d.programs.length}개`)
  if (o.mediaKind !== d.mediaKind) out.push(`소재 ${o.mediaKind} → ${d.mediaKind}`)
  if (o.weekdays.join() !== d.weekdays.join())
    out.push(`요일 ${d.weekdays.map((i) => WD[i]).join('·') || '없음'}`)
  const fmt = (ss: Rule['slots']) => ss.map((x) => `${x.t} ${x.n}개`).join(' / ')
  if (fmt(o.slots) !== fmt(d.slots)) out.push(`발행 할당 ${fmt(d.slots) || '없음'}`)
  ;(
    [
      ['titleSize', '타이틀 크기'],
      ['lineHeight', '행간'],
      ['letter', '자간'],
      ['titleTop', '타이틀 위치'],
      ['capBottom', '자막 위치'],
    ] as const
  ).forEach(([f, label]) => {
    if (o[f] !== d[f]) out.push(`${label} → ${d[f]}`)
  })
  if (o.titleShadow !== d.titleShadow)
    out.push(d.titleShadow === false ? '타이틀 그림자 끔' : '타이틀 그림자 켬')
  if (o.logo !== d.logo) out.push(d.logo ? '로고 표시 켬' : '로고 표시 끔')
  ;(
    [
      ['aspect', '화면비'],
      ['template', '템플릿'],
      ['thumb', '썸네일'],
      ['orient', '방향'],
      ['lang', '자막 언어'],
    ] as const
  ).forEach(([f, label]) => {
    if (o[f] !== d[f]) out.push(`${label} → ${d[f]}`)
  })
  return out
}
