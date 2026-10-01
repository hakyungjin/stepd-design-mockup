import { useEffect, useMemo, useRef, useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { Select } from '@/components/ui/Controls'
import { PageTopBar } from '@/layout/AppShell'
import type { ScreenKey } from '@/app/screens'
import {
  CHARACTER_NAMES,
  PROGRAM_OPTIONS,
  SCENE_NAMES,
  SEGMENTS,
  castOf,
  timeText,
  type ProgramKey,
  type Segment,
} from './data'
import styles from './VideoSearchPage.module.css'

/** 300초를 넘는 구간은 내려받을 수 없습니다 */
const MAX_DOWNLOAD_SEC = 300
const SEARCH_DELAY_MS = 450
const DOWNLOAD_DELAY_MS = 1200

type DownloadState = 'idle' | 'busy' | 'done'

export interface VideoSearchPageProps {
  /** 원본 목업의 보기 옵션 — 'keyword'(키워드 단독) · 'error'(검색 실패) */
  mode?: 'normal' | 'keyword' | 'error'
  onNavigate: (screen: ScreenKey) => void
}

export function VideoSearchPage({ mode = 'normal', onNavigate }: VideoSearchPageProps) {
  const [query, setQuery] = useState('')
  /** 실제로 검색을 실행한 질의 */
  const [ran, setRan] = useState('')
  const [program, setProgram] = useState<ProgramKey | ''>('')
  /** 프로그램에서 인식된 출연자 중 고른 사람 */
  const [person, setPerson] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Segment | null>(null)
  const [download, setDownload] = useState<DownloadState>('idle')

  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const runSearch = () => {
    setBusy(true)
    const t = setTimeout(() => {
      setBusy(false)
      setRan(query.trim())
    }, SEARCH_DELAY_MS)
    timers.current.push(t)
  }

  /** 고른 프로그램에서 인식된 출연자 */
  const castOptions = useMemo(() => (program ? castOf(program) : []), [program])

  /* ---------------- 질의 해석 ---------------- */
  const matchedChars = useMemo(
    () => CHARACTER_NAMES.filter((n) => ran.includes(n)),
    [ran],
  )
  const matchedScene = useMemo(() => SCENE_NAMES.find((s) => ran.includes(s)) ?? null, [ran])

  /* ---------------- 검색 ---------------- */
  const results = useMemo(() => {
    const list = SEGMENTS.filter(
      (h) => (!program || h.program === program) && (!person || h.chars.includes(person)),
    )

    if (!ran) return list.slice().sort((a, b) => b.highlight - a.highlight)

    const words = ran.split(/\s+/).filter((w) => w.length > 1 && !matchedChars.includes(w))
    return list
      .map((h) => {
        const hay = `${h.summary} ${h.dialogue} ${h.chars.join(' ')} ${h.scene ?? ''}`
        const score =
          matchedChars.filter((c) => h.chars.includes(c)).length * 2 +
          (matchedScene && h.scene === matchedScene ? 2 : 0) +
          words.filter((w) => hay.includes(w.slice(0, 2))).length
        return { h, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.h.score - a.h.score)
      .map((x) => x.h)
  }, [matchedChars, matchedScene, person, program, ran])

  const failed = mode === 'error'
  const keywordOnly = mode === 'keyword'
  const shown = failed ? [] : results

  const counterText = failed
    ? '검색에 실패했습니다 (검색 서버 응답 없음)'
    : !ran
      ? `${shown.length}건 · 하이라이트 순`
      : `${shown.length}건 · ${keywordOnly ? '키워드 단독' : '의미+키워드'}`

  const openSegment = (seg: Segment) => {
    setSelected(seg)
    setDownload('idle')
  }

  const selectedDuration = selected ? selected.end - selected.start : 0
  const tooLong = selectedDuration > MAX_DOWNLOAD_SEC

  const startDownload = () => {
    if (!selected || tooLong) return
    setDownload('busy')
    const t = setTimeout(() => setDownload('done'), DOWNLOAD_DELAY_MS)
    timers.current.push(t)
  }

  return (
    <>
      <PageTopBar title="영상 검색" />

      <div className={styles.page}>
        <div className={styles.searchRow}>
          <input
            type="text"
            className={styles.searchInput}
            aria-label="검색어"
            placeholder="찾고 싶은 장면을 문장으로 (예: 지난달 방송에서 출연자가 정색하며 판을 뒤집는 순간)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch()
            }}
          />
          <Btn variant="primary" size="md" disabled={busy} onClick={runSearch}>
            {busy ? '찾는 중…' : '검색'}
          </Btn>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterLeft}>
            <Select
              look="pill"
              aria-label="프로그램"
              value={program}
              onChange={(e) => {
                setProgram(e.target.value as ProgramKey | '')
                // 프로그램이 바뀌면 출연자도 달라집니다
                setPerson('')
              }}
            >
              <option value="">전체 프로그램</option>
              {PROGRAM_OPTIONS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </Select>

            {/* 프로그램을 골라야 그 프로그램에서 인식된 출연자를 보여 줄 수 있습니다 */}
            {castOptions.length > 0 && (
              <Select
                look="pill"
                aria-label="출연자"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
              >
                <option value="">전체 출연자</option>
                {castOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <span className={styles.counter}>{counterText}</span>
        </div>

        {ran && !failed && (
          <div className={styles.parsed}>
            <span>질의 해석</span>
            {matchedChars.length > 0 && (
              <span>
                인물: <b className={styles.parsedValue}>{matchedChars.join(', ')}</b>
              </span>
            )}
            {matchedScene && (
              <span>
                장면: <b className={styles.parsedValue}>{matchedScene}</b>
              </span>
            )}
            {keywordOnly && <span>의미 축(임베딩)이 걸리지 않아 키워드만으로 찾았습니다</span>}
          </div>
        )}

        {shown.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m16 13 5.2 3.1a.5.5 0 0 0 .8-.4V8.3a.5.5 0 0 0-.8-.4L16 11" />
                <rect x="2" y="6" width="14" height="12" rx="2" />
              </svg>
            </span>
            <div className={styles.emptyTitle}>
              {busy ? '찾는 중…' : '조건에 맞는 영상이 없습니다'}
            </div>
            <div className={styles.emptyNote}>
              검색어나 상단 필터 조건을 변경해 보세요. 분석을 마친 회차만 검색됩니다.
            </div>
          </div>
        )}

        <div className={styles.grid}>
          {shown.map((h) => (
            <button key={h.id} type="button" className={styles.card} onClick={() => openSegment(h)}>
              <div className={styles.cardMedia}>
                <img src={h.thumb} alt={h.summary} loading="lazy" className={styles.cardImage} />
                <span className={styles.durPill}>{Math.round(h.end - h.start)}초</span>
                <div className={styles.mediaTags}>
                  {h.scene && <span className={styles.mediaTag}>{h.scene}</span>}
                </div>
              </div>

              <div className={styles.cardBody}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className={styles.cardMeta}>
                    <b className={styles.cardRange}>
                      {timeText(h.start)} - {timeText(h.end)}
                    </b>
                    <span className={styles.cardSource}>{h.source}</span>
                  </div>
                  <div className={styles.cardSummary}>{h.summary}</div>
                  <div className={styles.cardChars}>{h.chars.slice(0, 4).join(' · ')}</div>
                </div>

              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className={styles.scrim} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalMeta}>
                <b className={styles.modalRange}>
                  {timeText(selected.start)} - {timeText(selected.end)}
                </b>
                <span className={styles.modalTag}>{Math.round(selectedDuration)}초</span>
                <span className={styles.modalTag}>{selected.short ? '숏폼' : '롱폼'}</span>
                {selected.scene && <span className={styles.modalTag}>{selected.scene}</span>}
                <span className={styles.modalSource}>{selected.source}</span>
              </div>
              <Btn variant="secondary" size="sm" onClick={() => setSelected(null)}>
                닫기
              </Btn>
            </div>

            <div className={styles.player}>
              <img src={selected.thumb} alt="" className={styles.playerImage} />
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalText}>
                <div className={styles.modalSummary}>{selected.summary}</div>
                <div className={styles.modalDialogue}>“{selected.dialogue}”</div>
                <div className={styles.modalChars}>{selected.chars.join(' · ')}</div>
              </div>

              <div className={styles.modalActions}>
                <div className={styles.modalActionsLeft}>
                  <Btn
                    variant="primary"
                    size="md"
                    disabled={tooLong || download === 'busy'}
                    title={tooLong ? '300초를 넘는 구간은 내려받을 수 없습니다' : undefined}
                    onClick={startDownload}
                  >
                    {download === 'busy' ? '내려받는 중…' : '구간 다운로드'}
                  </Btn>
                  {download === 'done' && <span className={styles.dlDone}>내려받았습니다</span>}
                  {tooLong && (
                    <span className={styles.dlNote}>
                      300초를 넘는 구간은 내려받을 수 없습니다
                    </span>
                  )}
                </div>

                {selected.hasEpisode ? (
                  <button
                    type="button"
                    className={styles.episodeLink}
                    onClick={() => onNavigate('analysis')}
                  >
                    회차에서 열기
                  </button>
                ) : (
                  <span
                    className={styles.episodeLinkOff}
                    title="이 미디어에 연결된 회차가 없습니다"
                  >
                    회차에서 열기
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
