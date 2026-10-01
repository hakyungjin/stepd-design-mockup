/*
 * 자동 배포 도메인 타입.
 * 원본 목업(w_auto.dc.html)의 상태 모양을 그대로 옮긴 것입니다.
 * STEPD 연동 시 서버 DTO 와 맞출 자리입니다.
 */

/** 플랫폼 키 — 채널이 어느 플랫폼인지 */
export type PlatformKey = 'YT' | 'NC' | 'TT' | 'IG'

export type RuleState = '운영 중' | '일시정지'

/** 제작할 소재 종류 */
export type MediaKind = '쇼츠' | '클립' | '둘 다'

/** 만들어진 영상의 종류 */
export type HoldKind = '숏폼' | '클립' | '하이라이트'

export interface RuleChannel {
  name: string
  icon: PlatformKey
  sub: string
  /** 운영 설정에서 실제 업로드가 꺼져 있어 기록만 남는 채널 */
  gated: boolean
  /** 토큰 만료 — 재연결 전까지 발행되지 않습니다 */
  expired?: boolean
}

/** 발행 시각 한 칸 — 이 시각에 n 개를 낸다 */
export interface Slot {
  t: string
  n: number
}

/** 자막 한 줄 (시각은 클립 시작 0초 기준) */
export interface Cue {
  id: string
  start: number
  end: number
  text: string
  isNew?: boolean
}

/** 영상 안 타이틀 후보 */
export interface TitleAlt {
  kind: string
  l1: string
  l2: string
}

/** 발행 예정 영상 한 건 */
export interface Hold {
  id: string
  rule: string
  channel: string
  title: string
  caption: string
  /** 'm:ss' */
  dur: string
  kind: HoldKind
  /** 프레임 번호 1..12 */
  img: number
  postChannel: string
  postTitle: string
  postDesc: string
  cueIndex: number
  line1: string
  line2: string
  titleAlts: TitleAlt[]
  /** 2줄 강조색 (#RRGGBB) */
  lineColor: string
  cueSavedAt: string
  cueSavedBy: string
  /** 재분석으로 원문 자막이 바뀐 상태 */
  cueStale: boolean
  /** 다시 굽는 중 */
  rendering: boolean
  time: string
  source: string
  look: string
  cues: Cue[]
  /** 저장하지 않은 수정이 있음 */
  dirty?: boolean
}

/** 템플릿이 함께 정하는 배치 값 */
export interface LayoutPreset {
  titleSize: number
  lineHeight: number
  letter: number
  titleShadow: boolean
  titleTop: number
  capBottom: number
  logo: boolean
}

/** 자동배포 규칙 하나 */
export interface Rule extends LayoutPreset {
  id: string
  name: string
  initial: string
  color: string
  state: RuleState
  channels: RuleChannel[]
  programs: string[]
  mediaKind: MediaKind
  gatePolicy: string
  /** 발행 요일 (0=월 … 6=일) */
  weekdays: number[]
  slots: Slot[]
  aspect: string
  template: string
  thumb: string
  orient: string
  lang: string
  /** 월 예상 발행 건수 */
  monthly: number
  created: string
  ruleCode: string
  ep: number
  /** 채널당 하루 한도 */
  dailyQuota: number
  holds: Hold[]
}

/** 계획표의 칸 하나 — 이 채널의 이 날/시각에 이 영상 */
export interface PlanEntry {
  hid: string
  ch: string
  day: number
  t: string
}

/** 계획표에서 끌어 온 출처 */
export interface PlanFrom {
  ch: string
  day: number
  t: string
}

/** 칸 팝오버 */
export interface PopState {
  ch: string
  day: number
  t: string
  hid: string | null
  x: number
  y: number
}

/** 확인 창 */
export interface ConfirmCfg {
  title: string
  body: string
  ok: string
  danger?: boolean
  lines?: Array<{ k: string; v: string }>
  run: () => void
}

/** 영상 재생 창 */
export interface PlayerCfg {
  title: string
  kind: HoldKind
  meta: string
}

/** 자동배포 추가 마법사 폼 */
export interface WizardForm extends LayoutPreset {
  program: string
  kind: MediaKind
  scope: string
  future: boolean
  template: string
  aspect: string
  thumb: string
  lang: string
  channels: string[]
  weekdays: number[]
  slots: Slot[]
  reframe: string
  gate: string
}

export type DrawerTab = 'review' | 'all' | 'settings' | 'runs'
export type DetailTab = 'post' | 'cues'
