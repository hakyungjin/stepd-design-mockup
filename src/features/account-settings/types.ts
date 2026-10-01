export interface EmailNotificationPreferences {
  email: string
  enabled: boolean
  completed: boolean
  failed: boolean
}

export interface AccountPlugin {
  id: string
  name: string
  category: '알림' | '저장' | '리포트'
  description: string
  icon: 'email' | 'slack' | 'drive' | 'report'
  available: boolean
}
