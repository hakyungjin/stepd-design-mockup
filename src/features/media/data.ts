/*
 * 미디어 화면 목 데이터.
 * STEPD 연동 시 이 파일을 API 응답으로 교체하세요.
 */

import { frameThumb, portraitThumb } from '@/lib/frames'

export interface Episode {
  key: string
  program: string
  ep: number | null
  air: string
  /** 정렬용 (MMDD) */
  airNo: number
}

export const EPISODES: Episode[] = [
  { key: 'camp12', program: '주말 캠핑 클럽', ep: 12, air: '09/26 (토)', airNo: 926 },
  { key: 'food88', program: '오늘의 식탁', ep: 88, air: '09/25 (금)', airNo: 925 },
  { key: 'dong42', program: '동네 한 바퀴', ep: 42, air: '09/24 (목)', airNo: 924 },
  { key: 'music6', program: '여름 음악회', ep: 6, air: '09/21 (월)', airNo: 921 },
  { key: 'camp11', program: '주말 캠핑 클럽', ep: 11, air: '09/19 (토)', airNo: 919 },
]

export const NO_EPISODE: Episode = { key: 'none', program: '회차 미지정', ep: null, air: '', airNo: 0 }

export const episodeOf = (key: string) =>
  EPISODES.find((e) => e.key === key) ?? NO_EPISODE

export type MediaKind = '숏폼' | '클립' | '하이라이트'

export const KIND_ORDER: Record<MediaKind, number> = { 숏폼: 0, 클립: 1, 하이라이트: 2 }

export const KIND_TONE: Record<MediaKind, 'accent' | 'muted' | 'amber'> = {
  숏폼: 'accent',
  클립: 'muted',
  하이라이트: 'amber',
}

/** 렌더 상태 */
export type RenderState = 'done' | 'encoding' | 'none' | 'uploading' | 'processing'

export type DistStatus = 'published' | 'pending' | 'scheduled' | 'failed' | 'recorded'

export const DIST_STYLE: Record<DistStatus, { label: string; dot: string }> = {
  published: { label: '게시됨', dot: 'var(--status-success-text)' },
  pending: { label: '게시 중', dot: 'var(--bg-active)' },
  scheduled: { label: '예약', dot: 'var(--bg-active)' },
  failed: { label: '실패', dot: 'hsl(var(--status-error))' },
  recorded: { label: '기록됨', dot: '#94A3B8' },
}

export interface Distribution {
  ch: string
  status: DistStatus
  at: string
  err?: string
}

export interface MediaClip {
  id: string
  ep: string
  kind: MediaKind
  title: string
  /** 길이(초) */
  dur: number
  created: string
  render: RenderState
  dists: Distribution[]
  /** 'ai' = STEP D 추천 · 'upload' = 직접 업로드 */
  source: 'ai' | 'upload'
  uploader?: string
  /** 업로드 진행률 */
  pct?: number
  thumb: string
  /** 채널별로 덮어쓴 메타데이터 */
  meta?: Record<string, ChannelMeta>
}

export interface ChannelMeta {
  title: string
  desc: string
  tags: string[]
  extra: Record<string, string>
}

const D = (ch: string, status: DistStatus, at: string, err?: string): Distribution => ({
  ch,
  status,
  at,
  err,
})

type AiRow = [string, string, MediaKind, string, number, string, RenderState, Distribution[]]

