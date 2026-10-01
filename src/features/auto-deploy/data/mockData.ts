/*
 * 자동 배포 목 데이터.
 * ------------------------------------------------------------------
 * 원본 목업(w_auto.dc.html)의 RULES · CLIP_POOL · mkHolds · DONE · RUN_SEED 를
 * 값까지 그대로 옮긴 파일입니다.
 * STEPD 연동 시 이 파일을 통째로 API 응답으로 교체하세요.
 */

import { TEMPLATE_PRESETS, durSec } from '../constants'
import type { Cue, Hold, HoldKind, MediaKind, Rule, RuleChannel } from '../types'

export const ME = '하경진'

/** 설정의 프로그램 고르기 목록 */
export const ALL_PROGRAMS: Array<{ name: string; count: string }> = [
  { name: '나미브', count: '주 5회' },
  { name: 'Keluarga HAHA', count: '주 1회' },
  { name: '나는 SOLO', count: '주 2회' },
  { name: 'ENA 케이팝업 차트쇼', count: '주 1회' },
  { name: '지구마불 세계여행', count: '주 1회' },
  { name: '백종원의 레미제라블', count: '주 1회' },
  { name: '신병', count: '주 2회' },
  { name: '크래시', count: '주 2회' },
  { name: '유니콘', count: '주 1회' },
]

/** 대기열을 채우는 클립 풀 */
const CLIP_POOL: Array<{ title: string; caption: string }> = [
  { title: '결국 밝혀진 진짜 이유', caption: '그 사람이 왜 거기 있었냐면' },
  { title: '첫 대면, 분위기 급변', caption: '이 장면부터 표정이 달라집니다' },
  { title: '앵콜 무대 시작합니다', caption: '다시 한 번 무대로 올라갑니다' },
  { title: '마지막 한 마디', caption: '그 말이 전부였습니다' },
  { title: '이걸 지금 알았다고요?', caption: '세 사람만 모르고 있었던 겁니다' },
  { title: '새벽 네 시의 전화', caption: '받지 말았어야 했던 전화' },
  { title: '숨겨 둔 편지 한 장', caption: '서랍 속에 있던 건 편지였습니다' },
  { title: '웃음이 터진 순간', caption: '참다가 결국 다 같이 웃었습니다' },
  { title: '아무도 예상 못 한 선택', caption: '마지막에 고른 건 뜻밖이었습니다' },
  { title: '돌아온 사람', caption: '문을 열고 들어온 건 그 사람이었습니다' },
  { title: '눈물의 재회', caption: '3년 만에 다시 만났습니다' },
  { title: '그날 밤 옥상에서', caption: '둘만 아는 이야기가 시작됩니다' },
  { title: '처음 공개되는 장면', caption: '본방에서 빠졌던 장면입니다' },
  { title: '끝까지 봐야 하는 이유', caption: '마지막 10초에 답이 있습니다' },
]

/** 클립 길이에 비례해 STT 원문 4줄을 만듭니다 */
export const mkCues = (h: Pick<Hold, 'dur' | 'caption'>): Cue[] => {
  const L = durSec(h.dur)
  const f = (x: number) => Math.round(L * x * 10) / 10
  return [
    { id: 'c0', start: 0, end: f(0.18), text: '자, 여기서부터 보셔야 합니다' },
    { id: 'c1', start: f(0.2), end: f(0.45), text: h.caption },
    { id: 'c2', start: f(0.45), end: f(0.72), text: '그런데 분위기가 달라집니다' },
    { id: 'c3', start: f(0.76), end: f(0.97), text: '그래서 결과는 이렇게 됐습니다' },
  ]
}

interface RuleSeed {
  id: string
  name: string
  initial: string
  color: string
  state: Rule['state']
  channels: RuleChannel[]
  programs: string[]
  mediaKind: MediaKind
  gatePolicy: string
  weekdays: number[]
  slots: string[]
  slotN?: number[]
  aspect: string
  template: string
  thumb: string
  orient: string
  lang: string
  monthly: number
  created: string
  ruleCode: string
  holdN: number
  ep: number
}

