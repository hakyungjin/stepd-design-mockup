/*
 * 성과 화면 목 데이터.
 * STEPD 연동 시 이 파일을 API 응답으로 교체하세요.
 */

import { frameThumb } from '@/lib/frames'

export type MetricKey = 'rev' | 'views' | 'rpm'
export type VideoType = 'short' | 'clip' | 'hl'

export const TYPE_LABEL: Record<VideoType, string> = {
  short: '숏폼',
  clip: '클립',
  hl: '하이라이트',
}

/** 채널별 트래픽 비중 (필터링 시 값을 비례 축소하는 데 씁니다) */
export const CHANNEL_SHARE: Record<string, number> = {
  'ENA 예능': 0.46,
  '나는 SOLO 공식': 0.3,
  'ENA 드라마': 0.16,
  'SKY 채널': 0.08,
}

export const CHANNELS = Object.keys(CHANNEL_SHARE)

/** 유형별 [조회 비중, 수익 비중, 평균 완주율] */
export const TYPE_SHARE: Record<string, [number, number, number]> = {
  all: [1, 1, 68.2],
  short: [0.52, 0.38, 79.4],
  clip: [0.28, 0.3, 62.1],
  hl: [0.2, 0.32, 51.8],
}

export interface DayPoint {
  index: number
  md: string
  iso: string
  views: number
  rev: number
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 2026년 9월 30일치 일별 조회·수익 (결정적으로 생성) */
export const DAYS: DayPoint[] = (() => {
  const raw = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(2026, 8, i + 1)
    const dow = d.getDay()
    let v = 1 + 0.14 * Math.sin(i / 2.3) + 0.06 * Math.sin(i * 1.7)
    if (dow === 4) v *= 1.42
    if (dow === 3) v *= 1.12
    if (dow === 5) v *= 1.15
    if (i >= 28) v *= 1.55
    let r = 1 + 0.05 * Math.sin(i / 3.1)
    if (i < 5) r *= 0.84
    return { index: i, md: `${d.getMonth() + 1}/${d.getDate()}`, iso: `2026-09-${pad(i + 1)}`, v, r }
  })
  const sumV = raw.reduce((a, x) => a + x.v, 0)
  const sumR = raw.reduce((a, x) => a + x.v * x.r, 0)
  return raw.map((x) => ({
    index: x.index,
    md: x.md,
    iso: x.iso,
    views: (x.v / sumV) * 12_840_000,
    rev: ((x.v * x.r) / sumR) * 18_400_000,
  }))
})()

export type PerfStatus = '급등' | '성장' | '정상' | '하락'

export interface PerfVideo {
  title: string
  type: VideoType
  channel: string
  views: number
  rpm: number
  rev: number
  comp: number
  ctr: number
  ageH: number
  status: PerfStatus
  thumb: string
}

export const PERF_VIDEOS: PerfVideo[] = (
  [
    ['영호 폭발 숏폼', 'short', 'ENA 예능', 148, 980, 82, 9.8, 26, '급등', 1],
    ['영숙 반전 숏폼', 'short', '나는 SOLO 공식', 93, 1020, 76, 8.4, 72, '정상', 3],
    ['32회 하이라이트', 'hl', 'ENA 예능', 31, 3850, 54, 6.1, 144, '성장', 8],
    ['현숙의 선택 클립', 'clip', '나는 SOLO 공식', 58, 2140, 61, 7.2, 288, '정상', 6],
    ['박나래 울컥 숏폼', 'short', 'ENA 예능', 71, 890, 79, 8.9, 216, '정상', 8],
    ['연애남매 정색 숏폼', 'short', 'ENA 드라마', 44, 940, 81, 9.1, 120, '성장', 5],
    ['영숙·영호 하이라이트', 'hl', '나는 SOLO 공식', 22, 3420, 49, 5.4, 24, '성장', 4],
    ['32회 갈등 클립', 'clip', 'ENA 예능', 39, 2310, 63, 7.6, 96, '정상', 5],
    ['기안84 요리 숏폼', 'short', 'ENA 예능', 52, 860, 72, 7.9, 336, '하락', 11],
    ['지구마불 벌칙 게임 클립', 'clip', 'SKY 채널', 18, 1980, 58, 6.3, 408, '하락', 12],
    ['옥순 고백 장면', 'clip', '나는 SOLO 공식', 27, 2260, 66, 8.1, 192, '정상', 7],
    ['데프콘 리액션 숏폼', 'short', '나는 SOLO 공식', 36, 1050, 84, 10.2, 48, '급등', 2],
  ] as Array<[string, VideoType, string, number, number, number, number, number, PerfStatus, number]>
).map(([title, type, channel, man, rpm, comp, ctr, ageH, status, frame]) => ({
  title,
  type,
  channel,
  views: man * 1e4,
  rpm,
  rev: ((man * 1e4) / 1000) * rpm,
  comp,
  ctr,
  ageH,
  status,
  thumb: frameThumb(frame),
}))

