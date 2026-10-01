import { useEffect, useState } from 'react'
import type { ChatMockStore } from './useChatMock'
import { duration, totalDuration, WORK_LABELS, type WorkDraft, type Scene, type DeployPlan } from './workspaceMock'
import { SceneArt } from './SceneArt'
import styles from './WorkBoard.module.css'

type Tab = 'preview' | 'structure' | 'versions'

export function WorkBoard({ store, onPrompt }: { store: ChatMockStore; onPrompt: (text: string) => void }) {
  const [tab, setTab] = useState<Tab>('preview')
  const [sceneIndex, setSceneIndex] = useState(0)
  const [editingPlan, setEditingPlan] = useState(false)
  const version = store.activeVersion
  const versions = store.selected?.versions ?? []
  const draft = version?.draft
  const historical = version?.id !== versions.at(-1)?.id
  useEffect(() => { setSceneIndex(0); setTab('preview'); setEditingPlan(false) }, [store.selectedId, draft?.kind])
  useEffect(() => { setSceneIndex(0); setEditingPlan(false) }, [version?.id])
  // 보여 줄 결과가 없으면 보드를 그리지 않습니다 (ChatPage 가 이미 걸러 주지만 안전장치)
  if (!draft || !version) return null
  const index = versions.findIndex((v) => v.id === version.id) + 1
  const selectedScene = draft.scenes[Math.min(sceneIndex, draft.scenes.length - 1)]
  const edit = (update: (draft: WorkDraft) => WorkDraft, label: string) => store.revise(update, label)
  const approveLabel = draft.kind === 'channel' ? '검토 후 채널 적용' : draft.kind === 'deploy' ? '검토 후 배포 계획 승인' : draft.deployment ? '검토 후 제작·배포 승인' : '검토 후 제작 승인'
  return <aside id="agent-work-board" className={styles.board} aria-label="작업 보드" aria-busy={store.busy}>
    <div className={styles.boardHead}><div><span className={styles.workType}>{WORK_LABELS[draft.kind]}</span><span className={draft.approved ? styles.approved : styles.draft}>{draft.approved ? '✓ 승인됨' : '초안'}</span></div><label className={styles.versionSelect}><span className={styles.srOnly}>작업 버전</span><select value={version.id} disabled={store.busy} onChange={(e) => store.selectVersion(e.target.value)}>{versions.map((v, i) => <option key={v.id} value={v.id}>버전 {i + 1}{i === versions.length - 1 ? ' (최신)' : ''} · {v.label}</option>)}</select></label></div>
    <div className={styles.titleBlock}><h1>{draft.title}</h1><p>{draft.program} <span>·</span> {draft.kind === 'channel' || draft.kind === 'deploy' ? 'YouTube 연결됨' : `${duration(totalDuration(draft))} · ${draft.scenes.length}개 장면 · 12개 회차 분석`} <span>·</span> 버전 {index}</p></div>
    <nav className={styles.tabs} aria-label="작업 보드 보기">{(['preview', 'structure', 'versions'] as Tab[]).map((value) => <button type="button" key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value === 'preview' ? draft.kind === 'search' ? '검색 결과' : draft.kind === 'channel' ? '채널 시안' : draft.kind === 'deploy' ? '배포 계획' : '미리보기' : value === 'structure' ? '구성·수정' : '버전 기록'}{value === 'versions' && <small>{versions.length}</small>}</button>)}</nav>
    <div className={styles.boardScroll}>
      {historical && <div className={styles.historyNote}>이전 버전을 보고 있습니다. 수정하면 새 버전으로 저장됩니다.</div>}
      {tab === 'versions' ? <div className={styles.versionList}>{[...versions].reverse().map((v) => <button type="button" key={v.id} aria-current={version.id === v.id ? 'true' : undefined} onClick={() => store.selectVersion(v.id)}><span className={styles.versionNumber}>v{versions.indexOf(v) + 1}</span><div><strong>{v.label}</strong><p>{v.draft.scenes.length}개 장면 · {v.draft.approved ? '승인됨' : '초안'} · {WORK_LABELS[v.draft.kind]}</p></div><span>{version.id === v.id ? '보는 중' : '비교하기 ↗'}</span></button>)}</div> : draft.kind === 'search' ? <>
        <div className={styles.sectionHead}><h2>검색한 장면 <small>{draft.scenes.length}</small></h2><button type="button" disabled={store.busy} onClick={() => store.send('그중에 숏폼 될 만한 것만')}>숏폼 후보만 보기</button></div>
        {draft.scenes.map((scene, i) => <div className={styles.searchCard} key={scene.id}><button type="button" className={styles.searchPreview} aria-label={`${scene.title} 미리보기`} onClick={() => setSceneIndex(i)}><SceneArt variant={i} program={draft.program} /><span>▶ {scene.range}</span></button><div><small>{draft.program} {scene.episode}</small><h3>{scene.title}</h3><p>{scene.description}</p><div className={styles.searchActions}><button type="button" disabled={store.busy} onClick={() => edit((d) => ({ ...d, kind: 'edit', title: `${scene.title} · 숏폼`, scenes: [{ ...scene, seconds: 45 }], aspect: '9:16', trimStart: 0, trimEnd: 0 }), '숏폼 편집 초안')}>숏폼 만들기 ↗</button><button type="button" disabled={store.busy} onClick={() => edit((d) => ({ ...d, kind: 'highlight', title: `${d.program} 주요 장면 하이라이트`, scenes: d.scenes }), '검색 장면으로 하이라이트 구성')}>하이라이트로 구성</button></div></div></div>)}
        <PreviewPlayer key={version.id + sceneIndex} draft={{ ...draft, scenes: selectedScene ? [selectedScene] : [] }} sceneIndex={sceneIndex} />
      </> : draft.kind === 'channel' ? <ChannelProposal draft={draft} disabled={store.busy} onSelect={(channelOption) => edit((d) => ({ ...d, channelOption }), '채널 시안 선택')} /> : draft.kind === 'deploy' ? <>
        <DeployEditor key={version.id} plan={draft.deployment!} disabled={store.busy} onSave={(deployment) => edit((d) => ({ ...d, deployment }), '배포 조건 수정')} />
        <div className={styles.sectionHead}><h2>추천 영상</h2><small>기존 분석 결과를 바탕으로 구성</small></div><SceneStrip scenes={draft.scenes.slice(0, 3)} selected={sceneIndex} onSelect={setSceneIndex} program={draft.program} />
      </> : <>
        {tab === 'preview' && <><PreviewPlayer key={version.id} draft={draft} sceneIndex={sceneIndex} /><div className={styles.sectionHead}><h2>스토리 구성 <small>{draft.scenes.length}개 장면</small></h2><button type="button" onClick={() => setTab('structure')}>구성 수정 ↗</button></div><SceneStrip scenes={draft.scenes} selected={sceneIndex} onSelect={setSceneIndex} program={draft.program} /></>}
        {tab === 'structure' && <div className={styles.outline}>{draft.scenes.map((scene, i) => <div className={styles.outlineRow} key={scene.id}><span className={styles.sceneNumber}>{i + 1}</span><SceneArt variant={i} program={draft.program} /><div><strong>{scene.title}</strong><small>{scene.episode} · {scene.range}</small><p>{scene.description}</p></div><span>{duration(scene.seconds)}</span><div className={styles.reorder}><button type="button" aria-label={`${scene.title} 앞으로`} disabled={store.busy || i === 0} onClick={() => edit((d) => { const scenes = [...d.scenes]; [scenes[i - 1], scenes[i]] = [scenes[i], scenes[i - 1]]; return { ...d, scenes } }, '장면 순서 변경')}>↑</button><button type="button" aria-label={`${scene.title} 뒤로`} disabled={store.busy || i === draft.scenes.length - 1} onClick={() => edit((d) => { const scenes = [...d.scenes]; [scenes[i + 1], scenes[i]] = [scenes[i], scenes[i + 1]]; return { ...d, scenes } }, '장면 순서 변경')}>↓</button><button type="button" aria-label={`${scene.title} 구성에서 빼기`} disabled={store.busy || draft.scenes.length === 1} onClick={() => edit((d) => ({ ...d, scenes: d.scenes.filter((s) => s.id !== scene.id) }), `${scene.title} 제외`)}>×</button></div></div>)}</div>}
        {draft.kind === 'edit' && <EditControls key={version.id} draft={draft} disabled={store.busy} onSave={(values) => edit((d) => ({ ...d, ...values }), '편집 설정 수정')} />}
        {draft.deployment && <section className={styles.deploySummary}><div className={styles.sectionHead}><h2>배포 계획 <small>승인 대기</small></h2><button type="button" disabled={store.busy} onClick={() => setEditingPlan(!editingPlan)}>{editingPlan ? '닫기' : '배포 설정 수정'}</button></div>{editingPlan ? <DeployEditor plan={draft.deployment} disabled={store.busy} onSave={(deployment) => { edit((d) => ({ ...d, deployment }), '배포 조건 수정'); setEditingPlan(false) }} /> : <div className={styles.publishRow}><span className={styles.youtube}>▶</span><div><strong>{draft.deployment.platform}</strong><p>{draft.deployment.start.replaceAll('-', '.')} · {draft.deployment.days.join('·')} {draft.deployment.time} 예약 초안</p></div><span>공개</span></div>}</section>}
      </>}
    </div>
    {draft.kind !== 'search' && <footer className={styles.boardFooter}><p>{draft.approved ? '승인 상태가 저장되었습니다. 실제 실행은 연결 후 가능합니다.' : '내용을 확인하고 승인하면 다음 단계로 이어집니다.'}</p><div>{historical ? <button type="button" className={styles.primary} disabled={store.busy} onClick={() => edit((d) => d, `버전 ${index} 복원`)}>이 버전으로 복원</button> : <button type="button" className={styles.primary} disabled={store.busy || draft.approved} onClick={store.approve}>{draft.approved ? '✓ 승인 완료' : `✓ ${approveLabel}`}</button>}<button type="button" disabled={store.busy} onClick={() => { if (draft.kind === 'channel' || draft.kind === 'deploy') onPrompt(draft.kind === 'channel' ? '채널 프로필을 더 밝은 톤으로 바꿔줘' : '배포 시간을 변경하고 싶어'); else setTab('structure') }}>더 수정하기</button></div></footer>}
  </aside>
}

