/*
 * 상세 모달의 버전 · 댓글 패널.
 * ------------------------------------------------------------------
 * 영상 버전을 골라 보면서 @멘션으로 사람을 불러 이야기합니다.
 * 상태는 MediaPage 가 들고 있고 이 컴포넌트는 그리기만 합니다.
 *
 * TODO(api): GET/POST /media/:id/comments · POST /media/:id/versions
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { MEMBERS, ME, memberOf, splitMentions } from './data'
import type { ClipComment, ClipVersion } from './data'
import styles from './CommentPanel.module.css'

/** 커서 바로 앞에서 입력 중인 @멘션 토큰 */
const mentionToken = (value: string, caret: number) => {
  const upto = value.slice(0, caret)
  const at = upto.lastIndexOf('@')
  if (at < 0) return null
  const query = upto.slice(at + 1)
  // 공백이 끼면 멘션 입력이 끝난 것으로 봅니다
  if (/[\s\n]/.test(query)) return null
  return { at, query }
}

export interface CommentPanelProps {
  highlightedCommentId?: string | null
  versions: ClipVersion[]
  comments: ClipComment[]
  /** 지금 보고 있는 버전 — null 이면 전체 */
  filterV: number | null
  onFilterV: (v: number | null) => void
  onAddComment: (text: string, v: number) => void
  onAddVersion: () => void
  onRestore: (v: number) => void
}

