/*
 * 전체 영상 탭 — 발행 예정 + 이미 끝난 것을 리스트 / 썸네일 두 레이아웃으로.
 */

import { KIND_TONE } from '../constants'
import { DONE } from '../data/mockData'
import type { Hold, HoldKind, Rule } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import { cx } from './shared'
import styles from './board.module.css'

interface Item {
  title: string
  kind: HoldKind
  channel: string
  at: string
  state: string
  color: string
  hold?: Hold
}

export function AllVideosTab({ rule, store }: { rule: Rule; store: AutoDeployStore }) {
  const items: Item[] = [
    ...rule.holds.map((h) => ({
      title: h.title,
      kind: h.kind,
      channel: h.channel.split(' · ')[0],
      at: `오늘 ${h.time}`,
      state: '발행 예정',
      color: 'var(--badge-text)',
      hold: h,
    })),
    ...DONE,
  ]
  const visible = items.filter((x) => store.allKind === '전체' || x.kind === store.allKind)

  const open = (x: Item) => {
    if (!x.hold) return
    store.setTab('review')
    store.pickHold(x.hold.id)
  }

  return (
    <div>
      <div className={styles.allHead}>
        <span className={styles.allTitle}>전체 영상 {items.length}개</span>
        <span className={styles.allSummary}>
          발행 예정 {rule.holds.length} · 발행됨 {DONE.filter((x) => x.state === '발행됨').length} ·
          기타 {DONE.filter((x) => x.state !== '발행됨').length}
        </span>
      </div>

      <div className={styles.allTabs}>
        {['전체', '숏폼', '클립'].map((k) => {
          const n = k === '전체' ? items.length : items.filter((x) => x.kind === k).length
          return (
            <button
              key={k}
              type="button"
              className={store.allKind === k ? styles.kindTabOn : styles.kindTab}
              onClick={() => store.setAllKind(k)}
            >
              {k} {n}
            </button>
          )
        })}
        <div className={styles.viewToggle}>
          {(
            [
              ['list', '리스트'],
              ['grid', '썸네일'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={cx(styles.viewBtn, store.viewMode === k && styles.viewOn)}
              onClick={() => store.setViewMode(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {store.viewMode === 'list' ? (
        <div className={styles.listCard}>
          <div className={styles.listHead}>
            <span>제목</span>
            <span>종류</span>
            <span>상태</span>
            <span>배포 채널</span>
            <span>시각</span>
          </div>
          {visible.map((x, i) => (
            <button
              key={`${x.title}-${i}`}
              type="button"
              className={styles.listRow}
              onClick={() => open(x)}
            >
              <span className={styles.listTitle}>{x.title}</span>
              <span>
                <span
                  className={styles.kind}
                  style={{ background: KIND_TONE[x.kind].bg, color: KIND_TONE[x.kind].fg }}
                >
                  {x.kind}
                </span>
              </span>
              <span>
                <span className={styles.itemState} style={{ color: x.color }}>
                  {x.state}
                </span>
              </span>
              <span className={styles.listChannel}>{x.channel}</span>
              <span className={styles.listAt}>{x.at}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.cards}>
          {visible.map((x, i) => (
            <div key={`${x.title}-${i}`} className={styles.gridCard}>
              <button
                type="button"
                className={styles.gridThumb}
                style={{ cursor: x.hold ? 'pointer' : 'default' }}
                onClick={() => open(x)}
              >
                <div className={x.kind === '숏폼' ? styles.gridFrameShort : styles.gridFrameWide}>
                  <div className={styles.gridFramePlaceholder}>미리보기</div>
                  <div
                    className={styles.gridCardTitle}
                    style={{ fontSize: x.kind === '숏폼' ? 11.5 : 12.5 }}
                  >
                    {x.title}
                  </div>
                </div>
              </button>
              <div className={styles.gridBody}>
                <div className={styles.gridBadges}>
                  <span
                    className={styles.kind}
                    style={{ background: KIND_TONE[x.kind].bg, color: KIND_TONE[x.kind].fg }}
                  >
                    {x.kind}
                  </span>
                  <span className={styles.itemState} style={{ color: x.color }}>
                    {x.state}
                  </span>
                </div>
                <div className={styles.gridFoot}>
                  <span>{x.channel}</span>
                  <span>{x.at}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
