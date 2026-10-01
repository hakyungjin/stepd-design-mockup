/*
 * 템플릿 미리보기 — 배치 숫자를 바꾸면 그대로 반영됩니다.
 * 설정 탭과 추가 마법사가 같이 씁니다.
 */

import type { LayoutPreset } from '../types'
import styles from './settings.module.css'

export const PREVIEW_TITLE = '예상하지 못한 반전의 순간'
const PREVIEW_CAPTION = '이 순간을 기다렸어.'

export function TemplatePreview({
  layout,
  logoText,
  title = PREVIEW_TITLE,
}: {
  layout: LayoutPreset
  logoText: string
  title?: string
}) {
  return (
    <div className={styles.preview}>
      <div className={styles.phone}>
        <div className={styles.phoneBand}>
          <span className={styles.phoneBandLabel}>레이아웃 예시</span>
        </div>
        <div
          className={styles.phoneTitle}
          style={{
            top: `${layout.titleTop}%`,
            fontSize: Math.max(8, 14 * (layout.titleSize / 100)),
            lineHeight: layout.lineHeight,
            letterSpacing: `${layout.letter * 0.5}px`,
            textShadow: layout.titleShadow === false ? 'none' : '0 2px 5px rgba(0,0,0,.75)',
          }}
        >
          {title}
        </div>
        <div
          className={styles.phoneCap}
          style={{
            bottom: `${layout.capBottom}%`,
            fontSize: Math.max(7, 9 * (layout.titleSize / 100)),
          }}
        >
          {PREVIEW_CAPTION}
        </div>
        {layout.logo && <div className={styles.phoneLogo}>{logoText}</div>}
      </div>
      <div className={styles.previewNote}>템플릿 미리보기</div>
    </div>
  )
}
