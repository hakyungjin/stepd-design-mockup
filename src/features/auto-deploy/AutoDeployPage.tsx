/*
 * 자동 배포 — 원본 목업(w_auto.dc.html) 을 그대로 옮긴 화면.
 *
 * 규칙 목록 → 규칙 드로어(발행 예정 계획표 / 전체 영상 / 설정) → 추가 마법사.
 * 상태와 동작은 hooks/useAutoDeploy.ts 에, 발행 규칙은 domain/plan.ts 에 있습니다.
 */

import { useEffect, useRef } from 'react'
import { Btn } from '@/components/ui/Btn'
import { Select } from '@/components/ui/Controls'
import type { ScreenKey } from '@/app/screens'
import { CHANNEL_FILTERS, WD } from './constants'
import { useAutoDeploy } from './hooks/useAutoDeploy'
import type { Rule } from './types'
import { AllVideosTab } from './components/AllVideosTab'
import { ConfirmDialog, PlayerModal } from './components/Overlays'
import { ReviewTab } from './components/ReviewTab'
import { RuleWizard } from './components/RuleWizard'
import { RunsTab } from './components/RunsTab'
import { SettingsTab } from './components/SettingsTab'
import type { BoardLook } from './components/PlanBoard'
import { cx } from './components/shared'
import styles from './AutoDeployPage.module.css'

export interface AutoDeployPageProps {
  onNavigate: (screen: ScreenKey) => void
  /** 계획표에 보여 줄 일 수 (원본 DC 프로퍼티) */
  planDays?: 3 | 7
  /** 칸 밀도 */
  density?: '여유' | '촘촘'
  /** 칸 카드 모양 */
  cardLook?: '썸네일' | '텍스트'
  initialRules?: Rule[]
}