const AI_ROWS: AiRow[] = [
  ['c1', 'camp12', '숏폼', '텐트 치다 무너진 순간', 58, '09/26 11:02', 'done', [D('쇼츠', 'published', '09/26 18:00'), D('릴스', 'published', '09/26 18:00'), D('틱톡', 'failed', '09/26 18:01', '틱톡 인증이 만료됐습니다 — 배포 채널에서 다시 연결하세요')]],
  ['c2', 'camp12', '숏폼', '불멍 앞에서 꺼낸 진심', 72, '09/26 11:02', 'done', [D('쇼츠', 'pending', '09/28 09:40')]],
  ['c3', 'camp12', '숏폼', '첫 캠핑 요리 대참사', 45, '09/28 09:12', 'encoding', []],
  ['c4', 'camp12', '숏폼', '새벽 계곡 입수', 63, '09/26 11:02', 'none', []],
  ['c5', 'camp12', '클립', '캠핑장 도착부터 설치까지', 612, '09/26 11:05', 'done', [D('유튜브', 'published', '09/26 20:00')]],
  ['c6', 'camp12', '클립', '밤하늘 토크 풀버전', 845, '09/26 11:05', 'done', []],
  ['c15', 'food88', '숏폼', '3분 만에 끝내는 달걀찜', 42, '09/25 15:20', 'done', [D('쇼츠', 'published', '09/25 19:00'), D('릴스', 'pending', '09/28 09:30'), D('틱톡', 'pending', '09/28 09:30')]],
  ['c16', 'food88', '숏폼', '셰프의 칼질 비법', 38, '09/25 15:20', 'done', [D('쇼츠', 'published', '09/25 19:00')]],
  ['c17', 'food88', '클립', '가을 제철 밥상 레시피', 688, '09/25 15:24', 'done', []],
  ['c10', 'dong42', '숏폼', '40년 된 국숫집 사장님', 55, '09/24 14:10', 'done', [D('쇼츠', 'failed', '09/24 20:02', '업로드 중 연결이 끊겼습니다 — 다시 시도하세요')]],
  ['c11', 'dong42', '숏폼', '골목 끝 작은 서점', 48, '09/24 14:10', 'done', []],
  ['c12', 'dong42', '숏폼', '시장 떡집의 새벽', 70, '09/24 14:10', 'none', []],
  ['c13', 'dong42', '클립', '을지로 골목 산책', 520, '09/28 08:55', 'encoding', []],
  ['c14', 'dong42', '클립', '국숫집 사장님 인터뷰 전체', 402, '09/24 14:15', 'done', [D('유튜브', 'scheduled', '09/29 12:00')]],
  ['c18', 'music6', '숏폼', '앵콜 무대 직캠', 61, '09/21 16:40', 'done', [D('쇼츠', 'published', '09/21 21:00'), D('릴스', 'published', '09/21 21:00')]],
  ['c19', 'music6', '숏폼', '리허설 비하인드', 57, '09/21 16:40', 'done', [D('쇼츠', 'failed', '09/21 21:01', '저작권 음원이 감지돼 게시가 보류됐습니다 — 음원 구간을 빼고 다시 내보내세요')]],
  ['c20', 'music6', '클립', '피날레 전곡', 905, '09/21 16:44', 'done', [D('유튜브', 'published', '09/21 22:00')]],
  ['c21', 'music6', '클립', '관객 인터뷰 모음', 380, '09/21 16:44', 'none', []],
  ['c7', 'camp11', '숏폼', '비 오는 날의 캠핑', 51, '09/19 11:30', 'done', [D('쇼츠', 'published', '09/19 18:00'), D('릴스', 'published', '09/19 18:00'), D('틱톡', 'published', '09/19 18:00')]],
  ['c8', 'camp11', '숏폼', '장작 패기 대결', 66, '09/19 11:30', 'done', [D('쇼츠', 'published', '09/19 18:00')]],
  ['c9', 'camp11', '클립', '우중 캠핑 생존기', 734, '09/19 11:34', 'done', [D('유튜브', 'published', '09/19 20:00'), D('네이버TV', 'published', '09/19 20:00')]],
  ['h1', 'camp12', '하이라이트', '12회 하이라이트 — 무너진 텐트와 불멍 고백', 272, '09/26 11:08', 'done', []],
  ['h2', 'food88', '하이라이트', '88회 하이라이트 — 가을 밥상 한 상', 236, '09/25 15:27', 'done', [D('유튜브', 'published', '09/25 21:00')]],
  ['h3', 'dong42', '하이라이트', '42회 하이라이트 — 을지로 골목의 사람들', 254, '09/28 09:02', 'encoding', []],
  ['h4', 'music6', '하이라이트', '6회 하이라이트 — 피날레까지 5분', 301, '09/21 16:48', 'done', [D('유튜브', 'failed', '09/21 22:30', '저작권 음원이 감지돼 게시가 보류됐습니다 — 음원 구간을 빼고 다시 내보내세요')]],
  ['h5', 'camp11', '하이라이트', '11회 하이라이트 — 우중 캠핑 명장면', 248, '09/19 11:38', 'done', [D('유튜브', 'published', '09/19 21:00'), D('네이버TV', 'published', '09/19 21:00')]],
]

