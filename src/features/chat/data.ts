/*
 * 에이전트 첫 화면 목 데이터.
 *
 *   AGENT_SUGGESTIONS  이렇게 요청해 보세요 (누르면 입력창에 들어갑니다)
 *
 * STEPD 연동 시 이 파일만 서버 응답으로 갈아끼우면 됩니다.
 */

export interface AgentSuggestion {
  id: string
  label: string
  title: string
  /** 누르면 입력창에 들어가는 문장 */
  prompt: string
  icon: string
}

export const AGENT_SUGGESTIONS: AgentSuggestion[] = [
  {
    id: 'search', label: '영상 검색', title: '원하는 장면을 찾아 드려요',
    prompt: '영호가 화내는 장면 찾아줘',
    icon: 'M17 17l4 4M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z',
  },
  {
    id: 'highlight', label: '하이라이트 제작', title: '여러 회차를 하나로 묶어요',
    prompt: '영호 · 영숙 만남 과정 8분 하이라이트 기획해줘',
    icon: 'M12 3.5 14.3 8.8l5.7.6-4.3 3.9 1.2 5.7-4.9-2.9-4.9 2.9 1.2-5.7L4 9.4l5.7-.6L12 3.5Z',
  },
  {
    id: 'edit', label: '가벼운 편집', title: '숏폼 길이와 자막을 다듬어요',
    prompt: '숏폼 앞 2초 자르고 자막을 크게 해줘',
    icon: 'M7 4v16m10-16v16M3 9h4m10 0h4M3 15h4m10 0h4',
  },
  {
    id: 'deploy', label: '자동배포 계획', title: '다음 주 배포 일정을 짜요',
    prompt: '다음 주부터 월·수·금 나미브 영상 3개씩 배포해줘',
    icon: 'M19 7a8 8 0 0 0-13-1L3 9m0-5v5h5m-3 8a8 8 0 0 0 13 1l3-3m0 5v-5h-5',
  },
  {
    id: 'channel', label: '채널 설정', title: '배너와 프로필 시안을 만들어요',
    prompt: '채널 배너랑 프로필 바꿔줘',
    icon: 'M4 7h16v10H4V7ZM8 20h8M12 17v3m-2-9 4 2-4 2v-4Z',
  },
]
