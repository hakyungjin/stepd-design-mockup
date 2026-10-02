/*
 * 영상 보관함 — 이 자동배포가 쥐고 있는 영상과 편성 여부를 봅니다.
 * 카드를 편성표의 빈 자리로 끌어다 놓으면 그 자리에 들어갑니다 (DayQueue 가 받습니다).
 * 한 번에 채우려면 편성표의 "✦ 자동배치" 를 씁니다.
 */

import { useState } from 'react'
import { platOf } from '../constants'
import type { PlanEntry, Rule } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import { cx } from './shared'
import styles from './schedule.module.css'

/** "나미브 14회 · 12:40–13:31" → "14" */
export const episodeOf = (source: string): string => source.match(/(\d+)\s*회/)?.[1] ?? ''

export function VideoLibrary({
  rule,
  plan,
  store,
}: {
  rule: Rule
  plan: PlanEntry[]
  store: AutoDeployStore
}) {
  const [episode, setEpisode] = useState('all')
  const [query, setQuery] = useState('')
  const [unplacedOnly, setUnplacedOnly] = useState(false)

  const placedCount = (id: string) => plan.filter((p) => p.hid === id).length

  const episodes = [...new Set(rule.holds.map((h) => episodeOf(h.source)))]
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a))

  const visible = rule.holds.filter((h) => {
    if (episode !== 'all' && episodeOf(h.source) !== episode) return false
    if (unplacedOnly && placedCount(h.id) > 0) return false
    const q = query.trim()
    return !q || `${h.line1} ${h.title} ${h.source}`.includes(q)
  })

  const unplaced = rule.holds.filter((h) => placedCount(h.id) === 0).length

  return (
    <section className={styles.library} aria-label="영상 보관함">
      <div className={styles.libraryHead}>
        <span className={styles.libraryTitle}>영상 보관함</span>
        <span className={styles.libraryCount}>
          {rule.holds.length}개 · 편성 안 된 것 {unplaced}개
        </span>

        <div className={styles.libraryFilters}>
          <button
            type="button"
            className={unplacedOnly ? styles.libToggleOn : styles.libToggle}
            aria-pressed={unplacedOnly}
            onClick={() => setUnplacedOnly((v) => !v)}
          >
            편성 안 된 것만
          </button>
          <select
            aria-label="보관함 회차 선택"
            value={episode}
            onChange={(e) => setEpisode(e.target.value)}
          >
            <option value="all">전체 회차</option>
            {episodes.map((ep) => (
              <option key={ep} value={ep}>
                {ep}회
              </option>
            ))}
          </select>
          <input
            aria-label="보관함 영상 검색"
            placeholder="영상 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.libraryList}>
        {visible.map((h) => {
          const placed = placedCount(h.id)
          const where = plan
            .filter((p) => p.hid === h.id)
            .map((p) => platOf(rule.channels.find((c) => c.name === p.ch)?.icon ?? 'YT').name)
          return (
            <article
              key={h.id}
              className={cx(styles.libItem, placed > 0 && styles.libItemPlaced)}
              draggable
              title={h.source}
              onDragStart={(e) => {
                store.dragRef.current = { hid: h.id, from: null }
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', h.id)
              }}
              onDragEnd={() => {
                store.dragRef.current = null
                store.setCellHover(null)
              }}
            >
              <span className={styles.libGrip} aria-hidden>
                ⠿
              </span>
              <div className={styles.libBody}>
                <div className={styles.libTitle}>{h.line1 || h.title}</div>
                <div className={styles.libMeta}>
                  <span>
                    {episodeOf(h.source)}회 · {h.kind} · {h.dur}
                  </span>
                  {h.rendering && <span className={styles.libTagWarn}>렌더 중</span>}
                  {placed > 0 && (
                    <span className={styles.libTagPlaced}>
                      {[...new Set(where)].join('·')} 편성
                    </span>
                  )}
                  {placed === 0 && <span className={styles.libTag}>미편성</span>}
                </div>
              </div>
            </article>
          )
        })}

        {visible.length === 0 && (
          <div className={styles.libEmpty}>조건에 맞는 영상이 없습니다.</div>
        )}
      </div>
    </section>
  )
}
