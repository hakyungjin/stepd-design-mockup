/*
 * 배포 채널 목 데이터.
 * STEPD 연동 시 이 파일을 API 응답으로 교체하세요.
 */

export type PlatformKey = 'yt' | 'fb' | 'ig' | 'tt' | 'nc' | 'cp'

/** 연결했을 때 실제로 어떤 일이 일어나는지 */
export type EffectKind = 'up' | 'warn' | 'off'

export interface Platform {
  key: PlatformKey
  name: string
  color: string
  /** 연결 방식 */
  method: string
  /** 계정 단위 이름 (채널 / 계정 / Page) */
  unit: string
  /** 구독자 수를 부르는 이름 — 플랫폼마다 다릅니다. 없으면 지표를 안 보여 줍니다 */
  audienceLabel?: '구독자' | '팔로워'
  effect: { kind: EffectKind; head: string; text: string }
  tip?: string
  connectLabel: string
  footerLabel?: string
  footerHint?: string
  /** 고정 문구 최대 길이 */
  max?: number
  emptyText?: string
  /** 설정(공개 범위·고정 문구) 자체가 없는 플랫폼 */
  noSettings?: boolean
}

/** 영상 배포용 플랫폼 — 카드/레일 순서 */
export const PLATFORMS: Platform[] = [
  {
    key: 'yt',
    name: 'YouTube',
    color: 'hsl(var(--status-error))',
    method: 'Google 로그인',
    unit: '채널',
    audienceLabel: '구독자',
    effect: {
      kind: 'up',
      head: '파일이 올라갑니다.',
      text: '가로 · 세로 모두 · 예약 발행과 재생목록 담기를 지원합니다.',
    },
    tip: '같은 채널을 분석과 업로드에 모두 쓰려면 각각 한 번씩 연결하세요 — 권한이 서로 덮어씁니다.',
    connectLabel: '+ 채널 추가',
    footerLabel: '설명 고정 문구',
    footerHint: '설명란 맨 아래에 붙습니다',
    max: 500,
  },
  {
    key: 'fb',
    name: 'Facebook',
    color: '#1877F2',
    method: 'Meta 로그인',
    unit: 'Page',
    audienceLabel: '팔로워',
    effect: {
      kind: 'off',
      head: '파일은 올라가지 않습니다.',
      text: '연결해도 배포 기록만 남습니다.',
    },
    tip: 'Page 관리자 계정으로 로그인하면 관리하는 모든 Page가 저장됩니다.',
    connectLabel: '+ Page 추가',
    footerLabel: '설명 고정 문구',
    footerHint: '게시물 맨 아래에 붙습니다',
    max: 300,
    emptyText: '"+ Page 추가"를 누르면 관리하는 모든 Page가 저장됩니다.',
  },
  {
    key: 'ig',
    name: 'Instagram',
    color: '#C13584',
    method: 'Instagram 비즈니스 로그인',
    unit: '계정',
    audienceLabel: '팔로워',
    effect: {
      kind: 'up',
      head: '릴스로 올라갑니다.',
      text: '프로페셔널(비즈니스 · 크리에이터) 계정만 연결됩니다.',
    },
    tip: '토큰이 약 60일마다 만료됩니다. 만료 7일 전부터 재연결을 권합니다.',
    connectLabel: '+ 계정 추가',
    footerLabel: '캡션 고정 문구',
    footerHint: '캡션 맨 아래에 붙습니다',
    max: 200,
  },
  {
    key: 'tt',
    name: 'TikTok',
    color: '#111111',
    method: 'TikTok 로그인',
    unit: '계정',
    audienceLabel: '팔로워',
    effect: {
      kind: 'warn',
      head: '초안으로 올라갑니다.',
      text: 'TikTok 앱 받은함에 들어가며, 게시는 앱에서 직접 누릅니다.',
    },
    tip: '접근 토큰은 약 24시간 · 갱신 토큰은 약 1년입니다. 업로드 전에 자동으로 갱신합니다.',
    connectLabel: '+ 계정 추가',
    footerLabel: '캡션 고정 문구',
    footerHint: '설명란이 없어 캡션 끝에 붙습니다 — 짧게',
    max: 80,
  },
  {
    key: 'nc',
    name: '네이버 클립',
    color: '#03C75A',
    method: '로그인 세션',
    unit: '계정',
    audienceLabel: '구독자',
    effect: {
      kind: 'up',
      head: '파일이 올라갑니다.',
      text: '세로 9:16 숏폼만 · 설명 10자 이상 · 카테고리 1·2차가 필요합니다.',
    },
    tip: 'OAuth가 없어 워커 PC의 로그인 세션으로 발행합니다. 세션이 끊기면 자동으로 다시 로그인합니다.',
    connectLabel: '+ 계정 추가',
    footerLabel: '설명 고정 문구',
    footerHint: '설명 맨 아래에 붙습니다',
    max: 300,
  },
]

