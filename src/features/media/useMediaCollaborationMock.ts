import { useState } from 'react'
import { CLIPS, ME, commentsOf, versionsOf, episodeOf, type MediaClip, type ClipComment, type ClipVersion } from './data'

export interface MediaThread { versions: ClipVersion[]; comments: ClipComment[] }
export interface MediaMention {
  id: string; clipId: string; commentId: string; version: number; title: string; program: string
  author: string; text: string; at: string; read: boolean
}
export interface MediaCommentTarget { clipId: string; commentId: string; version: number }

export function mentionsMe(comment: ClipComment) {
  const mentioned: string[] = comment.text.match(/@[가-힣A-Za-z0-9_]+/g) ?? []
  return !comment.system && comment.by !== ME && mentioned.includes(`@${ME}`)
}
export function mentionOf(clip: MediaClip, comment: ClipComment): MediaMention {
  return { id: `mention-${comment.id}`, clipId: clip.id, commentId: comment.id, version: comment.v, title: clip.title, program: episodeOf(clip.ep).program, author: comment.by, text: comment.text, at: comment.at, read: false }
}

function seedCollaboration() {
  const threads: Record<string, MediaThread> = {}
  const notifications: MediaMention[] = []
  const samples = [
    { by: '김도윤', text: `@${ME} 앞 2초가 늘어져요. 잘라주실 수 있을까요?`, at: '10분 전' },
    { by: '박지훈', text: `@${ME} 최종 자막 확인 부탁드려요. 확인되면 배포하겠습니다.`, at: '35분 전' },
    { by: '이서현', text: `@${ME} 편성 전에 이 버전을 확인해 주세요.`, at: '1시간 전' },
  ]
  CLIPS.filter((clip) => clip.render === 'done').slice(0, 3).forEach((clip, i) => {
    const versions = versionsOf(clip)
    const comment: ClipComment = { id: `${clip.id}-mention-demo`, ...samples[i], v: versions.at(-1)!.v }
    threads[clip.id] = { versions, comments: [...commentsOf(clip), comment] }
    notifications.push(mentionOf(clip, comment))
  })
  return { threads, notifications }
}

/** Shared in-memory comments and mention inbox. No notifications are sent externally. */
export function useMediaCollaborationMock() {
  const [seed] = useState(seedCollaboration)
  const [threads, setThreads] = useState(seed.threads)
  const [notifications, setNotifications] = useState(seed.notifications)
  const addComment = (clip: MediaClip, comment: ClipComment) => {
    setThreads((map) => {
      const thread = map[clip.id] ?? { versions: versionsOf(clip), comments: commentsOf(clip) }
      return { ...map, [clip.id]: { ...thread, comments: [...thread.comments, comment] } }
    })
    if (mentionsMe(comment)) setNotifications((list) => list.some((item) => item.commentId === comment.id) ? list : [mentionOf(clip, comment), ...list])
  }
  return {
    threads, setThreads, notifications, addComment,
    unread: notifications.filter((item) => !item.read).length,
    markRead: (id: string) => setNotifications((list) => list.map((item) => item.id === id ? { ...item, read: true } : item)),
    markAllRead: () => setNotifications((list) => list.map((item) => ({ ...item, read: true }))),
  }
}
export type MediaCollaborationStore = ReturnType<typeof useMediaCollaborationMock>
