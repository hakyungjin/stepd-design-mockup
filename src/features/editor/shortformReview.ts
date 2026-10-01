// STEPD automation/hold-detail.tsx + template-preview.tsx의 배포 대기 편집 구조.
export interface ReviewCue { id: string; start: number; end: number; text: string; added?: boolean }
export interface ReviewLayout {
  titleY: number; channelIconY: number; channelIconSize: number
  subtitleY: number; subtitleSize: number; subtitleColor: string; logo: boolean
  titleFont: string; captionFont: string; titleSpacing: number; titleLineHeight: number; titleShadow: boolean
  subtitleSpacing: number; subtitleShadow: boolean; subtitleShadowX: number; subtitleShadowY: number
  subtitleStroke: boolean; subtitleStrokeColor: string; subtitleBg: boolean; subtitleBgColor: string; subtitleBgOpacity: number
}
export interface ReviewDraft {
  trimIn: number; trimOut: number
  line1: string; line2: string; colors: [string, string]; titleSize: number
  layout: ReviewLayout; aspect: string; subtitles: boolean; cues: ReviewCue[]
  meta: Record<string, { title: string; body: string }>; decision: 'held' | 'approved' | 'rejected'
}
export const REVIEW_DURATION = 40
export const SOURCE_START = 2462
export const SOURCE_DURATION = 4100
export const REVIEW_KEY = 'stepd.editor.short.review.v1'
export const TITLE_COLORS = [
  { name: '금빛(기본)', hex: '#F3AF4F' }, { name: '청록', hex: '#40E0E0' },
  { name: '노랑', hex: '#F0E800' }, { name: '흰색', hex: '#FFFFFF' },
  { name: '연분홍', hex: '#FF7EA8' }, { name: '하늘', hex: '#6D9BFF' },
]
export const TITLE_CANDIDATES = [
  { kind: '실명형', line1: '영호, 결국 폭발하다', line2: '그 말이 나온 순간' },
  { kind: '인용형', line1: '이게 지금 말이 된다고?', line2: '마침내 꺼낸 진심' },
  { kind: '상황형', line1: '둘만의 대화, 분위기 급변', line2: '아무도 예상 못 한 한마디' },
]
export const POST_CANDIDATES = ['영호, 결국 폭발하다 | 나는 SOLO', '둘만의 대화에서 밝혀진 진심', '끝까지 봐야 하는 두 사람의 대화']
export const FONT_OPTIONS = [
  { id: 'pretendard', label: '프리텐다드', css: 'Pretendard' }, { id: 'gmarket', label: '지마켓 산스', css: 'GmarketSans' },
  { id: 'blackhansans', label: '검은고딕', css: 'Black Han Sans' }, { id: 'dohyeon', label: '도현', css: 'Do Hyeon' },
  { id: 'jua', label: '주아', css: 'Jua' }, { id: 'gothica1', label: '고딕A1', css: 'GothicA1' },
  { id: 'paperlogy', label: '페이퍼로지', css: 'Paperlogy' }, { id: 'gangwonedumodu', label: '강원교육모두', css: 'GangwonEduModu' },
  { id: 'recipekorea', label: '레코체', css: 'Recipekorea' },
]
export const ASPECTS = [
  { id: '9:16-letterbox', label: '전체 담기' }, { id: '9:16-crop-full', label: '꽉 채우기' },
  { id: '9:16-crop-main', label: '위 자막띠' }, { id: '9:16-crop-sub', label: '위아래 띠' },
]
export const INITIAL_REVIEW: ReviewDraft = {
  trimIn: SOURCE_START, trimOut: SOURCE_START + REVIEW_DURATION,
  line1: TITLE_CANDIDATES[0].line1, line2: TITLE_CANDIDATES[0].line2, colors: ['#FFFFFF', '#F3AF4F'], titleSize: 35,
  layout: { titleY: 8, channelIconY: 79, channelIconSize: 50, subtitleY: 26, subtitleSize: 4.4, subtitleColor: '#FFFFFF', logo: true, titleFont: '', captionFont: '', titleSpacing: 0, titleLineHeight: 1.15, titleShadow: true, subtitleSpacing: 0, subtitleShadow: true, subtitleShadowX: 0, subtitleShadowY: 2, subtitleStroke: true, subtitleStrokeColor: '#000000', subtitleBg: false, subtitleBgColor: '#000000', subtitleBgOpacity: 60 },
  aspect: '', subtitles: true, decision: 'held',
  cues: [
    { id: 'q0', start: SOURCE_START, end: SOURCE_START + 8, text: '이게 지금 말이 된다고 생각해?' },
    { id: 'q1', start: SOURCE_START + 8, end: SOURCE_START + 22, text: '그건 오해예요. 제 말 좀 들어봐요.' },
    { id: 'q2', start: SOURCE_START + 22, end: SOURCE_START + 31, text: '저도 참을 만큼 참았어요.' },
    { id: 'q3', start: SOURCE_START + 31, end: SOURCE_START + 40, text: '사실 처음부터 마음은 정해져 있었어요.' },
  ],
  meta: {
    YouTube: { title: '영호, 결국 폭발하다 | 나는 SOLO #Shorts #나는SOLO', body: '두 사람의 대화에서 드러난 진심.\n나는 SOLO 32기, 다음 이야기를 확인하세요.\n\n#나는SOLO #ENA #Shorts' },
    Instagram: { title: '', body: '그 말이 나온 순간 👀\n#나는SOLO #ENA' },
    TikTok: { title: '', body: '분위기가 달라진 두 사람의 대화\n#나는SOLO #ENA' },
    '네이버 클립': { title: '', body: '영호와 영숙, 둘만의 대화 #나는SOLO' },
    Facebook: { title: '', body: '아무도 예상 못 한 한마디. 나는 SOLO 32기' },
  },
}
export const fmtReviewTime = (value: number) => {
  const tenth = Math.max(0, Math.round(value * 10))
  return `${Math.floor(tenth / 600)}:${String(Math.floor(tenth / 10) % 60).padStart(2, '0')}.${tenth % 10}`
}
export const parseReviewTime = (value: string) => {
  const match = value.trim().match(/^(?:(\d+):)?(\d+(?:\.\d)?)$/)
  return match ? Number(match[1] ?? 0) * 60 + Number(match[2]) : null
}
export const validReview = (value: unknown): value is ReviewDraft => {
  if (!value || typeof value !== 'object') return false
  const draft = value as ReviewDraft
  return Number.isFinite(draft.trimIn) && Number.isFinite(draft.trimOut) && draft.trimIn >= 0 && draft.trimOut <= SOURCE_DURATION && draft.trimOut > draft.trimIn && typeof draft.line1 === 'string' && typeof draft.line2 === 'string' && Array.isArray(draft.colors) && draft.colors.length === 2 && draft.colors.every(color => /^#[\da-f]{6}$/i.test(color)) && Number.isFinite(draft.titleSize) && ['held', 'approved', 'rejected'].includes(draft.decision) && typeof draft.aspect === 'string' && typeof draft.subtitles === 'boolean' && typeof draft.meta === 'object' && draft.meta !== null && Object.keys(INITIAL_REVIEW.meta).every(key => typeof draft.meta[key]?.title === 'string' && typeof draft.meta[key]?.body === 'string') && typeof draft.layout === 'object' && draft.layout !== null && Object.keys(INITIAL_REVIEW.layout).every(key => typeof draft.layout[key as keyof ReviewLayout] === typeof INITIAL_REVIEW.layout[key as keyof ReviewLayout]) && Array.isArray(draft.cues) && draft.cues.length <= 600 && draft.cues.every(cue => typeof cue.id === 'string' && typeof cue.text === 'string' && Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.start >= 0 && cue.end <= SOURCE_DURATION && cue.end > cue.start)
}
