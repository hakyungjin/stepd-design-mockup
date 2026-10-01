import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { memberOf } from '@/features/media/data'
import type { MediaCollaborationStore, MediaMention } from '@/features/media/useMediaCollaborationMock'
import styles from './MentionInbox.module.css'

export function MentionInbox({ store, left, onClose, onOpen }: { store: MediaCollaborationStore; left: number; onClose: () => void; onOpen: (item: MediaMention) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { element?.close() } }, [])
  const items = store.notifications.filter((item) => !unreadOnly || !item.read)
  return createPortal(<dialog ref={dialog} className={styles.inbox} style={{ left: Math.min(left, Math.max(12, window.innerWidth - Math.min(400, window.innerWidth - 88) - 12)) }} aria-labelledby="mention-inbox-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose() } }}>
    <header className={styles.header}><div><h2 id="mention-inbox-title">알림</h2>{store.unread > 0 && <span>{store.unread}</span>}</div><button type="button" aria-label="알림 닫기" onClick={onClose}>×</button></header>
    <div className={styles.toolbar}><div><button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>전체</button><button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>미읽음</button></div><button type="button" disabled={!store.unread} onClick={store.markAllRead}>모두 읽음</button></div>
    <div className={styles.list}>{items.length ? items.map((item) => <button type="button" key={item.id} className={`${styles.item} ${!item.read ? styles.unread : ''}`} onClick={() => { dialog.current?.close(); store.markRead(item.id); onOpen(item); onClose() }}><span className={styles.avatar} style={{ background: memberOf(item.author)?.color }}>{item.author.slice(0, 1)}</span><div><div className={styles.byline}><strong>{item.author}</strong><span>님이 나를 언급했습니다</span>{!item.read && <i aria-label="미읽음" />}</div><p>{item.text}</p><div className={styles.media}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3Z" /></svg><span>{item.title}</span><small>v{item.version}</small></div><small className={styles.time}>{item.program} · {item.at}</small></div></button>) : <div className={styles.empty}><span>✓</span><strong>{unreadOnly ? '모든 알림을 확인했어요' : '새로운 알림이 없습니다'}</strong><p>미디어 댓글에서 나를 @언급하면<br />여기에 알림이 쌓입니다.</p></div>}</div>
    <footer className={styles.footer}>미디어 댓글에서 받은 @언급</footer>
  </dialog>, document.body)
}
