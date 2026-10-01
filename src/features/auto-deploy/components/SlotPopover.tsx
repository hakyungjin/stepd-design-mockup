/*
 * 계획표 칸 팝오버 — 지금 들어 있는 영상을 확인·수정·빼기 하거나,
 * 이 플랫폼에 올릴 수 있는 다른 영상으로 바꿉니다.
 */

import { useEffect, useRef, useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { DAYS7, platOf } from '../constants'
import type { PlanEntry, Rule } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import styles from './board.module.css'
import { ScheduleMoveSelect } from './ScheduleMoveSelect'
import { episodeOf } from './VideoLibrary'

export function SlotPopover({
  rule,
  plan,
  store,
}: {
  rule: Rule
  plan: PlanEntry[]
  store: AutoDeployStore
}) {
  const pp = store.pop
  const [episode, setEpisode] = useState('all')
  const [query, setQuery] = useState('')
  const popRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!pp) return
    setEpisode('all')
    setQuery('')
    const previous = document.activeElement as HTMLElement | null
    popRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => previous?.focus()
  }, [pp])
  if (!pp) return null

  const c = rule.channels.find((x) => x.name === pp.ch) ?? rule.channels[0]
  const P = platOf(c.icon)
  const h = pp.hid ? rule.holds.find((x) => x.id === pp.hid) : null
  const titleOf = (x: { line1: string; title: string }) => x.line1 || x.title

  const onCh = new Set(plan.filter((p) => p.ch === pp.ch).map((p) => p.hid))
  const cands = rule.holds.filter((x) => P.ok(x.kind) && !onCh.has(x.id) && (episode === 'all' || episodeOf(x.source) === episode) && `${x.line1} ${x.title} ${x.source}`.includes(query))
  const episodes = [...new Set(rule.holds.map((x) => episodeOf(x.source)))].sort((a, b) => Number(b) - Number(a))

  const close = () => store.setPop(null)

  return (
    <>
      <div className={styles.popScrim} onClick={close} />
      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-label={h ? '편성 영상 교체' : '시간대에 영상 추가'}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
          if (e.key !== 'Tab') return
          const controls = popRef.current?.querySelectorAll<HTMLElement>('button,select,input')
          if (!controls?.length) return
          const first = controls[0], last = controls[controls.length - 1]
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        }}
        className={styles.pop}
        style={{
          left: pp.x,
          top: pp.y,
          maxHeight: Math.min(520, window.innerHeight - pp.y - 12),
        }}
      >
        <div className={styles.popHead}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.popTitle}>
              {P.name} · {DAYS7[pp.day].label} {pp.t}
            </div>
            <div className={styles.popAccount}>{c.name}</div>
          </div>
          <button type="button" aria-label="닫기" className={styles.popClose} onClick={close}>
            ×
          </button>
        </div>

        {h && (
          <div className={styles.popCur}>
            <div className={styles.popCurTop}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.popCurTitle}>{titleOf(h)}</div>
                <div className={styles.popCurMeta}>
                  {h.kind} · {h.dur}
                </div>
              </div>
            </div>
            <div className={styles.popCurBtns}>
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => {
                  close()
                  if (h.rendering) {
                    store.say('렌더 중입니다 — 끝나면 열 수 있습니다')
                    return
                  }
                  store.pickHold(h.id)
                }}
              >
                확인·수정
              </Btn>
              <Btn
                variant="danger"
                size="sm"
                onClick={() => {
                  close()
                  store.removeFrom(rule, pp.ch, pp.day, pp.t, h.id)
                }}
              >
                편성 삭제
              </Btn>
            </div>
            <label className={styles.popNote}>발행 시간 이동<ScheduleMoveSelect rule={rule} entry={{ hid: h.id, ch: pp.ch, day: pp.day, t: pp.t }} store={store} /></label>
            <div className={styles.popNote}>
              빼면 {P.name} {DAYS7[pp.day].short} {pp.t}에서만 빠집니다. 다른 플랫폼 편성은
              그대로입니다.
            </div>
          </div>
        )}

        <div>
          <div className={styles.popCandLabel}>{h ? '교체할 영상 선택' : '추가할 영상 선택'}</div>
          <div className={styles.popNote} style={{ marginTop: 2 }}>
            {P.name}에 올릴 수 있는 것만 보입니다 · {P.rule}
          </div>
        </div>

        <div className={styles.candidateFilters}>
          <select aria-label="교체 영상 회차 선택" value={episode} onChange={(e) => setEpisode(e.target.value)}><option value="all">전체 회차</option>{episodes.map((ep) => <option key={ep} value={ep}>{ep}회</option>)}</select>
          <input aria-label="교체 영상 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="영상 검색" />
        </div>

        <div className={styles.popCands}>
          {cands.map((x) => {
            const other = plan.filter((p) => p.hid === x.id).length
            return (
              <button
                key={x.id}
                type="button"
                className={styles.cand}
                onClick={() => {
                  close()
                  if (h) store.replaceIn(rule, pp.ch, pp.day, pp.t, h.id, x.id)
                  else store.place(rule, x.id, pp.ch, pp.day, pp.t, null)
                }}
              >
                <span className={styles.candText}>
                  <span className={styles.candTitle}>{titleOf(x)}</span>
                  <span className={styles.candMeta}>
                    {episodeOf(x.source)}회 · {x.kind} · {x.dur}
                    {other ? ` · 다른 플랫폼 ${other}곳 편성` : ''}
                  </span>
                </span>
              </button>
            )
          })}
          {cands.length === 0 && (
            <div className={styles.noCands}>이 플랫폼에 올릴 수 있는 다른 영상이 없습니다.</div>
          )}
        </div>
      </div>
    </>
  )
}
