/*
 * 프로그램 화면 목 데이터.
 *
 * 필드 이름을 STEPD 본 저장소(`apps/web/src/lib/types.ts`)에 맞췄습니다 —
 * section · owner · pipelineGenre · schedule · broadcaster · currentInfo ·
 * firstAiredDate · endedDate · episodeCount · rightsUntil · rightsNote ·
 * hasPosterImage. 그래야 화면을 그대로 들고 가 스토어만 바꿔 끼울 수 있습니다.
 *
 * STEPD 연동 시 PROGRAMS / EPISODES / CLIPS 를 API 응답으로 교체하세요.
 */

import { frameFor } from '@/lib/frames'

export const TODAY = new Date(2026, 8, 29)
export const ME = '김도윤'

export type ProgramStatus = 'airing' | 'ended' | 'upcoming'

/** 본 저장소의 섹션 목록(= 장르) */
export const SECTIONS = [
  '드라마/영화',
  '예능',
  '뮤직',
  '시사',
  '교양',
  '라이프',
  '스포츠',
  '게임',
  '어린이',
  '뉴스',
  '애니',
]

export const TARGET_AGES = [0, 7, 12, 15, 19] as const
export type TargetAge = (typeof TARGET_AGES)[number]
export const targetAgeLabel = (age: TargetAge) => (age === 0 ? '전체' : `${age}세`)
export const TARGET_AGE_LABELS = TARGET_AGES.map(targetAgeLabel)

/** 분석 트랙 (본 저장소의 program.pipelineGenre) */
export type PipelineGenre = 'variety' | 'drama'
export const TRACK_LABEL: Record<PipelineGenre, string> = {
  variety: '예능 트랙',
  drama: '드라마 트랙',
}

/* ---------------- 파이프라인 ---------------- */

export type PipelineStage =
  | 'source'
  | 'merge'
  | 'split'
  | 'analyze'
  | 'recommend'
  | 'edit'
  | 'encode'
  | 'publish'

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  source: '소스',
  merge: '병합',
  split: '분할',
  analyze: '분석',
  recommend: '추천',
  edit: '편집',
  encode: '인코딩',
  publish: '배포',
}

export type StageStatus = 'idle' | 'progress' | 'done' | 'error'

export interface Pipeline {
  stage: PipelineStage
  stageStatus: StageStatus
  /** 0-100. 서버 값 그대로 그립니다 — 화면에서 타이머로 올리지 않습니다 */
  progress: number
  note?: string
}

/* ---------------- 회차 · 미디어 ---------------- */

export interface Episode {
  id: string
  programId: string
  episodeNumber: number
  /** YYYY-MM-DD. 비면 "방영일 미등록" */
  broadDate: string
  pipeline?: Pipeline
}

export interface Clip {
  id: string
  episodeId: string
  title: string
  durationSec: number
  /** '16:9' 또는 '9:16-…' */
  aspectRatio: string
  /** 한 군데라도 발행됐는지 */
  published: boolean
}

/* ---------------- 프로그램 ---------------- */

/** 설정에서 다루는 출연자 한 명 — [이름, 극중 이름, 영어 표기] */
export type CastMember = [name: string, role: string, en: string]

export interface Program {
  id: string
  title: string
  status: ProgramStatus
  /** 섹션(= 장르). 목록 섹션 칩이 이 값으로 갈립니다 */
  section: string
  owner: string
  targetAge: TargetAge
  /** 분석 트랙. 비면 "분석 트랙 미지정" */
  pipelineGenre?: PipelineGenre
  /** 편성 한 줄 (예: 매주 토 오후 7:40) */
  schedule?: string
  broadcaster?: string
  /** 방영 중일 때만 편성 줄에 덧붙는 현재 정보 */
  currentInfo?: string
  firstAiredDate?: string
  endedDate?: string
  episodeCount: number
  rightsUntil?: string
  rightsNote?: string
  /** 포스터가 등록돼 있는지 — 없으면 "포스터 이미지" 자리를 그립니다 */
  hasPosterImage: boolean
  /** 포스터 플레이스홀더 색상 hue (목업 전용) */
  hue: number
  cast: CastMember[]
  /** YouTube 재생목록 [채널, 재생목록][] */
  yt: Array<[string, string]>
  /** 자막·메타데이터 언어 */
  lang: string
  hideKo: boolean
  intro: string
  /** 이 프로그램에만 적용하는 추가 지시 */
  prompt: string
}

export const YT_CHANNELS = ['ENA 예능', 'ENA 음악', 'ENA 아카이브']

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