type UploadRow = [string, string, MediaKind, string, number, string, RenderState, Distribution[], string, number?]

const UPLOAD_ROWS: UploadRow[] = [
  ['u1', 'camp12', '숏폼', '텐트 붕괴 슬로모션 (편집자 컷)', 34, '09/27 14:20', 'done', [D('쇼츠', 'published', '09/27 18:00')], '김지은'],
  ['u2', 'camp12', '클립', '13회 예고 30초', 30, '09/27 16:05', 'done', [D('유튜브', 'scheduled', '09/29 09:00')], '박도윤'],
  ['u3', 'food88', '숏폼', '셰프 인터뷰 세로 편집', 49, '09/28 09:50', 'processing', [], '김지은'],
  ['u6', 'music6', '클립', '무대 뒤 스케치', 410, '09/22 11:12', 'done', [D('유튜브', 'failed', '09/22 18:00', '썸네일 해상도가 너무 낮습니다 — 1280×720 이상으로 바꿔 주세요')], '박도윤'],
  ['u4', 'none', '클립', 'ENA 가을 편성 트레일러', 95, '09/26 10:30', 'done', [], '이서현'],
  ['u5', 'none', '숏폼', '채널 소개 숏츠', 28, '09/28 10:02', 'uploading', [], '이서현', 62],
]

const thumbFor = (kind: MediaKind, i: number) =>
  kind === '숏폼' ? portraitThumb(i + 1) : frameThumb(i + 1)

export const CLIPS: MediaClip[] = [
  ...AI_ROWS.map(([id, ep, kind, title, dur, created, render, dists], i) => ({
    id,
    ep,
    kind,
    title,
    dur,
    created,
    render,
    // '기록됨'은 파일이 올라가지 않으므로 목록에서 제외합니다
    dists: dists.filter((d) => d.status !== 'recorded'),
    source: 'ai' as const,
    thumb: thumbFor(kind, i),
  })),
  ...UPLOAD_ROWS.map(([id, ep, kind, title, dur, created, render, dists, uploader, pct], i) => ({
    id,
    ep,
    kind,
    title,
    dur,
    created,
    render,
    dists,
    source: 'upload' as const,
    uploader,
    pct: pct ?? 0,
    thumb: thumbFor(kind, i + 6),
  })),
]

/* ---------------- 파생 ---------------- */

export const durationText = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export const createdNo = (c: MediaClip) => Number(c.created.replace(/\D/g, ''))

export interface ClipFlags {
  failed: number
  rendering: boolean
  none: boolean
  uploading: number
  scheduled: number
  published: number
  ready: boolean
}

export const flagsOf = (c: MediaClip): ClipFlags => {
  const n = (st: DistStatus) => c.dists.filter((d) => d.status === st).length
  return {
    failed: n('failed'),
    rendering: ['encoding', 'uploading', 'processing'].includes(c.render),
    none: c.render === 'none',
    uploading: n('pending'),
    scheduled: n('scheduled'),
    published: n('published'),
    ready: c.render === 'done' && c.dists.length === 0,
  }
}

/** 렌더 상태 칩 */
export const renderChip = (
  c: MediaClip,
): { label: string; tone: 'accent' | 'muted' | 'success' } => {
  if (c.render === 'uploading') return { label: `업로드 중 ${c.pct ?? 0}%`, tone: 'accent' }
  if (flagsOf(c).rendering) return { label: '렌더 중', tone: 'accent' }
  if (c.render === 'none') return { label: '렌더 전', tone: 'muted' }
  return { label: '완료', tone: 'success' }
}

/** 상단 상태 필터 */
export const STATUS_FILTERS: Array<[string, string, (f: ClipFlags) => boolean]> = [
  ['all', '전체', () => true],
  ['failed', '배포 실패', (f) => f.failed > 0],
  ['rendering', '렌더 중', (f) => f.rendering],
  ['none', '렌더 전', (f) => f.none],
  ['ready', '배포 대기', (f) => f.ready],
  ['published', '배포됨', (f) => f.published > 0],
]

