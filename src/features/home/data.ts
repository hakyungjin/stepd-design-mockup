/*
 * 홈 화면 목 데이터 — 옛 대시보드가 들고 있던 값을 그대로 옮겼습니다.
 * STEPD 연동 시 이 파일만 서버 응답으로 갈아끼우면 됩니다.
 */

export const WON = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`

/** 00시부터 09시까지의 누적 수익 */
export const CUMULATIVE = [14200, 26100, 35800, 43000, 49500, 56300, 67900, 84600, 104200, 128400]
/** 오늘 마감 예상 */
export const CLOSING = 171000
/** 기준 시각 */
export const AS_OF = '9월 30일 (수) · 09:00 기준'

export const TOP_EARNERS: Array<[string, string, number]> = [
  ['영호 폭발 숏폼 (어제 게시)', 'Shorts', 38200],
  ['31회 최종 선택 하이라이트', 'YouTube', 27900],
  ['현숙의 선택, 모두가 놀란 이유', '네이버 클립', 15600],
]

/* 오늘 배포 목록은 홈에서 뺐습니다 — 배포/스케줄 화면이 같은 내용을 더 자세히 보여 줍니다 */
