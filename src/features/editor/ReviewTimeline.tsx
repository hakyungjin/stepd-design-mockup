import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { frameImage } from './data'
import { fmtReviewTime } from './shortformReview'
import { fitTimeline, pointerTime, timelineView, trimBoundary, type TrimEdge } from './reviewTimelineMath'
import styles from './ReviewTimeline.module.css'

/* 자막 트랙은 뺐습니다 — 자막은 아래 목록에서 고칩니다 */
interface Props {
  trimIn: number; trimOut: number; sourceDuration: number
  position: number; playing: boolean
  onTrim: (edge: TrimEdge, value: number) => void
  onSeek: (value: number) => void; onToggle: () => void
}

export function ReviewTimeline(props: Props) {
  const { trimIn, trimOut, sourceDuration, position, playing, onTrim, onSeek, onToggle } = props
  const [view, setView] = useState(() => fitTimeline(trimIn, trimOut, sourceDuration))
  const [dragging, setDragging] = useState<TrimEdge | 'seek' | null>(null)
  const drag = useRef<{ id: number; mode: TrimEdge | 'seek'; offset: number } | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const span = view.end - view.start
  const percent = (time: number) => (time - view.start) / span * 100
  const fit = () => setView(fitTimeline(trimIn, trimOut, sourceDuration))
  useEffect(() => {
    if (playing && (position < view.start || position > view.end)) setView(timelineView(position - span * .2, span, sourceDuration))
  }, [playing, position, view.start, view.end, span, sourceDuration])

  const atPointer = (event: PointerEvent<HTMLElement>) => {
    const rect = trackRef.current?.getBoundingClientRect()
    return rect ? pointerTime(event.clientX, rect.left, rect.width, view) : position
  }
  const seek = (value: number) => onSeek(Math.max(0, Math.min(sourceDuration, value)))
  const begin = (event: PointerEvent<HTMLElement>, mode: TrimEdge | 'seek') => {
    if (event.button !== 0 || drag.current) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    const time = atPointer(event)
    drag.current = { id: event.pointerId, mode, offset: mode === 'seek' ? 0 : time - (mode === 'trimIn' ? trimIn : trimOut) }
    setDragging(mode)
    if (playing) onToggle()
    if (mode === 'seek') seek(time)
    else seek(mode === 'trimIn' ? trimIn : trimOut)
  }
  const move = (event: PointerEvent<HTMLElement>) => {
    const active = drag.current
    if (!active || active.id !== event.pointerId) return
    event.stopPropagation()
    const time = atPointer(event) - active.offset
    if (active.mode === 'seek') seek(time)
    else {
      const boundary = trimBoundary(trimIn, trimOut, active.mode, time, sourceDuration)
      onTrim(active.mode, boundary)
      seek(boundary)
    }
  }
  const stop = (event: PointerEvent<HTMLElement>) => {
    if (drag.current?.id !== event.pointerId) return
    drag.current = null
    setDragging(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const interactions = {
    onPointerMove: move, onPointerUp: stop, onPointerCancel: stop,
    onLostPointerCapture: () => { drag.current = null; setDragging(null) },
  }
  const keyTrim = (event: KeyboardEvent<HTMLButtonElement>, edge: TrimEdge) => {
    const step = event.shiftKey ? 1 : .1
    const current = edge === 'trimIn' ? trimIn : trimOut
    let value: number
    if (event.key === 'ArrowLeft') value = current - step
    else if (event.key === 'ArrowRight') value = current + step
    else if (event.key === 'Home') value = edge === 'trimIn' ? 0 : trimIn + .1
    else if (event.key === 'End') value = edge === 'trimIn' ? trimOut - .1 : sourceDuration
    else return
    event.preventDefault()
    if (playing) onToggle()
    const boundary = trimBoundary(trimIn, trimOut, edge, value, sourceDuration)
    onTrim(edge, boundary); seek(boundary)
    if (boundary < view.start || boundary > view.end) setView(timelineView(boundary - span / 2, span, sourceDuration))
  }
  const keySeek = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 1 : .1
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (playing) onToggle()
    seek(event.key === 'Home' ? trimIn : event.key === 'End' ? trimOut : position + (event.key === 'ArrowLeft' ? -step : step))
  }
  const zoom = (factor: number) => {
    const anchor = Math.max(view.start, Math.min(view.end, position))
    const length = Math.max(2, Math.min(sourceDuration, span * factor))
    setView(timelineView(anchor - (anchor - view.start) / span * length, length, sourceDuration))
  }
  const tickStep = [.1, .2, .5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200].find(value => value >= span / 8) ?? 1200
  const ticks = Array.from({ length: Math.ceil(span / tickStep) + 1 }, (_, index) => Math.ceil(view.start / tickStep) * tickStep + index * tickStep).filter(time => time <= view.end)
  const selectedLeft = Math.max(0, Math.min(100, percent(trimIn)))
  const selectedRight = Math.max(0, Math.min(100, percent(trimOut)))

  return <section className={styles.sequence} aria-label="숏폼 원본 타임라인" data-dragging={dragging ?? undefined}>
    <div className={styles.toolbar}>
      <div className={styles.playback}>
        <button type="button" aria-label={playing ? '미리보기 일시정지' : '미리보기 재생'} onClick={onToggle} className={styles.play}>{playing ? 'Ⅱ' : '▶'}</button>
        <time>{fmtReviewTime(Math.max(0, Math.min(trimOut - trimIn, position - trimIn)))}</time><span>/ {fmtReviewTime(trimOut - trimIn)}</span>
        <span className={styles.sourcePosition}>원본 {fmtReviewTime(position)}</span>
      </div>
      <div className={styles.viewTools}>
        <button type="button" aria-label="타임라인 앞 구간 보기" disabled={view.start <= 0} onClick={() => setView(timelineView(view.start - span / 2, span, sourceDuration))}>‹</button>
        <button type="button" aria-label="타임라인 뒤 구간 보기" disabled={view.end >= sourceDuration} onClick={() => setView(timelineView(view.start + span / 2, span, sourceDuration))}>›</button>
        <span className={styles.divider} />
        <button type="button" aria-label="타임라인 축소" disabled={span >= sourceDuration} onClick={() => zoom(2)}>−</button>
        <button type="button" aria-label="타임라인 확대" disabled={span <= 2} onClick={() => zoom(.5)}>＋</button>
        <button type="button" onClick={fit}>구간 맞춤</button>
      </div>
    </div>
    <div className={styles.timelineBody}>
      <div className={styles.labels}><span>원본</span><span><b>V1</b> 영상</span><span><b>S1</b> 자막</span></div>
      <div ref={trackRef} className={styles.tracks} role="group" tabIndex={0} aria-label="원본 시퀀스 탐색" onKeyDown={keySeek} onPointerDown={event => begin(event, 'seek')} {...interactions}>
        <div className={styles.ruler} role="slider" tabIndex={0} aria-label="미리보기 재생 위치" aria-valuemin={0} aria-valuemax={sourceDuration} aria-valuenow={position} aria-valuetext={fmtReviewTime(position)} onKeyDown={event => { event.stopPropagation(); keySeek(event) }} onPointerDown={event => begin(event, 'seek')} {...interactions}>{ticks.map(time => <span key={time} style={{ left: `${percent(time)}%` }}><time>{fmtReviewTime(time)}</time></span>)}</div>
        <div className={styles.videoTrack}>
          <div className={styles.filmstrip}>{Array.from({ length: 24 }, (_, index) => {
            const time = view.start + span * (index + .5) / 24
            return <img key={index} src={frameImage(time < 2470 ? 'f5' : time < 2484 ? 'f6' : time < 2493 ? 'f8' : 'f7')} alt="" draggable={false} />
          })}</div>
          <div className={styles.excluded} style={{ left: 0, width: `${selectedLeft}%` }} />
          <div className={styles.excluded} style={{ left: `${selectedRight}%`, right: 0 }} />
          <div className={styles.selection} style={{ left: `${selectedLeft}%`, width: `${selectedRight - selectedLeft}%` }}><span>나는 SOLO · 32회</span></div>
          {(['trimIn', 'trimOut'] as const).map(edge => {
            const value = edge === 'trimIn' ? trimIn : trimOut
            return <button key={edge} type="button" role="slider" className={styles.trimHandle} data-edge={edge} style={{ left: `${percent(value)}%` }} aria-label={edge === 'trimIn' ? '영상 시작 구간 조절' : '영상 끝 구간 조절'} aria-valuemin={edge === 'trimIn' ? 0 : trimIn + .1} aria-valuemax={edge === 'trimIn' ? trimOut - .1 : sourceDuration} aria-valuenow={value} aria-valuetext={fmtReviewTime(value)} onFocus={() => { if (value < view.start || value > view.end) fit() }} onKeyDown={event => { event.stopPropagation(); keyTrim(event, edge) }} onPointerDown={event => begin(event, edge)} {...interactions}><span /></button>
          })}
        </div>
        {position >= view.start && position <= view.end && <div className={styles.playhead} style={{ left: `${percent(position)}%` }} aria-hidden="true"><span /></div>}
      </div>
    </div>
  </section>
}
