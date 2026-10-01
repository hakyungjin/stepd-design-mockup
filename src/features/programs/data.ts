/*
 * 프로그램 화면 목 데이터.
 * STEPD 연동 시 이 파일을 API 응답으로 교체하세요.
 */

export const TODAY = new Date(2026, 8, 29)
export const ME = '김도윤'

export type ProgramStatus = 'airing' | 'upcoming' | 'ended'

export const STATUS_STYLE: Record<ProgramStatus, { label: string; bg: string; fg: string }> = {
  airing: { label: '방영 중', bg: 'rgba(22,163,74,.12)', fg: 'var(--status-success-text)' },
  upcoming: { label: '편성 예정', bg: 'rgba(28,96,255,.1)', fg: 'var(--bg-active)' },
  ended: { label: '종영', bg: 'var(--bg-card-hover)', fg: 'var(--text-secondary)' },
}

export const GENRES = ['예능', '드라마', '교양', '뮤직', '시사', '라이프', '스포츠', '어린이']

export const YT_CHANNELS = ['ENA 예능', 'ENA 음악']

export const PLAYLISTS: Record<string, string[]> = {
  'ENA 예능': [
    '주말 캠핑 클럽 모음',
    '오늘의 식탁 레시피',
    '동네 한 바퀴 하이라이트',
    'ENA 예능 숏츠',
  ],
  'ENA 음악': ['여름 음악회 LIVE', 'ENA 음악 숏츠'],
  'ENA 아카이브': ['봄날의 레시피 다시보기'],
}

/** 회차 분석 상태 */
export type EpisodeState = 'done' | 'run' | 'fail'

export interface EpisodeRow {
  n: number
  air: string
  state: EpisodeState
  /** 추천 구간 수 */
  recs: number
  /** 배포된 수 */
  dist: number
}

export type CastMember = [name: string, role: string, en: string]

export interface Program {
  id: string
  title: string
  status: ProgramStatus
  genre: string
  sched?: string
  first?: string
  ended?: string
  owner: string
  eps: number
  last?: string
  /** 포스터/아바타 색상 hue */
  hue: number
  /** 디지털 권리 만료일 */
  rights: string
  auto: boolean
  track: 'variety' | 'drama'
  cast: CastMember[]
  /** [플랫폼키, 계정명, 문제] */
  chans: Array<[string, string, string?]>
  /** YouTube 재생목록 [채널, 재생목록][] */
  yt: Array<[string, string]>
  intro: string
  /** 분석 진행 중인 회차 */
  run?: { ep: number; stage: string; pct: number }
  /** 분석 실패한 회차 */
  fail?: { ep: number; err: string } | null
  epList: EpisodeRow[]
}

const pad = (n: number) => String(n).padStart(2, '0')

export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const monthDay = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`

/** 오늘로부터 며칠 남았는지 */
export const daysUntil = (s: string) =>
  Math.round((parseDate(s).getTime() - TODAY.getTime()) / 86_400_000)

/** 회차 목록을 마지막 방영일에서 역산해 만듭니다 */
export const buildEpisodes = (p: Omit<Program, 'epList'>): EpisodeRow[] => {
  if (!p.eps || !p.last) return []
  const out: EpisodeRow[] = []
  const last = parseDate(p.last)
  for (let n = p.eps, i = 0; n >= 1; n--, i++) {
    const d = new Date(last)
    d.setDate(d.getDate() - 7 * i)
    let state: EpisodeState = 'done'
    if (p.run && p.run.ep === n) state = 'run'
    if (p.fail && p.fail.ep === n) state = 'fail'
    const recs = 6 + ((n * 7) % 6)
    d.setHours(23, 10 + ((n * 7) % 40))
    out.push({
      n,
      air: `${monthDay(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
      state,
      recs,
      dist: Math.max(0, recs - (n % 3) - (p.chans.length ? 0 : recs)),
    })
  }
  return out
}

type ProgramSeed = Omit<Program, 'epList'>

