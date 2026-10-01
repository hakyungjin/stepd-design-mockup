import { DAYS7 } from '../constants'
import { isPast } from '../domain/plan'
import type { PlanEntry, Rule } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import styles from './schedule.module.css'

export function ScheduleMoveSelect({ rule, entry, store }: { rule: Rule; entry: PlanEntry; store: AutoDeployStore }) {
  return <select className={styles.moveSelect} aria-label="발행 시간 이동" value={`${entry.day}|${entry.t}`} onChange={(e) => {
    const [day, t] = e.target.value.split('|')
    store.place(rule, entry.hid, entry.ch, Number(day), t, entry)
    store.setPop(null)
  }}>
    {DAYS7.filter((d) => rule.weekdays.includes(d.wd)).map((d) => <optgroup key={d.i} label={`${d.short} · ${d.label}`}>
      {rule.slots.map((s) => <option key={s.t} value={`${d.i}|${s.t}`} disabled={isPast({ day: d.i, t: s.t })}>
        {d.short} {s.t}{d.i === entry.day && s.t === entry.t ? ' · 현재' : ''}
      </option>)}
    </optgroup>)}
  </select>
}
