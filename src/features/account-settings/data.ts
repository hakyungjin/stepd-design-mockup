import type { AccountPlugin } from './types'

export const ACCOUNT = { id: 'account-hakj', name: '하경진', organization: 'KT ENA', team: '콘텐츠 제작팀', role: '관리자' }

/* 바깥 서비스를 연결하는 자리입니다 — 서비스가 아닌 기능(정기 리포트 등)은 여기 두지 않습니다 */
export const PLUGINS: AccountPlugin[] = [
  { id: 'email', name: 'Gmail', description: 'Google 이메일로 배포 완료와 오류 알림을 받습니다.', icon: 'email', available: true },
  { id: 'drive', name: 'Google Drive', description: '제작한 영상과 썸네일을 드라이브에 저장합니다.', icon: 'drive', available: false },
]
