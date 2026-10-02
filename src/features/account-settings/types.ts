export interface EmailNotificationPreferences {
  email: string
  enabled: boolean
  completed: boolean
  failed: boolean
}

export interface AccountPlugin {
  id: string
  name: string
  description: string
  icon: 'email' | 'drive'
  available: boolean
}
