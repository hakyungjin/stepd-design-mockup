/*
 * 일간 배포 대기 — STEPD 본 저장소의 "배포 대기 영상" 화면을 따릅니다.
 * (apps/web/src/presentation/features/automation/rule-drawer.tsx 의 review 탭)
 *
 * 본 저장소와 같은 뼈대입니다: 날짜 묶음 머리글 + 종류 칩 + 리스트/썸네일 전환,
 * 그리고 같은 열 구성(제목 · 종류 · 상태 · 길이 · 버튼).
 *
 * 한 가지를 더했습니다. 본 저장소는 계획 하나가 채널 묶음 전체로 함께 나가지만
 * 이 목업은 채널마다 시각이 달라서, 날짜 묶음 아래를 플랫폼별로 한 번 더 나눕니다.
 * 같은 영상이 다른 채널로도 나가면 그 줄에 작게 적어 둡니다.
 */

import { Fragment, useState } from 'react'
import { DAYS7, KIND_TONE, NOW_T, platOf } from '../constants'
import type { Hold, HoldKind, PlanEntry, Rule, RuleChannel } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import { frameThumb, portraitThumb } from '@/lib/frames'
import { cx } from './shared'
import styles from './dayQueue.module.css'

type ViewMode = 'list' | 'grid'
const KINDS = ['전체', '숏폼', '클립', '하이라이트'] as const

/** 한 플랫폼에서 이 날 나갈 영상 한 건 */
interface QueueItem {
  entry: PlanEntry
  hold: Hold
  past: boolean
  state: string
  tone: 'render' | 'hold' | 'ready' | 'done'
  /** 같은 영상이 함께 나가는 다른 플랫폼 이름 */
  alsoOn: string[]
}

/** 한 플랫폼의 한 시간대 — 하루에 두 번 이상 나갈 수 있어 시간대로 한 번 더 나눕니다 */
interface SlotGroup {
  time: string
  /** 이 시간대에 넣기로 한 개수 (설정값) */
  cap: number
  items: QueueItem[]
}

interface PlatformGroup {
  channel: RuleChannel
  items: QueueItem[]
  slots: SlotGroup[]
}

