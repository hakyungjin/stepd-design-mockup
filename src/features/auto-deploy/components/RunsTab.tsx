/*
 * 발행 기록 탭.
 * 원본 목업도 이 패널을 렌더하지만 탭 버튼이 없어 화면에서는 열리지 않습니다 —
 * 원본을 그대로 옮기기 위해 패널은 남겨 두었습니다. (tab === 'runs')
 */

import { RUN_CAP, RUN_SEED, RUN_TOTAL } from '../data/mockData'
import type { Rule } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import styles from './board.module.css'

export function RunsTab({ rule, store }: { rule: Rule; store: AutoDeployStore }) {
  const shown = Math.min(store.runLimit, RUN_TOTAL, RUN_CAP)
  const rows = Array.from({ length: shown }, (_, i) => {
    const seed = RUN_SEED[i % RUN_SEED.length]
    const day = 22 - Math.floor(i / 3)
    return {
      at: `09/${String(Math.max(day, 1)).padStart(2, '0')} ${['19:00', '12:30', '08:00'][i % 3]}`,
      title: `${rule.name} · ${seed.title} ${i ? `(${i + 1})` : ''}`.trim(),
      channel: seed.channel,
      state: seed.state,
      color: seed.color,
      detail:
        seed.state === '발행 완료'
          ? '정상 발행 — 채널에 업로드됨'
          : '채널 업로드가 꺼져 있어 기록만 남았습니다',
    }
  })

  return (
    <div>
      <div className={styles.runHead}>
        <span className={styles.runTitle}>발행 기록 {RUN_TOTAL}건</span>
        <span className={styles.runShown}>{shown}건 표시</span>
      </div>
      <div className={styles.runList}>
        {rows.map((r, i) => (
          <div key={i} className={styles.runRow}>
            <span className={styles.runAt}>{r.at}</span>
            <span className={styles.runName}>{r.title}</span>
            <span className={styles.runChannel}>{r.channel}</span>
            <span className={styles.runState} style={{ color: r.color }} title={r.detail}>
              {r.state}
            </span>
          </div>
        ))}
      </div>
      {shown < Math.min(RUN_TOTAL, RUN_CAP) && (
        <div className={styles.runMore}>
          <button type="button" className={styles.runMoreBtn} onClick={store.moreRuns}>
            더 보기 (50건)
          </button>
        </div>
      )}
      {shown >= RUN_CAP && <div className={styles.runCapped}>최대 500건까지 보여줍니다</div>}
    </div>
  )
}
