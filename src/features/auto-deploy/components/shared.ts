import { frameThumb, portraitThumb } from '@/lib/frames'
import type { HoldKind } from '../types'

/**
 * 원본은 assets/frames/f1..12.jpg 한 장을 세로/가로로 잘라 씁니다.
 * 목업에서는 방향에 맞는 플레이스홀더를 골라 줍니다.
 */
export const frameSrc = (kind: HoldKind, n: number): string =>
  kind === '숏폼' ? portraitThumb(n) : frameThumb(n)

/** 썸네일 상자 안에서 이미지가 차지하는 방식 */
export const fillStyle = (kind: HoldKind, src: string) =>
  ({
    ...(kind === '숏폼'
      ? { height: '100%', aspectRatio: '9 / 16' }
      : { width: '100%', height: '100%' }),
    backgroundImage: `url("${src}")`,
  }) as const

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')
