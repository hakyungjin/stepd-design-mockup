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
}

export const CHAT_SUGGESTIONS = [
  { name: '영상 검색', text: '영호가 화내는 장면 찾아줘' },
  { name: '가벼운 편집', text: '숏폼 앞 2초 자르고 자막을 크게 해줘' },
  { name: '하이라이트 제작', text: '영호 · 영숙 만남 과정 8분 하이라이트 기획해줘' },
  { name: '채널 설정', text: '채널 배너랑 프로필 바꿔줘' },
  { name: '자동배포 계획', text: '다음 주부터 월·수·금 나미브 영상 3개씩 배포해줘' },
]