function SceneStrip({ scenes, selected, onSelect, program }: { scenes: Scene[]; selected: number; onSelect: (index: number) => void; program: string }) {
  return <div className={styles.sceneStrip}>{scenes.map((scene, i) => <button type="button" key={scene.id} className={styles.sceneCard} aria-pressed={selected === i} onClick={() => onSelect(i)}><div className={styles.sceneArt}><SceneArt variant={i} program={program} /><span className={styles.sceneNumber}>{i + 1}</span><span className={styles.sceneDuration}>{duration(scene.seconds)}</span></div><strong>{scene.title}</strong><small>{scene.episode}</small><p>{scene.description}</p></button>)}</div>
}

function PreviewPlayer({ draft, sceneIndex }: { draft: WorkDraft; sceneIndex: number }) {
  const total = totalDuration(draft)
  const offset = draft.scenes.slice(0, sceneIndex).reduce((n, scene) => n + scene.seconds, 0)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  useEffect(() => { setPosition(Math.min(offset, total)); setPlaying(false) }, [offset, total])
  useEffect(() => { if (!playing) return; const timer = setInterval(() => setPosition((n) => Math.min(total, n + 1)), 1000); return () => clearInterval(timer) }, [playing, total])
  const scene = draft.scenes[sceneIndex] ?? draft.scenes[0]
  return <div className={styles.player}><div className={`${styles.playerStage} ${draft.aspect === '9:16' ? styles.verticalStage : ''}`}><SceneArt variant={sceneIndex} program={draft.program} /><span className={styles.previewLabel}>미리보기 예시</span><span className={styles.playerCaption} style={{ fontSize: Math.min(26, draft.subtitleSize / 1.8) }}>{scene?.title ?? draft.title}</span><button type="button" className={styles.playButton} aria-label={playing && position < total ? '미리보기 일시정지' : '미리보기 재생'} onClick={() => { if (position >= total) setPosition(0); setPlaying(!playing || position >= total) }}>{playing && position < total ? 'Ⅱ' : '▶'}</button></div><div className={styles.playerControls}><button type="button" aria-label={playing && position < total ? '일시정지' : '재생'} onClick={() => { if (position >= total) setPosition(0); setPlaying(!playing || position >= total) }}>{playing && position < total ? 'Ⅱ' : '▶'}</button><span>{duration(position)} <i>/ {duration(total)}</i></span><input type="range" min="0" max={total} value={position} aria-label="미리보기 재생 위치" onChange={(e) => setPosition(Number(e.target.value))} /><small>{draft.aspect}</small></div></div>
}