/* ---------------- 채널별 메타데이터 ---------------- */

const PLATFORM_OF: Record<string, string> = {
  쇼츠: '유튜브',
  유튜브: '유튜브',
  페이스북: '페이스북',
  릴스: '인스타그램',
  인스타그램: '인스타그램',
  틱톡: '틱톡',
}

/** 그 미디어에서 메타데이터를 편집할 수 있는 채널 목록 */
export const channelsOf = (c: MediaClip): string[] => {
  const base = ['유튜브', '페이스북', '인스타그램', '틱톡']
  const extra = c.dists
    .map((d) => PLATFORM_OF[d.ch] ?? d.ch)
    .filter((p) => !base.includes(p))
  return [...base, ...extra.filter((p, i) => extra.indexOf(p) === i)]
}

export interface GeneratedMeta {
  title: string
  descLabel: string
  desc: string
  tagLabel: string
  tags: string[]
  extra: Array<{ k: string; v: string; opts?: string[] }>
}

/** 채널 규격에 맞춘 기본 메타데이터를 만듭니다 */
export const generateMeta = (c: MediaClip, e: Episode, channel: string): GeneratedMeta => {
  const prog = e.program === '회차 미지정' ? '' : e.program
  const base = c.title
  const epText = e.ep ? ` | ${prog} ${e.ep}회` : ''
  const keywords = [
    prog,
    c.kind,
    ...(prog.includes('캠핑') ? ['캠핑', '예능'] : prog.includes('음악') ? ['라이브', '음악'] : ['ENA']),
  ].filter(Boolean)
  const intro = `${prog ? `${prog} ` : ''}${e.ep ? `${e.ep}회` : ''}에서 뽑은 ${c.kind}입니다.`.trim()
  const strip = (s: string) => s.replace(/\s/g, '')

  if (channel === '페이스북') {
    return {
      title: base,
      descLabel: '게시글',
      desc: `${intro}\n본편은 ENA에서 다시 보세요.`,
      tagLabel: '해시태그',
      tags: keywords.map((k) => `#${strip(k)}`),
      extra: [
        { k: '페이지', v: 'ENA 공식' },
        { k: '공개 범위', v: '전체 공개', opts: ['전체 공개', '비공개'] },
      ],
    }
  }

  if (/유튜브|쇼츠/.test(channel)) {
    return {
      title: c.kind === '숏폼' ? `${base} #Shorts` : `${base}${epText}`,
      descLabel: '설명',
      desc: `${intro}\n\n▶ 본편 다시보기: ENA 공식 채널\n#${strip(prog || 'ENA')} #${c.kind}`,
      tagLabel: '태그',
      tags: keywords,
      extra: [
        {
          k: '카테고리',
          v: '엔터테인먼트',
          opts: ['엔터테인먼트', '코미디', '음악', '인물/블로그', '여행/이벤트'],
        },
        { k: '공개 범위', v: '공개', opts: ['공개', '일부 공개', '비공개'] },
        { k: '허용 국가', v: '대한민국 · 미국 · 일본' },
        { k: '시청자층', v: '아동용 아님', opts: ['아동용 아님', '아동용'] },
      ],
    }
  }

  if (/틱톡|릴스|인스타/.test(channel)) {
    return {
      title: base,
      descLabel: '캡션',
      desc: `${base}\n${prog ? `${prog} ` : ''}${e.ep ? `${e.ep}회 ` : ''}본편은 프로필 링크에서`.trim(),
      tagLabel: '해시태그',
      tags: keywords.map((k) => `#${strip(k)}`),
      extra: [
        { k: '계정', v: '@ena_official' },
        { k: '커버', v: '썸네일 사용', opts: ['썸네일 사용', '첫 프레임'] },
      ],
    }
  }

  return {
    title: `[${prog || 'ENA'}] ${base}`,
    descLabel: '설명',
    desc: intro,
    tagLabel: '태그',
    tags: keywords,
    extra: [
      {
        k: '카테고리',
        v: '엔터 › 예능',
        opts: ['엔터 › 예능', '엔터 › 드라마', '엔터 › 연예', '라이프'],
      },
      { k: '공개 범위', v: '전체 공개', opts: ['전체 공개', '비공개'] },
    ],
  }
}

