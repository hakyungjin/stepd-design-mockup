import { useEffect, useState } from 'react'
import { AppShell } from './layout/AppShell'
import { StubScreen } from './components/StubScreen'
import { SCREEN_TITLE, isFullScreen, type ScreenKey } from './app/screens'
import { useHashRoute } from './app/useHashRoute'
import { DeployCalendarPage } from './features/deploy-calendar/DeployCalendarPage'
import { PerformancePage } from './features/performance/PerformancePage'
import { VideoSearchPage } from './features/video-search/VideoSearchPage'
import { DeployPage } from './features/deploy/DeployPage'
import { ChannelsPage } from './features/channels/ChannelsPage'
import { ProgramsPage } from './features/programs/ProgramsPage'
import { AnalysisPage } from './features/analysis/AnalysisPage'
import { MediaPage } from './features/media/MediaPage'
import { HomePage } from './features/home/HomePage'
import { ShortformEditorPage } from './features/editor/ShortformEditorPage'
import { ClipEditorPage } from './features/editor/ClipEditorPage'
import { HighlightEditorPage } from './features/editor/HighlightEditorPage'
import { AutoDeployPage } from './features/auto-deploy/AutoDeployPage'
import { AccountSettingsPage } from './features/account-settings/AccountSettingsPage'
import { AccountProfilePage } from './features/account-settings/AccountProfilePage'
import { useAccountSettings, type AccountSettingsStore } from './features/account-settings/useAccountSettings'
import { ChatPage } from './features/chat/ChatPage'
import { useChatMock, type ChatMockStore } from './features/chat/useChatMock'
import { useScheduledTasksMock, type ScheduledTasksStore } from './features/chat/useScheduledTasksMock'
import { useMediaCollaborationMock, type MediaCollaborationStore, type MediaCommentTarget, type MediaMention } from './features/media/useMediaCollaborationMock'

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
  const collaboration = useMediaCollaborationMock()
  const [mediaTarget, setMediaTarget] = useState<MediaCommentTarget | null>(null)
  const openMention = (item: MediaMention) => { setMediaTarget({ clipId: item.clipId, commentId: item.commentId, version: item.version }); navigate('media') }
  /** 홈 입력창에 쓴 문장 — 에이전트 화면이 한 번 받아 가고 비웁니다 */
  const [askedFromHome, setAskedFromHome] = useState('')
  const askAgent = (text: string) => { if (!text.trim()) return; chat.newChat(); setAskedFromHome(text.trim()); navigate('chat') }

  useEffect(() => {
    document.title = `STEP D · ${SCREEN_TITLE[screen]}`
  }, [screen])

  const body = renderScreen(screen, navigate, accountSettings, chat, tasks, collaboration, mediaTarget, () => setMediaTarget(null), askAgent, askedFromHome, () => setAskedFromHome(''))

  if (isFullScreen(screen)) return body

  return (
    <AppShell active={screen} onNavigate={navigate} collaboration={collaboration} onOpenMention={openMention}>
      {body}
    </AppShell>
  )
}

function renderScreen(screen: ScreenKey, navigate: (s: ScreenKey) => void, accountSettings: AccountSettingsStore, chat: ChatMockStore, tasks: ScheduledTasksStore, collaboration: MediaCollaborationStore, mediaTarget: MediaCommentTarget | null, onMediaTargetHandled: () => void, onAsk: (text: string) => void, askedFromHome: string, onAskHandled: () => void) {
  switch (screen) {
    /* 대시보드는 홈 안으로 합쳐졌습니다 — 옛 주소(#dashboard)도 홈을 띄웁니다 */
    case 'home':
    case 'dashboard':
      return <HomePage onNavigate={navigate} onAsk={onAsk} />
    case 'chat':
      return <ChatPage store={chat} tasks={tasks} emailAvailable={accountSettings.emailInstalled && accountSettings.emailNotifications.enabled} onNavigate={navigate} initialInput={askedFromHome} onInitialInputUsed={onAskHandled} />
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
      return <MediaPage onNavigate={navigate} collaboration={collaboration} commentTarget={mediaTarget} onCommentTargetHandled={onMediaTargetHandled} />
    case 'auto':
      return <AutoDeployPage onNavigate={navigate} />
    case 'settings':
      return <AccountSettingsPage store={accountSettings} />
    case 'profile':
      return <AccountProfilePage />
    case 'editor-short':
      return <ShortformEditorPage onNavigate={navigate} />
    case 'editor-clip':
      return <ClipEditorPage onNavigate={navigate} />
    case 'editor-hl':
      return <HighlightEditorPage onNavigate={navigate} />
    default:
      return <StubScreen title={SCREEN_TITLE[screen]} />
  }
}
