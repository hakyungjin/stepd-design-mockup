import { useEffect, useRef, useState } from 'react'
import { nextRunAt, scheduleLabel, seoulDate, WEEKDAYS, type Repeat, type ScheduledTask, type TaskDraft } from './useScheduledTasksMock'
import styles from './ScheduledTasks.module.css'

export interface TaskEditorState { task?: ScheduledTask; seed?: Partial<TaskDraft> }
export function TaskEditor({ task, seed, emailAvailable, onSave, onClose, onPlugins }: TaskEditorState & { emailAvailable: boolean; onSave: (draft: TaskDraft) => void; onClose: () => void; onPlugins: () => void }) {
  const [draft, setDraft] = useState<TaskDraft>(() => ({ name: '', instructions: '', repeat: 'daily', time: '09:00', weekday: 1, date: seoulDate(new Date(Date.now() + 86400000)), emailNotification: false, ...seed, ...task }))
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="task-editor-title" onCancel={(e) => { e.preventDefault(); onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => {
      e.preventDefault()
      if (!draft.name.trim() || !draft.instructions.trim()) { setError('작업 이름과 요청 내용을 입력해 주세요.'); return }
      if (draft.repeat === 'once' && !nextRunAt(draft)) { setError('앞으로 실행할 날짜와 시간을 선택해 주세요.'); return }
      onSave({ ...draft, emailNotification: emailAvailable && draft.emailNotification })
    }}>
      <div className={styles.dialogHead}><div><h2 id="task-editor-title">{task ? '예약 작업 설정' : '예약 작업 추가'}</h2><p>반복할 요청과 실행 시간을 정해 주세요.</p></div><button type="button" aria-label="예약 작업 설정 닫기" onClick={onClose}>×</button></div>
      <div className={styles.fields}>
        <label>작업 이름<input autoFocus required maxLength={60} placeholder="예: 매일 배포 오류 확인" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>요청 내용<textarea required rows={4} maxLength={4000} placeholder="어떤 일을 처리하고 어떤 결과를 받을지 적어주세요." value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} /></label>
        <fieldset className={styles.scheduleFields}><legend>실행 일정 <span>한국 시간 · KST</span></legend><div>
          <label>반복<select value={draft.repeat} onChange={(e) => { setDraft({ ...draft, repeat: e.target.value as Repeat }); setError('') }}><option value="daily">매일</option><option value="weekdays">평일 (월–금)</option><option value="weekly">매주</option><option value="once">한 번만</option></select></label>
          {draft.repeat === 'weekly' && <label>요일<select value={draft.weekday} onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>}
          {draft.repeat === 'once' && <label>날짜<input type="date" required min={seoulDate()} value={draft.date} onChange={(e) => { setDraft({ ...draft, date: e.target.value }); setError('') }} /></label>}
          <label>시간<input type="time" required value={draft.time} onChange={(e) => { setDraft({ ...draft, time: e.target.value }); setError('') }} /></label>
        </div><p>{scheduleLabel(draft)}에 실행하도록 설정됩니다.</p></fieldset>
        <fieldset className={styles.notification}><legend>결과 알림</legend><label><input type="checkbox" checked={emailAvailable && draft.emailNotification} disabled={!emailAvailable} onChange={(e) => setDraft({ ...draft, emailNotification: e.target.checked })} /><span><strong>이메일로 알림 받기</strong><small>{emailAvailable ? '계정에 등록한 이메일로 결과 알림을 받습니다.' : '이메일 알림 플러그인을 연결하거나 켜면 사용할 수 있습니다.'}</small></span></label>{!emailAvailable && <button type="button" onClick={onPlugins}>플러그인 설정</button>}</fieldset>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      <div className={styles.dialogFoot}><button type="button" onClick={onClose}>취소</button><button type="submit" className={styles.primary}>{task ? '설정 저장' : '예약 작업 저장'}</button></div>
    </form>
  </dialog>
}
