/*
 * 영상 검색 목 데이터.
 * STEPD 연동 시 이 파일 대신 검색 API 응답을 넘기세요.
 */

import { frameThumb } from '@/lib/frames'

export type ProgramKey = 'solo' | 'siblings' | 'alone' | 'marble'

export const PROGRAM_OPTIONS: Array<{ key: ProgramKey; label: string }> = [
  { key: 'solo', label: '나는 SOLO' },
  { key: 'siblings', label: '연애남매' },
  { key: 'alone', label: '나 혼자 산다' },
  { key: 'marble', label: '지구마불 세계여행' },
]

export interface Segment {
  id: string
  program: ProgramKey
  source: string
  aired: string
  /** 시작·끝 (초) */
  start: number
  end: number
  short: boolean
  scene: string | null
  summary: string
  dialogue: string
  chars: string[]
  /** 적합도 0~1 */
  score: number
  /** 하이라이트 점수 0~1 */
  highlight: number
  thumb: string
  /** 회차에 연결돼 있는지 */
  hasEpisode: boolean
  flags: string[]
}

export const SEGMENTS: Segment[] = [
  {
    id: 's1',
    program: 'solo',
    source: '나는 SOLO 128회',
    aired: '2026-09-24',
    start: 1843,
    end: 1891,
    short: true,
    scene: '갈등',
    summary: '영호가 참다못해 목소리를 높이며 판을 뒤집는 순간',
    dialogue: '아니 그걸 왜 이제 와서 말해요? 처음부터 얘기했어야죠.',
    chars: ['영호', '현숙', '데프콘'],
    score: 0.92,
    highlight: 0.88,
    thumb: frameThumb(1),
    hasEpisode: true,
    flags: [],
  },
  {
    id: 's2',
    program: 'solo',
    source: '나는 SOLO 128회',
    aired: '2026-09-24',
    start: 2410,
    end: 2466,
    short: true,
    scene: '고백',
    summary: '현숙이 모두 앞에서 마음을 정했다고 밝히는 장면',
    dialogue: '저는 이미 마음을 정했어요. 흔들리지 않을 거예요.',
    chars: ['현숙', '영수'],
    score: 0.81,
    highlight: 0.9,
    thumb: frameThumb(2),
    hasEpisode: true,
    flags: ['⚠️ 스포일러'],
  },
  {
    id: 's3',
    program: 'solo',
    source: '나는 SOLO 127회',
    aired: '2026-09-17',
    start: 612,
    end: 655,
    short: true,
    scene: '반전',
    summary: '최종 선택 직전, 예상과 다른 사람에게 걸어가는 옥순',
    dialogue: '미안해요, 제 마음은 저쪽이에요.',
    chars: ['옥순', '광수', '영철'],
    score: 0.77,
    highlight: 0.84,
    thumb: frameThumb(3),
    hasEpisode: true,
    flags: ['⚠️ 스포일러'],
  },
  {
    id: 's4',
    program: 'alone',
    source: '나 혼자 산다 612회',
    aired: '2026-09-19',
    start: 1320,
    end: 1380,
    short: true,
    scene: '감동',
    summary: '박나래가 어머니 편지를 읽다 울컥하는 순간',
    dialogue: '엄마가 이런 걸 써 놨을 줄은 몰랐어요.',
    chars: ['박나래', '전현무'],
    score: 0.74,
    highlight: 0.86,
    thumb: frameThumb(4),
    hasEpisode: true,
    flags: ['⚠️ 음원 미클리어'],
  },
  {
    id: 's5',
    program: 'siblings',
    source: '연애남매 14회',
    aired: '2026-09-20',
    start: 980,
    end: 1032,
    short: true,
    scene: '갈등',
    summary: '남매가 서로의 선택을 두고 정색하며 맞서는 장면',
    dialogue: '그 말은 하지 말았어야지.',
    chars: ['재형', '윤하'],
    score: 0.7,
    highlight: 0.79,
    thumb: frameThumb(5),
    hasEpisode: true,
    flags: [],
  },
  {
    id: 's6',
    program: 'marble',
    source: '지구마불 세계여행 9회',
    aired: '2026-09-13',
    start: 2105,
    end: 2170,
    short: true,
    scene: '웃음',
    summary: '출연자 전원이 웃음을 참지 못하는 벌칙 게임',
    dialogue: '이건 진짜 반칙이야, 다시 해!',
    chars: ['빠니보틀', '원지', '곽튜브'],
    score: 0.66,
    highlight: 0.82,
    thumb: frameThumb(6),
    hasEpisode: true,
    flags: ['PPL 가능성 — 검수 필요'],
  },
  {
    id: 's7',
    program: 'solo',
    source: '나는 SOLO 126회',
    aired: '2026-09-10',
    start: 3020,
    end: 3380,
    short: false,
    scene: '데이트',
    summary: '첫 데이트 식당에서 벌어진 어색한 침묵과 대화 전체',
    dialogue: '음식은… 괜찮으세요?',
    chars: ['영숙', '상철'],
    score: 0.61,
    highlight: 0.58,
    thumb: frameThumb(7),
    hasEpisode: true,
    flags: ['PPL 가능성 — 검수 필요'],
  },
  {
    id: 's8',
    program: 'siblings',
    source: '연애남매 13회',
    aired: '2026-09-13',
    start: 412,
    end: 470,
    short: true,
    scene: null,
    summary: '숙소 도착 첫날 밤, 서로를 처음 소개하는 자리',
    dialogue: '안녕하세요, 저는 둘째예요.',
    chars: ['출연자 1', '출연자 2'],
    score: 0.55,
    highlight: 0.61,
    thumb: frameThumb(8),
    hasEpisode: true,
    flags: ['출연자 권리 확인필요'],
  },
  {
    id: 's9',
    program: 'alone',
    source: '나 혼자 산다 611회',
    aired: '2026-09-12',
    start: 1710,
    end: 1762,
    short: true,
    scene: '요리',
    summary: '요리하다 냄비를 태우고 당황하는 기안84',
    dialogue: '어? 이게 왜 이렇게 됐지?',
    chars: ['기안84'],
    score: 0.52,
    highlight: 0.77,
    thumb: frameThumb(9),
    hasEpisode: true,
    flags: [],
  },
  {
    id: 's10',
    program: 'marble',
    source: '지구마불 세계여행 8회',
    aired: '2026-09-06',
    start: 880,
    end: 1240,
    short: false,
    scene: '여행',
    summary: '이스탄불 시장에서 길을 잃고 헤매는 롱테이크',
    dialogue: '여기 아까 왔던 데 아니야?',
    chars: ['원지', '곽튜브'],
    score: 0.47,
    highlight: 0.52,
    thumb: frameThumb(10),
    hasEpisode: false,
    flags: [],
  },
  {
    id: 's11',
    program: 'solo',
    source: '나는 SOLO 125회',
    aired: '2026-09-03',
    start: 1502,
    end: 1548,
    short: true,
    scene: '웃음',
    summary: 'MC들이 화면을 보다 동시에 소리 지르는 리액션',
    dialogue: '어머, 어머, 저걸 왜 해!',
    chars: ['데프콘', '이이경', '송해나'],
    score: 0.44,
    highlight: 0.8,
    thumb: frameThumb(11),
    hasEpisode: true,
    flags: [],
  },
  {
    id: 's12',
    program: 'siblings',
    source: '연애남매 12회',
    aired: '2026-09-06',
    start: 2230,
    end: 2281,
    short: true,
    scene: '고백',
    summary: '엔딩 크레딧 직전 공개된 숨은 고백 한 장면',
    dialogue: '사실 처음부터 너였어.',
    chars: ['재형', '세승'],
    score: 0.41,
    highlight: 0.73,
    thumb: frameThumb(12),
    hasEpisode: true,
    flags: ['⚠️ 스포일러'],
  },
]

/** 질의 해석에 쓰는 인물 사전 */
export const CHARACTER_NAMES = [...new Set(SEGMENTS.flatMap((s) => s.chars))].filter(
  (n) => !n.startsWith('출연자'),
)

/** 프로그램에서 얼굴이 인식된 출연자 — 프로그램을 고르면 이 목록이 드롭다운에 뜹니다 */
export const castOf = (program: ProgramKey | ''): string[] =>
  [...new Set(SEGMENTS.filter((s) => s.program === program).flatMap((s) => s.chars))]
    .filter((n) => !n.startsWith('출연자'))
    .sort((a, b) => a.localeCompare(b, 'ko'))

/** 질의 해석에 쓰는 장면 사전 */
export const SCENE_NAMES = ['갈등', '고백', '반전', '감동', '웃음', '데이트', '요리', '여행']

/** 초 → m:ss */
export const timeText = (t: number) =>
  `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
