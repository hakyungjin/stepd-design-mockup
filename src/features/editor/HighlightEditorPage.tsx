import { useState } from 'react'
import { CHAPTERS, CHAPTER_COLORS, HL_RECS, frameImage, timeText, type Chapter, type HlCard, type Recommendation } from './data'
import { EditorHeader, ExportDialog, Field, PanelHeading, Preview, Transport, useDraft, useTransport, type WorkspaceProps } from './workspace'
import styles from './Workspace.module.css'

interface HighlightDraft { title: string; chapters: Chapter[]; captions: boolean; opening: string; ending: string }
const INITIAL: HighlightDraft = { title: '영호와 영숙, 첫 만남부터 최종 선택까지', chapters: CHAPTERS, captions: true, opening: '영호와 영숙의 이야기', ending: '두 사람의 최종 선택', }
const validDraft = (value: unknown): value is HighlightDraft => {
  if (!value || typeof value !== 'object') return false
  const draft = value as HighlightDraft
  return typeof draft.title === 'string' && typeof draft.captions === 'boolean' && typeof draft.opening === 'string' && typeof draft.ending === 'string' && Array.isArray(draft.chapters) && draft.chapters.length > 0 && draft.chapters.every(chapter => typeof chapter.id === 'string' && typeof chapter.title === 'string' && Number.isInteger(chapter.col) && chapter.col >= 0 && Array.isArray(chapter.cards) && chapter.cards.every(card => typeof card.id === 'string' && typeof card.ep === 'string' && Number.isFinite(card.dur) && card.dur > 0 && typeof card.img === 'string' && typeof card.line === 'string' && typeof card.tag === 'string' && typeof card.excluded === 'boolean'))
}
const chapterDuration = (chapter: Chapter) => chapter.cards.filter(card => !card.excluded).reduce((sum, card) => sum + card.dur, 0)