export function CommentPanel({
  highlightedCommentId,
  versions,
  comments,
  filterV,
  onFilterV,
  onAddComment,
  onAddVersion,
  onRestore,
}: CommentPanelProps) {
  const [value, setValue] = useState('')
  const [menu, setMenu] = useState<{ at: number; query: string } | null>(null)
  const [cursor, setCursor] = useState(0)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)

  const current = versions[versions.length - 1]
  const matches = menu
    ? MEMBERS.filter((m) => m.name !== ME && m.name.includes(menu.query))
    : []

  /* 새 댓글이 붙으면 아래로 따라갑니다 */
  useLayoutEffect(() => {
    const el = threadRef.current
    const highlighted = el && [...el.querySelectorAll<HTMLElement>('[data-comment-id]')].find((node) => node.dataset.commentId === highlightedCommentId)
    if (highlighted) { highlighted.scrollIntoView({ block: 'nearest' }); highlighted.focus({ preventScroll: true }) }
    else if (el) el.scrollTop = el.scrollHeight
  }, [comments.length, filterV, highlightedCommentId])

  useEffect(() => {
    setCursor(0)
  }, [menu?.query])

  const insertMention = (name: string) => {
    if (!menu) return
    const el = inputRef.current
    const caret = el?.selectionStart ?? value.length
    const next = `${value.slice(0, menu.at)}@${name} ${value.slice(caret)}`
    setValue(next)
    setMenu(null)
    requestAnimationFrame(() => {
      const pos = menu.at + name.length + 2
      el?.focus()
      el?.setSelectionRange(pos, pos)
    })
  }

  const send = () => {
    const text = value.trim()
    if (!text) return
    onAddComment(text, filterV ?? current.v)
    setValue('')
    setMenu(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (menu && matches.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCursor((c) => (c + 1) % matches.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCursor((c) => (c - 1 + matches.length) % matches.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(matches[cursor].name)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMenu(null)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const shown = filterV == null ? comments : comments.filter((c) => c.v === filterV)

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>버전 · 댓글</span>
        <span className={styles.count}>
          {comments.filter((c) => !c.system).length}개 · 멘션한 사람에게 알림이 갑니다
        </span>
      </div>

      {/* ---------------- 버전 ---------------- */}
      <div className={styles.versions}>
        <div className={styles.versionHead}>
          <span className={styles.versionLabel}>버전 {versions.length}</span>
          <button type="button" className={styles.newVersion} onClick={onAddVersion}>
            + 새 버전 올리기
          </button>
        </div>

        <div className={styles.chips}>
          <button
            type="button"
            className={filterV == null ? styles.chipOn : styles.chip}
            onClick={() => onFilterV(null)}
          >
            전체
          </button>
          {versions.map((v) => (
            <button
              key={v.v}
              type="button"
              className={filterV === v.v ? styles.chipOn : styles.chip}
              onClick={() => onFilterV(v.v)}
            >
              v{v.v}
            </button>
          ))}
        </div>

        {(() => {
          const v = versions.find((x) => x.v === (filterV ?? current.v)) ?? current
          const isCurrent = v.v === current.v
          return (
            <div className={styles.versionRow}>
              <span className={styles.versionCur}>v{v.v}</span>
              <span className={styles.versionNote}>{v.note}</span>
              <span>
                {v.by} · {v.at}
              </span>
              {isCurrent ? (
                <span className={styles.versionCur}>현재</span>
              ) : (
                <button type="button" className={styles.restore} onClick={() => onRestore(v.v)}>
                  이 버전으로
                </button>
              )}
            </div>
          )
        })()}
      </div>

      {/* ---------------- 댓글 ---------------- */}
      <div className={styles.thread} ref={threadRef}>
        {shown.length === 0 && (
          <div className={styles.empty}>
            아직 댓글이 없습니다.
            <br />
            <b>@</b> 로 사람을 부르면 알림이 갑니다.
          </div>
        )}

        {shown.map((c) =>
          c.system ? (
            <div key={c.id} className={styles.system}>
              <span className={styles.systemLine} />
              <span>
                v{c.v} 올림 · {c.by} · {c.at}
              </span>
              <span className={styles.systemLine} />
            </div>
          ) : (
            <div key={c.id} data-comment-id={c.id} tabIndex={-1} className={`${styles.comment} ${c.id === highlightedCommentId ? styles.highlightedComment : ''}`}>
              <span
                className={styles.avatar}
                style={{ background: memberOf(c.by)?.color ?? 'var(--bg-active)' }}
              >
                {c.by.slice(0, 1)}
              </span>
              <div className={styles.body}>
                <div className={styles.byline}>
                  <span className={styles.by}>
                    {c.by}
                    {c.by === ME ? ' (나)' : ''}
                  </span>
                  <span className={styles.at}>{c.at}</span>
                  <span className={styles.ver}>v{c.v}</span>
                </div>
                <div className={styles.text}>
                  {splitMentions(c.text).map((part, i) =>
                    part.mention ? (
                      <span key={i} className={styles.mention}>
                        {part.text}
                      </span>
                    ) : (
                      <span key={i}>{part.text}</span>
                    ),
                  )}
                </div>
              </div>
            </div>
          ),
        )}
      </div>

      {/* ---------------- 입력 ---------------- */}
      <div className={styles.composer}>
        {menu && (
          <div className={styles.menu}>
            {matches.length === 0 ? (
              <div className={styles.menuEmpty}>“{menu.query}” 와 맞는 사람이 없습니다</div>
            ) : (
              matches.map((m, i) => (
                <button
                  key={m.name}
                  type="button"
                  className={i === cursor ? styles.optionOn : styles.option}
                  onMouseEnter={() => setCursor(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertMention(m.name)
                  }}
                >
                  <span className={styles.avatar} style={{ background: m.color }}>
                    {m.name.slice(0, 1)}
                  </span>
                  <span className={styles.optionName}>{m.name}</span>
                  <span className={styles.optionRole}>{m.role}</span>
                </button>
              ))
            )}
          </div>
        )}

        <div className={styles.inputBox}>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={2}
            placeholder={`v${filterV ?? current.v} 에 댓글 남기기 — @ 로 사람 부르기`}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setMenu(mentionToken(e.target.value, e.target.selectionStart ?? 0))
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setMenu(null)}
          />
          <div className={styles.inputFoot}>
            <span className={styles.hint}>Enter 보내기 · Shift+Enter 줄바꿈</span>
            <button type="button" className={styles.send} disabled={!value.trim()} onClick={send}>
              올리기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
