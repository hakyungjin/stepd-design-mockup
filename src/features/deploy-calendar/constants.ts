import type {
  DeployStatus,
  PlatformKey,
  ProgramKey,
  Video,
  VideoType,
} from './types'
import type { TimeStr } from '@/lib/date'

/* ------------------------------------------------------------------ *
 * 플랫폼
 * ------------------------------------------------------------------ */

export const PLATFORMS: ReadonlyArray<{ key: PlatformKey; name: string }> = [
  { key: 'yt', name: 'YouTube' },
  { key: 'ig', name: 'Instagram' },
  { key: 'fb', name: 'Facebook' },
  { key: 'tt', name: 'TikTok' },
]

export const PLATFORM_KEYS = PLATFORMS.map((p) => p.key)

export const PLATFORM_NAME = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p.name]),
) as Record<PlatformKey, string>

/** 캘린더 칩에 쓰는 2글자 축약 + 브랜드색 */
export const PLATFORM_BADGE: Record<PlatformKey, { short: string; color: string }> = {
  yt: { short: 'YT', color: '#DC2626' },
  ig: { short: 'IG', color: '#C026D3' },
  fb: { short: 'FB', color: '#2563EB' },
  tt: { short: 'TT', color: '#475569' },
}

/** 월간 뷰에서 같은 시각이면 이 순서로 정렬 */
export const PLATFORM_ORDER: Record<PlatformKey, number> = { yt: 0, ig: 1, fb: 2, tt: 3 }

/* ------------------------------------------------------------------ *
 * 프로그램(IP)
 * ------------------------------------------------------------------ */

export const PROGRAM_NAME: Record<ProgramKey, string> = {
  solo: '나는 SOLO',
  alone: '나 혼자 산다',
  siblings: '연애남매',
  marble: '지구마불 세계여행',
}

export const PROGRAM_SHORT: Record<ProgramKey, string> = {
  solo: 'SOLO',
  alone: '나혼산',
  siblings: '연애남매',
  marble: '지구마불',
}

/** 프로그램별 · 플랫폼별 하루 업로드 상한 */
export const DAILY_LIMIT: Record<ProgramKey, number> = {
  solo: 4,
  alone: 3,
  siblings: 3,
  marble: 2,
}

export const PROGRAM_KEYS = Object.keys(PROGRAM_NAME) as ProgramKey[]

/* ------------------------------------------------------------------ *
 * 영상 유형 / 상태 색
 * ------------------------------------------------------------------ */

export interface TypeStyle {
  label: string
  /** 카드 배경 */
  bg: string
  /** 카드 테두리 */
  border: string
  /** 범례 점 */
  dot: string
}

export const VIDEO_TYPE: Record<VideoType, TypeStyle> = {
  short: {
    label: '숏폼',
    bg: 'rgba(28,96,255,.13)',
    border: 'rgba(28,96,255,.4)',
    dot: '#3B82F6',
  },
  clip: {
    label: '클립',
    bg: 'rgba(168,85,247,.13)',
    border: 'rgba(168,85,247,.4)',
    dot: '#A855F7',
  },
  hl: {
    label: '하이라이트',
    bg: 'rgba(20,184,166,.12)',
    border: 'rgba(20,184,166,.4)',
    dot: '#14B8A6',
  },
}

export interface StatusStyle {
  /** 글자색 */
  fg: string
  /** 배경 */
  bg: string
  /** 테두리 */
  border: string
  /** 범례 점 (불투명색) */
  dot: string
}