const SEED: ProgramSeed[] = [
  {
    id: 'camp',
    title: '주말 캠핑 클럽',
    status: 'airing',
    genre: '예능',
    sched: '매주 토 오후 7:40',
    owner: '김도윤',
    eps: 12,
    last: '2026-09-26',
    hue: 150,
    rights: '2027-03-31',
    auto: true,
    track: 'variety',
    cast: [
      ['이준호', '', 'Lee Junho'],
      ['박세라', '', ''],
      ['최민', '', 'Choi Min'],
      ['정하늘', '', ''],
    ],
    chans: [
      ['yt', 'ENA 예능'],
      ['nc', 'ENA 클립'],
      ['tt', '@ena_official', '재연결 필요'],
      ['ig', '@ena.official'],
    ],
    yt: [['ENA 예능', '주말 캠핑 클럽 모음']],
    intro: '연예인들이 매주 다른 캠핑장에서 1박 2일을 보내는 리얼리티.',
    run: { ep: 12, stage: '구간 추천', pct: 64 },
  },
  {
    id: 'food',
    title: '오늘의 식탁',
    status: 'airing',
    genre: '교양',
    sched: '매주 금 오후 8:00',
    owner: '이서현',
    eps: 88,
    last: '2026-09-25',
    hue: 40,
    rights: '2026-10-20',
    auto: true,
    track: 'variety',
    cast: [
      ['홍지민', '', ''],
      ['김태오', '', ''],
    ],
    chans: [
      ['yt', 'ENA 예능'],
      ['nc', 'ENA 클립'],
      ['tt', '@ena_official', '재연결 필요'],
      ['ig', '@ena_food', '토큰 10/01 만료'],
    ],
    yt: [['ENA 예능', '오늘의 식탁 레시피']],
    intro: '',
  },
  {
    id: 'dong',
    title: '동네 한 바퀴',
    status: 'airing',
    genre: '교양',
    sched: '매주 목 오후 9:00',
    owner: '김도윤',
    eps: 42,
    last: '2026-09-24',
    hue: 220,
    rights: '',
    auto: false,
    track: 'variety',
    cast: [['윤도현', '', 'Yoon Dohyun']],
    chans: [
      ['yt', 'ENA 예능'],
      ['nc', 'ENA 클립'],
    ],
    yt: [],
    intro: '',
  },
  {
    id: 'music',
    title: '여름 음악회',
    status: 'airing',
    genre: '뮤직',
    sched: '매주 월 오후 10:30',
    owner: '박지훈',
    eps: 6,
    last: '2026-09-21',
    hue: 300,
    rights: '2027-08-31',
    auto: true,
    track: 'variety',
    cast: [
      ['한소리', '', ''],
      ['밴드 파랑', '', 'Band Parang'],
    ],
    chans: [
      ['yt', 'ENA 음악'],
      ['tt', '@ena_official', '재연결 필요'],
      ['ig', '@ena.official'],
    ],
    yt: [['ENA 음악', '여름 음악회 LIVE']],
    intro: '',
    fail: { ep: 6, err: '원본에 음성 트랙이 없습니다' },
  },
  {
    id: 'spring',
    title: '봄날의 레시피',
    status: 'ended',
    genre: '교양',
    ended: '2026-06-28',
    owner: '이서현',
    eps: 24,
    last: '2026-06-28',
    hue: 20,
    rights: '2026-12-31',
    auto: false,
    track: 'variety',
    cast: [['정다은', '', '']],
    chans: [['yt', 'ENA 아카이브', '연결 해제됨']],
    yt: [],
    intro: '',
  },
  {
    id: 'night',
    title: '밤의 서점',
    status: 'airing',
    genre: '교양',
    sched: '매주 목 오후 11:00',
    owner: '김도윤',
    eps: 0,
    hue: 265,
    rights: '',
    auto: false,
    track: 'drama',
    cast: [],
    chans: [],
    yt: [],
    intro: '',
  },
]

export const PROGRAMS: Program[] = SEED.map((p) => ({ ...p, epList: buildEpisodes(p) }))

/** 프로그램별 미디어 제목 풀 */
export const MEDIA_TITLES: Record<string, string[]> = {
  camp: [
    '새벽 4시 텐트가 무너졌다',
    '불멍하다 터진 진심',
    '캠핑 요리 대참사 모음',
    '박세라의 장작 패기 도전',
    '밤하늘 아래 노래 한 곡',
    '최민 vs 정하늘 설거지 내기',
    '비 오는 날의 타프 설치',
    '이준호 캠핑카 첫 운전',
  ],
  food: [
    '10분 된장찌개 비법',
    '제철 전어 손질법',
    '김태오 셰프의 칼질 강의',
    '엄마표 잡채 재현',
    '냉장고 파먹기 한 상',
    '홍지민의 김치 담그기',
  ],
  dong: [
    '60년 된 국숫집 이야기',
    '골목 끝 작은 서점',
    '시장 사람들의 아침',
    '윤도현이 만난 대장장이',
    '동네 빵집 첫 오븐',
  ],
  music: ['한소리 앵콜 무대', '밴드 파랑 리허설 현장', '관객 떼창 하이라이트', '비 오는 야외 공연'],
  spring: ['봄나물 비빔밥', '딸기 타르트 만들기', '정다은의 도시락 반찬', '마지막 회 비하인드'],
}

/* ---------------- 스타일 헬퍼 ---------------- */

export const posterColor = (hue: number) => `oklch(0.34 0.045 ${hue})`
export const posterTextColor = (hue: number) => `oklch(0.86 0.07 ${hue})`
/* 원본은 밝은 테마 기준이라 다크 UI에 맞게 낮춘 값입니다 */
export const mediaThumbColor = (hue: number) => `oklch(0.30 0.04 ${hue})`
export const mediaFrameColor = (hue: number) => `oklch(0.42 0.055 ${hue})`

/** 설정 폼 */
export interface ProgramForm {
  title: string
  genre: string
  owner: string
  status: ProgramStatus
  sched: string
  first: string
  ended: string
  lang: string
  hideKo: boolean
  yt: Array<[string, string]>
  track: 'variety' | 'drama'
  intro: string
  prompt: string
  cast: CastMember[]
}

export const formOf = (p: Program): ProgramForm => ({
  title: p.title,
  genre: p.genre,
  owner: p.owner,
  status: p.status,
  sched: p.sched ?? '',
  first: p.first ?? '',
  ended: p.ended ?? '',
  lang: 'ko',
  hideKo: true,
  yt: p.yt.map((x) => [...x] as [string, string]),
  track: p.track,
  intro: p.intro,
  prompt: '',
  cast: p.cast.map((c) => [...c] as CastMember),
})
