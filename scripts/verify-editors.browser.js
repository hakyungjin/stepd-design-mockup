// Evaluate in the local Vite browser with `orca eval`. The iframe uses an isolated storage map.
(async () => {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;left:-3000px;top:0;width:1734px;height:1204px;border:0'
  const checks = []
  const assert = (condition, label) => { if (!condition) throw new Error(label); checks.push(label) }
  const wait = () => new Promise(resolve => setTimeout(resolve, 100))
  const bootstrap = () => {
    const storage = new Map()
    window.__editorTestStorage = storage
    const read = Storage.prototype.getItem
    const write = Storage.prototype.setItem
    Storage.prototype.getItem = function (key) {
      if (key.startsWith('stepd.editor.')) return storage.get(key) ?? null
      if (key === 'stepd-theme') return 'dark'
      return read.call(this, key)
    }
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('stepd.editor.')) storage.set(key, value)
      else write.call(this, key, value)
    }
    // srcdoc cannot replace its inherited URL; normal Vite pages can.
    history.replaceState = (_state, _title, url) => { location.hash = String(url) }
    location.hash = 'editor-short'
  }
  const source = await (await fetch('/')).text()
  frame.srcdoc = source.replace('<head>', `<head><base href="${location.origin}/"><script>(${bootstrap.toString()})()<\/script>`)
  document.body.append(frame)
  try {
    for (let n = 0; n < 80 && !frame.contentDocument?.querySelector('[data-editor="short"]'); n++) await wait()
    const win = frame.contentWindow
    const doc = frame.contentDocument
    const root = () => doc.querySelector('[data-editor]')
    const button = text => Array.from(doc.querySelectorAll('button')).find(b => b.textContent.trim() === text)
    const labelInput = label => Array.from(doc.querySelectorAll('label')).find(l => l.firstElementChild?.textContent === label)?.querySelector('input,textarea,select')
    const set = (input, value) => {
      const prototype = input.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : input.tagName === 'SELECT' ? win.HTMLSelectElement.prototype : win.HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value)
      input.dispatchEvent(new win.Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
    }
    assert(root()?.dataset.editor === 'short', 'short route opens its own editor')
    await wait()
    const named = name => doc.querySelector(`[aria-label="${name}"]`)
    const review = () => JSON.parse(win.__editorTestStorage.get('stepd.editor.short.review.v1'))
    assert(doc.querySelectorAll('[role="tab"]').length === 2 && button('게시물 · 타이틀') && button('자막 수정'), 'short retains the two automation hold-detail tabs')
    const timeline = named('숏폼 원본 타임라인')
    assert(timeline, 'short exposes a source sequence instead of numeric trim controls')
    assert(!named('앞뒤 구간 미세조정'), 'the old fine adjustment panel is removed')
    const timelineBox = timeline.getBoundingClientRect()
    assert(timelineBox.width > win.innerWidth * .9 && timelineBox.bottom <= win.innerHeight + 1, 'desktop timeline spans the editor and stays within the viewport')
    assert(!button('인코딩').disabled && button('저장').disabled, 'encoding is available even without unsaved edits')
    const handle = edge => named(edge === 'in' ? '영상 시작 구간 조절' : '영상 끝 구간 조절')
    const boundary = edge => Number(handle(edge).getAttribute('aria-valuenow'))
    const keyTrim = (edge, key, shiftKey = false) => handle(edge).dispatchEvent(new win.KeyboardEvent('keydown', { key, shiftKey, bubbles: true }))
    const resetShort = async () => {
      win.location.hash = 'editor-clip'
      for (let n = 0; n < 80 && root()?.dataset.editor !== 'clip'; n++) await wait()
      assert(root()?.dataset.editor === 'clip', 'test switches away from the unsaved short draft')
      win.location.hash = 'editor-short'
      for (let n = 0; n < 80 && root()?.dataset.editor !== 'short'; n++) await wait()
      assert(root()?.dataset.editor === 'short', 'test restores the original short draft')
      await wait()
    }
    keyTrim('in', 'ArrowLeft')
    await wait()
    keyTrim('out', 'ArrowRight')
    await wait()
    assert(boundary('in') === 2461.9 && boundary('out') === 2502.1, 'handles extend both ends in 0.1-second steps')
    keyTrim('out', 'ArrowLeft', true)
    await wait()
    assert(boundary('out') === 2501.1, 'Shift adjusts the focused edge by one second')
    keyTrim('in', 'End')
    await wait()
    assert(boundary('out') - boundary('in') >= .099, 'handles cannot cross or empty the selected range')
    await resetShort()
    keyTrim('in', 'Home')
    await wait()
    assert(boundary('in') === 0, 'start clamps to the beginning of the source')
    keyTrim('out', 'End')
    await wait()
    assert(boundary('out') === 4100, 'end clamps to the end of the source')
    await resetShort()
    const dragEdge = async (edge, seconds) => {
      const element = handle(edge)
      const startBox = handle('in').getBoundingClientRect(), endBox = handle('out').getBoundingClientRect()
      const scale = (endBox.left - startBox.left) / (boundary('out') - boundary('in'))
      const box = element.getBoundingClientRect(), x = box.left + box.width / 2, y = box.top + box.height / 2
      // Synthetic pointers have no browser capture state; isolate that API in this test iframe.
      element.setPointerCapture = () => {}
      element.hasPointerCapture = () => false
      element.dispatchEvent(new win.PointerEvent('pointerdown', { pointerId: 7, button: 0, clientX: x, clientY: y, bubbles: true }))
      await wait()
      element.dispatchEvent(new win.PointerEvent('pointermove', { pointerId: 7, clientX: x + seconds * scale, clientY: y, bubbles: true }))
      await wait()
      element.dispatchEvent(new win.PointerEvent('pointerup', { pointerId: 7, clientX: x + seconds * scale, clientY: y, bubbles: true }))
      delete element.setPointerCapture
      delete element.hasPointerCapture
      await wait()
    }
    await dragEdge('in', -.3)
    await dragEdge('out', .2)
    assert(boundary('in') === 2461.7 && boundary('out') === 2502.2, 'mouse drags update both clip boundaries and playback preview')
    named('타임라인 확대').click()
    await wait()
    named('타임라인 축소').click()
    await resetShort()
    set(named('타이틀 1줄'), '검증용 숏폼 제목')
    await wait()
    assert(doc.querySelector('[aria-label="숏폼 미리보기"]').textContent.includes('검증용 숏폼 제목'), 'title editing updates the existing portrait preview')
    const titleInput = named('타이틀 1줄')
    set(titleInput, '아무도 예상하지 못했던 아주 긴 제목을 화면에 맞춥니다')
    await wait()
    await doc.fonts.ready
    await wait()
    const titleSpan = doc.querySelector('[class*=titleLine] span')
    const titleBox = titleSpan.getBoundingClientRect(), titleParent = titleSpan.parentElement.getBoundingClientRect()
    assert(titleBox.left >= titleParent.left - 1 && titleBox.right <= titleParent.right + 1, 'long title fits within both edges of the portrait preview')
    set(titleInput, '검증용 숏폼 제목')
    await wait()
    set(named('게시물 채널'), 'Instagram')
    await wait()
    set(labelInput('게시물 설명 · 해시태그'), '검증용 Instagram 설명')
    await wait()
    set(named('게시물 채널'), 'YouTube')
    await wait()
    assert(labelInput('게시물 설명 · 해시태그').value !== '검증용 Instagram 설명', 'post metadata remains independent for each channel')
    button('자막 수정').click()
    await wait()
    const originalSecondTime = doc.querySelectorAll('[aria-label="자막 시작 시각"]')[1].value
    for (let n = 0; n < 5; n++) { keyTrim('in', 'ArrowLeft'); await wait() }
    await wait()
    assert(doc.querySelectorAll('[aria-label="자막 시작 시각"]')[1].value === '0:08.5' && originalSecondTime === '0:08.0', 'extending the start preserves caption source times')
    set(doc.querySelector('[aria-label="자막 끝 시각"]'), '0:00.0')
    await wait()
    assert(button('저장').disabled && button('자막 저장').disabled, 'invalid caption timing blocks saving and encoding')
    set(doc.querySelector('[aria-label="자막 끝 시각"]'), '0:08.5')
    await wait()
    const cueCount = doc.querySelectorAll('article[data-selected]').length
    button('＋ 자막 추가').click()
    await wait()
    assert(doc.querySelectorAll('article[data-selected]').length === cueCount + 1, 'caption insertion adds an editable row')
    set(doc.querySelector('[aria-label="자막 1 내용"]'), '')
    await wait()
    button('저장').click()
    await wait()
    assert(review().line1 === '검증용 숏폼 제목' && review().trimIn === 2461.5 && review().cues.length === cueCount, 'explicit save persists trim and removes empty caption rows')
    assert(review().meta.Instagram.body === '검증용 Instagram 설명', 'channel metadata persists with the review draft')
    button('인코딩').click()
    await wait()
    assert(root().textContent.includes('인코딩 서버가 연결되지 않았습니다'), 'encoding reports the unconnected backend without claiming an MP4 exists')
    win.location.hash = 'editor-clip'
    await wait()
    assert(root()?.dataset.editor === 'clip', 'mode switch opens a separate clip editor')
    const clipLength = doc.querySelector('header strong').nextElementSibling.textContent
    button('앞 장면 +4초').click()
    await wait()
    assert(doc.querySelector('header strong').nextElementSibling.textContent !== clipLength, 'clip context extension changes output duration')
    button('＋ 장면 추가').click()
    await wait()
    const countBefore = Array.from(doc.querySelectorAll('aside:first-child [role="tab"]'))[0].textContent
    button('구성에 추가').click()
    await wait()
    assert(Array.from(doc.querySelectorAll('aside:first-child [role="tab"]'))[0].textContent !== countBefore, 'clip recommendation inserts an actual scene')
    button('원본 앞뒤 10초').click()
    await wait()
    assert(doc.querySelector('main').textContent.includes('원본 맥락'), 'clip context preview identifies excluded material')
    for (let n = 0; n < 20 && button('선택 장면 제거'); n++) { button('선택 장면 제거').click(); await wait() }
    assert(doc.querySelector('[aria-label="미리보기 재생"]').disabled, 'empty clip disables playback even in context mode')
    assert(button('내보내기 설정 ↗').disabled, 'empty clip cannot export a nonexistent sequence')
    doc.querySelector('[aria-label="실행 취소"]').click()
    await wait()
    assert(!button('내보내기 설정 ↗').disabled, 'undo restores a removed clip scene')
    Array.from(doc.querySelectorAll('[aria-label="편집기 선택"] button')).find(b => b.textContent.startsWith('하이라이트')).click()
    await wait()
    assert(root()?.dataset.editor === 'hl', 'mode switch opens a separate highlight editor')
    const totalBefore = doc.querySelector('header strong').nextElementSibling.textContent
    button('제외').click()
    await wait()
    assert(doc.querySelector('header strong').nextElementSibling.textContent !== totalBefore, 'highlight exclusion reduces output duration')
    button('다시 포함').click()
    await wait()
    assert(doc.querySelector('header strong').nextElementSibling.textContent === totalBefore, 'highlight inclusion restores duration')
    const countChapters = doc.querySelector('[aria-label="하이라이트 챕터 목록"]').querySelectorAll('button[aria-pressed]').length
    button('＋ 챕터 추가').click()
    await wait()
    assert(doc.querySelector('[aria-label="하이라이트 챕터 목록"]').querySelectorAll('button[aria-pressed]').length === countChapters + 1, 'highlight adds a distinct empty chapter')
    button('＋ 추가').click()
    await wait()
    assert(doc.querySelectorAll('article[data-selected]').length === 1, 'recommendation populates the selected chapter')
    set(labelInput('챕터로 이동'), JSON.parse(win.__editorTestStorage.get('stepd.editor.hl.v1') ?? '{}').chapters?.[0]?.id ?? 'ch0')
    await wait()
    assert(doc.querySelectorAll('article[data-selected]').length === 3, 'chapter transfer moves the scene without losing existing scenes')
    button('내보내기 설정 ↗').click()
    await wait()
    assert(doc.querySelector('dialog')?.open, 'export opens an accessible native dialog')
    doc.querySelector('[aria-label="내보내기 설정 닫기"]').click()
    await wait()
    for (const mode of ['short', 'clip', 'hl']) {
      win.location.hash = `editor-${mode}`
      await wait()
      assert(root()?.dataset.editor === mode, `${mode} direct route restores the correct editor`)
      for (const width of [390, 768, 1734]) {
        frame.style.width = `${width}px`
        await wait()
        assert(doc.documentElement.scrollWidth <= win.innerWidth, `${mode} fits ${width}px without horizontal overflow`)
        if (mode === 'short') assert(root().getBoundingClientRect().width >= doc.documentElement.clientWidth - 1, `short uses the full ${width}px viewport width`)
      }
    }
    win.location.hash = 'editor-short'
    await wait()
    assert(doc.querySelector('[aria-label="타이틀 1줄"]').value === '검증용 숏폼 제목' && doc.querySelector('[aria-label="영상 시작 구간 조절"]').getAttribute('aria-valuenow') === '2461.5', 'short review draft survives independent editor transitions')
    return JSON.stringify({ passed: checks.length, checks })
  } finally { frame.remove() }
})()
