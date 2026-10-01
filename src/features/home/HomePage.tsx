/*
 * 홈 — 첫 화면 하나로 합친 것.
 *
 *   인사 + 에이전트 입력창        무엇부터 할지 바로 말할 수 있게
 *   오늘 한눈에                   수익·배포 숫자 네 개
 *   오늘 수익 / 오늘 배포         옛 대시보드 내용
 *   추천 요청                     미리 만든 요청으로 새 대화 시작
 *
 * 대시보드를 따로 두지 않습니다. 숫자는 data.ts 가 들고 있습니다.
 */

import { useState } from 'react'
import type { ScreenKey } from '@/app/screens'
import { NavIcon } from '@/components/ui/NavIcon'
import { ACCOUNT } from '@/features/account-settings/data'
import { AS_OF, CLOSING, CUMULATIVE, TOP_EARNERS, WON } from './data'
import { PromptLauncher } from './PromptLauncher'
import styles from './HomePage.module.css'

export function HomePage({
  onNavigate,
  onAsk,
}: {
  onNavigate: (screen: ScreenKey) => void
  /** 쓴 문장을 들고 에이전트 화면으로 넘어갑니다 */
  onAsk: (text: string) => void
}) {
  const [text, setText] = useState('')
  const ask = () => onAsk(text.trim())

  const today = CUMULATIVE[CUMULATIVE.length - 1]

  /* 누적 수익 스파크라인 */
  const W = 760
  const H = 110
  const max = CLOSING * 1.05
  const x = (hour: number) => (hour / 24) * W
  const y = (value: number) => H - (value / max) * H
  const points = CUMULATIVE.map((value, hour) => [x(hour), y(value)] as const)
  const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const area = `${line} L${last[0].toFixed(1)} ${H} L0 ${H} Z`
  const projection = `M${last[0].toFixed(1)} ${last[1].toFixed(1)} L${W} ${y(CLOSING).toFixed(1)}`

  return (
    <div className={styles.page}>
      {/* ---------------- 인사 + 입력창 ---------------- */}
      <section className={styles.hero}>
        <p className={styles.greeting}>{ACCOUNT.name}님, 안녕하세요</p>
        <h1 className={styles.title}>오늘은 무엇부터 할까요?</h1>

        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault()
            ask()
          }}
        >
          <textarea
            className={styles.input}
            rows={2}
            aria-label="에이전트에게 보낼 요청"
            placeholder="조회수 분석, 자동배포, 보고서와 엑셀까지 요청해 보세요"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                ask()
              }
            }}
          />
          <div className={styles.composerBar}>
            <button type="button" className={styles.round} aria-label="파일 붙이기" title="파일 붙이기">
              ＋
            </button>
            <span className={styles.pill}>
              <NavIcon screen="programs" size={13} /> 나는 SOLO
            </span>
            <span className={styles.pill}>
              <NavIcon screen="media" size={13} /> 전체 회차
            </span>
            <button type="submit" className={styles.send} aria-label="에이전트에게 보내기" disabled={!text.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13m-5-6 6 6-6 6" /></svg>
            </button>
          </div>
        </form>

      </section>

      <PromptLauncher onAsk={onAsk} />

      {/* ---------------- 오늘 수익 ---------------- */}
      <section className={styles.block} aria-label="오늘 수익">
        <div className={styles.blockHead}>
          <h2>오늘 수익</h2>
          <span className={styles.asOf}>{AS_OF}</span>
        </div>

        <div className={styles.todayGrid}>
          {/* 예상 수익 + 추이 */}
          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h3>수익 추이</h3>
              <span>실선 실제 · 점선 예상</span>
            </div>
            <div className={styles.revenue}>
              <span className={styles.revenueLabel}>예상 수익</span>
              <strong className={styles.revenueValue}>{WON(today)}</strong>
              <span className={styles.revenueUp}>+₩21,700 ▲20.3%</span>
              <span className={styles.revenueNote}>오늘 마감 예상 {WON(CLOSING)}</span>
            </div>
            <div className={styles.chartBox}>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={styles.chart} aria-hidden>
                <defs>
                  <linearGradient id="homeRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1C60FF" stopOpacity=".34" />
                    <stop offset="100%" stopColor="#1C60FF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={area} fill="url(#homeRev)" />
                <path d={line} fill="none" stroke="#1C60FF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <path d={projection} fill="none" stroke="#1C60FF" strokeWidth="1.5" strokeDasharray="4 4" opacity=".55" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className={styles.chartTicks}><span>00시</span><span>09시</span><span>24시</span></div>
            </div>
          </article>

          {/* 기여 Top 3 */}
          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h3>수익 기여 Top 3</h3>
              <button type="button" className={styles.cardLink} onClick={() => onNavigate('performance')}>
                성과 전체
              </button>
            </div>
            <ol className={styles.ranks}>
              {TOP_EARNERS.map(([title, channel, amount], i) => (
                <li key={title}>
                  <span className={styles.rankNo}>{i + 1}</span>
                  <div>
                    <strong>{title}</strong>
                    <span>{channel}</span>
                  </div>
                  <b>{WON(amount)}</b>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </section>

    </div>
  )
}
