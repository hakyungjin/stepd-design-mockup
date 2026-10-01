import { useEffect, useRef, useState } from 'react'

export type Repeat = 'daily' | 'weekdays' | 'weekly' | 'once'
export interface TaskDraft {
  name: string
  instructions: string
  repeat: Repeat
  time: string
  weekday: number
  date: string
  emailNotification: boolean
  sourceThreadId?: string
}
export interface ScheduledTask extends TaskDraft { id: string; enabled: boolean }
export interface TaskRun { id: string; taskId: string; taskName: string; at: string; summary: string }

export const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
export function seoulDate(now = new Date()) { return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) }
export function scheduleLabel(task: TaskDraft) {
  const repeat = task.repeat === 'daily' ? '매일' : task.repeat === 'weekdays' ? '평일' : task.repeat === 'weekly' ? `매주 ${WEEKDAYS[task.weekday]}` : task.date.replaceAll('-', '.')
  return `${repeat} ${task.time}`
}
export function nextRunAt(task: TaskDraft, now = new Date()): Date | null {
  if (task.repeat === 'once') {
    const at = new Date(`${task.date}T${task.time}:00+09:00`)
    return at.getTime() > now.getTime() ? at : null
  }
  const today = seoulDate(now)
  for (let offset = 0; offset < 8; offset++) {
    const local = new Date(`${today}T00:00:00Z`)
    local.setUTCDate(local.getUTCDate() + offset)
    const day = local.getUTCDay()
    if (task.repeat === 'weekly' && day !== task.weekday) continue
    if (task.repeat === 'weekdays' && (day === 0 || day === 6)) continue
    const at = new Date(`${local.toISOString().slice(0, 10)}T${task.time}:00+09:00`)
    if (at.getTime() > now.getTime()) return at
  }
  return null
}
export function nextRunLabel(task: ScheduledTask) {
  if (!task.enabled) return '일시정지'
  const at = nextRunAt(task)
  return at ? at.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '예약 시간 지남'
}

const INITIAL_TASKS: ScheduledTask[] = [
  { id: 'deploy-errors', name: '매일 배포 오류 확인', instructions: '오늘 자동배포 결과에서 발행 실패와 채널 연결 오류를 확인하고, 프로그램별로 필요한 조치를 요약해 주세요.', repeat: 'daily', time: '09:00', weekday: 1, date: '', emailNotification: false, enabled: true },
  { id: 'weekly-report', name: '월요일 성과 요약', instructions: '지난주 프로그램별 영상 성과를 요약하고, 다음 콘텐츠 기획에 참고할 항목을 정리해 주세요.', repeat: 'weekly', time: '10:00', weekday: 1, date: '', emailNotification: false, enabled: true },
]

/** 예약 설정과 수동 실행을 체험하는 목업. 실제 예약 실행은 등록하지 않습니다. */
export function useScheduledTasksMock() {
  const [tasks, setTasks] = useState<ScheduledTask[]>(INITIAL_TASKS)
  const [runs, setRuns] = useState<TaskRun[]>([])
  const [running, setRunning] = useState<string[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])
  const save = (draft: TaskDraft, id?: string) => {
    const cleaned = { ...draft, name: draft.name.trim(), instructions: draft.instructions.trim() }
    const taskId = id ?? crypto.randomUUID()
    setTasks((current) => id ? current.map((task) => task.id === id ? { ...task, ...cleaned } : task) : [...current, { ...cleaned, id: taskId, enabled: true }])
    return taskId
  }
  const run = (task: ScheduledTask) => {
    if (timers.current.has(task.id)) return
    setRunning((current) => [...current, task.id])
    timers.current.set(task.id, setTimeout(() => {
      setRuns((current) => [{ id: crypto.randomUUID(), taskId: task.id, taskName: task.name, at: new Date().toISOString(), summary: `“${task.name}” 실행 흐름을 확인했습니다.\n요청: ${task.instructions}\n\n예시 결과입니다. 실제 데이터 조회나 이메일 발송은 수행하지 않았습니다.` }, ...current].slice(0, 20))
      setRunning((current) => current.filter((id) => id !== task.id))
      timers.current.delete(task.id)
    }, 800))
  }
  const remove = (id: string) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setRunning((current) => current.filter((taskId) => taskId !== id))
    setTasks((current) => current.filter((task) => task.id !== id))
  }
  return { tasks, runs, running, save, run, remove, toggle: (id: string) => setTasks((current) => current.map((task) => task.id === id ? { ...task, enabled: !task.enabled } : task)) }
}
export type ScheduledTasksStore = ReturnType<typeof useScheduledTasksMock>
