import assert from 'node:assert/strict'
import { createWorkReply, detectWorkKind, makeDraft, totalDuration } from '../src/features/chat/workspaceMock.ts'

const flows = [
  ['영호가 화내는 장면 찾아줘', 'search'],
  ['숏폼 앞 2초 자르고 자막 좀 크게 해줘', 'edit'],
  ['영호·영숙 만남 과정 8분 하이라이트 기획해줘', 'highlight'],
  ['채널 배너랑 프로필 바꿔줘', 'channel'],
  ['다음 주부터 월·수·금 나미브 영상 3개씩 배포해줘', 'deploy'],
]
for (const [prompt, kind] of flows) {
  const result = createWorkReply(prompt, '나는 SOLO')
  assert.equal(result?.draft.kind, kind)
  assert.equal(result.draft.approved, false, 'Generated drafts require approval')
}
assert.equal(detectWorkKind('매일 아침 9시에 배포 오류를 정리해 주세요'), null, 'Recurring reports keep the existing task flow')
assert.equal(detectWorkKind('매일 오전 9시에 배포 결과를 이메일로 보내줘'), null)

const source = makeDraft('highlight')
source.approved = true
source.deployment = { days: ['금'], time: '18:00', start: '2026-10-02', count: 1, platform: 'YouTube' }
const revised = createWorkReply('갈등 장면은 빼고 첫 데이트를 더 넣어줘', '나는 SOLO', source).draft
assert.equal(revised.scenes.length, 5)
assert.equal(revised.scenes.some((s) => s.id === 'conflict'), false)
assert.equal(revised.scenes.find((s) => s.id === 'date').seconds, 200)
assert.equal(totalDuration(revised), 480)
assert.equal(revised.approved, false, 'Revisions require fresh approval')
assert.deepEqual(revised.deployment, source.deployment)
assert.equal(source.scenes.length, 6, 'The previous version stays unchanged')
assert.equal(source.scenes.find((s) => s.id === 'date').seconds, 130)

const search = createWorkReply(flows[0][0], '나는 SOLO').draft
const shorts = createWorkReply('그중에 숏폼 될 만한 것만', '나는 SOLO', search).draft
assert.deepEqual(shorts.scenes.map((s) => s.id), ['s12', 's41'])
assert.equal(search.scenes.length, 3)

const edit = createWorkReply(flows[1][0], '나는 SOLO').draft
assert.equal(totalDuration(edit), 43)
assert.equal(edit.subtitleSize, 42)
const trimmed = createWorkReply('끝은 영호 웃는 데까지만', '나는 SOLO', edit).draft
assert.equal(totalDuration(trimmed), 41)
assert.equal(totalDuration(edit), 43)

const plan = createWorkReply(flows[4][0], '나는 SOLO').draft
assert.equal(plan.program, '나미브')
assert.deepEqual(plan.deployment.days, ['월', '수', '금'])
const updated = createWorkReply('평일 19시에 2개씩 배포해줘', '나미브', plan).draft
assert.equal(updated.deployment.time, '19:00')
assert.equal(updated.deployment.count, 2)
assert.deepEqual(updated.deployment.days, ['월', '화', '수', '목', '금'])
assert.equal(plan.deployment.time, '18:00')

console.log('Agent mock checks passed: 5 workflows, approval boundaries, version preservation, editing, search filtering and deployment conditions.')
