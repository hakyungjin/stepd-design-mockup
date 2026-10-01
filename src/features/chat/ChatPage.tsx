import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ScreenKey } from '@/app/screens'
import { NavIcon } from '@/components/ui/NavIcon'
import type { ChatMockStore } from './useChatMock'
import type { ScheduledTask, ScheduledTasksStore } from './useScheduledTasksMock'
import { ScheduledTasksPanel } from './ScheduledTasksPanel'
import { TaskEditor, type TaskEditorState } from './TaskEditor'
import { scheduleLabel } from './useScheduledTasksMock'
import styles from './ChatPage.module.css'
import { ChatSurface } from './ChatSurface'
import type { ChatInputHandle } from './ChatSurface.types'
/* 작업 보드는 결과가 생길 때 처음 불러옵니다 */
const WorkBoard = lazy(() => import('./WorkBoard').then((m) => ({ default: m.WorkBoard })))
import type { ProgramName } from './workspaceMock'

export function ChatPage({ store, tasks, emailAvailable, onNavigate }: { store: ChatMockStore; tasks: ScheduledTasksStore; emailAvailable: boolean; onNavigate: (screen: ScreenKey) => void }) {
  const [input, setInput] = useState('')
  const [mobilePanel, setMobilePanel] = useState<'chat' | 'board'>('chat')
  /** 보여 줄 결과가 있을 때만 작업 보드를 띄웁니다 */
  const hasBoard = !!store.activeVersion?.draft
  const prompt = (text: string) => { setInput(text); setMobilePanel('chat'); requestAnimationFrame(() => inputRef.current?.focus()) }
  const [historyOpen, setHistoryOpen] = useState(() => window.innerWidth > 800)
  const [editor, setEditor] = useState<(TaskEditorState & { sourceMessageId?: string }) | null>(null)
  const [notice, setNotice] = useState('')
  const inputRef = useRef<ChatInputHandle>(null)
  const showingTasks = store.view === 'tasks'
  useEffect(() => { if (!showingTasks) inputRef.current?.focus() }, [showingTasks])
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timer) }, [notice])
  const closeMobileHistory = () => { if (window.innerWidth <= 800) setHistoryOpen(false) }
  const newChat = () => { setMobilePanel('chat'); setInput(''); store.newChat(); closeMobileHistory(); inputRef.current?.focus() }
  const openConversation = (id: string) => { setMobilePanel('chat'); setInput(''); store.select(id); closeMobileHistory() }
  const openTasks = () => { store.openTasks(); closeMobileHistory() }
  const editTask = (task: ScheduledTask) => { store.openTasks(); setEditor({ task }); closeMobileHistory() }
  /** 작업 추가는 채팅으로 — 새 대화를 열고 예시 문장을 넣어 둡니다 */
  const addTaskByChat = () => {
    store.newChat()
    closeMobileHistory()
    setInput('매일 아침 9시에 배포 오류를 정리해 주세요')
    requestAnimationFrame(() => {
      const el = inputRef.current
      el?.focus()
      el?.select()
    })
  }
  const saveConversation = () => {
    if (!store.selected) return
    const instructions = store.selected.messages.filter((message) => message.role === 'user').map((message) => message.text).join('\n\n').slice(0, 4000)
    setEditor({ seed: { name: store.selected.title, instructions, sourceThreadId: store.selected.id } })
  }
  const send = () => {
    if (!input.trim() || store.busy) return
    store.send(input)
    setInput('')
  }
  return <div className={styles.page}>
    <header className={styles.topBar}>
      <div><button type="button" className={styles.iconButton} aria-label={historyOpen ? '채팅 메뉴 접기' : '채팅 메뉴 펼치기'} aria-expanded={historyOpen} aria-controls="chat-workspace-menu" onClick={() => setHistoryOpen(!historyOpen)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg></button><strong>{showingTasks ? '예약 작업' : 'STEP D AI 에이전트'}</strong></div>
      {showingTasks ? <button type="button" className={styles.newTop} onClick={() => onNavigate('settings')} aria-label="플러그인 관리"><NavIcon screen="settings" size={14} /> 플러그인 관리</button> : store.selected && <button type="button" className={styles.newTop} onClick={saveConversation} disabled={store.busy} aria-label="예약 작업으로 저장"><NavIcon screen="schedule" size={14} /> 예약 작업으로 저장</button>}
    </header>
    {!showingTasks && <div className={styles.mobilePanels} aria-label="에이전트 화면"><button type="button" aria-pressed={mobilePanel === 'chat'} onClick={() => setMobilePanel('chat')}>대화</button>{hasBoard && <button type="button" aria-pressed={mobilePanel === 'board'} onClick={() => setMobilePanel('board')}>작업 보드<span>1</span></button>}</div>}
    <div className={styles.workspace}>
      {historyOpen && <>
        <button type="button" className={styles.mobileScrim} aria-label="채팅 메뉴 닫기" onClick={() => setHistoryOpen(false)} />
        <aside id="chat-workspace-menu" className={styles.history} aria-label="채팅과 예약 작업">
          <button type="button" className={styles.newChat} onClick={newChat}>＋ 새 채팅</button>
          <button type="button" className={styles.workspaceLink} aria-current={showingTasks ? 'page' : undefined} onClick={openTasks}><NavIcon screen="schedule" size={16} /><span>예약 작업</span><small>{tasks.tasks.length}</small></button>
          <div className={styles.historyHead}>최근 대화 <span>{store.threads.length}</span></div>
          {store.threads.length ? store.threads.map((thread) => <div className={styles.threadRow} key={thread.id}><button type="button" className={styles.thread} aria-current={!showingTasks && store.selectedId === thread.id ? 'true' : undefined} onClick={() => openConversation(thread.id)} title={thread.title}><NavIcon screen="chat" size={14} /><span>{thread.title}</span></button><button type="button" className={styles.deleteThread} aria-label={`${thread.title} 대화 삭제`} onClick={() => store.remove(thread.id)}>×</button></div>) : <p className={styles.emptyHistory}>새 채팅을 시작하면<br />여기에 대화가 쌓입니다.</p>}
          <div className={styles.historyHead}>저장한 작업 <span>{tasks.tasks.length}</span></div>
          {tasks.tasks.map((task) => <button key={task.id} type="button" className={`${styles.thread} ${styles.taskThread}`} onClick={() => editTask(task)} title={task.name}><span className={task.enabled ? styles.taskDot : styles.taskDotPaused} aria-label={task.enabled ? '사용 중' : '일시정지'} /><span>{task.name}</span></button>)}
          <button type="button" className={styles.addTask} onClick={addTaskByChat}>＋ 채팅으로 작업 추가</button>
        </aside>
      </>}
      {showingTasks ? <ScheduledTasksPanel store={tasks} threads={store.threads} emailAvailable={emailAvailable} onCreate={addTaskByChat} onEdit={editTask} onOpenConversation={openConversation} /> : <div className={styles.agentSpace} data-panel={mobilePanel}><div className={styles.conversationPane}><div className={styles.contextBar}><label><span>프로그램</span><select aria-label="대화할 프로그램" value={store.program} disabled={store.busy} onChange={(e) => { store.changeProgram(e.target.value as ProgramName); setInput(''); setMobilePanel('chat') }}><option>나는 SOLO</option><option>나미브</option></select></label><span>전체 회차 · 분석 완료</span></div><ChatSurface onRevealBoard={() => setMobilePanel('board')} store={store} input={input} onInputChange={setInput} onSend={send} inputRef={inputRef} renderTaskSuggestion={(message) => <TaskSuggestion message={{ ...message, createdTaskId: tasks.tasks.some((task) => task.id === message.createdTaskId) ? message.createdTaskId : undefined }} onCreate={() => {
        const id = tasks.save({ ...message.suggestion!, sourceThreadId: store.selectedId ?? undefined })
        store.markCreated(message.id, id)
        setNotice('예약 작업을 추가했습니다.')
      }} onAdjust={() => setEditor({ seed: { ...message.suggestion, sourceThreadId: store.selectedId ?? undefined }, sourceMessageId: message.id })} onOpenTasks={openTasks} />} /></div>{hasBoard && <Suspense fallback={null}><WorkBoard store={store} onPrompt={prompt} /></Suspense>}</div>}
    </div>
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    {editor && <TaskEditor {...editor} emailAvailable={emailAvailable} onClose={() => setEditor(null)} onPlugins={() => onNavigate('settings')} onSave={(draft) => { const taskId = tasks.save(draft, editor.task?.id); if (editor.sourceMessageId) store.markCreated(editor.sourceMessageId, taskId); setEditor(null); store.openTasks(); closeMobileHistory(); setNotice(editor.task ? '예약 작업 설정을 저장했습니다.' : '예약 작업을 추가했습니다.') }} />}
  </div>
}

