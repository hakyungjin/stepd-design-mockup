import { useEffect, useRef, useState } from 'react'
import { parseSchedule } from './parseSchedule'
import type { TaskDraft } from './useScheduledTasksMock'
import { createWorkReply, makeDraft, makeVersion, type ProgramName, type WorkDraft, type WorkVersion, type WorkKind } from './workspaceMock'

export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; text: string
  suggestion?: TaskDraft; createdTaskId?: string
  work?: { title: string; kind: WorkKind; versionId: string }
}
export interface ChatThread {
  id: string; title: string; messages: ChatMessage[]; program: ProgramName
  versions: WorkVersion[]; selectedVersionId?: string
}

function demoThread(): ChatThread {
  const original = makeDraft('highlight')
  original.deployment = { days: ['금'], time: '18:00', start: '2026-10-02', count: 1, platform: 'YouTube' }
  const v1 = makeVersion(original, '첫 구성안 · 6개 장면')
  const updated = createWorkReply('갈등 장면은 빼고 첫 데이트를 더 넣어줘', '나는 SOLO', original)!
  const v2 = makeVersion(updated.draft, updated.label)
  return {
    id: 'demo-highlight', title: '영호 · 영숙 만남 과정 하이라이트', program: '나는 SOLO', versions: [v1, v2], selectedVersionId: v2.id,
    messages: [
      { id: 'demo-1', role: 'user', text: '영호 · 영숙 첫 만남부터 최종 선택까지 8분 하이라이트 만들고, 금요일 6시에 올려줘.' },
      { id: 'demo-2', role: 'assistant', text: '12개 회차를 분석해 8분 하이라이트 구성안을 만들었어요. 금요일 18:00 YouTube 배포 계획도 준비했어요.\n\n오른쪽에서 확인하고, 바꾸고 싶은 장면을 알려 주세요.', work: { title: original.title, kind: 'highlight', versionId: v1.id } },
      { id: 'demo-3', role: 'user', text: '갈등 장면은 빼고 첫 데이트를 더 넣어줘.' },
      { id: 'demo-4', role: 'assistant', text: updated.text, work: { title: original.title, kind: 'highlight', versionId: v2.id } },
    ],
  }
}

export function useChatMock() {
  const [threads, setThreads] = useState<ChatThread[]>(() => [demoThread()])
  const [selectedId, setSelectedId] = useState<string | null>('demo-highlight')
  const [program, setProgram] = useState<ProgramName>('나는 SOLO')
  const [pending, setPending] = useState<string[]>([])
  const [view, setView] = useState<'conversation' | 'tasks'>('conversation')
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])
  const selected = threads.find((t) => t.id === selectedId) ?? null
  const activeVersion = selected?.versions.find((v) => v.id === selected.selectedVersionId) ?? selected?.versions.at(-1)
  const busy = selectedId ? pending.includes(selectedId) : false
  const send = (raw: string) => {
    const text = raw.trim()
    if (!text || busy) return
    const id = selectedId ?? crypto.randomUUID()
    const context = selected?.program ?? program
    const workReply = createWorkReply(text, context, activeVersion?.draft)
    const suggestion = workReply ? null : parseSchedule(text)
    const message: ChatMessage = { id: crypto.randomUUID(), role: 'user', text }
    setThreads((list) => list.some((t) => t.id === id) ? list.map((t) => t.id === id ? { ...t, messages: [...t.messages, message] } : t) : [{ id, title: text.slice(0, 28), messages: [message], program: context, versions: [] }, ...list])
    setSelectedId(id)
    setPending((list) => [...list, id])
    timers.current.set(id, setTimeout(() => {
      const version = workReply ? makeVersion(workReply.draft, workReply.label) : null
      const reply: ChatMessage = {
        id: crypto.randomUUID(), role: 'assistant',
        text: workReply?.text ?? (suggestion ? '이 요청을 예약 작업으로 만들까요? 아래 내용을 확인하고 저장해 주세요.' : '영상 검색, 편집, 하이라이트 구성, 채널 설정, 배포 계획을 함께 준비할 수 있어요. 프로그램과 원하는 결과를 알려 주세요. 예를 들어 “영호가 화내는 장면 찾아줘”라고 요청해 보세요.'),
        ...(suggestion ? { suggestion } : {}),
        ...(version ? { work: { title: version.draft.title, kind: version.draft.kind, versionId: version.id } } : {}),
      }
      setThreads((list) => list.map((t) => t.id === id ? { ...t, messages: [...t.messages, reply], ...(version ? { program: version.draft.program, versions: [...t.versions, version], selectedVersionId: version.id } : {}) } : t))
      setPending((list) => list.filter((x) => x !== id))
      timers.current.delete(id)
    }, 650))
  }
  const remove = (id: string) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setPending((list) => list.filter((x) => x !== id))
    setThreads((list) => list.filter((t) => t.id !== id))
    if (selectedId === id) setSelectedId(null)
  }
  const markCreated = (messageId: string, taskId: string) => setThreads((list) => list.map((t) => ({ ...t, messages: t.messages.map((m) => m.id === messageId ? { ...m, createdTaskId: taskId } : m) })))
  const selectVersion = (versionId: string) => setThreads((list) => list.map((t) => t.id === selectedId && t.versions.some((v) => v.id === versionId) ? { ...t, selectedVersionId: versionId } : t))
  const revise = (update: (draft: WorkDraft) => WorkDraft, label: string, reply?: string) => {
    if (busy) return
    setThreads((list) => list.map((thread) => {
      if (thread.id !== selectedId) return thread
      const base = thread.versions.find((v) => v.id === thread.selectedVersionId) ?? thread.versions.at(-1)
      if (!base) return thread
      const version = makeVersion(update({ ...base.draft, approved: false }), label)
      const message: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', text: reply ?? label + ' 내용을 새 버전에 반영했어요. 작업 보드에서 확인해 주세요.', work: { title: version.draft.title, kind: version.draft.kind, versionId: version.id } }
      return { ...thread, versions: [...thread.versions, version], selectedVersionId: version.id, messages: [...thread.messages, message] }
    }))
  }
  const newChat = () => { setProgram(selected?.program ?? program); setSelectedId(null); setView('conversation') }
  return {
    threads, selectedId, selected, view, program: selected?.program ?? program, activeVersion, busy, send, remove, markCreated, revise, selectVersion,
    openTasks: () => setView('tasks'), select: (id: string) => { setSelectedId(id); setView('conversation') }, newChat,
    changeProgram: (value: ProgramName) => { setProgram(value); setSelectedId(null); setView('conversation') },
    approve: () => revise((d) => ({ ...d, approved: true }), '검토 후 승인', '검토 후 승인했어요. 이 목업에서는 승인 상태만 저장하며, 실제 제작이나 채널 변경·배포는 실행하지 않아요.'),
  }
}
export type ChatMockStore = ReturnType<typeof useChatMock>
