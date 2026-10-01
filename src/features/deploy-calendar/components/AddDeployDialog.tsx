import { useMemo, useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { CheckMark, Chip, Pill, Segment, Thumb } from '@/components/ui/Controls'
import { dowLabel, durationText, shortDate } from '@/lib/date'
import type { DateStr, TimeStr } from '@/lib/date'
import {
  DAILY_LIMIT,
  IG_REELS_MAX_SEC,
  PLATFORMS,
  PLATFORM_KEYS,
  PLATFORM_NAME,
  PROGRAM_NAME,
  SLOTS,
  TEMPLATES,
  VIDEO_TYPE,
  WARN_IG_LONG,
  WARN_TIKTOK,
  defaultTemplate,
} from '../constants'
import { countByProgram, findDuplicate, selectedKeys } from '../domain/rules'
import type {
  BulkDraft,
  BulkPlanRow,
  DeployItem,
  SingleDraft,
  Video,
} from '../types'
import styles from './overlays.module.css'

const STEP_LABELS = ['날짜·시간', '영상', '플랫폼', '제목·설명', '확인'] as const
const GAP_OPTIONS = [-1, 30, 60]

export interface AddDeployDialogProps {
  initialDate: DateStr
  initialTime: TimeStr
  /** 캘린더 빈칸에서 열었으면 2단계(영상)부터 시작합니다 */
  startAtVideoStep: boolean
  videos: Record<string, Video>
  items: DeployItem[]
  isPast: (date: DateStr, time: TimeStr) => boolean
  onClose: () => void
  onSaveSingle: (draft: SingleDraft) => void
  onPlanBulk: (draft: BulkDraft) => BulkPlanRow[]
  onSaveBulk: (draft: BulkDraft, plan: BulkPlanRow[]) => void
  onToast: (message: string) => void
}

export function AddDeployDialog(props: AddDeployDialogProps) {
  const { initialDate, initialTime, startAtVideoStep, videos, items, onClose } = props

  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  /** 아직 어디에도 편성되지 않은 영상만 후보로 보여줍니다 */
  const available = useMemo(
    () =>
      Object.values(videos)
        .filter((v) => !items.some((i) => i.vid === v.id))
        .sort((a, b) => Number(b.ready) - Number(a.ready) || b.score - a.score),
    [items, videos],
  )

  return (
    <div className={styles.modalScrim} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <span className={styles.modalTitle}>배포 추가</span>
          <Segment>
            <Pill active={mode === 'single'} onClick={() => setMode('single')}>
              한 개
            </Pill>
            <Pill active={mode === 'bulk'} onClick={() => setMode('bulk')}>
              여러 개 묶음
            </Pill>
          </Segment>
          <div className={styles.modalHeadSpacer}>
            <Btn variant="ghost" size="sm" onClick={onClose}>
              닫기
            </Btn>
          </div>
        </div>

        {mode === 'single' ? (
          <SingleFlow
            {...props}
            available={available}
            initialStep={startAtVideoStep ? 1 : 0}
            initialDate={initialDate}
            initialTime={initialTime}
          />
        ) : (
          <BulkFlow {...props} available={available} />
        )}
      </div>
    </div>
  )
}

/* ================================================================== *
 * 한 개 등록 — 5단계
 * ================================================================== */

function SingleFlow({
  initialDate,
  initialTime,
  initialStep,
  available,
  videos,
  items,
  isPast,
  onSaveSingle,
}: AddDeployDialogProps & { available: Video[]; initialStep: number }) {
  const [step, setStep] = useState(initialStep)
  const [draft, setDraft] = useState<SingleDraft>({
    date: initialDate,
    time: initialTime,
    vid: null,
    pls: { yt: true },
    tpl: 0,
    test: false,
  })

  const patch = (p: Partial<SingleDraft>) => setDraft((d) => ({ ...d, ...p }))

  const video = draft.vid ? videos[draft.vid] : null
  const keys = selectedKeys(draft.pls, PLATFORM_KEYS)

  /** 플랫폼별 차단 사유 */
  const platformInfo = PLATFORMS.map((p) => {
    if (!video) return { ...p, reason: '' }
    const dup = findDuplicate(items, video.id, p.key)
    const overLimit =
      countByProgram(items, videos, draft.date, video.prog, p.key) >= DAILY_LIMIT[video.prog]
    return {
      ...p,
      reason: dup
        ? `중복 예약 · ${shortDate(dup.date)} ${dup.time}에 이미 있음`
        : overLimit
          ? `이 날 상한 도달 (${DAILY_LIMIT[video.prog]}/${DAILY_LIMIT[video.prog]})`
          : '',
    }
  })
  const blocked = platformInfo.filter((p) => draft.pls[p.key] && p.reason)

  const ok0 = !isPast(draft.date, draft.time)
  const ok1 = ok0 && !!video && video.ready
  const ok2 = ok1 && keys.length > 0 && blocked.length === 0
  const valid = [ok0, ok1, ok2, ok2, ok2]
  const firstInvalid = valid.findIndex((v) => !v)
  const maxStep = firstInvalid === -1 ? 4 : firstInvalid

  const errors = [
    '지난 시간은 고를 수 없습니다',
    '예약할 영상을 고르세요',
    blocked.length
      ? `${blocked.map((p) => p.name).join(', ')}: ${blocked[0].reason}`
      : '플랫폼을 하나 이상 고르세요',
    '',
    '',
  ]

  const warnings: string[] = []
  if (video && draft.pls.tt) warnings.push(WARN_TIKTOK)
  if (video && draft.pls.ig && video.dur > IG_REELS_MAX_SEC) warnings.push(WARN_IG_LONG)

  const template = TEMPLATES[draft.tpl] ?? TEMPLATES[0]

  return (
    <>
      <div className={styles.steps}>
        {STEP_LABELS.map((label, i) => {
          const on = i === step
          const reachable = i <= maxStep
          return (
            <button
              key={label}
              type="button"
              className={[styles.step, on ? styles.stepOn : '', reachable ? '' : styles.stepLocked]
                .filter(Boolean)
                .join(' ')}
              onClick={() => reachable && setStep(i)}
            >
              <span
                className={[
                  styles.stepNum,
                  i < step && valid[i] ? styles.stepNumDone : '',
                  on ? styles.stepNumOn : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {i + 1}
              </span>
              {label}
            </button>
          )
        })}
      </div>

      <div className={styles.modalBody}>
        {step === 0 && (
          <>
            <div className={styles.row} style={{ alignItems: 'center', gap: 10 }}>
              <input
                type="date"
                className={`${styles.input} ${styles.inputLg}`}
                value={draft.date}
                onChange={(e) => e.target.value && patch({ date: e.target.value })}
              />
              <input
                type="time"
                step={600}
                className={`${styles.input} ${styles.inputLg}`}
                style={{ width: 120 }}
                value={draft.time}
                onChange={(e) => e.target.value && patch({ time: e.target.value })}
              />
            </div>
            <div className={styles.wrapRow} style={{ gap: 6 }}>
              {SLOTS.map((t) => {
                const past = isPast(draft.date, t)
                return (
                  <Chip
                    key={t}
                    active={draft.time === t}
                    disabled={past}
                    onClick={() => !past && patch({ time: t })}
                  >
                    {t}
                  </Chip>
                )
              })}
            </div>
            {!ok0 && (
              <span className={styles.modalErr}>지난 시간은 고를 수 없습니다</span>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <span className={styles.modalNote}>
              추천 점수 순 · 렌더링이 끝나지 않은 영상은 예약할 수 없습니다
            </span>
            <div className={styles.grid2}>
              {available.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={!v.ready}
                  className={[styles.optionBtn, draft.vid === v.id ? styles.optionOn : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() =>
                    v.ready && patch({ vid: v.id, tpl: defaultTemplate(v.type) })
                  }
                >
                  <Thumb src={v.thumb} width={48} height={30} radius={4} />
                  <span className={styles.optionBody}>
                    <span className={`${styles.optionTitle} ${styles.ellipsis}`}>{v.title}</span>
                    <span
                      className={
                        v.ready
                          ? styles.optionSub
                          : `${styles.optionSub} ${styles.optionSubPending}`
                      }
                    >
                      {v.ready
                        ? `${PROGRAM_NAME[v.prog]} · ${VIDEO_TYPE[v.type].label} · ${durationText(v.dur)}`
                        : '렌더링 미완료 · 예약 불가'}
                    </span>
                  </span>
                  <span className={styles.optionScore}>추천 {v.score}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.grid2Wide}>
              {platformInfo.map((p) => {
                const on = !!draft.pls[p.key]
                const disabled = !!p.reason && !on
                return (
                  <button
                    key={p.key}
                    type="button"
                    disabled={disabled}
                    className={[
                      styles.platformCard,
                      on ? styles.platformCardOn : '',
                      on && p.reason ? styles.platformCardBlocked : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => patch({ pls: { ...draft.pls, [p.key]: !on } })}
                  >
                    <CheckMark checked={on} />
                    <span className={styles.optionBody}>
                      <span className={styles.platformCardName}>{p.name}</span>
                      <span
                        className={
                          p.reason
                            ? `${styles.optionSub} ${styles.optionSubBlocked}`
                            : styles.optionSub
                        }
                      >
                        {p.reason || (on ? '예약됨으로 저장' : '누르면 추가')}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            {warnings.map((w) => (
              <div key={w} className={styles.noticeWarn}>
                {w}
              </div>
            ))}
            <button
              type="button"
              className={styles.toggleRow}
              onClick={() => patch({ test: !draft.test })}
            >
              <CheckMark checked={draft.test} />
              <span className={styles.toggleBody}>
                <span className={styles.toggleTitle}>공개 전 테스트 모드</span>
                <span className={styles.toggleSub}>
                  비공개로 먼저 올리고, 확인 후 공개로 바꿉니다
                </span>
              </span>
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.row} style={{ gap: 6 }}>
              {TEMPLATES.map((t, i) => (
                <Chip key={t.name} active={draft.tpl === i} onClick={() => patch({ tpl: i })}>
                  {t.name}
                </Chip>
              ))}
            </div>
            <div className={styles.templatePreview}>
              <span className={styles.templateLabel}>제목</span>
              <span className={styles.templateTitle}>{video ? template.title(video) : ''}</span>
              <span className={styles.templateLabelGap}>설명</span>
              <span className={styles.templateDesc}>{video ? template.desc(video) : ''}</span>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className={styles.confirmGrid}>
              <span className={styles.confirmKey}>일시</span>
              <b className={styles.confirmVal}>
                {shortDate(draft.date)} ({dowLabel(draft.date)}) {draft.time}
              </b>
              <span className={styles.confirmKey}>영상</span>
              <b className={styles.confirmVal}>
                {video ? `${video.title} · ${durationText(video.dur)}` : ''}
              </b>
              <span className={styles.confirmKey}>플랫폼</span>
              <b className={styles.confirmVal}>
                {keys.map((k) => PLATFORM_NAME[k]).join(' · ')}
              </b>
              <span className={styles.confirmKey}>제목</span>
              <span className={styles.confirmVal}>{video ? template.title(video) : ''}</span>
              <span className={styles.confirmKey}>테스트 모드</span>
              <span className={styles.confirmVal}>
                {draft.test ? '켬 — 비공개로 먼저 올림' : '끔'}
              </span>
            </div>
            {warnings.map((w) => (
              <div key={w} className={styles.noticeWarn}>
                {w}
              </div>
            ))}
          </>
        )}
      </div>

      <div className={styles.modalFoot}>
        <span className={styles.modalErr}>{valid[step] ? '' : errors[step]}</span>
        <div className={styles.modalFootActions}>
          {step > 0 && (
            <Btn variant="secondary" size="md" onClick={() => setStep(step - 1)}>
              이전
            </Btn>
          )}
          {step < 4 && (
            <Btn
              variant="primary"
              size="md"
              disabled={!valid[step]}
              onClick={() => valid[step] && setStep(step + 1)}
            >
              다음
            </Btn>
          )}
          {step === 4 && (
            <Btn variant="primary" size="md" onClick={() => ok2 && onSaveSingle(draft)}>
              예약 저장
            </Btn>
          )}
        </div>
      </div>
    </>
  )
}

/* ================================================================== *
 * 여러 개 묶음 등록
 * ================================================================== */

function BulkFlow({
  initialDate,
  initialTime,
  available,
  videos,
  onPlanBulk,
  onSaveBulk,
  onToast,
}: AddDeployDialogProps & { available: Video[] }) {
  const [draft, setDraft] = useState<BulkDraft>({
    vids: [],
    date: initialDate,
    time: initialTime,
    gap: -1,
    pls: { yt: true, ig: true },
  })
  const [plan, setPlan] = useState<BulkPlanRow[] | null>(null)

  const patch = (p: Partial<BulkDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
    setPlan(null)
  }

  const keys = selectedKeys(draft.pls, PLATFORM_KEYS)
  const okCount = (plan ?? []).filter((p) => p.ok).length

  const warnings: string[] = []
  if (draft.pls.tt) {
    warnings.push('TikTok은 계정 심사가 끝나기 전까지 "나만 보기"로만 올라갑니다.')
  }
  if (draft.pls.ig && draft.vids.some((id) => videos[id].dur > IG_REELS_MAX_SEC)) {
    warnings.push('90초를 넘는 영상은 Instagram에서 릴스가 아닌 일반 동영상으로 올라갑니다.')
  }

  const runAutoPlace = () => {
    if (!draft.vids.length) return onToast('영상을 먼저 고르세요')
    if (!keys.length) return onToast('플랫폼을 하나 이상 고르세요')
    setPlan(onPlanBulk(draft))
  }

  const gapLabel = (g: number) => (g < 0 ? '06·18시 빈 자리 채우기' : `${g}분`)

  return (
    <>
      <div className={styles.modalBody}>
        <div className={styles.bulkHead}>
          <span className={styles.bulkPicked}>{draft.vids.length}개 영상 선택</span>
          <span className={styles.modalNote}>
            고른 순서대로 배치 · 렌더링 미완료는 고를 수 없습니다
          </span>
        </div>

        <div className={styles.bulkList}>
          {available.map((v) => {
            const index = draft.vids.indexOf(v.id)
            const on = index >= 0
            return (
              <button
                key={v.id}
                type="button"
                disabled={!v.ready}
                className={[styles.optionBtn, on ? styles.optionOn : ''].filter(Boolean).join(' ')}
                onClick={() =>
                  v.ready &&
                  patch({
                    vids: on ? draft.vids.filter((x) => x !== v.id) : [...draft.vids, v.id],
                  })
                }
              >
                <CheckMark checked={on} round label={on ? String(index + 1) : ''} />
                <span className={styles.optionBody}>
                  <span className={`${styles.optionTitle} ${styles.ellipsis}`}>{v.title}</span>
                  <span
                    className={
                      v.ready ? styles.optionSub : `${styles.optionSub} ${styles.optionSubPending}`
                    }
                  >
                    {v.ready
                      ? `${VIDEO_TYPE[v.type].label} · ${durationText(v.dur)} · 추천 ${v.score}`
                      : '렌더링 미완료 · 예약 불가'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className={styles.bulkConfig}>
          <span className={styles.bulkConfigLabel}>시작</span>
          <div className={styles.row}>
            <input
              type="date"
              className={`${styles.input} ${styles.inputSm}`}
              value={draft.date}
              onChange={(e) => e.target.value && patch({ date: e.target.value })}
            />
            <input
              type="time"
              step={600}
              className={`${styles.input} ${styles.inputSm}`}
              style={{ width: 110 }}
              value={draft.time}
              onChange={(e) => e.target.value && patch({ time: e.target.value })}
            />
          </div>

          <span className={styles.bulkConfigLabel}>간격</span>
          <div className={styles.wrapRow}>
            {GAP_OPTIONS.map((g) => (
              <Chip key={g} active={draft.gap === g} onClick={() => patch({ gap: g })}>
                {gapLabel(g)}
              </Chip>
            ))}
          </div>

          <span className={styles.bulkConfigLabel}>플랫폼</span>
          <div className={styles.wrapRow}>
            {PLATFORMS.map((p) => (
              <Chip
                key={p.key}
                active={!!draft.pls[p.key]}
                onClick={() => patch({ pls: { ...draft.pls, [p.key]: !draft.pls[p.key] } })}
              >
                {p.name}
              </Chip>
            ))}
          </div>
        </div>

        {warnings.map((w) => (
          <div key={w} className={styles.noticeWarn}>
            {w}
          </div>
        ))}

        {plan && plan.length > 0 && (
          <div className={styles.planTable}>
            {plan.map((row, i) => (
              <div key={`${row.vid}-${i}`} className={styles.planRow}>
                <b className={styles.planWhen}>
                  {shortDate(row.date)} {row.time}
                </b>
                <span className={`${styles.planTitle} ${styles.ellipsis}`}>
                  {videos[row.vid].title}
                </span>
                <span
                  className={`${styles.planRes} ${row.ok ? styles.planOk : styles.planNo}`}
                >
                  {row.ok
                    ? keys.map((k) => PLATFORM_NAME[k]).join(' · ')
                    : `제외 — ${row.reason}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.modalFoot}>
        <span className={styles.modalNote}>
          {plan
            ? `${okCount}건 배치 가능 · ${plan.length - okCount}건 제외`
            : `시작 ${shortDate(draft.date)} ${draft.time} · ${
                draft.gap < 0 ? '06·18시 빈 자리 채우기' : `간격 ${draft.gap}분`
              } · ${keys.map((k) => PLATFORM_NAME[k]).join(' + ') || '플랫폼 없음'}`}
        </span>
        <div className={styles.modalFootActions}>
          <Btn variant="secondary" size="md" onClick={runAutoPlace}>
            자동 배치
          </Btn>
          <Btn
            variant="primary"
            size="md"
            disabled={!okCount}
            onClick={() => plan && onSaveBulk(draft, plan)}
          >
            {okCount ? `예약 저장 ${okCount}건` : '예약 저장'}
          </Btn>
        </div>
      </div>
    </>
  )
}
