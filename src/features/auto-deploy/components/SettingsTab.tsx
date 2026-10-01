/*
 * 자동배포 설정 탭 — 제작 대상 · 어디로 · 언제 · 영상 템플릿 · 알림 · 삭제.
 * 편집은 draft 에만 반영되고, 하단 변경 바에서 저장/되돌리기 합니다.
 */

import {
  ASPECTS,
  LANGS,
  MEDIA_KINDS,
  ORIENTS,
  SLOT_TIMES,
  TEMPLATES,
  THUMBS,
  WD,
  matchesTemplate,
} from '../constants'
import { ALL_PROGRAMS } from '../data/mockData'
import type { MediaKind, Rule } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import { TemplatePreview } from './TemplatePreview'
import { cx } from './shared'
import styles from './settings.module.css'

export function SettingsTab({ draft, store }: { draft: Rule; store: AutoDeployStore }) {
  const slotTotal = draft.slots.reduce((n, x) => n + x.n, 0)

  const lookFields: Array<{ label: string; value: string; key: 'template' | 'aspect' | 'orient' | 'thumb' | 'lang'; options: string[] }> = [
    { label: '템플릿', value: draft.template, key: 'template', options: TEMPLATES },
    { label: '화면비', value: draft.aspect, key: 'aspect', options: ASPECTS },
    { label: '방향 · 리프레임', value: draft.orient, key: 'orient', options: ORIENTS },
    { label: '썸네일', value: draft.thumb, key: 'thumb', options: THUMBS },
    { label: '자막 언어', value: draft.lang, key: 'lang', options: LANGS },
  ]

  const layoutNums: Array<{ key: 'titleSize' | 'lineHeight' | 'letter'; label: string; step: number }> = [
    { key: 'titleSize', label: '타이틀 크기 (%)', step: 5 },
    { key: 'lineHeight', label: '행간', step: 0.1 },
    { key: 'letter', label: '자간', step: 0.5 },
  ]

  const layoutRanges: Array<{ key: 'titleTop' | 'capBottom'; label: string; min: number; max: number }> = [
    { key: 'titleTop', label: '타이틀 위치 · 상단 기준', min: 2, max: 60 },
    { key: 'capBottom', label: '자막 위치 · 하단 기준', min: 4, max: 60 },
  ]

  return (
    <>
      <div className={styles.cols}>
        {/* ---------------- 왼쪽 ---------------- */}
        <div>
          <div className={styles.section}>제작 대상</div>
          <div className={styles.stack}>
            <div>
              <div className={styles.label}>프로그램</div>
              <div className={styles.menuWrap}>
                <button
                  type="button"
                  className={store.programMenuOpen ? styles.triggerOn : styles.trigger}
                  onClick={() => store.setProgramMenuOpen(!store.programMenuOpen)}
                >
                  <span
                    className={draft.programs.length ? styles.triggerText : styles.triggerEmpty}
                  >
                    {draft.programs.length
                      ? draft.programs.length === 1
                        ? draft.programs[0]
                        : `${draft.programs[0]} 외 ${draft.programs.length - 1}개`
                      : '프로그램 선택'}
                  </span>
                  <span className={styles.caret}>▾</span>
                </button>
                {store.programMenuOpen && (
                  <div className={styles.menu}>
                    {ALL_PROGRAMS.map((p) => {
                      const on = draft.programs.includes(p.name)
                      return (
                        <button
                          key={p.name}
                          type="button"
                          className={on ? styles.optionOn : styles.option}
                          onClick={() => store.toggleProgram(p.name)}
                        >
                          <span className={on ? styles.boxOn : styles.box}>{on ? '✓' : ''}</span>
                          <span className={styles.optionLabel}>{p.name}</span>
                          <span className={styles.optionCount}>{p.count}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className={styles.label}>소재 종류</div>
              <div className={styles.segment}>
                {MEDIA_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={cx(styles.segBtn, draft.mediaKind === k && styles.segOn)}
                    onClick={() =>
                      store.edit((d) => {
                        d.mediaKind = k as MediaKind
                      })
                    }
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.section}>어디로</div>
          <div className={styles.channels}>
            {draft.channels.map((c) => (
              <div key={c.name} className={c.gated ? styles.channelGated : styles.channel}>
                <span className={c.gated ? styles.chIconGated : styles.chIcon}>{c.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={c.gated ? styles.chNameGated : styles.chName}>{c.name}</div>
                  <div className={styles.chSub}>{c.sub}</div>
                </div>
                <span className={c.gated ? styles.chTagGated : styles.chTag}>
                  {c.gated ? '실제 발행 꺼짐' : '실제 발행'}
                </span>
              </div>
            ))}
            <button
              type="button"
              className={styles.dashed}
              onClick={() => store.say('채널 추가는 배포 채널 화면에서 연결합니다')}
            >
              + 채널 추가
            </button>
          </div>

          <div className={styles.section}>언제</div>
          <div className={styles.field}>
            <div className={styles.label}>요일</div>
            <div className={styles.weekdays}>
              {WD.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={draft.weekdays.includes(i) ? styles.wdOn : styles.wd}
                  onClick={() => store.toggleWeekday(i)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.slotHead}>
              <span className={styles.label} style={{ marginBottom: 0 }}>
                발행 시각 · 개수 <span className={styles.slotHeadNote}>KST</span>
              </span>
              <span className={styles.slotHeadNote}>하루 합계 {slotTotal}개</span>
            </div>

            <div className={styles.timeline}>
              <div className={styles.timelineAxis} />
              {draft.slots.map((s) => {
                const [hh, mm] = s.t.split(':').map(Number)
                const pct = 4 + ((hh + mm / 60) / 24) * 92
                return (
                  <div key={s.t} className={styles.pin} style={{ left: `${pct}%` }}>
                    {s.t} <b>{s.n}개</b>
                  </div>
                )
              })}
              <div className={styles.timelineStart}>00</div>
              <div className={styles.timelineEnd}>24</div>
            </div>

            <div className={styles.slots}>
              {draft.slots.map((s, i) => (
                <div key={`${s.t}-${i}`} className={styles.slot}>
                  <select
                    className={styles.slotTime}
                    value={s.t}
                    onChange={(e) => store.setSlotTime(i, e.target.value)}
                  >
                    {/* 지금 값이 기본 후보에 없을 수도 있어(예: 19:00) 함께 넣어 줍니다 */}
                    {(SLOT_TIMES.includes(s.t) ? SLOT_TIMES : [...SLOT_TIMES, s.t].sort()).map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ),
                    )}
                  </select>
                  <span className={styles.slotNote}>이 시각에 발행할 개수</span>
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.stepBtn}
                      onClick={() => store.setSlotCount(i, s.n - 1)}
                    >
                      −
                    </button>
                    <span className={styles.stepValue}>{s.n}</span>
                    <button
                      type="button"
                      className={styles.stepBtn}
                      style={{ borderLeft: '1px solid var(--border-subtle)' }}
                      onClick={() => store.setSlotCount(i, s.n + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.slotRemove}
                    onClick={() => store.removeSlot(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className={styles.dashed} onClick={store.addSlot}>
                + 발행 시각 추가
              </button>
            </div>
          </div>

          <div className={styles.quotaRow}>
            <div className={styles.quota}>
              <div className={styles.label}>
                하루 한도 <span className={styles.slotHeadNote}>1–50</span>
              </div>
              <input
                type="number"
                min={1}
                max={50}
                className={styles.num}
                value={draft.dailyQuota}
                onChange={(e) =>
                  store.edit((d) => {
                    d.dailyQuota = Math.max(1, Math.min(50, Math.round(Number(e.target.value) || 1)))
                  })
                }
              />
              <div className={styles.hint}>
                {draft.slots.length ? '시각 할당이 우선 — 한도는 무시됩니다' : '채널당 하루 발행 수'}
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 오른쪽 ---------------- */}
        <div>
          <div className={styles.section}>영상 템플릿</div>
          <div className={styles.tplRow}>
            <TemplatePreview layout={draft} logoText={draft.name} />
            <div className={styles.tplFields}>
              {lookFields.map((f) => (
                <div key={f.key} className={styles.tplField}>
                  <span className={styles.tplFieldLabel}>{f.label}</span>
                  <select
                    className={styles.tplSelect}
                    value={f.value}
                    onChange={(e) => store.setLookField(f.key, e.target.value)}
                  >
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className={styles.tplNote}>
                {draft.template} 템플릿이 타이틀·자막·로고 배치 값을 함께 정합니다. 화면비·썸네일은
                별도 설정입니다.
              </div>

              {!matchesTemplate(draft) && (
                <div className={styles.tplDirty}>
                  <span className={styles.tplDirtyText}>템플릿 기본값에서 수정된 상태입니다.</span>
                  <button type="button" className={styles.tplDirtyBtn} onClick={store.applyTemplate}>
                    템플릿 값으로
                  </button>
                </div>
              )}

              <div className={styles.tplNote} style={{ marginBottom: 6 }}>
                {draft.orient.indexOf('가로') === 0
                  ? 'AI 리프레임은 세로에서만 켤 수 있어 꺼졌습니다.'
                  : 'AI 리프레임은 세로에서만 켤 수 있습니다. 가로로 바꾸면 자동으로 꺼집니다.'}
              </div>

              <div className={styles.layout}>
                <div className={styles.layoutTitle}>타이틀·자막·로고 배치</div>
                <div className={styles.layoutNote}>숫자를 바꾸면 미리보기에 반영됩니다.</div>

                <div className={styles.layoutNums}>
                  {layoutNums.map((n) => (
                    <div key={n.key}>
                      <div className={styles.numLabel}>{n.label}</div>
                      <input
                        type="number"
                        step={n.step}
                        className={styles.num}
                        value={draft[n.key]}
                        onChange={(e) =>
                          store.edit((d) => {
                            d[n.key] = Number(e.target.value) || 0
                          })
                        }
                      />
                    </div>
                  ))}
                </div>

                {layoutRanges.map((r) => (
                  <div key={r.key} className={styles.range}>
                    <div className={styles.numLabel}>
                      {r.label} <span className={styles.slotHeadNote}>{draft[r.key]}%</span>
                    </div>
                    <input
                      type="range"
                      className={styles.rangeInput}
                      min={r.min}
                      max={r.max}
                      value={draft[r.key]}
                      onChange={(e) =>
                        store.edit((d) => {
                          d[r.key] = Number(e.target.value)
                        })
                      }
                    />
                  </div>
                ))}

                <button
                  type="button"
                  className={styles.check}
                  onClick={() =>
                    store.edit((d) => {
                      d.titleShadow = d.titleShadow === false
                    })
                  }
                >
                  <span className={draft.titleShadow !== false ? styles.box16On : styles.box16}>
                    {draft.titleShadow !== false ? '✓' : ''}
                  </span>
                  <span className={styles.checkLabel}>타이틀 그림자</span>
                </button>
                <button
                  type="button"
                  className={styles.checkLast}
                  onClick={() =>
                    store.edit((d) => {
                      d.logo = !d.logo
                    })
                  }
                >
                  <span className={draft.logo ? styles.box16On : styles.box16}>
                    {draft.logo ? '✓' : ''}
                  </span>
                  <span className={styles.checkLabel}>프로그램 로고 표시</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 삭제 ---------------- */}
      <div className={styles.danger}>
        <div className={styles.dangerText}>
          <div className={styles.dangerTitle}>자동배포 삭제</div>
          <div className={styles.dangerNote}>
            계획과 발행 규칙이 사라집니다. 잠시 멈추려면 상단의 일시정지를 쓰세요.
          </div>
        </div>
        <button type="button" className={styles.dangerBtn} onClick={store.removeRule}>
          자동배포 삭제
        </button>
      </div>
    </>
  )
}