/** 상품 링크(커머스)용 플랫폼 */
export const COMMERCE: Platform = {
  key: 'cp',
  name: '쿠팡 파트너스',
  color: '#E52528',
  method: '로그인 세션',
  unit: '계정',
  effect: {
    kind: 'up',
    head: '상품 링크를 만듭니다.',
    text: '영상 설명에 붙는 쿠팡 파트너스 링크를 이 계정으로 발급합니다.',
  },
  connectLabel: '+ 계정 추가',
  noSettings: true,
}

export const ALL_PLATFORMS = [...PLATFORMS, COMMERCE]

export type AccountStatus = 'ok' | 'warn' | 'bad' | 'revoked' | 'off'

export interface Account {
  id: string
  platform: PlatformKey
  name: string
  sub: string
  status: AccountStatus
  /** 상태 보조 설명 */
  statusNote?: string
  since: string
  /** 이 계정으로 자동배포하는 프로그램 */
  rules: string[]
  /** 구독자(팔로워) 수 — 플랫폼이 부르는 이름은 Platform.audienceLabel */
  audience?: number
  /** 최근 영상 평균 조회수 */
  avgViews?: number
  last: string
  lastBad?: boolean
  /** 토큰 만료일 */
  expires?: string
  privacy?: 'public' | 'unlisted' | 'private'
  footer: string
}

const spareYoutube: Account[] = [
  'ENA 드라마',
  'ENA 키즈',
  'ENA 스포츠',
  'ENA 다큐',
  'ENA 뉴스',
  'ENA 라이프',
  'ENA Global',
].map((name, i) => ({
  id: `yx${i}`,
  platform: 'yt' as PlatformKey,
  name,
  sub: '',
  status: 'ok' as AccountStatus,
  since: '2026. 7. 1.',
  rules: [],
  audience: 12_000 + i * 7_400,
  avgViews: 1_800 + i * 950,
  last: '',
  privacy: 'unlisted' as const,
  footer: '',
}))

export const ACCOUNTS: Account[] = [
  ...spareYoutube,
  {
    id: 'y1',
    platform: 'yt',
    name: 'ENA 예능',
    sub: 'UC8xT…3fQ',
    status: 'ok',
    since: '2026. 3. 4.',
    rules: ['주말 캠핑 클럽', '오늘의 식탁', '동네 한 바퀴'],
    audience: 1_280_000,
    avgViews: 42_000,
    last: '09/28 09:40 게시 중',
    privacy: 'unlisted',
    footer: '본방송은 매주 토요일 밤 9시, ENA에서 만나요.',
  },
  {
    id: 'y2',
    platform: 'yt',
    name: 'ENA 음악',
    sub: 'UC2mK…a8W',
    status: 'ok',
    since: '2026. 5. 12.',
    rules: ['여름 음악회'],
    audience: 420_000,
    avgViews: 18_500,
    last: '09/21 22:30 실패 2건',
    lastBad: true,
    privacy: 'public',
    footer: '',
  },
  {
    id: 'y3',
    platform: 'yt',
    name: 'ENA 아카이브',
    sub: 'UC9pL…0vE',
    status: 'revoked',
    since: '2025. 11. 20.',
    rules: [],
    audience: 31_000,
    avgViews: 2_400,
    last: '08/30 이후 배포 없음',
    privacy: 'private',
    footer: '',
  },
  {
    id: 'n1',
    platform: 'nc',
    name: 'ENA 클립',
    sub: 'naver_ena · 클립 발행',
    status: 'ok',
    statusNote: '세션 유효 · 끊기면 자동 복구',
    since: '2026. 6. 2.',
    rules: ['주말 캠핑 클럽', '오늘의 식탁', '동네 한 바퀴'],
    audience: 86_000,
    avgViews: 12_300,
    last: '09/28 09:40 게시 중',
    footer: '',
  },
  {
    id: 't1',
    platform: 'tt',
    name: '@ena_official',
    sub: 'ENA 공식 · open_id 7a3f9c…',
    status: 'bad',
    since: '2026. 4. 8.',
    rules: ['주말 캠핑 클럽', '오늘의 식탁', '여름 음악회'],
    audience: 254_000,
    avgViews: 61_000,
    last: '실패 3건이 재연결을 기다립니다',
    lastBad: true,
    footer: '#ENA #예능',
  },
  {
    id: 'i1',
    platform: 'ig',
    name: '@ena.official',
    sub: 'ENA · IG ID 1784…2210',
    status: 'ok',
    since: '2026. 8. 14.',
    rules: ['주말 캠핑 클럽', '여름 음악회'],
    audience: 312_000,
    avgViews: 28_000,
    last: '09/28 09:30 게시 중',
    expires: '11/12',
    footer: '',
  },
  {
    id: 'i2',
    platform: 'ig',
    name: '@ena_food',
    sub: '오늘의 식탁 · IG ID 1784…8841',
    status: 'warn',
    since: '2026. 8. 2.',
    rules: ['오늘의 식탁'],
    audience: 47_000,
    avgViews: 9_100,
    last: '09/25 19:00 게시됨',
    expires: '10/01',
    footer: '',
  },
  {
    id: 'c1',
    platform: 'cp',
    name: 'ena_partners',
    sub: 'AF1234567 · 상품 링크 발급',
    status: 'ok',
    statusNote: '세션 유효',
    since: '2026. 7. 1.',
    rules: [],
    last: '09/28 링크 14개 발급',
    footer: '',
  },
]

