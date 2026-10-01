/**
 * 화면 키와 좌측 내비 구성.
 *
 * 원본 목업의 `STEP D 통합.dc.html` 이 쓰던 키를 그대로 씁니다.
 * (해시 라우팅이라 #media, #dist 같은 주소가 원본과 호환됩니다)
 */

export type ScreenKey =
  | 'home'
  | 'chat'
  | 'dashboard'
  | 'programs'
  | 'analysis'
  | 'media'
  | 'dist'
  | 'schedule'
  | 'performance'
  | 'channels'
  | 'auto'
  | 'commerce'
  | 'search'
  | 'settings'
  | 'profile'
  | 'editor-short'
  | 'editor-clip'
  | 'editor-hl'

export const SCREEN_KEYS: ScreenKey[] = [
  'home',
  'chat',
  'dashboard',
  'programs',
  'analysis',
  'media',
  'dist',
  'schedule',
  'performance',
  'channels',
  'auto',
  'commerce',
  'search',
  'settings',
  'profile',
  'editor-short',
  'editor-clip',
  'editor-hl',
]

export const isScreenKey = (v: string): v is ScreenKey =>
  (SCREEN_KEYS as string[]).includes(v)

/** 화면 제목 (상단 바 / 문서 타이틀) */
export const SCREEN_TITLE: Record<ScreenKey, string> = {
  home: '홈',
  chat: '에이전트',
  dashboard: '대시보드',
  programs: '프로그램',
  analysis: '영상 분석',
  media: '미디어',
  dist: '배포',
  schedule: '배포 캘린더',
  performance: '성과',
  channels: '배포 채널',
  auto: '자동 배포',
  commerce: '상품 링크',
  search: '영상 검색',
  settings: '설정',
  profile: '계정 정보',
  'editor-short': '숏폼 편집기',
  'editor-clip': '클립 편집기',
  'editor-hl': '하이라이트 편집기',
}

export interface NavItem {
  key: ScreenKey
  label: string
  /** 아직 목업이 없는 항목 */
  stub?: boolean
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export const NAV: NavSection[] = [
  {
    title: '작업 공간',
    items: [
      /* 대시보드(오늘 수익·오늘 배포)는 홈 안으로 들어갔습니다 */
      { key: 'home', label: '홈' },
      { key: 'chat', label: '에이전트' },
      { key: 'programs', label: '프로그램' },
      { key: 'analysis', label: '영상 분석' },
      { key: 'media', label: '미디어' },
      { key: 'dist', label: '배포/스케줄' },
      { key: 'performance', label: '성과' },
      { key: 'channels', label: '배포 채널' },
    ],
  },
  {
    title: '자동화',
    items: [
      { key: 'auto', label: '자동 배포' },
      { key: 'commerce', label: '상품 링크', stub: true },
    ],
  },
  {
    title: '도구',
    items: [{ key: 'search', label: '영상 검색' }],
  },
]

/**
 * 좌측 내비에서 켜 둘 항목.
 * - 배포 캘린더는 "배포" 탭 안의 서브 탭입니다
 * - 대시보드는 홈 안으로 들어갔습니다
 */
export const navKeyFor = (screen: ScreenKey): ScreenKey =>
  screen === 'schedule' ? 'dist' : screen === 'dashboard' ? 'home' : screen

/** 편집기는 사이드바 없는 전체 화면입니다 */
export const isFullScreen = (screen: ScreenKey): boolean => screen.startsWith('editor-')
