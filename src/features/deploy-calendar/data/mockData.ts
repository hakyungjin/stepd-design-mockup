/*
 * 목업 데이터 생성기.
 * ------------------------------------------------------------------
 * 여기 있는 것 전부가 "서버가 줄 데이터"의 스텁입니다.
 * STEPD 연동 시 이 파일만 통째로 버리고, 같은 모양의
 *   { videos, items, history, archiveFor }
 * 를 API 응답에서 만들어 DeployCalendarPage 에 넘기면 됩니다.
 *
 * 화면 로직은 이 파일을 import 하지 않습니다 (DeployCalendarPage 의 기본값으로만 쓰임).
 */

import { addDays, iso, mondayOf, timestampOf } from '@/lib/date'
import type { DateStr, TimeStr } from '@/lib/date'
import { PER_SLOT, SLOTS, defaultTemplate, slotOf } from '../constants'
import type {
  ArchiveItem,
  DeployItem,
  DeployStatus,
  HistoryEntry,
  PlatformKey,
  PlatformStatusMap,
  ProgramKey,
  Video,
  VideoType,
} from '../types'
import { FRAME_COUNT, frameThumb } from './thumbs'

/** 목업의 "지금" — 화면이 매일 달라지지 않도록 고정합니다. */
export const MOCK_NOW = new Date(2026, 8, 30, 9, 0)

/** 변경 이력에 찍히는 현재 사용자 */
export const MOCK_USER = '이도윤 (나)'

export interface MockData {
  videos: Record<string, Video>
  items: DeployItem[]
  history: HistoryEntry[]
  /** 지난 날짜의 "이미 게시가 끝난 실적"을 채워주는 함수 */
  archiveFor: (date: DateStr) => ArchiveItem[]
}

/* ------------------------------------------------------------------ *
 * 손으로 적은 시드 영상 28편
 * [id, 제목, 유형, 길이(초), 추천점수, 프로그램, 프레임번호, 렌더링완료]
 * ------------------------------------------------------------------ */

type VideoRow = [string, string, VideoType, number, number, ProgramKey, number, 0 | 1]

const VIDEO_ROWS: VideoRow[] = [
  ['v1', '영호 폭발 숏폼', 'short', 48, 96, 'solo', 1, 1],
  ['v2', '민지 반응 숏폼', 'short', 37, 91, 'solo', 2, 1],
  ['v3', '영숙 첫 데이트 숏폼', 'short', 52, 89, 'solo', 3, 1],
  ['v4', '영숙·영호 하이라이트', 'hl', 612, 84, 'solo', 4, 1],
  ['v5', '32회 갈등 클립', 'clip', 184, 82, 'solo', 5, 1],
  ['v6', '현숙의 선택 클립', 'clip', 142, 80, 'solo', 6, 1],
  ['v7', '옥순 고백 장면', 'clip', 96, 78, 'solo', 7, 1],
  ['v8', '박나래 울컥 숏폼', 'short', 44, 87, 'alone', 8, 1],
  ['v9', '32회 예고 숏폼', 'short', 30, 75, 'solo', 9, 0],
  ['v10', '연애남매 14회 하이라이트', 'hl', 540, 81, 'siblings', 10, 1],
  ['v11', '기안84 요리 숏폼', 'short', 41, 85, 'alone', 11, 1],
  ['v12', '지구마불 벌칙 게임 클립', 'clip', 205, 77, 'marble', 12, 1],
  ['v13', '재형 고백 숏폼', 'short', 39, 88, 'siblings', 1, 0],
  ['v14', '나혼산 612회 하이라이트', 'hl', 498, 79, 'alone', 2, 1],
  ['v15', '지구마불 숙소 첫날 숏폼', 'short', 45, 74, 'marble', 3, 1],
  ['v16', '박나래 어머니 편지 클립', 'clip', 118, 83, 'alone', 4, 1],
  ['v17', '연애남매 정색 숏폼', 'short', 33, 86, 'siblings', 5, 1],
  ['v18', '영철 눈물 클립', 'clip', 131, 80, 'solo', 6, 1],
  ['v19', '기안84 냄비 사건 클립', 'clip', 97, 76, 'alone', 7, 1],
  ['v20', '32회 하이라이트', 'hl', 655, 90, 'solo', 8, 1],
  ['v21', '광수 직진 숏폼', 'short', 42, 83, 'solo', 9, 1],
  ['v22', '이스탄불 시장 하이라이트', 'hl', 480, 72, 'marble', 10, 1],
  ['v23', '옥순·광수 산책 숏폼', 'short', 58, 81, 'solo', 11, 1],
  ['v24', '32회 명장면 모음', 'clip', 240, 79, 'solo', 12, 1],
  ['v25', '영수 선택 숏폼', 'short', 44, 92, 'solo', 1, 1],
  ['v26', '데프콘 리액션 숏폼', 'short', 29, 88, 'solo', 2, 1],
  ['v27', '33회 예고 클립', 'clip', 60, 70, 'solo', 3, 0],
  ['v28', '원지 길 잃은 숏폼', 'short', 51, 79, 'marble', 4, 1],
]

