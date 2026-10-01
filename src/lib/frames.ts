/*
 * 목업용 프레임 썸네일.
 * ------------------------------------------------------------------
 * 원본 디자인은 assets/frames/f1..f12.jpg (실제 방송 스틸)과
 * assets/preview-clip.mp4 / preview-shorts.mp4 를 씁니다.
 *
 * 목업에서는 외부 파일 없이 동작하도록 같은 개수(12장)의 결정적
 * 그라디언트 플레이스홀더를 data URI 로 생성합니다.
 *
 * STEPD 연동 시:
 *   frameThumb() 호출부를 실제 CDN URL 로 바꾸면 끝입니다.
 *   (컴포넌트는 전부 "그냥 문자열 URL" 로만 다룹니다)
 */

const PALETTE: ReadonlyArray<readonly [string, string]> = [
  ['#1E3A8A', '#0EA5E9'],
  ['#4C1D95', '#C026D3'],
  ['#064E3B', '#10B981'],
  ['#7C2D12', '#F59E0B'],
  ['#0F172A', '#1C60FF'],
  ['#831843', '#F43F5E'],
  ['#134E4A', '#14B8A6'],
  ['#3730A3', '#818CF8'],
  ['#78350F', '#FBBF24'],
  ['#155E75', '#22D3EE'],
  ['#581C87', '#A855F7'],
  ['#1E293B', '#64748B'],
]

export const FRAME_COUNT = PALETTE.length

const svgThumb = (n: number, w: number, h: number): string => {
  const [from, to] = PALETTE[(((n - 1) % PALETTE.length) + PALETTE.length) % PALETTE.length]
  const id = `g${n}_${w}`
  const cx = w / 2
  const cy = h / 2
  // 큰 미리보기에서도 과하게 보이지 않도록 작게 둡니다
  const r = Math.min(w, h) * 0.085
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>` +
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id}v" cx="50%" cy="45%" r="70%">` +
    `<stop offset="55%" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="100%" stop-color="#000" stop-opacity=".45"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${id})"/>` +
    `<rect width="${w}" height="${h}" fill="url(#${id}v)"/>` +
    `<path d="M${cx - r * 0.55} ${cy - r} L${cx + r} ${cy} L${cx - r * 0.55} ${cy + r} Z" fill="#fff" fill-opacity=".55"/>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** 1-based 프레임 번호(1..12) → 가로 16:9 썸네일 URL */
export const frameThumb = (n: number): string => svgThumb(n, 160, 90)

/** 1-based 프레임 번호 → 세로 9:16 썸네일 URL (숏폼용) */
export const portraitThumb = (n: number): string => svgThumb(n, 90, 160)

/** 영상 id 문자열에서 안정적인 프레임 번호를 뽑습니다 */
export const frameFor = (seed: string): number => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000
  return (h % FRAME_COUNT) + 1
}
