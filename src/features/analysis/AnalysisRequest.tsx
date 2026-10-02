/*
 * 영상 분석 요청 창 — 프로그램·회차를 고르고 원본을 올립니다.
 *
 * 영상 분석 화면의 "영상 분석" 버튼과 프로그램 홈의 같은 버튼이 함께 씁니다.
 * (프로그램 홈에서는 영상 분석 화면으로 보내지 않고 이 창을 그 자리에서 띄웁니다)
 */

import { useRef, useState } from 'react'
import { PROGRAM_OPTIONS } from './data'
import styles from './AnalysisPage.module.css'

export interface AnalysisRequestProps {
  /** 미리 골라 둘 프로그램 — 프로그램 홈에서 열 때 넘깁니다 */
  program?: string
  onClose: () => void
  /** 요청을 넣었을 때 알릴 말 */
  onDone: (message: string) => void
}

export function AnalysisRequest({ program, onClose, onDone }: AnalysisRequestProps) {
  /* 아직 분석한 적 없는 프로그램(편성 예정 등)은 목록에 없어서 앞에 끼워 넣습니다 */
  const options =
    program && !PROGRAM_OPTIONS.some((p) => p.name === program)
      ? [{ name: program, last: 0 }, ...PROGRAM_OPTIONS]
      : PROGRAM_OPTIONS
  /** 그 프로그램의 마지막 회차 — 다음 회차 번호를 미리 채워 둡니다 */
  const lastOf = (name: string) => options.find((p) => p.name === name)?.last ?? 0

  const first = program && options.some((p) => p.name === program) ? program : options[0].name
  const [form, setForm] = useState({ program: first, ep: String(lastOf(first) + 1), file: null as File | null })
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <>
      <button type="button" className={styles.sourceScrim} aria-label="분석 요청 닫기" onClick={onClose} />
      <div className={styles.jobModal} role="dialog" aria-label="영상 분석 요청" aria-modal="true">
        <div className={styles.sourceHead}>
          <div style={{ minWidth: 0 }}>
            <strong>영상 분석</strong>
            <span>프로그램과 회차를 고르고 원본을 올리면 분석 대기열에 들어갑니다.</span>
          </div>
          <button type="button" className={styles.closeBtn} aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.jobForm}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>프로그램</span>
            <select
              className={styles.bigSelect}
              value={form.program}
              onChange={(e) =>
                setForm({ ...form, program: e.target.value, ep: String(lastOf(e.target.value) + 1) })
              }
            >
              {options.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              회차{' '}
              <span className={styles.fieldHint}>
                {lastOf(form.program) ? `마지막 ${lastOf(form.program)}회` : '첫 회차'}
              </span>
            </span>
            <input
              type="number"
              min={1}
              className={styles.epInput}
              value={form.ep}
              onChange={(e) => setForm({ ...form, ep: e.target.value })}
            />
          </label>

          <div className={styles.dropFull}>
            <span className={styles.fieldLabel}>원본 영상</span>
            <button type="button" className={styles.drop} onClick={() => fileInput.current?.click()}>
              {form.file ? (
                <>
                  <strong>{form.file.name}</strong>
                  <span>{(form.file.size / 1024 ** 3).toFixed(2)} GB · 다시 고르려면 누르세요</span>
                </>
              ) : (
                <>
                  <strong>파일 고르기</strong>
                  <span>mp4 · mov · mxf — 끌어다 놓아도 됩니다</span>
                </>
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
            />
          </div>
        </div>

        <div className={styles.jobFoot}>
          <span className={styles.jobNote}>목업 화면이라 실제 업로드와 분석은 실행되지 않습니다.</span>
          <div className={styles.jobActions}>
            <button type="button" className={styles.ghostBtn} onClick={onClose}>
              취소
            </button>
            <button
              type="button"
              className={styles.sourceDownload}
              disabled={!form.ep.trim()}
              onClick={() => {
                onDone(`${form.program} ${form.ep}회 — 분석 대기열에 넣었습니다`)
                onClose()
              }}
            >
              분석 요청
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
