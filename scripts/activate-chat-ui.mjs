import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'package.json'))
const checkOnly = process.argv.includes('--check')
for (const dependency of checkOnly ? [] : ['@chatscope/chat-ui-kit-react', '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css']) {
  try { require.resolve(dependency) }
  catch {
    console.error('먼저 npm install @chatscope/chat-ui-kit-react@2.1.1 @chatscope/chat-ui-kit-styles@1.4.0 을 실행해 주세요.')
    process.exit(1)
  }
}
const pagePath = path.join(root, 'src/features/chat/ChatPage.tsx')
let page = fs.readFileSync(pagePath, 'utf8').replaceAll('\r\n', '\n')
if (page.includes("import { ChatSurface } from './ChatSurface'")) {
  console.log('Chatscope 채팅 UI가 이미 적용되어 있습니다.')
  process.exit(0)
}
function replaceOnce(before, after) {
  if (!page.includes(before) || page.indexOf(before) !== page.lastIndexOf(before)) throw new Error('ChatPage 구조가 변경되어 자동 적용을 중단했습니다: ' + before.slice(0, 55))
  page = page.replace(before, after)
}
replaceOnce("import styles from './ChatPage.module.css'", "import styles from './ChatPage.module.css'\nimport { ChatSurface } from './ChatSurface'\nimport type { ChatInputHandle } from './ChatSurface.types'")
replaceOnce("  const endRef = useRef<HTMLDivElement>(null)\n", '')
replaceOnce('useRef<HTMLTextAreaElement>(null)', 'useRef<ChatInputHandle>(null)')
replaceOnce("  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [store.selectedId, store.selected?.messages.length, store.busy, store.view])\n", '')
replaceOnce("  useEffect(() => { setInput(''); if (inputRef.current) inputRef.current.style.height = 'auto' }, [store.selectedId])\n", '')
replaceOnce("  const newChat = () => { store.newChat();", "  const newChat = () => { setInput(''); store.newChat();")
replaceOnce("  const openConversation = (id: string) => { store.select(id);", "  const openConversation = (id: string) => { setInput(''); store.select(id);")
replaceOnce('      el?.setSelectionRange(0, el.value.length)', '      el?.select()')
replaceOnce("    if (inputRef.current) inputRef.current.style.height = 'auto'\n", '')
page = page.replace(/^  const suggestions = .*\r?\n/m, '')
const startMarker = ' : <div className={styles.chat}>'
const endMarker = '\n      </div>}\n    </div>'
const start = page.indexOf(startMarker)
const end = page.indexOf(endMarker, start)
if (start < 0 || end < 0) throw new Error('채팅 영역을 찾지 못했습니다. 자동 적용을 중단합니다.')
const surface = ` : <ChatSurface store={store} input={input} onInputChange={setInput} onSend={send} inputRef={inputRef} renderTaskSuggestion={(message) => <TaskSuggestion message={message} onCreate={() => {
        const id = tasks.save(message.suggestion!)
        store.markCreated(message.id, id)
        setNotice('예약 작업을 추가했습니다.')
      }} onAdjust={() => setEditor({ seed: { ...message.suggestion, sourceThreadId: store.selectedId ?? undefined } })} onOpenTasks={openTasks} />} />}`
page = page.slice(0, start) + surface + page.slice(end + '\n      </div>}'.length)

const outputs = new Map([
  [pagePath, page],
  [path.join(root, 'src/features/chat/ChatSurface.tsx'), fs.readFileSync(path.join(root, 'integrations/chatscope/ChatSurface.tsx'), 'utf8')],
  [path.join(root, 'src/features/chat/chatscope.module.css'), fs.readFileSync(path.join(root, 'integrations/chatscope/chatscope.module.css'), 'utf8')],
])
if (checkOnly) {
  const ts = require('typescript')
  for (const [target, content] of outputs) {
    if (!target.endsWith('.tsx')) continue
    const result = ts.transpileModule(content, { reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
    const errors = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? []
    if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: (file) => file, getCurrentDirectory: () => root, getNewLine: () => '\n' }))
  }
  console.log('적용 위치와 TSX 문법 확인 완료. 패키지 호환성·화면 검증은 설치 후 수행합니다.')
  process.exit(0)
}
const backups = new Map([...outputs.keys()].map((target) => [target, fs.existsSync(target) ? fs.readFileSync(target) : null]))
try {
  for (const [target, content] of outputs) fs.writeFileSync(target, content, 'utf8')
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], { cwd: root, stdio: 'inherit' })
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--configLoader', 'runner'], { cwd: root, stdio: 'inherit' })
  console.log('Chatscope React 채팅 UI 적용과 타입 검사·빌드가 완료되었습니다.')
} catch (error) {
  for (const [target, content] of backups) {
    if (content === null) fs.rmSync(target, { force: true })
    else fs.writeFileSync(target, content)
  }
  console.error('검증에 실패해 채팅 소스를 적용 전 상태로 복원했습니다.')
  throw error
}