export const STATUS_STYLE: Record<DeployStatus, StatusStyle> = {
  초안: {
    fg: 'var(--text-muted)',
    bg: 'rgba(148,163,184,.1)',
    border: 'rgba(148,163,184,.3)',
    dot: '#94A3B8',
  },
  '승인 대기': {
    fg: 'hsl(var(--status-warn))',
    bg: 'rgba(245,158,11,.12)',
    border: 'rgba(245,158,11,.4)',
    dot: '#F59E0B',
  },
  예약됨: {
    fg: 'var(--text-accent)',
    bg: 'rgba(28,96,255,.13)',
    border: 'rgba(28,96,255,.4)',
    dot: '#3B82F6',
  },
  '처리 중': {
    fg: '#22D3EE',
    bg: 'rgba(34,211,238,.1)',
    border: 'rgba(34,211,238,.35)',
    dot: '#22D3EE',
  },
  '게시 완료': {
    fg: 'var(--status-success-text)',
    bg: 'rgba(16,185,129,.1)',
    border: 'rgba(16,185,129,.32)',
    dot: '#10B981',
  },
  실패: {
    fg: 'hsl(var(--status-error))',
    bg: 'rgba(239,68,68,.1)',
    border: 'rgba(239,68,68,.4)',
    dot: '#EF4444',
  },
}

export const STATUSES = Object.keys(STATUS_STYLE) as DeployStatus[]

/** 칩 안에서 쓰는 초압축 라벨 */
export const STATUS_SHORT: Record<DeployStatus, string> = {
  초안: '초안',
  '승인 대기': '대기',
  예약됨: '예약',
  '처리 중': '처리중',
  '게시 완료': '완료',
  실패: '실패',
}

export const GENRE_STYLE: Record<'예능' | '드라마', { bg: string; fg: string }> = {
  예능: { bg: 'rgba(245,158,11,.22)', fg: '#FBBF24' },
  드라마: { bg: 'rgba(239,68,68,.22)', fg: '#F87171' },
}

/* ------------------------------------------------------------------ *
 * 슬롯 정책
 * ------------------------------------------------------------------ */

/** 주간 뷰의 행(편성 슬롯) */
export const SLOTS: ReadonlyArray<TimeStr> = ['06:00', '18:00']

/** 한 슬롯에 넣을 수 있는 최대 건수 */
export const PER_SLOT = 4

/** 임의 시각이 어느 슬롯에 속하는지 */
export const slotOf = (time: TimeStr): TimeStr => {
  let found = SLOTS[0]
  for (const s of SLOTS) {
    if (toMin(s) <= toMin(time)) found = s
  }
  return found
}

const toMin = (t: TimeStr) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/* ------------------------------------------------------------------ *
 * 제목·설명 템플릿
 * ------------------------------------------------------------------ */

export interface Template {
  name: string
  title: (v: Video) => string
  desc: (v: Video) => string
}

const noSpace = (s: string) => s.replace(/\s/g, '')

export const TEMPLATES: Template[] = [
  {
    name: '기본',
    title: (v) => `${PROGRAM_NAME[v.prog]} | ${v.title}`,
    desc: (v) => `${PROGRAM_NAME[v.prog]} 공식 채널 · 본방송 매주 수요일 밤 10시 30분 ENA`,
  },
  {
    name: '숏폼',
    title: (v) =>
      `${v.title.replace(/ 숏폼$/, '')} #${noSpace(PROGRAM_NAME[v.prog])} #shorts`,
    desc: (v) => `전체 회차는 ENA·티빙에서 · #${noSpace(PROGRAM_NAME[v.prog])}`,
  },
  {
    name: '하이라이트',
    title: (v) => `[${PROGRAM_NAME[v.prog]} 하이라이트] ${v.title}`,
    desc: () => '놓친 장면을 모았습니다. 다음 회 본방송은 ENA에서 확인하세요.',
  },
]

/** 영상 유형에 맞는 기본 템플릿 인덱스 */
export const defaultTemplate = (type: VideoType): number =>
  type === 'short' ? 1 : type === 'hl' ? 2 : 0

/* ------------------------------------------------------------------ *
 * 경고 문구 (플랫폼 정책)
 * ------------------------------------------------------------------ */

export const WARN_TIKTOK =
  'TikTok은 계정 심사가 끝나기 전까지 "나만 보기"로만 올라가고, 공개 전환은 TikTok 앱에서 해야 합니다.'

export const WARN_IG_LONG =
  'Instagram은 90초를 넘으면 릴스가 아닌 일반 동영상으로 올라갑니다.'

export const IG_REELS_MAX_SEC = 90
