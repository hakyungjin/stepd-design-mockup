import { useState } from 'react'
import type { EmailNotificationPreferences } from './types'

/** UI 목업 전용. 앱이 열려 있는 동안 계정의 플러그인 설정을 공유합니다. */
export function useAccountSettings() {
  const [emailInstalled, setEmailInstalled] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState<EmailNotificationPreferences>({ email: '', enabled: true, completed: true, failed: true })

  const saveEmailNotifications = (settings: EmailNotificationPreferences) => {
    setEmailNotifications(settings)
    setEmailInstalled(true)
  }

  return {
    emailInstalled,
    emailNotifications,
    saveEmailNotifications,
    toggleEmailNotifications: () => setEmailNotifications((current) => ({ ...current, enabled: !current.enabled })),
    removeEmailPlugin: () => setEmailInstalled(false),
  }
}

export type AccountSettingsStore = ReturnType<typeof useAccountSettings>
