import { useState } from 'react'
import { NavIcon } from '@/components/ui/NavIcon'
import { nextRunLabel, scheduleLabel, type ScheduledTask, type ScheduledTasksStore } from './useScheduledTasksMock'
import type { ChatThread } from './useChatMock'
import styles from './ScheduledTasks.module.css'

export function ScheduledTasksPanel({ store, threads, emailAvailable, onCreate, onEdit, onOpenConversation }: { store: ScheduledTasksStore; threads: ChatThread[]; emailAvailable: boolean; onCreate: () => void; onEdit: (task: ScheduledTask) => void; onOpenConversation: (id: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'enabled' | 'paused'>('all')
  const visible = store.tasks.filter((task) => filter === 'all' || (filter === 'enabled' ? task.enabled : !task.enabled))
  return <main className={styles.panel}>
    <div className={styles.heading}><div><h1>예약 작업</h1><p>반복할 요청을 저장하고, 정해진 시간에 실행하도록 설정하세요.</p></div><button type="button" className={styles.primary} onClick={onCreate}>＋ 대화로 작업 추가</button></div>
    <div className={styles.toolbar}><div aria-label="예약 작업 필터">{([{ key: 'all', label: '전체' }, { key: 'enabled', label: '사용 중' }, { key: 'paused', label: '일시정지' }] as const).map(({ key, label }) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><span>한국 시간 · KST</span></div>
    <div className={styles.taskList}>
      <div className={styles.listHead}><span>작업</span><span>다음 실행</span><span>관리</span></div>
      {visible.map((task) => {
        const busy = store.running.includes(task.id)
        const source = task.sourceThreadId && threads.some((thread) => thread.id === task.sourceThreadId)
        return <article key={task.id} className={styles.taskRow}>
          <div className={styles.taskInfo}><span className={styles.taskIcon}><NavIcon screen="schedule" size={19} /></span><div><button type="button" className={styles.taskTitle} onClick={() => onEdit(task)} disabled={busy}>{task.name}</button><p>{scheduleLabel(task)}{task.emailNotification && emailAvailable && <span> · 이메일 알림</span>}</p>{source && <button type="button" className={styles.source} onClick={() => onOpenConversation(task.sourceThreadId!)}>원본 대화 보기</button>}</div></div>
          <div className={styles.nextRun}><span className={task.enabled ? styles.enabled : styles.paused}>{task.enabled ? '● 사용 중' : 'Ⅱ 일시정지'}</span><time>{nextRunLabel(task)}</time></div>
          <div className={styles.actions}><button type="button" role="switch" aria-label={`${task.name} 예약 실행`} aria-checked={task.enabled} className={styles.switch} disabled={busy} onClick={() => store.toggle(task.id)}><span /></button><button type="button" disabled={busy} onClick={() => store.run(task)}>{busy ? '실행 중…' : '▷ 지금 실행'}</button><button type="button" disabled={busy} onClick={() => onEdit(task)}>설정</button><button type="button" className={styles.delete} disabled={busy} aria-label={`${task.name} 예약 작업 삭제`} onClick={() => store.remove(task.id)}>삭제</button></div>
        </article>
      })}
      {!visible.length && <div className={styles.empty}><NavIcon screen="schedule" size={24} /><h2>{filter === 'all' ? '예약 작업을 추가해 보세요' : '해당 상태의 작업이 없습니다'}</h2><p>에이전트에게 “매일 아침 9시에 …” 처럼 적으면 예약 작업을 바로 만들어 드립니다.</p></div>}
    </div>
    <section className={styles.activity} aria-labelledby="task-activity"><div className={styles.activityHead}><h2 id="task-activity">실행 이력</h2><span>{store.runs.length}건</span></div>{store.runs.length ? <div aria-live="polite">{store.runs.map((run) => <details className={styles.runRow} key={run.id}><summary><span className={styles.check}>✓</span><strong>{run.taskName}</strong><time>{new Date(run.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</time><span className={styles.runStatus}>완료</span><span className={styles.expand}>⌄</span></summary><p className={styles.runResult}>{run.summary}</p></details>)}</div> : <div className={styles.emptyActivity}><p>아직 실행 이력이 없습니다.</p><small>‘지금 실행’을 누르면 결과를 확인할 수 있습니다.</small></div>}</section>
    <p className={styles.footnote}>UI 목업 · 예약 설정과 실행 흐름을 확인할 수 있습니다. 실제 예약 실행이나 이메일 발송은 수행하지 않습니다.</p>
  </main>
}
