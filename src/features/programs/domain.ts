/*
 * 프로그램 목록 규칙 — STEPD 본 저장소 `apps/web/src/lib/programs.ts` 를 그대로 옮겼습니다.
 *
 * 지켜야 할 둘:
 *  1. 필터 칩의 개수는 **자기 축을 뺀 나머지 필터를 적용한 잔여 수**다(residualCounts).
 *     "종영 3" 을 누르면 정말 3개가 남아야 한다.
 *  2. 섹션 칩은 고정 목록이 아니라 데이터에서 뽑는다(sectionsOf).
 *
 * 순수 함수만 둡니다(React 없음).
 */

import type { Program, ProgramStatus } from './data'

export const PROGRAM_STATUSES: ProgramStatus[] = ['airing', 'ended', 'upcoming']

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  airing: '방영 중',
  ended: '종영',
  upcoming: '편성 예정',
}

/* ---------------- 권리 윈도우 ---------------- */

/** 만료 임박으로 볼 잔여 일수 */
export const RIGHTS_EXPIRING_DAYS = 30

export interface RightsWindow {
  text: string
  /** 만료 임박·만료됨 — 카드에서 레드 톤 */
  expiring: boolean
  /** 남은 일수. 만료일이 없으면 null, 이미 지났으면 음수 */
  daysLeft: number | null
}

const parseISODate = (iso: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/**
 * 카드·헤더에 붙는 권리 태그.
 *
 * 경고까지가 전부입니다 — 만료됐다고 배포가 자동으로 막히지는 않습니다.
 */
export function rightsWindowOf(program: Program, today: Date): RightsWindow | null {
  const note = program.rightsNote?.trim()
  const until = program.rightsUntil?.trim()
  if (!until) return note ? { text: note, expiring: false, daysLeft: null } : null

  const untilMs = parseISODate(until)
  if (untilMs === null) return { text: note ?? until, expiring: false, daysLeft: null }

  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const daysLeft = Math.round((untilMs - todayMs) / 86_400_000)

  if (daysLeft < 0) {
    return { text: `권리 만료됨 · ${until}${note ? ` · ${note}` : ''}`, expiring: true, daysLeft }
  }
  if (daysLeft <= RIGHTS_EXPIRING_DAYS) {
    return {
      text: `만료 D-${daysLeft}${note ? ` · ${note}` : ' · 재계약 확인'}`,
      expiring: true,
      daysLeft,
    }
  }
  return { text: `디지털 권리 ${until}`, expiring: false, daysLeft }
}

/* ---------------- 필터 ---------------- */

export interface ProgramFilters {
  /** 프로그램명 · 담당 PD · 섹션에 걸리는 검색어 */
  q: string
  /** 섹션. "전체" 면 미적용 */
  section: string
  /** 편성 상태. "전체" 면 미적용 */
  status: ProgramStatus | '전체'
  mineOnly: boolean
}

export const ALL = '전체'

export const EMPTY_PROGRAM_FILTERS: ProgramFilters = {
  q: '',
  section: ALL,
  status: ALL,
  mineOnly: false,
}

const matchQuery = (p: Program, q: string) => {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return `${p.title} ${p.owner ?? ''} ${p.section}`.toLowerCase().includes(needle)
}

const matchSection = (p: Program, section: string) => section === ALL || p.section === section

const matchStatus = (p: Program, status: ProgramFilters['status']) =>
  status === ALL || p.status === status

/** 담당자는 이름 문자열로 붙습니다 — 계정 시스템이 생기면 여기만 userId 비교로 바꿉니다 */
const matchMine = (p: Program, mineOnly: boolean, me: string) =>
  !mineOnly || (Boolean(p.owner) && p.owner === me)

export function filterPrograms(programs: Program[], f: ProgramFilters, me: string): Program[] {
  return programs.filter(
    (p) =>
      matchQuery(p, f.q) &&
      matchSection(p, f.section) &&
      matchStatus(p, f.status) &&
      matchMine(p, f.mineOnly, me),
  )
}

export interface ResidualCounts {
  /** 상태 칩용 — 자기 축(status)만 빼고 나머지를 적용한 결과 */
  status: Record<string, number>
  section: Record<string, number>
  /** "내 담당만" 을 눌렀을 때 남을 개수 */
  mine: number
  /** 현재 필터 전부 적용 후 개수 */
  total: number
}

/**
 * 각 필터 칩에 붙일 개수.
 *
 * 핵심은 **자기 축을 제외**하는 것입니다. 상태 칩의 개수를 셀 때 현재 상태 필터는 무시하고
 * 검색어·섹션·담당만 적용합니다. 그래야 "종영 3" 을 누르면 정말 3개가 남습니다.
 */
export function residualCounts(
  programs: Program[],
  f: ProgramFilters,
  me: string,
): ResidualCounts {
  const statusBase = programs.filter(
    (p) => matchQuery(p, f.q) && matchSection(p, f.section) && matchMine(p, f.mineOnly, me),
  )
  const sectionBase = programs.filter(
    (p) => matchQuery(p, f.q) && matchStatus(p, f.status) && matchMine(p, f.mineOnly, me),
  )
  const mineBase = programs.filter(
    (p) => matchQuery(p, f.q) && matchSection(p, f.section) && matchStatus(p, f.status),
  )

  const status: Record<string, number> = { [ALL]: statusBase.length }
  for (const s of PROGRAM_STATUSES) status[s] = statusBase.filter((p) => p.status === s).length

  const section: Record<string, number> = { [ALL]: sectionBase.length }
  for (const p of sectionBase) section[p.section] = (section[p.section] ?? 0) + 1

  return {
    status,
    section,
    mine: mineBase.filter((p) => Boolean(p.owner) && p.owner === me).length,
    total: filterPrograms(programs, f, me).length,
  }
}

/**
 * 섹션 목록은 데이터에서 뽑습니다 — 예능·드라마 말고도 뮤직·교양·라이프·스포츠를 씁니다.
 * 목록에 없는 섹션이 필터에서 빠지면 못 찾습니다.
 */
export function sectionsOf(programs: Program[]): string[] {
  const seen = new Map<string, number>()
  for (const p of programs) seen.set(p.section, (seen.get(p.section) ?? 0) + 1)
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .map(([s]) => s)
}

/**
 * 상태 필터를 좁혔을 때 띄울 안내. 종영·편성 예정은 "왜 할 일이 없는지" 를
 * 적어 주지 않으면 고장으로 읽힙니다.
 */
export function statusNoteFor(status: ProgramFilters['status']): string | null {
  if (status === 'ended') {
    return '종영작은 새 회차가 들어오지 않습니다 — 기존 회차 재활용과 권리 만료일만 관리합니다. 아카이브 검색으로 찾은 구간은 그대로 클립으로 만들 수 있습니다.'
  }
  if (status === 'upcoming') return '첫 방송 전이라 분석할 회차가 없습니다.'
  return null
}