export const STATUS_TONE: Record<PerfStatus, 'success' | 'accent' | 'muted' | 'amber'> = {
  급등: 'success',
  성장: 'accent',
  정상: 'muted',
  하락: 'amber',
}

export interface Insight {
  area: string
  title: string
  metric: string
  why: string
  next: string
  cta: string
  /** 이동할 화면 키 */
  to: 'analysis' | 'editor-clip' | 'schedule'
}

export const INSIGHTS: Insight[] = [
  {
    area: '추천',
    title: '갈등형 숏폼 RPM +18%',
    metric: '+18%',
    why: '"갈등" 장면으로 시작한 숏폼 14개의 평균 RPM이 ₩1,090으로, 숏폼 평균 ₩925보다 높습니다. 댓글·재시청이 많아 광고 노출이 늘었습니다.',
    next: '추천에서 갈등 장면 가중치를 올립니다',
    cta: '영상 분석 →',
    to: 'analysis',
  },
  {
    area: '편집',
    title: '45초 이하 완주율 우세',
    metric: '81%',
    why: '45초 이하 숏폼 완주율 81%, 45초 초과 64%. 완주율이 높은 영상이 다음 추천 노출도 더 받았습니다.',
    next: '숏폼 기본 길이를 40초로 맞춥니다',
    cta: '편집기 →',
    to: 'editor-clip',
  },
  {
    area: '배포',
    title: '오후 6시 게시 성과 상위',
    metric: '+27%',
    why: '18시에 올린 영상의 첫 24시간 조회수가 다른 시간대보다 27% 많았습니다. 13시는 평균, 22시 이후는 -15%.',
    next: '배포 캘린더에서 18:00 슬롯을 먼저 채웁니다',
    cta: '배포 캘린더 →',
    to: 'schedule',
  },
  {
    area: '유형',
    title: '하이라이트는 RPM 최고, 조회는 적음',
    metric: '₩3,640',
    why: '하이라이트 RPM은 숏폼의 약 3.9배지만 조회수는 전체의 20%. 본방 다음날 올린 것만 평균 이상이었습니다.',
    next: '본방 다음날 18시에 하이라이트 1개를 고정합니다',
    cta: '배포 캘린더 →',
    to: 'schedule',
  },
]

/** 편집 변화별 원안 대비 평균 수익 차이(%) */
export const EDIT_EFFECTS: Array<[string, number]> = [
  ['인물 반응 장면 추가', 24],
  ['첫 3초 훅 교체', 15],
  ['제목 직접 수정', 9],
  ['설명형 장면 삭제', 11],
  ['자막 스타일 변경', 3],
  ['BGM 교체', -4],
]

/* ---------------- 포맷터 ---------------- */

export const WON = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`

export const MAN = (n: number) =>
  n >= 1e4 ? `${Math.round(n / 1e4).toLocaleString('ko-KR')}만` : Math.round(n).toLocaleString('ko-KR')

export const WON_MAN = (n: number) =>
  n >= 1e4 ? `₩${Math.round(n / 1e4).toLocaleString('ko-KR')}만` : WON(n)

export const ageText = (h: number) => (h < 48 ? `${h}시간` : `${Math.round(h / 24)}일`)
