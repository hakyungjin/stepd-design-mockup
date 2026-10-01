import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Message, MessageInput, MessageList, TypingIndicator } from '@chatscope/chat-ui-kit-react'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import { CHAT_SUGGESTIONS, type ChatSurfaceProps } from '@/features/chat/ChatSurface.types'
import styles from '@/features/chat/ChatPage.module.css'
import './chatscope.module.css'
import { FOLLOW_UPS, WORK_LABELS } from './workspaceMock'

function escapeInput(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('\n', '<br>')
}

/** Message rendering, scrolling and composition use Chatscope's React components. */
export function ChatSurface({ store, input, onInputChange, onSend, inputRef, renderTaskSuggestion, onRevealBoard }: ChatSurfaceProps) {
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
    element?.setAttribute('aria-label', '에이전트에게 보낼 메시지')
    element?.setAttribute('aria-multiline', 'true')
    const sendButton = composerRef.current?.querySelector<HTMLButtonElement>('.cs-button--send')
    sendButton?.setAttribute('aria-label', '메시지 보내기')
  }, [])

  return <div className={`${styles.chat} stepd-chat-kit`}>
    {!store.selected ? <div className={styles.messages}><div className={styles.welcome}><span className={styles.welcomeIcon}>✦</span><h1>어떤 영상을 만들까요?</h1><p>장면을 찾는 순간부터 배포 계획까지,<br />대화로 함께 만들어 보세요.</p><div className={styles.suggestions}>{CHAT_SUGGESTIONS.map((suggestion) => <button type="button" key={suggestion.name} onClick={() => { onInputChange(suggestion.text.replace('나는 SOLO', store.program)); inputRef.current?.focus() }}><strong>{suggestion.name}<i>↗</i></strong><span>{suggestion.text}</span></button>)}</div></div></div> :
      <MessageList key={store.selected.id} className="stepd-chat-messages" autoScrollToBottom autoScrollToBottomOnMount scrollBehavior="auto" role="log" aria-label="대화 내용" aria-live="polite" typingIndicator={store.busy ? <TypingIndicator content="답변을 작성하고 있습니다…" /> : undefined}>
        {store.selected.messages.map((message) => <Message key={message.id} model={{ direction: message.role === 'user' ? 'outgoing' : 'incoming', position: 'single', sender: message.role === 'user' ? '나' : 'STEP D', type: 'custom' }}>
          <Message.CustomContent>{message.role === 'assistant' && <small className={styles.sampleLabel}><span>✦</span> STEP D</small>}<p className="stepd-message-text">{message.text}</p>{message.work && <button type="button" className={styles.workCard} disabled={store.busy} onClick={() => { store.selectVersion(message.work!.versionId); onRevealBoard() }}><span className={styles.workCardIcon}>{message.work.kind === 'deploy' ? '▦' : message.work.kind === 'search' ? '⌕' : '▤'}</span><div><small>{WORK_LABELS[message.work.kind]} · 버전 {store.selected!.versions.findIndex((v) => v.id === message.work!.versionId) + 1}</small><strong>{message.work.title}</strong><span>작업 보드에서 확인</span></div><span>↗</span></button>}{message.suggestion && renderTaskSuggestion(message)}</Message.CustomContent>
        </Message>)}
      </MessageList>}
    <div ref={composerRef} className={styles.composerWrap}
      onCompositionStartCapture={() => { composing.current = true }}
      onCompositionEndCapture={() => {
        composing.current = false
        // 조합이 끝난 뒤 화면 내용을 한 번만 반영합니다
        const element = editor()
        if (element) { lastPlainText.current = element.innerText; setEditorHtml(element.innerHTML) }
      }}
      onKeyDownCapture={(event) => { compositionEnter.current = event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) }}
      onKeyPressCapture={(event) => { if (event.key === 'Enter' && (compositionEnter.current || composing.current || event.nativeEvent.isComposing || event.keyCode === 229)) event.stopPropagation() }}
      onKeyUpCapture={() => { compositionEnter.current = false }}>
      <MessageInput className="stepd-chat-composer" placeholder="영상·채널·배포에 대해 요청하세요" value={editorHtml} autoFocus fancyScroll={false} attachButton={false} sendDisabled={!input.trim() || store.busy} sendOnReturnDisabled={store.busy} onChange={(html, _text, plainText) => {
        const text = plainText.slice(0, 4000)
        lastPlainText.current = text
        // 한글 조합 중에 innerHTML 을 되돌려 넣으면 커서가 맨 앞으로 튑니다
        if (!composing.current) setEditorHtml(plainText.length > 4000 ? escapeInput(text) : html)
        onInputChange(text)
      }} onSend={() => { if (!composing.current && !store.busy && input.trim()) onSend() }} />
      {store.selected && store.activeVersion && <div className={styles.followUps}>{FOLLOW_UPS[store.activeVersion.draft.kind].map((text) => <button type="button" key={text} disabled={store.busy} onClick={() => { onInputChange(text); inputRef.current?.focus() }}>{text}</button>)}</div>}
      <p className={styles.disclaimer}>목업 · 실제 영상 제작과 채널 변경·배포는 실행되지 않습니다.</p>
    </div>
  </div>
}