export function DayQueue({
  rule,
  plan,
  store,
  day,
}: {
  rule: Rule
  plan: PlanEntry[]
  store: AutoDeployStore
  day: number
}) {
  const [kind, setKind] = useState<(typeof KINDS)[number]>('전체')
  const [view, setView] = useState<ViewMode>('list')

  const d = DAYS7[day]
  const publishes = rule.weekdays.includes(d.wd) && rule.slots.length > 0
  const today = plan.filter((p) => p.day === day)

  /* 시간대는 몇 개든 올 수 있습니다 — 설정에 없는 시각이 계획에 남아 있어도 빠뜨리지 않습니다 */
  const slotTimes = [...new Set([...rule.slots.map((s) => s.t), ...today.map((p) => p.t)])].sort()
  const capOf = (t: string) => rule.slots.find((s) => s.t === t)?.n ?? 0

  const groups: PlatformGroup[] = rule.channels.map((channel) => {
    const items = today
      .filter((p) => p.ch === channel.name)
      .sort((a, b) => a.t.localeCompare(b.t))
      .flatMap((entry) => {
        const hold = rule.holds.find((h) => h.id === entry.hid)
        if (!hold) return []
        const past = day === 0 && entry.t < NOW_T
        const alsoOn = today
          .filter((p) => p.hid === entry.hid && p.ch !== entry.ch)
          .map((p) => platOf(rule.channels.find((c) => c.name === p.ch)?.icon ?? 'YT').name)
        return [{ entry, hold, past, alsoOn, ...faceOf(hold, channel, past) }]
      })
    return { channel, items, slots: [] }
  })

  const matches = (x: QueueItem) => kind === '전체' || x.hold.kind === kind
  const all = groups.flatMap((g) => g.items)
  const visibleGroups = groups
    .map((g) => {
      const items = g.items.filter(matches)
      const slots = slotTimes
        .map((time) => ({ time, cap: capOf(time), items: items.filter((x) => x.entry.t === time) }))
        .filter((s) => s.items.length > 0)
      return { ...g, items, slots }
    })
    .filter((g) => g.items.length > 0)
  const waiting = all.filter((x) => !x.past).length
  const countOf = (k: (typeof KINDS)[number]) =>
    k === '전체' ? all.length : all.filter((x) => x.hold.kind === k).length

  /* 발행 시각은 전부 한국 시간입니다 — 본 저장소도 같은 자리에 KST 를 답니다 */
  const slotSub = rule.slots.length
    ? `${rule.slots.map((s) => `${s.t} ${s.n}개`).join(' · ')} · KST`
    : '시간 자동'

  return (
    <section className={styles.queue} aria-label="일간 배포 대기">
      <div className={styles.head}>
        <strong>발행 대기 중인 영상 {waiting}개</strong>
        <span>플랫폼마다 정한 시간대(KST)가 되면 순서대로 나갑니다</span>
      </div>

      <div className={styles.filters}>
        {KINDS.map((k) => (
          <button key={k} type="button" className={styles.kindBtn} aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k} {countOf(k)}
          </button>
        ))}
        <div className={styles.viewSwitch} aria-label="보기 방식">
          {([['list', '리스트'], ['grid', '썸네일']] as const).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.groupHead}>
        <span className={styles.groupLabel}>{dayLabel(day)} 배포 예정</span>
        <span className={styles.groupSub}>{publishes ? slotSub : '이 날은 발행이 없습니다'}</span>
      </div>

      {!visibleGroups.length ? (
        <div className={styles.empty}>
          {publishes ? `${kind} 영상은 대기 중인 게 없습니다` : '이 날은 발행 요일이 아닙니다'}
        </div>
      ) : (
        visibleGroups.map((g) => (
          <div key={g.channel.name} className={styles.platformGroup}>
            <div className={styles.platformHead}>
              <i data-platform={g.channel.icon}>{markOf(g.channel.icon)}</i>
              <strong>{platOf(g.channel.icon).name}</strong>
              <span className={styles.account}>{g.channel.name.split(' · ')[1] ?? g.channel.name}</span>
              <span className={styles.platformCount}>{g.items.filter((x) => !x.past).length}개 예정</span>
              <span className={cx(styles.connection, (g.channel.expired || g.channel.gated) && styles.connectionWarn)}>
                {g.channel.expired ? '● 재연결 필요' : g.channel.gated ? '● 기록만' : '● 연결됨'}
              </span>
            </div>

            {/* 표 머리글은 플랫폼마다 한 번, 시간대는 그 안에서 줄로 나눕니다 */}
            {view === 'list' && (
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>제목</span>
                  <span>종류</span>
                  <span>상태</span>
                  <span>길이</span>
                  <span />
                </div>
                {g.slots.map((slot) => (
                  <Fragment key={slot.time}>
                    <div className={styles.slotRow}>
                      <strong>{slot.time}</strong>
                      <span className={styles.slotCount}>
                        {slot.items.length}개
                        {slot.cap > slot.items.length && ` · ${slot.cap - slot.items.length}자리 남음`}
                      </span>
                    </div>
                    {slot.items.map((x) => (
                      <div key={`${x.entry.t}|${x.hold.id}`} className={styles.row}>
                        <div className={styles.rowTitle}>
                          <span title={titleOf(x.hold)}>{titleOf(x.hold)}</span>
                          {x.alsoOn.length > 0 && <small>{x.alsoOn.join(' · ')} 에도 나감</small>}
                        </div>
                        <span>
                          <span className={styles.kindChip} style={toneOf(x.hold.kind)}>
                            {x.hold.kind}
                          </span>
                        </span>
                        <span className={cx(styles.state, styles[x.tone])}>{x.state}</span>
                        <span className={styles.meta}>{x.hold.dur}</span>
                        <div className={styles.actions}>{actions(x, rule, store, day, g.channel.name)}</div>
                      </div>
                    ))}
                  </Fragment>
                ))}
              </div>
            )}

            {view === 'grid' && g.slots.map((slot) => (
              <div key={slot.time} className={styles.slotGroup}>
                <div className={styles.slotHead}>
                  <strong>{slot.time}</strong>
                  <span className={styles.slotCount}>
                    {slot.items.length}개{slot.cap > slot.items.length && ` · ${slot.cap - slot.items.length}자리 남음`}
                  </span>
                </div>
              <div className={styles.cards}>
                {slot.items.map((x) => (
                  <article key={`${x.entry.t}|${x.hold.id}`} className={styles.card}>
                    <button
                      type="button"
                      className={styles.cardThumb}
                      style={{ aspectRatio: x.hold.kind === '숏폼' ? '9 / 16' : '16 / 9' }}
                      aria-label={`${titleOf(x.hold)} 재생`}
                      onClick={() =>
                        store.setPlayer({
                          title: titleOf(x.hold),
                          kind: x.hold.kind,
                          meta: `${platOf(g.channel.icon).name} · ${d.label} ${x.entry.t}`,
                        })
                      }
                    >
                      <img src={x.hold.kind === '숏폼' ? portraitThumb(x.hold.img) : frameThumb(x.hold.img)} alt="" draggable={false} />
                      {x.hold.rendering && <span className={styles.cardFlag}>인코딩 중…</span>}
                      {!x.hold.rendering && x.hold.cueStale && (
                        <span className={cx(styles.cardFlag, styles.cardFlagWarn)}>수정 반영 전</span>
                      )}
                      <span className={styles.cardChips}>
                        <span>{x.hold.dur}</span>
                        <span>{x.entry.t}</span>
                      </span>
                    </button>
                    <div className={styles.cardBody}>
                      <div className={styles.cardChipRow}>
                        <span className={styles.kindChip} style={toneOf(x.hold.kind)}>
                          {x.hold.kind}
                        </span>
                        <span className={cx(styles.state, styles[x.tone])}>{x.state}</span>
                      </div>
                      <div className={styles.cardTitle}>{titleOf(x.hold)}</div>
                      {x.alsoOn.length > 0 && <div className={styles.alsoOn}>{x.alsoOn.join(' · ')} 에도 나감</div>}
                      <div className={styles.actions}>{actions(x, rule, store, day, g.channel.name, true)}</div>
                    </div>
                  </article>
                ))}
              </div>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  )
}

const titleOf = (h: Hold) => h.line1 || h.title
const toneOf = (kind: HoldKind) => ({ background: KIND_TONE[kind].bg, color: KIND_TONE[kind].fg })
const markOf = (icon: string | undefined) =>
  icon === 'NC' ? 'N' : icon === 'TT' ? '♪' : icon === 'IG' ? '◎' : '▶'

/** "9.30 (수)" → "9월 30일 (수) · 오늘" */
function dayLabel(day: number) {
  const d = DAYS7[day]
  const [md, wd] = d.label.split(' ')
  const [month, date] = md.split('.')
  return `${month}월 ${date}일 ${wd}${day === 0 ? ' · 오늘' : ''}`
}

/** 상태 얼굴 — 본 저장소와 같은 순서로 봅니다 */
function faceOf(hold: Hold, channel: RuleChannel, past: boolean): { state: string; tone: QueueItem['tone'] } {
  if (past) return { state: '발행됨', tone: 'done' }
  if (hold.rendering) return { state: '인코딩 중', tone: 'render' }
  if (hold.cueStale) return { state: '수정 반영 전', tone: 'render' }
  if (channel.expired) return { state: '인증 만료', tone: 'hold' }
  if (channel.gated) return { state: '기록만', tone: 'hold' }
  return { state: '발행 예정', tone: 'ready' }
}

function actions(x: QueueItem, rule: Rule, store: AutoDeployStore, day: number, channel: string, grow?: boolean) {
  return (
    <>
      <button type="button" className={cx(styles.primaryBtn, grow && styles.grow)} onClick={() => store.pickHold(x.hold.id)}>
        확인·수정
      </button>
      {!x.past && (
        <button
          type="button"
          className={styles.ghostBtn}
          title={`${platOf(rule.channels.find((c) => c.name === channel)?.icon ?? 'YT').name} 편성에서만 뺍니다`}
          onClick={() => store.removeFrom(rule, channel, day, x.entry.t, x.hold.id)}
        >
          빼기
        </button>
      )}
    </>
  )
}