export const PROGRAMS: Program[] = [
  {
    id: 'camp',
    title: '주말 캠핑 클럽',
    status: 'airing',
    section: '예능',
    owner: '김도윤',
    targetAge: 12,
    pipelineGenre: 'variety',
    schedule: '매주 토 오후 7:40',
    broadcaster: 'ENA',
    currentInfo: '12회 방영 중',
    episodeCount: 12,
    rightsUntil: '2027-03-31',
    hasPosterImage: true,
    hue: 150,
    cast: [
      ['이준호', '', 'Lee Junho'],
      ['박세라', '', ''],
      ['최민', '', 'Choi Min'],
      ['정하늘', '', ''],
    ],
    yt: [['ENA 예능', '주말 캠핑 클럽 모음']],
    lang: 'ko',
    hideKo: true,
    intro: '연예인들이 매주 다른 캠핑장에서 1박 2일을 보내는 리얼리티.',
    prompt: '',
  },
  {
    id: 'food',
    title: '오늘의 식탁',
    status: 'airing',
    section: '교양',
    owner: '이서현',
    targetAge: 0,
    pipelineGenre: 'variety',
    schedule: '매주 금 오후 8:00',
    broadcaster: 'ENA',
    episodeCount: 88,
    rightsUntil: '2026-10-20',
    rightsNote: '재계약 협의 중',
    hasPosterImage: true,
    hue: 40,
    cast: [
      ['홍지민', '', ''],
      ['김태오', '', ''],
    ],
    yt: [['ENA 예능', '오늘의 식탁 레시피']],
    lang: 'ko',
    hideKo: true,
    intro: '',
    prompt: '',
  },
  {
    id: 'dong',
    title: '동네 한 바퀴',
    status: 'airing',
    section: '교양',
    owner: '김도윤',
    targetAge: 0,
    pipelineGenre: 'variety',
    schedule: '매주 목 오후 9:00',
    broadcaster: 'ENA',
    episodeCount: 42,
    hasPosterImage: true,
    hue: 220,
    cast: [['윤도현', '', 'Yoon Dohyun']],
    yt: [],
    lang: 'ko',
    hideKo: true,
    intro: '',
    prompt: '',
  },
  {
    id: 'music',
    title: '여름 음악회',
    status: 'airing',
    section: '뮤직',
    owner: '박지훈',
    targetAge: 0,
    pipelineGenre: 'variety',
    schedule: '매주 월 오후 10:30',
    broadcaster: 'ENA 음악',
    episodeCount: 6,
    rightsUntil: '2027-08-31',
    hasPosterImage: false,
    hue: 300,
    cast: [
      ['한소리', '', ''],
      ['밴드 파랑', '', 'Band Parang'],
    ],
    yt: [['ENA 음악', '여름 음악회 LIVE']],
    lang: 'ko',
    hideKo: true,
    intro: '',
    prompt: '',
  },
  {
    id: 'spring',
    title: '봄날의 레시피',
    status: 'ended',
    section: '교양',
    owner: '이서현',
    targetAge: 0,
    pipelineGenre: 'variety',
    endedDate: '2026-06-28',
    broadcaster: 'ENA',
    episodeCount: 24,
    rightsUntil: '2026-12-31',
    hasPosterImage: true,
    hue: 20,
    cast: [['정다은', '', '']],
    yt: [],
    lang: 'ko',
    hideKo: true,
    intro: '',
    prompt: '',
  },
  {
    id: 'night',
    title: '밤의 서점',
    status: 'upcoming',
    section: '드라마/영화',
    owner: '김도윤',
    targetAge: 15,
    pipelineGenre: 'drama',
    firstAiredDate: '2026-10-31',
    broadcaster: 'ENA',
    episodeCount: 0,
    hasPosterImage: false,
    hue: 265,
    cast: [],
    yt: [],
    lang: 'ko',
    hideKo: true,
    intro: '',
    prompt: '',
  },
]

/* ---------------- 회차 ---------------- */

const pad = (n: number) => String(n).padStart(2, '0')