/** 규칙의 발행 예정 영상 14건 */
const mkHolds = (rule: RuleSeed): Hold[] => {
  const kinds: HoldKind[] =
    rule.mediaKind === '쇼츠'
      ? ['숏폼']
      : rule.mediaKind === '클립'
        ? ['클립', '클립', '하이라이트']
        : ['숏폼', '클립', '숏폼', '하이라이트']

  return CLIP_POOL.map((c, i) => {
    const kind = kinds[i % kinds.length]
    const dur =
      kind === '숏폼'
        ? `0:${String(29 + ((i * 7) % 30)).padStart(2, '0')}`
        : kind === '클립'
          ? `${2 + (i % 3)}:${String((i * 13) % 60).padStart(2, '0')}`
          : `${5 + (i % 3)}:${String((i * 17) % 60).padStart(2, '0')}`
    const ep = rule.ep + (i % 3)
    const l2 = ['그 뒤에 이어진 이야기', '끝까지 보면 압니다', '그 말이 나온 순간', '분위기가 바뀐 이유'][i % 4]
    const hold: Hold = {
      id: `${rule.id}-${i}`,
      rule: rule.name,
      channel: rule.channels[0].name,
      title: c.title,
      caption: c.caption,
      dur,
      kind,
      img: (i % 12) + 1,
      postChannel: rule.channels[0].name.indexOf('네이버') === 0 ? '네이버 클립' : 'YouTube',
      postTitle: `${c.title} · ${rule.name} ${ep}회`,
      postDesc: `함께 보고 싶은 오늘의 순간.\n#${rule.name.replace(/\s/g, '')} #Shorts`,
      cueIndex: 0,
      line1: c.title,
      line2: l2,
      titleAlts: [
        { kind: '기본', l1: c.title, l2 },
        { kind: '실명형', l1: '강수연의 선택', l2: `${rule.name} ${ep}회` },
        { kind: '인용형', l1: `“${c.caption}”`, l2: '그 말이 나온 순간' },
        { kind: '상황형', l1: '분위기가 바뀐 이유', l2: '끝까지 보면 압니다' },
      ],
      lineColor: '#F3AF4F',
      cueSavedAt: '09/22 13:05',
      cueSavedBy: ME,
      cueStale: i === 1,
      rendering: i === 1,
      time: ['13:20', '13:50', '11:05', '09:42', '16:10'][i % 5],
      source: `${rule.name} ${ep}회 · ${12 + (i % 6)}:40–${13 + (i % 6)}:31`,
      look: `${rule.template} · ${rule.aspect}`,
      cues: [],
    }
    hold.cues = mkCues(hold)
    return hold
  })
}

