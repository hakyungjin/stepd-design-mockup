import { useState, type CSSProperties, type MouseEvent } from 'react'
import { DAYS7, platOf } from '../constants'
import { isPast, upcomingOf } from '../domain/plan'
import type { PlanEntry, Rule } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import { cx } from './shared'
import { DayQueue } from './DayQueue'
import styles from './schedule.module.css'

export interface BoardLook { days: number; dense: boolean; text: boolean }

export function PlanBoard({ rule, plan, store, look }: { rule: Rule; plan: PlanEntry[]; store: AutoDeployStore; look: BoardLook }) {
  const [view, setView] = useState<'week' | 'day'>('week')
  const [day, setDay] = useState(1)
  const [channel, setChannel] = useState('all')
  const days = view === 'day' ? [DAYS7[day]] : DAYS7.slice(0, look.days)
  const channels = rule.channels.filter((c) => channel === 'all' || c.name === channel)
  const gridStyle = { '--day-count': days.length } as CSSProperties
  return <section className={cx(styles.planner, look.dense && styles.dense)} aria-label="플랫폼별 발행 편성표">
    <div className={styles.toolbar}>
      <div className={styles.period}><span className={styles.calendarIcon}>▦</span><strong>{view === 'week' ? `${days[0].label.split(' ')[0]} – ${days[days.length - 1].label.split(' ')[0]}` : DAYS7[day].label}</strong><span className={styles.periodYear}>2026</span><button type="button" className={styles.todayButton} onClick={() => { setDay(0); setView('day') }}>오늘</button></div>
      <div className={styles.toolbarRight}>
        <select className={styles.channelSelect} aria-label="편성표 플랫폼 필터" value={channel} onChange={(e) => setChannel(e.target.value)}><option value="all">모든 플랫폼</option>{rule.channels.map((c) => <option key={c.name} value={c.name}>{platOf(c.icon).name}</option>)}</select>
        <div className={styles.viewSwitch} aria-label="편성표 보기"><button type="button" aria-pressed={view === 'day'} onClick={() => setView('day')}>일간</button><button type="button" aria-pressed={view === 'week'} onClick={() => setView('week')}>주간</button></div>
      </div>
    </div>
    {view === 'day' && <div className={styles.dayPicker}>{DAYS7.map((d) => <button key={d.i} type="button" aria-pressed={day === d.i} onClick={() => setDay(d.i)}>{d.short} <span>{d.label}</span></button>)}</div>}

    {/* 일간은 STEPD 본 저장소의 "배포 대기 영상" 화면을 따릅니다 */}
    {view === 'day' ? <div className={styles.dayPane}><DayQueue rule={rule} plan={plan} store={store} day={day} /></div> : <>
    <div className={styles.boardScroll}><div className={styles.board} style={gridStyle}>
      <div className={styles.dateHead}><div className={styles.axisLabel}>플랫폼 / 시간대</div>{days.map((d) => <div key={d.i} className={cx(styles.date, d.i === 0 && styles.today, !rule.weekdays.includes(d.wd) && styles.restDate)}><div><strong>{d.label.split(' ')[0]}</strong><span>{d.label.split(' ')[1]}{d.i === 0 && <em>오늘</em>}</span></div><small>{rule.weekdays.includes(d.wd) ? `${upcomingOf(plan).filter((p) => p.day === d.i && (channel === 'all' || p.ch === channel)).length}개 예정` : '발행 없음'}</small></div>)}</div>
      {channels.map((c) => {
        const platform = platOf(c.icon)
        return <section key={c.name} className={styles.platformSection} aria-label={`${platform.name} 발행 일정`}>
          <div className={styles.platformHead}>
            <div className={styles.platformHeadInner}>
              <span className={styles.platformIcon} data-platform={c.icon}>{c.icon === 'YT' ? '▶' : c.icon === 'NC' ? 'N' : c.icon === 'TT' ? '♪' : '◎'}</span>
              <strong>{platform.name}</strong>
              <span className={styles.account}>{c.name.split(' · ')[1] ?? c.name}</span>
              <span className={styles.platformDivider} aria-hidden />
              <span className={styles.platformCount}>{upcomingOf(plan).filter((p) => p.ch === c.name).length}개 예정</span>
              <span className={cx(styles.connection, (c.expired || c.gated) && styles.connectionWarn)}>{c.expired ? '재연결 필요' : c.gated ? '기록만' : '연결됨'}</span>
            </div>
          </div>
          {rule.slots.map((slot) => <div key={slot.t} className={styles.timeRow}>
            <div className={styles.timeLabel}><strong>{slot.t}</strong><span>자동 {slot.n}개 / 시간대</span></div>
            {days.map((d) => {
              const key = `${c.name}|${d.i}|${slot.t}`
              const past = isPast({ day: d.i, t: slot.t })
              const rest = !rule.weekdays.includes(d.wd)
              const entries = plan.filter((p) => p.ch === c.name && p.day === d.i && p.t === slot.t)
              const cleared = store.cleared[rule.id]?.includes(key)
              return <div key={key} className={cx(styles.cell, d.i === 0 && styles.todayCell, rest && styles.restCell, store.cellHover === key && styles.dropTarget)}
                onDragOver={(e) => { if (past || rest || !store.dragRef.current) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; store.setCellHover(key) }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) store.setCellHover(null) }}
                onDrop={(e) => { e.preventDefault(); const drag = store.dragRef.current; store.dragRef.current = null; store.setCellHover(null); if (drag && !past && !rest) store.place(rule, drag.hid, c.name, d.i, slot.t, drag.from) }}>
                {rest ? <span className={styles.restLabel}>—</span> : <>
                  {entries.map((entry) => {
                    const h = rule.holds.find((h) => h.id === entry.hid)
                    if (!h) return null
                    const selected = store.pop?.hid === h.id && store.pop.ch === c.name && store.pop.day === d.i && store.pop.t === slot.t
                    return <article key={h.id} className={cx(styles.videoCard, selected && styles.selectedCard, past && styles.pastCard)} draggable={!past}
                      onDragOver={(e) => { if (!past && store.dragRef.current && !store.dragRef.current.from) { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add(styles.selectedCard) } }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) e.currentTarget.classList.remove(styles.selectedCard) }}
                      onDrop={(e) => {
                        const drag = store.dragRef.current
                        e.currentTarget.classList.remove(styles.selectedCard)
                        if (past || !drag || drag.from) return
                        e.preventDefault(); e.stopPropagation()
                        store.dragRef.current = null; store.setCellHover(null)
                        if (drag.hid !== h.id) store.replaceIn(rule, c.name, d.i, slot.t, h.id, drag.hid)
                      }}
                      onDragStart={(e) => { store.setPop(null); store.dragRef.current = { hid: h.id, from: entry }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', h.id) }}
                      onDragEnd={() => { store.dragRef.current = null; store.setCellHover(null) }}>
                      <button type="button" className={styles.videoPreview} aria-label={`${h.line1 || h.title} 재생`} onClick={() => store.setPlayer({ title: h.line1 || h.title, kind: h.kind, meta: `${platform.name} · ${d.label} ${slot.t}` })}>
                        <span className={styles.playMark} aria-hidden>▶</span>
                        <span className={styles.videoTitle} title={h.line1 || h.title}>{h.line1 || h.title}</span>
                      </button>
                      <div className={styles.videoMeta}><span className={styles.kindBadge}>{h.kind}</span><span className={styles.cardDur}>{h.dur}</span><span className={cx(styles.videoStatus, past && styles.publishedStatus, !past && (h.rendering || c.expired) && styles.warningStatus)}>{past ? '발행 완료' : h.rendering ? '렌더 중' : c.expired ? '인증 만료' : c.gated ? '기록만' : '예약됨'}</span></div>
                      {!past && <button type="button" className={styles.deleteButton} title="편성 삭제" aria-label={`${h.line1 || h.title} 편성 삭제`} onClick={() => store.removeFrom(rule, c.name, d.i, slot.t, h.id)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7" /></svg></button>}
                    </article>
                  })}
                  {!past && <button type="button" className={cx(styles.addVideo, !entries.length && styles.emptySlot)} onClick={(e) => openSlot(e, store, { ch: c.name, day: d.i, t: slot.t }, null)}><span>＋ {entries.length ? '영상 추가' : '영상 배치'}</span>{!entries.length && <small>{cleared ? '비워 둔 시간대' : '영상을 선택하거나 끌어오세요'}</small>}</button>}
                  {past && !entries.length && <span className={styles.restLabel}>지난 시간대</span>}
                </>}
              </div>
            })}
          </div>)}
          {!rule.slots.length && <div className={styles.noSlots}>발행 시간대를 설정하면 편성표가 만들어집니다.</div>}
        </section>
      })}
    </div></div>
    <div className={styles.boardFoot}><span>⠿ 영상을 끌어 다른 날짜·시간대·플랫폼으로 이동할 수 있습니다.</span><span><i /> 변경사항 자동 반영</span></div>
    </>}
  </section>
}

function openSlot(e: MouseEvent<HTMLElement>, store: AutoDeployStore, entry: { ch: string; day: number; t: string }, hid: string | null) {
  const rect = e.currentTarget.getBoundingClientRect()
  const width = Math.min(380, window.innerWidth - 24)
  store.setPop({ ...entry, hid, x: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), y: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 560)) })
}