/* 자동 생성 영상 제목 재료 */
const CHARS: Record<ProgramKey, string[]> = {
  solo: ['영호', '영숙', '현숙', '옥순', '광수', '영수', '영철', '정숙'],
  alone: ['박나래', '기안84', '전현무', '코드쿤스트'],
  siblings: ['재형', '윤하', '세승', '용우'],
  marble: ['원지', '곽튜브', '빠니보틀'],
}

const MOMENTS: Record<ProgramKey, string[]> = {
  solo: ['폭발', '반전', '고백', '눈물', '직진', '첫 데이트', '속마음', '최종 선택'],
  alone: ['울컥', '요리 도전', '캠핑', '집들이', '운동 루틴', '냄비 사건'],
  siblings: ['정색', '고백', '데이트', '갈등', '화해', '비밀'],
  marble: ['벌칙 게임', '길 잃음', '시장 탐방', '숙소 첫날', '야시장', '현지 음식'],
}

const TYPE_WORD: Record<VideoType, string> = {
  short: '숏폼',
  clip: '클립',
  hl: '하이라이트',
}

/** 각 슬롯을 어떤 (프로그램, 유형) 조합으로 채울지 */
const SLOT_PLAN: Record<string, Array<[ProgramKey, VideoType]>> = {
  '06:00': [
    ['solo', 'short'],
    ['alone', 'short'],
    ['siblings', 'clip'],
    ['marble', 'short'],
  ],
  '18:00': [
    ['solo', 'short'],
    ['solo', 'clip'],
    ['alone', 'hl'],
    ['siblings', 'short'],
  ],
}

/** 오늘 06시 슬롯에 고정 배치할 제목 / 18시 슬롯에 고정 배치할 영상 id */
const PINNED_TITLES: string[] = [
  '옥순 눈물 숏폼',
  '기안84 요리 도전 숏폼',
  '윤하 정색 클립',
  '곽튜브 시장 탐방 숏폼',
]
const PINNED_VIDEO_IDS: string[] = ['v1', 'v5', 'v4', 'v9']

/** 과거 실적에 쓰는 제목 풀 */
const ARCHIVE_TITLES: Record<'예능' | '드라마', string[]> = {
  예능: [
    '영호 결국 폭발 #나는솔로',
    '현숙의 선택 비하인드',
    '데프콘 리액션 모음 #나는솔로',
    '박나래 울컥한 순간 #나혼산',
    '기안84 냄비 사건 #나혼산',
    '[직캠] 32기 첫인상 선택',
    '영숙 반전 매력 #나는솔로',
    '광수 직진 고백 #나는솔로',
    '지구마불 벌칙 게임 ㅋㅋ',
    '이스탄불 시장 대탐험 #지구마불',
    '연애남매 정색 모먼트',
    '[예고] 33회 미리보기',
    '옥순의 속마음 인터뷰',
    '재형 고백 풀버전 #연애남매',
    'MC들 동시에 소리 지른 장면',
    '첫 데이트 식당 침묵 5초',
  ],
  드라마: [
    '[선공개] 신병4 5회 대치 장면',
    '[메이킹] 감독님한테 혼난 날',
    '신병4 강찬석 명대사 모음',
    '[1차 티저] 새 수목극 공개',
    '[비하인드] 박민주 촬영장',
    '[예고] 신병4 6회',
    '분대장 첫 등장 #신병4',
    '[OST] 뮤직비디오 선공개',
    '[메이킹] 액션 리허설 현장',
    '신병4 최종화 전야 #신병4',
  ],
}