/** 채팅 안에서 바로 예약 작업을 만드는 카드 */
function TaskSuggestion({ message, onCreate, onAdjust, onOpenTasks }: { message: { suggestion?: import('./useScheduledTasksMock').TaskDraft; createdTaskId?: string }; onCreate: () => void; onAdjust: () => void; onOpenTasks: () => void }) {
  const draft = message.suggestion
  if (!draft) return null
  const created = !!message.createdTaskId
  return (
    <div className={styles.taskCard}>
      <div className={styles.taskCardHead}>
        <NavIcon screen="schedule" size={16} />
        <strong>{draft.name}</strong>
        {created && <span className={styles.taskCardDone}>예약됨</span>}
      </div>
      <dl className={styles.taskCardMeta}>
        <div><dt>실행</dt><dd>{scheduleLabel(draft)} · 한국 시간</dd></div>
        <div><dt>요청</dt><dd>{draft.instructions}</dd></div>
      </dl>
      <div className={styles.taskCardActions}>
        {created ? (
          <button type="button" onClick={onOpenTasks}>예약 작업에서 보기</button>
        ) : (
          <>
            <button type="button" className={styles.taskCardPrimary} onClick={onCreate}>이대로 예약</button>
            <button type="button" onClick={onAdjust}>시간·이름 고치기</button>
          </>
        )}
      </div>
    </div>
  )
}
