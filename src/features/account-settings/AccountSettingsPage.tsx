import { useEffect, useRef, useState } from 'react'
import { PLUGINS } from './data'
import { EmailNotificationDialog } from './EmailNotificationDialog'
import { ServiceIcon } from './ServiceIcon'
import type { AccountSettingsStore } from './useAccountSettings'
import styles from './AccountSettingsPage.module.css'

export function AccountSettingsPage({ store }: { store: AccountSettingsStore }) {
  const [installedOnly, setInstalledOnly] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current) }, [])
  const say = (message: string) => {
    setNotice(message)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 3500)
  }
  const plugins = PLUGINS.filter((plugin) => !installedOnly || (plugin.id === 'email' && store.emailInstalled))

  return <div className={styles.page}>
    <header className={styles.pageHead}>
      <div><h1>설정</h1><p>내 작업에 필요한 서비스를 연결하세요.</p></div>
    </header>
    <section aria-label="플러그인">
      <div className={styles.sectionHead}><h2>플러그인</h2><span>내 계정에 적용</span></div>
      {/* 연결할 서비스가 두 개뿐이라 검색·분류는 두지 않습니다 */}
      <div className={styles.filters}>
        <div className={styles.filterTabs}>
          <button type="button" aria-pressed={!installedOnly} onClick={() => setInstalledOnly(false)}>전체</button>
          <button type="button" aria-pressed={installedOnly} onClick={() => setInstalledOnly(true)}>내 플러그인 <span>{store.emailInstalled ? 1 : 0}</span></button>
        </div>
      </div>
      <div className={styles.pluginList}>{plugins.map((plugin) => {
        const installed = plugin.id === 'email' && store.emailInstalled
        return <article key={plugin.id} className={styles.plugin}>
          <div className={styles.pluginRow}>
            <span className={styles.pluginIcon}><ServiceIcon icon={plugin.icon} /></span>
            <div className={styles.pluginDetails}>
              <div className={styles.pluginTitle}><h3>{plugin.name}</h3>{installed && <span className={styles.connected}>추가됨</span>}</div>
              <p className={styles.description}>{installed ? store.emailNotifications.email || 'Gmail 주소를 등록하세요.' : plugin.description}</p>
              {installed && <small className={styles.events}>{[store.emailNotifications.completed && '배포 완료', store.emailNotifications.failed && '배포 오류'].filter(Boolean).join(' · ') || '선택한 알림 없음'}</small>}
            </div>
            <div className={styles.actions}>
              {installed ? <>
                <label className={styles.enable}><input type="checkbox" role="switch" aria-label="Gmail 알림 사용" checked={store.emailNotifications.enabled} onChange={() => { store.toggleEmailNotifications(); say(store.emailNotifications.enabled ? 'Gmail 알림을 껐습니다.' : 'Gmail 알림을 켰습니다.') }} /></label>
                <button type="button" className={styles.configure} onClick={() => setEmailOpen(true)}>설정</button>
                <button type="button" className={styles.remove} aria-label="Gmail 플러그인 제거" onClick={() => setRemoving(true)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" /></svg></button>
              </> : <button type="button" className={plugin.available ? styles.add : styles.coming} disabled={!plugin.available} onClick={() => setEmailOpen(true)}>{plugin.available ? '추가' : '준비 중'}</button>}
            </div>
          </div>
          {installed && removing && <div className={styles.removeConfirm} role="group" aria-label="Gmail 플러그인 제거 확인"><span>Gmail 알림을 제거할까요?</span><div><button type="button" onClick={() => setRemoving(false)}>취소</button><button type="button" onClick={() => { store.removeEmailPlugin(); setRemoving(false); say('Gmail 플러그인을 제거했습니다.') }}>제거</button></div></div>}
        </article>
      })}</div>
      {!plugins.length && <div className={styles.empty}><h3>추가한 플러그인이 없습니다.</h3><button type="button" className={styles.configure} onClick={() => setInstalledOnly(false)}>전체 보기</button></div>}
      <p className={styles.footnote}>목업 화면 · 실제 서비스 연결과 알림 발송은 실행되지 않습니다.</p>
    </section>
    {emailOpen && <EmailNotificationDialog preferences={store.emailNotifications} onClose={() => setEmailOpen(false)} onSave={(preferences) => { const installed = store.emailInstalled; store.saveEmailNotifications(preferences); say(installed ? 'Gmail 알림 설정을 저장했습니다.' : 'Gmail 플러그인을 추가했습니다.') }} />}
    {notice && <div className={styles.toast} role="status">{notice}</div>}
  </div>
}