export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const monthDay = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`

/** 오늘로부터 며칠 남았는지 */
export const daysUntil = (s: string) =>
  Math.round((parseDate(s).getTime() - TODAY.getTime()) / 86_400_000)

/** 마지막 방영일에서 주 단위로 역산해 회차를 만듭니다 */
const buildEpisodes = (
  programId: string,
  count: number,
  last: string,
  running?: Pipeline & { ep: number },
  failed?: Pipeline & { ep: number },
): Episode[] => {
  if (!count) return []
  const out: Episode[] = []
  const lastDate = parseDate(last)
  for (let n = count, i = 0; n >= 1; n--, i++) {
    const d = new Date(lastDate)
    d.setDate(d.getDate() - 7 * i)
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    let pipeline: Pipeline | undefined = { stage: 'publish', stageStatus: 'done', progress: 100 }
    if (running && running.ep === n) pipeline = running
    else if (failed && failed.ep === n) pipeline = failed
    out.push({ id: `${programId}-e${n}`, programId, episodeNumber: n, broadDate: iso, pipeline })
  }
  return out
}

export const EPISODES: Episode[] = [
  ...buildEpisodes('camp', 12, '2026-09-26', {
    ep: 12,
    stage: 'recommend',
    stageStatus: 'progress',
    progress: 64,
    note: '구간 42/68',
  }),
  ...buildEpisodes('food', 88, '2026-09-25'),
  ...buildEpisodes('dong', 42, '2026-09-24'),
  ...buildEpisodes('music', 6, '2026-09-21', undefined, {
    ep: 6,
    stage: 'analyze',
    stageStatus: 'error',
    progress: 18,
    note: '원본에 음성 트랙이 없습니다',
  }),
  ...buildEpisodes('spring', 24, '2026-06-28'),
]

/* ---------------- 미디어 ---------------- */

/** 프로그램별 미디어 제목 풀 */
const CLIP_TITLES: Record<string, string[]> = {
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

/** 분석이 끝난 회차에서 채택한 구간만 미디어로 올라옵니다 */
const buildClips = (): Clip[] => {
  const out: Clip[] = []
  for (const [programId, titles] of Object.entries(CLIP_TITLES)) {
    const done = EPISODES.filter(
      (e) => e.programId === programId && e.pipeline?.stageStatus === 'done',
    ).slice(0, 4)
    done.forEach((e, ei) => {
      for (let j = 0; j < 3; j++) {
        const k = ei * 3 + j
        const short = k % 3 !== 2
        out.push({
          id: `${e.id}-c${j}`,
          episodeId: e.id,
          title: titles[k % titles.length],
          durationSec: short ? 28 + ((k * 11) % 32) : 95 + ((k * 37) % 180),
          aspectRatio: short ? '9:16-crop-full' : '16:9',
          published: !(ei === 0 && j >= 1),
        })
      }
    })
  }
  return out
}

export const CLIPS: Clip[] = buildClips()

/* ---------------- 스타일 헬퍼 ---------------- */

export const posterColor = (hue: number) => `oklch(0.34 0.045 ${hue})`
export const posterTextColor = (hue: number) => `oklch(0.86 0.07 ${hue})`

/** 회차·미디어 썸네일 — 목업은 생성된 SVG 플레이스홀더를 씁니다 */
export const thumbOf = (id: string) => frameFor(id)

/* ---------------- 설정 폼 (우리 디자인의 축소 필드) ---------------- */

/**
 * 본 저장소 설정 화면은 카드 10장(소개 · 방영 정보 · 편성·담당·권리 · 크레딧 ·
 * 분위기 태그 · 출연진 · 해외 배포 · 유튜브 재생목록 · 썸네일 엔진 · 기본 정보)입니다.
 * 이 목업은 **네 묶음으로 줄인 축소 필드**만 둡니다 — 거기가 우리 디자인입니다.
 */
export interface ProgramForm {
  title: string
  section: string
  owner: string
  targetAge: TargetAge
  status: ProgramStatus
  schedule: string
  firstAiredDate: string
  endedDate: string
  rightsUntil: string
  lang: string
  hideKo: boolean
  yt: Array<[string, string]>
  pipelineGenre: PipelineGenre
  intro: string
  prompt: string
  cast: CastMember[]
}

export const formOf = (p: Program): ProgramForm => ({
  title: p.title,
  section: p.section,
  owner: p.owner,
  targetAge: p.targetAge,
  status: p.status,
  schedule: p.schedule ?? '',
  firstAiredDate: p.firstAiredDate ?? '',
  endedDate: p.endedDate ?? '',
  rightsUntil: p.rightsUntil ?? '',
  lang: p.lang,
  hideKo: p.hideKo,
  yt: p.yt.map((x) => [...x] as [string, string]),
  pipelineGenre: p.pipelineGenre ?? 'variety',
  intro: p.intro,
  prompt: p.prompt,
  cast: p.cast.map((c) => [...c] as CastMember),
})
