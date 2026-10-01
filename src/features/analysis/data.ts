/*
 * 영상 분석 목 데이터.
 * STEPD 연동 시 이 파일을 API 응답으로 교체하세요.
 */

import { frameThumb, portraitThumb } from '@/lib/frames'

/** 원본 길이(초) — 1:32:40 */
export const SOURCE_SEC = 5560

const pad = (n: number) => String(n).padStart(2, '0')

/** 초 → h:mm:ss 또는 m:ss */
export const timeText = (s: number) => {
  const v = Math.max(0, Math.round(s))
  const h = Math.floor(v / 3600)
  const m = Math.floor((v % 3600) / 60)
  const x = v % 60
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`
}

export interface Person {
  name: string
  role: string
  color: string
}

export const PEOPLE: Person[] = [
  { name: '정민재', role: 'MC', color: 'var(--bg-active)' },
  { name: '김하늘', role: '출연', color: 'var(--status-success-text)' },
  { name: '박도윤', role: '출연', color: '#D97706' },
  { name: '이서아', role: '출연', color: 'var(--text-muted)' },
]

export interface Scene {
  start: number
  end: number
  label: string
  /** 주 화자 인덱스 */
  speaker: number
  /** 등장 인물 인덱스 */
  cast: number[]
}

const SCENE_SEED: Array<[number, string, number, number[]]> = [
  [0, '오프닝', 0, [0]],
  [180, '캠핑장 도착', 1, [0, 1, 2, 3]],
  [620, '텐트 설치', 2, [1, 2]],
  [1180, '점심 준비', 0, [0, 1, 3]],
  [1480, '첫 요리 대결', 1, [0, 1, 2, 3]],
  [1845, '결과 발표', 0, [0, 1, 2]],
  [2090, '비 소식', 3, [2, 3]],
  [2380, '텐트 붕괴', 2, [1, 2, 3]],
  [2690, '복구 작전', 1, [1, 2, 3]],
  [3120, '저녁 식사', 0, [0, 1, 2, 3]],
  [3780, '모닥불 토크', 3, [1, 3]],
  [4210, '취침', 2, [2]],
  [4690, '일출 등반', 1, [1, 3]],
  [4980, '정상 도착', 3, [1, 2, 3]],
  [5100, '벌칙 협상', 0, [0, 1]],
  [5400, '클로징', 0, [0, 1, 2, 3]],
]

export const SCENES: Scene[] = SCENE_SEED.map((s, i, a) => ({
  start: s[0],
  end: a[i + 1] ? a[i + 1][0] : SOURCE_SEC,
  label: s[1],
  speaker: s[2],
  cast: s[3],
}))

const LINES = [
  '자, 오늘은 다들 준비됐죠?',
  '아니 이게 왜 여기서 무너져요',
  '진짜 한 입만 먹을게요',
  '저 사실 할 말이 있어요',
  '와, 해 뜨는 것 좀 봐',
  '이건 반칙이죠, 반칙',
  '비가 이렇게 올 줄 누가 알았어요',
  '다음엔 제가 이길 겁니다',
]

export type ItemKind = '숏폼' | '클립' | '하이라이트'

export const KINDS: ItemKind[] = ['숏폼', '클립', '하이라이트']

/** 유형별 최대 길이(초) */
export const KIND_LIMIT: Record<ItemKind, number> = {
  숏폼: 60,
  클립: 600,
  하이라이트: 900,
}

export const KIND_COLOR: Record<ItemKind, string> = {
  숏폼: 'var(--bg-active)',
  클립: 'var(--status-success-text)',
  하이라이트: '#D97706',
}

export const KIND_TONE: Record<ItemKind, 'accent' | 'success' | 'amber'> = {
  숏폼: 'accent',
  클립: 'success',
  하이라이트: 'amber',
}

export interface Subtitle {
  t: number
  text: string
}

export interface AnalysisItem {
  id: string
  kind: ItemKind
  title: string
  /** [시작, 끝] 구간들 */
  parts: Array<[number, number]>
  score: number
  reasons: string[]
  people: string[]
  subs: Subtitle[]
  thumb: string
}

const ALL_PEOPLE = ['정민재', '김하늘', '박도윤', '이서아']

const ITEM_SEED: Array<
  [string, ItemKind, string, Array<[number, number]>, number, string[], string[]]
> = [
  ['s1', '숏폼', '텐트가 무너졌다, 비 오는 첫날밤', [[2412, 2458]], 94, ['웃음 반응 급증', '인물 3명 동시 등장', '키워드 “텐트 붕괴”'], ['김하늘', '박도윤', '이서아']],
  ['s2', '숏폼', 'MC도 못 참은 라면 한 젓가락', [[1325, 1372]], 89, ['화자 전환 빠름', '웃음 반응'], ['정민재', '박도윤']],
  ['s3', '숏폼', '모닥불 앞 속마음 고백', [[3890, 3945]], 87, ['감정이 고조된 발화', '클로즈업 비중 높음'], ['이서아']],
  ['s4', '숏폼', '요리 대결 결과 발표 순간', [[1845, 1887]], 84, ['리액션 집중', '키워드 “요리 대결”'], ['정민재', '김하늘', '박도윤']],
  ['s5', '숏폼', '새벽 4시, 일출 등반 출발', [[4702, 4750]], 80, ['장면 전환 직후 몰입', '키워드 “일출”'], ['김하늘', '이서아']],
  ['s6', '숏폼', '캠핑장 첫 도착 반응', [[268, 310]], 76, ['첫 등장 장면'], ['김하늘', '박도윤', '이서아']],
  ['s7', '숏폼', '비 소식에 굳은 표정들', [[2105, 2141]], 72, ['표정 변화 감지'], ['박도윤', '이서아']],
  ['s8', '숏폼', '제작진과의 벌칙 협상', [[5120, 5168]], 69, ['화자 교차 대화'], ['정민재', '김하늘']],
  ['c1', '클립', '첫 요리 대결 풀버전', [[1480, 1845]], 88, ['한 장면으로 완결', '출연자 전원 등장'], ALL_PEOPLE],
  ['c2', '클립', '비 오는 밤, 텐트 복구 작전', [[2380, 2690]], 86, ['웃음 반응 연속', '키워드 “텐트 붕괴”'], ['김하늘', '박도윤', '이서아']],
  ['c3', '클립', '모닥불 토크 모음', [[3780, 4210]], 83, ['감정 발화 비중 높음'], ['김하늘', '이서아']],
  ['c4', '클립', '일출 등반부터 정상까지', [[4690, 4980]], 77, ['장면 완결', '키워드 “일출”'], ['김하늘', '이서아']],
  [
    'h1',
    '하이라이트',
    '12회 하이라이트',
    [
      [268, 310],
      [1845, 1887],
      [2412, 2458],
      [3890, 3945],
      [4980, 5040],
    ],
    91,
    ['점수 상위 구간 5개 연결', '회차 흐름 순서 유지'],
    ALL_PEOPLE,
  ],
]

export const ITEMS: AnalysisItem[] = ITEM_SEED.map(
  ([id, kind, title, parts, score, reasons, people], n) => ({
    id,
    kind,
    title,
    parts,
    score,
    reasons,
    people,
    subs: Array.from({ length: 4 }, (_, i) => ({
      t: i * 9,
      text: LINES[(n + i) % LINES.length],
    })),
    thumb: kind === '숏폼' ? portraitThumb(n + 1) : frameThumb(n + 1),
  }),
)

export const STEPS = [
  '원본 불러오기',
  '음성 인식 · 자막 추출',
  '장면 · 화자 구분',
  '인물 인식',
  '하이라이트 점수 계산',
  '숏폼 · 클립 · 하이라이트 생성',
]

export interface ProgramOption {
  name: string
  last: number
}

export const PROGRAM_OPTIONS: ProgramOption[] = [
  { name: '주말 캠핑 클럽', last: 13 },
  { name: '동네 한 바퀴', last: 42 },
  { name: '여름 음악회', last: 6 },
  { name: '오늘의 식탁', last: 88 },
]

export type JobStatus = 'done' | 'running' | 'failed'

export interface Job {
  id: string
  program: string
  ep: number
  name: string
  file: string
  dur: string
  at: string
  status: JobStatus
  doneAt?: string
  reason?: string
  progress?: number
}

export const JOBS: Job[] = (
  [
    ['j1', '주말 캠핑 클럽', 12, 'CAMP_E12_master.mxf', '1:32:40', '09/26 10:12', 'done', '09/26 10:41', ''],
    ['j2', '주말 캠핑 클럽', 11, 'CAMP_E11_master.mxf', '1:28:05', '09/19 10:40', 'done', '09/19 11:07', ''],
    ['j3', '동네 한 바퀴', 41, 'TOWN_041_sp.mp4', '58:12', '09/18 16:02', 'failed', '', '미디어의 원본에 음성 트랙이 없습니다 — 오디오가 포함된 원본으로 교체해 주세요'],
    ['j4', '주말 캠핑 클럽', 10, 'CAMP_E10_master.mxf', '1:30:51', '09/12 10:05', 'done', '09/12 10:33', ''],
    ['j5', '여름 음악회', 5, 'SUMMER_05_live.mov', '2:04:30', '09/08 14:20', 'done', '09/08 15:02', ''],
  ] as Array<[string, string, number, string, string, string, JobStatus, string, string]>
).map(([id, program, ep, file, dur, at, status, doneAt, reason]) => ({
  id,
  program,
  ep,
  name: `${program} ${ep}회`,
  file,
  dur,
  at,
  status,
  doneAt: doneAt || undefined,
  reason: reason || undefined,
}))

export interface Unknown {
  id: string
  label: string
  first: number
  scenes: number
  share: number
  note: string
}

export const UNKNOWNS: Unknown[] = [
  { id: 'u1', label: '미확인 인물 1', first: 1195, scenes: 3, share: 6, note: '점심 준비 · 복구 작전 함께 등장' },
  { id: 'u2', label: '미확인 인물 2', first: 268, scenes: 1, share: 1, note: '카메라를 보지 않는 일반인일 수 있음' },
  { id: 'u3', label: '미확인 인물 3', first: 5105, scenes: 2, share: 3, note: '벌칙 협상 · 제작진 추정' },
]

export const EPISODE_SUMMARY =
  'MC와 출연자 3명이 1박 2일 캠핑을 떠난 회차입니다. 전반부는 요리 대결, 중반은 비로 인한 텐트 붕괴와 복구, 후반은 모닥불 토크와 일출 등반으로 이어집니다.'

/** 생성물에서 자동 제외되는 구간 */
export const DETECTED_SEGMENTS: Array<[string, string]> = [
  ['오프닝', '0:00–1:32'],
  ['타이틀 로고', '1:32–1:40'],
  ['중간 광고', '46:10–47:40'],
  ['엔딩 크레딧', '1:31:05–1:32:40'],
  ['다음 회 예고', '1:30:20–1:31:05'],
]

/** 인물이 등장하는 장면들 */
export const scenesOf = (personIndex: number) =>
  SCENES.filter((sc) => sc.cast.includes(personIndex))

/** 인물 등장 비중(%) */
export const shareOf = (personIndex: number) =>
  Math.round(
    (scenesOf(personIndex).reduce((a, sc) => a + sc.end - sc.start, 0) / SOURCE_SEC) * 100,
  )

export const totalOf = (item: AnalysisItem) =>
  item.parts.reduce((a, [x, y]) => a + Math.max(0, y - x), 0)

export const rangeTextOf = (item: AnalysisItem) =>
  item.parts.length > 1
    ? `구간 ${item.parts.length}개`
    : `${timeText(item.parts[0][0])}–${timeText(item.parts[0][1])}`
