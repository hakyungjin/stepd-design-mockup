import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NAV, navKeyFor, type ScreenKey } from '@/app/screens'
import { useTheme } from '@/app/useTheme'
import { ACCOUNT } from '@/features/account-settings/data'
import styles from './AppShell.module.css'
import { NavIcon } from '@/components/ui/NavIcon'
import { MentionInbox } from '@/features/notifications/MentionInbox'
import type { MediaCollaborationStore, MediaMention } from '@/features/media/useMediaCollaborationMock'

/**
 * STEP D 공통 셸(좌측 내비 + 본문).
 *
 * STEPD 에 붙일 때는 이 파일을 버리고 본 프로젝트의 레이아웃 안에
 * 각 화면 컴포넌트만 꽂으면 됩니다.
 */

/** 사이드바를 접어 뒀는지 기억해 두는 자리 */
const FOLD_KEY = 'stepd-sidebar-folded'
const readFolded = () => {
  try {
    return window.localStorage.getItem(FOLD_KEY) === '1'
  } catch {
    return false
  }
}

export interface AppShellProps {
  active: ScreenKey
  onNavigate: (key: ScreenKey) => void
  collaboration: MediaCollaborationStore
  onOpenMention: (item: MediaMention) => void
  /** 사이드바 항목 옆에 띄울 배지 (예: 배포 실패 건수) */
  badges?: Partial<Record<ScreenKey, { text: string; tone: 'error' | 'warn' }>>
  /** 하단 계정 줄에 보여 줄 사람 이름 */
  userName?: string
  /** 이름 옆 툴팁에 붙는 소속 */
  accountMeta?: string
  children: ReactNode
}

