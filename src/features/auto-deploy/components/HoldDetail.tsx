/*
 * 발행 예정 영상 한 건의 상세.
 * 왼쪽은 미리보기, 오른쪽은 [게시물 · 타이틀] / [자막 수정] 두 탭입니다.
 */

import { Btn } from '@/components/ui/Btn'
import { Select } from '@/components/ui/Controls'
import {
  CUE_TEXT_MAX,
  CUE_MAX,
  DEFAULT_TITLE_COLOR,
  KIND_TONE,
  TITLE_COLORS,
  durSec,
  fmtT,
} from '../constants'
import { publishText } from '../domain/plan'
import type { Rule } from '../types'
import type { AutoDeployStore } from '../hooks/useAutoDeploy'
import { cx } from './shared'
import styles from './detail.module.css'

const POST_CHANNELS = ['YouTube', '네이버 클립', 'TikTok', 'Instagram', 'Facebook']

export function HoldDetail({ rule, store }: { rule: Rule; store: AutoDeployStore }) {
  const hold = store.hold
  if (!hold) return null

  const short = hold.kind === '숏폼'
  const tone = KIND_TONE[hold.kind]
  const lock = hold.rendering
  const cueError = hold.cues.some((c) => c.end <= c.start)
  const plan = store.planOf(rule)

  return (
    <div>
      <div className={styles.head}>
        <Btn variant="secondary" size="sm" onClick={() => store.setFocus(null)}>
          ‹ 목록
        </Btn>
        <span className={styles.kindChip} style={{ background: tone.bg, color: tone.fg }}>
          {hold.kind} · {short ? '9:16 세로' : '16:9 가로'}
        </span>
        <span className={styles.pos}>1 / {rule.holds.length}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.left}>
          <button
            type="button"
            className={short ? styles.frameShort : styles.frameWide}
            onClick={store.openPlayer}
          >
            {lock && <div className={styles.rendering}>렌더 중…</div>}
            <div className={styles.playbar}>
              <span className={styles.playGlyph}>▶</span>
              <div className={styles.track}>
                <div className={styles.trackFill} />
              </div>
              <span className={styles.playTime}>0:23 / {hold.dur}</span>
            </div>
          </button>
          {hold.dirty && (
            <div className={styles.dirtyNote}>
              수정한 내용은 아직 이 영상에 없습니다. 저장하면 이 내용으로 MP4를 다시 만듭니다.
            </div>
          )}
        </div>

        <div className={styles.right}>
          <div className={styles.detailTabs}>
            {(
              [
                ['post', '게시물 · 타이틀'],
                ['cues', '자막 수정'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={store.detailTab === k ? styles.dtabOn : styles.dtab}
                onClick={() => store.setDetailTab(k)}
              >
                {label}
              </button>
            ))}
          </div>

          {store.detailTab === 'post' ? (
            <>
              <div className={styles.block}>
                <div className={styles.fieldLabel}>
                  영상 안 타이틀{' '}
                  <span className={styles.fieldHint}>2줄 · 후보에서 고르거나 직접 고칩니다</span>
                </div>
                <div className={styles.alts}>
                  {hold.titleAlts.map((a) => {
                    const on = hold.line1 === a.l1 && hold.line2 === a.l2
                    return (
                      <button
                        key={a.kind}
                        type="button"
                        className={on ? styles.altOn : styles.alt}
                        onClick={() => {
                          store.editHold('line1', a.l1)
                          store.editHold('line2', a.l2)
                        }}
                      >
                        <span className={on ? styles.radioOn : styles.radio} />
                        <span className={styles.altKind}>{a.kind}</span>
                        <span className={styles.altText}>
                          {a.l1} <span>{a.l2}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className={styles.lineRows}>
                  <div className={styles.lineRow}>
                    <span className={styles.lineLabel}>1줄</span>
                    <input
                      type="text"
                      className={styles.input}
                      value={hold.line1}
                      disabled={lock}
                      onChange={(e) => store.editHold('line1', e.target.value)}
                    />
                  </div>
                  <div className={styles.lineRow}>
                    <span className={styles.lineLabel}>2줄</span>
                    <input
                      type="text"
                      className={styles.input2}
                      style={{ borderLeft: `4px solid ${hold.lineColor || DEFAULT_TITLE_COLOR}` }}
                      value={hold.line2}
                      disabled={lock}
                      onChange={(e) => store.editHold('line2', e.target.value)}
                    />
                  </div>
                  <div className={styles.colorRow}>
                    <span className={styles.lineLabel}>색</span>
                    {TITLE_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.name}
                        disabled={lock}
                        className={
                          (hold.lineColor || DEFAULT_TITLE_COLOR) === c.hex
                            ? styles.swatchOn
                            : styles.swatch
                        }
                        style={{ background: c.hex }}
                        onClick={() => store.editHold('lineColor', c.hex)}
                      />
                    ))}
                    <span className={styles.note}>
                      2줄 강조색 ·{' '}
                      {(
                        TITLE_COLORS.find(
                          (c) => c.hex === (hold.lineColor || DEFAULT_TITLE_COLOR),
                        ) ?? TITLE_COLORS[0]
                      ).name}
                    </span>
                  </div>
                  <div className={styles.note}>2줄은 비워도 됩니다.</div>
                </div>
              </div>

              <div className={styles.postHead}>
                <span className={styles.postTitle}>게시물 정보</span>
                <Select
                  value={hold.postChannel}
                  disabled={lock}
                  onChange={(e) => store.editHold('postChannel', e.target.value)}
                >
                  {POST_CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>

              <div className={styles.block}>
                <div className={styles.fieldLabel}>게시물 제목</div>
                <input
                  type="text"
                  className={styles.fullInput}
                  value={hold.postTitle}
                  disabled={lock}
                  onChange={(e) => store.editHold('postTitle', e.target.value)}
                />
              </div>

              <div className={styles.blockWide}>
                <div className={styles.fieldLabel}>게시물 설명 · 해시태그</div>
                <textarea
                  className={styles.area}
                  rows={3}
                  value={hold.postDesc}
                  disabled={lock}
                  onChange={(e) => store.editHold('postDesc', e.target.value)}
                />
              </div>

              <div className={styles.publish}>
                <div className={styles.publishLabel}>발행 예정 · 한국 시간</div>
                <div className={styles.publishAt}>{publishText(rule, plan, hold)}</div>
                <div className={styles.publishNote}>계획표의 이 시각에 그대로 나갑니다.</div>
              </div>
            </>
          ) : (
            <div>
              <div className={styles.cueHead}>
                <span className={styles.cueCount}>자막 {hold.cues.length}줄</span>
                <span className={styles.cueRange}>클립 0:00.0 – {fmtT(durSec(hold.dur))}</span>
                <span className={styles.cueSaved}>
                  마지막 수정 {hold.cueSavedAt} · {hold.cueSavedBy}
                </span>
                <Btn variant="ghost" size="xs" onClick={store.resetCues}>
                  전체 되돌리기
                </Btn>
              </div>

              {hold.cueStale && (
                <div className={styles.cueStale}>
                  재분석으로 원문 자막이 바뀌었습니다 — 지금 화면은 고친 버전입니다. 되돌리면 새
                  원문을 받습니다.
                </div>
              )}

              <div className={styles.cueList}>
                <button type="button" className={styles.addCue} onClick={() => store.addCue(0)}>
                  + 자막 추가
                </button>
                {hold.cues.map((c, i) => {
                  const bad = c.end <= c.start
                  const prev = hold.cues[i - 1]
                  const next = hold.cues[i + 1]
                  const overlap = (prev && c.start < prev.end) || (next && c.end > next.start)
                  const empty = !c.text.trim()
                  const on = i === hold.cueIndex
                  return (
                    <div key={c.id}>
                      <div
                        className={cx(
                          bad ? styles.cueRowBad : on ? styles.cueRowOn : styles.cueRow,
                          empty && styles.cueRowEmpty,
                        )}
                        onClick={() => store.focusCue(i)}
                      >
                        <div className={styles.cueTimes}>
                          {(['start', 'end'] as const).map((which) => (
                            <div key={which} className={styles.cueTimeRow}>
                              <button
                                type="button"
                                title={`${which === 'start' ? '시작' : '끝'} −0.5초`}
                                className={styles.nudge}
                                onClick={() => store.nudgeCue(i, which, -0.5)}
                              >
                                −
                              </button>
                              <input
                                type="text"
                                className={bad ? styles.timeInputBad : styles.timeInput}
                                title={`${which === 'start' ? '시작' : '끝'} · 클립 구간 밖 자막은 영상에 나오지 않습니다`}
                                value={fmtT(c[which])}
                                onChange={(e) => store.setCueTime(i, which, e.target.value)}
                              />
                              <button
                                type="button"
                                title={`${which === 'start' ? '시작' : '끝'} +0.5초`}
                                className={styles.nudge}
                                onClick={() => store.nudgeCue(i, which, 0.5)}
                              >
                                +
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className={styles.cueMain}>
                          <input
                            type="text"
                            className={styles.cueInput}
                            value={c.text}
                            maxLength={CUE_TEXT_MAX}
                            placeholder="자막 문구"
                            onFocus={() => store.focusCue(i)}
                            onChange={(e) => store.editCue(i, e.target.value)}
                          />
                          <div className={styles.cueFlags}>
                            {c.isNew && <span className={styles.flagNew}>새 줄</span>}
                            {bad && <span className={styles.flagBad}>끝이 시작보다 빠릅니다</span>}
                            {!bad && overlap && (
                              <span
                                className={styles.flagWarn}
                                title="겹치는 구간은 두 줄이 함께 표시될 수 있습니다"
                              >
                                ⚠ 앞뒤 줄과 시간이 겹칩니다
                              </span>
                            )}
                            {empty && (
                              <span className={styles.flagMuted}>비워 두면 저장 시 지워집니다</span>
                            )}
                            <span className={styles.cueLen}>
                              {c.text.length}/{CUE_TEXT_MAX}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.addCueThin}
                        onClick={() => store.addCue(i)}
                      >
                        + 자막 추가
                      </button>
                    </div>
                  )
                })}
                <button
                  type="button"
                  className={styles.addCue}
                  onClick={() => store.addCue(hold.cues.length)}
                >
                  + 자막 추가
                </button>
              </div>

              <div className={styles.cueFoot}>
                <span className={styles.cueFootNote}>
                  시각은 클립 시작(0초) 기준 · 최대 {CUE_MAX}줄 · 줄당 {CUE_TEXT_MAX}자
                </span>
                {cueError && (
                  <span className={styles.cueError}>시간이 잘못된 줄이 있어 저장할 수 없습니다</span>
                )}
                <div style={{ marginLeft: 'auto' }}>
                  <Btn variant="primary" size="sm" onClick={store.saveCues}>
                    자막 저장
                  </Btn>
                </div>
              </div>
            </div>
          )}

          <div className={styles.saveWrap}>
            <button
              type="button"
              className={styles.saveBtn}
              disabled={lock}
              onClick={store.saveHold}
            >
              저장
            </button>
            <div className={styles.saveNote}>
              저장하면 이 영상만 다시 굽고, 계획표의 시각에 그대로 나갑니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
