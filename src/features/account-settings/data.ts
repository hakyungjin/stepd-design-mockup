import type { AccountPlugin } from './types'

export const ACCOUNT = { id: 'account-hakj', name: '하경진', organization: 'KT ENA', team: '콘텐츠 제작팀', role: '관리자' }

export const PLUGINS: AccountPlugin[] = [
  { id: 'email', name: 'Gmail', category: '알림', description: 'Google 이메일로 배포 완료와 오류 알림을 받습니다.', icon: 'email', available: true },
  { id: 'slack', name: 'Slack', category: '알림', description: '팀 채널로 배포 결과와 알림을 보냅니다.', icon: 'slack', available: false },
  { id: 'drive', name: 'Google Drive', category: '저장', description: '제작한 영상과 썸네일을 드라이브에 저장합니다.', icon: 'drive', available: false },
  { id: 'report', name: '정기 리포트', category: '리포트', description: '배포 현황과 콘텐츠 성과를 정기적으로 받습니다.', icon: 'report', available: false },
]