export function AppShell({
  active,
  onNavigate,
  collaboration,
  onOpenMention,
  badges,
  userName = ACCOUNT.name,
  accountMeta = `${ACCOUNT.organization} · ${ACCOUNT.team} · ${ACCOUNT.role}`,
  children,
}: AppShellProps) {
  const activeNav = navKeyFor(active)
  const [inboxLeft, setInboxLeft] = useState<number | null>(null)
  useEffect(() => { setInboxLeft(null) }, [active])
  /** 계정 정보·설정은 계정 메뉴로 들어가는 두 화면입니다 */
  const onAccountScreen = activeNav === 'settings' || activeNav === 'profile'
  const compact = active === 'chat'
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  /* 직접 접어 둔 상태 — 다시 들어와도 그대로입니다 */
  const [folded, setFolded] = useState(readFolded)
  useEffect(() => {
    try {
      window.localStorage.setItem(FOLD_KEY, folded ? '1' : '0')
    } catch {
      /* 저장이 막힌 브라우저에서도 접기 자체는 동작해야 합니다 */
    }
  }, [folded])
  /** 채팅 화면과 좁은 화면은 자동으로 접힙니다 */
  const collapsed = compact || narrow || folded
  const tooltipId = useId()
  const [tooltip, setTooltip] = useState<{ label: string; left: number; top: number } | null>(null)
  const tooltipProps = (label: string, title = label) => ({
    'data-sidebar-tooltip': label,
    'aria-describedby': tooltip?.label === label ? tooltipId : undefined,
    title: collapsed ? undefined : title,
  })
  const showTooltip = (target: EventTarget | null) => {
    if (!collapsed || !(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('button[data-sidebar-tooltip]')
    if (!button) return
    const rect = button.getBoundingClientRect()
    const sidebar = button.closest('nav')!.getBoundingClientRect()
    setTooltip({
      label: button.dataset.sidebarTooltip!,
      left: sidebar.right + 10,
      top: Math.max(24, Math.min(window.innerHeight - 24, rect.top + rect.height / 2)),
    })
  }
  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)')
    const update = () => setNarrow(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => { setTooltip(null) }, [active, collapsed, theme])
  useEffect(() => {
    if (!tooltip) return
    const close = () => setTooltip(null)
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [tooltip])

  /* 계정 메뉴 — 사이드바가 접히면 잘리므로 버튼 위치에 고정해 띄웁니다 */
  const accountRef = useRef<HTMLButtonElement>(null)
  const [menu, setMenu] = useState<{ left: number; bottom: number } | null>(null)
  const openMenu = () => {
    const r = accountRef.current?.getBoundingClientRect()
    if (!r) return
    setMenu({ left: r.left, bottom: window.innerHeight - r.top + 6 })
  }
  /* 사이드바가 줄면 메뉴를 띄울 버튼 자체가 사라집니다 */
  useEffect(() => {
    if (collapsed) setMenu(null)
  }, [collapsed])
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', close) }
  }, [menu])
  const go = (key: ScreenKey) => {
    setMenu(null)
    onNavigate(key)
  }

  return (
    <div className={styles.shell}>
      <nav
        className={`${styles.sidebar} ${compact || folded ? styles.sidebarCompact : ''}`}
        aria-label="주 메뉴"
        onPointerOver={(event) => { if (event.pointerType !== 'touch') showTooltip(event.target) }}
        onPointerOut={(event) => {
          const button = (event.target as Element).closest('button')
          if (!(event.relatedTarget instanceof Node) || !button?.contains(event.relatedTarget)) setTooltip(null)
        }}
        onFocusCapture={(event) => showTooltip(event.target)}
        onBlurCapture={() => setTooltip(null)}
        onClickCapture={() => setTooltip(null)}
      >
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden>
            S
          </span>
          <span className={styles.brandName}>STEP D</span>
        </div>

        <div className={styles.primaryNav}>
          <button type="button" className={styles.primaryItem} aria-current={activeNav === 'chat' ? 'page' : undefined} aria-label="에이전트" {...tooltipProps('에이전트')} onClick={() => onNavigate('chat')}><NavIcon screen="chat" size={18} />{activeNav === 'chat' && <span>에이전트</span>}</button>
          <button type="button" className={styles.primaryItem} aria-label={`알림${collaboration.unread ? ` · 미읽음 ${collaboration.unread}개` : ''}`} aria-haspopup="dialog" aria-expanded={inboxLeft !== null} {...tooltipProps('알림')} onClick={(event) => setInboxLeft(inboxLeft === null ? event.currentTarget.closest('nav')!.getBoundingClientRect().right + 8 : null)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{inboxLeft !== null && <span>알림</span>}{collaboration.unread > 0 && <i className={styles.mentionBadge} aria-hidden="true">{collaboration.unread > 9 ? '9+' : collaboration.unread}</i>}</button>

          {/* 채팅·좁은 화면은 이미 접혀 있어 누를 자리가 없습니다 */}
          {!compact && !narrow && (
            <button
              type="button"
              className={styles.foldBtn}
              aria-label={folded ? '메뉴 펼치기' : '메뉴 접기'}
              aria-pressed={folded}
              {...tooltipProps(folded ? '메뉴 펼치기' : '메뉴 접기')}
              onClick={() => setFolded((v) => !v)}
            >
              <FoldIcon folded={folded} />
            </button>
          )}
        </div>

        {inboxLeft !== null && <MentionInbox store={collaboration} left={inboxLeft} onClose={() => setInboxLeft(null)} onOpen={onOpenMention} />}
        {NAV.map((section, si) => (
          <div key={section.title ?? si} className={styles.section}>
            {section.title && <div className={styles.navGroup}>{section.title}</div>}
            {section.items.map((item) => {
              const isActive = item.key === activeNav
              const badge = badges?.[item.key]
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-label={item.label}
                  {...tooltipProps(item.label, badge ? `${item.label} · ${badge.text}` : item.label)}
                  aria-current={isActive ? 'page' : undefined}
                  className={
                    isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
                  }
                  onClick={() => onNavigate(item.key)}
                >
                  <NavIcon screen={item.key} /><span className={styles.navLabel}>{item.label}</span>
                  {badge && (
                    <span
                      className={
                        badge.tone === 'error'
                          ? `${styles.navBadge} ${styles.navBadgeError}`
                          : `${styles.navBadge} ${styles.navBadgeWarn}`
                      }
                    >
                      {badge.text}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}

        <div className={styles.accountBar}>
          {/* 사이드바가 줄면 이름이 들어갈 자리가 없어 설정으로 바로 갑니다 */}
          {collapsed ? (
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="설정"
              {...tooltipProps('설정')}
              aria-current={onAccountScreen ? 'page' : undefined}
              onClick={() => onNavigate('settings')}
            >
              <NavIcon screen="settings" size={16} />
            </button>
          ) : (
            <button
              ref={accountRef}
              type="button"
              className={`${styles.accountBtn} ${onAccountScreen ? styles.accountBtnActive : ''}`}
              {...tooltipProps('계정 메뉴', `${userName} · ${accountMeta}`)}
              aria-current={onAccountScreen ? 'page' : undefined}
              aria-haspopup="menu"
              aria-expanded={!!menu}
              onClick={() => (menu ? setMenu(null) : openMenu())}
            >
              <span className={styles.accountNameText}>{userName}</span>
              <span className={styles.accountCaret}>⌄</span>
            </button>
          )}

          <button
            type="button"
            className={styles.iconBtn}
            aria-label={dark ? '화이트 화면으로 바꾸기' : '블랙 화면으로 바꾸기'}
            {...tooltipProps(dark ? '화이트 화면으로' : '블랙 화면으로')}
            aria-pressed={!dark}
            onClick={toggle}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

      </nav>

      {tooltip && createPortal(
        <div id={tooltipId} role="tooltip" className={styles.sidebarTooltip} style={{ left: tooltip.left, top: tooltip.top }}>
          {tooltip.label}
        </div>,
        document.body,
      )}

      {menu && (
        <>
          <button
            type="button"
            className={styles.menuScrim}
            aria-label="계정 메뉴 닫기"
            onClick={() => setMenu(null)}
          />
          <div
            className={styles.accountMenu}
            role="menu"
            aria-label="계정"
            style={{ left: menu.left, bottom: menu.bottom }}
          >
            <div className={styles.accountMenuHead}>
              <strong>{userName}</strong>
              <span>{accountMeta}</span>
            </div>
            <button type="button" role="menuitem" aria-current={activeNav === 'profile' ? 'page' : undefined} onClick={() => go('profile')}>
              계정 정보
            </button>
            <button type="button" role="menuitem" aria-current={activeNav === 'settings' ? 'page' : undefined} onClick={() => go('settings')}>
              설정
            </button>
          </div>
        </>
      )}

      <div className={styles.main}>{children}</div>
    </div>
  )
}

/** 세로줄 + 화살표 — 접힌 쪽에서는 반대로 돌려 펼치기를 가리킵니다 */
function FoldIcon({ folded }: { folded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4v16" />
      {folded ? <path d="M10 12h10m-4-4 4 4-4 4" /> : <path d="M20 12H10m4-4-4 4 4 4" />}
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9 6.3 6.3m11.4 11.4 1.4 1.4M4.9 19.1 6.3 17.7M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  )
}

/** 화면 상단의 56px 바 (대시보드·성과·영상 검색 등에서 씁니다) */
export function PageTopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className={styles.topBar}>
      <span className={styles.topBarTitle}>{title}</span>
      {right}
    </div>
  )
}