export function AutoDeployPage({
  onNavigate,
  planDays = 7,
  density = '여유',
  cardLook = '썸네일',
  initialRules,
}: AutoDeployPageProps) {
  const store = useAutoDeploy(initialRules)
  const look: BoardLook = {
    days: planDays,
    dense: density === '촘촘',
    text: cardLook === '텍스트',
  }

  const { selected, draft } = store

  /* 탭·규칙·영상 상세를 옮길 때 내용이 중간부터 보이지 않도록 위로 올립니다 */
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [store.tab, store.focus, selected?.id])

  return (
    <>
      <div className={styles.page}>
        <div className={styles.head}>
          <h1 className={styles.h1}>자동배포 운영</h1>
          <div className={styles.headActions}>
            <Btn variant="secondary" size="md" onClick={store.togglePausedAll}>
              {store.paused ? '전체 재개' : '전체 일시정지'}
            </Btn>
            <Btn variant="primary" size="md" onClick={store.wzOpen}>
              + 자동배포 추가
            </Btn>
          </div>
        </div>

        <div className={styles.summary}>
          <div>
            <div className={styles.summaryTitle}>
              발행 예정 영상 <b>{store.reviewTotal}개</b>
            </div>
            <div className={styles.summaryNote}>
              순방이 편성한 계획대로 그대로 발행됩니다. 바꾸고 싶은 것만 프로그램을 열어 고치세요.
            </div>
          </div>
          <div className={styles.summaryStats}>
            <span>
              운영 중 <b>{store.activeCount}</b>
            </span>
            <span className={styles.dim}>·</span>
            <span>
              일시정지 <b>{store.pausedCount}</b>
            </span>
            <span className={styles.dim}>·</span>
            <span className={styles.dim}>{store.heartbeat}</span>
          </div>
        </div>

        {store.paused && (
          <div className={styles.pausedBanner}>
            <span className={styles.bang}>!</span>
            <span>
              <b>자동배포 전체가 일시정지 상태입니다</b> — 새 회차는 잡지 않습니다. 대기열에 들어간
              건은 그대로 나갑니다.
            </span>
            <Btn variant="primary" size="sm" onClick={store.togglePausedAll}>
              재개
            </Btn>
          </div>
        )}

        {store.credit <= 0 && (
          <div className={styles.idle}>
            <span className={styles.bang}>!</span>
            <div>
              <div className={styles.idleTitle}>크레딧이 없어 자동배포가 정지 상태입니다</div>
              <div className={styles.idleDetail}>
                자동 충전이 실패했습니다 — 카드 승인 거절 (09/21 03:12). 결제 수단을 확인하세요.
              </div>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.filters}>
            <input
              className={styles.search}
              placeholder="프로그램 검색"
              value={store.query}
              onChange={(e) => store.setQuery(e.target.value)}
            />
            <Select
              value={store.channelFilter}
              onChange={(e) => store.setChannelFilter(e.target.value)}
            >
              <option value="all">모든 배포 채널</option>
              {CHANNEL_FILTERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select value={store.stateFilter} onChange={(e) => store.setStateFilter(e.target.value)}>
              <option value="all">모든 운영 상태</option>
              <option value="운영 중">운영 중</option>
              <option value="일시정지">일시정지</option>
            </Select>
            <span className={styles.count}>{store.filtered.length}개 프로그램</span>
          </div>

          <div className={styles.tableViewport}>
          <div className={styles.gridHead}>
            <span>프로그램</span>
            <span>배포 채널</span>
            <span>운영 상태</span>
            <span>발행 예정</span>
            <span>다음 발행</span>
            <span>설정</span>
          </div>

          {store.pageRows.map((r) => {
            const hn = store.upcomingCount(r)
            const extra = r.channels.length - 1
            const on = r.state === '운영 중'
            return (
              <div key={r.id} className={styles.row}>
                <div className={styles.rowName}>
                  <div className={styles.rowTitle}>{r.name}</div>
                </div>

                <div className={styles.rowChannel}>
                  <span className={styles.platformMark} data-platform={r.channels[0].icon} aria-hidden="true">{r.channels[0].icon === 'YT' ? '▶' : r.channels[0].icon === 'NC' ? 'N' : r.channels[0].icon === 'TT' ? '♪' : '◎'}</span>
                  <span>{r.channels[0].name.split(' · ')[0]}</span>
                  {extra > 0 && <span className={styles.extra}>+{extra}</span>}
                </div>

                <div className={styles.rowState}>
                  <span className={cx(styles.stateChip, on ? styles.stateOn : styles.stateOff)}>
                    {r.state}
                  </span>
                  <button
                    type="button"
                    className={styles.toggle}
                    title={on ? '이 계획 끄기' : '이 계획 켜기'}
                    aria-label={on ? '이 계획 끄기' : '이 계획 켜기'}
                    onClick={() => store.toggleRule(r)}
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">{on ? <><rect x="4" y="3" width="2.5" height="10" rx=".8" /><rect x="9.5" y="3" width="2.5" height="10" rx=".8" /></> : <path d="M5 3.5a.7.7 0 0 1 1.05-.6l6.1 4.5a.75.75 0 0 1 0 1.2l-6.1 4.5A.7.7 0 0 1 5 12.5z" />}</svg>
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    className={hn ? styles.reviewLink : styles.reviewNone}
                    onClick={() => hn && store.openDrawer(r.id, 'review')}
                  >
                    {hn ? <><strong className={styles.reviewNumber}>{hn}</strong><span>개 확인</span><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 4 4 4-4 4" /></svg></> : '없음'}
                  </button>
                </div>

                <div className={on ? styles.rowNext : styles.rowNextOff}>
                  {!on
                    ? '—'
                    : r.slots.length
                      ? <><div className={styles.scheduleLine}><span className={styles.scheduleTime}>{r.slots[0].t}</span><span className={styles.scheduleVolume}>총 {r.slots.reduce((n, x) => n + x.n, 0)}개</span></div><div className={styles.scheduleDays}>{r.weekdays.map((i) => WD[i]).join(' · ')}</div></>
                      : '한도 내 자동'}
                </div>

                <div className={styles.rowSettings}>
                  <Btn variant="secondary" size="sm" className={styles.rowSettingsButton} onClick={() => store.openDrawer(r.id, 'settings')}>
                    <GearIcon />
                    설정
                  </Btn>
                </div>
              </div>
            )
          })}
          </div>

          {store.filtered.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>조건에 맞는 프로그램이 없습니다</div>
              <div className={styles.emptyNote}>검색어나 필터를 바꿔보세요.</div>
            </div>
          )}

          <div className={styles.pager}>
            <span className={styles.pagerLabel}>
              {store.filtered.length
                ? `${store.page * store.perPage + 1}–${store.page * store.perPage + store.pageRows.length} / ${store.filtered.length}개`
                : '0개'}
            </span>
            <div className={styles.pages}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => store.setPage(Math.max(store.page - 1, 0))}
              >
                ‹
              </button>
              {Array.from({ length: store.pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === store.page ? styles.pageOn : styles.pageNum}
                  onClick={() => store.setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => store.setPage(Math.min(store.page + 1, store.pageCount - 1))}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 규칙 드로어 ---------------- */}
      {selected && draft && (
        <div className={styles.drawer}>
          <div className={styles.drawerInner}>
            <div className={styles.drawerHead}>
              <button type="button" className={styles.back} onClick={store.closeDrawer}>
                ‹ 자동배포 운영
              </button>
              <div className={styles.drawerTitleRow}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.drawerTitle}>
                    <h2>{draft.name}</h2>
                    <span
                      className={cx(
                        styles.stateChip,
                        draft.state === '운영 중' ? styles.stateOn : styles.stateOff,
                      )}
                    >
                      {draft.state}
                    </span>
                  </div>
                  <div className={styles.drawerMeta}>
                    {draft.created} 만듦 · 월 예상 {draft.monthly}건
                  </div>
                </div>
                <div className={styles.drawerBtns}>
                  <button
                    type="button"
                    className={draft.state === '운영 중' ? styles.pauseBtn : styles.resumeBtn}
                    title={
                      draft.state === '운영 중'
                        ? '일시정지하면 이 계획의 모든 발행이 멈춥니다 — 편성된 발행 예정 영상도 나가지 않습니다.'
                        : '다시 시작하면 이 계획이 곧 새 회차를 잡기 시작합니다.'
                    }
                    onClick={() => store.toggleRule(draft)}
                  >
                    {draft.state === '운영 중' ? '일시정지' : '다시 시작'}
                  </button>
                  <button
                    type="button"
                    className={store.tab === 'settings' ? styles.gearOn : styles.gearBtn}
                    onClick={() => store.setTab(store.tab === 'settings' ? 'review' : 'settings')}
                  >
                    <GearIcon />
                    {store.tab === 'settings' ? '설정 닫기' : '자동배포 설정'}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.tabs}>
              {(
                [
                  ['review', `발행 예정 ${store.upcomingCount(selected)}`],
                  ['all', '전체 영상'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={store.tab === k ? styles.tabOn : styles.tab}
                  onClick={() => store.setTab(k)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.drawerBody} ref={bodyRef}>
              {store.tab === 'review' && (
                <ReviewTab rule={selected} store={store} look={look} onNavigate={onNavigate} />
              )}
              {store.tab === 'all' && <AllVideosTab rule={selected} store={store} />}
              {store.tab === 'settings' && <SettingsTab draft={draft} store={store} />}
              {store.tab === 'runs' && <RunsTab rule={selected} store={store} />}
            </div>

            {store.changes.length > 0 && (
              <div className={styles.changeBar}>
                <div className={styles.changeList}>
                  <span className={styles.changeCount}>바뀐 항목 {store.changes.length}</span>
                  {store.changes.map((c) => (
                    <span key={c} className={styles.changeChip}>
                      {c}
                    </span>
                  ))}
                </div>
                {store.willRestamp && (
                  <span className={styles.restamp}>
                    저장하면 아직 안 나간 영상을 새 설정으로 다시 만듭니다
                  </span>
                )}
                <button type="button" className={styles.revertBtn} onClick={store.revert}>
                  되돌리기
                </button>
                <button type="button" className={styles.saveBtn} onClick={store.save}>
                  저장
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {store.wizard && <RuleWizard store={store} />}
      {store.player && <PlayerModal cfg={store.player} onClose={() => store.setPlayer(null)} />}
      {store.confirm && (
        <ConfirmDialog cfg={store.confirm} onCancel={() => store.setConfirm(null)} />
      )}
      {store.toast && <div className={styles.toast}>{store.toast}</div>}
    </>
  )
}

function GearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
