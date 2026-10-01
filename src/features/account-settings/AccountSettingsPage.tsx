import { useEffect, useRef, useState } from 'react'
import { ACCOUNT, PLUGINS } from './data'
import { EmailNotificationDialog } from './EmailNotificationDialog'
import type { AccountPlugin } from './types'
import type { AccountSettingsStore } from './useAccountSettings'
import styles from './AccountSettingsPage.module.css'

/** 설정(플러그인) 화면 — 계정 정보는 AccountProfilePage 로 분리돼 있습니다 */
export function AccountSettingsPage({ store }: { store: AccountSettingsStore }) {
  const [filter, setFilter] = useState('전체')
  const [installedOnly, setInstalledOnly] = useState(false)
  const [query, setQuery] = useState('')
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
  const plugins = PLUGINS.filter((plugin) =>
    (filter === '전체' || plugin.category === filter) &&
    (!installedOnly || (plugin.id === 'email' && store.emailInstalled)) &&
    `${plugin.name} ${plugin.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return <div className={styles.page}>
    <div className={styles.pageHead}>
      <div><h1>설정</h1><p>내 계정과 연결할 기능을 한곳에서 관리하세요.</p></div>
      <div className={styles.account}><span className={styles.avatar}>{ACCOUNT.name.slice(0, 1)}</span><div><strong>{ACCOUNT.name}</strong><span>{ACCOUNT.organization} · {ACCOUNT.team}</span></div></div>
    </div>

    <section aria-label="플러그인">
      <div className={styles.sectionHead}><div><h2>필요한 기능을 추가하세요</h2><p>알림, 파일 저장, 리포트 등 필요한 플러그인을 내 계정에 추가할 수 있습니다.</p></div><span className={styles.installedCount}>추가한 플러그인 <strong>{store.emailInstalled ? 1 : 0}</strong></span></div>
      <div className={styles.filters}>
        <div className={styles.filterTabs}><button type="button" aria-pressed={!installedOnly} onClick={() => setInstalledOnly(false)}>전체 플러그인</button><button type="button" aria-pressed={installedOnly} onClick={() => setInstalledOnly(true)}>내 플러그인</button></div>
        <div className={styles.search}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg><input type="search" aria-label="플러그인 검색" value={query} placeholder="플러그인 검색" onChange={(e) => setQuery(e.target.value)} /></div>
      </div>
      <div className={styles.categories} aria-label="플러그인 카테고리">{['전체', '알림', '저장', '리포트'].map((category) => <button key={category} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div>
      <div className={styles.pluginGrid}>{plugins.map((plugin) => {
        const installed = plugin.id === 'email' && store.emailInstalled
        return <article key={plugin.id} className={`${styles.plugin} ${installed ? styles.installed : ''}`}>
          <div className={styles.pluginHead}><PluginIcon icon={plugin.icon} /><span className={styles.categoryLabel}>{plugin.category}</span><span className={styles.pluginState}>{installed ? '추가됨' : plugin.available ? '사용 가능' : '준비 중'}</span></div>
          <h3>{plugin.name}</h3><p className={styles.description}>{plugin.description}</p>
          {installed && <div className={styles.configuration}><span className={styles.recipient}>{store.emailNotifications.email || '이메일 미등록'}</span><small>{[store.emailNotifications.completed && '배포 완료', store.emailNotifications.failed && '배포 오류'].filter(Boolean).join(' · ') || '선택한 알림 없음'}</small></div>}
          <div className={styles.pluginFooter}>
            {installed ? <><label className={styles.enable}><input type="checkbox" role="switch" aria-label="이메일 알림 사용" checked={store.emailNotifications.enabled} onChange={() => { store.toggleEmailNotifications(); say(store.emailNotifications.enabled ? '이메일 알림을 껐습니다' : '이메일 알림을 켰습니다') }} /><span>{store.emailNotifications.enabled ? '사용 중' : '사용 안 함'}</span></label><div className={styles.actions}><button type="button" className={styles.remove} onClick={() => setRemoving(true)}>제거</button><button type="button" className={styles.configure} onClick={() => setEmailOpen(true)}>설정</button></div></> : <><span className={styles.accountScope}>내 계정에 추가</span><button type="button" className={plugin.available ? styles.add : styles.coming} disabled={!plugin.available} onClick={() => setEmailOpen(true)}>{plugin.available ? '+ 플러그인 추가' : '준비 중'}</button></>}
          </div>
          {installed && removing && <div className={styles.removeConfirm} role="group" aria-label="이메일 알림 플러그인 제거 확인"><span>이메일 알림 플러그인을 제거할까요?</span><div><button type="button" onClick={() => setRemoving(false)}>취소</button><button type="button" onClick={() => { store.removeEmailPlugin(); setRemoving(false); say('이메일 알림 플러그인을 제거했습니다') }}>제거</button></div></div>}
        </article>
      })}</div>
      {!plugins.length && <div className={styles.empty}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><path d="M14 17.5h7M17.5 14v7" /></svg><h3>{installedOnly && !store.emailInstalled ? '아직 추가한 플러그인이 없습니다' : '조건에 맞는 플러그인이 없습니다'}</h3><p>{installedOnly && !store.emailInstalled ? '전체 플러그인에서 필요한 기능을 추가하세요.' : '검색어나 카테고리를 바꿔보세요.'}</p><button type="button" className={styles.configure} onClick={() => { setInstalledOnly(false); setFilter('전체'); setQuery('') }}>전체 플러그인 보기</button></div>}
      <div className={styles.footnote}>플러그인은 사용자 계정별로 관리됩니다. UI 목업으로, 실제 외부 서비스 연결이나 알림 발송은 이루어지지 않습니다.</div>
    </section>
    {emailOpen && <EmailNotificationDialog preferences={store.emailNotifications} onClose={() => setEmailOpen(false)} onSave={(preferences) => { const installed = store.emailInstalled; store.saveEmailNotifications(preferences); say(installed ? '이메일 알림 설정을 저장했습니다' : '이메일 알림 플러그인을 추가했습니다') }} />}
    {notice && <div className={styles.toast} role="status">{notice}</div>}
  </div>
}

function PluginIcon({ icon }: { icon: AccountPlugin['icon'] }) {
  return <span className={styles.pluginIcon} data-icon={icon} aria-hidden="true">
    {icon === 'email' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg> : icon === 'slack' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M9 3v11M15 10v11M3 15h11M10 9h11" /></svg> : icon === 'drive' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="m9 3 6 0 7 12-3 5H5l-3-5L9 3Z" /><path d="m9 3 7 12H2m13-12L8 15l-3 5m11-5 3 5" /></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 16v-3m4 3V8m4 8v-5" /></svg>}
  </span>
}
