import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Message, MessageInput, MessageList, TypingIndicator } from '@chatscope/chat-ui-kit-react'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import { NavIcon } from '@/components/ui/NavIcon'
import { CHAT_SUGGESTIONS, type ChatSurfaceProps } from '@/features/chat/ChatSurface.types'
import styles from '@/features/chat/ChatPage.module.css'
import './chatscope.module.css'

function escapeInput(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('\n', '<br>')
}

/** Message rendering, scrolling and composition use Chatscope's React components. */
export function ChatSurface({ store, input, onInputChange, onSend, inputRef, renderTaskSuggestion }: ChatSurfaceProps) {
  const composerRef = useRef<HTMLDivElement>(null)
  const composing = useRef(false)
  const compositionEnter = useRef(false)
  const lastPlainText = useRef(input)
  const [editorHtml, setEditorHtml] = useState(() => escapeInput(input))
  useEffect(() => {
    if (input !== lastPlainText.current) {
      lastPlainText.current = input
      setEditorHtml(escapeInput(input))
    }
  }, [input])
  const editor = () => composerRef.current?.querySelector<HTMLElement>('[contenteditable]')
  useImperativeHandle(inputRef, () => ({
    focus: () => editor()?.focus(),
    select: () => {
      const element = editor()
      if (!element) return
      element.focus()
      const range = document.createRange()
      range.selectNodeContents(element)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    },
  }), [])
  useEffect(() => {
    const element = editor()
    element?.setAttribute('role', 'textbox')
    element?.setAttribute('aria-label', '채팅 메시지 입력')
    element?.setAttribute('aria-multiline', 'true')
    const sendButton = composerRef.current?.querySelector<HTMLButtonElement>('.cs-button--send')
    sendButton?.setAttribute('aria-label', '메시지 보내기')
  }, [])

  return <div className={`${styles.chat} stepd-chat-kit`}>
    {!store.selected ? <div className={styles.messages}><div className={styles.welcome}><span className={styles.welcomeIcon}><NavIcon screen="chat" size={27} /></span><h1>어떤 일을 함께 해볼까요?</h1><p>필요한 일을 이야기하고, 반복할 요청은 예약 작업으로 저장하세요.</p><div className={styles.suggestions}>{CHAT_SUGGESTIONS.map((suggestion) => <button type="button" key={suggestion.name} onClick={() => { onInputChange(suggestion.text); inputRef.current?.focus() }}><strong>{suggestion.name}</strong><span>{suggestion.text}</span></button>)}</div></div></div> :
      <MessageList key={store.selected.id} className="stepd-chat-messages" autoScrollToBottom autoScrollToBottomOnMount scrollBehavior="auto" role="log" aria-label="채팅 메시지" aria-live="polite" typingIndicator={store.busy ? <TypingIndicator content="답변을 작성하고 있습니다…" /> : undefined}>
        {store.selected.messages.map((message) => <Message key={message.id} model={{ direction: message.role === 'user' ? 'outgoing' : 'incoming', position: 'single', sender: message.role === 'user' ? '나' : 'STEP D', type: 'custom' }}>
          <Message.CustomContent>{message.role === 'assistant' && <small className={styles.sampleLabel}>STEP D</small>}<p className="stepd-message-text">{message.text}</p>{message.suggestion && renderTaskSuggestion(message)}</Message.CustomContent>
        </Message>)}
      </MessageList>}
    <div ref={composerRef} className={styles.composerWrap}
      onCompositionStartCapture={() => { composing.current = true }}
      onCompositionEndCapture={() => { composing.current = false }}
      onKeyDownCapture={(event) => { compositionEnter.current = event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) }}
      onKeyPressCapture={(event) => { if (event.key === 'Enter' && (compositionEnter.current || composing.current || event.nativeEvent.isComposing || event.keyCode === 229)) event.stopPropagation() }}
      onKeyUpCapture={() => { compositionEnter.current = false }}>
      <MessageInput className="stepd-chat-composer" placeholder="어떤 일을 도와드릴까요?" value={editorHtml} autoFocus fancyScroll={false} attachButton={false} sendDisabled={!input.trim() || store.busy} sendOnReturnDisabled={store.busy} onChange={(html, _text, plainText) => {
        const text = plainText.slice(0, 4000)
        lastPlainText.current = text
        setEditorHtml(plainText.length > 4000 ? escapeInput(text) : html)
        onInputChange(text)
      }} onSend={() => { if (!composing.current && !store.busy && input.trim()) onSend() }} />
      <p className={styles.disclaimer}>Enter로 보내기 · Shift+Enter로 줄바꿈<br />UI 목업 · 응답은 예시이며 실제 업무를 실행하지 않습니다.</p>
    </div>
  </div>
}
