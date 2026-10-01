/*
 * 자동 배포 정책 상수.
 * 원본 목업(w_auto.dc.html)의 상수를 그대로 옮겼습니다.
 * STEPD 연동 시 서버 enum 과 맞출 자리입니다.
 */

import type { HoldKind, LayoutPreset, PlatformKey } from './types'

export const WD = ['월', '화', '수', '목', '금', '토', '일']

/** 서버 RULE_ASPECTS 와 같은 4종 (라벨은 web ASPECT_LABELS) */
export const ASPECTS = ['전체 담기', '꽉 채우기', '위 자막띠', '위아래 띠']

export const TEMPLATES = ['예능 팝', '드라마 베이직', '뉴스 타이트']

export const THUMBS = ['프레임 추출', 'AI 생성']

export const ORIENTS = ['세로 · AI 리프레임', '세로 · 리프레임 없음', '가로 · 리프레임 없음']

export const LANGS = [
  '한국어',
  '베트남어 (Tiếng Việt)',
  '인도네시아어 (Bahasa Indonesia)',
  '영어 (English)',
]

export const MEDIA_KINDS = ['쇼츠', '클립', '둘 다'] as const

export const TITLE_ALT_KINDS = ['기본', '실명형', '인용형', '상황형']

/** 제목 강조색 (서버 layout.titleColor · #RRGGBB) — 표준 금빛이 기본 */
export const TITLE_COLORS: Array<{ name: string; hex: string }> = [
  { name: '금빛(기본)', hex: '#F3AF4F' },
  { name: '청록', hex: '#40E0E0' },
  { name: '노랑', hex: '#F0E800' },
  { name: '흰색', hex: '#FFFFFF' },
  { name: '연분홍', hex: '#FF7EA8' },
  { name: '하늘', hex: '#6D9BFF' },
]

export const DEFAULT_TITLE_COLOR = TITLE_COLORS[0].hex

/** 자막 제약 */
export const CUE_MAX = 600
export const CUE_TEXT_MAX = 300

/**
 * 템플릿은 **배치 시드**만 정합니다 —
 * 화면비(aspect)·썸네일(thumbnailMode)은 서버에서 독립 필드입니다.
 * titleSize 는 배율 %(기본 100), titleShadow 는 그림자 켬/끔.
 */
export const TEMPLATE_PRESETS: Record<string, LayoutPreset> = {
  '예능 팝': { titleSize: 115, lineHeight: 1.2, letter: -0.5, titleShadow: true, titleTop: 6, capBottom: 22, logo: true },
  '드라마 베이직': { titleSize: 100, lineHeight: 1.3, letter: 0, titleShadow: true, titleTop: 8, capBottom: 26, logo: true },
  '뉴스 타이트': { titleSize: 90, lineHeight: 1.4, letter: 0.5, titleShadow: false, titleTop: 12, capBottom: 14, logo: false },
}

export const PRESET_KEYS: Array<keyof LayoutPreset> = [
  'titleSize',
  'lineHeight',
  'letter',
  'titleShadow',
  'titleTop',
  'capBottom',
  'logo',
]

/** 현재 배치 값이 템플릿 기본값 그대로인지 */
export const matchesTemplate = (o: LayoutPreset & { template: string }): boolean => {
  const p = TEMPLATE_PRESETS[o.template]
  return !!p && PRESET_KEYS.every((k) => o[k] === p[k])
}

/** 플랫폼 제약 — 후보 목록에는 제약에 맞는 것만 보입니다 */
export const PLAT: Record<PlatformKey, { name: string; rule: string; ok: (kind: HoldKind) => boolean }> = {
  YT: { name: 'YouTube', rule: '가로·세로 · 숏폼 최대 3분', ok: () => true },
  NC: { name: '네이버 클립', rule: '세로만 · 최대 2분', ok: (k) => k === '숏폼' },
  TT: { name: 'TikTok', rule: '세로만 · 초안으로 올라감', ok: (k) => k === '숏폼' },
  IG: { name: 'Instagram', rule: '세로만 · 최대 90초', ok: (k) => k === '숏폼' },
}

export const platOf = (icon: string) => PLAT[icon as PlatformKey] ?? PLAT.YT

/** 목업이 보는 "지금" */
export const NOW_T = '14:00'

/** 오늘(2026-09-29)부터 7일 */
export const DAYS7 = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(2026, 8, 29 + i)
  const wd = (d.getDay() + 6) % 7
  const md = `${d.getMonth() + 1}.${d.getDate()}`
  return { i, wd, label: `${md} (${WD[wd]})`, short: i === 0 ? '오늘' : i === 1 ? '내일' : md }
})

/** 발행 시각 후보 */
export const SLOT_TIMES = ['06:00', '09:00', '12:30', '15:00', '18:00', '21:00', '23:00']

/** 마법사에서 고를 수 있는 배포 채널 */
export const WIZARD_CHANNELS: Array<{ name: string; sub: string }> = [
  { name: 'YouTube · ENA 공식', sub: '쇼츠 업로드 가능' },
  { name: '네이버 클립 · ENA ENT', sub: '세로 클립 전용' },
  { name: 'Instagram · ENA', sub: '릴스로 발행' },
  { name: 'TikTok · ENA', sub: '운영 설정에서 꺼져 있어 기록만 남습니다' },
  { name: 'Facebook · ENA', sub: '릴스로 발행' },
]

/** 목록 필터의 배포 채널 */
export const CHANNEL_FILTERS = [
  'YouTube',
  '네이버 클립',
  'TikTok',
  'Instagram',
  'Facebook',
]

/* ---------------- 시각 유틸 ---------------- */

/** 초 → "0:08.2" (편집자에게 보이는 시각은 클립 기준 0초부터) */
export const fmtT = (sec: number): string => {
  const s = Math.max(0, Math.round(sec * 10) / 10)
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.round((s % 1) * 10)}`
}

/** "0:08.2" → 초 (형식이 틀리면 null) */
export const parseT = (str: string): number | null => {
  const m = String(str).trim().match(/^(?:(\d+):)?(\d+(?:\.\d)?)$/)
  if (!m) return null
  return Number(m[1] || 0) * 60 + Number(m[2])
}

/** "1:23" → 83 */
export const durSec = (dur: string): number => {
  const [m, s] = String(dur).split(':').map(Number)
  return m * 60 + s
}

/** 영상 종류별 배지 색 */
export const KIND_TONE: Record<HoldKind, { bg: string; fg: string }> = {
  숏폼: { bg: 'var(--bg-accent-subtle)', fg: 'var(--badge-text)' },
  클립: { bg: 'var(--status-success-bg)', fg: 'var(--status-success-text)' },
  하이라이트: { bg: 'rgba(245,158,11,.14)', fg: 'hsl(var(--status-warn))' },
}

/** 텍스트 카드의 왼쪽 띠 색 */
export const KIND_BAR: Record<HoldKind, string> = {
  숏폼: 'var(--bg-active)',
  클립: 'var(--status-success-text)',
  하이라이트: 'var(--color-amber-600)',
}