/** 저장된 수정본이 있으면 덮어씌운 메타데이터 */
export const metaOf = (c: MediaClip, e: Episode, channel: string): GeneratedMeta => {
  const generated = generateMeta(c, e, channel)
  const saved = c.meta?.[channel]
  if (!saved) return generated
  return {
    ...generated,
    title: saved.title,
    desc: saved.desc,
    tags: saved.tags,
    extra: generated.extra.map((x) => ({ ...x, v: saved.extra[x.k] ?? x.v })),
  }
}

/* ------------------------------------------------------------------ *
 * 영상 버전 · 댓글
 * ------------------------------------------------------------------ */

export interface Member {
  name: string
  role: string
  /** 아바타 색 */
  color: string
}

/** @멘션으로 부를 수 있는 사람 */
export const MEMBERS: Member[] = [
  { name: '하경진', role: '콘텐츠 제작팀', color: '#4d5f7a' },
  { name: '김도윤', role: '콘텐츠 제작팀', color: '#6b5f5a' },
  { name: '이서현', role: '편성', color: '#5a4d6b' },
  { name: '박지훈', role: '채널 운영', color: '#3f5f6b' },
  { name: '정하늘', role: '디자인', color: '#5f6b4d' },
]

/** 지금 로그인한 사람 */
export const ME = '하경진'

export const memberOf = (name: string): Member | undefined =>
  MEMBERS.find((m) => m.name === name)

/** 영상 버전 하나 */
export interface ClipVersion {
  v: number
  by: string
  at: string
  note: string
}

/** 댓글 한 줄 — system 은 "v2 올림" 같은 기록입니다 */
export interface ClipComment {
  id: string
  by: string
  at: string
  text: string
  /** 어느 버전에 달렸는지 */
  v: number
  system?: boolean
}

const seedOf = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000
  return h
}

const VERSION_SEED: Array<{ by: string; at: string; note: string }> = [
  { by: ME, at: '', note: '최초 렌더' },
  { by: '김도윤', at: '09/27 18:40', note: '자막 위치·크기 수정' },
  { by: ME, at: '09/28 10:12', note: '앞 2초 컷 · 썸네일 교체' },
]

/** 영상의 버전 목록 — 마지막이 현재 버전입니다 */
export const versionsOf = (clip: MediaClip): ClipVersion[] => {
  const n = 1 + (seedOf(clip.id) % 3)
  return VERSION_SEED.slice(0, n).map((s, i) => ({
    v: i + 1,
    by: i === 0 ? (clip.uploader ?? s.by) : s.by,
    at: i === 0 ? clip.created : s.at,
    note: s.note,
  }))
}

const COMMENT_SEED: Array<Omit<ClipComment, 'id'>> = [
  {
    by: '김도윤',
    at: '09/27 18:52',
    v: 2,
    text: '@하경진 앞 2초가 늘어져요. 잘라주실 수 있을까요?',
  },
  {
    by: ME,
    at: '09/28 10:12',
    v: 3,
    text: '@김도윤 반영해서 v3 올렸습니다. 썸네일도 바꿨어요 — 확인 부탁드려요.',
  },
  {
    by: '박지훈',
    at: '09/28 10:31',
    v: 3,
    text: '좋습니다. @이서현 편성 확정되면 바로 배포할게요.',
  },
]

/** 영상에 달린 댓글 — 버전 기록과 섞어서 보여 줍니다 */
export const commentsOf = (clip: MediaClip): ClipComment[] => {
  const versions = versionsOf(clip)
  return COMMENT_SEED.filter((c) => c.v <= versions.length).map((c, i) => ({
    ...c,
    id: `${clip.id}-c${i}`,
  }))
}

/** 댓글 본문을 일반 글자와 @멘션으로 쪼갭니다 */
export const splitMentions = (text: string): Array<{ text: string; mention: boolean }> =>
  text
    .split(/(@[가-힣A-Za-z0-9_]+)/g)
    .filter(Boolean)
    .map((part) => ({
      text: part,
      mention: part.startsWith('@') && MEMBERS.some((m) => m.name === part.slice(1)),
    }))
