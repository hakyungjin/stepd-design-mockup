import type { ReactNode, RefObject } from 'react'
import type { ChatMessage, ChatMockStore } from './useChatMock'

export interface ChatInputHandle { focus: () => void; select: () => void }
export interface ChatSurfaceProps {
  store: ChatMockStore
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  inputRef: RefObject<ChatInputHandle | null>
  renderTaskSuggestion: (message: ChatMessage) => ReactNode
  onRevealBoard: () => void
  /** 대화가 아직 없을 때 보여 줄 첫 화면 */
  welcome: ReactNode
}
