/*
 * 자동 배포 화면의 상태와 모든 동작.
 * ------------------------------------------------------------------
 * 화면 컴포넌트는 여기서 받은 값만 그립니다.
 * STEPD 연동 시 TODO(api) 표시가 붙은 곳에 서버 호출을 넣으세요.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CUE_MAX,
  CUE_TEXT_MAX,
  DAYS7,
  SLOT_TIMES,
  TEMPLATE_PRESETS,
  durSec,
  parseT,
  platOf,
} from '../constants'
import {
  INITIAL_CREDIT,
  ME,
  RUN_CAP,
  RUN_PAGE,
  createRules,
  mkCues,
} from '../data/mockData'
import { buildPlan, canPlace, diffRule, isPast, looksChanged, upcomingOf } from '../domain/plan'
import type {
  ConfirmCfg,
  DetailTab,
  DrawerTab,
  Hold,
  PlanEntry,
  PlanFrom,
  PlayerCfg,
  PopState,
  Rule,
  Slot,
  WizardForm,
} from '../types'

const TOAST_MS = 3400
const PER_PAGE = 7
const RENDER_SEC = 6

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

export const blankWizardForm = (): WizardForm => ({
  program: '',
  kind: '쇼츠',
  scope: '최근 3개 회차',
  future: true,
  template: '예능 팝',
  aspect: '위 자막띠',
  thumb: '프레임 추출',
  lang: '한국어',
  ...TEMPLATE_PRESETS['예능 팝'],
  channels: ['YouTube · ENA 공식'],
  weekdays: [5, 6],
  slots: [
    { t: '09:00', n: 2 },
    { t: '18:00', n: 1 },
  ],
  reframe: '중앙 고정',
  gate: 'hold_on_issue',
})

export function useAutoDeploy(initialRules?: Rule[]) {
  const [rules, setRules] = useState<Rule[]>(() => initialRules ?? createRules())

  /* 목록 */
  const [query, setQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [page, setPage] = useState(0)

  /* 드로어 */
  const [drawer, setDrawer] = useState<string | null>(null)
  const [tab, setTabState] = useState<DrawerTab>('review')
  const [draft, setDraft] = useState<Rule | null>(null)
  const [programMenuOpen, setProgramMenuOpen] = useState(false)
  const [focus, setFocus] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('post')
  const [allKind, setAllKind] = useState('전체')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [runLimit, setRunLimit] = useState(RUN_PAGE)

  /* 계획표 */
  const [planOverride, setPlanOverride] = useState<Record<string, PlanEntry[]>>({})
  const [cleared, setClearedState] = useState<Record<string, string[]>>({})
  const [planHistory, setPlanHistory] = useState<Record<string, { plan: PlanEntry[]; cleared: string[] }[]>>({})
  const [cellHover, setCellHover] = useState<string | null>(null)
  const [pop, setPop] = useState<PopState | null>(null)

  /* 전역 */
  const [paused, setPaused] = useState(false)
  const [credit] = useState(INITIAL_CREDIT)
  const [toast, setToast] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmCfg | null>(null)
  const [player, setPlayer] = useState<PlayerCfg | null>(null)
  const [wizard, setWizard] = useState<{ step: number; form: WizardForm } | null>(null)

  const cycleEveryMin = 10

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef<{ hid: string; from: PlanFrom | null } | null>(null)

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (renderTimer.current) clearTimeout(renderTimer.current)
    },
    [],
  )

  const say = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  const ask = useCallback((cfg: ConfirmCfg) => setConfirm(cfg), [])

  /* ---------------- 목록 ---------------- */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rules.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q)) &&
        (channelFilter === 'all' || r.channels.some((c) => c.name.indexOf(channelFilter) === 0)) &&
        (stateFilter === 'all' || r.state === stateFilter),
    )
  }, [channelFilter, query, rules, stateFilter])

  const pageCount = Math.max(Math.ceil(filtered.length / PER_PAGE), 1)
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE)

  /* ---------------- 계획 ---------------- */

  const planOf = useCallback(
    (rule: Rule): PlanEntry[] => planOverride[rule.id] ?? buildPlan(rule),
    [planOverride],
  )

  const upcomingCount = useCallback((rule: Rule) => upcomingOf(planOf(rule)).length, [planOf])

  const setPlan = useCallback(
    (rule: Rule, fn: (cur: PlanEntry[]) => PlanEntry[]) => {
      const cur = planOf(rule).map((p) => ({ ...p }))
      setPlanHistory((m) => ({ ...m, [rule.id]: [...(m[rule.id] ?? []).slice(-19), { plan: cur, cleared: cleared[rule.id] ?? [] }] }))
      setPlanOverride((m) => ({ ...m, [rule.id]: fn(cur) }))
    },
    [planOf, cleared],
  )

  const undoPlan = useCallback((rule: Rule) => {
    const history = planHistory[rule.id] ?? []
    const last = history.at(-1)
    if (!last) return
    setPlanOverride((m) => ({ ...m, [rule.id]: last.plan }))
    setClearedState((m) => ({ ...m, [rule.id]: last.cleared }))
    setPlanHistory((m) => ({ ...m, [rule.id]: history.slice(0, -1) }))
    setPop(null)
    say('이전 편성으로 되돌렸습니다')
  }, [planHistory, say])

  const setCleared = useCallback((rule: Rule, key: string, on: boolean) => {
    setClearedState((m) => {
      const cur = new Set(m[rule.id] ?? [])
      if (on) cur.add(key)
      else cur.delete(key)
      return { ...m, [rule.id]: [...cur] }
    })
  }, [])

  /** TODO(api): PATCH /auto-rules/:id/plan — 칸 옮기기·넣기 */
  const place = useCallback(
    (rule: Rule, hid: string, ch: string, day: number, t: string, from?: PlanFrom | null) => {
      const h = rule.holds.find((x) => x.id === hid)
      if (!h) return
      if (from && from.ch === ch && from.day === day && from.t === t) return
      const plan = planOf(rule)
      const check = canPlace(rule, plan, h, ch, day, t, from)
      if (!check.ok) {
        say(check.reason)
        return
      }
      const P = platOf(rule.channels.find((c) => c.name === ch)?.icon ?? 'YT')
      setPlan(rule, (a) => {
        let next = a
        if (from)
          next = next.filter(
            (p) => !(p.ch === from.ch && p.day === from.day && p.t === from.t && p.hid === hid),
          )
        return [...next, { hid, ch, day, t }]
      })
      setCleared(rule, `${ch}|${day}|${t}`, false)
      if (from) setCleared(rule, `${from.ch}|${from.day}|${from.t}`, true)
      say(`${from ? '옮겼습니다' : '넣었습니다'} — ${P.name} ${DAYS7[day].short} ${t}`)
    },
    [planOf, say, setCleared, setPlan],
  )

  /** TODO(api): PATCH /auto-rules/:id/plan — 칸의 영상 교체 */
  const replaceIn = useCallback(
    (rule: Rule, ch: string, day: number, t: string, oldId: string, newId: string) => {
      const hold = rule.holds.find((h) => h.id === newId)
      const plan = planOf(rule)
      if (isPast({ day, t }) || !hold) return
      const check = canPlace(rule, plan.filter((p) => !(p.ch === ch && p.day === day && p.t === t && p.hid === oldId)), hold, ch, day, t)
      if (!check.ok) { say(check.reason); return }
      setPlan(rule, (a) =>
        a.map((p) =>
          p.ch === ch && p.day === day && p.t === t && p.hid === oldId ? { ...p, hid: newId } : p,
        ),
      )
      const P = platOf(rule.channels.find((c) => c.name === ch)?.icon ?? 'YT')
      say(`바꿨습니다 — ${P.name} ${DAYS7[day].short} ${t}`)
    },
    [say, setPlan, planOf],
  )

  /** TODO(api): DELETE /auto-rules/:id/plan/:slot — 칸에서 빼기 */
  const removeFrom = useCallback(
    (rule: Rule, ch: string, day: number, t: string, hid: string) => {
      if (isPast({ day, t })) return
      setPlan(rule, (a) =>
        a.filter((p) => !(p.ch === ch && p.day === day && p.t === t && p.hid === hid)),
      )
      setCleared(rule, `${ch}|${day}|${t}`, true)
      const P = platOf(rule.channels.find((c) => c.name === ch)?.icon ?? 'YT')
      say(`${P.name} ${DAYS7[day].short} ${t}에서 뺐습니다 — 다른 플랫폼은 그대로입니다`)
    },
    [say, setCleared, setPlan],
  )

  /**
   * 자동 배치 — 그 날 비어 있는 자리를 아직 안 쓴 영상으로 채웁니다.
   * 편집자가 손으로 채워도 되고, 이 버튼을 누르면 한 번에 채워집니다.
   *
   * TODO(api): POST /auto-rules/:id/plan/autofill
   */
  const autoFill = useCallback(
    (rule: Rule, day: number) => {
      const plan = planOf(rule)
      const added: PlanEntry[] = []

      rule.channels.forEach((channel) => {
        rule.slots.forEach((slot) => {
          if (isPast({ day, t: slot.t })) return
          const here = [...plan, ...added].filter(
            (p) => p.ch === channel.name && p.day === day && p.t === slot.t,
          )
          /* 이 채널에 이미 올라간 영상은 또 넣지 않습니다 */
          const onChannel = new Set([...plan, ...added].filter((p) => p.ch === channel.name).map((p) => p.hid))
          for (let i = here.length; i < slot.n; i++) {
            const hold = rule.holds.find(
              (h) => !onChannel.has(h.id) && canPlace(rule, [...plan, ...added], h, channel.name, day, slot.t).ok,
            )
            if (!hold) break
            added.push({ hid: hold.id, ch: channel.name, day, t: slot.t })
            onChannel.add(hold.id)
          }
        })
      })

      if (!added.length) {
        say('빈 자리가 없거나 넣을 영상이 남아 있지 않습니다')
        return
      }
      setPlan(rule, (a) => [...a, ...added])
      added.forEach((p) => setCleared(rule, `${p.ch}|${p.day}|${p.t}`, false))
      say(`${DAYS7[day].short} 빈 자리 ${added.length}개를 채웠습니다`)
    },
    [planOf, say, setCleared, setPlan],
  )

  /* ---------------- 드로어 ---------------- */

  const selected = rules.find((r) => r.id === drawer) ?? null
  const changes = selected && draft ? diffRule(selected, draft) : []

  const openDrawer = useCallback(
    (id: string, next: DrawerTab = 'review') => {
      setDrawer(id)
      setTabState(next)
      setFocus(null)
      setProgramMenuOpen(false)
      setRunLimit(RUN_PAGE)
      setRules((list) => {
        const found = list.find((r) => r.id === id)
        setDraft(found ? clone(found) : null)
        return list
      })
    },
    [],
  )

  const closeDrawer = useCallback(() => {
    const dirty = changes.length > 0
    setDrawer(null)
    setProgramMenuOpen(false)
    setDraft(null)
    setPop(null)
    if (dirty) say('설정 창을 닫았습니다. 저장하지 않은 변경사항은 적용되지 않았습니다.')
  }, [changes.length, say])

  const setTab = useCallback((t: DrawerTab) => {
    setTabState(t)
    if (t === 'runs') setRunLimit(RUN_PAGE)
  }, [])

  const holds = selected?.holds ?? []
  const hold = holds.find((h) => h.id === focus) ?? holds[0] ?? null

  /**
   * 고른 영상의 상세로 들어갑니다.
   * 원본은 고른 영상을 holds 맨 앞으로 옮기는데, 기본 계획이 holds 순서에서 나오다 보니
   * 상세를 열 때마다 계획표가 다시 짜여 "편성 안 됨"으로 보였습니다. 순서는 그대로 둡니다.
   */
  const pickHold = useCallback((id: string) => {
    setFocus(id)
    setDetailTab('post')
  }, [])

  const patchHold = useCallback(
    (holdId: string, fn: (h: Hold) => Hold) => {
      if (!drawer) return
      setRules((list) =>
        list.map((r) =>
          r.id === drawer ? { ...r, holds: r.holds.map((h) => (h.id === holdId ? fn(h) : h)) } : r,
        ),
      )
    },
    [drawer],
  )

  /** 렌더가 끝나면 스스로 풀립니다 — 새로고침할 필요 없음 */
  const startRender = useCallback(
    (holdId: string, sec = RENDER_SEC) => {
      const ruleId = drawer
      if (!ruleId) return
      setRules((list) =>
        list.map((r) =>
          r.id === ruleId
            ? { ...r, holds: r.holds.map((h) => (h.id === holdId ? { ...h, rendering: true } : h)) }
            : r,
        ),
      )
      if (renderTimer.current) clearTimeout(renderTimer.current)
      renderTimer.current = setTimeout(() => {
        setRules((list) =>
          list.map((r) =>
            r.id === ruleId
              ? {
                  ...r,
                  holds: r.holds.map((h) =>
                    h.id === holdId ? { ...h, rendering: false, dirty: false } : h,
                  ),
                }
              : r,
          ),
        )
        say('렌더가 끝났습니다 — 새 결과물로 바뀌었습니다')
      }, sec * 1000)
    },
    [drawer, say],
  )

  const editHold = useCallback(
    (field: keyof Hold, value: Hold[keyof Hold]) => {
      if (!hold) return
      if (hold.rendering && field !== 'rendering') {
        say('렌더 중에는 수정할 수 없습니다 (약 50~90초)')
        return
      }
      patchHold(hold.id, (h) => ({ ...h, [field]: value, dirty: true }))
    },
    [hold, patchHold, say],
  )

  /* ---------------- 자막 ---------------- */

  const editCue = useCallback(
    (i: number, text: string) => {
      if (!hold) return
      patchHold(hold.id, (h) => ({
        ...h,
        dirty: true,
        cues: h.cues.map((c, k) => (k === i ? { ...c, text: text.slice(0, CUE_TEXT_MAX) } : c)),
      }))
    },
    [hold, patchHold],
  )

  /** 시각 편집 — 클립 구간(0~dur)으로 클램프합니다 */
  const setCueTime = useCallback(
    (i: number, which: 'start' | 'end', raw: string | number) => {
      if (!hold) return
      const parsed = typeof raw === 'number' ? raw : parseT(raw)
      if (parsed == null) return
      const max = durSec(hold.dur)
      const v = Math.max(0, Math.min(max, Math.round(parsed * 10) / 10))
      patchHold(hold.id, (h) => ({
        ...h,
        dirty: true,
        cues: h.cues.map((c, k) => (k === i ? { ...c, [which]: v } : c)),
      }))
    },
    [hold, patchHold],
  )

  const nudgeCue = useCallback(
    (i: number, which: 'start' | 'end', delta: number) => {
      const c = hold?.cues[i]
      if (!c) return
      setCueTime(i, which, c[which] + delta)
    },
    [hold, setCueTime],
  )

  /** 줄 추가 — 앞줄 끝 ~ 뒷줄 시작 사이에 넣습니다 */
  const addCue = useCallback(
    (at: number) => {
      if (!hold) return
      if (hold.cues.length >= CUE_MAX) {
        say(`자막은 최대 ${CUE_MAX}줄입니다`)
        return
      }
      const max = durSec(hold.dur)
      const prev = hold.cues[at - 1]
      const next = hold.cues[at]
      const start = prev ? prev.end + 0.1 : 0
      // 남은 구간이 0.5초도 없으면 만들지 않습니다 — 시작=끝인 잘못된 줄을 막습니다
      if (start >= max - 0.4) {
        say('남은 구간이 없습니다 — 앞줄의 끝 시각을 줄여 주세요')
        return
      }
      const end = Math.min(next ? Math.max(next.start - 0.1, start + 0.5) : start + 2, max)
      const row = { id: `n${at}-${hold.cues.length}-${Math.round(start * 10)}`, start, end, text: '', isNew: true }
      patchHold(hold.id, (h) => ({
        ...h,
        dirty: true,
        cues: [...h.cues.slice(0, at), row, ...h.cues.slice(at)],
      }))
    },
    [hold, patchHold, say],
  )

  const focusCue = useCallback(
    (i: number) => {
      if (!hold) return
      patchHold(hold.id, (h) => ({ ...h, cueIndex: i }))
    },
    [hold, patchHold],
  )

  const resetCues = useCallback(() => {
    if (!hold) return
    const cur = hold
    ask({
      title: '자막을 전체 되돌릴까요?',
      ok: '되돌리기',
      danger: true,
      body: cur.cueStale
        ? '고친 내용이 사라지고 재분석으로 갱신된 새 원문(STT)을 받습니다.'
        : '고친 내용이 사라지고 STT 원문으로 되돌아갑니다.',
      run: () => {
        patchHold(cur.id, (h) => ({
          ...h,
          cues: mkCues(h),
          cueIndex: 0,
          cueStale: false,
          dirty: true,
        }))
        say('자막을 원문으로 되돌렸습니다')
      },
    })
  }, [ask, hold, patchHold, say])

  /** TODO(api): PUT /holds/:id/cues — 저장하면 이 클립만 다시 굽습니다 */
  const saveCues = useCallback(() => {
    if (!hold) return
    if (hold.cues.some((c) => c.end <= c.start)) {
      say('끝이 시작보다 빠른 줄이 있습니다 — 고친 뒤 저장하세요')
      return
    }
    const removed = hold.cues.filter((c) => !c.text.trim()).length
    patchHold(hold.id, (h) => ({
      ...h,
      dirty: false,
      cueStale: false,
      cueSavedAt: '방금',
      cueSavedBy: ME,
      cues: h.cues.filter((c) => c.text.trim()).map((c) => ({ ...c, isNew: false })),
    }))
    say(`저장했습니다${removed ? ` — 빈 줄 ${removed}개 삭제` : ''} — 이 클립만 다시 굽습니다 (50~90초)`)
    startRender(hold.id)
  }, [hold, patchHold, say, startRender])

  /** TODO(api): PUT /holds/:id — 게시물·타이틀 저장 */
  const saveHold = useCallback(() => {
    if (!hold) return
    if (hold.rendering) {
      say('렌더가 끝나면 저장할 수 있습니다')
      return
    }
    say('저장했습니다 — 이 클립만 즉시 다시 굽습니다 (50~90초)')
    startRender(hold.id)
  }, [hold, say, startRender])

  const openPlayer = useCallback(() => {
    if (!hold) return
    if (hold.rendering) {
      say('렌더 중입니다 — 끝나면 자동으로 새 결과물이 재생됩니다')
      return
    }
    setPlayer({
      title: hold.line1 || hold.title,
      kind: hold.kind,
      meta: `${hold.kind === '숏폼' ? '1080×1920' : '1920×1080'} · ${hold.dur}`,
    })
  }, [hold, say])

  /* ---------------- 설정(draft) ---------------- */

  const edit = useCallback((fn: (d: Rule) => void) => {
    setDraft((cur) => {
      if (!cur) return cur
      const d = clone(cur)
      fn(d)
      return d
    })
  }, [])

  const toggleWeekday = (i: number) =>
    edit((d) => {
      d.weekdays = d.weekdays.includes(i)
        ? d.weekdays.filter((x) => x !== i)
        : [...d.weekdays, i].sort((a, b) => a - b)
    })

  const addSlot = () =>
    edit((d) => {
      const t = SLOT_TIMES.slice(0, 6).find((c) => !d.slots.some((s) => s.t === c)) ?? '23:00'
      d.slots = [...d.slots, { t, n: 1 }].sort((a, b) => a.t.localeCompare(b.t))
    })

  const removeSlot = (i: number) =>
    edit((d) => {
      d.slots = d.slots.filter((_, k) => k !== i)
    })

  const setSlotTime = (i: number, t: string) =>
    edit((d) => {
      d.slots = d.slots.map((s, k) => (k === i ? { ...s, t } : s)).sort((a, b) => a.t.localeCompare(b.t))
    })

  const setSlotCount = (i: number, n: number) =>
    edit((d) => {
      d.slots = d.slots.map((s, k) => (k === i ? { ...s, n: Math.max(1, Math.min(9, n)) } : s))
    })

  const toggleProgram = (name: string) =>
    edit((d) => {
      d.programs = d.programs.includes(name)
        ? d.programs.filter((p) => p !== name)
        : [...d.programs, name]
    })

  /** 템플릿을 고르면 배치 값이 함께 바뀝니다 */
  const setLookField = (key: 'template' | 'aspect' | 'orient' | 'thumb' | 'lang', value: string) =>
    edit((d) => {
      d[key] = value
      if (key === 'template') Object.assign(d, TEMPLATE_PRESETS[d.template])
      // 서버 가드: AI 리프레임은 세로에서만
      if (key === 'orient' && d.orient.indexOf('가로') === 0) d.orient = '가로 · 리프레임 없음'
    })

  const applyTemplate = () => {
    edit((d) => {
      Object.assign(d, TEMPLATE_PRESETS[d.template])
    })
    say('템플릿 기본값으로 되돌렸습니다')
  }

  /** TODO(api): PUT /auto-rules/:id — 설정 저장 */
  const save = useCallback(() => {
    if (!selected || !draft) return
    const restamp = looksChanged(selected, draft)
    // 서버 응답(restamped)을 대신한 값
    const n = 2 + (draft.slots.length % 3)
    const snapshot = clone(draft)
    setRules((list) => list.map((r) => (r.id === drawer ? { ...snapshot, holds: r.holds } : r)))
    say(restamp ? `저장했습니다 — 아직 안 나간 영상 ${n}개를 다시 만듭니다` : '저장했습니다')
  }, [draft, drawer, say, selected])

  const revert = useCallback(() => {
    setDraft(selected ? clone(selected) : null)
  }, [selected])

  const setRuleState = useCallback(
    (id: string, next: Rule['state']) => {
      setRules((list) => list.map((r) => (r.id === id ? { ...r, state: next } : r)))
      setDraft((d) => (d && d.id === id ? { ...d, state: next } : d))
    },
    [],
  )

  /** TODO(api): DELETE /auto-rules/:id */
  const removeRule = useCallback(() => {
    if (!draft) return
    const d = draft
    ask({
      title: '자동배포를 삭제할까요?',
      danger: true,
      ok: '삭제',
      body: '이 계획과 발행 규칙이 사라집니다. 이미 발행된 영상은 그대로 남고, 발행 예정 영상은 나가지 않습니다.',
      lines: [
        { k: '프로그램', v: d.name },
        { k: '발행 예정', v: `${holds.length}개` },
        { k: '지난 30일 발행', v: `${d.monthly}건` },
      ],
      run: () => {
        setRules((list) => list.filter((r) => r.id !== d.id))
        setDrawer(null)
        setDraft(null)
        setFocus(null)
        say(`${d.name} 자동배포를 삭제했습니다`)
      },
    })
  }, [ask, draft, holds.length, say])

  /* ---------------- 전역 ---------------- */

  const togglePausedAll = useCallback(() => {
    ask({
      title: paused ? '자동배포 전체를 재개할까요?' : '자동배포 전체를 일시정지할까요?',
      ok: paused ? '재개' : '전체 일시정지',
      danger: !paused,
      body: paused
        ? '모든 계획이 다시 새 회차를 잡기 시작합니다.'
        : '새 회차는 잡지 않습니다. 대기열에 들어간 건은 그대로 나갑니다.',
      run: () => {
        setPaused((v) => !v)
        say(paused ? '자동배포를 재개했습니다' : '자동배포 전체를 일시정지했습니다')
      },
    })
  }, [ask, paused, say])

  const toggleRule = useCallback(
    (rule: Rule) => {
      const off = rule.state === '운영 중'
      const next: Rule['state'] = off ? '일시정지' : '운영 중'
      ask({
        title: off ? '이 계획을 끌까요?' : '이 계획을 다시 켤까요?',
        ok: off ? '끄기' : '켜기',
        danger: off,
        body: off
          ? '이 계획의 모든 발행이 멈춥니다 — 편성된 발행 예정 영상도 나가지 않습니다. 이미 발행이 시작된 건만 마저 나갑니다.'
          : `최대 ${cycleEveryMin}분 안에 이 계획이 새 회차를 잡기 시작합니다.`,
        lines: [
          { k: '프로그램', v: rule.name },
          { k: '발행 예정', v: `${upcomingCount(rule)}개` },
        ],
        run: () => {
          setRuleState(rule.id, next)
          say(
            off
              ? `${rule.name} 자동배포를 껐습니다 — 새 회차를 잡지 않습니다`
              : `${rule.name} 자동배포를 켰습니다 — 곧 새 회차를 잡습니다`,
          )
        },
      })
    },
    [ask, say, setRuleState, upcomingCount],
  )

  const runOnce = useCallback(() => {
    say('지금 확인했습니다 — 계획을 한 번 점검했습니다')
  }, [say])

  /* ---------------- 마법사 ---------------- */

  const wzOpen = () => setWizard({ step: 0, form: blankWizardForm() })
  const wzClose = () => setWizard(null)
  const wzGo = (i: number) => setWizard((w) => (w ? { ...w, step: i } : w))
  const wzSet = <K extends keyof WizardForm>(k: K, v: WizardForm[K]) =>
    setWizard((w) => (w ? { ...w, form: { ...w.form, [k]: v } } : w))
  const wzSetTemplate = (t: string) =>
    setWizard((w) => (w ? { ...w, form: { ...w.form, template: t, ...TEMPLATE_PRESETS[t] } } : w))
  const wzApplyTemplate = () =>
    setWizard((w) => (w ? { ...w, form: { ...w.form, ...TEMPLATE_PRESETS[w.form.template] } } : w))
  const wzAddSlot = () =>
    setWizard((w) => {
      if (!w) return w
      const t = SLOT_TIMES.find((c) => !w.form.slots.some((x) => x.t === c)) ?? '23:00'
      const slots: Slot[] = [...w.form.slots, { t, n: 1 }].sort((a, b) => a.t.localeCompare(b.t))
      return { ...w, form: { ...w.form, slots } }
    })

  /** TODO(api): POST /auto-rules */
  const wzCreate = useCallback(() => {
    if (!wizard) return
    const f = wizard.form
    const rule: Rule = {
      id: `rn${Date.now()}`,
      name: f.program,
      initial: f.program.slice(0, 1),
      color: '#4d5f7a',
      state: '운영 중',
      channels: f.channels.map((n) => ({
        name: n,
        icon: n.indexOf('네이버') === 0 ? 'NC' : n.indexOf('TikTok') === 0 ? 'TT' : 'YT',
        sub: '새로 연결됨',
        gated: n.indexOf('TikTok') === 0,
      })),
      programs: [f.program],
      mediaKind: f.kind,
      gatePolicy: f.gate,
      weekdays: f.weekdays,
      slots: f.slots.slice(),
      aspect: f.aspect,
      template: f.template,
      thumb: f.thumb,
      orient: '세로 · AI 리프레임',
      lang: f.lang,
      titleSize: f.titleSize,
      lineHeight: f.lineHeight,
      letter: f.letter,
      titleShadow: f.titleShadow,
      titleTop: f.titleTop,
      capBottom: f.capBottom,
      logo: f.logo,
      monthly: 0,
      created: '09/22',
      ruleCode: 'rule_new1',
      ep: 1,
      dailyQuota: 3,
      holds: [],
    }
    setRules((list) => [rule, ...list])
    setWizard(null)
    setPage(0)
    say(`${f.program} 자동배포를 만들었습니다 — 분석이 끝난 회차부터 제작을 시작합니다`)
  }, [say, wizard])

  return {
    /* 목록 */
    rules,
    filtered,
    pageRows,
    page: safePage,
    pageCount,
    setPage,
    perPage: PER_PAGE,
    query,
    setQuery: (v: string) => {
      setQuery(v)
      setPage(0)
    },
    channelFilter,
    setChannelFilter: (v: string) => {
      setChannelFilter(v)
      setPage(0)
    },
    stateFilter,
    setStateFilter: (v: string) => {
      setStateFilter(v)
      setPage(0)
    },

    /* 요약 */
    activeCount: rules.filter((r) => r.state === '운영 중').length,
    pausedCount: rules.filter((r) => r.state === '일시정지').length,
    reviewTotal: rules.reduce((n, r) => n + upcomingCount(r), 0),
    runOnce,
    credit,
    paused,
    togglePausedAll,
    toggleRule,

    /* 드로어 */
    selected,
    draft,
    tab,
    setTab,
    openDrawer,
    closeDrawer,
    holds,
    hold,
    focus,
    setFocus,
    pickHold,
    detailTab,
    setDetailTab,
    allKind,
    setAllKind,
    viewMode,
    setViewMode,
    runLimit,
    moreRuns: () => setRunLimit((n) => Math.min(n + RUN_PAGE, RUN_CAP)),

    /* 계획 */
    planOf,
    undoPlan,
    planHistory,
    upcomingCount,
    place,
    replaceIn,
    removeFrom,
    autoFill,
    cleared,
    cellHover,
    setCellHover,
    pop,
    setPop,
    dragRef,
    isPast,

    /* 상세 편집 */
    editHold,
    editCue,
    setCueTime,
    nudgeCue,
    addCue,
    focusCue,
    resetCues,
    saveCues,
    saveHold,
    openPlayer,

    /* 설정 */
    programMenuOpen,
    setProgramMenuOpen,
    edit,
    toggleWeekday,
    addSlot,
    removeSlot,
    setSlotTime,
    setSlotCount,
    toggleProgram,
    setLookField,
    applyTemplate,
    changes,
    willRestamp: selected && draft ? looksChanged(selected, draft) : false,
    save,
    revert,
    removeRule,

    /* 창 */
    toast,
    say,
    confirm,
    setConfirm,
    player,
    setPlayer,
    wizard,
    wzOpen,
    wzClose,
    wzGo,
    wzSet,
    wzSetTemplate,
    wzApplyTemplate,
    wzAddSlot,
    wzCreate,
  }
}

export type AutoDeployStore = ReturnType<typeof useAutoDeploy>
