import assert from 'node:assert/strict'
import { fitTimeline, pointerTime, timelineView, trimBoundary } from '../src/features/editor/reviewTimelineMath.ts'

const duration = 4100
const view = fitTimeline(2462, 2502, duration)
assert.ok(view.start < 2462 && view.end > 2502, 'Both source handles have visible room for extension')
assert.equal(pointerTime(300, 100, 400, view), (view.start + view.end) / 2)
assert.equal(pointerTime(0, 100, 400, view), view.start, 'Dragging outside the left edge stays in the visible source')
assert.equal(pointerTime(600, 100, 400, view), view.end)
assert.equal(pointerTime(100, 100, 0, view), view.start, 'A hidden or zero-width track cannot produce an invalid time')

assert.equal(trimBoundary(2462, 2502, 'trimIn', 2461.93, duration), 2461.9, 'Mouse trims snap to tenths')
assert.equal(trimBoundary(2462, 2502, 'trimOut', 2502.07, duration), 2502.1)
assert.equal(trimBoundary(2462, 2502, 'trimIn', -100, duration), 0)
assert.equal(trimBoundary(2462, 2502, 'trimOut', 5000, duration), duration)
assert.equal(trimBoundary(2462, 2502, 'trimIn', 3000, duration), 2501.9, 'Handles cannot cross')
assert.equal(trimBoundary(2462, 2502, 'trimOut', 2000, duration), 2462.1)
assert.deepEqual(timelineView(-20, 100, duration), { start: 0, end: 100 })
assert.deepEqual(timelineView(4090, 100, duration), { start: 4000, end: 4100 })
assert.deepEqual(timelineView(2000, 10000, duration), { start: 0, end: duration })
assert.equal(timelineView(2462, .5, duration).end - timelineView(2462, .5, duration).start, 2, 'Zoom has a usable minimum window')

// Repeated edge drags at source boundaries must leave a valid, saveable draft.
for (const initial of [[0, .1], [4099.9, 4100], [2462, 2502]]) {
  let [start, end] = initial
  for (const value of [-500, 0, .04, .16, 2502, 4100, 4500]) {
    start = trimBoundary(start, end, 'trimIn', value, duration)
    end = trimBoundary(start, end, 'trimOut', value, duration)
    assert.ok(start >= 0 && end <= duration && end - start >= .099999)
    const fit = fitTimeline(start, end, duration)
    assert.ok(fit.start <= start && fit.end >= end && fit.start >= 0 && fit.end <= duration)
  }
}
console.log('Timeline checks passed: pointer mapping, 0.1-second trimming, non-crossing handles, source limits and zoom bounds.')