function EditControls({ draft, disabled, onSave }: { draft: WorkDraft; disabled: boolean; onSave: (values: Pick<WorkDraft, 'trimStart' | 'trimEnd' | 'subtitleSize' | 'aspect'>) => void }) {
  const [start, setStart] = useState(draft.trimStart)
  const [end, setEnd] = useState(draft.trimEnd)
  const [size, setSize] = useState(draft.subtitleSize)
  const [aspect, setAspect] = useState(draft.aspect)
  const max = draft.scenes.reduce((n, s) => n + s.seconds, 0) - 1
  return <form className={styles.editControls} onSubmit={(e) => { e.preventDefault(); onSave({ trimStart: start, trimEnd: end, subtitleSize: size, aspect }) }}><h2>가벼운 편집</h2><div><label>앞부분 자르기<input type="number" min="0" max={max - end} value={start} onChange={(e) => setStart(Number(e.target.value))} required /><small>초</small></label><label>끝부분 자르기<input type="number" min="0" max={max - start} value={end} onChange={(e) => setEnd(Number(e.target.value))} required /><small>초</small></label><label>자막 크기<select value={size} onChange={(e) => setSize(Number(e.target.value))}><option value="28">작게 · 28px</option><option value="32">기본 · 32px</option><option value="42">크게 · 42px</option></select></label><label>화면 비율<select value={aspect} onChange={(e) => setAspect(e.target.value as typeof aspect)}><option value="9:16">세로 · 9:16</option><option value="16:9">가로 · 16:9</option></select></label></div><button type="submit" disabled={disabled}>미리보기에 반영</button></form>
}