/* ------------------------------------------------------------------ */

export function createMockData(now: Date = MOCK_NOW): MockData {
  const today = iso(now)
  const isPast = (date: DateStr, time: TimeStr) => timestampOf(date, time) <= now.getTime()

  /* ---- 영상 카탈로그 ---- */
  const videos: Record<string, Video> = {}
  for (const [id, title, type, dur, score, prog, frame, ready] of VIDEO_ROWS) {
    videos[id] = { id, title, type, dur, score, prog, thumb: frameThumb(frame), ready: ready === 1 }
  }

  const usedTitles = new Set<string>([
    ...Object.values(videos).map((v) => v.title),
    ...PINNED_TITLES,
  ])
  const nameCursor: Record<ProgramKey, number> = { solo: 0, alone: 0, siblings: 0, marble: 0 }
  let generated = 0

  /** 중복 없는 제목으로 생성 영상 한 편을 만들고 id 를 돌려줍니다. */
  const generateVideo = (prog: ProgramKey, type: VideoType, fixedTitle?: string): string => {
    const chars = CHARS[prog]
    const moments = MOMENTS[prog]
    const id = `g${++generated}`

    let title = fixedTitle ?? ''
    for (let guard = 0; !title && guard < chars.length * moments.length; guard++) {
      const i = nameCursor[prog]++
      const q = Math.floor(i / chars.length) % moments.length
      const candidate = `${chars[i % chars.length]} ${
        moments[(((i % chars.length) + q * (chars.length + 1)) % moments.length)]
      } ${TYPE_WORD[type]}`
      if (!usedTitles.has(candidate)) {
        usedTitles.add(candidate)
        title = candidate
      }
    }
    if (!title) {
      const base = `${chars[generated % chars.length]} ${moments[generated % moments.length]} ${TYPE_WORD[type]}`
      let n = 2
      while (usedTitles.has(`${base} ${n}편`)) n++
      title = `${base} ${n}편`
      usedTitles.add(title)
    }

    videos[id] = {
      id,
      prog,
      type,
      title,
      dur:
        type === 'short'
          ? 28 + (generated * 7) % 30
          : type === 'clip'
            ? 90 + (generated * 13) % 150
            : 420 + (generated * 31) % 240,
      score: 70 + (generated * 11) % 28,
      thumb: frameThumb(1 + (generated % FRAME_COUNT)),
      ready: true,
    }
    return id
  }

  /* ---- 2주치 편성 ---- */
  const weekStart = mondayOf(now)
  const items: DeployItem[] = []
  let seq = 0

  for (let day = 0; day <= 13; day++) {
    for (const time of SLOTS) {
      const date = iso(addDays(weekStart, day))
      const past = isPast(date, time)
      // 지난 슬롯은 버리되, "어제 저녁 / 오늘 새벽" 두 슬롯만 남겨 실패·완료 케이스를 보여줍니다.
      if (past && !(day === 1 && time === '18:00') && !(day === 2 && time === '06:00')) continue

      SLOT_PLAN[time].forEach(([planProg, type], j) => {
        const prog: ProgramKey = day === 3 && time === '06:00' && j === 3 ? 'solo' : planProg
        const vid =
          day === 2
            ? time === '18:00'
              ? PINNED_VIDEO_IDS[j]
              : generateVideo(prog, type, PINNED_TITLES[j])
            : generateVideo(prog, type)

        let status: DeployStatus = past
          ? '게시 완료'
          : day <= 6
            ? (day * 3 + j + (time === '18:00' ? 1 : 0)) % 7 === 0
              ? '승인 대기'
              : '예약됨'
            : day <= 8
              ? j < 3
                ? '예약됨'
                : '승인 대기'
              : '초안'
        if (day === 2 && time === '18:00') status = j === 2 ? '승인 대기' : '예약됨'

        const keys: PlatformKey[] =
          type === 'short' ? (j === 0 ? ['yt', 'ig', 'tt'] : ['yt', 'ig']) : ['yt', 'fb']
        const pl: PlatformStatusMap = Object.fromEntries(keys.map((k) => [k, status]))

        // 어제 저녁 슬롯에 플랫폼 단위 실패를 한 건씩 심어둡니다.
        if (day === 1 && j === 0) pl.ig = '실패'
        if (day === 1 && j === 1) pl.fb = '실패'
        // TikTok 은 심사 때문에 예약 상태에서도 한 단계 앞서 '승인 대기' 로 둡니다.
        if (!past && pl.tt && status === '예약됨') pl.tt = '승인 대기'

        const id =
          day === 2 && time === '18:00' && j === 0
            ? 'a1'
            : day === 3 && time === '06:00' && j === 0
              ? 'a2'
              : `s${++seq}`

        items.push({
          id,
          date,
          time,
          vid,
          status,
          pl,
          tpl: defaultTemplate(type),
          test: day === 4 && time === '18:00' && j === 2,
        })
      })
    }
  }

  const titleOf = (itemId: string) => {
    const it = items.find((i) => i.id === itemId)
    return it ? videos[it.vid].title : ''
  }

  const history: HistoryEntry[] = [
    {
      at: '9/29 17:42',
      who: '김서연',
      text: `영상 교체 · 9/30 18:00 · 영호 오열 숏폼 → ${titleOf('a1')}`,
      id: 'a1',
    },
    {
      at: '9/29 18:05',
      who: '박준호',
      text: '배포 취소 · 현숙 인터뷰 클립 · 9/30 18:00 (YouTube) — 18시 슬롯 4개 초과',
      id: null,
    },
    {
      at: '9/30 08:51',
      who: '김서연',
      text: `일정 변경 · ${titleOf('a2')} · 10/1 18:00 → 06:00`,
      id: 'a2',
    },
  ]

  /* ---- 지난 날짜의 실적(아카이브) ---- */
  const archiveCache = new Map<DateStr, ArchiveItem[]>()

  const archiveFor = (date: DateStr): ArchiveItem[] => {
    const hit = archiveCache.get(date)
    if (hit) return hit

    const out: ArchiveItem[] = []
    if (date < today) {
      // 날짜에서 뽑은 시드로 돌리는 Lehmer 난수 — 같은 날짜면 항상 같은 결과
      let seed = Number(date.replace(/-/g, '')) % 2147483647
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

      for (const time of SLOTS) {
        if (items.some((i) => i.date === date && i.time === time)) continue
        for (let i = 0; i < PER_SLOT; i++) {
          const genre: '예능' | '드라마' = rnd() < 0.6 ? '예능' : '드라마'
          const pool = ARCHIVE_TITLES[genre]
          const title = pool[Math.floor(rnd() * pool.length)]
          const keys: PlatformKey[] = [
            'yt',
            ...(['ig', 'fb', 'tt'] as PlatformKey[]).filter(
              (k) => rnd() < (k === 'tt' ? 0.2 : 0.5),
            ),
          ]
          out.push({
            id: `arc-${date}-${time}-${i}`,
            arc: true,
            date,
            time,
            title,
            genre,
            status: '게시 완료',
            pl: Object.fromEntries(keys.map((k) => [k, '게시 완료' as DeployStatus])),
          })
        }
      }
    }
    archiveCache.set(date, out)
    return out
  }

  return { videos, items, history, archiveFor }
}

/** slotOf 를 여기서도 re-export 해 두면 목 데이터 소비처가 constants 를 몰라도 됩니다. */
export { slotOf }