export function HighlightEditorPage({ onNavigate }: WorkspaceProps) {
  const draft = useDraft('hl', INITIAL, validDraft)
  const { state, update } = draft
  const [chapterId, setChapterId] = useState(state.chapters[0]?.id ?? '')
  const [cardId, setCardId] = useState(state.chapters[0]?.cards[0]?.id ?? '')
  const [exportOpen, setExportOpen] = useState(false)
  const chapter = state.chapters.find(ch => ch.id === chapterId) ?? state.chapters[0]
  const chapterIndex = state.chapters.indexOf(chapter)
  const selected = chapter?.cards.find(card => card.id === cardId) ?? chapter?.cards[0]
  const sequence = state.chapters.flatMap(ch => ch.cards.filter(card => !card.excluded).map(card => ({ ...card, chapter: ch })))
  const total = sequence.reduce((sum, card) => sum + card.dur, 0)
  const transport = useTransport(0, total)
  let offset = 0
  const playingCard = sequence.find(card => { const start = offset; offset += card.dur; return transport.pos >= start && transport.pos < offset }) ?? sequence[sequence.length - 1]
  const current = transport.playing ? playingCard : selected
  const currentChapter = transport.playing ? playingCard?.chapter : chapter
  const pickChapter = (id: string) => { const next = state.chapters.find(ch => ch.id === id); setChapterId(id); setCardId(next?.cards[0]?.id ?? '') }
  const pickCard = (card: HlCard) => {
    setCardId(card.id)
    const index = sequence.findIndex(item => item.id === card.id)
    if (index >= 0) transport.seek(sequence.slice(0, index).reduce((sum, item) => sum + item.dur, 0))
  }
  const patchCard = (patch: Partial<HlCard>) => {
    if (!selected) return
    update(current => ({ ...current, chapters: current.chapters.map(ch => ({ ...ch, cards: ch.cards.map(card => card.id === selected.id ? { ...card, ...patch } : card) })) }))
  }
  const moveCard = (id: string, targetId: string) => update(current => {
    const card = current.chapters.flatMap(ch => ch.cards).find(item => item.id === id)
    if (!card || !current.chapters.some(ch => ch.id === targetId)) return current
    return { ...current, chapters: current.chapters.map(ch => ({ ...ch, cards: ch.id === targetId ? [...ch.cards.filter(item => item.id !== id), card] : ch.cards.filter(item => item.id !== id) })) }
  })
  const reorderCard = (id: string, delta: number) => update(current => ({ ...current, chapters: current.chapters.map(ch => {
    const index = ch.cards.findIndex(card => card.id === id)
    const target = index + delta
    if (index < 0 || target < 0 || target >= ch.cards.length) return ch
    const cards = [...ch.cards]; [cards[index], cards[target]] = [cards[target], cards[index]]
    return { ...ch, cards }
  }) }))
  const reorderChapter = (delta: number) => update(current => {
    const chapters = [...current.chapters]
    const index = chapters.findIndex(ch => ch.id === chapter.id)
    const target = index + delta
    if (target < 0 || target >= chapters.length) return current
    ;[chapters[index], chapters[target]] = [chapters[target], chapters[index]]
    return { ...current, chapters }
  })
  const addChapter = () => {
    const id = `chapter-${crypto.randomUUID()}`
    update(current => ({ ...current, chapters: [...current.chapters, { id, title: '새 챕터', col: current.chapters.length % CHAPTER_COLORS.length, cards: [] }] }))
    setChapterId(id); setCardId('')
  }
  const addRecommendation = (rec: Recommendation) => {
    const id = `highlight-${crypto.randomUUID()}`
    const card: HlCard = { id, ep: rec.ep ?? '32회', dur: rec.dur, img: rec.img, line: rec.line, tag: rec.tag ?? rec.why, excluded: false }
    update(current => ({ ...current, chapters: current.chapters.map(ch => ch.id === chapter.id ? { ...ch, cards: [...ch.cards, card] } : ch) }))
    setCardId(id)
  }
  return <div className={styles.workspace} data-editor="hl">
    <EditorHeader mode="hl" title={state.title} duration={total} {...draft} onNavigate={onNavigate} onExport={() => setExportOpen(true)} />
    <div className={styles.hlBody}>
      <aside className={`${styles.panel} ${styles.leftPanel}`} aria-label="하이라이트 챕터 목록">
        <PanelHeading title="스토리 구성" meta={`${state.chapters.length}개 챕터`} />
        <div className={styles.chapterNav}>{state.chapters.map((ch, index) => <button type="button" key={ch.id} aria-pressed={chapter.id === ch.id} onClick={() => pickChapter(ch.id)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (id) { moveCard(id, ch.id); setChapterId(ch.id); setCardId(id) } }}><span className={styles.chapterNumber}>{String(index + 1).padStart(2, '0')}</span><span><strong>{ch.title}</strong><small>{ch.cards.filter(card => !card.excluded).length}개 장면 · {timeText(chapterDuration(ch))}</small></span></button>)}</div>
        <div className={styles.panelContent}><button type="button" className={styles.button} onClick={addChapter}>＋ 챕터 추가</button></div>
        <div className={styles.chapterOutline}><p>여러 회차의 장면을 모아 하나의 이야기를 구성합니다. 카드를 챕터 이름 위로 끌어 옮길 수 있습니다.</p><Field label="하이라이트 제목"><textarea value={state.title} onChange={event => update(current => ({ ...current, title: event.target.value }))} /></Field></div>
      </aside>
      <main className={styles.storyboard} aria-label="하이라이트 장면 보드">
        <div className={styles.storyHead}><div><h1>하이라이트 편집기</h1><p>회차를 넘어, 이야기의 흐름을 연결하세요.</p></div><span className={styles.recScore}>{sequence.length}개 장면 · {timeText(total)}</span></div>
        <div className={styles.chapterEdit}><span className={styles.chapterNumber}>{String(chapterIndex + 1).padStart(2, '0')}</span><input aria-label="챕터 이름" value={chapter.title} onChange={event => update(current => ({ ...current, chapters: current.chapters.map(ch => ch.id === chapter.id ? { ...ch, title: event.target.value } : ch) }))} /><button type="button" className={styles.iconButton} aria-label="챕터 앞으로 이동" disabled={chapterIndex === 0} onClick={() => reorderChapter(-1)}>←</button><button type="button" className={styles.iconButton} aria-label="챕터 뒤로 이동" disabled={chapterIndex === state.chapters.length - 1} onClick={() => reorderChapter(1)}>→</button></div>
        <div className={styles.storyCards}>{chapter.cards.map((card, index) => <article key={card.id} className={styles.storyCard} data-selected={card.id === selected?.id} data-excluded={card.excluded} draggable onDragStart={event => event.dataTransfer.setData('text/plain', card.id)}>
          <button type="button" className={styles.storyPick} aria-pressed={card.id === selected?.id} onClick={() => pickCard(card)}><div className={styles.storyImage}><img src={frameImage(card.img)} alt="" /><span>{card.excluded ? '결과물에서 제외' : timeText(card.dur)}</span></div><div className={styles.storyCaption}><small>{card.ep} · {card.tag}</small><p>“{card.line}”</p></div></button>
          <div className={styles.storyCardActions}><button type="button" className={styles.iconButton} aria-label={`${card.ep} 장면 앞으로 이동`} disabled={index === 0} onClick={() => reorderCard(card.id, -1)}>←</button><button type="button" className={styles.iconButton} aria-label={`${card.ep} 장면 뒤로 이동`} disabled={index === chapter.cards.length - 1} onClick={() => reorderCard(card.id, 1)}>→</button><button type="button" className={styles.button} onClick={() => update(current => ({ ...current, chapters: current.chapters.map(ch => ({ ...ch, cards: ch.cards.map(item => item.id === card.id ? { ...item, excluded: !item.excluded } : item) })) }))}>{card.excluded ? '다시 포함' : '제외'}</button></div>
        </article>)}</div>
        {!chapter.cards.length && <p className={styles.empty}>아래 추천 장면을 추가하거나 다른 챕터의 장면을 옮겨 시작하세요.</p>}
        <section className={styles.sourceShelf}><h2>이야기를 연결할 추천 장면</h2><p>선택한 ‘{chapter.title}’ 챕터에 추가합니다.</p><div className={styles.sourceGrid}>{HL_RECS.map(rec => <div className={styles.recCard} key={rec.title}><img src={frameImage(rec.img)} alt="" /><div className={styles.recBody}><strong>{rec.title}</strong><p>{rec.ep}</p><div><span className={styles.recScore}>{rec.why}</span><button type="button" className={styles.button} onClick={() => addRecommendation(rec)}>＋ 추가</button></div></div></div>)}</div></section>
      </main>
      <aside className={`${styles.panel} ${styles.rightPanel}`} aria-label="하이라이트 미리보기와 장면 속성">
        <div className={styles.hlPreview}><PanelHeading title="결과물 미리보기" meta="16:9" /><div className={styles.stageArea}>{current ? <Preview image={current.img} caption={state.captions ? current.line : undefined} badge={current.excluded ? '제외된 장면' : currentChapter?.title} /> : <p className={styles.empty}>선택한 챕터에 장면을 추가하세요.</p>}</div><div className={styles.previewNote}>샘플 프레임 미리보기</div><Transport transport={transport} end={total} /></div>
        <div className={styles.selectionDetails}><h3>선택 장면</h3>{selected ? <><p>{selected.ep}</p><Field label="장면 설명·자막"><textarea value={selected.line} onChange={event => patchCard({ line: event.target.value })} /></Field><div className={styles.fieldRow}><Field label="사용 길이 (초)"><input type="number" min="0.5" max="600" step="0.5" value={selected.dur} onChange={event => { if (event.target.value !== '') patchCard({ dur: Math.max(.5, Math.min(600, Number(event.target.value))) }) }} /></Field><Field label="감정·주제"><input value={selected.tag} onChange={event => patchCard({ tag: event.target.value })} /></Field></div><Field label="챕터로 이동"><select value={chapter.id} onChange={event => { moveCard(selected.id, event.target.value); setChapterId(event.target.value); setCardId(selected.id) }}>{state.chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}</select></Field><label className={styles.toggleField}>결과물에 포함<input type="checkbox" checked={!selected.excluded} onChange={event => patchCard({ excluded: !event.target.checked })} /></label></> : <p>장면을 선택하면 길이와 자막을 조절할 수 있습니다.</p>}
          <label className={styles.toggleField}>말자막 표시<input type="checkbox" checked={state.captions} onChange={event => update(current => ({ ...current, captions: event.target.checked }))} /></label>
          <Field label="오프닝 제목"><input value={state.opening} onChange={event => update(current => ({ ...current, opening: event.target.value }))} /></Field><Field label="엔딩 문구"><input value={state.ending} onChange={event => update(current => ({ ...current, ending: event.target.value }))} /></Field>
          <p className={styles.help}>오프닝·엔딩 문구는 내보내기 설정에 저장됩니다.</p>
        </div>
      </aside>
    </div>
    <footer className={styles.timeline} aria-label="하이라이트 전체 스토리 흐름">
      <div className={styles.timelineHead}><div><h2>전체 스토리 흐름</h2><small>{state.chapters.length}개 챕터 · {sequence.length}개 장면 · {timeText(total)}</small></div><span className={styles.help}>제외한 장면은 결과물 길이에 포함되지 않습니다.</span></div>
      <div className={styles.storyFlow}>{state.chapters.map((ch, index) => <button type="button" key={ch.id} style={{ flex: Math.max(1, chapterDuration(ch)), borderTopColor: CHAPTER_COLORS[ch.col % CHAPTER_COLORS.length] }} aria-pressed={chapter.id === ch.id} onClick={() => pickChapter(ch.id)}><span>{index + 1}. {ch.title}</span><small>{timeText(chapterDuration(ch))}</small></button>)}</div>
    </footer>
    {exportOpen && <ExportDialog mode="hl" title={state.title} duration={total} settings={state} onClose={() => setExportOpen(false)} />}
  </div>
}