const SEED: RuleSeed[] = [
  { id: 'r1', name: '나미브', initial: '나', color: '#6b5f5a', state: '운영 중', channels: [{ name: 'YouTube · 나미브 공식', icon: 'YT', sub: '오늘 2건 · 채널당 하루 3개', gated: false }, { name: '네이버 클립 · ENA DRAMA', icon: 'NC', sub: '토큰 만료 · 다시 연결 필요', gated: false, expired: true }], programs: ['나미브'], mediaKind: '쇼츠', gatePolicy: 'hold_on_issue', weekdays: [0, 1, 2, 3, 4], slots: ['12:30', '19:00'], slotN: [1, 1], aspect: '위 자막띠', template: '드라마 베이직', thumb: '프레임 추출', orient: '세로 · AI 리프레임', lang: '한국어', monthly: 66, created: '09/14', ruleCode: 'rule_8f21', holdN: 5, ep: 12 },
  { id: 'r2', name: 'Keluarga HAHA', initial: 'K', color: '#4d5f7a', state: '운영 중', channels: [{ name: 'YouTube · ENA ENT', icon: 'YT', sub: '오늘 1건', gated: false }], programs: ['Keluarga HAHA'], mediaKind: '쇼츠', gatePolicy: 'approve_first', weekdays: [5, 6], slots: ['18:00'], aspect: '위 자막띠', template: '예능 팝', thumb: 'AI 생성', orient: '세로 · AI 리프레임', lang: '한국어 + 영어', monthly: 24, created: '08/30', ruleCode: 'rule_4c02', holdN: 2, ep: 7 },
  { id: 'r3', name: '나는 SOLO', initial: '나', color: '#5a4d6b', state: '운영 중', channels: [{ name: 'YouTube · SOLO 공식', icon: 'YT', sub: '오늘 3건', gated: false }, { name: '네이버 클립 · ENA ENT', icon: 'NC', sub: '오늘 1건', gated: false }, { name: 'TikTok · ENA', icon: 'TT', sub: '운영 설정에서 꺼져 있어 기록만 남습니다', gated: true }], programs: ['나는 SOLO'], mediaKind: '둘 다', gatePolicy: 'hold_on_issue', weekdays: [5, 6], slots: ['18:00'], aspect: '위 자막띠', template: '예능 팝', thumb: '프레임 추출', orient: '세로 · AI 리프레임', lang: '한국어', monthly: 180, created: '07/02', ruleCode: 'rule_1a77', holdN: 2, ep: 216 },
  { id: 'r4', name: 'ENA 케이팝업 차트쇼', initial: 'E', color: '#3f5f6b', state: '운영 중', channels: [{ name: 'YouTube · ENA KPOP', icon: 'YT', sub: '주 2건', gated: false }, { name: '네이버 클립 · ENA KPOP', icon: 'NC', sub: '주 1건', gated: false }], programs: ['ENA 케이팝업 차트쇼'], mediaKind: '클립', gatePolicy: 'hold_on_issue', weekdays: [5, 6], slots: ['18:00'], aspect: '전체 담기', template: '예능 팝', thumb: '프레임 추출', orient: '가로 · 리프레임 없음', lang: '한국어', monthly: 8, created: '06/11', ruleCode: 'rule_9e30', holdN: 2, ep: 48 },
  { id: 'r5', name: '지구마불 세계여행', initial: '지', color: '#5f6b4d', state: '일시정지', channels: [{ name: 'YouTube · 지구마불', icon: 'YT', sub: '토큰 만료 · 다시 연결 필요', gated: false }], programs: ['지구마불 세계여행'], mediaKind: '쇼츠', gatePolicy: 'hold_on_issue', weekdays: [5, 6], slots: [], aspect: '위 자막띠', template: '예능 팝', thumb: '프레임 추출', orient: '세로 · AI 리프레임', lang: '한국어', monthly: 22, created: '05/20', ruleCode: 'rule_7b18', holdN: 2, ep: 31 },
  { id: 'r6', name: '백종원의 레미제라블', initial: '백', color: '#6b5a3f', state: '운영 중', channels: [{ name: 'YouTube · ENA FOOD', icon: 'YT', sub: '오늘 2건', gated: false }, { name: '네이버 클립 · ENA FOOD', icon: 'NC', sub: '오늘 1건', gated: false }, { name: 'TikTok · ENA', icon: 'TT', sub: '기록만 남습니다', gated: true }], programs: ['백종원의 레미제라블'], mediaKind: '쇼츠', gatePolicy: 'hold_on_issue', weekdays: [5, 6], slots: ['18:00'], aspect: '위 자막띠', template: '예능 팝', thumb: '프레임 추출', orient: '세로 · AI 리프레임', lang: '한국어', monthly: 44, created: '04/18', ruleCode: 'rule_2d55', holdN: 2, ep: 9 },
  { id: 'r7', name: '신병', initial: '신', color: '#4d6b5f', state: '운영 중', channels: [{ name: 'YouTube · 신병 공식', icon: 'YT', sub: '오늘 2건', gated: false }, { name: '네이버 클립 · ENA DRAMA', icon: 'NC', sub: '오늘 1건', gated: false }], programs: ['신병'], mediaKind: '쇼츠', gatePolicy: 'hold_on_issue', weekdays: [5, 6], slots: ['18:00'], aspect: '위 자막띠', template: '드라마 베이직', thumb: '프레임 추출', orient: '세로 · AI 리프레임', lang: '한국어', monthly: 52, created: '03/22', ruleCode: 'rule_6a90', holdN: 2, ep: 4 },
  { id: 'r8', name: '크래시', initial: '크', color: '#6b4d4d', state: '운영 중', channels: [{ name: 'YouTube · ENA DRAMA', icon: 'YT', sub: '오늘 1건', gated: false }], programs: ['크래시'], mediaKind: '쇼츠', gatePolicy: 'hold_on_issue', weekdays: [1, 3], slots: ['20:00'], aspect: '위 자막띠', template: '드라마 베이직', thumb: '프레임 추출', orient: '세로 · AI 리프레임', lang: '한국어', monthly: 38, created: '03/02', ruleCode: 'rule_3f14', holdN: 4, ep: 6 },
  { id: 'r9', name: '유니콘', initial: '유', color: '#4d5a6b', state: '운영 중', channels: [{ name: '네이버 클립 · ENA ENT', icon: 'NC', sub: '주 2건', gated: false }], programs: ['유니콘'], mediaKind: '클립', gatePolicy: 'approve_first', weekdays: [2, 4], slots: ['19:30'], aspect: '위 자막띠', template: '예능 팝', thumb: 'AI 생성', orient: '세로 · AI 리프레임', lang: '한국어', monthly: 16, created: '02/11', ruleCode: 'rule_5c73', holdN: 3, ep: 3 },
  { id: 'r10', name: '예능 프리뷰', initial: '예', color: '#5f5a6b', state: '일시정지', channels: [{ name: '네이버 클립 · ENA ENT', icon: 'NC', sub: '09/08 하경진이 정지', gated: false }], programs: ['예능 프리뷰'], mediaKind: '쇼츠', gatePolicy: 'approve_first', weekdays: [3, 4], slots: [], aspect: '위 자막띠', template: '예능 팝', thumb: '프레임 추출', orient: '세로 · AI 리프레임', lang: '한국어', monthly: 6, created: '01/24', ruleCode: 'rule_7b18', holdN: 2, ep: 5 },
  { id: 'r11', name: '환승연애 리캡', initial: '환', color: '#6b5f4d', state: '운영 중', channels: [{ name: 'YouTube · ENA ENT', icon: 'YT', sub: '오늘 1건', gated: false }], programs: ['환승연애 리캡'], mediaKind: '쇼츠', gatePolicy: 'hold_on_issue', weekdays: [0, 2, 4], slots: ['21:00'], aspect: '위 자막띠', template: '예능 팝', thumb: '프레임 추출', orient: '세로 · AI 리프레임', lang: '한국어', monthly: 30, created: '01/08', ruleCode: 'rule_8b21', holdN: 2, ep: 11 },
  { id: 'r12', name: '주말 다큐 극장', initial: '주', color: '#4d6b6b', state: '운영 중', channels: [{ name: 'YouTube · ENA DOC', icon: 'YT', sub: '주 2건', gated: false }], programs: ['주말 다큐 극장'], mediaKind: '클립', gatePolicy: 'hold_on_issue', weekdays: [5, 6], slots: ['21:00'], aspect: '전체 담기', template: '뉴스 타이트', thumb: '프레임 추출', orient: '가로 · 리프레임 없음', lang: '한국어', monthly: 8, created: '12/12', ruleCode: 'rule_1d09', holdN: 1, ep: 22 },
  { id: 'r13', name: '생방송 스포츠 하이라이트', initial: '생', color: 'var(--status-success-text)', state: '운영 중', channels: [{ name: 'YouTube · ENA SPORTS', icon: 'YT', sub: '오늘 4건', gated: false }, { name: 'TikTok · ENA', icon: 'TT', sub: '기록만 남습니다', gated: true }], programs: ['생방송 스포츠 하이라이트'], mediaKind: '쇼츠', gatePolicy: 'hold_on_issue', weekdays: [0, 1, 2, 3, 4, 5, 6], slots: [], aspect: '위 자막띠', template: '뉴스 타이트', thumb: '프레임 추출', orient: '세로 · AI 리프레임', lang: '한국어', monthly: 240, created: '11/30', ruleCode: 'rule_4e62', holdN: 2, ep: 88 },
  { id: 'r14', name: '심야 토크 아카이브', initial: '심', color: '#5a4d4d', state: '운영 중', channels: [{ name: '네이버 클립 · ENA ENT', icon: 'NC', sub: '주 1건', gated: false }], programs: ['심야 토크 아카이브'], mediaKind: '클립', gatePolicy: 'hold_on_issue', weekdays: [6], slots: ['23:00'], aspect: '전체 담기', template: '예능 팝', thumb: 'AI 생성', orient: '가로 · 리프레임 없음', lang: '한국어', monthly: 4, created: '11/02', ruleCode: 'rule_9a48', holdN: 2, ep: 17 },
]

