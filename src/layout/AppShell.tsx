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
  /* 알림은 화면 오른쪽 아래 떠 있는 버튼에서 엽니다 */
  const [inboxOpen, setInboxOpen] = useState(false)
  useEffect(() => { setInboxOpen(false) }, [active])
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
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState<{ left: number; bottom: number } | null>(null)
  const openMenu = () => {
    const r = accountRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(240, window.innerWidth - 24)
    setMenu({ left: Math.max(12, Math.min(r.left, window.innerWidth - width - 12)), bottom: window.innerHeight - r.top + 6 })
  }
  const closeMenu = () => { setMenu(null); accountRef.current?.focus() }
  useEffect(() => { setMenu(null) }, [collapsed, active])
  useEffect(() => {
    if (!menu) return
    accountMenuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const close = () => { setMenu(null); accountRef.current?.focus() }
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
        {/*
          브랜드 줄 — STEPD 본 저장소 사이드바와 같은 구성입니다.
          왼쪽에 로고, 오른쪽에 유틸리티(알림)와 접기 버튼이 붙습니다.
          에이전트는 아래 내비 목록의 정식 항목으로 내려갔습니다.
        */}
        <div className={styles.brand}>
          {/* STEPD 본 저장소의 브랜드 마크 그대로 (apps/web/public/brand) */}
          <img
            className={styles.brandMark}
            src={`${import.meta.env.BASE_URL}brand/stepd-icon-192.png`}
            alt=""
            aria-hidden
            draggable={false}
          />
          <span className={styles.brandName}>STEP D</span>

          <div className={styles.brandActions}>
            {/* 채팅·좁은 화면은 이미 접혀 있어 누를 자리가 없습니다 */}
            {!compact && !narrow && (
              <button
                type="button"
                className={styles.brandBtn}
                aria-label={folded ? '사이드바 펼치기' : '사이드바 접기'}
                aria-pressed={folded}
                {...tooltipProps(folded ? '사이드바 펼치기' : '사이드바 접기')}
                onClick={() => setFolded((v) => !v)}
              >
                <FoldIcon folded={folded} />
              </button>
            )}
          </div>
        </div>

        {/* 묶음 이름(작업 공간·자동화·도구)은 띄우지 않습니다 — 가는 선으로만 가릅니다 */}
        {NAV.map((section, si) => (
          <div key={section.title ?? si} className={styles.section} aria-label={section.title}>
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
          {/*
            테마 전환 — STEPD 본 저장소 사이드바(presentation/layout/sidebar.tsx)와 같은 모양입니다.
            펼쳤을 때는 Dark | Light 두 칸짜리 필, 접었을 때는 동그란 버튼 하나입니다.
            아이콘은 "지금 상태"를 가리킵니다(어두우면 달) — 본 저장소와 같은 규칙입니다.
          */}
          {collapsed ? (
            <button
              type="button"
              className={styles.themeRound}
              data-theme={theme}
              aria-label="테마 토글"
              {...tooltipProps('테마 토글')}
              onClick={toggle}
            >
              {dark ? <MoonIcon size={14} /> : <SunIcon size={14} />}
            </button>
          ) : (
            <div className={styles.themePill} role="group" aria-label="테마">
              <button type="button" aria-pressed={dark} onClick={() => { if (!dark) toggle() }}>
                <MoonIcon /> Dark
              </button>
              <button type="button" aria-pressed={!dark} onClick={() => { if (dark) toggle() }}>
                <SunIcon /> Light
              </button>
            </div>
          )}

          <button
            ref={accountRef}
            type="button"
            className={`${styles.accountBtn} ${onAccountScreen ? styles.accountBtnActive : ''}`}
            aria-label={`${userName} 프로필 메뉴`}
            {...tooltipProps('프로필', `${userName} · ${accountMeta}`)}
            aria-current={onAccountScreen ? 'page' : undefined}
            aria-haspopup="menu"
            aria-controls="sidebar-profile-menu"
            aria-expanded={!!menu}
            onClick={() => (menu ? closeMenu() : openMenu())}
          >
            <span className={styles.profileAvatar}><ProfileIcon /></span>
            <span className={styles.accountName}>{userName}</span>
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
            onClick={closeMenu}
          />
          <div
            ref={accountMenuRef}
            id="sidebar-profile-menu"
            className={styles.accountMenu}
            role="menu"
            aria-label="계정"
            style={{ left: menu.left, bottom: menu.bottom }}
            onKeyDown={(event) => {
              if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
              const current = items.indexOf(document.activeElement as HTMLButtonElement)
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
              items[next]?.focus()
            }}
          >
            <div className={styles.accountMenuHead}>
              <strong>{userName}</strong>
              <span>{accountMeta}</span>
            </div>
            <button type="button" role="menuitem" aria-current={activeNav === 'profile' ? 'page' : undefined} onClick={() => go('profile')}>
              <ProfileIcon /> 계정 정보
            </button>
            <button type="button" role="menuitem" aria-current={activeNav === 'settings' ? 'page' : undefined} onClick={() => go('settings')}>
              <NavIcon screen="settings" size={15} /> 설정
            </button>
            {/* 테마는 바로 아래 Dark|Light 필이 맡습니다 — 토글이 둘이면 서로 어긋납니다 */}
          </div>
        </>
      )}

      <div className={styles.main}>{children}</div>

      {/* 알림 — 사이드바를 비우고 화면 오른쪽 아래에 띄웁니다 */}
      <button
        type="button"
        className={styles.inboxFab}
        aria-label={`알림${collaboration.unread ? ` · 미읽음 ${collaboration.unread}개` : ''}`}
        title="알림"
        aria-haspopup="dialog"
        aria-expanded={inboxOpen}
        onClick={() => setInboxOpen((open) => !open)}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {collaboration.unread > 0 && <i className={styles.mentionBadge} aria-hidden="true">{collaboration.unread > 9 ? '9+' : collaboration.unread}</i>}
      </button>

      {inboxOpen && <MentionInbox store={collaboration} onClose={() => setInboxOpen(false)} onOpen={onOpenMention} />}
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

function ProfileIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>
}

/* 본 저장소는 필 안에서 12px, 접힌 동그라미에서 14px 을 씁니다 */
function SunIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

function MoonIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
export function PageTopBar({
  title,
  subtitle,
  right,
}: {
  title: string
  /** STEPD 본 저장소 Header 와 같은 자리의 보조 문구 */
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className={styles.topBar}>
      <div className={styles.topBarHead}>
        <span className={styles.topBarTitle}>{title}</span>
        {subtitle && <span className={styles.topBarSub}>{subtitle}</span>}
      </div>
      {right}
    </div>
  )
}
