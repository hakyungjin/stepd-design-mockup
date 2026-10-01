/*
 * 배포 화면 목 데이터.
 * STEPD 연동 시 이 파일을 API 응답으로 교체하세요.
 */

import { frameThumb, portraitThumb } from '@/lib/frames'

/** 채널 키 — 배포 캘린더의 PlatformKey 와는 별개(네이버 클립이 더 있습니다) */
export type ChannelKey = 'yt' | 'fb' | 'ig' | 'tt' | 'nc'

export interface Channel {
  key: ChannelKey
  name: string
  /** 세로(9:16)만 받는 채널 */
  verticalOnly?: boolean
  account: string
}

/** 매트릭스 열 순서 */
export const CHANNELS: Channel[] = [
  { key: 'yt', name: 'YouTube', account: 'ENA 예능' },
  { key: 'fb', name: 'Facebook', account: 'ENA' },
  { key: 'ig', name: 'Instagram', verticalOnly: true, account: '@ena.official' },
  { key: 'tt', name: 'TikTok', verticalOnly: true, account: '@ena_official' },
  { key: 'nc', name: '네이버 클립', verticalOnly: true, account: 'ENA 클립' },
]

export interface Episode {
  program: string
  ep: number
  air: string
  /** 정렬용 숫자 (MMDD) */
  airNo: number
}

export const EPISODES: Record<string, Episode> = {
  camp12: { program: '주말 캠핑 클럽', ep: 12, air: '09/26 (토)', airNo: 926 },
  food88: { program: '오늘의 식탁', ep: 88, air: '09/25 (금)', airNo: 925 },
  dong42: { program: '동네 한 바퀴', ep: 42, air: '09/24 (목)', airNo: 924 },
  music6: { program: '여름 음악회', ep: 6, air: '09/21 (월)', airNo: 921 },
  camp11: { program: '주말 캠핑 클럽', ep: 11, air: '09/19 (토)', airNo: 919 },
}

/** 실패 원인 */
export type CauseKey = 'tt_auth' | 'copyright' | 'net' | 'nc_desc'

export interface Cause {
  title: string
  desc: string
  /** 배포 채널에서 재연결해야 하는 종류 */
  link?: boolean
  /** 원인을 고치러 가는 버튼 라벨 */
  fix?: string
  retry: boolean
}

export const CAUSES: Record<CauseKey, Cause> = {
  tt_auth: {
    title: 'TikTok 연결이 끊겼습니다',
    desc: '@ena_official 인증이 만료됐습니다. 배포 채널에서 재연결한 뒤 다시 보내세요.',
    link: true,
    retry: true,
  },
  copyright: {
    title: '저작권 음원이 감지돼 게시가 보류됐습니다',
    desc: '다시 시도해도 같은 결과가 나옵니다. 편집기에서 음원 구간을 빼고 다시 내보내세요.',
    fix: '편집기에서 열기',
    retry: false,
  },
  net: {
    title: '업로드 중 연결이 끊겼습니다',
    desc: '일시적인 문제입니다. 다시 시도하면 됩니다.',
    retry: true,
  },
  nc_desc: {
    title: '네이버 클립 설명이 10자보다 짧습니다',
    desc: '네이버 클립은 설명 10자 이상 · 카테고리 1·2차가 필요합니다. 설명을 고친 뒤 다시 보내세요.',
    fix: '설명 고치기',
    retry: true,
  },
}

/** 셀 상태 — P 게시됨 · U 게시 중 · S 예약 · F 실패 */
export type CellState = 'P' | 'U' | 'S' | 'F'

export interface Cell {
  state: CellState
  at: string
  cause?: CauseKey
}

export const CELL_STYLE: Record<CellState, { label: string; bg: string; fg: string }> = {
  P: { label: '게시됨', bg: 'var(--status-success-bg)', fg: 'var(--status-success-text)' },
  U: { label: '게시 중', bg: 'var(--bg-accent-subtle)', fg: 'var(--bg-active)' },
  S: { label: '예약', bg: 'rgba(245,158,11,.10)', fg: 'hsl(var(--status-warn))' },
  F: { label: '실패', bg: 'hsl(var(--status-error))', fg: '#fff' },
}

export type VideoKind = '숏폼' | '클립' | '하이라이트'

export interface DeployRow {
  id: string
  episodeKey: string
  kind: VideoKind
  title: string
  /** 길이(초) */
  dur: number
  thumb: string
  cells: Partial<Record<ChannelKey, Cell>>
}