/** 구독자·조회수 같은 큰 수 — 1만부터는 "만" 으로 줄입니다 */
export const countText = (n: number): string => {
  if (n < 10_000) return n.toLocaleString('ko-KR')
  const man = n / 10_000
  return `${man >= 100 ? Math.round(man) : Math.round(man * 10) / 10}만`
}

/** 카드에 표시하는 마지막 토큰 갱신 시각 */
export const TOKEN_REFRESHED: Record<string, string> = {
  y1: '09/27 14:02',
  y2: '09/25 09:10',
  y3: '08/30 11:45',
  n1: '09/28 08:30',
  d1: '09/26 18:00',
  t1: '09/21 22:15',
  i1: '09/28 09:30',
  i2: '08/02 10:20',
  c1: '09/28 07:55',
}

export const STATUS_STYLE: Record<
  AccountStatus,
  { label: string; bg: string; fg: string; dot: string }
> = {
  ok: {
    label: '활성',
    bg: 'var(--status-success-bg)',
    fg: 'var(--status-success-text)',
    dot: 'var(--status-success-text)',
  },
  warn: {
    label: '곧 만료',
    bg: 'rgba(245,158,11,.10)',
    fg: 'hsl(var(--status-warn))',
    dot: '#D97706',
  },
  bad: {
    label: '연동 끊김',
    bg: 'rgba(239,68,68,.08)',
    fg: 'hsl(var(--status-error))',
    dot: 'hsl(var(--status-error))',
  },
  revoked: {
    label: '권한 철회됨',
    bg: 'rgba(239,68,68,.08)',
    fg: 'hsl(var(--status-error))',
    dot: 'hsl(var(--status-error))',
  },
  off: {
    label: '연동 해제됨',
    bg: 'var(--bg-card-hover)',
    fg: 'var(--text-secondary)',
    dot: '#94A3B8',
  },
}

export const EFFECT_COLOR: Record<EffectKind, string> = {
  up: 'var(--status-success-text)',
  warn: '#D97706',
  off: '#94A3B8',
}

export const EFFECT_TEXT_COLOR: Record<EffectKind, string> = {
  up: 'var(--status-success-text)',
  warn: 'hsl(var(--status-warn))',
  off: 'var(--text-secondary)',
}

export const initialOf = (name: string) => name.replace('@', '').charAt(0).toUpperCase()

export const needsAttention = (a: Account) =>
  a.status === 'bad' || a.status === 'warn' || a.status === 'revoked'

/** 상태에 딸린 보조 설명 */
export const statusNoteOf = (a: Account): string => {
  if (a.status === 'warn') return `${a.expires} 만료 — 재연결 권장`
  if (a.status === 'bad') return '인증 만료 — 재연결 필요'
  if (a.status === 'revoked') return 'Google 계정에서 권한을 거뒀습니다'
  if (a.status === 'off') return '배포 대상에서 빠졌습니다'
  if (a.expires) return `토큰 ${a.expires}까지`
  return a.statusNote ?? ''
}

export const PRIVACY_OPTIONS: Array<{ key: 'unlisted' | 'public' | 'private'; label: string }> = [
  { key: 'unlisted', label: '일부 공개' },
  { key: 'public', label: '공개' },
  { key: 'private', label: '비공개' },
]
