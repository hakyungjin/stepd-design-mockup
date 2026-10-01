/*
 * 자동배포 추가 — 4단계 마법사.
 * 제작 대상 → 영상 템플릿 → 배포 규칙 → 최종 확인
 */

import { ASPECTS, SLOT_TIMES, TEMPLATES, WD, WIZARD_CHANNELS, matchesTemplate } from '../constants'
import { ALL_PROGRAMS } from '../data/mockData'
import type { MediaKind } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import { TemplatePreview } from './TemplatePreview'
import { cx } from './shared'
import styles from './overlays.module.css'
/* 발행 시각 줄은 설정 탭과 같은 모양입니다 — 스타일을 그대로 씁니다 */
import set from './settings.module.css'

const KINDS: Array<[MediaKind, string]> = [
  ['쇼츠', '9:16 세로형'],
  ['클립', '16:9 가로형'],
  ['둘 다', '쇼츠 + 클립'],
]

export function RuleWizard({ store }: { store: AutoDeployStore }) {
  const w = store.wizard
  if (!w) return null
  const f = w.form
  const step = w.step

  const blocked =
    step === 0 ? !f.program : step === 2 ? f.channels.length === 0 || f.slots.length === 0 : false
  const blockedMsg =
    step === 0
      ? '프로그램을 선택하세요'
      : f.channels.length === 0
        ? '채널을 하나 이상 고르세요'
        : '발행 시각을 하나 이상 넣으세요'

  const slotTotal = f.slots.reduce((n, x) => n + x.n, 0)

  const setSlots = (slots: typeof f.slots) => store.wzSet('slots', slots)

  return (
    <div className={styles.wizardScrim}>
      <div className={styles.backdrop} onClick={store.wzClose} />
      <div className={styles.wizard}>
        <div className={styles.wzHead}>
          <div>
            <h2>자동배포 추가</h2>
            <div className={styles.wzSub}>프로그램에 맞는 제작·배포 방식을 설정하세요.</div>
          </div>
          <button type="button" className={styles.x} onClick={store.wzClose}>
            ✕
          </button>
        </div>

        <div className={styles.steps}>
          {['제작 대상', '영상 템플릿', '배포 규칙', '최종 확인'].map((label, i) => {
            const on = i === step
            const done = i < step
            return (
              <button
                key={label}
                type="button"
                className={i <= step ? styles.stepClickable : styles.step}
                onClick={() => i <= step && store.wzGo(i)}
              >
                <span className={on || done ? styles.stepNumOn : styles.stepNum}>{i + 1}</span>
                <span className={on ? styles.stepLabelOn : styles.stepLabel}>{label}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.wzBody}>
          {step === 0 && (
            <div>
              <div className={styles.wzTitle}>어떤 프로그램의 영상을 만들까요?</div>
              <div className={styles.wzField}>
                <div className={styles.wzLabel}>등록된 프로그램</div>
                <select
                  className={styles.wzSelect}
                  value={f.program}
                  onChange={(e) => store.wzSet('program', e.target.value)}
                >
                  <option value="">프로그램 선택</option>
                  {ALL_PROGRAMS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.wzField}>
                <div className={styles.wzLabel}>제작할 영상</div>
                <div className={styles.kinds}>
                  {KINDS.map(([label, desc]) => {
                    const on = f.kind === label
                    return (
                      <button
                        key={label}
                        type="button"
                        className={on ? styles.kindOn : styles.kind}
                        onClick={() => store.wzSet('kind', label)}
                      >
                        <div className={styles.kindTop}>
                          <span className={on ? styles.radioOn : styles.radio} />
                          <span className={on ? styles.kindLabelOn : styles.kindLabel}>{label}</span>
                        </div>
                        <div className={styles.kindDesc}>{desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className={styles.info}>
                분석이 완료된 회차부터 자동 제작하며, 새로 분석되는 회차도 계속 포함됩니다.
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className={styles.wzTitle}>영상을 어떻게 보이게 할까요?</div>
              <div className={styles.tplRow}>
                <TemplatePreview layout={f} logoText={f.program || '프로그램'} />
                <div className={styles.tplCol}>
                  <div>
                    <div className={styles.wzLabel}>템플릿</div>
                    <select
                      className={styles.wzSelect}
                      value={f.template}
                      onChange={(e) => store.wzSetTemplate(e.target.value)}
                    >
                      {TEMPLATES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className={styles.wzLabel}>화면비</div>
                    <select
                      className={styles.wzSelect}
                      value={f.aspect}
                      onChange={(e) => store.wzSet('aspect', e.target.value)}
                    >
                      {ASPECTS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className={styles.wzLabel}>썸네일 · 자막 언어</div>
                    <div className={styles.two}>
                      <select
                        className={styles.wzSelect}
                        value={f.thumb}
                        onChange={(e) => store.wzSet('thumb', e.target.value)}
                      >
                        <option value="프레임 추출">프레임 추출</option>
                        <option value="AI 생성">AI 생성</option>
                      </select>
                      <select
                        className={styles.wzSelect}
                        value={f.lang}
                        onChange={(e) => store.wzSet('lang', e.target.value)}
                      >
                        <option value="한국어">한국어</option>
                        <option value="한국어 + 영어">한국어 + 영어</option>
                        <option value="영어">영어</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.layout}>
                    <div className={styles.layoutTitle}>타이틀·자막·로고 배치</div>
                    <div className={styles.layoutNote}>
                      {f.template} 템플릿이 타이틀·자막·로고 배치 값을 함께 정합니다. 화면비·썸네일은
                      위에서 따로 고릅니다.
                    </div>
                    {!matchesTemplate(f) && (
                      <div
                        className={styles.info}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 11px',
                          background: 'rgba(245,158,11,.10)',
                          borderColor: 'rgba(245,158,11,.30)',
                          marginBottom: 11,
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontSize: 11.5,
                            color: 'hsl(var(--status-warn))',
                            lineHeight: 1.5,
                          }}
                        >
                          템플릿 기본값에서 수정된 상태입니다.
                        </span>
                        <button
                          type="button"
                          onClick={store.wzApplyTemplate}
                          style={{
                            flex: 'none',
                            padding: '5px 10px',
                            border: '1px solid #e2d3ae',
                            background: 'var(--bg-card)',
                            borderRadius: 7,
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: 'hsl(var(--status-warn))',
                            cursor: 'pointer',
                          }}
                        >
                          템플릿 값으로
                        </button>
                      </div>
                    )}

                    <div className={styles.nums}>
                      <div>
                        <div className={styles.wzLabel}>타이틀 크기 (%)</div>
                        <input
                          type="number"
                          step={5}
                          className={styles.num}
                          value={f.titleSize}
                          onChange={(e) => store.wzSet('titleSize', Number(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <div className={styles.wzLabel}>행간</div>
                        <input
                          type="number"
                          step={0.1}
                          className={styles.num}
                          value={f.lineHeight}
                          onChange={(e) => store.wzSet('lineHeight', Number(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <div className={styles.wzLabel}>자간</div>
                        <input
                          type="number"
                          step={0.5}
                          className={styles.num}
                          value={f.letter}
                          onChange={(e) => store.wzSet('letter', Number(e.target.value) || 0)}
                        />
                      </div>
                      <button
                        type="button"
                        className={styles.checkBottom}
                        onClick={() => store.wzSet('titleShadow', f.titleShadow === false)}
                      >
                        <span className={f.titleShadow !== false ? styles.boxOn : styles.box}>
                          {f.titleShadow !== false ? '✓' : ''}
                        </span>
                        <span className={styles.checkLabel}>타이틀 그림자</span>
                      </button>
                    </div>

                    <div className={styles.rangeWrap}>
                      <div className={styles.wzLabel}>
                        타이틀 위치 · 상단 기준{' '}
                        <span className={styles.slotHint}>{f.titleTop}%</span>
                      </div>
                      <input
                        type="range"
                        className={styles.rangeInput}
                        min={2}
                        max={60}
                        value={f.titleTop}
                        onChange={(e) => store.wzSet('titleTop', Number(e.target.value))}
                      />
                    </div>
                    <div className={styles.rangeWrap} style={{ marginBottom: 12 }}>
                      <div className={styles.wzLabel}>
                        자막 위치 · 하단 기준{' '}
                        <span className={styles.slotHint}>{f.capBottom}%</span>
                      </div>
                      <input
                        type="range"
                        className={styles.rangeInput}
                        min={4}
                        max={60}
                        value={f.capBottom}
                        onChange={(e) => store.wzSet('capBottom', Number(e.target.value))}
                      />
                    </div>

                    <button
                      type="button"
                      className={styles.check}
                      onClick={() => store.wzSet('logo', !f.logo)}
                    >
                      <span className={f.logo ? styles.boxOn : styles.box}>{f.logo ? '✓' : ''}</span>
                      <span className={styles.checkLabel}>프로그램 로고 표시</span>
                    </button>

                    {f.kind !== '클립' ? (
                      <div style={{ marginBottom: 11 }}>
                        <div className={styles.wzLabel}>
                          리프레임 <span className={styles.slotHint}>세로 영상만</span>
                        </div>
                        <select
                          className={styles.wzSelect}
                          value={f.reframe}
                          onChange={(e) => store.wzSet('reframe', e.target.value)}
                        >
                          <option value="중앙 고정">중앙 고정</option>
                          <option value="AI 자동 크롭">AI 자동 크롭</option>
                        </select>
                      </div>
                    ) : (
                      <div className={styles.info} style={{ marginBottom: 11 }}>
                        클립은 가로 고정이라 리프레임이 없습니다.
                      </div>
                    )}

                    <div className={styles.info}>
                      설정 변경은 이후 새로 제작되는 영상에 적용됩니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className={styles.wzTitle}>언제, 어디로 발행할까요?</div>
              <div className={styles.wzField}>
                <div className={styles.wzLabel}>배포 채널</div>
                <div className={styles.channels}>
                  {WIZARD_CHANNELS.map((c) => {
                    const on = f.channels.includes(c.name)
                    return (
                      <button
                        key={c.name}
                        type="button"
                        className={on ? styles.channelOn : styles.channel}
                        onClick={() =>
                          store.wzSet(
                            'channels',
                            on ? f.channels.filter((x) => x !== c.name) : [...f.channels, c.name],
                          )
                        }
                      >
                        <span className={on ? styles.boxOn : styles.box}>{on ? '✓' : ''}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={on ? styles.chNameOn : styles.chName}>{c.name}</div>
                          <div className={styles.chSub}>{c.sub}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={styles.wzField}>
                <div className={styles.wzLabel}>발행 요일</div>
                <div className={styles.weekdays}>
                  {WD.map((label, i) => {
                    const on = f.weekdays.includes(i)
                    return (
                      <button
                        key={label}
                        type="button"
                        className={on ? styles.wdOn : styles.wd}
                        onClick={() =>
                          store.wzSet(
                            'weekdays',
                            on
                              ? f.weekdays.filter((x) => x !== i)
                              : [...f.weekdays, i].sort((a, b) => a - b),
                          )
                        }
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={styles.wzField}>
                <div className={styles.slotHead}>
                  <span className={styles.wzLabel} style={{ marginBottom: 0 }}>
                    발행 시각 · 개수 <span className={styles.slotHint}>KST</span>
                  </span>
                  <span className={styles.slotHint}>하루 합계 {slotTotal}개</span>
                </div>
                <div className={set.slots}>
                  {f.slots.map((s, i) => (
                    <div key={`${s.t}-${i}`} className={set.slot}>
                      <select
                        value={s.t}
                        className={set.slotTime}
                        onChange={(e) =>
                          setSlots(
                            f.slots
                              .map((x, k) => (k === i ? { ...x, t: e.target.value } : x))
                              .sort((a, b) => a.t.localeCompare(b.t)),
                          )
                        }
                      >
                        {SLOT_TIMES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <span className={set.slotNote}>이 시각에 발행할 개수</span>
                      <div className={set.stepper}>
                        <button
                          type="button"
                          className={set.stepBtn}
                          onClick={() =>
                            setSlots(
                              f.slots.map((x, k) => (k === i ? { ...x, n: Math.max(1, x.n - 1) } : x)),
                            )
                          }
                        >
                          −
                        </button>
                        <span className={set.stepValue}>{s.n}</span>
                        <button
                          type="button"
                          className={set.stepBtn}
                          style={{ borderLeft: '1px solid var(--border-subtle)' }}
                          onClick={() =>
                            setSlots(
                              f.slots.map((x, k) => (k === i ? { ...x, n: Math.min(9, x.n + 1) } : x)),
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className={set.slotRemove}
                        onClick={() => setSlots(f.slots.filter((_, k) => k !== i))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className={set.dashed} onClick={store.wzAddSlot}>
                    + 발행 시각 추가
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className={styles.wzTitle}>이대로 만들까요?</div>
              <div className={styles.summary}>
                {[
                  { label: '프로그램', value: f.program || '—' },
                  { label: '제작할 영상', value: `${f.kind} · 분석 완료 회차부터 계속` },
                  { label: '리프레임', value: f.kind === '클립' ? '없음(가로 고정)' : f.reframe },
                  {
                    label: '영상 템플릿',
                    value: `${f.template} · ${f.aspect} · 썸네일 ${f.thumb} · 자막 ${f.lang}`,
                  },
                  {
                    label: '배치',
                    value: `타이틀 ${f.titleSize}% / 행간 ${f.lineHeight} / 자간 ${f.letter}${
                      f.titleShadow === false ? '' : ' · 그림자'
                    } · 타이틀 상단 ${f.titleTop}% · 자막 하단 ${f.capBottom}%${
                      f.logo ? ' · 로고 표시' : ''
                    }`,
                  },
                  { label: '배포 채널', value: f.channels.join(', ') || '—' },
                  {
                    label: '발행 일정',
                    value: `${f.weekdays.map((i) => WD[i]).join('·') || '요일 없음'} · ${
                      f.slots.map((x) => `${x.t} ${x.n}개`).join(' / ') || '시각 없음'
                    } · 하루 합계 ${slotTotal}개`,
                  },
                ].map((s) => (
                  <div key={s.label} className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>{s.label}</span>
                    <span className={styles.summaryValue}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div className={styles.info}>
                만들면 바로 운영 중으로 시작합니다. 분석이 끝난 회차부터 순방이 발행 계획을 채우고,
                그대로 발행합니다.
              </div>
            </div>
          )}
        </div>

        <div className={styles.wzFoot}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => (step === 0 ? store.wzClose() : store.wzGo(step - 1))}
          >
            {step === 0 ? '취소' : '이전'}
          </button>
          <div className={styles.footRight}>
            {blocked && <span className={styles.blockedMsg}>{blockedMsg}</span>}
            <button
              type="button"
              className={cx(blocked ? styles.nextBlocked : styles.nextBtn)}
              onClick={() => {
                if (blocked) return
                if (step === 3) store.wzCreate()
                else store.wzGo(step + 1)
              }}
            >
              {step === 3 ? '자동배포 만들기' : '다음 단계'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