/** 시드 → 화면이 쓰는 규칙 (슬롯 개수·템플릿 배치값·대기열을 채웁니다) */
export const createRules = (): Rule[] =>
  SEED.map((r) => ({
    ...r,
    slots: r.slots.map((t, i) => ({ t, n: r.slotN ? r.slotN[i] : i === 0 ? 2 : 1 })),
    dailyQuota: 3,
    ...TEMPLATE_PRESETS[r.template],
    holds: mkHolds(r),
  }))

/** 전체 영상 탭에 함께 보이는 이미 끝난 것들 */
export const DONE: Array<{
  title: string
  kind: HoldKind
  channel: string
  at: string
  state: string
  color: string
}> = [
  { title: '재회 장면 컷', kind: '숏폼', channel: 'YouTube', at: '09/22 12:30', state: '발행됨', color: 'var(--status-success-text)' },
  { title: '첫 만남 하이라이트', kind: '숏폼', channel: '네이버 클립', at: '09/22 08:00', state: '발행됨', color: 'var(--status-success-text)' },
  { title: '진실을 밝히는 통화', kind: '클립', channel: 'YouTube', at: '09/21 19:00', state: '발행됨', color: 'var(--status-success-text)' },
  { title: '병실 앞 대치', kind: '숏폼', channel: 'TikTok', at: '09/21 12:30', state: '기록만', color: 'var(--text-muted)' },
  { title: '아침 회상 장면', kind: '숏폼', channel: '네이버 클립', at: '09/21 08:00', state: '발행됨', color: 'var(--status-success-text)' },
  { title: '계약서 장면', kind: '클립', channel: 'YouTube', at: '09/20 19:00', state: '발행 안 함', color: 'hsl(var(--status-error))' },
  { title: '오프닝 티저', kind: '숏폼', channel: 'YouTube', at: '09/20 12:30', state: '발행됨', color: 'var(--status-success-text)' },
  { title: '예고편 재구성', kind: '클립', channel: '네이버 클립', at: '09/19 21:00', state: '발행됨', color: 'var(--status-success-text)' },
]