function DeployEditor({ plan, disabled, onSave }: { plan: DeployPlan; disabled: boolean; onSave: (plan: DeployPlan) => void }) {
  const [value, setValue] = useState(plan)
  return <form className={styles.deployEditor} onSubmit={(e) => { e.preventDefault(); if (value.days.length) onSave(value) }}><div className={styles.sectionHead}><h2>발행 조건</h2><span className={styles.draft}>승인 전</span></div><label>배포 채널<select value={value.platform} onChange={(e) => setValue({ ...value, platform: e.target.value })}>{['YouTube', '네이버 클립', 'TikTok', 'Instagram', 'Facebook'].map((p) => <option key={p}>{p}</option>)}</select></label><fieldset><legend>발행 요일</legend><div className={styles.days}>{['월', '화', '수', '목', '금', '토', '일'].map((day) => <button type="button" aria-pressed={value.days.includes(day)} key={day} onClick={() => setValue({ ...value, days: value.days.includes(day) ? value.days.filter((d) => d !== day) : [...value.days, day] })}>{day}</button>)}</div></fieldset><div className={styles.planFields}><label>하루 발행<input type="number" min="1" max="10" value={value.count} onChange={(e) => setValue({ ...value, count: Number(e.target.value) })} required /></label><label>발행 시각<input type="time" value={value.time} onChange={(e) => setValue({ ...value, time: e.target.value })} required /></label><label>시작일<input type="date" value={value.start} onChange={(e) => setValue({ ...value, start: e.target.value })} required /></label></div><div className={styles.planBottom}><span>한국 시간 · 추천 영상 자동 채우기</span><button type="submit" disabled={disabled || !value.days.length}>조건 저장</button></div></form>
}

function ChannelProposal({ draft, disabled, onSelect }: { draft: WorkDraft; disabled: boolean; onSelect: (value: number) => void }) {
  return <><div className={styles.channelInsights}><div><small>반응이 좋은 콘텐츠</small><strong>갈등 · 반전 숏폼</strong></div><div><small>추천 발행 시간</small><strong>평일 18:00 – 20:00</strong></div><div><small>채널 톤</small><strong>밝고 친근한 예능</strong></div></div><div className={styles.sectionHead}><h2>배너·프로필 제안</h2><small>3가지 시안</small></div><div className={styles.channelOptions}>{['인물 중심', '이야기 중심', '밝은 브랜드'].map((title, i) => <button type="button" key={title} aria-pressed={draft.channelOption === i} disabled={disabled} onClick={() => onSelect(i)}><div className={styles.channelBanner} data-option={i}><SceneArt variant={i} program={draft.program} /><strong>{draft.program}</strong><span>우리의 이야기가 시작되는 곳</span></div><div className={styles.channelOptionLabel}><span className={styles.profile}>{draft.program === '나는 SOLO' ? 'S' : 'N'}</span><strong>{title}</strong><span>{draft.channelOption === i ? '✓ 선택' : '선택하기'}</span></div></button>)}</div><section className={styles.channelDescription}><h2>채널 소개 제안</h2><p>설레는 첫 만남부터 예상 못 한 반전까지. {draft.program}의 잊지 못할 순간을 만나 보세요. 매주 새로운 이야기와 하이라이트를 전합니다.</p></section></>
}
