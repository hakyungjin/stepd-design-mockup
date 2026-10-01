export interface TimelineView { start: number; end: number }
export type TrimEdge = 'trimIn' | 'trimOut'

const tenth = (value: number) => Math.round(value * 10) / 10

export function trimBoundary(start: number, end: number, edge: TrimEdge, value: number, sourceDuration: number) {
  const snapped = tenth(value)
  return edge === 'trimIn'
    ? Math.max(0, Math.min(tenth(end - .1), snapped))
    : Math.min(sourceDuration, Math.max(tenth(start + .1), snapped))
}

export function timelineView(start: number, span: number, sourceDuration: number): TimelineView {
  const length = Math.max(Math.min(2, sourceDuration), Math.min(sourceDuration, span))
  const left = Math.max(0, Math.min(sourceDuration - length, start))
  return { start: left, end: left + length }
}

export function fitTimeline(start: number, end: number, sourceDuration: number) {
  const padding = Math.max(3, (end - start) * .2)
  return timelineView(start - padding, end - start + padding * 2, sourceDuration)
}

export function pointerTime(clientX: number, left: number, width: number, view: TimelineView) {
  const fraction = width > 0 ? Math.max(0, Math.min(1, (clientX - left) / width)) : 0
  return tenth(view.start + fraction * (view.end - view.start))
}
