import type { AccountPlugin } from './types'

export const ACCOUNT = { id: 'account-hakj', name: '하경진', organization: 'KT ENA', team: '콘텐츠 제작팀', role: '관리자' }

export const PLUGINS: AccountPlugin[] = [
  { id: 'email', name: '이메일 알림', category: '알림', description: '배포 완료와 오류 알림을 등록한 이메일로 받아보세요.', icon: 'email', available: true },
  { id: 'slack', name: 'Slack 알림', category: '알림', description: '팀 채널에서 배포 결과와 확인이 필요한 알림을 함께 확인하세요.', icon: 'slack', available: false },
  { id: 'drive', name: 'Google Drive 저장', category: '저장', description: '제작한 영상과 썸네일을 지정한 드라이브 폴더에 모아두세요.', icon: 'drive', available: false },
  { id: 'report', name: '정기 리포트', category: '리포트', description: '배포 현황과 콘텐츠 성과를 정해진 주기에 받아보세요.', icon: 'report', available: false },
]
