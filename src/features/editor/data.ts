/*
 * 조립 편집기 목 데이터.
 * STEPD 연동 시 이 파일을 API 응답으로 교체하세요.
 */

import { frameThumb, portraitThumb } from '@/lib/frames'
import type { ScreenKey } from '@/app/screens'

export type EditorMode = 'short' | 'clip' | 'hl'

export const editorRoute = (kind: '숏폼' | '클립' | '하이라이트'): ScreenKey =>
  kind === '숏폼' ? 'editor-short' : kind === '하이라이트' ? 'editor-hl' : 'editor-clip'

/** 'f5' 같은 프레임 키를 숫자로 */
const frameNo = (key: string) => Number(key.replace('f', '')) || 1

export const frameImage = (key: string, portrait = false) =>
  portrait ? portraitThumb(frameNo(key)) : frameThumb(frameNo(key))

export const CHAPTER_COLORS = ['#6F8FF7', '#4FA89B', '#C49A4E', '#CF7373', '#7FAE68', '#9D84D2']

/** m:ss */
export const timeText = (s: number) => {
  const v = Math.max(0, Math.round(s))
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`
}

export interface Piece {
  id: string
  label: string
  /** 길이(초) */
  dur: number
  img: string
  line: string
  src?: string
  tag?: string
  /** 클립 모드에서 앞·뒤로 붙인 Beat 수 */
  front?: number
  back?: number
}

export const SHORT_PIECES: Piece[] = [
  { id: 's1', label: '훅 - 영호의 폭발', dur: 6, img: 'f5', line: '이게 지금 말이 된다고 생각해?', src: '32회 41:02' },
  { id: 's2', label: '상황 - 대화의 시작', dur: 14, img: 'f2', line: '잠깐 얘기 좀 할 수 있을까요?', src: '32회 38:40' },
  { id: 's3', label: '반응 - 민지의 당황', dur: 9, img: 'f3', line: '…네? 제가요?', src: '32회 39:15' },
  { id: 's4', label: '결말 - 반전 발언', dur: 11, img: 'f7', line: '사실 처음부터 마음은 정해져 있었어요.', src: '32회 43:28' },
]

export const CLIP_PIECES: Piece[] = [
  { id: 'c1', label: '대화 시작', dur: 42, img: 'f2', line: '잠깐 얘기 좀 할 수 있을까요?', tag: '긴장', src: '32회 36:10', front: 0, back: 0 },
  { id: 'c2', label: '갈등 고조', dur: 53, img: 'f5', line: '왜 그걸 이제 와서 말해요?', tag: '분노', src: '32회 36:52', front: 0, back: 0 },
  { id: 'c3', label: '민지 반박', dur: 53, img: 'f4', line: '저도 참을 만큼 참았어요.', tag: '반박', src: '32회 37:45', front: 0, back: 0 },
  { id: 'c4', label: '영호 퇴장', dur: 56, img: 'f9', line: '…알겠어요. 그만할게요.', tag: '여운', src: '32회 38:38', front: 0, back: 0 },
]

export interface Recommendation {
  title: string
  dur: number
  img: string
  why: string
  score: number
  line: string
  tag?: string
  /** 하이라이트: 넣을 챕터 인덱스 */
  to?: number
  ep?: string
  /** 클립: 앞/뒤/교체 */
  pos?: 'front' | 'back' | 'swap'
}

export const SHORT_RECS: Recommendation[] = [
  { title: '영호의 표정 반응', dur: 12, img: 'f8', why: '감정 연결', score: 96, line: '(말없이 고개를 돌린다)' },
  { title: '민지의 반박', dur: 18, img: 'f4', why: '갈등 강화', score: 93, line: '그건 오해예요. 제 말 좀 들어봐요.' },
  { title: '제작진 자막 컷', dur: 5, img: 'f10', why: '흐름 전환', score: 88, line: '그리고 이어진 한마디' },
  { title: '영숙의 한마디', dur: 8, img: 'f11', why: '반전 예고', score: 85, line: '둘 다 솔직하지 않은 것 같아요.' },
]

export const CLIP_REC_GROUPS: Array<{ title: string; items: Recommendation[] }> = [
  {
    title: '앞에 넣을 장면',
    items: [
      { title: '대화 직전 표정', dur: 16, img: 'f1', why: '맥락 연결', score: 94, line: '(숨을 고르며 문 앞에 선다)', pos: 'front', tag: '긴장' },
    ],
  },
  {
    title: '뒤에 넣을 장면',
    items: [
      { title: '퇴장 후 인터뷰', dur: 22, img: 'f12', why: '여운 강화', score: 91, line: '그날은 저도 제가 이해가 안 됐어요.', pos: 'back', tag: '여운' },
      { title: '남은 출연자 반응', dur: 14, img: 'f6', why: '반응 연결', score: 87, line: '와… 분위기 진짜 싸하다.', pos: 'back', tag: '반응' },
    ],
  },
  {
    title: '중간을 교체할 장면',
    items: [
      { title: '갈등 고조 · 다른 각도', dur: 48, img: 'f8', why: '몰입도', score: 89, line: '왜 그걸 이제 와서 말해요?', pos: 'swap', tag: '분노' },
    ],
  },
]

export const HL_RECS: Recommendation[] = [
  { title: '갈등 직전의 감정 변화 장면', dur: 28, img: 'f11', why: '서사 연결', score: 95, ep: '6화 44:12-44:40', line: '요즘 영호 님이 좀 달라 보여요.', to: 3, tag: '불안' },
  { title: '화해를 설명하는 인터뷰', dur: 24, img: 'f4', why: '감정 설명', score: 92, ep: '10화 31:02-31:26', line: '먼저 손 내밀어 줘서 고마웠어요.', to: 4, tag: '화해' },
  { title: '첫 만남 회상 장면', dur: 18, img: 'f1', why: '수미상관', score: 89, ep: '12화 38:50-39:08', line: '처음 봤을 때가 아직도 생각나요.', to: 5, tag: '회상' },
]

export interface HlCard {
  id: string
  ep: string
  dur: number
  img: string
  line: string
  tag: string
  excluded: boolean
}

export interface Chapter {
  id: string
  title: string
  col: number
  cards: HlCard[]
}

const HL_SEED: Array<{ title: string; cards: Array<[string, number, string, string, string]> }> = [
  {
    title: '첫 만남',
    cards: [
      ['1화 12:40-13:25', 45, 'f1', '안녕하세요, 영호입니다.', '설렘'],
      ['1화 18:02-18:40', 38, 'f2', '첫인상 선택은… 영숙 님이요.', '긴장'],
    ],
  },
  {
    title: '첫 대화',
    cards: [
      ['2화 05:10-06:05', 55, 'f3', '혹시 커피 좋아하세요?', '설렘'],
      ['2화 21:30-22:02', 32, 'f4', '대화가 잘 통한다고 느꼈어요.', '호감'],
    ],
  },
  {
    title: '첫 데이트',
    cards: [
      ['4화 08:15-09:20', 65, 'f6', '여기 꼭 와 보고 싶었어요.', '설렘'],
      ['4화 14:48-15:30', 42, 'f7', '오늘 정말 즐거웠어요.', '호감'],
      ['5화 32:10-32:42', 32, 'f8', '다음에도 같이 올래요?', '기대'],
    ],
  },
  {
    title: '갈등',
    cards: [
      ['7화 11:05-12:05', 60, 'f5', '왜 저한테 말 안 했어요?', '갈등'],
      ['8화 03:20-03:58', 38, 'f9', '서운한 마음이 컸어요.', '서운'],
    ],
  },
  {
    title: '화해',
    cards: [['10화 26:40-27:35', 55, 'f10', '제가 먼저 사과할게요.', '화해']],
  },
  {
    title: '최종 선택',
    cards: [['12화 40:10-41:08', 58, 'f12', '제 선택은… 영숙 님입니다.', '감동']],
  },
]

export const CHAPTERS: Chapter[] = HL_SEED.map((c, i) => ({
  id: `ch${i}`,
  title: c.title,
  col: i,
  cards: c.cards.map(([ep, dur, img, line, tag], k) => ({
    id: `h${i}${k}`,
    ep,
    dur,
    img,
    line,
    tag,
    excluded: false,
  })),
}))

export const FRAME_PRESETS: Array<{ key: string; label: string; color: string }> = [
  { key: 'a', label: 'ENA 기본', color: '#1C60FF' },
  { key: 'b', label: '프로그램 컬러', color: '#C49A4E' },
  { key: 'c', label: '프레임 없음', color: 'transparent' },
]

export const SUBTITLE_STYLES: Array<{ key: string; label: string }> = [
  { key: 'box', label: '박스 자막 — 가독성 우선' },
  { key: 'outline', label: '외곽선 자막 — 화면을 덜 가림' },
  { key: 'none', label: '자막 없음' },
]

export const OUTPUT_CHANNELS: Array<{ key: 'yt' | 'fb' | 'ig'; label: string; account: string }> = [
  { key: 'yt', label: 'YouTube Shorts', account: 'ENA 예능' },
  { key: 'fb', label: 'Facebook', account: 'ENA' },
  { key: 'ig', label: 'Instagram 릴스', account: '@ena.official' },
]

export const MOODS = ['설렘', '긴장', '잔잔', '경쾌']

export const MODE_LABEL: Record<EditorMode, string> = {
  short: '숏폼',
  clip: '클립',
  hl: '하이라이트',
}