/** "P 09/26 18:00" / "F 09/26 18:01 tt_auth" 형태를 파싱 */
const parseCell = (s: string): Cell => {
  const [state, date, time, cause] = s.split(' ')
  return { state: state as CellState, at: `${date} ${time}`, cause: cause as CauseKey | undefined }
}

const RAW: Array<[string, string, VideoKind, string, number, Record<string, string>]> = [
  ['c2', 'camp12', '숏폼', '불멍 앞에서 꺼낸 진심', 72, { yt: 'U 09/28 09:40', nc: 'U 09/28 09:40', tt: 'F 09/28 09:41 tt_auth' }],
  ['c15', 'food88', '숏폼', '3분 만에 끝내는 달걀찜', 42, { yt: 'P 09/25 19:00', nc: 'P 09/25 19:02', ig: 'U 09/28 09:30', tt: 'F 09/28 09:30 tt_auth' }],
  ['c1', 'camp12', '숏폼', '텐트 치다 무너진 순간', 58, { yt: 'P 09/26 18:00', nc: 'P 09/26 18:05', tt: 'F 09/26 18:01 tt_auth', ig: 'P 09/26 18:00', fb: 'R 09/26 18:00' }],
  ['c5', 'camp12', '클립', '캠핑장 도착부터 설치까지', 612, { yt: 'P 09/26 20:00', fb: 'R 09/26 20:00' }],
  ['c11', 'dong42', '숏폼', '골목 끝 작은 서점', 48, { yt: 'S 09/30 18:00', nc: 'S 09/30 18:00' }],
  ['c14', 'dong42', '클립', '국숫집 사장님 인터뷰 전체', 402, { yt: 'S 09/29 12:00' }],
  ['c16', 'food88', '숏폼', '셰프의 칼질 비법', 38, { yt: 'P 09/25 19:00', nc: 'F 09/25 19:02 nc_desc' }],
  ['h2', 'food88', '하이라이트', '88회 하이라이트 — 가을 밥상 한 상', 236, { yt: 'P 09/25 21:00' }],
  ['c10', 'dong42', '숏폼', '40년 된 국숫집 사장님', 55, { yt: 'F 09/24 20:02 net', nc: 'P 09/24 20:00' }],
  ['c18', 'music6', '숏폼', '앵콜 무대 직캠', 61, { yt: 'P 09/21 21:00', ig: 'P 09/21 21:00', tt: 'P 09/21 21:00' }],
  ['c19', 'music6', '숏폼', '리허설 비하인드', 57, { yt: 'F 09/21 21:01 copyright', ig: 'P 09/21 21:00' }],
  ['h4', 'music6', '하이라이트', '6회 하이라이트 — 피날레까지 5분', 301, { yt: 'F 09/21 22:30 copyright' }],
  ['c20', 'music6', '클립', '피날레 전곡', 905, { yt: 'P 09/21 22:00' }],
  ['c7', 'camp11', '숏폼', '비 오는 날의 캠핑', 51, { yt: 'P 09/19 18:00', ig: 'P 09/19 18:00', tt: 'P 09/19 18:00' }],
  ['c9', 'camp11', '클립', '우중 캠핑 생존기', 734, { yt: 'P 09/19 20:00', fb: 'R 09/19 20:00' }],
]

export const DEPLOY_ROWS: DeployRow[] = RAW.map(([id, episodeKey, kind, title, dur, raw], i) => ({
  id,
  episodeKey,
  kind,
  title,
  dur,
  thumb: kind === '숏폼' ? portraitThumb(1 + (i % 12)) : frameThumb(1 + (i % 12)),
  // 'R'(기록만 남음)은 파일이 올라가지 않으므로 셀에서 뺍니다
  cells: Object.fromEntries(
    Object.entries(raw)
      .filter(([, v]) => !v.startsWith('R '))
      .map(([k, v]) => [k, parseCell(v)]),
  ) as Partial<Record<ChannelKey, Cell>>,
}))

export const durationText = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export const kindTone = (kind: VideoKind): 'amber' | 'accent' | 'muted' =>
  kind === '하이라이트' ? 'amber' : kind === '숏폼' ? 'accent' : 'muted'

/** 행에서 가장 최근 시각 (정렬용) */
export const latestAt = (row: DeployRow) =>
  Object.values(row.cells)
    .map((c) => c.at)
    .sort()
    .pop() ?? ''
