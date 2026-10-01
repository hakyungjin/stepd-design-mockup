import type { DateStr, TimeStr } from '@/lib/date'

/** 배포 대상 플랫폼 */
export type PlatformKey = 'yt' | 'ig' | 'fb' | 'tt'

/** 배포 상태 — 서버 enum 과 1:1 로 대응시킬 자리 */
export type DeployStatus = '초안' | '승인 대기' | '예약됨' | '처리 중' | '게시 완료' | '실패'

/** 영상 유형 */
export type VideoType = 'short' | 'clip' | 'hl'

/** 프로그램(IP) */
export type ProgramKey = 'solo' | 'alone' | 'siblings' | 'marble'

/** 플랫폼별 상태 맵 — 키가 있으면 "그 플랫폼에 배포함" */
export type PlatformStatusMap = Partial<Record<PlatformKey, DeployStatus>>

export interface Video {
  id: string
  title: string
  type: VideoType
  /** 길이(초) */
  dur: number
  /** 추천 점수 0~100 */
  score: number
  prog: ProgramKey
  /** 썸네일 URL */
  thumb: string
  /** 렌더링 완료 여부 — false 면 예약 불가 */
  ready: boolean
}

/** 예약/게시된 배포 한 건 */
export interface DeployItem {
  id: string
  date: DateStr
  time: TimeStr
  /** Video.id */
  vid: string
  status: DeployStatus
  pl: PlatformStatusMap
  /** 제목·설명 템플릿 인덱스 */
  tpl: number
  /** 공개 전 테스트 모드 */
  test: boolean
}

/**
 * 과거 실적(아카이브) 항목.
 * 실제 서비스에서는 "이미 게시가 끝나 상세 편집이 불가능한 레코드"에 해당합니다.
 */
export interface ArchiveItem {
  id: string
  arc: true
  date: DateStr
  time: TimeStr
  title: string
  genre: '예능' | '드라마'
  status: DeployStatus
  pl: PlatformStatusMap
}

export type CalendarEntry = DeployItem | ArchiveItem

export const isArchive = (e: CalendarEntry): e is ArchiveItem =>
  (e as ArchiveItem).arc === true

export interface HistoryEntry {
  /** 표시용 시각 문자열 (예: '9/30 09:12') */
  at: string
  who: string
  text: string
  /** 연결된 DeployItem.id — 전역 변경(취소 등)이면 null */
  id: string | null
}

export type CalendarView = 'today' | 'week' | 'month'

/** "배포 추가" 모달의 단일 등록 폼 */
export interface SingleDraft {
  date: DateStr
  time: TimeStr
  vid: string | null
  pls: Partial<Record<PlatformKey, boolean>>
  tpl: number
  test: boolean
}

/** "배포 추가" 모달의 묶음 등록 폼 */
export interface BulkDraft {
  vids: string[]
  date: DateStr
  time: TimeStr
  /** -1 이면 06·18시 빈 자리 채우기, 그 외에는 분 간격 */
  gap: number
  pls: Partial<Record<PlatformKey, boolean>>
}

/** 묶음 배치 미리보기 한 줄 */
export interface BulkPlanRow {
  vid: string
  date: DateStr
  time: TimeStr
  ok: boolean
  reason: string
}
