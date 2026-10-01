import { useEffect } from 'react'
import { AppShell } from './layout/AppShell'
import { StubScreen } from './components/StubScreen'
import { SCREEN_TITLE, isFullScreen, type ScreenKey } from './app/screens'
import { useHashRoute } from './app/useHashRoute'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { DeployCalendarPage } from './features/deploy-calendar/DeployCalendarPage'
import { PerformancePage } from './features/performance/PerformancePage'
import { VideoSearchPage } from './features/video-search/VideoSearchPage'
import { DeployPage } from './features/deploy/DeployPage'
import { ChannelsPage } from './features/channels/ChannelsPage'
import { ProgramsPage } from './features/programs/ProgramsPage'
import { AnalysisPage } from './features/analysis/AnalysisPage'
import { MediaPage } from './features/media/MediaPage'
import { EditorPage } from './features/editor/EditorPage'
import { AutoDeployPage } from './features/auto-deploy/AutoDeployPage'
import { AccountSettingsPage } from './features/account-settings/AccountSettingsPage'
import { AccountProfilePage } from './features/account-settings/AccountProfilePage'
import { useAccountSettings, type AccountSettingsStore } from './features/account-settings/useAccountSettings'
import type { EditorMode } from './features/editor/data'
import { HomePage } from './features/home/HomePage'
import { ChatPage } from './features/chat/ChatPage'
import { useChatMock, type ChatMockStore } from './features/chat/useChatMock'
import { useScheduledTasksMock, type ScheduledTasksStore } from './features/chat/useScheduledTasksMock'

/**
 * 목업 진입점.
 *
 * STEPD 본 프로젝트에 붙일 때는 AppShell 과 useHashRoute 를 걷어내고,
 * 프로젝트의 라우트 안에 각 화면 컴포넌트를 그대로 놓으면 됩니다.
 */
export default function App() {
  const { screen, navigate } = useHashRoute()
  const accountSettings = useAccountSettings()
  const chat = useChatMock()
  const tasks = useScheduledTasksMock()

  useEffect(() => {
    document.title = `STEP D · ${SCREEN_TITLE[screen]}`
  }, [screen])

  const body = renderScreen(screen, navigate, accountSettings, chat, tasks)

  if (isFullScreen(screen)) return body

  return (
    <AppShell active={screen} onNavigate={navigate}>
      {body}
    </AppShell>
  )
}

function renderScreen(screen: ScreenKey, navigate: (s: ScreenKey) => void, accountSettings: AccountSettingsStore, chat: ChatMockStore, tasks: ScheduledTasksStore) {
  switch (screen) {
    case 'home':
      return <HomePage onNavigate={navigate} />
    case 'chat':
      return <ChatPage store={chat} tasks={tasks} emailAvailable={accountSettings.emailInstalled && accountSettings.emailNotifications.enabled} onNavigate={navigate} />
    case 'dashboard':
      return <DashboardPage onNavigate={navigate} />
    case 'schedule':
      return <DeployCalendarPage onNavigate={navigate} />
    case 'performance':
      return <PerformancePage onNavigate={navigate} />
    case 'search':
      return <VideoSearchPage onNavigate={navigate} />
    case 'dist':
      return <DeployPage onNavigate={navigate} />
    case 'channels':
      return <ChannelsPage />
    case 'programs':
      return <ProgramsPage onNavigate={navigate} />
    case 'analysis':
      return <AnalysisPage onNavigate={navigate} />
    case 'media':
      return <MediaPage onNavigate={navigate} />
    case 'auto':
      return <AutoDeployPage onNavigate={navigate} />
    case 'settings':
      return <AccountSettingsPage store={accountSettings} />
    case 'profile':
      return <AccountProfilePage />
    case 'editor-short':
    case 'editor-clip':
    case 'editor-hl':
      return (
        <EditorPage
          mode={screen === 'editor-hl' ? 'hl' : screen === 'editor-short' ? 'short' : 'clip'}
          onModeChange={(m: EditorMode) => navigate(`editor-${m}` as ScreenKey)}
          onNavigate={navigate}
        />
      )
    default:
      return <StubScreen title={SCREEN_TITLE[screen]} />
  }
}
