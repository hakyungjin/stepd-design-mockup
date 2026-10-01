import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToString } from 'react-dom/server'

const nodeRequire = createRequire(import.meta.url)
const modules = new Map()
// Load the existing TypeScript modules without starting a bundler service.
function load(file) {
  if (modules.has(file)) return modules.get(file).exports
  const module = { exports: {} }
  modules.set(file, module)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const requireModule = (name) => name.startsWith('@/') ? load(path.resolve('src', name.slice(2)) + '.ts') : name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts') : nodeRequire(name)
  new Function('require', 'module', 'exports', code)(requireModule, module, module.exports)
  return module.exports
}
{
  const { mentionsMe, mentionOf, useMediaCollaborationMock } = load(path.resolve('src/features/media/useMediaCollaborationMock.ts'))
  const comment = { id: 'test-comment', by: '김도윤', text: '@하경진 자막 확인 부탁드려요.', v: 2, at: '방금' }
  assert.equal(mentionsMe(comment), true)
  assert.equal(mentionsMe({ ...comment, by: '하경진' }), false, 'Self mentions do not notify')
  assert.equal(mentionsMe({ ...comment, system: true }), false, 'System comments do not notify')
  assert.equal(mentionsMe({ ...comment, text: '@하경진님 확인해 주세요' }), false, 'Names must match exactly')
  assert.equal(mentionsMe({ ...comment, text: '@김도윤 확인해 주세요' }), false)
  const item = mentionOf({ id: 'test-clip', title: '테스트 영상', ep: 'camp12' }, comment)
  assert.equal(item.clipId, 'test-clip')
  assert.equal(item.commentId, comment.id)
  assert.equal(item.version, comment.v)
  assert.equal(item.read, false)

  let store
  function Probe() { store = useMediaCollaborationMock(); return null }
  renderToString(React.createElement(Probe))
  assert.equal(store.unread, 3)
  for (const notification of store.notifications) {
    const thread = store.threads[notification.clipId]
    assert.ok(thread, 'The target thread exists')
    assert.ok(thread.versions.some((v) => v.v === notification.version), 'The target version exists')
    assert.ok(thread.comments.some((c) => c.id === notification.commentId && c.v === notification.version), 'The notification points to a real comment')
  }
  console.log('Mention checks passed: exact user matching, self/system exclusions, unread seeds and valid video/version/comment targets.')
}
