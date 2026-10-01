export type WorkKind = 'search' | 'edit' | 'highlight' | 'channel' | 'deploy'
export type ProgramName = '나는 SOLO' | '나미브'
export interface Scene {
  id: string; title: string; episode: string; range: string; seconds: number; description: string; shortform?: boolean
}
export interface DeployPlan {
  days: string[]; time: string; start: string; count: number; platform: string
}
export interface WorkDraft {
  kind: WorkKind; title: string; program: ProgramName; scenes: Scene[]; approved: boolean
  subtitleSize: number; trimStart: number; trimEnd: number; aspect: '16:9' | '9:16'
  deployment?: DeployPlan; channelOption: number
}
export interface WorkVersion { id: string; label: string; draft: WorkDraft }
export const WORK_LABELS: Record<WorkKind, string> = { search: '영상 검색', edit: '영상 편집', highlight: '하이라이트', channel: '채널 설정', deploy: '자동배포 계획' }
export const SCENES: Scene[] = [
  { id: 'meet', title: '첫 만남', episode: '1회', range: '04:12 – 05:12', seconds: 60, description: '처음 마주한 순간, 어색하지만 설레는 첫 인상.' },
  { id: 'talk', title: '첫 대화', episode: '3회', range: '14:32 – 15:52', seconds: 80, description: '서로를 알아가는 대화, 하나씩 발견하는 공통점.' },
  { id: 'date', title: '첫 데이트', episode: '5회', range: '23:10 – 25:20', seconds: 130, description: '바닷가에서의 첫 데이트. 조금 더 가까워진 두 사람.' },
  { id: 'conflict', title: '갈등', episode: '8회', range: '31:05 – 32:15', seconds: 70, description: '엇갈린 마음과 서로에게 전하지 못한 이야기.' },
  { id: 'reconcile', title: '화해', episode: '10회', range: '18:20 – 19:20', seconds: 60, description: '오해를 풀고 다시 웃는 모습, 더 깊어진 마음.' },
  { id: 'choose', title: '최종 선택', episode: '12회', range: '48:20 – 49:40', seconds: 80, description: '서로를 향한 마지막 선택으로 이야기를 마무리.' },
]
const SEARCH_SCENES: Scene[] = [
  { id: 's12', title: '지금 그걸 나한테 말하는 거야?', episode: '3회 · #12', range: '14:32 – 16:10', seconds: 98, description: '식당에서 대화하다 감정이 고조되는 영호.', shortform: true },
  { id: 's27', title: '이번엔 절대 못 넘어가요', episode: '6회 · #27', range: '31:05 – 33:40', seconds: 155, description: '오해를 설명하며 길게 이어지는 대화.' },
  { id: 's41', title: '다들 나가 주세요', episode: '9회 · #41', range: '48:20 – 49:55', seconds: 95, description: '짧고 강한 대사로 분위기가 바뀌는 순간.', shortform: true },
]
export function duration(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }
export function totalDuration(draft: WorkDraft) { return Math.max(1, draft.scenes.reduce((n, scene) => n + scene.seconds, 0) - draft.trimStart - draft.trimEnd) }
export function makeDraft(kind: WorkKind, program: ProgramName = '나는 SOLO'): WorkDraft {
  return {
    kind, program, approved: false, scenes: SCENES.map((s, i) => program === '나는 SOLO' ? { ...s } : { ...s, title: ['첫 대면', '숨겨진 재능', '무대에 오르다', '예상 못 한 갈등', '다시 잡은 기회', '새로운 시작'][i], description: '나미브의 이야기 흐름을 이어 주는 주요 장면입니다.' }),
    title: program === '나는 SOLO' ? '영호 · 영숙 만남 과정 하이라이트' : '나미브 주요 장면 하이라이트',
    subtitleSize: 32, trimStart: 0, trimEnd: 0, aspect: '16:9', channelOption: 0,
  }
}
export function makeVersion(draft: WorkDraft, label: string): WorkVersion { return { id: crypto.randomUUID(), label, draft } }
export function detectWorkKind(text: string, current?: WorkDraft): WorkKind | null {
  if (/배너|프로필|채널.*(세팅|설정|소개|분석)/.test(text)) return 'channel'
  if (/하이라이트|만남 과정/.test(text) || (current?.kind === 'highlight' && /갈등|데이트|구성|장면.*빼/.test(text))) return 'highlight'
  if (/자막|잘라|자르|트림|세로로|가로로|웃는.*까지|숏폼.*만들/.test(text)) return 'edit'
  if (/(배포|올려|업로드)/.test(text) && !/오류|결과|알림|보고|정리/.test(text)) return 'deploy'
  if (/찾아|검색|숏폼.*(만한|것만)/.test(text)) return 'search'
  return null
}
export function createWorkReply(text: string, program: ProgramName, current?: WorkDraft): { text: string; draft: WorkDraft; label: string } | null {
  if (text.includes('나미브')) program = '나미브'
  if (text.includes('나는 SOLO')) program = '나는 SOLO'
  const kind = detectWorkKind(text, current)
  if (!kind) return null
  let draft = current?.kind === kind && current.program === program ? { ...current, scenes: current.scenes.map((s) => ({ ...s })), approved: false } : makeDraft(kind, program)
  if (kind === 'search') {
    const shorts = /숏폼.*(만한|것만)/.test(text)
    const scenes = program === '나는 SOLO' ? SEARCH_SCENES : SEARCH_SCENES.map((s, i) => ({ ...s, title: ['첫 대면, 분위기 급변', '모두를 놀라게 한 무대', '다시 시작할 수 있을까'][i], description: '대사와 감정 변화가 또렷한 주요 장면입니다.' }))
    draft = { ...draft, title: program === '나는 SOLO' ? '영호가 화내는 장면' : '나미브 주요 장면', scenes: scenes.filter((s) => !shorts || s.shortform) }
    return { draft, label: shorts ? '숏폼 후보로 좁히기' : '장면 검색', text: shorts ? '#12, #41을 추천해요. 대사가 짧고 감정이 확실한 장면이에요. 작업 보드에서 확인하고 숏폼으로 만들 수 있어요.' : '12개 회차에서 3개 장면을 찾았어요. 오른쪽 작업 보드에서 장면을 확인해 보세요. 숏폼 제작이나 하이라이트 구성으로 이어갈 수 있어요.' }
  }
  if (kind === 'highlight') {
    if (/갈등.*(빼|제외)/.test(text)) {
      draft.scenes = draft.scenes.filter((s) => s.id !== 'conflict').map((s) => s.id === 'date' ? { ...s, seconds: 200, episode: '5·6회', range: '23:10 – 26:30', description: '첫 데이트에 다음 날 대화를 더해 두 사람의 감정을 이어갑니다.' } : s)
      return { draft, label: '갈등 제외 · 첫 데이트 확장', text: '갈등 장면을 제외하고 첫 데이트 분량을 늘렸어요. 이야기 흐름은 유지하면서 새 구성안을 만들었어요. 이전 버전과 비교해 보세요.' }
    }
    const minutes = text.match(/(\d+)\s*분/)
    if (minutes) {
      const target = Math.min(30, Math.max(1, Number(minutes[1]))) * 60
      const sum = draft.scenes.reduce((n, s) => n + s.seconds, 0)
      let used = 0
      draft.scenes = draft.scenes.map((s, i, list) => { const seconds = i === list.length - 1 ? target - used : Math.round(s.seconds / sum * target); used += seconds; return { ...s, seconds } })
    }
    if (/올려|배포|금요일/.test(text)) draft.deployment = { days: ['금'], time: '18:00', start: '2026-10-02', count: 1, platform: 'YouTube' }
    return { draft, label: '하이라이트 구성안', text: `12개 회차를 분석해 ${draft.scenes.length}개 장면으로 구성했어요. 작업 보드에서 미리보기와 스토리 구성을 확인해 주세요.${draft.deployment ? '\n\n금요일 18:00 YouTube 배포 계획도 준비했어요. 검토 후 승인하면 제작·배포 단계로 이어집니다.' : '\n\n장면을 빼거나 순서를 바꿔도 좋아요. 최종 제작은 검토 후 승인해 주세요.'}` }
  }
  if (kind === 'edit') {
    if (current?.kind !== 'edit' || current.program !== program) draft = { ...draft, title: program === '나는 SOLO' ? '영호 숏폼 편집' : '나미브 숏폼 편집', scenes: [{ ...(program === '나는 SOLO' ? SEARCH_SCENES[0] : makeDraft('edit', program).scenes[0]), seconds: 45 }], aspect: '9:16' }
    const trim = text.match(/앞(?:에)?\s*(\d+)\s*초/)
    if (trim) draft.trimStart = Math.min(totalDuration(draft) - 1, Number(trim[1]))
    if (/자막.*(크|키)/.test(text)) draft.subtitleSize = 42
    if (/웃는.*까지/.test(text)) draft.trimEnd = Math.min(draft.scenes.reduce((n, s) => n + s.seconds, 0) - draft.trimStart - 1, draft.trimEnd + 2)
    if (/세로로/.test(text)) draft.aspect = '9:16'
    if (/가로로/.test(text)) draft.aspect = '16:9'
    return { draft, label: '편집 미리보기', text: `편집 미리보기를 업데이트했어요. 현재 길이는 ${duration(totalDuration(draft))}이고 자막은 ${draft.subtitleSize}px예요. 보드에서 구간과 화면 비율을 더 조정할 수 있어요.` }
  }
  if (kind === 'channel') {
    draft.title = `${program} 채널 리뉴얼 제안`
    if (/밝은|밝게/.test(text)) draft.channelOption = 2
    if (/이야기 중심/.test(text)) draft.channelOption = 1
    return { draft, label: '채널 제안 3가지', text: '연결된 YouTube 채널의 콘텐츠를 바탕으로 배너와 프로필 시안 3가지를 준비했어요. 밝은 톤과 인물 중심의 구성을 추천해요. 시안을 고르고 검토 후 적용해 주세요.' }
  }
  const plan = draft.deployment ?? { days: ['월', '수', '금'], time: '18:00', start: '2026-10-05', count: 3, platform: 'YouTube' }
  const listedDays = text.match(/(?:[월화수목금토일]\s*[·,]\s*)+[월화수목금토일]/)?.[0].match(/[월화수목금토일]/g)
  const days = /평일|주중/.test(text) ? ['월', '화', '수', '목', '금'] : /매일/.test(text) ? ['월', '화', '수', '목', '금', '토', '일'] : listedDays ?? plan.days
  const hourMatch = text.match(/(오전|오후|저녁|아침)?\s*(\d{1,2})(?:시|:(\d{2}))/)
  let time = plan.time
  if (hourMatch) { let hour = Number(hourMatch[2]); if (/오후|저녁/.test(hourMatch[1] ?? '') && hour < 12) hour += 12; if (/오전|아침/.test(hourMatch[1] ?? '') && hour === 12) hour = 0; const minute = Number(hourMatch[3] ?? 0); if (hour < 24 && minute < 60) time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }
  draft = { ...draft, title: `${program} 자동배포 계획`, deployment: { ...plan, days, time, count: Math.max(1, Math.min(10, Number(text.match(/(\d+)\s*개/)?.[1] ?? plan.count))) } }
  return { draft, label: '배포 계획 초안', text: `${draft.deployment!.start.replaceAll('-', '.')}부터 ${days.join('·')}, 하루 ${draft.deployment!.count}개씩 배포하는 계획을 준비했어요. 추천 영상을 채우고 ${time}에 발행하도록 설정했어요. 오른쪽에서 조건을 확인하고 승인해 주세요.` }
}

export const FOLLOW_UPS: Record<WorkKind, string[]> = {
  search: ['숏폼 될 만한 것만 찾아줘', '영호 · 영숙 8분 하이라이트 기획해줘'],
  edit: ['끝은 영호 웃는 데까지만', '가로로 바꿔줘'],
  highlight: ['갈등 장면은 빼고 첫 데이트를 더 넣어줘', '숏폼 앞 2초 자르고 자막을 크게 해줘'],
  channel: ['프로필을 더 밝은 톤으로 바꿔줘', '채널 배너를 이야기 중심으로 바꿔줘'],
  deploy: ['평일 19시에 2개씩 배포해줘', '월·수·금 18시에 3개씩 배포해줘'],
}
