import type { ScreenKey } from '@/app/screens'
import type { EditorMode } from './data'
import { ShortformEditorPage } from './ShortformEditorPage'
import { ClipEditorPage } from './ClipEditorPage'
import { HighlightEditorPage } from './HighlightEditorPage'

export interface EditorPageProps {
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  onNavigate: (screen: ScreenKey) => void
}

/** 기존 통합 편집기를 호출하는 곳도 개별 편집기로 연결합니다. */
export function EditorPage({ mode, onModeChange, onNavigate }: EditorPageProps) {
  const navigate = (screen: ScreenKey) => {
    if (screen === 'editor-short') onModeChange('short')
    else if (screen === 'editor-clip') onModeChange('clip')
    else if (screen === 'editor-hl') onModeChange('hl')
    else onNavigate(screen)
  }
  if (mode === 'short') return <ShortformEditorPage onNavigate={navigate} />
  if (mode === 'clip') return <ClipEditorPage onNavigate={navigate} />
  return <HighlightEditorPage onNavigate={navigate} />
}