/** 발행 기록 — 서버는 50건씩 더 내려주고 상한 500건 */
export const RUN_TOTAL = 214
export const RUN_PAGE = 50
export const RUN_CAP = 500

export const RUN_SEED: Array<{ title: string; channel: string; state: string; color: string }> = [
  { title: '재회 장면 컷', channel: 'YouTube', state: '발행 완료', color: 'var(--status-success-text)' },
  { title: '첫 만남 하이라이트', channel: '네이버 클립', state: '발행 완료', color: 'var(--status-success-text)' },
  { title: '진실을 밝히는 통화', channel: 'YouTube', state: '발행 완료', color: 'var(--status-success-text)' },
  { title: '병실 앞 대치', channel: 'TikTok', state: '기록만', color: 'var(--text-muted)' },
  { title: '아침 회상 장면', channel: '네이버 클립', state: '발행 완료', color: 'var(--status-success-text)' },
  { title: '계약서 장면', channel: 'YouTube', state: '발행 완료', color: 'var(--status-success-text)' },
]

/** 목업이 보는 크레딧 잔액 (0 이하면 전체가 멈춘 상태로 보입니다) */
export const INITIAL_CREDIT = 3631

/* 공개된 QA 화면에 실제 주소가 올라가지 않도록 예시 도메인을 씁니다 */
export const NOTIFY_EMAILS = ['ha.kj@example.com', 'ops@example.com']
