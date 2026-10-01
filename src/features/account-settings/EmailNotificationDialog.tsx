import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ACCOUNT } from './data'
import type { EmailNotificationPreferences } from './types'
import styles from './emailNotifications.module.css'

export function EmailNotificationDialog({ preferences, onSave, onClose }: { preferences: EmailNotificationPreferences; onSave: (preferences: EmailNotificationPreferences) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(() => ({ ...preferences }))
  const [preview, setPreview] = useState<'completed' | 'failed'>('failed')
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const program = '나미브'

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key !== 'Tab') return
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')
      if (!controls?.length) return
      const first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [])

  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (draft.enabled && !draft.completed && !draft.failed) {
      setError('받을 알림을 하나 이상 선택하세요.')
      return
    }
    onSave({ ...draft, email: draft.email.trim() })
    onClose()
  }

  return <div className={styles.scrim} onClick={onClose}>
    <div className={styles.dialog} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="email-notifications-title" onClick={(e) => e.stopPropagation()}>
      <div className={styles.header}>
        <div><h2 id="email-notifications-title">이메일 알림</h2><p>자동배포 결과와 확인이 필요한 오류를 메일로 받아보세요.</p></div>
        <button type="button" className={styles.close} aria-label="이메일 알림 닫기" onClick={onClose}>×</button>
      </div>
      <form onSubmit={save}>
        <div className={styles.content}>
          <div className={styles.settings}>
            <div className={styles.account}><span className={styles.avatar}>{ACCOUNT.name.slice(0, 1)}</span><div><strong>{ACCOUNT.name}</strong><span>{ACCOUNT.organization} · 내 계정</span></div><span className={styles.scope}>계정별 설정</span></div>
            <label className={styles.master}><span><strong>이메일 알림 받기</strong><small>내 계정의 모든 자동배포에 적용됩니다.</small></span><input type="checkbox" role="switch" checked={draft.enabled} onChange={(e) => { setDraft({ ...draft, enabled: e.target.checked }); setError('') }} /></label>
            <div className={styles.emailField}><label htmlFor="notification-email">알림 받을 이메일</label><input id="notification-email" type="email" placeholder="name@gmail.com" autoComplete="email" maxLength={254} value={draft.email} required={draft.enabled} disabled={!draft.enabled} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /><p>등록한 주소로 선택한 알림을 받습니다.</p></div>
            <fieldset className={styles.events} disabled={!draft.enabled}><legend>받을 알림</legend>
              <label className={styles.event}><input type="checkbox" checked={draft.completed} onChange={(e) => { setDraft({ ...draft, completed: e.target.checked }); setError('') }} /><span><strong>배포 완료</strong><small>영상 발행이 완료되면 결과와 게시물 링크를 받습니다.</small></span></label>
              <label className={styles.event}><input type="checkbox" checked={draft.failed} onChange={(e) => { setDraft({ ...draft, failed: e.target.checked }); setError('') }} /><span><strong>배포 오류</strong><small>발행 실패, 렌더 오류, 채널 연결 문제를 알려드립니다.</small></span></label>
            </fieldset>
            {error && <p className={styles.error} role="alert">{error}</p>}
          </div>
          <aside className={styles.preview} aria-label="알림 이메일 미리보기">
            <div className={styles.previewHead}><strong>메일 미리보기</strong><span>예시</span></div>
            <div className={styles.previewTabs}><button type="button" aria-pressed={preview === 'completed'} onClick={() => setPreview('completed')}>배포 완료</button><button type="button" aria-pressed={preview === 'failed'} onClick={() => setPreview('failed')}>배포 오류</button></div>
            <div className={styles.mail}>
              <div className={styles.mailEnvelope}><strong>[STEP D] {program} {preview === 'completed' ? '배포가 완료되었습니다' : '배포에 확인이 필요합니다'}</strong><div><span className={styles.senderAvatar}>D</span><span><b>STEP D 자동배포</b><small>받는 사람: {draft.email.trim() || '등록한 이메일'}</small></span></div></div>
              <div className={styles.mailBody}><span className={styles.mailBrand}>STEP D</span><h3>{preview === 'completed' ? '영상이 발행되었습니다.' : '발행하지 못한 영상이 있습니다.'}</h3><p>{preview === 'completed' ? '편성한 영상이 채널에 발행되었습니다. 아래에서 결과를 확인하세요.' : '채널 연결이 만료되어 발행이 멈췄습니다. 채널을 다시 연결해 주세요.'}</p><dl><div><dt>프로그램</dt><dd>{program}</dd></div><div><dt>영상</dt><dd>앵콜 무대 시작합니다</dd></div><div><dt>배포 채널</dt><dd>{preview === 'completed' ? 'YouTube · 나미브 공식' : '네이버 클립 · ENA DRAMA'}</dd></div><div><dt>발행 시각</dt><dd>9월 30일 12:30</dd></div></dl><span className={styles.mailAction}>{preview === 'completed' ? '발행된 영상 확인' : '채널 다시 연결'}</span><small className={styles.mailFoot}>이 메일은 STEP D 이메일 알림 설정에 따라 발송됩니다.</small></div>
            </div>
          </aside>
        </div>
        <div className={styles.footer}><span>UI 목업 · 실제 이메일은 발송되지 않습니다.</span><div><button type="button" className={styles.cancel} onClick={onClose}>취소</button><button type="submit" className={styles.save}>알림 설정 저장</button></div></div>
      </form>
    </div>
  </div>
}
